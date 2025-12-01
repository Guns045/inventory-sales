import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAPI } from '@/contexts/APIContext';
import { Loader2, Check, X, FileText, User, Calendar, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ReviewQuotationModal({ quotationId, isOpen, onClose, onSuccess }) {
    const { api } = useAPI();
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [notes, setNotes] = useState("");
    const [reasonType, setReasonType] = useState(""); // New state for rejection reason
    const [action, setAction] = useState(null); // 'approve' or 'reject'

    useEffect(() => {
        if (isOpen && quotationId) {
            fetchQuotation();
            setNotes("");
            setReasonType("");
            setAction(null);
        }
    }, [isOpen, quotationId]);

    const fetchQuotation = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/quotations/${quotationId}`);
            setQuotation(response.data.data);
        } catch (error) {
            console.error("Failed to fetch quotation:", error);
            toast.error("Failed to load quotation details");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (type) => {
        if (!type) return;

        // Validate rejection reason
        if (type === 'reject' && !reasonType) {
            toast.error("Please select a reason for rejection");
            return;
        }

        setProcessing(true);
        setAction(type);
        try {
            const endpoint = type === 'approve'
                ? `/quotations/${quotationId}/approve`
                : `/quotations/${quotationId}/reject`;

            const payload = { notes };
            if (type === 'reject') {
                payload.reason_type = reasonType;
            }

            await api.post(endpoint, payload);

            toast.success(`Quotation ${type}d successfully`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error(`Failed to ${type} quotation:`, error);
            toast.error(`Failed to ${type} quotation: ` + (error.response?.data?.message || "Unknown error"));
        } finally {
            setProcessing(false);
            setAction(null);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Review Quotation
                        </DialogTitle>
                        {quotation && (
                            <Badge variant="outline" className="text-sm">
                                {quotation.quotation_number}
                            </Badge>
                        )}
                    </div>
                    <DialogDescription>
                        Review the quotation details before approving or rejecting.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6 pt-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : quotation ? (
                        <div className="space-y-6">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <User className="h-3 w-3" /> Customer
                                    </div>
                                    <div className="font-medium">{quotation.customer?.company_name}</div>
                                    <div className="text-sm text-gray-500">{quotation.customer?.contact_person}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="h-3 w-3" /> Date
                                    </div>
                                    <div className="font-medium">
                                        {new Date(quotation.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric', month: 'long', year: 'numeric'
                                        })}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Valid until: {new Date(quotation.valid_until).toLocaleDateString('id-ID')}
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div>
                                <h4 className="text-sm font-semibold mb-3">Items</h4>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-gray-500">Product</th>
                                                <th className="px-4 py-2 text-right font-medium text-gray-500">Qty</th>
                                                <th className="px-4 py-2 text-right font-medium text-gray-500">Price</th>
                                                <th className="px-4 py-2 text-right font-medium text-gray-500">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {quotation.items?.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-2">
                                                        <div className="font-medium">{item.product?.name}</div>
                                                        <div className="text-xs text-gray-500">{item.product?.sku}</div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                                                    <td className="px-4 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                                                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-medium">
                                            <tr>
                                                <td colSpan={3} className="px-4 py-2 text-right">Subtotal</td>
                                                <td className="px-4 py-2 text-right">{formatCurrency(quotation.subtotal)}</td>
                                            </tr>
                                            {Number(quotation.tax_amount) > 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-2 text-right">Tax ({quotation.tax_rate}%)</td>
                                                    <td className="px-4 py-2 text-right">{formatCurrency(quotation.tax_amount)}</td>
                                                </tr>
                                            )}
                                            <tr className="border-t border-gray-200">
                                                <td colSpan={3} className="px-4 py-3 text-right text-base">Total Amount</td>
                                                <td className="px-4 py-3 text-right text-base text-blue-600 font-bold">
                                                    {formatCurrency(quotation.total_amount)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Notes & Reason Section */}
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Rejection Reason <span className="text-red-500 text-xs">(Required for Rejection)</span>
                                    </label>
                                    <select
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={reasonType}
                                        onChange={(e) => setReasonType(e.target.value)}
                                    >
                                        <option value="" disabled>Select a reason...</option>
                                        <option value="No FU">No Follow Up</option>
                                        <option value="No Stock">No Stock</option>
                                        <option value="Price">Price Issue</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Approval/Rejection Notes <span className="text-gray-400 font-normal">(Optional)</span>
                                    </label>
                                    <Textarea
                                        placeholder="Add notes for your decision..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            Quotation details not found.
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="p-6 border-t bg-gray-50">
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Cancel
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="destructive"
                            onClick={() => handleAction('reject')}
                            disabled={processing || loading || !quotation}
                            className="gap-2"
                        >
                            {processing && action === 'reject' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <X className="h-4 w-4" />
                            )}
                            Reject
                        </Button>
                        <Button
                            onClick={() => handleAction('approve')}
                            disabled={processing || loading || !quotation}
                            className="bg-green-600 hover:bg-green-700 gap-2"
                        >
                            {processing && action === 'approve' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            Approve
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
