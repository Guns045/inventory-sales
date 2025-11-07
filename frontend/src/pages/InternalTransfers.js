import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';
import './InternalTransfers.css';

const InternalTransfers = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    status: '',
    warehouse_from: '',
    warehouse_to: '',
    search: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_from_id: '',
    warehouse_to_id: '',
    quantity_requested: 1,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch transfers with filters
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.warehouse_from) params.append('warehouse_from', filter.warehouse_from);
      if (filter.warehouse_to) params.append('warehouse_to', filter.warehouse_to);
      if (filter.search) params.append('search', filter.search);

      const [transfersResponse, productsResponse, warehousesResponse] = await Promise.allSettled([
        api.get(`/warehouse-transfers?${params.toString()}`),
        api.get('/products'),
        api.get('/warehouses')
      ]);

      if (transfersResponse.status === 'fulfilled') {
        setTransfers(transfersResponse.value.data.data || transfersResponse.value.data || []);
      }

      if (productsResponse.status === 'fulfilled') {
        setProducts(productsResponse.value.data.data || productsResponse.value.data || []);
      }

      if (warehousesResponse.status === 'fulfilled') {
        setWarehouses(warehousesResponse.value.data.data || warehousesResponse.value.data || []);
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/warehouse-transfers', formData);
      if (response.data) {
        alert('✅ Warehouse transfer request created successfully!');
        setShowCreateModal(false);
        setFormData({
          product_id: '',
          warehouse_from_id: '',
          warehouse_to_id: '',
          quantity_requested: 1,
          notes: ''
        });
        fetchData();
      }
    } catch (err) {
      console.error('Error creating transfer:', err);
      alert('❌ Failed to create transfer: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleApprove = async (id) => {
    try {
      const response = await api.post(`/warehouse-transfers/${id}/approve`, {
        notes: 'Approved by ' + user.name
      });
      if (response.data) {
        alert('✅ Transfer approved successfully!');
        fetchData();
      }
    } catch (err) {
      console.error('Error approving transfer:', err);
      alert('❌ Failed to approve: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeliver = async (id) => {
    const transfer = transfers.find(t => t.id === id);
    const maxQuantity = transfer?.quantity_requested || 0;
    const quantity = prompt(`Enter quantity to deliver (max: ${maxQuantity}):`);

    // Validate quantity input
    if (!quantity || quantity.trim() === '') {
      alert('❌ Please enter a valid quantity');
      return;
    }

    const parsedQuantity = parseInt(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      alert('❌ Please enter a valid positive number');
      return;
    }

    if (parsedQuantity > maxQuantity) {
      alert(`❌ Quantity cannot exceed requested amount (${maxQuantity})`);
      return;
    }

    try {
      const response = await api.post(`/warehouse-transfers/${id}/deliver`, {
        quantity_delivered: parsedQuantity,
        notes: 'Delivered by ' + user.name
      });
      if (response.data) {
        alert('✅ Delivery order created successfully!');
        fetchData();
      }
    } catch (err) {
      console.error('Error delivering transfer:', err);
      alert('❌ Failed to deliver: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReceive = async (id) => {
    const maxQuantity = selectedTransfer?.quantity_delivered || 0;
    const quantity = prompt(`Enter quantity to receive (max: ${maxQuantity}):`);
    if (!quantity || quantity <= 0 || quantity > maxQuantity) return;

    try {
      const response = await api.post(`/warehouse-transfers/${id}/receive`, {
        quantity_received: parseInt(quantity),
        notes: 'Received by ' + user.name
      });
      if (response.data) {
        alert('✅ Goods received successfully!');
        setShowDetailsModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Error receiving transfer:', err);
      alert('❌ Failed to receive: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePrintDeliveryOrder = async (transferNumber) => {
    try {
      // Find delivery order associated with this transfer
      const response = await api.get('/delivery-orders');
      const deliveryOrders = response.data.data;
      const deliveryOrder = deliveryOrders.find(order =>
        order.notes && order.notes.includes(`For warehouse transfer: ${transferNumber}`)
      );

      if (!deliveryOrder) {
        alert('❌ Delivery Order not found for this transfer');
        return;
      }

      // Download PDF using authenticated request
      const pdfResponse = await api.get(`/delivery-orders/${deliveryOrder.id}/print`, {
        responseType: 'blob'
      });

      // Create blob URL and open in new window
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');

      // Clean up blob URL after window opens
      if (newWindow) {
        newWindow.onload = () => {
          window.URL.revokeObjectURL(url);
        };
      } else {
        // If popup blocked, download directly
        const link = document.createElement('a');
        link.href = url;
        link.download = `Delivery-Order-${deliveryOrder.delivery_order_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error printing delivery order:', err);
      alert('❌ Failed to print delivery order: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    try {
      const response = await api.post(`/warehouse-transfers/${id}/cancel`, {
        reason: reason
      });
      if (response.data) {
        alert('✅ Transfer cancelled successfully!');
        fetchData();
      }
    } catch (err) {
      console.error('Error cancelling transfer:', err);
      alert('❌ Failed to cancel: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleViewDetails = async (transfer) => {
    setSelectedTransfer(transfer);
    setShowDetailsModal(true);
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'requested': return 'status-blue';
      case 'approved': return 'status-yellow';
      case 'in_transit': return 'status-orange';
      case 'received': return 'status-green';
      case 'cancelled': return 'status-red';
      default: return 'status-gray';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canCreateTransfer = () => {
    return ['Super Admin', 'Admin'].includes(user?.role?.name) || (user?.role?.name === 'Gudang' && user?.warehouse_id);
  };

  const canApproveTransfer = (transfer) => {
    if (['Super Admin', 'Admin'].includes(user?.role?.name)) return true;
    if (user?.role?.name === 'Gudang' && user?.warehouse_id === transfer.warehouse_from_id) return true;
    return false;
  };

  const canDeliverTransfer = (transfer) => {
    if (['Super Admin', 'Admin'].includes(user?.role?.name)) return true;
    if (user?.role?.name === 'Gudang' && user?.warehouse_id === transfer.warehouse_from_id) return true;
    return false;
  };

  const canReceiveTransfer = (transfer) => {
    if (['Super Admin', 'Admin'].includes(user?.role?.name)) return true;
    if (user?.role?.name === 'Gudang' && user?.warehouse_id === transfer.warehouse_to_id) return true;
    return false;
  };

  if (loading) {
    return <div className="loading">Loading warehouse transfers...</div>;
  }

  return (
    <div className="internal-transfers">
      <div className="header">
        <h1>Internal Stock Transfer</h1>
        {canCreateTransfer() && (
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Create Transfer Request
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn-close">×</button>
        </div>
      )}

      <div className="filters">
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filter.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="form-control"
          >
            <option value="">All Status</option>
            <option value="REQUESTED">Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label>From Warehouse:</label>
          <select
            value={filter.warehouse_from}
            onChange={(e) => handleFilterChange('warehouse_from', e.target.value)}
            className="form-control"
          >
            <option value="">All Warehouses</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>To Warehouse:</label>
          <select
            value={filter.warehouse_to}
            onChange={(e) => handleFilterChange('warehouse_to', e.target.value)}
            className="form-control"
          >
            <option value="">All Warehouses</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            value={filter.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search by transfer number or product..."
            className="form-control"
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Transfer Number</th>
              <th>Product</th>
              <th>From Warehouse</th>
              <th>To Warehouse</th>
              <th>Requested Qty</th>
              <th>Delivered Qty</th>
              <th>Received Qty</th>
              <th>Status</th>
              <th>Requested Date</th>
              <th>Requested By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan="11" className="text-center">
                  <div className="text-center py-4">
                    <i className="bi bi-arrow-left-right text-muted fs-1"></i>
                    <p className="text-muted mt-2">No warehouse transfers found</p>
                    <small className="text-muted">
                      Create a new transfer request to move stock between warehouses
                    </small>
                  </div>
                </td>
              </tr>
            ) : (
              transfers.map(transfer => (
                <tr key={transfer.id}>
                  <td>
                    <div className="fw-bold">{transfer.transfer_number}</div>
                  </td>
                  <td>
                    <div>{transfer.product?.name || '-'}</div>
                    <small className="text-muted">{transfer.product?.sku || ''}</small>
                  </td>
                  <td>{transfer.warehouseFrom?.name || '-'}</td>
                  <td>{transfer.warehouseTo?.name || '-'}</td>
                  <td className="text-right">{transfer.quantity_requested}</td>
                  <td className="text-right">{transfer.quantity_delivered || 0}</td>
                  <td className="text-right">{transfer.quantity_received || 0}</td>
                  <td>
                    <span className={`status ${getStatusClass(transfer.status)}`}>
                      {transfer.status}
                    </span>
                  </td>
                  <td>{formatDate(transfer.requested_at)}</td>
                  <td>{transfer.requestedBy?.name || '-'}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => handleViewDetails(transfer)}
                    >
                      <i className="bi bi-eye"></i>
                    </button>

                    {transfer.status === 'REQUESTED' && canApproveTransfer(transfer) && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleApprove(transfer.id)}
                        title="Approve Transfer"
                      >
                        <i className="bi bi-check-circle"></i>
                      </button>
                    )}

                    {transfer.status === 'APPROVED' && canDeliverTransfer(transfer) && (
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleDeliver(transfer.id)}
                        title="Create Delivery"
                      >
                        <i className="bi bi-truck"></i>
                      </button>
                    )}

                    {transfer.status === 'IN_TRANSIT' && canReceiveTransfer(transfer) && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setSelectedTransfer(transfer);
                          handleReceive(transfer.id);
                        }}
                        title="Receive Goods"
                      >
                        <i className="bi bi-box-arrow-in-down"></i>
                      </button>
                    )}

                    {/* Print Delivery Order Button - show for IN_TRANSIT and RECEIVED transfers */}
                    {(transfer.status === 'IN_TRANSIT' || transfer.status === 'RECEIVED') && (
                      <button
                        className="btn btn-sm btn-info"
                        onClick={() => handlePrintDeliveryOrder(transfer.transfer_number)}
                        title="Print Delivery Order"
                      >
                        <i className="bi bi-file-pdf"></i>
                      </button>
                    )}

                    {(transfer.status === 'REQUESTED' || transfer.status === 'APPROVED') &&
                     (transfer.requested_by === user?.id || user?.role?.name === 'Admin') && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleCancel(transfer.id)}
                        title="Cancel Transfer"
                      >
                        <i className="bi bi-x-circle"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Transfer Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create Warehouse Transfer Request</h3>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleCreateTransfer}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Product *</label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                    className="form-control"
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>From Warehouse *</label>
                  <select
                    value={formData.warehouse_from_id}
                    onChange={(e) => setFormData({...formData, warehouse_from_id: e.target.value})}
                    className="form-control"
                    required
                  >
                    <option value="">Select Source Warehouse</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>To Warehouse *</label>
                  <select
                    value={formData.warehouse_to_id}
                    onChange={(e) => setFormData({...formData, warehouse_to_id: e.target.value})}
                    className="form-control"
                    required
                  >
                    <option value="">Select Destination Warehouse</option>
                    {warehouses
                      .filter(wh => wh.id.toString() !== formData.warehouse_from_id)
                      .map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity_requested}
                    onChange={(e) => setFormData({...formData, quantity_requested: parseInt(e.target.value) || 1})}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="form-control"
                    rows="3"
                    placeholder="Optional notes for this transfer..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Transfer Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Details Modal */}
      {showDetailsModal && selectedTransfer && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h3>Transfer Details - {selectedTransfer.transfer_number}</h3>
              <button className="btn-close" onClick={() => setShowDetailsModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="transfer-info">
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Product:</strong> {selectedTransfer.product?.name}</p>
                    <p><strong>Product Code:</strong> {selectedTransfer.product?.sku}</p>
                    <p><strong>From Warehouse:</strong> {selectedTransfer.warehouseFrom?.name}</p>
                    <p><strong>To Warehouse:</strong> {selectedTransfer.warehouseTo?.name}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Requested Quantity:</strong> {selectedTransfer.quantity_requested}</p>
                    <p><strong>Delivered Quantity:</strong> {selectedTransfer.quantity_delivered || 0}</p>
                    <p><strong>Received Quantity:</strong> {selectedTransfer.quantity_received || 0}</p>
                    <p><strong>Status:</strong>
                      <span className={`status ${getStatusClass(selectedTransfer.status)}`}>
                        {selectedTransfer.status}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="row mt-3">
                  <div className="col-md-6">
                    <p><strong>Requested By:</strong> {selectedTransfer.requestedBy?.name}</p>
                    <p><strong>Requested Date:</strong> {formatDate(selectedTransfer.requested_at)}</p>
                    {selectedTransfer.approved_by && (
                      <>
                        <p><strong>Approved By:</strong> {selectedTransfer.approvedBy?.name}</p>
                        <p><strong>Approved Date:</strong> {formatDate(selectedTransfer.approved_at)}</p>
                      </>
                    )}
                  </div>
                  <div className="col-md-6">
                    {selectedTransfer.delivered_by && (
                      <>
                        <p><strong>Delivered By:</strong> {selectedTransfer.deliveredBy?.name}</p>
                        <p><strong>Delivered Date:</strong> {formatDate(selectedTransfer.delivered_at)}</p>
                      </>
                    )}
                    {selectedTransfer.received_by && (
                      <>
                        <p><strong>Received By:</strong> {selectedTransfer.receivedBy?.name}</p>
                        <p><strong>Received Date:</strong> {formatDate(selectedTransfer.received_at)}</p>
                      </>
                    )}
                  </div>
                </div>

                {selectedTransfer.notes && (
                  <div className="mt-3">
                    <p><strong>Notes:</strong> {selectedTransfer.notes}</p>
                  </div>
                )}

                {selectedTransfer.reason && (
                  <div className="mt-3">
                    <p><strong>Cancellation Reason:</strong> {selectedTransfer.reason}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>

              {selectedTransfer.status === 'REQUESTED' && canApproveTransfer(selectedTransfer) && (
                <button
                  className="btn btn-success"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleApprove(selectedTransfer.id);
                  }}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  Approve Transfer
                </button>
              )}

              {selectedTransfer.status === 'APPROVED' && canDeliverTransfer(selectedTransfer) && (
                <button
                  className="btn btn-warning"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleDeliver(selectedTransfer.id);
                  }}
                >
                  <i className="bi bi-truck me-2"></i>
                  Create Delivery
                </button>
              )}

              {/* Print Delivery Order Button - show for IN_TRANSIT and RECEIVED transfers */}
              {(selectedTransfer.status === 'IN_TRANSIT' || selectedTransfer.status === 'RECEIVED') && (
                <button
                  className="btn btn-info"
                  onClick={() => handlePrintDeliveryOrder(selectedTransfer.transfer_number)}
                >
                  <i className="bi bi-file-pdf me-2"></i>
                  Print Delivery Order
                </button>
              )}

              {selectedTransfer.status === 'IN_TRANSIT' && canReceiveTransfer(selectedTransfer) && (
                <button
                  className="btn btn-primary"
                  onClick={handleReceive}
                >
                  <i className="bi bi-box-arrow-in-down me-2"></i>
                  Receive Goods
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalTransfers;