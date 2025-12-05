import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, CheckCircle, XCircle, CreditCard } from "lucide-react";
import { StatusBadge } from '@/components/common/StatusBadge';

const SalesReturnDetail = () => {
    const { id } = useParams();
    const { get, post } = useAPI();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const { user } = useAuth();

    const [returnOrder, setReturnOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchReturnDetails();
    }, [id]);

    const fetchReturnDetails = async () => {
        try {
            setLoading(true);
            const response = await get(`/sales-returns/${id}`);
            if (response && response.data) {
                setReturnOrder(response.data.data || response.data);
            }
        } catch (err) {
            console.error('Error fetching return details:', err);
            showError('Failed to fetch return details');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!window.confirm('Are you sure you want to approve this return? This will update the stock.')) {
            return;
        }

        try {
            setProcessing(true);
            await post(`/sales-returns/${id}/approve`);
            showSuccess('Return approved successfully');
            fetchReturnDetails();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to approve return');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        const reason = window.prompt('Please enter the reason for rejection:');
        if (reason === null) return; // User cancelled
        if (!reason.trim()) {
            showError('Rejection reason is required');
            return;
        }

        try {
            setProcessing(true);
            await post(`/sales-returns/${id}/reject`, { reason });
            showSuccess('Return rejected successfully');
            fetchReturnDetails();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to reject return');
        } finally {
            setProcessing(false);
        }
    };

    const handleCreateCreditNote = async () => {
        if (!window.confirm('Are you sure you want to create a Credit Note for this return?')) {
            return;
        }

        try {
            setProcessing(true);
            const response = await post('/credit-notes', { sales_return_id: id });
            showSuccess('Credit Note created successfully');
            // Refresh details to show the "View Credit Note" button
            fetchReturnDetails();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to create Credit Note');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    if (!returnOrder) {
        return <div className="p-6">Return order not found</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title={`Return ${returnOrder.return_number}`}
                description="View return details"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/sales-returns')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        {returnOrder.status === 'PENDING' && user?.permissions?.includes('sales-returns.approve') && (
                            <>
                                <Button onClick={handleApprove} disabled={processing}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve Return
                                </Button>
                                {user?.permissions?.includes('sales-returns.reject') && (
                                    <Button variant="destructive" onClick={handleReject} disabled={processing}>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject Return
                                    </Button>
                                )}
                            </>
                        )}
                        {returnOrder.credit_note && (
                            <Button variant="outline" onClick={() => navigate(`/credit-notes/${returnOrder.credit_note.id}`)}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                View Credit Note
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Items Returned</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-center">Quantity</TableHead>
                                        <TableHead className="text-center">Condition</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {returnOrder.items?.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{item.product?.sku}</span>
                                                    <span className="text-sm text-muted-foreground">{item.product?.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={item.condition === 'GOOD' ? 'success' : 'destructive'}>
                                                    {item.condition}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Return Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm text-muted-foreground">Status</div>
                                <StatusBadge status={returnOrder.status} config={{
                                    'PENDING': { variant: 'warning', label: 'Pending' },
                                    'APPROVED': { variant: 'success', label: 'Approved' },
                                    'REJECTED': { variant: 'destructive', label: 'Rejected' },
                                    'COMPLETED': { variant: 'success', label: 'Completed' }
                                }} />
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Sales Order</div>
                                <div className="font-medium">{returnOrder.sales_order?.sales_order_number}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Customer</div>
                                <div className="font-medium">{returnOrder.sales_order?.customer?.company_name}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Reason</div>
                                <div className="p-2 bg-gray-50 rounded text-sm">{returnOrder.reason}</div>
                            </div>
                            {returnOrder.notes && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Notes</div>
                                    <div className="text-sm">{returnOrder.notes}</div>
                                </div>
                            )}
                            <div>
                                <div className="text-sm text-muted-foreground">Created By</div>
                                <div className="text-sm">{returnOrder.created_by?.name}</div>
                                <div className="text-xs text-muted-foreground">{new Date(returnOrder.created_at).toLocaleString()}</div>
                            </div>
                            {returnOrder.approved_by && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Approved By</div>
                                    <div className="text-sm">{returnOrder.approved_by?.name}</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SalesReturnDetail;
