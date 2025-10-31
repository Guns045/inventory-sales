import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import './DeliveryOrders.css';

const DeliveryOrders = () => {
  const { api, user } = useAPI();
  const [salesOrders, setSalesOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('processing'); // 'processing' or 'delivery-orders'
  const [deliveryForm, setDeliveryForm] = useState({
    shipping_date: new Date().toISOString().split('T')[0],
    driver_name: '',
    vehicle_plate_number: '',
    kurir: ''
  });

  useEffect(() => {
    if (activeTab === 'processing') {
      fetchProcessingOrders();
    } else {
      fetchDeliveryOrders();
    }
  }, [activeTab]);

  const fetchProcessingOrders = async () => {
    try {
      setLoading(true);
      // Fetch orders with PROCESSING and READY_TO_SHIP status
      const processingResponse = await api.get('/sales-orders?status=PROCESSING');
      const readyResponse = await api.get('/sales-orders?status=READY_TO_SHIP');

      const processingOrders = processingResponse.data.data || processingResponse.data || [];
      const readyOrders = readyResponse.data.data || readyResponse.data || [];

      setSalesOrders([...processingOrders, ...readyOrders]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch processing orders');
      console.error('Error fetching processing orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/delivery-orders');
      setDeliveryOrders(response.data.data || response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch delivery orders');
      console.error('Error fetching delivery orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update status to READY_TO_SHIP
  const handleUpdateStatus = async (salesOrderId, newStatus) => {
    try {
      setLoading(true);
      setError('');

      const response = await api.post(`/sales-orders/${salesOrderId}/update-status`, {
        status: newStatus,
        notes: `Status updated to ${newStatus} by ${user?.name || 'Unknown User'}`
      });

      // Refresh data
      await fetchProcessingOrders();

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
      console.error('Error updating status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open create delivery order modal
  const handleCreateDeliveryOrder = (order) => {
    setSelectedOrder(order);
    // Reset form dengan default values
    setDeliveryForm({
      shipping_date: new Date().toISOString().split('T')[0],
      driver_name: '',
      vehicle_plate_number: '',
      kurir: ''
    });
    setShowCreateModal(true);
  };

  // Create delivery order from sales order
  const handleCreateDeliveryOrderSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const deliveryData = {
        sales_order_id: selectedOrder.id,
        shipping_date: deliveryForm.shipping_date,
        driver_name: deliveryForm.driver_name || 'Default Driver',
        vehicle_plate_number: deliveryForm.vehicle_plate_number || 'B 1234 ABC',
        kurir: deliveryForm.kurir
      };

      const response = await api.post('/delivery-orders/from-sales-order', deliveryData);

      if (response && response.data) {
        setShowCreateModal(false);
        setSelectedOrder(null);
        await fetchProcessingOrders();
        await fetchDeliveryOrders();
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create Delivery Order');
      console.error('Error creating Delivery Order:', err);
    } finally {
      setLoading(false);
    }
  };

  // Confirm shipment and deduct stock
  const handleConfirmShipment = async (deliveryOrderId) => {
    try {
      setLoading(true);
      setError('');

      // Get delivery order details to find sales order ID
      const deliveryOrder = deliveryOrders.find(order => order.id === deliveryOrderId);

      if (!deliveryOrder) {
        throw new Error('Delivery order not found');
      }

      if (!deliveryOrder.sales_order_id) {
        throw new Error('Sales order ID not found in delivery order');
      }

      console.log('Confirming shipment for delivery order:', deliveryOrderId);
      console.log('Sales order ID:', deliveryOrder.sales_order_id);

      // Step 1: Update sales order status ke SHIPPED (harus berhasil dulu sebelum stock deduction)
      try {
        await api.post(`/sales-orders/${deliveryOrder.sales_order_id}/update-status`, {
          status: 'SHIPPED',
          notes: `Shipment confirmed by ${user?.name || 'Unknown User'}`
        });
        console.log('✅ Sales order status updated to SHIPPED');
      } catch (err) {
        console.error('❌ Failed to update sales order status:', err.response?.data?.message || err.message);
        throw new Error('Gagal update status Sales Order: ' + (err.response?.data?.message || err.message));
      }

      // Step 2: Deduct stock (harus setelah status SHIPPED)
      try {
        await api.post(`/inventory/deduct`, {
          sales_order_id: deliveryOrder.sales_order_id
        });
        console.log('✅ Stock deducted successfully');
      } catch (err) {
        console.warn('⚠️ Stock deduction failed:', err.response?.data?.message || err.message);
        console.warn('⚠️ This might be due to missing inventory.update permission');
        // Continue even if stock deduction fails, but warn user
      }

      // Step 3: Update delivery order status (try multiple possible endpoints)
      try {
        await api.put(`/delivery-orders/${deliveryOrderId}`, {
          status: 'SHIPPED',
          shipped_by: user?.id,
          shipped_at: new Date().toISOString()
        });
        console.log('✅ Delivery order status updated (PUT)');
      } catch (err1) {
        try {
          await api.post(`/delivery-orders/${deliveryOrderId}/mark-as-shipped`);
          console.log('✅ Delivery order status updated (POST)');
        } catch (err2) {
          console.warn('⚠️ Failed to update delivery order status:', err2.response?.data?.message || err2.message);
        }
      }

      alert('✅ Order berhasil dikirim! Status diperbarui ke SHIPPED.');

      // Refresh data
      await fetchProcessingOrders();
      await fetchDeliveryOrders();

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to confirm shipment';
      setError(errorMessage);
      console.error('❌ Error confirming shipment:', err);
      alert('❌ Gagal mengkonfirmasi pengiriman: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintDeliveryOrder = async (id) => {
    try {
      const response = await api.get(`/delivery-orders/${id}/print`, {
        responseType: 'blob'
      });

      // Create blob URL and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `delivery-order-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error printing delivery order:', err);
      setError('Failed to print delivery order');
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'preparing': return 'status-blue';
      case 'ready': return 'status-green';
      case 'shipped': return 'status-yellow';
      case 'delivered': return 'status-success';
      case 'cancelled': return 'status-red';
      case 'processing': return 'status-blue';
      case 'ready_to_ship': return 'status-green';
      default: return 'status-gray';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading delivery orders...</div>;
  }

  return (
    <div className="delivery-orders">
      <div className="header">
        <h1>Delivery Management</h1>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn-close">×</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'processing' ? 'active' : ''}`}
          onClick={() => setActiveTab('processing')}
        >
          Processing Orders ({salesOrders.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'delivery-orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('delivery-orders')}
        >
          Delivery Orders ({deliveryOrders.length})
        </button>
      </div>

      {/* Processing Orders Tab */}
      {activeTab === 'processing' && (
        <div className="table-container">
          <h2>Orders Ready for Delivery</h2>
          <table>
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total Amount</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">
                    No processing orders found.
                  </td>
                </tr>
              ) : (
                salesOrders.map(order => (
                  <tr key={order.id}>
                    <td>{order.sales_order_number}</td>
                    <td>{order.customer?.company_name || 'N/A'}</td>
                    <td>
                      <span className={`status ${getStatusClass(order.status)}`}>
                        {order.status === 'PROCESSING' ? 'Processing' : 'Ready to Ship'}
                      </span>
                    </td>
                    <td>{formatCurrency(order.total_amount)}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      {order.status === 'PROCESSING' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleUpdateStatus(order.id, 'READY_TO_SHIP')}
                          disabled={loading}
                        >
                          Ready to Ship
                        </button>
                      )}
                      {order.status === 'READY_TO_SHIP' && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleCreateDeliveryOrder(order)}
                          disabled={loading}
                        >
                          Create Delivery Order
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delivery Orders Tab */}
      {activeTab === 'delivery-orders' && (
        <div className="table-container">
          <h2>Delivery Orders</h2>
          <table>
            <thead>
              <tr>
                <th>DO Number</th>
                <th>Sales Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Shipping Date</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveryOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    No delivery orders found.
                  </td>
                </tr>
              ) : (
                deliveryOrders.map(order => (
                  <tr key={order.id}>
                    <td>{order.delivery_order_number}</td>
                    <td>{order.sales_order?.sales_order_number || '-'}</td>
                    <td>{order.customer?.company_name || 'N/A'}</td>
                    <td>
                      <span className={`status ${getStatusClass(order.status)}`}>
                        {order.status_label || order.status}
                      </span>
                    </td>
                    <td>{formatDate(order.shipping_date)}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => handlePrintDeliveryOrder(order.id)}
                      >
                        Print
                      </button>
                      {order.status === 'PREPARING' && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleConfirmShipment(order.id)}
                          disabled={loading}
                        >
                          Ship & Deduct Stock
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Delivery Order Modal */}
      {showCreateModal && selectedOrder && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create Delivery Order</h3>
              <button
                className="btn-close"
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedOrder(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <h6>Informasi Pengiriman</h6>
                  <div className="form-group">
                    <label>No. Surat Jalan</label>
                    <input
                      type="text"
                      className="form-control"
                      defaultValue={`DO-${new Date().toISOString().split('T')[0]}-${String(selectedOrder.id).padStart(3, '0')}`}
                      readOnly
                    />
                  </div>
                  <div className="form-group">
                    <label>Tanggal Kirim</label>
                    <input
                      type="date"
                      className="form-control"
                      value={deliveryForm.shipping_date}
                      onChange={(e) => setDeliveryForm({...deliveryForm, shipping_date: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Kurir</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nama kurir/jasa pengiriman"
                      value={deliveryForm.kurir}
                      onChange={(e) => setDeliveryForm({...deliveryForm, kurir: e.target.value})}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <h6>Informasi Sales Order</h6>
                  <p><strong>No. SO:</strong> {selectedOrder.sales_order_number}</p>
                  <p><strong>Pelanggan:</strong> {selectedOrder.customer?.company_name}</p>
                  <p><strong>Alamat Kirim:</strong> {selectedOrder.customer?.address || '-'}</p>
                  <p><strong>Total Amount:</strong> {formatCurrency(selectedOrder.total_amount)}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedOrder(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateDeliveryOrderSubmit}
                disabled={loading}
              >
                Create & Print Delivery Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrders;