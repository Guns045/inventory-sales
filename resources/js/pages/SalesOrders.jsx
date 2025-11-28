import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SalesOrderTable } from '@/components/transactions/SalesOrderTable';
import { StatsCard } from '@/components/common/StatsCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, CheckCircle, Clock, XCircle } from "lucide-react";
import { useToast } from '@/hooks/useToast';

const SalesOrders = () => {
  const { get, post, delete: deleteRequest } = useAPI();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0
  });

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const fetchSalesOrders = async (page = 1) => {
    try {
      setLoading(true);
      const response = await get(`/sales-orders?page=${page}`);
      if (response && response.data) {
        if (response.data.data) {
          setSalesOrders(response.data.data);
          setPagination({
            current_page: response.data.current_page,
            last_page: response.data.last_page,
            per_page: response.data.per_page,
            total: response.data.total
          });
        } else {
          const data = Array.isArray(response.data) ? response.data : [];
          setSalesOrders(data);
          setPagination({
            current_page: 1,
            last_page: 1,
            per_page: data.length,
            total: data.length
          });
        }
      }
    } catch (err) {
      console.error('Error fetching sales orders:', err);
      showError('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId) => {
    try {
      const response = await get(`/sales-orders/${orderId}/items`);
      if (response && response.data) {
        const itemsData = Array.isArray(response.data) ? response.data : response.data.data || [];
        setOrderItems(itemsData);
      }
    } catch (err) {
      console.error('Error fetching order items:', err);
      showError('Failed to fetch order items');
    }
  };

  const handleView = async (order) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
    setShowItemsModal(true);
  };

  const handleStatusUpdate = async (order, newStatus) => {
    try {
      await post(`/sales-orders/${order.id}/update-status`, {
        status: newStatus,
        notes: `Status updated to ${newStatus} by ${user.name}`
      });
      showSuccess(`Status updated to ${newStatus}`);
      await fetchSalesOrders(pagination.current_page);
      setShowItemsModal(false);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (order) => {
    if (window.confirm('Are you sure you want to delete this sales order?')) {
      try {
        await deleteRequest(`/sales-orders/${order.id}`);
        showSuccess('Sales order deleted successfully');
        await fetchSalesOrders(pagination.current_page);
      } catch (err) {
        showError(err.response?.data?.message || 'Failed to delete sales order');
      }
    }
  };

  const handlePrint = async (salesOrder) => {
    try {
      if (!salesOrder.quotation_id) {
        showError('Sales Order is not linked to a quotation.');
        return;
      }

      const response = await fetch(`/preview/quotation-db/${salesOrder.quotation_id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Quotation-${salesOrder.quotation?.quotation_number || salesOrder.quotation_id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error printing:', error);
      showError('Failed to print quotation');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Stats calculation
  const stats = {
    total: salesOrders.length,
    pending: salesOrders.filter(o => o.status === 'PENDING').length,
    completed: salesOrders.filter(o => o.status === 'COMPLETED' || o.status === 'SHIPPED').length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Sales Orders"
        description="Manage and track all sales orders"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Orders"
          value={stats.total}
          icon={<ShoppingCart className="h-4 w-4" />}
          variant="primary"
        />
        <StatsCard
          title="Pending"
          value={stats.pending}
          icon={<Clock className="h-4 w-4" />}
          variant="warning"
        />
        <StatsCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle className="h-4 w-4" />}
          variant="success"
        />
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <SalesOrderTable
          data={salesOrders}
          loading={loading}
          onView={handleView}
          onUpdateStatus={handleStatusUpdate}
          onDelete={handleDelete}
          onPrint={handlePrint}
        />
      </div>

      {/* Details Modal */}
      <Dialog open={showItemsModal} onOpenChange={setShowItemsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sales Order Details - {selectedOrder?.sales_order_number}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Order Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Customer:</span> {selectedOrder.customer?.company_name}</p>
                    <p><span className="text-muted-foreground">Status:</span> {selectedOrder.status}</p>
                    <p><span className="text-muted-foreground">Date:</span> {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Created By</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedOrder.user?.name}</p>
                    <p><span className="text-muted-foreground">Role:</span> {selectedOrder.user?.role?.name}</p>
                    {selectedOrder.quotation && (
                      <p><span className="text-muted-foreground">Source:</span> {selectedOrder.quotation.quotation_number}</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-2">Order Items</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-center">Disc %</TableHead>
                        <TableHead className="text-center">Tax %</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.product?.name || 'N/A'}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-center">{item.discount_percentage}%</TableCell>
                          <TableCell className="text-center">{item.tax_rate}%</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total_price || (item.quantity * item.unit_price))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(selectedOrder.total_amount)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemsModal(false)}>Close</Button>
            {selectedOrder?.status === 'PENDING' && (
              <Button onClick={() => handleStatusUpdate(selectedOrder, 'PROCESSING')}>
                Start Processing
              </Button>
            )}
            {selectedOrder?.status === 'PROCESSING' && (
              <Button onClick={() => handleStatusUpdate(selectedOrder, 'READY_TO_SHIP')}>
                Ready to Ship
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesOrders;