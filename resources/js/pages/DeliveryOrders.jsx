import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { useToast } from '@/hooks/useToast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Search,
  RefreshCw,
  Filter
} from "lucide-react";
import DeliveryOrderTable from '@/components/warehouse/DeliveryOrderTable';
import Pagination from '@/components/common/Pagination';

import DeliveryOrderDetailsModal from '@/components/warehouse/DeliveryOrderDetailsModal';
import ShippingDetailsModal from '@/components/warehouse/ShippingDetailsModal';
import CreateDeliveryOrderModal from '@/components/warehouse/CreateDeliveryOrderModal';
import MarkDeliveredModal from '@/components/warehouse/MarkDeliveredModal';

import { useNavigate } from 'react-router-dom';

const DeliveryOrders = () => {
  const navigate = useNavigate();
  const { api } = useAPI();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isDeliveredModalOpen, setIsDeliveredModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('SHIPPED');

  // Pagination state
  const [salesPagination, setSalesPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchSalesDeliveryOrders();
  }, [salesPagination.current_page, search, statusFilter]);

  const fetchSalesDeliveryOrders = async (page = salesPagination.current_page) => {
    setLoading(true);
    try {
      const params = {
        page,
        source_type: 'SO',
        search: search,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await api.get('/delivery-orders', { params });
      setOrders(response.data.data);
      setSalesPagination(response.data.meta);
    } catch (error) {
      console.error('Error fetching sales delivery orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch delivery orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setSalesPagination(prev => ({ ...prev, current_page: page }));
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setSalesPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setSalesPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const handleUpdateStatus = (order, status) => {
    setSelectedOrder(order);
    setTargetStatus(status);

    if (status === 'READY_TO_SHIP') {
      setIsShippingModalOpen(true);
    } else if (status === 'SHIPPED') {
      // Directly process SHIPPED status without modal
      processStatusUpdate(order, status, {});
    } else if (status === 'DELIVERED') {
      setIsDeliveredModalOpen(true); // Open a modal for DELIVERED status
    } else {
      processStatusUpdate(order, status);
    }
  };

  const handleShipOrder = async (order, shippingData) => {
    await processStatusUpdate(order, targetStatus, shippingData);
    setIsShippingModalOpen(false);
  };

  const processStatusUpdate = async (order, status, additionalData = {}) => {
    try {
      await api.put(`/delivery-orders/${order.id}/status`, {
        status: status,
        ...additionalData
      });

      toast({
        title: "Success",
        description: `Order status updated to ${status}`,
      });
      fetchSalesDeliveryOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleCreatePickingList = async (order) => {
    try {
      // Create Picking List from Delivery Order
      const response = await api.post('/picking-lists', {
        delivery_order_id: order.id,
        notes: `Generated from DO ${order.delivery_order_number}`
      });

      console.log('Picking List Response:', response);

      // Auto-download PDF if available
      if (response.data.pdf_content) {
        const byteCharacters = atob(response.data.pdf_content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.filename || `PickingList-${order.delivery_order_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description: "Picking List created and downloaded successfully",
      });
      fetchSalesDeliveryOrders();
    } catch (error) {
      console.error('Error creating picking list:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create picking list",
        variant: "destructive",
      });
    }
  };

  const handlePrintPickingList = async (order) => {
    if (!order.picking_list_id) return;
    try {
      const response = await api.get(`/picking-lists/${order.picking_list_id}/print`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Fetch picking list number if available, otherwise fallback
      const filename = `PickingList-${order.picking_list_number || order.picking_list_id}.pdf`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error printing picking list:', error);
      toast({
        title: "Error",
        description: "Failed to print picking list",
        variant: "destructive",
      });
    }
  };

  const handlePrintDeliveryOrder = async (order) => {
    try {
      const response = await api.get(`/delivery-orders/${order.id}/print`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `DeliveryOrder-${order.delivery_order_number}.pdf`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error printing delivery order:', error);
      toast({
        title: "Error",
        description: "Failed to print delivery order",
        variant: "destructive",
      });
    }
  };

  const handleMarkDelivered = async (order, deliveryData) => {
    try {
      await api.put(`/delivery-orders/${order.id}/delivered`, deliveryData);

      toast({
        title: "Success",
        description: "Delivery Order marked as delivered",
      });
      setIsDeliveredModalOpen(false);
      fetchSalesDeliveryOrders();
    } catch (error) {
      console.error('Error marking delivered:', error);
      toast({
        title: "Error",
        description: "Failed to mark as delivered",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Delivery Management</h2>
          <p className="text-muted-foreground">Manage delivery orders for sales</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => navigate('/delivery-orders/create-consolidated')}>
            <Truck className="mr-2 h-4 w-4" />
            Create Delivery Order
          </Button>
          <Button variant="outline" onClick={() => fetchSalesDeliveryOrders()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search delivery orders..."
            value={search}
            onChange={handleSearch}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PREPARING">Preparing</SelectItem>
            <SelectItem value="READY_TO_SHIP">Ready to Ship</SelectItem>
            <SelectItem value="SHIPPED">Shipped</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow">
        <DeliveryOrderTable
          data={orders}
          loading={loading}
          onView={handleViewOrder}
          onUpdateStatus={handleUpdateStatus}
          onPrint={handlePrintDeliveryOrder}
          onCreatePickingList={handleCreatePickingList}
          onPrintPickingList={handlePrintPickingList}
        />

        <div className="mt-4">
          <Pagination
            currentPage={salesPagination.current_page}
            lastPage={salesPagination.last_page}
            onPageChange={handlePageChange}
          />
        </div>
      </div>



      <DeliveryOrderDetailsModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        order={selectedOrder}
      />

      <ShippingDetailsModal
        isOpen={isShippingModalOpen}
        onClose={() => setIsShippingModalOpen(false)}
        order={selectedOrder}
        onSave={handleShipOrder}
      />

      <MarkDeliveredModal
        isOpen={isDeliveredModalOpen}
        onClose={() => setIsDeliveredModalOpen(false)}
        deliveryOrder={selectedOrder}
        onConfirm={handleMarkDelivered}
      />
    </div>
  );
};

export default DeliveryOrders;