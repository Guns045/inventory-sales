import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatRupiah } from '@/lib/utils';

const CreateInvoiceModal = ({ isOpen, onClose, onConfirm, order, loading }) => {
    const [poNumber, setPoNumber] = useState('');
    const [selectedSoIds, setSelectedSoIds] = useState([]);
    const [expandedSoIds, setExpandedSoIds] = useState([]);

    useEffect(() => {
        if (order) {
            setPoNumber(order.sales_order?.po_number || '');

            // Extract unique Sales Orders from items
            const soIds = [...new Set(order.delivery_order_items?.map(item =>
                item.sales_order_item?.sales_order_id || order.sales_order_id
            ).filter(id => id))];

            setSelectedSoIds(soIds);
            setExpandedSoIds(soIds); // Expand all by default
        }
    }, [order]);

    const getInvolvedSalesOrders = (doData) => {
        const soMap = new Map();
        doData.delivery_order_items?.forEach(item => {
            const so = item.sales_order_item?.sales_order || doData.sales_order;
            if (so && !soMap.has(so.id)) {
                soMap.set(so.id, so);
            }
        });
        return Array.from(soMap.values());
    };

    const groupItemsBySO = (items) => {
        const groups = {};
        items.forEach(item => {
            const soId = item.sales_order_item?.sales_order_id || order.sales_order_id;
            if (!groups[soId]) groups[soId] = [];
            groups[soId].push(item);
        });
        return groups;
    };

    const calculateSOTotal = (items) => {
        return items.reduce((total, item) => {
            const soItem = item.sales_order_item ||
                order.sales_order?.sales_order_items?.find(si => si.product_id === item.product_id);

            if (!soItem) return total;

            const quantity = item.quantity_delivered;
            const unitPrice = parseFloat(soItem.unit_price);
            const discount = parseFloat(soItem.discount_percentage || 0);
            const tax = parseFloat(soItem.tax_rate || 0);

            let price = quantity * unitPrice;
            const discountAmount = price * (discount / 100);
            const taxAmount = (price - discountAmount) * (tax / 100);

            return total + (price - discountAmount + taxAmount);
        }, 0);
    };

    const calculateFinalTotal = () => {
        if (!order || !order.delivery_order_items) return 0;
        const selectedItems = order.delivery_order_items.filter(item => {
            const soId = item.sales_order_item?.sales_order_id || order.sales_order_id;
            return selectedSoIds.includes(soId);
        });
        return calculateSOTotal(selectedItems);
    };

    const handleConfirm = () => {
        onConfirm(order, poNumber, selectedSoIds);
    };

    const toggleSoSelection = (soId, e) => {
        e.stopPropagation();
        setSelectedSoIds(prev =>
            prev.includes(soId)
                ? prev.filter(id => id !== soId)
                : [...prev, soId]
        );
    };

    const toggleSoExpand = (soId) => {
        setExpandedSoIds(prev =>
            prev.includes(soId)
                ? prev.filter(id => id !== soId)
                : [...prev, soId]
        );
    };

    if (!order) return null;

    const involvedSOs = getInvolvedSalesOrders(order);
    const itemGroups = groupItemsBySO(order.delivery_order_items || []);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Invoice</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg border">
                            <div>
                                <span className="font-semibold block text-muted-foreground uppercase text-[10px] tracking-tight">Delivery Order</span>
                                <span className="font-bold text-base">{order.delivery_order_number}</span>
                            </div>
                            <div>
                                <span className="font-semibold block text-muted-foreground uppercase text-[10px] tracking-tight">Customer</span>
                                <span className="font-bold text-base">{order.customer?.company_name || order.customer?.name}</span>
                            </div>
                            <div className="col-span-2">
                                <span className="font-semibold block text-muted-foreground uppercase text-[10px] tracking-tight">Date</span>
                                <span>{new Date(order.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                            Sales Orders & Items
                        </h3>

                        {involvedSOs.map(so => {
                            const soItems = itemGroups[so.id] || [];
                            const isSelected = selectedSoIds.includes(so.id);
                            const isExpanded = expandedSoIds.includes(so.id);
                            const soTotal = calculateSOTotal(soItems);

                            return (
                                <div key={so.id} className={`border rounded-lg overflow-hidden transition-all ${isSelected ? 'border-primary/50 ring-1 ring-primary/10' : 'border-border'}`}>
                                    {/* SO Header */}
                                    <div
                                        className={`flex items-center justify-between p-3 cursor-pointer select-none transition-colors ${isSelected ? 'bg-primary/5' : 'bg-muted/20 hover:bg-muted/40'}`}
                                        onClick={() => toggleSoExpand(so.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => toggleSoSelection(so.id, e)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="rounded border-gray-300 text-primary focus:ring-primary h-5 w-5"
                                            />
                                            <div>
                                                <div className="font-bold flex items-center gap-2">
                                                    {so.sales_order_number}
                                                    {so.po_number && (
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-normal">
                                                            PO: {so.po_number}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {soItems.length} Items delivered
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-xs text-muted-foreground font-medium">SO Subtotal</div>
                                                <div className="font-bold text-primary">{formatRupiah(soTotal)}</div>
                                            </div>
                                            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SO Items List */}
                                    {isExpanded && (
                                        <div className="border-t bg-background">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left">Product</th>
                                                        <th className="px-4 py-2 text-center">Qty</th>
                                                        <th className="px-4 py-2 text-right">Unit Price</th>
                                                        <th className="px-4 py-2 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-dashed">
                                                    {soItems.map((item, idx) => {
                                                        const soItem = item.sales_order_item ||
                                                            order.sales_order?.sales_order_items?.find(si => si.product_id === item.product_id);

                                                        if (!soItem) return (
                                                            <tr key={idx}>
                                                                <td colSpan="4" className="px-4 py-2 text-center text-red-500 italic text-xs">
                                                                    Pricing info missing for {item.product?.sku}
                                                                </td>
                                                            </tr>
                                                        );

                                                        const quantity = item.quantity_delivered;
                                                        const unitPrice = parseFloat(soItem.unit_price);
                                                        const discount = parseFloat(soItem.discount_percentage || 0);
                                                        const tax = parseFloat(soItem.tax_rate || 0);

                                                        let price = quantity * unitPrice;
                                                        const discountAmount = price * (discount / 100);
                                                        const taxAmount = (price - discountAmount) * (tax / 100);
                                                        const total = price - discountAmount + taxAmount;

                                                        return (
                                                            <tr key={idx} className="hover:bg-muted/10">
                                                                <td className="px-4 py-2 group">
                                                                    <div className="font-semibold group-hover:text-primary transition-colors">{item.product?.sku}</div>
                                                                    <div className="text-[10px] text-muted-foreground leading-tight">{item.product?.name}</div>
                                                                </td>
                                                                <td className="px-4 py-2 text-center font-medium">{quantity}</td>
                                                                <td className="px-4 py-2 text-right text-muted-foreground">{formatRupiah(unitPrice)}</td>
                                                                <td className="px-4 py-2 text-right font-bold">{formatRupiah(total)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-2">
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex justify-between items-center">
                            <div className="space-y-1">
                                <span className="font-bold text-sm text-primary uppercase tracking-wider">Estimated Invoice Amount</span>
                                <div className="text-[11px] text-muted-foreground leading-none">
                                    Includes items from {selectedSoIds.length} selected Sales Orders
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-black text-primary block">
                                    {formatRupiah(calculateFinalTotal())}
                                </span>
                                <span className="text-[10px] text-muted-foreground block">
                                    Based on delivered quantities.
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t mt-2">
                        <Label htmlFor="po_number" className="text-xs uppercase font-bold text-muted-foreground">PO Customer (Optional)</Label>
                        <Input
                            id="po_number"
                            value={poNumber}
                            onChange={(e) => setPoNumber(e.target.value)}
                            placeholder="Enter PO Number manually if needed"
                            className="h-10 border-muted-foreground/20 focus:border-primary"
                        />
                        <p className="text-[10px] text-muted-foreground leading-tight italic">
                            * Updating this field will permanently update the PO Number reference for the primary Sales Order.
                        </p>
                    </div>
                </div>
                <DialogFooter className="bg-muted/20 -mx-6 -mb-6 p-6 rounded-b-lg gap-2">
                    <Button variant="ghost" onClick={onClose} className="font-bold">Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || selectedSoIds.length === 0}
                        className="font-bold px-8 shadow-lg shadow-primary/20 transition-transform active:scale-95"
                    >
                        {loading ? 'Processing...' : 'Generate Invoice'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateInvoiceModal;
