import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsCard } from "@/components/common/StatsCard";
import { useAPI } from '@/contexts/APIContext';
import { useToast } from '@/hooks/useToast';
import { DollarSign, Search, Calendar, TrendingDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Expenses = () => {
    const { api } = useAPI();
    const { showSuccess, showError } = useToast();

    const [expenses, setExpenses] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({
        search: '',
        date_from: '',
        date_to: '',
        finance_account_id: 'all'
    });

    const [selectedExpense, setSelectedExpense] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [filter]);

    const fetchAccounts = async () => {
        try {
            const response = await api.get('/finance/accounts');
            setAccounts(response.data || []);
        } catch (err) {
            console.error('Error fetching accounts:', err);
        }
    };

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filter.search) params.append('search', filter.search);
            if (filter.date_from) params.append('date_from', filter.date_from);
            if (filter.date_to) params.append('date_to', filter.date_to);
            if (filter.finance_account_id && filter.finance_account_id !== 'all') {
                params.append('finance_account_id', filter.finance_account_id);
            }
            params.append('per_page', 2000);

            const response = await api.get(`/finance/expenses?${params.toString()}`);
            setExpenses(response.data.data || response.data || []);
        } catch (err) {
            console.error('Error fetching expenses:', err);
            showError('Failed to fetch expenses');
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        total_amount: expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0),
        count: expenses.length,
        this_month: expenses.filter(e => {
            const d = new Date(e.transaction_date);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).reduce((sum, e) => sum + parseFloat(e.amount), 0)
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const handleViewDetail = (expense) => {
        setSelectedExpense(expense);
        setShowDetailModal(true);
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <PageHeader
                title="Expenses"
                description="View and manage all expenses (money out)"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    title="Total Expenses"
                    value={formatCurrency(stats.total_amount)}
                    icon={<TrendingDown className="h-4 w-4" />}
                    variant="danger"
                />
                <StatsCard
                    title="Transactions"
                    value={stats.count}
                    icon={<DollarSign className="h-4 w-4" />}
                    variant="primary"
                />
                <StatsCard
                    title="This Month"
                    value={formatCurrency(stats.this_month)}
                    icon={<Calendar className="h-4 w-4" />}
                    variant="warning"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Expense History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search expenses..."
                                value={filter.search}
                                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                                className="pl-8"
                            />
                        </div>
                        <Select value={filter.finance_account_id} onValueChange={(v) => setFilter({ ...filter, finance_account_id: v })}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All Accounts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Accounts</SelectItem>
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id.toString()}>
                                        {acc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="date"
                            className="w-[150px]"
                            value={filter.date_from}
                            onChange={(e) => setFilter({ ...filter, date_from: e.target.value })}
                        />
                        <Input
                            type="date"
                            className="w-[150px]"
                            value={filter.date_to}
                            onChange={(e) => setFilter({ ...filter, date_to: e.target.value })}
                        />
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No expenses found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell>{new Date(expense.transaction_date).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{expense.description}</div>
                                                {expense.reference_type && (
                                                    <div className="text-xs text-muted-foreground">
                                                        Ref: {expense.reference_type.split('\\').pop()} #{expense.reference_id}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{expense.category}</Badge>
                                            </TableCell>
                                            <TableCell>{expense.account?.name || 'N/A'}</TableCell>
                                            <TableCell className="text-right font-medium text-red-600">
                                                {formatCurrency(expense.amount)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost" size="sm" onClick={() => handleViewDetail(expense)}>
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Expense Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Expense Details</DialogTitle>
                    </DialogHeader>
                    {selectedExpense && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div>
                                    <label className="text-muted-foreground text-xs">Date</label>
                                    <div className="font-medium">{new Date(selectedExpense.transaction_date).toLocaleDateString()}</div>
                                </div>
                                <div>
                                    <label className="text-muted-foreground text-xs">Amount</label>
                                    <div className="font-bold text-lg text-red-600">{formatCurrency(selectedExpense.amount)}</div>
                                </div>
                                <div>
                                    <label className="text-muted-foreground text-xs">Category</label>
                                    <div className="font-medium">
                                        <Badge variant="outline">{selectedExpense.category}</Badge>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-muted-foreground text-xs">Account</label>
                                    <div className="font-medium">{selectedExpense.account?.name || 'N/A'}</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-muted-foreground text-xs">Description</label>
                                <div className="font-medium p-3 bg-muted/30 rounded">{selectedExpense.description}</div>
                            </div>

                            {selectedExpense.reference_type && (
                                <div className="space-y-2">
                                    <label className="text-muted-foreground text-xs">Reference</label>
                                    <div className="font-medium font-mono p-3 bg-muted/30 rounded text-sm">
                                        {selectedExpense.reference_type.split('\\').pop()} #{selectedExpense.reference_id}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setShowDetailModal(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Expenses;
