import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer } from "lucide-react";
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency } from '@/utils/format';

const CreditNoteDetail = () => {
    const { id } = useParams();
    const { get } = useAPI();
    const navigate = useNavigate();
    const [creditNote, setCreditNote] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCreditNoteDetails();
    }, [id]);

    const fetchCreditNoteDetails = async () => {
        try {
            setLoading(true);
            const response = await get(`/credit-notes/${id}`);
            if (response && response.data) {
                setCreditNote(response.data);
            }
        } catch (err) {
            console.error('Error fetching credit note details:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!creditNote) return <div className="p-6">Credit Note not found</div>;

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title={`Credit Note ${creditNote.credit_note_number}`}
                description="View credit note details"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/credit-notes')}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button variant="outline" onClick={() => window.print()}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Items Credited</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-center">Returned Qty</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creditNote.sales_return?.items?.map((item, index) => {
                                        // Note: In a real app, we should store the calculated price snapshot in credit_note_items table
                                        // For now, we are displaying the return items. The total amount is stored in credit_note.
                                        return (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{item.product?.sku}</span>
                                                        <span className="text-sm text-muted-foreground">{item.product?.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right font-bold">Total Credit Amount</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(creditNote.total_amount)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm text-muted-foreground">Status</div>
                                <StatusBadge status={creditNote.status} config={{
                                    'DRAFT': { variant: 'secondary', label: 'Draft' },
                                    'ISSUED': { variant: 'success', label: 'Issued' },
                                    'USED': { variant: 'default', label: 'Used' },
                                    'VOID': { variant: 'destructive', label: 'Void' }
                                }} />
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Date</div>
                                <div className="font-medium">{new Date(creditNote.date).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Customer</div>
                                <div className="font-medium">{creditNote.customer?.company_name}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Sales Return</div>
                                <div className="font-medium text-blue-600 cursor-pointer" onClick={() => navigate(`/sales-returns/${creditNote.sales_return_id}`)}>
                                    {creditNote.sales_return?.return_number}
                                </div>
                            </div>
                            {creditNote.notes && (
                                <div>
                                    <div className="text-sm text-muted-foreground">Notes</div>
                                    <div className="text-sm">{creditNote.notes}</div>
                                </div>
                            )}
                            <div>
                                <div className="text-sm text-muted-foreground">Created By</div>
                                <div className="text-sm">{creditNote.creator?.name}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CreditNoteDetail;
