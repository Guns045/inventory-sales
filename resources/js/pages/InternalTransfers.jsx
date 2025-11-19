import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal, Form, Button, Alert, Card, Row, Col, Table } from 'react-bootstrap';
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
      // First try to find delivery order associated with this transfer
      const response = await api.get('/delivery-orders');
      const deliveryOrders = response.data.data;

      console.log('🔍 Debug - Looking for transfer:', transferNumber);
      console.log('🔍 Debug - Available DOs:', deliveryOrders.map(d => ({
        id: d.id,
        number: d.delivery_order_number,
        source_type: d.source_type,
        source_id: d.source_id,
        notes: d.notes,
        notes_lower: d.notes ? d.notes.toLowerCase() : ''
      })));

      // Test search for each DO
      deliveryOrders.forEach(d => {
        const match = d.source_type === 'IT' && d.notes && d.notes.includes(transferNumber);
        console.log(`🔍 Testing DO ${d.delivery_order_number}: source_type=${d.source_type}, match=${match}, notes="${d.notes}"`);
      });

      const deliveryOrder = deliveryOrders.find(order =>
        order.source_type === 'IT' && order.notes && order.notes.includes(transferNumber)
      );

      console.log('🔍 Debug - Found DO:', deliveryOrder);

      if (!deliveryOrder) {
        alert('❌ Delivery Order not found for transfer ' + transferNumber + '\n\nPlease make sure:\n1. Transfer status is IN_TRANSIT\n2. Delivery order has been created via "Create Delivery" button\n3. Try refreshing the page');
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

  const handleCreatePickingList = async (transfer) => {
    try {
      // Generate picking list PDF from warehouse transfer
      const response = await api.post('/picking-lists/from-transfer', {
        warehouse_transfer_id: transfer.id
      });

      if (response.data) {
        alert(`✅ Picking List ${response.data.picking_list_number} generated successfully!`);

        // Download and open the PDF
        downloadAndOpenPDF(response.data.pdf_content, response.data.filename);
      }
    } catch (err) {
      console.error('Error generating picking list:', err);
      alert('❌ Failed to generate picking list: ' + (err.response?.data?.message || err.message));
    }
  };

  const downloadAndOpenPDF = (base64Content, filename) => {
    try {
      // Check if content is provided
      if (!base64Content) {
        throw new Error('No content provided for download');
      }

      // Clean the base64 content - remove any whitespace/newlines
      const cleanBase64 = base64Content.replace(/\s/g, '');

      console.log('PDF Base64 content length:', cleanBase64.length);
      console.log('PDF Base64 starts with:', cleanBase64.substring(0, 50));

      // Validate base64 content
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
        throw new Error('Invalid base64 content format');
      }

      // Convert base64 to binary string
      let binaryData;
      try {
        binaryData = atob(cleanBase64);
      } catch (e) {
        console.error('atob error:', e);
        throw new Error('Failed to decode base64 content: ' + e.message);
      }

      // Create bytes array
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }

      // Create PDF blob
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Open PDF in new window for printing (fallback)
      setTimeout(() => {
        const printWindow = window.open(url, '_blank', 'width=800,height=600');
        if (printWindow) {
          printWindow.onload = function() {
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          };
        }
      }, 100);

      // Clean up URL after 5 minutes
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 300000);

    } catch (error) {
      console.error('Picking list download error:', error);
      console.error('Base64 content sample:', base64Content.substring(0, 100));
      alert('❌ Failed to download picking list. Please try again.\n\nError: ' + error.message);
    }
  };

  const downloadAsFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
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
    return true; // Temporarily enable for testing
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Internal Stock Transfer</h2>
          <p className="text-muted mb-0">Manage stock transfers between warehouses</p>
        </div>
        {canCreateTransfer() && (
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(!showCreateModal)}
          >
            <i className="bi bi-plus-circle me-2"></i>
            {showCreateModal ? 'Hide Form' : 'Create Transfer Request'}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Create Transfer Form */}
      {canCreateTransfer() && showCreateModal && (
        <Card className="mb-4">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">
              <i className="bi bi-plus-circle me-2"></i>
              Create Transfer Request
            </h5>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleCreateTransfer}>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>Product *</Form.Label>
                  <Form.Select
                    value={formData.product_id}
                    onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.sku} - {product.description}
                      </option>
                    ))}
                  </Form.Select>
                </Col>

                <Col md={6} className="mb-3">
                  <Form.Label>Notes</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Optional notes..."
                  />
                </Col>
              </Row>

              <Row>
                <Col md={4} className="mb-3">
                  <Form.Label>From Warehouse *</Form.Label>
                  <Form.Select
                    value={formData.warehouse_from_id}
                    onChange={(e) => setFormData({...formData, warehouse_from_id: e.target.value})}
                    required
                  >
                    <option value="">Select Source Warehouse</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </Form.Select>
                </Col>

                <Col md={4} className="mb-3">
                  <Form.Label>To Warehouse *</Form.Label>
                  <Form.Select
                    value={formData.warehouse_to_id}
                    onChange={(e) => setFormData({...formData, warehouse_to_id: e.target.value})}
                    required
                  >
                    <option value="">Select Destination Warehouse</option>
                    {warehouses
                      .filter(wh => wh.id.toString() !== formData.warehouse_from_id)
                      .map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))}
                  </Form.Select>
                </Col>

                <Col md={4} className="mb-3">
                  <Form.Label>Quantity *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.quantity_requested}
                    onChange={(e) => setFormData({...formData, quantity_requested: parseInt(e.target.value) || 1})}
                    required
                  />
                </Col>
              </Row>

              <div className="d-flex justify-content-end">
                <Button variant="secondary" className="me-2" onClick={() => setFormData({
                  product_id: '',
                  warehouse_from_id: '',
                  warehouse_to_id: '',
                  quantity_requested: 1,
                  notes: ''
                })}>
                  Clear
                </Button>
                <Button variant="primary" type="submit">
                  <i className="bi bi-plus-circle me-2"></i>
                  Create Transfer
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={3}>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={filter.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="REQUESTED">Requested</option>
                <option value="APPROVED">Approved</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>From Warehouse</Form.Label>
              <Form.Select
                value={filter.warehouse_from}
                onChange={(e) => handleFilterChange('warehouse_from', e.target.value)}
              >
                <option value="">All Warehouses</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>To Warehouse</Form.Label>
              <Form.Select
                value={filter.warehouse_to}
                onChange={(e) => handleFilterChange('warehouse_to', e.target.value)}
              >
                <option value="">All Warehouses</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label>Search</Form.Label>
              <Form.Control
                type="text"
                value={filter.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search transfer number or product..."
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="table-container">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
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
                    <td colSpan={11} className="text-center py-5">
                      <i className="bi bi-arrow-left-right fs-1 text-muted mb-3"></i>
                      <h5 className="text-muted">No warehouse transfers found</h5>
                      <p className="text-muted">Create a new transfer request to move stock between warehouses</p>
                    </td>
                  </tr>
                ) : (
                  transfers.map(transfer => (
                    <tr key={transfer.id}>
                      <td>
                        <div className="fw-bold">{transfer.transfer_number}</div>
                      </td>
                      <td>
                        <div>{transfer.product?.sku || '-'}</div>
                        <small className="text-muted">{transfer.product?.description || ''}</small>
                      </td>
                      <td>{transfer.warehouseFrom?.name || '-'}</td>
                      <td>{transfer.warehouseTo?.name || '-'}</td>
                      <td className="text-end">{transfer.quantity_requested}</td>
                      <td className="text-end">{transfer.quantity_delivered || 0}</td>
                      <td className="text-end">{transfer.quantity_received || 0}</td>
                      <td>
                        <span className={`status ${getStatusClass(transfer.status)}`}>
                          {transfer.status}
                        </span>
                      </td>
                      <td>{formatDate(transfer.requested_at)}</td>
                      <td>{transfer.requestedBy?.name || '-'}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => handleViewDetails(transfer)}
                            title="View Details"
                          >
                            <i className="bi bi-eye"></i>
                          </Button>

                          {transfer.status === 'REQUESTED' && canApproveTransfer(transfer) && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleApprove(transfer.id)}
                              title="Approve Transfer"
                            >
                              <i className="bi bi-check-circle"></i>
                            </Button>
                          )}

                          {transfer.status === 'APPROVED' && canDeliverTransfer(transfer) && (
                            <>
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleCreatePickingList(transfer)}
                                title="Create Picking List"
                              >
                                <i className="bi bi-clipboard-check"></i>
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleDeliver(transfer.id)}
                                title="Create Delivery"
                              >
                                <i className="bi bi-truck"></i>
                              </Button>
                            </>
                          )}

                          {transfer.status === 'IN_TRANSIT' && canReceiveTransfer(transfer) && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setSelectedTransfer(transfer);
                                handleReceive(transfer.id);
                              }}
                              title="Receive Goods"
                            >
                              <i className="bi bi-box-arrow-in-down"></i>
                            </Button>
                          )}

                          {/* Print Delivery Order Button - show for IN_TRANSIT and RECEIVED transfers */}
                          {(transfer.status === 'IN_TRANSIT' || transfer.status === 'RECEIVED') && (
                            <Button
                              variant="outline-info"
                              size="sm"
                              onClick={() => handlePrintDeliveryOrder(transfer.transfer_number)}
                              title="Print Delivery Order"
                            >
                              <i className="bi bi-file-pdf"></i>
                            </Button>
                          )}

                          {(transfer.status === 'REQUESTED' || transfer.status === 'APPROVED') &&
                           (transfer.requested_by === user?.id || user?.role?.name === 'Admin') && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleCancel(transfer.id)}
                              title="Cancel Transfer"
                            >
                              <i className="bi bi-x-circle"></i>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

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
                        {product.sku} - {product.description}
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