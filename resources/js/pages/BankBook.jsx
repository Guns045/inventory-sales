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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Settings2 } from "lucide-react";

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

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        bank_name: '',
        account_number: '',
        description: ''
    });

    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [adjustForm, setAdjustForm] = useState({
        type: 'IN',
        amount: '',
        category: 'Adjustment',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchAccountDetails();
        fetchTransactions();
    }, [id, filter]);

    const fetchAccountDetails = async () => {
        try {
            const response = await api.get(`/finance/accounts/${id}`);
            setAccount(response.data);
            setEditForm({
                name: response.data.name,
                bank_name: response.data.bank_name || '',
                account_number: response.data.account_number || '',
                description: response.data.description || ''
            });
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

    const handleUpdateAccount = async () => {
        try {
            await api.put(`/finance/accounts/${id}`, editForm);
            showSuccess('Account updated successfully');
            setIsEditOpen(false);
            fetchAccountDetails();
        } catch (error) {
            showError('Failed to update account');
        }
    };

    const handleAdjustBalance = async () => {
        try {
            await api.post('/finance/transactions', {
                ...adjustForm,
                finance_account_id: id
            });
            showSuccess('Balance adjusted successfully');
            setIsAdjustOpen(false);
            fetchAccountDetails();
            fetchTransactions();
            setAdjustForm({
                type: 'IN',
                amount: '',
                category: 'Adjustment',
                description: '',
                transaction_date: new Date().toISOString().split('T')[0]
            });
        } catch (error) {
            showError(error.response?.data?.message || 'Failed to adjust balance');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatInputNumber = (value) => {
        if (!value) return '';
        const number = value.replace(/\D/g, '');
        return new Intl.NumberFormat('id-ID').format(number);
    };

    const parseInputNumber = (value) => {
        if (!value) return '';
        return value.replace(/\./g, '');
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center space-x-4">
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
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit Account
                    </Button>
                    <Button onClick={() => setIsAdjustOpen(true)}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Adjust Balance
                    </Button>
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

            {/* Edit Account Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Account Details</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Account Name</Label>
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bank Name</Label>
                            <Input
                                value={editForm.bank_name}
                                onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Account Number</Label>
                            <Input
                                value={editForm.account_number}
                                onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateAccount}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Adjust Balance Dialog */}
            <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adjust Account Balance</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Adjustment Type</Label>
                            <Select
                                value={adjustForm.type}
                                onValueChange={(v) => setAdjustForm({ ...adjustForm, type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="IN">Money In (Debit)</SelectItem>
                                    <SelectItem value="OUT">Money Out (Credit)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                                type="text"
                                value={formatInputNumber(adjustForm.amount)}
                                onChange={(e) => setAdjustForm({ ...adjustForm, amount: parseInputNumber(e.target.value) })}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Adjustment Date</Label>
                            <Input
                                type="date"
                                value={adjustForm.transaction_date}
                                onChange={(e) => setAdjustForm({ ...adjustForm, transaction_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Input
                                value={adjustForm.category}
                                onChange={(e) => setAdjustForm({ ...adjustForm, category: e.target.value })}
                                placeholder="e.g. Adjustment, Bank Charges"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={adjustForm.description}
                                onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                                placeholder="Reason for adjustment"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdjustOpen(false)}>Cancel</Button>
                        <Button onClick={handleAdjustBalance}>Apply Adjustment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BankBook;
