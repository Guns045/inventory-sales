import React, { useState, useEffect } from 'react';
import { useAPI } from '@/contexts/APIContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PickingListTable } from '@/components/warehouse/PickingListTable';
import { RefreshCw } from "lucide-react";
import { useToast } from '@/hooks/useToast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const PickingLists = () => {
  const { api } = useAPI();
  const { showSuccess, showError } = useToast();

  const [pickingLists, setPickingLists] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  // Modal state
  const [selectedPickingList, setSelectedPickingList] = useState(null);
  const [showItemsModal, setShowItemsModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (activeTab === 'transfer') {
        params.append('search', 'warehouse transfer');
      }

      const [pickingListsResponse, pendingOrdersResponse] = await Promise.allSettled([
        api.get(`/picking-lists?${params.toString()}`),
        api.get('/sales-orders?status=PENDING')
      ]);

      if (pickingListsResponse.status === 'fulfilled') {
        const allLists = pickingListsResponse.value.data.data || pickingListsResponse.value.data || [];

        if (activeTab === 'sales') {
          setPickingLists(allLists.filter(pl => pl.sales_order_id));
        } else if (activeTab === 'transfer') {
          setPickingLists(allLists); // API already filtered
        } else {
          setPickingLists(allLists);
        }
      }

      if (pendingOrdersResponse.status === 'fulfilled') {
        setPendingOrders(pendingOrdersResponse.value.data.data || pendingOrdersResponse.value.data || []);
      }

    } catch (err) {
      showError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePickingList = async (salesOrderId) => {
    try {
      await api.post(`/sales-orders/${salesOrderId}/create-picking-list`);
      showSuccess('Picking List created successfully!');
      fetchData();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create Picking List');
    }
  };

  const handlePrintPickingList = async (id) => {
    try {
      const response = await api.get(`/picking-lists/${id}/print`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      showError('Failed to print picking list');
    }
  };

  const handleViewItems = async (pickingList) => {
    try {
      const response = await api.get(`/picking-lists/${pickingList.id}/items`);
      setSelectedPickingList({
        ...pickingList,
        items: response.data
      });
      setShowItemsModal(true);
    } catch (err) {
      showError('Failed to fetch items');
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Picking Lists</h2>
          <p className="text-muted-foreground">Manage picking lists for sales and transfers</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Orders ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="sales">Sales Orders</TabsTrigger>
          <TabsTrigger value="transfer">Internal Transfers</TabsTrigger>
          <TabsTrigger value="all">All Lists</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Orders</CardTitle>
              <CardDescription>Sales orders waiting for picking list creation</CardDescription>
            </CardHeader>
            <CardContent>
              <PickingListTable
                data={pendingOrders}
                loading={loading}
                type="pending"
                onCreate={handleCreatePickingList}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales Picking Lists</CardTitle>
            </CardHeader>
            <CardContent>
              <PickingListTable
                data={pickingLists}
                loading={loading}
                type="sales"
                onView={handleViewItems}
                onPrint={handlePrintPickingList}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Picking Lists</CardTitle>
            </CardHeader>
            <CardContent>
              <PickingListTable
                data={pickingLists}
                loading={loading}
                type="transfer"
                onView={handleViewItems}
                onPrint={handlePrintPickingList}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Picking Lists</CardTitle>
            </CardHeader>
            <CardContent>
              <PickingListTable
                data={pickingLists}
                loading={loading}
                type="all"
                onView={handleViewItems}
                onPrint={handlePrintPickingList}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showItemsModal} onOpenChange={setShowItemsModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Picking List Items - {selectedPickingList?.picking_list_number}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="font-semibold">Status:</span> {selectedPickingList?.status}
              </div>
              <div>
                <span className="font-semibold">Date:</span> {selectedPickingList?.created_at && new Date(selectedPickingList.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-left">Location</th>
                    <th className="p-2 text-right">Qty Req</th>
                    <th className="p-2 text-right">Qty Picked</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPickingList?.items?.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">
                        <div className="font-medium">{item.product?.name}</div>
                        <div className="text-xs text-muted-foreground">{item.product?.sku}</div>
                      </td>
                      <td className="p-2">{item.location_code || '-'}</td>
                      <td className="p-2 text-right">{item.quantity_required}</td>
                      <td className="p-2 text-right">{item.quantity_picked}</td>
                      <td className="p-2">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowItemsModal(false)}>Close</Button>
            <Button onClick={() => handlePrintPickingList(selectedPickingList?.id)}>Print</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PickingLists;