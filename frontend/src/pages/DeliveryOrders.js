import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import './DeliveryOrders.css';

const DeliveryOrders = () => {
  const { api, user } = useAPI();
  const [salesOrders, setSalesOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'transfer'
  const [deliveryForm, setDeliveryForm] = useState({
    shipping_date: new Date().toISOString().split('T')[0],
    driver_name: '',
    vehicle_plate_number: '',
    kurir: ''
  });

  useEffect(() => {
    if (activeTab === 'sales') {
      fetchSalesDeliveryOrders();
    } else if (activeTab === 'transfer') {
      fetchTransferDeliveryOrders();
    }
  }, [activeTab]);

  const fetchSalesDeliveryOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/delivery-orders?source_type=SO');
      const orders = response.data.data || response.data || [];
      setSalesOrders(orders);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch sales delivery orders');
      console.error('Error fetching sales delivery orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferDeliveryOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/delivery-orders?source_type=IT');
      const orders = response.data.data || response.data || [];
      setDeliveryOrders(orders);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch transfer delivery orders');
      console.error('Error fetching transfer delivery orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create Picking List from Sales Order
  const handleCreatePickingList = async (order) => {
    try {
      const response = await api.post('/picking-lists/from-sales-order', {
        sales_order_id: order.sales_order_id
      });

      if (response.data) {
        alert(`✅ Picking List ${response.data.picking_list_number} generated successfully!`);

        if (!response.data.pdf_content) {
          throw new Error('No PDF content received from server');
        }

        downloadAndOpenPDF(response.data.pdf_content, response.data.filename);
      }
    } catch (err) {
      console.error('Error generating picking list:', err);
      alert('❌ Failed to generate picking list: ' + (err.response?.data?.message || err.message));
    }
  };

  // Print Delivery Order
  const handlePrintDeliveryOrder = async (order) => {
    try {
      const response = await api.get(`/delivery-orders/${order.id}/print`, {
        responseType: 'blob'
      });

      if (response.data) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const base64Content = e.target.result.split(',')[1];
          const filename = `delivery-order-${order.delivery_order_number.replace(/\//g, '_')}.pdf`;
          downloadAndOpenPDF(base64Content, filename);
        };
        reader.readAsDataURL(response.data);
      }
    } catch (error) {
      console.error('Error printing delivery order:', error);
      alert('❌ Failed to print delivery order: ' + (error.response?.data?.message || error.message));
    }
  };

  // View Delivery Order Details
  const handleView = (order) => {
    alert(`Viewing details for ${order.delivery_order_number}\n\nCustomer: ${order.customer?.company_name || 'N/A'}\nStatus: ${order.status}\nCreated: ${formatDate(order.created_at)}`);
  };

  // Download and Open PDF
  const downloadAndOpenPDF = (base64Content, filename) => {
    try {
      const cleanBase64 = base64Content.replace(/\s/g, '');
      const binaryData = atob(cleanBase64);
      const bytes = new Uint8Array(binaryData.length);

      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }

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
      console.error('PDF download error:', error);
      alert('❌ Failed to download PDF: ' + error.message);
    }
  };

  // Update Delivery Order Status
  const handleUpdateStatus = async (order, status) => {
    try {
      setLoading(true);

      const response = await api.put(`/delivery-orders/${order.id}/status`, {
        status: status
      });

      // Update local state
      if (activeTab === 'sales') {
        setSalesOrders(salesOrders.map(o =>
          o.id === order.id ? { ...o, status: status } : o
        ));
      } else {
        setDeliveryOrders(deliveryOrders.map(o =>
          o.id === order.id ? { ...o, status: status } : o
        ));
      }

      // Refresh data
      if (activeTab === 'sales') {
        fetchSalesDeliveryOrders();
      } else {
        fetchTransferDeliveryOrders();
      }

      // Show success message with sales order sync info
      const successMessages = {
        'READY_TO_SHIP': '✅ Status updated to READY_TO_SHIP! Sales Order status has been synchronized.',
        'SHIPPED': '🚚 Status updated to SHIPPED! Sales Order status has been synchronized.',
        'DELIVERED': '✅ Status updated to DELIVERED! Sales Order marked as COMPLETED.'
      };

      alert(successMessages[status] || '✅ Status updated successfully!');

    } catch (error) {
      console.error('Error updating delivery order status:', error);
      setError('Failed to update status: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'preparing': return 'status-blue';
      case 'ready': return 'status-green';
      case 'ready_to_ship': return 'status-green';
      case 'shipped': return 'status-yellow';
      case 'delivered': return 'status-success';
      case 'cancelled': return 'status-red';
      case 'processing': return 'status-blue';
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
          className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          Sales Orders ({salesOrders.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'transfer' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfer')}
        >
          Internal Transfer ({deliveryOrders.length})
        </button>
      </div>

      {/* Sales Orders Tab */}
      {activeTab === 'sales' && (
        <div className="table-container">
          <h2>Sales Orders Delivery</h2>
          <table>
            <thead>
              <tr>
                <th>DO Number</th>
                <th>Sales Order</th>
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
                  <td colSpan="8" className="text-center">
                    No sales delivery orders found.
                  </td>
                </tr>
              ) : (
                salesOrders.map(order => (
                  <tr key={order.id}>
                    <td>{order.delivery_order_number}</td>
                    <td>{order.sales_order?.sales_order_number || '-'}</td>
                    <td>{order.customer?.name || order.customer?.company_name || 'N/A'}</td>
                    <td>
                      <span className={`status ${getStatusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{formatCurrency(order.total_amount || 0)}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleView(order)}
                          disabled={loading}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        {order.status === 'PREPARING' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleCreatePickingList(order)}
                            disabled={loading}
                            title="Create Picking List"
                          >
                            <i className="bi bi-clipboard-check"></i>
                          </button>
                        )}
                        {order.status === 'READY_TO_SHIP' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handlePrintDeliveryOrder(order)}
                            disabled={loading}
                            title="Print Delivery Order"
                          >
                            <i className="bi bi-printer"></i>
                          </button>
                        )}
                        {/* Status Update Actions */}
                        {order.status === 'PREPARING' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleUpdateStatus(order, 'READY_TO_SHIP')}
                            disabled={loading}
                            title="Ready to Ship"
                          >
                            <i className="bi bi-truck"></i>
                          </button>
                        )}
                        {order.status === 'READY_TO_SHIP' && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleUpdateStatus(order, 'SHIPPED')}
                            disabled={loading}
                            title="Ship Order"
                          >
                            <i className="bi bi-box-seam"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Internal Transfer Tab */}
      {activeTab === 'transfer' && (
        <div className="table-container">
          <h2>Internal Transfer Delivery</h2>
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
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleView(order)}
                          disabled={loading}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        {order.status === 'READY_TO_SHIP' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handlePrintDeliveryOrder(order)}
                            disabled={loading}
                            title="Print Delivery Order"
                          >
                            <i className="bi bi-printer"></i>
                          </button>
                        )}
                        {/* Status Update Actions */}
                        {order.status === 'PREPARING' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleUpdateStatus(order, 'READY_TO_SHIP')}
                            disabled={loading}
                            title="Ready to Ship"
                          >
                            <i className="bi bi-truck"></i>
                          </button>
                        )}
                        {order.status === 'READY_TO_SHIP' && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleUpdateStatus(order, 'SHIPPED')}
                            disabled={loading}
                            title="Ship Order"
                          >
                            <i className="bi bi-box-seam"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrders;