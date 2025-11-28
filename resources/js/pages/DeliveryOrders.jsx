import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeliveryOrderTable } from '@/components/warehouse/DeliveryOrderTable';
import { RefreshCw } from "lucide-react";
import { useToast } from '@/hooks/useToast';

const DeliveryOrders = () => {
  const { api } = useAPI();
  const { showSuccess, showError } = useToast();

  const [salesOrders, setSalesOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sales');

  // Pagination state
  const [salesPagination, setSalesPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [transferPagination, setTransferPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  useEffect(() => {
    if (activeTab === 'sales') {
      fetchSalesDeliveryOrders();
    } else {
      fetchTransferDeliveryOrders();
    }
  }, [activeTab]);

  const fetchSalesDeliveryOrders = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/delivery-orders?source_type=SO&page=${page}`);
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

  const fetchTransferDeliveryOrders = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/delivery-orders?source_type=IT&page=${page}`);
      const data = response.data.data || response.data || [];
      setDeliveryOrders(data);
      setTransferPagination({
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
        total: response.data.total || 0
      });
    } catch (err) {
      showError('Failed to fetch transfer delivery orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (order, status) => {
    try {
      await api.put(`/delivery-orders/${order.id}/status`, { status });

      const successMessages = {
        'READY_TO_SHIP': 'Status updated to READY_TO_SHIP!',
        'SHIPPED': 'Status updated to SHIPPED!',
        'DELIVERED': 'Status updated to DELIVERED!'
      };
      showSuccess(successMessages[status] || 'Status updated successfully!');

      if (activeTab === 'sales') fetchSalesDeliveryOrders(salesPagination.current_page);
      else fetchTransferDeliveryOrders(transferPagination.current_page);

    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCreatePickingList = async (order) => {
    try {
      const response = await api.post('/picking-lists/from-sales-order', {
        sales_order_id: order.sales_order_id
      });
      showSuccess(`Picking List ${response.data.picking_list_number} generated!`);

      if (response.data.pdf_content) {
        downloadAndOpenPDF(response.data.pdf_content, response.data.filename);
      }
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

  const handleView = (order) => {
    // Placeholder for view details modal
    console.log('View order', order);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Delivery Management</h2>
          <p className="text-muted-foreground">Manage delivery orders for sales and internal transfers</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => activeTab === 'sales' ? fetchSalesDeliveryOrders() : fetchTransferDeliveryOrders()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sales" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales Orders ({salesPagination.total})</TabsTrigger>
          <TabsTrigger value="transfer">Internal Transfer ({transferPagination.total})</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Orders Delivery</CardTitle>
              <CardDescription>Manage deliveries for customer sales orders</CardDescription>
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
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Internal Transfer Delivery</CardTitle>
              <CardDescription>Manage deliveries for internal warehouse transfers</CardDescription>
            </CardHeader>
            <CardContent>
              <DeliveryOrderTable
                data={deliveryOrders}
                loading={loading}
                type="transfer"
                onView={handleView}
                onUpdateStatus={handleUpdateStatus}
                onPrint={handlePrintDeliveryOrder}
                onCreatePickingList={handleCreatePickingList}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryOrders;