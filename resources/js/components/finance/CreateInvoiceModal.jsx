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

    useEffect(() => {
        if (order) {
            setPoNumber(order.sales_order?.po_number || '');
        }
    }, [order]);

    const calculateTotal = (doData) => {
        if (!doData || !doData.delivery_order_items) return 0;

        return doData.delivery_order_items.reduce((total, item) => {
            // Priority: Directly linked salesOrderItem (Consolidated support), fallback to primary SO items list
            const soItem = item.sales_order_item ||
                doData.sales_order?.sales_order_items?.find(si => si.product_id === item.product_id);

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

    const handleConfirm = () => {
        onConfirm(order, poNumber);
    };

    if (!order) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[750px]">
                <DialogHeader>
                    <DialogTitle>Create Invoice</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-semibold block text-muted-foreground uppercase text-[10px]">Delivery Order</span>
                                <span className="font-bold">{order.delivery_order_number}</span>
                            </div>
                            <div>
                                <span className="font-semibold block text-muted-foreground uppercase text-[10px]">Reference</span>
                                <span className="font-bold">{order.sales_order?.sales_order_number || 'CONSOLIDATED'}</span>
                            </div>
                            <div>
                                <span className="font-semibold block text-muted-foreground uppercase text-[10px]">Date</span>
                                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                            </div>
                            <div>
                                <span className="font-semibold block text-muted-foreground uppercase text-[10px]">Customer</span>
                                <span>{order.customer?.company_name || order.customer?.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="px-3 py-2 text-left">Product</th>
                                    <th className="px-3 py-2 text-center">Qty</th>
                                    <th className="px-3 py-2 text-right">Price</th>
                                    <th className="px-3 py-2 text-right">Disc %</th>
                                    <th className="px-3 py-2 text-right">Tax %</th>
                                    <th className="px-3 py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {order.delivery_order_items?.map((item, index) => {
                                    const soItem = item.sales_order_item ||
                                        order.sales_order?.sales_order_items?.find(si => si.product_id === item.product_id);

                                    if (!soItem) return (
                                        <tr key={index}>
                                            <td colSpan="6" className="px-3 py-2 text-center text-red-500 italic">
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
                                        <tr key={index} className="hover:bg-muted/30">
                                            <td className="px-3 py-2">
                                                <div className="font-semibold">{item.product?.sku}</div>
                                                <div className="text-[11px] text-muted-foreground leading-tight">{item.product?.name}</div>
                                            </td>
                                            <td className="px-3 py-2 text-center">{quantity}</td>
                                            <td className="px-3 py-2 text-right">{formatRupiah(unitPrice)}</td>
                                            <td className="px-3 py-2 text-right text-muted-foreground">{discount > 0 ? `${discount}%` : '-'}</td>
                                            <td className="px-3 py-2 text-right text-muted-foreground">{tax > 0 ? `${tax}%` : '-'}</td>
                                            <td className="px-3 py-2 text-right font-semibold">{formatRupiah(total)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                        <div className="col-span-2 p-3 bg-muted rounded-md flex justify-between items-center">
                            <span className="font-semibold">Estimated Invoice Amount:</span>
                            <div className="text-right">
                                <span className="text-xl font-bold text-primary block">
                                    {formatRupiah(calculateTotal(order))}
                                </span>
                                <span className="text-xs text-muted-foreground block">
                                    Calculated based on delivered quantities.
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                        <Label htmlFor="po_number">PO Customer (Optional)</Label>
                        <Input
                            id="po_number"
                            value={poNumber}
                            onChange={(e) => setPoNumber(e.target.value)}
                            placeholder="Enter PO Number if missing"
                        />
                        <p className="text-xs text-muted-foreground">
                            This will update the PO Number for this order.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Invoice'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateInvoiceModal;
