import React, { useState } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, RotateCcw, AlertTriangle } from "lucide-react";
import { useToast } from '@/hooks/useToast';

const SuperAdminActions = ({ type, id, currentStatus, onSuccess }) => {
    const { user } = useAuth();
    const { post } = useAPI();
    const { showSuccess, showError } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [action, setAction] = useState('force_status'); // 'force_status' or 'revert_stock'
    const [newStatus, setNewStatus] = useState(currentStatus);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    // Strict check for Root User email
    if (user?.email !== 'root@jinantruck.my.id') {
        return null;
    }

    const handleSubmit = async () => {
        if (!reason) {
            showError('Please provide a reason for this admin action');
            return;
        }

        try {
            setLoading(true);
            if (action === 'force_status') {
                await post('/admin/force-status', {
                    type,
                    id,
                    status: newStatus,
                    reason
                });
                showSuccess('Status force updated successfully');
            } else if (action === 'revert_stock') {
                await post('/admin/revert-stock', {
                    type,
                    id,
                    reason
                });
                showSuccess('Stock reverted successfully');
            }

            setShowModal(false);
            setReason('');
            if (onSuccess) onSuccess();
        } catch (err) {
            showError(err.response?.data?.message || 'Action failed');
        } finally {
            setLoading(false);
        }
    };

    const statusOptions = [
        'PENDING', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED'
    ];

    return (
        <>
            <Button
                variant="destructive"
                size="sm"
                className="gap-2 bg-red-900 hover:bg-red-950"
                onClick={() => setShowModal(true)}
            >
                <ShieldAlert className="h-4 w-4" />
                God Mode
            </Button>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="border-red-500 border-2">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Super Admin Action (God Mode)
                        </DialogTitle>
                        <DialogDescription>
                            Use with extreme caution. This bypasses standard validations.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Action Type</Label>
                            <Select value={action} onValueChange={setAction}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="force_status">Force Change Status</SelectItem>
                                    <SelectItem value="revert_stock">Revert Stock (Add back to Inventory)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {action === 'force_status' && (
                            <div className="space-y-2">
                                <Label>New Status</Label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map(status => (
                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {action === 'revert_stock' && (
                            <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded-md border border-yellow-200">
                                <p className="font-semibold flex items-center gap-2">
                                    <RotateCcw className="h-4 w-4" />
                                    Warning:
                                </p>
                                <p>This will add the items from this order back to their respective warehouses. Ensure the stock hasn't been returned already.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Reason (Required)</Label>
                            <Input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Why are you doing this?"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-red-900 hover:bg-red-950"
                        >
                            {loading ? 'Processing...' : 'Execute Action'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default SuperAdminActions;
