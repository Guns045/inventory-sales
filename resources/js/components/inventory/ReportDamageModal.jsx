import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAPI } from '@/contexts/APIContext';

const ReportDamageModal = ({ isOpen, onClose, onSuccess, product, warehouseId }) => {
    const { api } = useAPI();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        quantity: '',
        reason: '',
        notes: '',
        reference_number: ''
    });

    const reasons = [
        { value: 'DAMAGED', label: 'Damaged' },
        { value: 'EXPIRED', label: 'Expired' },
        { value: 'QUALITY_ISSUE', label: 'Quality Issue' },
        { value: 'LOST', label: 'Lost' },
        { value: 'THEFT', label: 'Theft' },
        { value: 'OTHER', label: 'Other' }
    ];

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setFormData({
            quantity: '',
            reason: '',
            notes: '',
            reference_number: ''
        });
        setError(null);
        setSuccess(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (value) => {
        setFormData(prev => ({
            ...prev,
            reason: value
        }));
    };

    const handleSubmit = async () => {
        if (!formData.quantity || !formData.reason) {
            setError("Please fill in quantity and reason");
            return;
        }

        if (parseInt(formData.quantity) <= 0) {
            setError("Quantity must be greater than 0");
            return;
        }

        // Available quantity validation
        if (product && parseInt(formData.quantity) > product.available_quantity) {
            setError(`Quantity cannot exceed available stock (${product.available_quantity})`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await api.post('/product-stock/damage', {
                product_id: product?.product_id,
                warehouse_id: warehouseId,
                quantity: parseInt(formData.quantity),
                reason: formData.reason,
                notes: formData.notes,
                reference_number: formData.reference_number
            });

            setSuccess("Damage reported successfully");
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err) {
            console.error("Report damage failed:", err);
            setError(err.response?.data?.message || "Failed to report damage");
        } finally {
            setLoading(false);
        }
    };

    if (!product) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-red-700 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Report Damaged Stock
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    <div className="bg-slate-50 p-3 rounded-md border text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-muted-foreground">Product:</span>
                                <div className="font-medium">{product.product_name}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">SKU:</span>
                                <div className="font-medium">{product.sku}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Current Available:</span>
                                <div className="font-medium text-green-600">{product.available_quantity}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Current Damaged:</span>
                                <div className="font-medium text-red-600">{product.damaged_quantity || 0}</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason *</Label>
                        <Select value={formData.reason} onValueChange={handleSelectChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                            <SelectContent>
                                {reasons.map((reason) => (
                                    <SelectItem key={reason.value} value={reason.value}>
                                        {reason.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Quantity to Report *</Label>
                        <Input
                            type="number"
                            name="quantity"
                            placeholder="Enter quantity"
                            value={formData.quantity}
                            onChange={handleChange}
                            min="1"
                            max={product.available_quantity}
                        />
                        <p className="text-xs text-muted-foreground">
                            This will move items from "Available" to "Damaged" status.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Reference Number (Optional)</Label>
                        <Input
                            name="reference_number"
                            placeholder="e.g. QC-001 or INC-123"
                            value={formData.reference_number}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            name="notes"
                            placeholder="Additional details..."
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading} variant="destructive">
                        {loading ? "Reporting..." : "Report Damage"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReportDamageModal;
