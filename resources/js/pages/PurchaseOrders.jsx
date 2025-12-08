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

  // Form Data
  const [formData, setFormData] = useState({
    supplier_id: '',
    warehouse_id: '',
    status: 'DRAFT',
    expected_delivery_date: '',
    notes: ''
  });

  const [newItem, setNewItem] = useState({
    product_id: '',
    product_name: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 11
  });

  const [items, setItems] = useState([]);

  // Send PO Form State
  const [sendFormData, setSendFormData] = useState({
    recipient_email: '',
    custom_message: ''
  });

  // Auto-suggest state
  const [productSearch, setProductSearch] = useState('');
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const wrapperRef = React.useRef(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

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

  // Form Handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNewItemChange = (field, value) => {
    if (field === 'product_id') {
      const selectedProduct = products.find(p => p.id === parseInt(value));
      const unitPrice = selectedProduct ? selectedProduct.buy_price || 0 : 0;
      const productName = selectedProduct ? (selectedProduct.name || selectedProduct.description || '') : '';

      setNewItem(prev => ({
        ...prev,
        product_id: value,
        product_name: productName,
        unit_price: unitPrice
      }));
    } else {
      setNewItem(prev => ({ ...prev, [field]: value }));
    }
  };

  const calculateItemTotal = (quantity, unitPrice, taxRate) => {
    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * (taxRate / 100);
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    };
  };

  const addItem = () => {
    if (!newItem.product_id || newItem.quantity <= 0) return;

    const selectedProduct = products.find(p => p.id === parseInt(newItem.product_id));
    const quantity = parseInt(newItem.quantity) || 1;
    const unitPrice = parseFloat(newItem.unit_price);
    const taxRate = parseFloat(newItem.tax_rate);

    const calculations = calculateItemTotal(quantity, unitPrice, taxRate);

    const item = {
      id: Date.now(),
      product_id: newItem.product_id,
      product_name: selectedProduct ? (selectedProduct.name || selectedProduct.description) : 'Unknown',
      sku: selectedProduct?.sku || '',
      part_number: selectedProduct?.part_number || '',
      description: selectedProduct?.description || '',
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      subtotal: calculations.subtotal,
      tax_amount: calculations.taxAmount,
      total: calculations.total
    };

    setItems(prev => [...prev, item]);
    setNewItem({
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 11
    });
    setProductSearch('');
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleProductSearchChange = async (e) => {
    const value = e.target.value;
    setProductSearch(value);

    if (value.length < 2) {
      setSuggestedProducts([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setLoadingSuggestions(true);
      const response = await api.get(`/products?search=${value}&per_page=10`);
      setSuggestedProducts(response.data.data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectProduct = (product) => {
    const unitPrice = product.buy_price || 0;
    const productName = product.name || product.description || '';

    setNewItem(prev => ({
      ...prev,
      product_id: product.id.toString(),
      product_name: productName,
      unit_price: unitPrice
    }));
    setProductSearch(`${productName} (${product.sku})`);
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      showError('Please add at least one item');
      return;
    }

    try {
      const payload = {
        ...formData,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes
        }))
      };

      if (editingOrder) {
        await api.put(`/purchase-orders/${editingOrder.id}`, payload);
        showSuccess('Purchase order updated successfully');
      } else {
        await api.post('/purchase-orders', payload);
        showSuccess('Purchase order created successfully');
      }

      setShowCreateModal(false);
      resetForm();
      fetchPurchaseOrders();
    } catch (err) {
      showError('Failed to save purchase order');
    }
  };

  const resetForm = () => {
    setEditingOrder(null);
    setItems([]);
    setFormData({
      supplier_id: '',
      warehouse_id: '',
      status: 'DRAFT',
      expected_delivery_date: '',
      notes: ''
    });
    setNewItem({
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 11
    });
    setProductSearch('');
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      supplier_id: order.supplier_id?.toString() || '',
      warehouse_id: order.warehouse_id?.toString() || '',
      status: order.status,
      expected_delivery_date: order.expected_delivery_date ? order.expected_delivery_date.split('T')[0] : '',
      notes: order.notes || ''
    });

    // Transform items if needed, or fetch them
    // For simplicity, we might need to fetch items or map them if included in order object
    // Assuming order.items is available and populated
    if (order.items) {
      const mappedItems = order.items.map(item => ({
        id: item.id,
        product_id: (item.product_id || item.product?.id)?.toString() || '',
        product_name: item.product?.name || 'Unknown',
        part_number: item.product?.part_number || '',
        description: item.product?.description || '',
        quantity: item.quantity_ordered || 0,
        unit_price: item.unit_price || 0,
        tax_rate: 11, // Default or from item if available
        subtotal: (item.quantity_ordered || 0) * (item.unit_price || 0),
        tax_amount: ((item.quantity_ordered || 0) * (item.unit_price || 0)) * 0.11,
        total: ((item.quantity_ordered || 0) * (item.unit_price || 0)) * 1.11
      }));
      setItems(mappedItems);
    }

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
            <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
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
            canEdit={canEdit}
            canDelete={canDelete}
            canSend={canSend}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={formData.supplier_id} onValueChange={(v) => handleInputChange('supplier_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select value={formData.warehouse_id} onValueChange={(v) => handleInputChange('warehouse_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expected Date</Label>
                <Input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => handleInputChange('expected_delivery_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => handleInputChange('status', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Optional notes..."
              />
            </div>

            {/* Items Section */}
            <div className="border rounded-md p-4 space-y-4">
              <h3 className="font-semibold">Order Items</h3>

              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4 space-y-2">
                  <Label>Product</Label>
                  <div className="relative" ref={wrapperRef}>
                    <Input
                      placeholder="Search product..."
                      value={productSearch}
                      onChange={handleProductSearchChange}
                      onFocus={() => {
                        if (productSearch.length >= 2) setShowSuggestions(true);
                      }}
                    />
                    {loadingSuggestions && (
                      <div className="absolute right-3 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {showSuggestions && suggestedProducts.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                        {suggestedProducts.map((product) => (
                          <div
                            key={product.id}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => handleSelectProduct(product)}
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-gray-500">{product.sku}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => handleNewItemChange('quantity', e.target.value)}
                  />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newItem.unit_price}
                    onChange={(e) => handleNewItemChange('unit_price', e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Tax (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newItem.tax_rate}
                    onChange={(e) => handleNewItemChange('tax_rate', e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <Button onClick={addItem} size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              {items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={item.id || idx}>
                        <TableCell>
                          <div className="font-medium">{item.part_number}</div>
                          <div className="text-xs text-muted-foreground">{item.product_name}</div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell>{formatCurrency(item.total)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Items Modal */}
      <Dialog open={showItemsModal} onOpenChange={setShowItemsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Items for {selectedOrder?.po_number}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
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
          <DialogFooter>
            <Button onClick={() => setShowItemsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send PO Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
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
            {selectedOrder?.status === 'APPROVED' && (
              <Button onClick={() => handleStatusUpdate(selectedOrder, 'ORDERED')}>
                Mark as Ordered
              </Button>
            )}
            <SuperAdminActions
              type="purchase_order"
              id={selectedOrder?.id}
              currentStatus={selectedOrder?.status}
              onSuccess={() => {
                fetchPurchaseOrders(pagination.current_page);
                setShowItemsModal(false);
              }}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrders;