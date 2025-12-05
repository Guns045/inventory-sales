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
            setPoNumber(order.po_number || '');
        }
    }, [order]);

    const handleConfirm = () => {
        onConfirm(order, poNumber);
    };

    if (!order) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Invoice</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-semibold block">Sales Order:</span>
                                {order.sales_order_number}
                            </div>
                            <div>
                                <span className="font-semibold block">Date:</span>
                                {new Date(order.created_at).toLocaleDateString()}
                            </div>
                            <div className="col-span-2">
                                <span className="font-semibold block">Customer:</span>
                                {order.customer?.company_name || order.customer?.name}
                            </div>
                            <div className="col-span-2">
                                <span className="font-semibold block">Total Amount:</span>
                                <span className="text-lg font-bold text-primary">
                                    {formatRupiah(order.total_amount)}
                                </span>
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
