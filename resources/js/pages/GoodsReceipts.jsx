import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoodsReceiptTable } from '@/components/warehouse/GoodsReceiptTable';
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/useToast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const GoodsReceipts = () => {
  const { api } = useAPI();
  const { hasPermission } = usePermissions();
  const { showSuccess, showError } = useToast();

  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);

  // Form Data
  const [formData, setFormData] = useState({
    purchase_order_id: '',
    warehouse_id: '',
    received_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchGoodsReceipts();
    fetchPurchaseOrders();
    fetchWarehouses();
  }, []);

  const fetchGoodsReceipts = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/goods-receipts?page=${page}`);
      setGoodsReceipts(response.data.data || response.data || []);
    } catch (err) {
      showError('Failed to fetch goods receipts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await api.get('/purchase-orders/ready-for-goods-receipt');
      const data = response.data.data || response.data;
      setPurchaseOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePurchaseOrderChange = (poId) => {
    const selectedPO = purchaseOrders.find(po => po.id === parseInt(poId));
    setFormData(prev => ({
      ...prev,
      purchase_order_id: poId,
      warehouse_id: selectedPO?.warehouse_id?.toString() || prev.warehouse_id
    }));

    if (selectedPO) {
      const poItems = selectedPO.items.map(item => {
        const remaining = (item.quantity_ordered || item.quantity) - (item.quantity_received || 0);
        return {
          purchase_order_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product?.name || 'Unknown',
          quantity_ordered: item.quantity_ordered || item.quantity,
          quantity_already_received: item.quantity_received || 0,
          quantity_received: remaining > 0 ? remaining : 0,
          unit_price: item.unit_price,
          condition: 'GOOD',
          batch_number: ''
        };
      });
      setItems(poItems);
    } else {
      setItems([]);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateGoodsReceipt = async () => {
    if (items.length === 0) {
      showError('Please add at least one item');
      return;
    }

    try {
      await api.post('/goods-receipts', {
        ...formData,
        items: items.map(item => ({
          purchase_order_item_id: item.purchase_order_item_id,
          product_id: item.product_id,
          quantity_ordered: item.quantity_ordered,
          quantity_received: parseInt(item.quantity_received),
          unit_price: item.unit_price,
          condition: item.condition,
          batch_number: item.batch_number || null
        }))
      });

      showSuccess('Goods receipt created successfully!');
      setShowCreateModal(false);
      setFormData({
        purchase_order_id: '',
        warehouse_id: '',
        received_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setItems([]);
      fetchGoodsReceipts();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create goods receipt');
    }
  };

  const handleViewItems = async (receipt) => {
    setSelectedReceipt(receipt);
    try {
      const response = await api.get(`/goods-receipts/${receipt.id}/items`);
      setReceiptItems(Array.isArray(response.data) ? response.data : []);
      setShowItemsModal(true);
    } catch (err) {
      showError('Failed to fetch receipt items');
    }
  };

  const handleReceiveGoods = async (id) => {
    if (!window.confirm('Are you sure you want to receive these goods? This will update stock levels.')) return;
    try {
      await api.post(`/goods-receipts/${id}/receive`);
      showSuccess('Goods received successfully!');
      fetchGoodsReceipts();
    } catch (err) {
      showError('Failed to receive goods');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goods receipt?')) return;
    try {
      await api.delete(`/goods-receipts/${id}`);
      showSuccess('Goods receipt deleted successfully!');
      fetchGoodsReceipts();
    } catch (err) {
      showError('Failed to delete goods receipt');
    }
  };

  // Permissions
  const canReceive = (receipt) => hasPermission('goods-receipts.update') && receipt.status === 'PENDING';
  const canDeleteReceipt = (receipt) => hasPermission('goods-receipts.update') && receipt.status === 'PENDING';

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Goods Receipts</h2>
          <p className="text-muted-foreground">Manage received goods from purchase orders</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => fetchGoodsReceipts()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {hasPermission('goods-receipts.create') && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Receipt
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receipts List</CardTitle>
          <CardDescription>History of goods received</CardDescription>
        </CardHeader>
        <CardContent>
          <GoodsReceiptTable
            data={goodsReceipts}
            loading={loading}
            onView={handleViewItems}
            onReceive={handleReceiveGoods}
            onDelete={handleDelete}
            canReceive={canReceive}
            canDelete={canDeleteReceipt}
          />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Goods Receipt</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Order</Label>
                <Select
                  value={formData.purchase_order_id}
                  onValueChange={handlePurchaseOrderChange}
                >
                  <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map(po => (
                      <SelectItem key={po.id} value={po.id.toString()}>
                        {po.po_number} - {po.supplier?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <Select
                  value={formData.warehouse_id}
                  onValueChange={(v) => setFormData({ ...formData, warehouse_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select Warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>

            {items.length > 0 && (
              <div className="border rounded-md mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-[80px]">Ordered</TableHead>
                      <TableHead className="w-[80px]">Prev. Rcv</TableHead>
                      <TableHead className="w-[100px]">Received Now</TableHead>
                      <TableHead className="w-[120px]">Condition</TableHead>
                      <TableHead className="w-[120px]">Batch #</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity_ordered}</TableCell>
                        <TableCell>{item.quantity_already_received}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity_received}
                            onChange={(e) => handleItemChange(index, 'quantity_received', e.target.value)}
                            min="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.condition}
                            onValueChange={(v) => handleItemChange(index, 'condition', v)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GOOD">Good</SelectItem>
                              <SelectItem value="DAMAGED">Damaged</SelectItem>
                              <SelectItem value="DEFECTIVE">Defective</SelectItem>
                              <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.batch_number}
                            onChange={(e) => handleItemChange(index, 'batch_number', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateGoodsReceipt}>Create Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Items Modal */}
      <Dialog open={showItemsModal} onOpenChange={setShowItemsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Items for {selectedReceipt?.receipt_number}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty Ordered</TableHead>
                  <TableHead className="text-right">Qty Received</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Batch #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receiptItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="font-medium">{item.product?.name}</div>
                      <div className="text-xs text-muted-foreground">{item.product?.sku}</div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                    <TableCell className="text-right">{item.quantity_received}</TableCell>
                    <TableCell>{item.condition}</TableCell>
                    <TableCell>{item.batch_number || '-'}</TableCell>
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
    </div>
  );
};

export default GoodsReceipts;