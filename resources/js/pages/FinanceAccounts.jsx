import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { useAPI } from '@/contexts/APIContext';
import { useToast } from '@/hooks/useToast';
import { Plus, Wallet, Building2, ArrowRightLeft } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FinanceAccounts = () => {
    const { api } = useAPI();
    const { showSuccess, showError } = useToast();
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'BANK',
        currency: 'IDR',
        account_number: '',
        bank_name: '',
        description: '',
        initial_balance: ''
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const response = await api.get('/finance/accounts');
            setAccounts(response.data);
        } catch (error) {
            showError('Failed to fetch accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            await api.post('/finance/accounts', formData);
            showSuccess('Account created successfully');
            setIsCreateOpen(false);
            fetchAccounts();
            setFormData({
                name: '',
                type: 'BANK',
                currency: 'IDR',
                account_number: '',
                bank_name: '',
                description: '',
                initial_balance: ''
            });
        } catch (error) {
            showError('Failed to create account');
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
            <PageHeader
                title="Finance Accounts"
                description="Manage cash and bank accounts"
                actions={
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Account
                    </Button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {accounts.map((account) => (
                    <Card
                        key={account.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => navigate(`/finance/accounts/${account.id}`)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {account.name}
                            </CardTitle>
                            {account.type === 'CASH' ? (
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(account.balance)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {account.bank_name} {account.account_number}
                            </p>
                            <div className="mt-4 flex items-center text-sm text-blue-600">
                                <ArrowRightLeft className="mr-1 h-3 w-3" />
                                View Mutations
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Finance Account</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Account Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Bank BCA, Main Cash"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(v) => setFormData({ ...formData, type: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BANK">Bank</SelectItem>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {formData.type === 'BANK' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Bank Name</Label>
                                    <Input
                                        value={formData.bank_name}
                                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                        placeholder="e.g. BCA, Mandiri"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Account Number</Label>
                                    <Input
                                        value={formData.account_number}
                                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                        placeholder="e.g. 1234567890"
                                    />
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <Label>Initial Balance</Label>
                            <Input
                                type="text"
                                value={formatInputNumber(formData.initial_balance)}
                                onChange={(e) => setFormData({ ...formData, initial_balance: parseInputNumber(e.target.value) })}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>Create Account</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FinanceAccounts;
