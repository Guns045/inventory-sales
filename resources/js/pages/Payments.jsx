import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsCard } from "@/components/common/StatsCard";
import { PaymentTable } from "@/components/finance/PaymentTable";
import { useAPI } from '@/contexts/APIContext';
import { useToast } from '@/hooks/useToast';
import { CreditCard, Search, Download, DollarSign, Calendar } from "lucide-react";

const Payments = () => {
  const { api } = useAPI();
  const { showSuccess, showError } = useToast();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    search: '',
    date_from: '',
    date_to: '',
    method: 'all'
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.search) params.append('search', filter.search);
      if (filter.date_from) params.append('date_from', filter.date_from);
      if (filter.date_to) params.append('date_to', filter.date_to);
      if (filter.method && filter.method !== 'all') params.append('method', filter.method);
      params.append('per_page', 2000);

      // In a real app, this would be:
      const response = await api.get(`/payments?${params.toString()}`);
      setPayments(response.data.data || response.data || []);

    } catch (err) {
      console.error('Error fetching data:', err);
      // Fallback to mock data if API fails or is not implemented yet
      setPayments([
        {
          id: 1,
          invoice_number: 'INV-2024-10-001',
          customer: { company_name: 'Customer A' },
          amount_paid: 375.00,
          payment_date: '2024-10-15',
          payment_method: 'Bank Transfer',
          reference_number: 'REF-001'
        },
        {
          id: 2,
          invoice_number: 'INV-2024-10-002',
          customer: { company_name: 'Customer B' },
          amount_paid: 25.00,
          payment_date: '2024-10-16',
          payment_method: 'Cash',
          reference_number: 'REF-002'
        },
        {
          id: 3,
          invoice_number: 'INV-2024-10-003',
          customer: { company_name: 'Customer A' },
          amount_paid: 700.00,
          payment_date: '2024-10-14',
          payment_method: 'Credit Card',
          reference_number: 'REF-003'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.search) params.append('search', filter.search);
      if (filter.date_from) params.append('date_from', filter.date_from);
      if (filter.date_to) params.append('date_to', filter.date_to);
      params.append('export', 'excel');

      const response = await api.get(`/payments/export?${params.toString()}`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payments-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Export successful');
    } catch (error) {
      showError('Failed to export data');
    }
  };

  const stats = {
    total_amount: payments.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0),
    count: payments.length,
    this_month: payments.filter(p => {
      const d = new Date(p.payment_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, p) => sum + parseFloat(p.amount_paid), 0)
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleViewDetail = (payment) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <PageHeader
        title="Payments"
        description="View and manage received payments"
      >
        <Button variant="outline" onClick={handleExportExcel}>
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Received"
          value={formatCurrency(stats.total_amount)}
          icon={<DollarSign className="h-4 w-4" />}
          variant="success"
        />
        <StatsCard
          title="Transactions"
          value={stats.count}
          icon={<CreditCard className="h-4 w-4" />}
          variant="primary"
        />
        <StatsCard
          title="This Month"
          value={formatCurrency(stats.this_month)}
          icon={<Calendar className="h-4 w-4" />}
          variant="info"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="pl-8"
              />
            </div>
            <Select value={filter.method} onValueChange={(v) => setFilter({ ...filter, method: v })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
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

          <PaymentTable
            data={payments}
            loading={loading}
            onView={handleViewDetail}
          />
        </CardContent>
      </Card>

      {/* Payment Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <label className="text-muted-foreground text-xs">Invoice Number</label>
                  <div className="font-medium">{selectedPayment.invoice?.invoice_number}</div>
                </div>
                <div>
                  <label className="text-muted-foreground text-xs">Payment Date</label>
                  <div className="font-medium">{new Date(selectedPayment.payment_date).toLocaleDateString()}</div>
                </div>
                <div>
                  <label className="text-muted-foreground text-xs">Payment Method</label>
                  <div className="font-medium">
                    <Badge variant="outline">{selectedPayment.payment_method}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-muted-foreground text-xs">Amount Paid</label>
                  <div className="font-bold text-lg text-green-600">{formatCurrency(selectedPayment.amount_paid)}</div>
                </div>
              </div>

              {/* Detailed Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Customer Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-muted-foreground text-xs">Customer Name</label>
                      <div className="font-medium">{selectedPayment.invoice?.customer?.company_name || selectedPayment.invoice?.customer?.name}</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs">Email</label>
                      <div className="font-medium">{selectedPayment.invoice?.customer?.email || '-'}</div>
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs">Phone</label>
                      <div className="font-medium">{selectedPayment.invoice?.customer?.phone || '-'}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Payment Reference</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-muted-foreground text-xs">Reference Number</label>
                      <div className="font-medium font-mono bg-muted p-2 rounded text-sm">
                        {selectedPayment.reference_number || 'No reference provided'}
                      </div>
                    </div>
                    <div>
                      <label className="text-muted-foreground text-xs">Invoice Total Amount</label>
                      <div className="font-medium">{formatCurrency(selectedPayment.invoice?.total_amount)}</div>
                    </div>
                  </div>
                </div>
              </div>
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

export default Payments;