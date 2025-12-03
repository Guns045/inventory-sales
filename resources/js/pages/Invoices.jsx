import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsCard } from "@/components/common/StatsCard";
import { InvoiceTable } from "@/components/finance/InvoiceTable";
import { DataTable } from "@/components/common/DataTable";
import { useAPI } from '@/contexts/APIContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { FileText, Clock, AlertCircle, CheckCircle, Search, Download } from "lucide-react";

const Invoices = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [invoices, setInvoices] = useState([]);
  const [shippedOrders, setShippedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    search: '',
    date_from: '',
    date_to: '',
    customer: ''
  });

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_date: '',
    payment_method: 'Bank Transfer',
    notes: ''
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status && filter.status !== 'all') params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);
      if (filter.date_from) params.append('date_from', filter.date_from);
      if (filter.date_to) params.append('date_to', filter.date_to);
      if (filter.customer) params.append('customer', filter.customer);

      const [invoicesRes, shippedOrdersRes] = await Promise.all([
        api.get(`/invoices?${params.toString()}`),
        api.get('/invoices/ready-to-create')
      ]);

      setInvoices(invoicesRes.data.data || invoicesRes.data || []);

      let orders = [];
      if (shippedOrdersRes.data && Array.isArray(shippedOrdersRes.data.data)) {
        orders = shippedOrdersRes.data.data;
      } else if (Array.isArray(shippedOrdersRes.data)) {
        orders = shippedOrdersRes.data;
      }
      setShippedOrders(orders);

    } catch (err) {
      console.error('Error fetching data:', err);
      showError('Failed to fetch invoice data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (salesOrderId) => {
    try {
      setCreateLoading(true);
      const salesOrderRes = await api.get(`/sales-orders/${salesOrderId}`);
      const salesOrder = salesOrderRes.data.data || salesOrderRes.data;

      if (!window.confirm(`Create invoice for SO: ${salesOrder.sales_order_number}?`)) {
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceData = {
        sales_order_id: salesOrderId,
        customer_id: salesOrder.customer_id,
        issue_date: today,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'UNPAID'
      };

      const response = await api.post('/invoices', invoiceData);
      if (response.data) {
        showSuccess(`Invoice ${response.data.invoice_number} created successfully`);
        fetchData();
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to create invoice');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleViewDetail = async (invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice.id}`);
      setSelectedInvoice(response.data.data || response.data);
      await fetchPaymentHistory(invoice.id);
      setShowDetailModal(true);
    } catch (err) {
      showError('Failed to fetch invoice details');
    }
  };

  const fetchPaymentHistory = async (invoiceId) => {
    try {
      const response = await api.get(`/payments?invoice_id=${invoiceId}`);
      setPaymentHistory(response.data.data || response.data || []);
    } catch (err) {
      setPaymentHistory([]);
    }
  };

  const handleAddPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.total_amount - (invoice.total_paid || 0),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Bank Transfer',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;

    try {
      const paymentAmount = parseFloat(paymentData.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        showError('Invalid payment amount');
        return;
      }

      await api.post('/payments', {
        invoice_id: selectedInvoice.id,
        payment_date: paymentData.payment_date,
        amount_paid: paymentAmount,
        payment_method: paymentData.payment_method,
        reference_number: paymentData.notes
      });

      showSuccess('Payment recorded successfully');
      setShowPaymentModal(false);
      fetchData();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleUpdateStatus = async (invoice, newStatus) => {
    try {
      await api.patch(`/invoices/${invoice.id}/status`, {
        status: newStatus,
        notes: `Status updated to ${newStatus} by user`
      });
      showSuccess(`Status updated to ${newStatus}`);
      fetchData();
    } catch (error) {
      showError('Failed to update status');
    }
  };

  const handlePrint = async (invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice.id}/print`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      showError('Failed to generate PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status && filter.status !== 'all') params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);
      if (filter.date_from) params.append('date_from', filter.date_from);
      if (filter.date_to) params.append('date_to', filter.date_to);
      params.append('export', 'excel');

      const response = await api.get(`/invoices/export?${params.toString()}`, {
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
      link.download = `invoices-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Export successful');
    } catch (error) {
      showError('Failed to export data');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const readyColumns = [
    {
      header: "SO Number",
      accessorKey: "sales_order_number",
      cell: (row) => <span className="font-medium">{row.sales_order_number}</span>
    },
    {
      header: "Customer",
      accessorKey: "customer.company_name",
      cell: (row) => row.customer?.company_name || row.customer?.name || '-'
    },
    {
      header: "Total",
      accessorKey: "total_amount",
      cell: (row) => <span className="font-bold text-blue-600">{formatCurrency(row.total_amount)}</span>
    },
    {
      header: "Shipped Date",
      accessorKey: "updated_at",
      cell: (row) => new Date(row.updated_at).toLocaleDateString()
    },
    {
      header: "Action",
      id: "actions",
      cell: (row) => (
        <Button
          size="sm"
          onClick={() => handleCreateInvoice(row.id)}
          disabled={createLoading}
        >
          Create Invoice
        </Button>
      )
    }
  ];

  const stats = {
    total: invoices.length,
    unpaid: invoices.filter(i => i.status === 'UNPAID').length,
    overdue: invoices.filter(i => i.status === 'OVERDUE').length,
    paid: invoices.filter(i => i.status === 'PAID').length
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <PageHeader
        title="Invoices"
        description="Manage invoices and payments"
      >
        <Button variant="outline" onClick={handleExportExcel}>
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Total Invoices" value={stats.total} icon={<FileText className="h-4 w-4" />} variant="primary" />
        <StatsCard title="Unpaid" value={stats.unpaid} icon={<Clock className="h-4 w-4" />} variant="warning" />
        <StatsCard title="Overdue" value={stats.overdue} icon={<AlertCircle className="h-4 w-4" />} variant="destructive" />
        <StatsCard title="Paid" value={stats.paid} icon={<CheckCircle className="h-4 w-4" />} variant="success" />
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">All Invoices</TabsTrigger>
          <TabsTrigger value="ready">Ready to Invoice ({shippedOrders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoices..."
                    value={filter.search}
                    onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                    className="pl-8"
                  />
                </div>
                <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <InvoiceTable
                data={invoices}
                loading={loading}
                onView={handleViewDetail}
                onAddPayment={handleAddPayment}
                onMarkOverdue={(inv) => handleUpdateStatus(inv, 'OVERDUE')}
                onUpdateStatus={handleUpdateStatus}
                onViewHistory={handleViewDetail}
                onPrint={handlePrint}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ready">
          <Card>
            <CardHeader>
              <CardTitle>Shipped Orders Ready for Invoicing</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={readyColumns}
                data={shippedOrders}
                loading={loading}
                emptyMessage="No orders ready for invoicing"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={paymentData.payment_method}
                onValueChange={(v) => setPaymentData({ ...paymentData, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder="Reference number or notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button onClick={handleConfirmPayment}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Customer</Label>
                <div className="font-medium">{selectedInvoice?.customer?.company_name}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div><Badge>{selectedInvoice?.status}</Badge></div>
              </div>
              <div>
                <Label className="text-muted-foreground">Total Amount</Label>
                <div className="font-bold text-lg text-blue-600">{formatCurrency(selectedInvoice?.total_amount || 0)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Balance Due</Label>
                <div className="font-bold text-red-600">{formatCurrency((selectedInvoice?.total_amount || 0) - (selectedInvoice?.total_paid || 0))}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Payment History</h4>
              {paymentHistory.length > 0 ? (
                <div className="border rounded-md p-2">
                  {paymentHistory.map((payment, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium">{formatCurrency(payment.amount_paid)}</div>
                        <div className="text-xs text-muted-foreground">{new Date(payment.payment_date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-sm">{payment.payment_method}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No payments recorded</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handlePrint(selectedInvoice)}>Print</Button>
            <Button onClick={() => setShowDetailModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;