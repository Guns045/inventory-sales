import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InternalTransferTable } from '@/components/warehouse/InternalTransferTable';
import { Plus, Search, RefreshCw } from "lucide-react";
import { useToast } from '@/hooks/useToast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const InternalTransfers = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filter, setFilter] = useState({
    status: 'all',
    warehouse_from: 'all',
    warehouse_to: 'all',
    search: ''
  });

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_from_id: '',
    warehouse_to_id: '',
    quantity_requested: 1,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.warehouse_from !== 'all') params.append('warehouse_from', filter.warehouse_from);
      if (filter.warehouse_to !== 'all') params.append('warehouse_to', filter.warehouse_to);
      if (filter.search) params.append('search', filter.search);

      const [transfersResponse, productsResponse, warehousesResponse] = await Promise.allSettled([
        api.get(`/warehouse-transfers?${params.toString()}`),
        api.get('/products'),
        api.get('/warehouses')
      ]);

      if (transfersResponse.status === 'fulfilled') {
        setTransfers(transfersResponse.value.data.data || transfersResponse.value.data || []);
      }
      if (productsResponse.status === 'fulfilled') {
        setProducts(productsResponse.value.data.data || productsResponse.value.data || []);
      }
      if (warehousesResponse.status === 'fulfilled') {
        setWarehouses(warehousesResponse.value.data.data || warehousesResponse.value.data || []);
      }
    } catch (err) {
      showError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async () => {
    try {
      await api.post('/warehouse-transfers', formData);
      showSuccess('Warehouse transfer request created successfully!');
      setShowCreateModal(false);
      setFormData({
        product_id: '',
        warehouse_from_id: '',
        warehouse_to_id: '',
        quantity_requested: 1,
        notes: ''
      });
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create transfer');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/warehouse-transfers/${id}/approve`, { notes: 'Approved by ' + user.name });
      showSuccess('Transfer approved successfully!');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleDeliver = async (id) => {
    const transfer = transfers.find(t => t.id === id);
    const maxQuantity = transfer?.quantity_requested || 0;
    const quantity = prompt(`Enter quantity to deliver (max: ${maxQuantity}):`);

    if (!quantity) return;
    const parsedQuantity = parseInt(quantity);

    if (isNaN(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > maxQuantity) {
      showError('Invalid quantity');
      return;
    }

    try {
      await api.post(`/warehouse-transfers/${id}/deliver`, {
        quantity_delivered: parsedQuantity,
        notes: 'Delivered by ' + user.name
      });
      showSuccess('Delivery order created successfully!');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to deliver');
    }
  };

  const handleReceive = async (transfer) => {
    const maxQuantity = transfer?.quantity_delivered || 0;
    const quantity = prompt(`Enter quantity to receive (max: ${maxQuantity}):`);
    if (!quantity) return;

    try {
      await api.post(`/warehouse-transfers/${transfer.id}/receive`, {
        quantity_received: parseInt(quantity),
        notes: 'Received by ' + user.name
      });
      showSuccess('Goods received successfully!');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to receive');
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    try {
      await api.post(`/warehouse-transfers/${id}/cancel`, { reason });
      showSuccess('Transfer cancelled successfully!');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handlePrintDO = async (transferNumber) => {
    // Implementation for printing DO (reused logic)
    try {
      const response = await api.get('/delivery-orders');
      const deliveryOrders = response.data.data;
      const deliveryOrder = deliveryOrders.find(order =>
        order.source_type === 'IT' && order.notes && order.notes.includes(transferNumber)
      );

      if (!deliveryOrder) {
        showError('Delivery Order not found for this transfer');
        return;
      }

      const pdfResponse = await api.get(`/delivery-orders/${deliveryOrder.id}/print`, { responseType: 'blob' });
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      showError('Failed to print delivery order');
    }
  };

  const handleCreatePickingList = async (transfer) => {
    try {
      const response = await api.post('/picking-lists/from-transfer', {
        warehouse_transfer_id: transfer.id
      });
      showSuccess(`Picking List ${response.data.picking_list_number} generated!`);
      // Logic to download PDF would go here
    } catch (err) {
      showError('Failed to generate picking list');
    }
  };

  // Permission checks
  const canApprove = (transfer) => {
    if (['Super Admin', 'Admin'].includes(user?.role?.name)) return true;
    if (user?.role?.name === 'Gudang' && user?.warehouse_id === transfer.warehouse_from_id) return true;
    return false;
  };

  const canDeliver = (transfer) => {
    if (['Super Admin', 'Admin'].includes(user?.role?.name)) return true;
    if (user?.role?.name === 'Gudang' && user?.warehouse_id === transfer.warehouse_from_id) return true;
    return false;
  };

  const canReceive = (transfer) => {
    if (['Super Admin', 'Admin'].includes(user?.role?.name)) return true;
    if (user?.role?.name === 'Gudang' && user?.warehouse_id === transfer.warehouse_to_id) return true;
    return false;
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Internal Transfers</h2>
          <p className="text-muted-foreground">Manage stock transfers between warehouses</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Transfer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Input
              placeholder="Search transfer..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
            <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="REQUESTED">Requested</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filter.warehouse_from} onValueChange={(v) => setFilter({ ...filter, warehouse_from: v })}>
              <SelectTrigger><SelectValue placeholder="From Warehouse" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filter.warehouse_to} onValueChange={(v) => setFilter({ ...filter, warehouse_to: v })}>
              <SelectTrigger><SelectValue placeholder="To Warehouse" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map(w => <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <InternalTransferTable
            data={transfers}
            loading={loading}
            onViewDetails={(t) => console.log('View', t)}
            onApprove={handleApprove}
            onDeliver={handleDeliver}
            onReceive={handleReceive}
            onCancel={handleCancel}
            onPrintDO={handlePrintDO}
            onCreatePickingList={handleCreatePickingList}
            user={user}
            canApprove={canApprove}
            canDeliver={canDeliver}
            canReceive={canReceive}
          />
        </CardContent>
      </Card>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Transfer Request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(v) => setFormData({ ...formData, product_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.sku} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity_requested}
                  onChange={(e) => setFormData({ ...formData, quantity_requested: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Warehouse</Label>
                <Select
                  value={formData.warehouse_from_id}
                  onValueChange={(v) => setFormData({ ...formData, warehouse_from_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select Source" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Warehouse</Label>
                <Select
                  value={formData.warehouse_to_id}
                  onValueChange={(v) => setFormData({ ...formData, warehouse_to_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select Destination" /></SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter(w => w.id.toString() !== formData.warehouse_from_id)
                      .map(w => (
                        <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateTransfer}>Create Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InternalTransfers;