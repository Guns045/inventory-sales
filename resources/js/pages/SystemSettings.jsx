import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useAPI } from '@/contexts/APIContext';
import { toast } from "sonner";
import Swal from 'sweetalert2';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const SystemSettings = () => {
    const { user } = useAuth();
    const { api } = useAPI();
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    // Strict check for root user
    const isRoot = user?.email === 'root@jinantruck.my.id';

    const handleResetData = async () => {
        if (confirmText !== 'RESET DATA') {
            toast.error("Please type 'RESET DATA' to confirm.");
            return;
        }

        setLoading(true);
        setShowConfirm(false); // Close the dialog first

        try {
            const response = await api.post('/system/reset-data');

            Swal.fire({
                title: 'Success!',
                text: 'System data has been reset successfully.',
                icon: 'success',
                confirmButtonColor: '#10B981', // Emerald 500
            });

            setConfirmText("");
        } catch (error) {
            console.error("Reset failed:", error);

            Swal.fire({
                title: 'Failed!',
                text: error.response?.data?.message || "Failed to reset data.",
                icon: 'error',
                confirmButtonColor: '#EF4444', // Red 500
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isRoot) {
        return (
            <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                    You do not have permission to access these system settings. This area is restricted to the root administrator.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <Alert variant="warning" className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Warning: Dangerous Area</AlertTitle>
                <AlertDescription className="text-amber-700">
                    Actions performed here are irreversible and can cause permanent data loss. Proceed with extreme caution.
                </AlertDescription>
            </Alert>

            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                        <Trash2 className="h-5 w-5" />
                        Reset Transaction Data
                    </CardTitle>
                    <CardDescription>
                        This will permanently delete all transaction data including:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Quotations</li>
                            <li>Sales Orders</li>
                            <li>Delivery Orders</li>
                            <li>Picking Lists</li>
                            <li>Invoices & Payments</li>
                            <li>Sales-related Stock Movements</li>
                        </ul>
                        <p className="mt-2 font-medium">Master data (Products, Customers, Users) will be preserved.</p>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                        <DialogTrigger asChild>
                            <Button variant="destructive">Reset System Data</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="text-red-600 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Confirm Data Reset
                                </DialogTitle>
                                <DialogDescription>
                                    This action cannot be undone. All sales transaction data will be permanently deleted.
                                    <br /><br />
                                    Please type <strong>RESET DATA</strong> to confirm.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded-md"
                                    placeholder="Type RESET DATA"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleResetData}
                                    disabled={loading || confirmText !== 'RESET DATA'}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm Reset
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
    );
};

export default SystemSettings;
