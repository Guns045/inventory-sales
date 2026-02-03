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
import { FileText, Clock, AlertCircle, CheckCircle, Search, Download, Pencil, X, Check } from "lucide-react";
import CreateInvoiceModal from '../components/finance/CreateInvoiceModal';

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
  const [readySearch, setReadySearch] = useState('');

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [availableCreditNotes, setAvailableCreditNotes] = useState([]);
  const [financeAccounts, setFinanceAccounts] = useState([]);

  // God Mode state
  const [isEditingPo, setIsEditingPo] = useState(false);
  const [newPoNumber, setNewPoNumber] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchFinanceAccounts();
  }, [filter, readySearch]);

  const fetchFinanceAccounts = async () => {
    try {
      const response = await api.get('/finance/accounts');
      setFinanceAccounts(response.data);
    } catch (error) {
      console.error('Error fetching finance accounts:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status && filter.status !== 'all') params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);
      if (filter.date_from) params.append('date_from', filter.date_from);
      if (filter.date_to) params.append('date_to', filter.date_to);
      if (filter.customer) params.append('customer', filter.customer);

      const readyParams = new URLSearchParams();
      if (readySearch) readyParams.append('search', readySearch);

      const [invoicesRes, shippedOrdersRes] = await Promise.all([
        api.get(`/invoices?${params.toString()}`),
        api.get(`/invoices/ready-to-create?${readyParams.toString()}`)
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

  const handleCreateInvoiceClick = (order) => {
    setSelectedOrder(order);
    setIsCreateModalOpen(true);
  };

  const handleCreateInvoice = async (order, poNumber) => {
    try {
      setCreateLoading(true);

      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceData = {
        delivery_order_id: order.id, // Now passing DO ID
        sales_order_id: order.sales_order_id,
        customer_id: order.customer_id,
        issue_date: today,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'UNPAID',
        po_number: poNumber
      };

      const response = await api.post('/invoices', invoiceData);
      if (response.data) {
        showSuccess(`Invoice ${response.data.invoice_number || response.data.data.invoice_number} created successfully`);
        setIsCreateModalOpen(false);
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
      setAvailableCreditNotes(response.data.available_credit_notes || []);
      await fetchPaymentHistory(invoice.id);
      setShowDetailModal(true);
      // Reset edit mode when opening
      setIsEditingPo(false);
      setNewPoNumber(response.data.data?.po_number || response.data?.po_number || '');
    } catch (err) {
      showError('Failed to fetch invoice details');
    }
  };

  const handleClaimCreditNote = async (creditNote) => {
    if (!selectedInvoice) return;

    try {
      const remainingBalance = selectedInvoice.total_amount - (selectedInvoice.total_paid || 0);
      const amountToUse = Math.min(creditNote.total_amount, remainingBalance);

      await api.post('/payments', {
        invoice_id: selectedInvoice.id,
        payment_date: new Date().toISOString().split('T')[0],
        amount_paid: amountToUse,
        payment_method: 'Credit Note',
        reference_number: creditNote.credit_note_number,
        credit_note_id: creditNote.id
      });

      showSuccess(`Credit Note ${creditNote.credit_note_number} applied successfully`);
      handleViewDetail(selectedInvoice);
      fetchData();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to apply Credit Note');
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

  const fetchAvailableCreditNotes = async (customerId) => {
    try {
      // Fetch ISSUED credit notes for this customer
      const response = await api.get(`/credit-notes?customer_id=${customerId}&status=ISSUED`);
      setAvailableCreditNotes(response.data.data || response.data || []);
    } catch (err) {
      console.error('Error fetching credit notes:', err);
      setAvailableCreditNotes([]);
    }
  };

  const handleAddPayment = async (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.total_amount - (invoice.total_paid || 0),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Bank Transfer',
      notes: '',
      credit_note_id: '',
      finance_account_id: ''
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
        reference_number: paymentData.notes,
        finance_account_id: paymentData.finance_account_id
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
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoice.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
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
      header: "DO Number",
      accessorKey: "delivery_order_number",
      cell: (row) => <span className="font-medium">{row.delivery_order_number}</span>
    },
    {
      header: "SO Number",
      accessorKey: "sales_order.sales_order_number",
      cell: (row) => <span className="text-muted-foreground">{row.sales_order?.sales_order_number}</span>
    },
    {
      header: "Customer",
      accessorKey: "customer.company_name",
      cell: (row) => row.customer?.company_name || row.customer?.name || '-'
    },
    {
      header: "Delivered Date",
      accessorKey: "updated_at",
      cell: (row) => new Date(row.updated_at).toLocaleDateString()
    },
    {
      header: "Action",
      id: "actions",
      cell: (row) => (
        <Button
          size="sm"
          onClick={() => handleCreateInvoiceClick(row)}
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
              <CardTitle>Delivered Orders Ready for Invoicing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by DO number, SO number, or customer..."
                    value={readySearch}
                    onChange={(e) => setReadySearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
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
              <Label>Payment Method</Label>
              <Select
                value={paymentData.payment_method}
                onValueChange={(v) => {
                  setPaymentData({
                    ...paymentData,
                    payment_method: v
                  });
                }}
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
              <Label>Deposit To Account</Label>
              <Select
                value={paymentData.finance_account_id}
                onValueChange={(v) => setPaymentData({ ...paymentData, finance_account_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  {financeAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.name} ({acc.bank_name} {acc.account_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-muted-foreground text-xs">Customer</Label>
                <div className="font-medium">{selectedInvoice?.customer?.company_name}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Status</Label>
                <div className="mt-1"><Badge>{selectedInvoice?.status}</Badge></div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Issue Date</Label>
                <div className="font-medium">{selectedInvoice?.issue_date ? new Date(selectedInvoice.issue_date).toLocaleDateString() : '-'}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Due Date</Label>
                <div className="font-medium">{selectedInvoice?.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : '-'}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Sales Order</Label>
                <div className="font-medium">{selectedInvoice?.sales_order?.sales_order_number || '-'}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">PO Number</Label>
                <div className="flex items-center gap-2">
                  {isEditingPo ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={newPoNumber}
                        onChange={(e) => setNewPoNumber(e.target.value)}
                        className="h-7 w-32 text-sm"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={updateLoading}
                        onClick={async () => {
                          try {
                            setUpdateLoading(true);
                            await api.put(`/invoices/${selectedInvoice.id}`, {
                              ...selectedInvoice, // Be careful here, usually better to send only changed fields or ensure backend handles partial updates properly, but InvoiceController expects validated full request usually.
                              // Wait, UpdateInvoiceRequest makes many fields required.
                              // We need to send all required fields.
                              sales_order_id: selectedInvoice.sales_order_id,
                              customer_id: selectedInvoice.customer_id,
                              issue_date: selectedInvoice.issue_date,
                              due_date: selectedInvoice.due_date,
                              status: selectedInvoice.status,
                              po_number: newPoNumber
                            });
                            showSuccess('PO Number updated');
                            setIsEditingPo(false);
                            // Refresh
                            const updated = { ...selectedInvoice, po_number: newPoNumber };
                            setSelectedInvoice(updated);
                            fetchData();
                          } catch (err) {
                            showError('Failed to update PO Number');
                          } finally {
                            setUpdateLoading(false);
                          }
                        }}
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setIsEditingPo(false);
                          setNewPoNumber(selectedInvoice.po_number || '');
                        }}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium">{selectedInvoice?.po_number || '-'}</div>
                      {(user?.role === 'Super Admin' || user?.role === 'root') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-50 hover:opacity-100"
                          onClick={() => {
                            setNewPoNumber(selectedInvoice?.po_number || '');
                            setIsEditingPo(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Total Amount</Label>
                <div className="font-bold text-lg text-blue-600">{formatCurrency(selectedInvoice?.total_amount || 0)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Balance Due</Label>
                <div className="font-bold text-lg text-red-600">{formatCurrency((selectedInvoice?.total_amount || 0) - (selectedInvoice?.total_paid || 0))}</div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="font-semibold mb-2 text-sm">Invoice Items</h4>
              <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-center">Qty</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Disc %</th>
                      <th className="px-4 py-2 text-right">Tax %</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(selectedInvoice?.items || selectedInvoice?.invoice_items || []).map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2">
                          <div className="font-medium">{item.product?.sku || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{item.product?.name || item.description || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-2 text-right">{item.discount_percentage > 0 ? `${item.discount_percentage}%` : '-'}</td>
                        <td className="px-4 py-2 text-right">{item.tax_rate > 0 ? `${item.tax_rate}%` : '-'}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Available Credit Notes */}
            {availableCreditNotes.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-sm">Available Credit Notes</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">CN Number</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {availableCreditNotes.map((cn) => (
                        <tr key={cn.id}>
                          <td className="px-4 py-2 font-medium">{cn.credit_note_number}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(cn.total_amount)}</td>
                          <td className="px-4 py-2 text-right">
                            <Button size="sm" onClick={() => handleClaimCreditNote(cn)}>
                              Claim
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment History */}
            <div>
              <h4 className="font-semibold mb-2 text-sm">Payment History</h4>
              {paymentHistory.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Method</th>
                        <th className="px-4 py-2 text-left">Reference</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paymentHistory.map((payment, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2">{new Date(payment.payment_date).toLocaleDateString()}</td>
                          <td className="px-4 py-2">{payment.payment_method}</td>
                          <td className="px-4 py-2 text-muted-foreground">{payment.reference_number || '-'}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(payment.amount_paid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No payments recorded</div>
              )}
            </div>

            {/* Notes */}
            {selectedInvoice?.notes && (
              <div>
                <h4 className="font-semibold mb-1 text-sm">Notes</h4>
                <div className="p-3 bg-muted/30 rounded-md text-sm">{selectedInvoice.notes}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handlePrint(selectedInvoice)}>Print</Button>
            <Button onClick={() => setShowDetailModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onConfirm={handleCreateInvoice}
        order={selectedOrder}
        loading={createLoading}
      />
    </div>
  );
};

export default Invoices;