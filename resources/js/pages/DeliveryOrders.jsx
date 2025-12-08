import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryOrderTable } from '@/components/warehouse/DeliveryOrderTable';
import { RefreshCw, Search } from "lucide-react";
import { useToast } from '@/hooks/useToast';
import { Input } from "@/components/ui/input";

import DeliveryOrderDetailsModal from '@/components/warehouse/DeliveryOrderDetailsModal';
import ShippingDetailsModal from '@/components/warehouse/ShippingDetailsModal';

const DeliveryOrders = () => {
  const { api } = useAPI();
  const { showSuccess, showError } = useToast();

  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('SHIPPED');

  // Pagination state
  const [salesPagination, setSalesPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSalesDeliveryOrders(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSalesDeliveryOrders = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        source_type: 'SO',
        page: page
      });
      if (search) params.append('search', search);

      const response = await api.get(`/delivery-orders?${params.toString()}`);
      const data = response.data.data || response.data || [];
      setSalesOrders(data);
      setSalesPagination({
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
        total: response.data.total || 0
      });
    } catch (err) {
      showError('Failed to fetch sales delivery orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (order, status) => {
    if (status === 'READY_TO_SHIP') {
      setSelectedOrder(order);
      setTargetStatus('READY_TO_SHIP');
      setIsShippingModalOpen(true);
      return;
    }
    if (status === 'SHIPPED') {
      if (window.confirm('Are you sure you want to mark this order as SHIPPED? Stock will be deducted.')) {
        await processStatusUpdate(order, 'SHIPPED');
      }
      return;
    }
    await processStatusUpdate(order, status);
  };

  const processStatusUpdate = async (order, status, additionalData = {}) => {
    try {
      let orderId = order.id;

      // If it's a pending SO, create DO first
      if (order.is_pending_so) {
        const createResponse = await api.post('/delivery-orders/from-sales-order', {
          sales_order_id: order.sales_order_id,
          ...additionalData // Pass shipping details if creating directly
        });
        orderId = createResponse.data.data?.id || createResponse.data.id;
      } else if (Object.keys(additionalData).length > 0) {
        // Update DO details first if we have additional data
        await api.put(`/delivery-orders/${orderId}`, additionalData);
      }

      await api.put(`/delivery-orders/${orderId}/status`, { status });

      const successMessages = {
        'READY_TO_SHIP': 'Status updated to READY_TO_SHIP!',
        'SHIPPED': 'Status updated to SHIPPED!',
        'DELIVERED': 'Status updated to DELIVERED!'
      };
      showSuccess(successMessages[status] || 'Status updated successfully!');

      fetchSalesDeliveryOrders(salesPagination.current_page);
      setIsShippingModalOpen(false);

    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleShipOrder = async (order, formData) => {
    await processStatusUpdate(order, targetStatus, formData);
  };

  const handleCreatePickingList = async (order) => {
    try {
      const response = await api.post('/picking-lists/from-sales-order', {
        sales_order_id: order.sales_order_id
      });
      const pickingListNumber = response.data.data?.picking_list_number || response.data.picking_list_number || 'Generated';
      showSuccess(`Picking List ${pickingListNumber} generated!`);

      if (response.data.pdf_content) {
        downloadAndOpenPDF(response.data.pdf_content, response.data.filename);
      }

      fetchSalesDeliveryOrders(salesPagination.current_page);
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to generate picking list');
    }
  };

  const handlePrintDeliveryOrder = async (order) => {
    try {
      const response = await api.get(`/delivery-orders/${order.id}/print`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      showError('Failed to print delivery order');
    }
  };

  const downloadAndOpenPDF = (base64Content, filename) => {
    try {
      const cleanBase64 = base64Content.replace(/\s/g, '');
      const binaryData = atob(cleanBase64);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) bytes[i] = binaryData.charCodeAt(i);

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showError('Failed to download PDF');
    }
  };

  const handlePrintPickingList = async (order) => {
    try {
      const pickingListId = order.picking_list_id || order.picking_list?.id;
      if (!pickingListId) return;

      const response = await api.get(`/picking-lists/${pickingListId}/print`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      showError('Failed to print picking list');
    }
  };

  const handleView = (order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Delivery Management</h2>
          <p className="text-muted-foreground">Manage delivery orders for sales</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => fetchSalesDeliveryOrders()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Orders Delivery</CardTitle>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardDescription>Manage deliveries for customer sales orders</CardDescription>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search delivery orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DeliveryOrderTable
            data={salesOrders}
            loading={loading}
            type="sales"
            onView={handleView}
            onUpdateStatus={handleUpdateStatus}
            onPrint={handlePrintDeliveryOrder}
            onCreatePickingList={handleCreatePickingList}
            onPrintPickingList={handlePrintPickingList}
          />
        </CardContent>
      </Card>

      <DeliveryOrderDetailsModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        order={selectedOrder}
      />

      <ShippingDetailsModal
        isOpen={isShippingModalOpen}
        onClose={() => setIsShippingModalOpen(false)}
        onSave={handleShipOrder}
        order={selectedOrder}
        loading={loading}
        submitLabel={targetStatus === 'READY_TO_SHIP' ? 'Save & Ready' : 'Save & Ship'}
      />
    </div>
  );
};

export default DeliveryOrders;