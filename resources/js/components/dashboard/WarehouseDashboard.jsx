import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Link } from 'react-router-dom';
import { useAPI } from '../../contexts/APIContext';
import {
  Clock,
  Settings,
  Truck,
  ShoppingCart,
  RefreshCw,
  Eye,
  Play,
  CheckCircle,
  Building,
  User,
  Calendar,
  Package
} from "lucide-react";

const WarehouseDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { api } = useAPI();

  useEffect(() => {
    fetchWarehouseDashboard();
  }, []);

  const fetchWarehouseDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/dashboard/warehouse');
      setDashboardData(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching warehouse dashboard:', error);
      setError('Failed to load warehouse dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    setProcessing(true);
    try {
      await api.post(`/sales-orders/${selectedOrder.id}/update-status`, {
        status: selectedStatus,
        notes: notes
      });
      setShowStatusModal(false);
      setNotes('');
      setSelectedOrder(null);
      setSelectedStatus('');
      fetchWarehouseDashboard(); // Refresh data
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status');
    } finally {
      setProcessing(false);
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

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'PROCESSING': return 'default'; // info usually maps to default or secondary in shadcn
      case 'READY_TO_SHIP': return 'default'; // primary
      case 'SHIPPED': return 'success';
      case 'COMPLETED': return 'success';
      default: return 'secondary';
    }
  };

  const getStatusOptions = (currentStatus) => {
    switch (currentStatus) {
      case 'PENDING':
        return [
          { value: 'PROCESSING', label: 'Start Processing', icon: Play }
        ];
      case 'PROCESSING':
        return [
          { value: 'READY_TO_SHIP', label: 'Ready to Ship', icon: CheckCircle }
        ];
      default:
        return [];
    }
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

  const { pending_sales_orders, processing_sales_orders, ready_to_ship_orders, warehouse_stats } = dashboardData;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Warehouse Dashboard</h2>
          <p className="text-muted-foreground">Manage Pending and Processing Sales Orders</p>
        </div>
        <Button variant="outline" onClick={fetchWarehouseDashboard}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Processing</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouse_stats.pending_processing}</div>
            <p className="text-xs text-muted-foreground">Orders waiting to start</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Settings className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouse_stats.processing}</div>
            <p className="text-xs text-muted-foreground">Orders in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Ship</CardTitle>
            <Truck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouse_stats.ready_to_ship}</div>
            <p className="text-xs text-muted-foreground">Orders ready for delivery</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouse_stats.total_orders}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        {/* Pending Sales Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Sales Orders
            </CardTitle>
            <CardDescription>Orders waiting for warehouse processing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pending_sales_orders.length > 0 ? (
                pending_sales_orders.map((order) => (
                  <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-1 flex-1 mb-4 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{order.sales_order_number}</span>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">PENDING</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {order.customer?.company_name || 'Unknown Customer'}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Sales: {order.user?.name || 'Unknown Sales'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.created_at).toLocaleDateString('id-ID')}
                        </div>
                        <div className="font-medium text-foreground">
                          {formatCurrency(order.total_amount)}
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {order.items.slice(0, 3).map((item, index) => (
                            <Badge key={index} variant="outline" className="font-normal">
                              <Package className="h-3 w-3 mr-1" />
                              {item.product?.name} x{item.quantity}
                            </Badge>
                          ))}
                          {order.items.length > 3 && (
                            <Badge variant="outline" className="font-normal">+{order.items.length - 3} more</Badge>
                          )}
                        </div>
                      )}

                      {order.notes && (
                        <p className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded inline-block">
                          Note: {order.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        className="flex-1 sm:flex-none"
                        onClick={() => {
                          setSelectedOrder(order);
                          setSelectedStatus('PROCESSING');
                          setShowStatusModal(true);
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Processing
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <Link to={`/sales-orders/${order.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500/50" />
                  <p>No pending orders. Good job!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Processing Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Processing Orders
            </CardTitle>
            <CardDescription>Orders currently being processed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {processing_sales_orders.length > 0 ? (
                processing_sales_orders.map((order) => (
                  <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-1 flex-1 mb-4 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{order.sales_order_number}</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">PROCESSING</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {order.customer?.company_name}
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {order.items.slice(0, 3).map((item, index) => (
                            <Badge key={index} variant="outline" className="font-normal">
                              <Package className="h-3 w-3 mr-1" />
                              {item.product?.name} x{item.quantity}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="default" // Primary
                        className="flex-1 sm:flex-none"
                        onClick={() => {
                          setSelectedOrder(order);
                          setSelectedStatus('READY_TO_SHIP');
                          setShowStatusModal(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Ready to Ship
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <Link to={`/sales-orders/${order.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No orders currently in processing.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ready to Ship Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Ready to Ship
            </CardTitle>
            <CardDescription>Orders ready for delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ready_to_ship_orders.length > 0 ? (
                ready_to_ship_orders.map((order) => (
                  <div key={order.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-1 flex-1 mb-4 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{order.sales_order_number}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">READY TO SHIP</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {order.customer?.company_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        className="flex-1 sm:flex-none border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                        onClick={() => alert('Create Delivery Order functionality to be implemented')}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Create DO
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <Link to={`/sales-orders/${order.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No orders ready to ship.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Update Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order {selectedOrder?.sales_order_number}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedOrder && (
              <div className="space-y-4">
                <div className="text-sm">
                  <p><strong>Customer:</strong> {selectedOrder.customer?.company_name}</p>
                  <p><strong>Current Status:</strong> {selectedOrder.status}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">New Status</label>
                  <div className="grid grid-cols-1 gap-2">
                    {getStatusOptions(selectedOrder.status).map((option) => (
                      <Button
                        key={option.value}
                        variant={selectedStatus === option.value ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedStatus(option.value)}
                      >
                        {option.icon && <option.icon className="mr-2 h-4 w-4" />}
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Textarea
                    placeholder="Add notes about this status change..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={processing || !selectedStatus}
            >
              {processing ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehouseDashboard;