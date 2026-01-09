import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseOrderTable } from '@/components/purchasing/PurchaseOrderTable';
import { Plus, RefreshCw, Trash2, Printer, Send, Eye, Loader2, Search } from "lucide-react";
import { useToast } from '@/hooks/useToast';
import SuperAdminActions from '@/components/admin/SuperAdminActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import CreatePurchaseOrderModal from '@/components/purchasing/CreatePurchaseOrderModal';

const PurchaseOrders = () => {
  const { api } = useAPI();
  const { hasPermission, user } = usePermissions();
  const { showSuccess, showError } = useToast();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Data for forms
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);

  // Send PO Form State
  const [sendFormData, setSendFormData] = useState({
    recipient_email: '',
    custom_message: ''
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [financeAccounts, setFinanceAccounts] = useState([]);
  const [paymentData, setPaymentData] = useState({
    amount_paid: '',
    payment_date: '',
    finance_account_id: ''
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({});

  useEffect(() => {
    fetchPurchaseOrders();
    fetchFinanceAccounts();
  }, [filter]);

  const fetchFinanceAccounts = async () => {
    try {
      const response = await api.get('/finance/accounts');
      setFinanceAccounts(response.data);
    } catch (error) {
      console.error('Error fetching finance accounts:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchaseOrders(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    // fetchPurchaseOrders is called by the search effect
    fetchSuppliers();
    fetchWarehouses();
    fetchProducts();
  }, []);

  const handleRecordPaymentClick = (po) => {
    setSelectedPO(po);
    setPaymentData({
      amount_paid: po.total_amount - (po.paid_amount || 0),
      payment_date: new Date().toISOString().split('T')[0],
      finance_account_id: ''
    });
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    try {
      await api.post(`/purchase-orders/${selectedPO.id}/payments`, paymentData);
      showSuccess('Payment recorded successfully');
      setShowPaymentModal(false);
      fetchPurchaseOrders();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const fetchPurchaseOrders = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page });
      if (search) params.append('search', search);

      const response = await api.get(`/purchase-orders?${params.toString()}`);
      setPurchaseOrders(response.data.data || response.data || []);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      showError('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products?per_page=1000');
      const productsData = response.data.data || response.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setShowCreateModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;
    try {
      await api.delete(`/purchase-orders/${id}`);
      showSuccess('Purchase order deleted successfully');
      fetchPurchaseOrders();
    } catch (err) {
      showError('Failed to delete purchase order');
    }
  };

  const handleViewItems = async (order) => {
    setSelectedOrder(order);
    try {
      const response = await api.get(`/purchase-orders/${order.id}/items`);
      setOrderItems(Array.isArray(response.data) ? response.data : []);
      setShowItemsModal(true);
    } catch (err) {
      showError('Failed to fetch order items');
    }
  };

  const handlePrintPDF = async (orderId) => {
    try {
      const response = await api.get(`/purchase-orders/${orderId}/print`, {
        responseType: 'blob',
        headers: { 'Accept': 'application/pdf' }
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (error) {
      showError('Failed to print purchase order');
    }
  };

  const handleSendPO = (order) => {
    setSelectedOrder(order);
    setSendFormData({
      recipient_email: order.supplier?.email || '',
      custom_message: ''
    });
    setShowSendModal(true);
  };

  const handleSendPOSubmit = async () => {
    try {
      await api.post(`/purchase-orders/${selectedOrder.id}/send`, sendFormData);
      showSuccess('Purchase Order sent successfully!');
      setShowSendModal(false);
      fetchPurchaseOrders();
    } catch (err) {
      showError('Failed to send purchase order');
    }
  };

  // Permissions
  const canEdit = (order) => (hasPermission('edit_purchase_orders') || user?.role === 'Super Admin' || user?.role === 'Admin') && order.status === 'DRAFT';
  const canDelete = (order) => (hasPermission('edit_purchase_orders') || user?.role === 'Super Admin' || user?.role === 'Admin') && order.status === 'DRAFT';
  const canSend = (order) => (hasPermission('edit_purchase_orders') || user?.role === 'Super Admin' || user?.role === 'Admin') && order.status === 'DRAFT';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-muted-foreground">Manage purchase orders and suppliers</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => fetchPurchaseOrders()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {(hasPermission('create_purchase_orders') || user?.role === 'Super Admin' || user?.role === 'Admin') && (
            <Button onClick={() => { setEditingOrder(null); setShowCreateModal(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders List</CardTitle>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardDescription>View and manage all purchase orders</CardDescription>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search purchase orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PurchaseOrderTable
            data={purchaseOrders}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewItems={handleViewItems}
            onPrint={handlePrintPDF}
            onSend={handleSendPO}
            onPay={handleRecordPaymentClick}
            canEdit={canEdit}
            canDelete={canDelete}
            canSend={canSend}
          />
        </CardContent>
      </Card>



      {/* View Items Modal */}
      < Dialog open={showItemsModal} onOpenChange={setShowItemsModal} >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Items for {selectedOrder?.po_number}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-md border max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="font-medium">{item.product?.sku || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{item.product?.name || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.quantity_ordered * item.unit_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowItemsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Send PO Modal */}
      < Dialog open={showSendModal} onOpenChange={setShowSendModal} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Purchase Order</DialogTitle>
            <DialogDescription>
              Send PO {selectedOrder?.po_number} to supplier via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                value={sendFormData.recipient_email}
                onChange={(e) => setSendFormData({ ...sendFormData, recipient_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={sendFormData.custom_message}
                onChange={(e) => setSendFormData({ ...sendFormData, custom_message: e.target.value })}
                placeholder="Optional message..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendModal(false)}>Cancel</Button>
            <Button onClick={handleSendPOSubmit}>
              <Send className="mr-2 h-4 w-4" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      <CreatePurchaseOrderModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingOrder(null);
        }}
        onSuccess={() => {
          setShowCreateModal(false);
          setEditingOrder(null);
          fetchPurchaseOrders();
        }}
        order={editingOrder}
        suppliers={suppliers}
        warehouses={warehouses}
        products={products}
      />

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment for PO {selectedPO?.po_number}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Payment Source Account</Label>
              <Select
                value={paymentData.finance_account_id}
                onValueChange={(v) => setPaymentData({ ...paymentData, finance_account_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
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
                value={paymentData.amount_paid}
                onChange={(e) => setPaymentData({ ...paymentData, amount_paid: e.target.value })}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button onClick={handleConfirmPayment}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default PurchaseOrders;