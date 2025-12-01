import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from 'react-router-dom';
import { useAPI } from '../../contexts/APIContext';
import {
  DollarSign,
  TrendingUp,
  FileText,
  ShoppingCart,
  RefreshCw,
  Truck,
  CheckCircle,
  Receipt,
  Eye,
  Building,
  Calendar
} from "lucide-react";

const FinanceDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    tax_rate: 11,
    shipping_cost: 0,
    notes: ''
  });
  const [processing, setProcessing] = useState(false);
  const { api } = useAPI();

  useEffect(() => {
    fetchFinanceDashboard();
  }, []);

  const fetchFinanceDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/finance');
      setDashboardData(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching finance dashboard:', error);
      setError('Failed to load finance dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    setProcessing(true);
    try {
      await api.post('/invoices', {
        sales_order_id: selectedOrder.id,
        invoice_number: invoiceData.invoice_number,
        tax_rate: invoiceData.tax_rate,
        shipping_cost: invoiceData.shipping_cost,
        notes: invoiceData.notes
      });
      setShowInvoiceModal(false);
      setInvoiceData({
        invoice_number: '',
        tax_rate: 11,
        shipping_cost: 0,
        notes: ''
      });
      setSelectedOrder(null);
      fetchFinanceDashboard(); // Refresh data
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Failed to create invoice');
    } finally {
      setProcessing(false);
    }
  };

  const openInvoiceModal = (order) => {
    setSelectedOrder(order);
    // Generate invoice number automatically
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '-');
    const invoiceNum = `INV-${dateStr}-${String(order.id).padStart(3, '0')}`;
    setInvoiceData({
      ...invoiceData,
      invoice_number: invoiceNum
    });
    setShowInvoiceModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateTotalWithTaxAndShipping = (subtotal, taxRate, shippingCost) => {
    const taxAmount = (subtotal * taxRate) / 100;
    return subtotal + taxAmount + shippingCost;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-md">
        <h3 className="font-bold">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  const { shipped_sales_orders, completed_sales_orders, finance_summary } = dashboardData;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Finance Dashboard</h2>
          <p className="text-muted-foreground">Financial Overview and Invoicing</p>
        </div>
        <Button variant="outline" onClick={fetchFinanceDashboard}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Finance Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivable</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(finance_summary.total_receivable)}</div>
            <p className="text-xs text-muted-foreground">Outstanding Payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(finance_summary.monthly_revenue)}</div>
            <p className="text-xs text-muted-foreground">Revenue this Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finance_summary.pending_invoices}</div>
            <p className="text-xs text-muted-foreground">Orders Ready to Invoice</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finance_summary.total_orders}</div>
            <p className="text-xs text-muted-foreground">All Time Orders</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {/* Shipped Orders (Ready for Invoicing) */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="mr-2 h-5 w-5 text-blue-500" />
              Ready for Invoicing
            </CardTitle>
            <CardDescription>Sales Orders with status SHIPPED</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {shipped_sales_orders.length > 0 ? (
                shipped_sales_orders.map((order) => (
                  <div key={order.id} className="flex flex-col space-y-2 border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{order.sales_order_number}</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">SHIPPED</Badge>
                      </div>
                      <span className="font-bold">{formatCurrency(order.total_amount)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Building className="mr-1 h-3 w-3" />
                        {order.customer?.company_name || 'Unknown Customer'}
                      </div>
                      <div className="flex items-center justify-end">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(order.updated_at).toLocaleDateString('id-ID')}
                      </div>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {order.items.slice(0, 3).map((item, index) => (
                          <Badge key={index} variant="outline" className="text-xs font-normal">
                            {item.product?.name} x{item.quantity}
                          </Badge>
                        ))}
                        {order.items.length > 3 && (
                          <Badge variant="outline" className="text-xs font-normal">+{order.items.length - 3} more</Badge>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/sales-orders/${order.id}`}>
                          <Eye className="mr-1 h-3 w-3" /> View
                        </Link>
                      </Button>
                      <Button size="sm" onClick={() => openInvoiceModal(order)}>
                        <Receipt className="mr-1 h-3 w-3" /> Create Invoice
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Receipt className="mx-auto h-10 w-10 mb-3 opacity-20" />
                  <p>No orders ready for invoicing</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Completed Orders (Already Invoiced) */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              Completed Orders
            </CardTitle>
            <CardDescription>Orders that have been invoiced and paid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {completed_sales_orders.length > 0 ? (
                completed_sales_orders.map((order) => (
                  <div key={order.id} className="flex flex-col space-y-2 border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{order.sales_order_number}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">COMPLETED</Badge>
                      </div>
                      <span className="font-bold">{formatCurrency(order.total_amount)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Building className="mr-1 h-3 w-3" />
                        {order.customer?.company_name || 'Unknown Customer'}
                      </div>
                      <div className="flex items-center justify-end">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(order.updated_at).toLocaleDateString('id-ID')}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/invoices?so=${order.id}`}>
                          <Receipt className="mr-1 h-3 w-3" /> View Invoice
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/sales-orders/${order.id}`}>
                          <Eye className="mr-1 h-3 w-3" /> View Order
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle className="mx-auto h-10 w-10 mb-3 opacity-20" />
                  <p>No completed orders yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Invoice Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="grid gap-4 py-4">
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold">SO Number:</span> {selectedOrder.sales_order_number}
                  </div>
                  <div>
                    <span className="font-semibold">Customer:</span> {selectedOrder.customer?.company_name}
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold">Subtotal:</span> {formatCurrency(selectedOrder.total_amount)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="invoice_number">Invoice Number</Label>
                  <Input
                    id="invoice_number"
                    value={invoiceData.invoice_number}
                    onChange={(e) => setInvoiceData({ ...invoiceData, invoice_number: e.target.value })}
                    placeholder="INV-YYYY-MM-DD-XXX"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    value={invoiceData.tax_rate}
                    onChange={(e) => setInvoiceData({ ...invoiceData, tax_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="shipping_cost">Shipping Cost</Label>
                <Input
                  id="shipping_cost"
                  type="number"
                  value={invoiceData.shipping_cost}
                  onChange={(e) => setInvoiceData({ ...invoiceData, shipping_cost: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                  placeholder="Add notes..."
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-md mt-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedOrder.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax ({invoiceData.tax_rate}%)</span>
                    <span>{formatCurrency((selectedOrder.total_amount * invoiceData.tax_rate) / 100)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>{formatCurrency(invoiceData.shipping_cost)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>
                      {formatCurrency(
                        calculateTotalWithTaxAndShipping(
                          selectedOrder.total_amount,
                          invoiceData.tax_rate,
                          invoiceData.shipping_cost
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice} disabled={processing || !invoiceData.invoice_number.trim()}>
              {processing ? 'Processing...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceDashboard;