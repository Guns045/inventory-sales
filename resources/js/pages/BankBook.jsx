import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { useAPI } from '@/contexts/APIContext';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Search } from "lucide-react";
import { useNavigate, useParams } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const BankBook = () => {
    const { api } = useAPI();
    const { showSuccess, showError } = useToast();
    const navigate = useNavigate();
    const { id } = useParams();

    const [account, setAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({
        date_from: '',
        date_to: ''
    });

    useEffect(() => {
        fetchAccountDetails();
        fetchTransactions();
    }, [id, filter]);

    const fetchAccountDetails = async () => {
        try {
            const response = await api.get(`/finance/accounts/${id}`);
            setAccount(response.data);
        } catch (error) {
            showError('Failed to fetch account details');
        }
    };

    const fetchTransactions = async () => {
        try {
            const params = new URLSearchParams();
            if (filter.date_from) params.append('date_from', filter.date_from);
            if (filter.date_to) params.append('date_to', filter.date_to);

            const response = await api.get(`/finance/accounts/${id}/transactions?${params.toString()}`);
            setTransactions(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center space-x-4 mb-6">
                <Button variant="outline" size="icon" onClick={() => navigate('/finance/accounts')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{account?.name}</h2>
                    <p className="text-muted-foreground">
                        {account?.bank_name} - {account?.account_number}
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{account ? formatCurrency(account.balance) : '...'}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Mutation History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 mb-4">
                        <Input
                            type="date"
                            value={filter.date_from}
                            onChange={(e) => setFilter({ ...filter, date_from: e.target.value })}
                            className="w-[150px]"
                        />
                        <Input
                            type="date"
                            value={filter.date_to}
                            onChange={(e) => setFilter({ ...filter, date_to: e.target.value })}
                            className="w-[150px]"
                        />
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Debit (In)</TableHead>
                                    <TableHead className="text-right">Credit (Out)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((trx) => (
                                    <TableRow key={trx.id}>
                                        <TableCell>{new Date(trx.transaction_date).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{trx.description}</div>
                                            <div className="text-xs text-muted-foreground">Ref: {trx.reference_type?.split('\\').pop()} #{trx.reference_id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{trx.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-green-600 font-medium">
                                            {trx.type === 'IN' ? (
                                                <div className="flex items-center justify-end">
                                                    <ArrowDownLeft className="mr-1 h-3 w-3" />
                                                    {formatCurrency(trx.amount)}
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600 font-medium">
                                            {trx.type === 'OUT' ? (
                                                <div className="flex items-center justify-end">
                                                    <ArrowUpRight className="mr-1 h-3 w-3" />
                                                    {formatCurrency(trx.amount)}
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {transactions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No transactions found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default BankBook;
