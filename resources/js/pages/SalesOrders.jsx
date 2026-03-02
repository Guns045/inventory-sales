import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/common/PageHeader';
import { SalesOrderTable } from '@/components/transactions/SalesOrderTable';
import { StatsCard } from '@/components/common/StatsCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, CheckCircle, Clock, XCircle, Search, Download, Pencil, Check, X, Plus } from "lucide-react";
import { useToast } from '@/hooks/useToast';
import SuperAdminActions from '@/components/admin/SuperAdminActions';
import { TransactionFilter } from '@/components/common/TransactionFilter';

import Pagination from '@/components/common/Pagination';

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
    per_page: 20,
    total: 0,
    from: 0,
    to: 0
  });
  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeFilters, setActiveFilters] = useState({
    startDate: '',
    endDate: '',
    warehouseId: 'all',
    customerId: 'all',
    status: [],
    search: '',
  });

  const [searchInput, setSearchInput] = useState('');
  const isFirstRender = React.useRef(true);

  // Edit PO Number state
  const [isEditingPo, setIsEditingPo] = useState(false);
  const [newPoNumber, setNewPoNumber] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    fetchWarehouses();
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchSalesOrders(1);
  }, [activeFilters]);

  const handleFilter = (filters) => {
    const newFilters = { ...activeFilters, ...filters };
    setActiveFilters(newFilters);
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      handleFilter({ search: searchInput });
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchWarehouses = async () => {
    try {
      const response = await get('/warehouses');
      setWarehouses(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await get('/customers');
      setCustomers(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchSalesOrders = async (page = 1, perPage = pagination.per_page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page,
        per_page: perPage
      });

      if (activeFilters.search) params.append('search', activeFilters.search);
      if (activeFilters.warehouseId && activeFilters.warehouseId !== 'all') params.append('warehouse_id', activeFilters.warehouseId);
      if (activeFilters.customerId && activeFilters.customerId !== 'all') params.append('customer_id', activeFilters.customerId);
      if (activeFilters.status && (Array.isArray(activeFilters.status) ? activeFilters.status.length > 0 : activeFilters.status !== 'all')) {
        params.append('status', Array.isArray(activeFilters.status) ? activeFilters.status.join(',') : activeFilters.status);
      }
      if (activeFilters.startDate) params.append('start_date', activeFilters.startDate);
      if (activeFilters.endDate) params.append('end_date', activeFilters.endDate);

      const response = await get(`/sales-orders?${params.toString()}`);
      if (response && response.data) {
        if (response.data.data) {
          setSalesOrders(response.data.data);
          setPagination({
            current_page: response.data.current_page || 1,
            last_page: response.data.last_page || 1,
            per_page: response.data.per_page || perPage,
            total: response.data.total || 0,
            from: response.data.from || 0,
            to: response.data.to || 0
          });
        } else {
          const data = Array.isArray(response.data) ? response.data : [];
          setSalesOrders(data);
          setPagination({
            current_page: 1,
            last_page: 1,
            per_page: data.length,
            total: data.length,
            from: data.length > 0 ? 1 : 0,
            to: data.length
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

  const handleUpdatePo = async () => {
    if (!selectedOrder) return;
    try {
      setUpdateLoading(true);
      await post(`/sales-orders/${selectedOrder.id}`, {
        ...selectedOrder,
        po_number: newPoNumber,
        _method: 'PUT' // Support for Laravel PUT via POST
      });
      showSuccess('PO Number updated successfully');
      setIsEditingPo(false);

      // Update local state to reflect change immediately
      const updatedOrder = { ...selectedOrder, po_number: newPoNumber };
      setSelectedOrder(updatedOrder);
      setSalesOrders(salesOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o));

      // Refresh to be safe
      await fetchSalesOrders(pagination.current_page);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update PO Number');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancel = async (order) => {
    if (window.confirm('Are you sure you want to CANCEL this order? Reserved stock will be released.')) {
      try {
        await post(`/sales-orders/${order.id}/cancel`);
        showSuccess('Sales order cancelled successfully');
        await fetchSalesOrders(pagination.current_page);
        setShowItemsModal(false);
      } catch (err) {
        showError(err.response?.data?.message || 'Failed to cancel sales order');
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

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (activeFilters.search) params.append('search', activeFilters.search);
      if (activeFilters.warehouseId && activeFilters.warehouseId !== 'all') params.append('warehouse_id', activeFilters.warehouseId);
      if (activeFilters.customerId && activeFilters.customerId !== 'all') params.append('customer_id', activeFilters.customerId);
      if (activeFilters.status && activeFilters.status !== 'all') params.append('status', activeFilters.status);
      if (activeFilters.startDate) params.append('start_date', activeFilters.startDate);
      if (activeFilters.endDate) params.append('end_date', activeFilters.endDate);
      // Add other filters if they exist in state (e.g. status)
      // Currently only search is in state, but if we add status filter dropdown later, append it here.

      const response = await get(`/sales-orders/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSuccess('Sales orders exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      showError('Failed to export sales orders');
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

      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handleExport} disabled={loading}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 h-8 w-[150px] lg:w-[250px] text-xs"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <TransactionFilter
            onFilter={handleFilter}
            onReset={() => {
              const defaultFilters = {
                startDate: '',
                endDate: '',
                warehouseId: 'all',
                customerId: 'all',
                status: [],
                search: '',
              };
              setActiveFilters(defaultFilters);
              setSearchInput('');
            }}
            warehouses={warehouses}
            customers={customers}
            statusOptions={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'READY_TO_SHIP', label: 'Ready to Ship' },
              { value: 'SHIPPED', label: 'Shipped' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' }
            ]}
            initialFilters={activeFilters}
          />
        </div>
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
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">PO Number:</span>
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
                            onClick={handleUpdatePo}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setIsEditingPo(false)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-indigo-600">{selectedOrder.po_number || '-'}</span>
                          {(user?.role === 'Super Admin' || user?.role === 'root') && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-50 hover:opacity-100"
                              onClick={() => {
                                setNewPoNumber(selectedOrder.po_number || '');
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
                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
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
                          <TableCell>
                            <div className="font-medium">{item.product?.sku || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{item.product?.name || 'N/A'}</div>
                          </TableCell>
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
            {['PENDING', 'PROCESSING', 'READY_TO_SHIP'].includes(selectedOrder?.status) && (
              <Button variant="destructive" onClick={() => handleCancel(selectedOrder)}>
                Cancel Order
              </Button>
            )}
            <SuperAdminActions
              type="sales_order"
              id={selectedOrder?.id}
              currentStatus={selectedOrder?.status}
              onSuccess={() => {
                fetchSalesOrders(pagination.current_page);
                setShowItemsModal(false);
              }}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesOrders;