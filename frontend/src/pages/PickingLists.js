import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import './PickingLists.css';

const PickingLists = () => {
  const { api } = useAPI();
  const [pickingLists, setPickingLists] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    status: '',
    search: ''
  });
  const [selectedPickingList, setSelectedPickingList] = useState(null);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending-orders'); // 'picking-lists' or 'pending-orders'

  useEffect(() => {
    fetchData();
  }, [filter, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch picking lists
      const params = new URLSearchParams();
      if (filter.status && activeTab === 'picking-lists') params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);

      const [pickingListsResponse, pendingOrdersResponse] = await Promise.allSettled([
        api.get(`/picking-lists?${params.toString()}`),
        api.get('/sales-orders?status=PENDING')
      ]);

      if (pickingListsResponse.status === 'fulfilled') {
        setPickingLists(pickingListsResponse.value.data.data || pickingListsResponse.value.data || []);
      }

      if (pendingOrdersResponse.status === 'fulfilled') {
        setPendingOrders(pendingOrdersResponse.value.data.data || pendingOrdersResponse.value.data || []);
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPickingLists = () => fetchData(); // Keep for backward compatibility

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const handleCreatePickingList = async (salesOrderId) => {
    try {
      const response = await api.post(`/sales-orders/${salesOrderId}/create-picking-list`);
      if (response.data) {
        alert('✅ Picking List berhasil dibuat!');
        fetchData(); // Refresh data
      }
    } catch (err) {
      console.error('Error creating picking list:', err);
      alert('❌ Gagal membuat Picking List: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePrintPickingList = async (id) => {
    try {
      const response = await api.get(`/picking-lists/${id}/print`, {
        responseType: 'blob'
      });

      // Create blob URL and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `picking-list-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error printing picking list:', err);
      setError('Failed to print picking list');
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
      console.error('Error fetching picking list items:', err);
      setError('Failed to fetch picking list items');
    }
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'status-gray';
      case 'ready': return 'status-blue';
      case 'picking': return 'status-yellow';
      case 'completed': return 'status-green';
      case 'cancelled': return 'status-red';
      default: return 'status-gray';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getCustomerName = (customer) => {
    if (!customer) return 'N/A';
    return customer.name || customer.company_name || 'N/A';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return <div className="loading">Loading picking lists...</div>;
  }

  return (
    <div className="picking-lists">
      <div className="header">
        <h1>Picking Lists Management</h1>
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
          className={`tab-btn ${activeTab === 'pending-orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending-orders')}
        >
          📋 Pending Orders ({pendingOrders.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'picking-lists' ? 'active' : ''}`}
          onClick={() => setActiveTab('picking-lists')}
        >
          📦 Picking Lists ({pickingLists.length})
        </button>
      </div>

      {activeTab === 'pending-orders' && (
        <>
          <div className="section-info">
            <p className="text-muted">
              <i className="bi bi-info-circle me-2"></i>
              Orders di bawah ini bisa dibuatkan Picking List. Status harus PENDING untuk bisa membuat Picking List.
            </p>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Sales Order Number</th>
                  <th>Customer</th>
                  <th>Total Amount</th>
                  <th>Order Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center">
                      <div className="text-center py-4">
                        <i className="bi bi-inbox text-muted fs-1"></i>
                        <p className="text-muted mt-2">Tidak ada Pending Orders</p>
                        <small className="text-muted">
                          Tidak ada Sales Orders yang bisa dibuatkan Picking List
                        </small>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingOrders.map(order => (
                    <tr key={order.id}>
                      <td>
                        <div className="fw-bold">{order.sales_order_number}</div>
                      </td>
                      <td>{order.customer?.company_name || order.customer?.name || '-'}</td>
                      <td className="fw-semibold text-primary">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>
                        <span className="status status-yellow">
                          PENDING
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleCreatePickingList(order.id)}
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          Create Picking List
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'picking-lists' && (
        <>
          <div className="filters">
            <div className="filter-group">
              <label>Status:</label>
              <select
                value={filter.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="form-control"
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="READY">Ready to Pick</option>
                <option value="PICKING">Picking in Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Search:</label>
              <input
                type="text"
                value={filter.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by number or sales order..."
                className="form-control"
              />
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Picking List Number</th>
                  <th>Sales Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Completed Date</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pickingLists.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center">
                      No picking lists found.
                    </td>
                  </tr>
                ) : (
                  pickingLists.map(pl => (
                    <tr key={pl.id}>
                      <td>{pl.picking_list_number}</td>
                      <td>{pl.sales_order?.sales_order_number || '-'}</td>
                      <td>{getCustomerName(pl.sales_order?.customer)}</td>
                      <td>
                        <span className={`status ${getStatusClass(pl.status)}`}>
                          {pl.status_label || pl.status}
                        </span>
                      </td>
                      <td>{formatDate(pl.created_at)}</td>
                      <td>{formatDate(pl.completed_at)}</td>
                      <td>{pl.user?.name || '-'}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleViewItems(pl)}
                        >
                          View Items
                        </button>
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handlePrintPickingList(pl.id)}
                        >
                          Print
                        </button>
                        {pl.status === 'COMPLETED' && (
                          <span className="badge badge-success">Ready for Delivery</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      
      {/* Items Modal */}
      {showItemsModal && selectedPickingList && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h3>Picking List Items - {selectedPickingList.picking_list_number}</h3>
              <button className="btn-close" onClick={() => setShowItemsModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="picking-list-info">
                <p><strong>Sales Order:</strong> {selectedPickingList.sales_order?.sales_order_number}</p>
                <p><strong>Customer:</strong> {getCustomerName(selectedPickingList.sales_order?.customer)}</p>
                <p><strong>Status:</strong>
                  <span className={`status ${getStatusClass(selectedPickingList.status)}`}>
                    {selectedPickingList.status_label || selectedPickingList.status}
                  </span>
                </p>
                {selectedPickingList.notes && (
                  <p><strong>Notes:</strong> {selectedPickingList.notes}</p>
                )}
              </div>

              <h4>Items</h4>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product Code</th>
                    <th>Product Name</th>
                    <th>Location</th>
                    <th>Required Qty</th>
                    <th>Picked Qty</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPickingList.items?.map(item => (
                    <tr key={item.id}>
                      <td>{item.product?.product_code}</td>
                      <td>{item.product?.name}</td>
                      <td>{item.location_code || '-'}</td>
                      <td className="text-right">{item.quantity_required}</td>
                      <td className="text-right">{item.quantity_picked}</td>
                      <td>
                        <span className={`status ${getStatusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowItemsModal(false)}
              >
                Close
              </button>
              <button
                className="btn btn-info"
                onClick={() => handlePrintPickingList(selectedPickingList.id)}
              >
                Print Picking List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PickingLists;