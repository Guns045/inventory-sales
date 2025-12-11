import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format } from 'date-fns';

export function QuotationDetailModal({ open, onOpenChange, quotation, onCancel }) {
    if (!quotation) return null;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return format(new Date(dateString), 'dd MMM yyyy');
    };

    const calculateItemTotal = (item) => {
        const subtotal = (item.quantity || 0) * (item.unit_price || 0);
        const discount = subtotal * ((item.discount_percentage || 0) / 100);
        return subtotal - discount;
    };

    // Calculate totals manually to match transformer logic if needed, 
    // or use the ones from the quotation object if they are correct.
    // Since we fixed the transformer, let's rely on the item calculations for display consistency.

    const items = quotation.items || quotation.quotation_items || [];

    const subtotal = items.reduce((acc, item) => {
        const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
        const discount = itemTotal * ((item.discount_percentage || 0) / 100);
        return acc + (itemTotal - discount);
    }, 0);

    const totalTax = items.reduce((acc, item) => {
        const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
        const discount = itemTotal * ((item.discount_percentage || 0) / 100);
        const taxable = itemTotal - discount;
        return acc + (taxable * ((item.tax_rate || 0) / 100));
    }, 0);

    const grandTotal = subtotal + totalTax + (parseFloat(quotation.other_costs) || 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Quotation Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <div className="grid grid-cols-[120px_1fr]">
                                <span className="font-medium">Quotation No</span>
                                <span>: {quotation.quotation_number}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr]">
                                <span className="font-medium">Date</span>
                                <span>: {formatDate(quotation.quotation_date || quotation.created_at)}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr]">
                                <span className="font-medium">Valid Until</span>
                                <span>: {formatDate(quotation.valid_until)}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr]">
                                <span className="font-medium">Status</span>
                                <span className="capitalize">: {quotation.status}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr]">
                                <span className="font-medium">Terms of Payment</span>
                                <span>: {quotation.terms_of_payment ? quotation.terms_of_payment.replace(/_/g, ' ') : '-'}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="grid grid-cols-[120px_1fr]">
                                <span className="font-medium">PO Customer</span>
                                <span>: {quotation.po_number || '-'}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr]">
                                <span className="font-medium">Customer</span>
                                <span>: {quotation.customer?.company_name || quotation.customer?.name}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr]">
                                <span className="font-medium">Address</span>
                                <span>: {quotation.customer?.address || '-'}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr]">
                                <span className="font-medium">Warehouse</span>
                                <span>: {quotation.warehouse?.name || '-'}</span>
                            </div>
                            <div className="grid grid-cols-[120px_1fr]">
                                <span className="font-medium">Sales Person</span>
                                <span>: {quotation.user?.name || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left">Part Number</th>
                                    <th className="px-4 py-2 text-left">Description</th>
                                    <th className="px-4 py-2 text-center">Qty</th>
                                    <th className="px-4 py-2 text-right">Unit Price</th>
                                    <th className="px-4 py-2 text-center">Disc %</th>
                                    <th className="px-4 py-2 text-center">Tax %</th>
                                    <th className="px-4 py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2">{item.product?.sku || item.product_code || '-'}</td>
                                        <td className="px-4 py-2">{item.product?.name || item.description || '-'}</td>
                                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                                        <td className="px-4 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                                        <td className="px-4 py-2 text-center">{item.discount_percentage || 0}%</td>
                                        <td className="px-4 py-2 text-center">{item.tax_rate || 0}%</td>
                                        <td className="px-4 py-2 text-right">{formatCurrency(calculateItemTotal(item))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax</span>
                                <span>{formatCurrency(totalTax)}</span>
                            </div>
                            {parseFloat(quotation.other_costs) > 0 && (
                                <div className="flex justify-between">
                                    <span>Other Costs</span>
                                    <span>{formatCurrency(quotation.other_costs)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-base border-t pt-2">
                                <span>Grand Total</span>
                                <span>{formatCurrency(grandTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {quotation.notes && (
                        <div className="text-sm">
                            <span className="font-medium">Notes:</span>
                            <p className="mt-1 text-gray-600 whitespace-pre-wrap">{quotation.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {quotation.status === 'APPROVED' && onCancel && (
                    <div className="flex justify-end mt-6 pt-4 border-t">
                        <button
                            onClick={() => onCancel(quotation)}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Cancel Quotation
                        </button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
