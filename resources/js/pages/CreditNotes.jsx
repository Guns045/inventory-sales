import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency } from '@/utils/format';

const CreditNotes = () => {
    const { get } = useAPI();
    const navigate = useNavigate();
    const [creditNotes, setCreditNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCreditNotes();
    }, []);

    const fetchCreditNotes = async () => {
        try {
            const response = await get('/credit-notes');
            if (response && response.data) {
                setCreditNotes(response.data.data || response.data);
            }
        } catch (err) {
            console.error('Error fetching credit notes:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="Credit Notes"
                description="Manage customer credit notes"
            />

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>CN Number</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Sales Return</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {creditNotes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No credit notes found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                creditNotes.map((cn) => (
                                    <TableRow key={cn.id}>
                                        <TableCell className="font-medium">{cn.credit_note_number}</TableCell>
                                        <TableCell>{new Date(cn.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{cn.customer?.company_name}</TableCell>
                                        <TableCell>{cn.sales_return?.return_number}</TableCell>
                                        <TableCell>{formatCurrency(cn.total_amount)}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={cn.status} config={{
                                                'DRAFT': { variant: 'secondary', label: 'Draft' },
                                                'ISSUED': { variant: 'success', label: 'Issued' },
                                                'USED': { variant: 'default', label: 'Used' },
                                                'VOID': { variant: 'destructive', label: 'Void' }
                                            }} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/credit-notes/${cn.id}`)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreditNotes;
