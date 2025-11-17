import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { usePermissions } from '../contexts/PermissionContext';
import './GoodsReceipts.css';

const GoodsReceipts = () => {
  const { get, post, put, delete: deleteRequest } = useAPI();
  const { user } = usePermissions();
  const { hasPermission, canRead, canCreate, canUpdate, canDelete } = usePermissions();

  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedGoodsReceipt, setSelectedGoodsReceipt] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0
  });
  const [formData, setFormData] = useState({
    purchase_order_id: '',
    warehouse_id: '',
    received_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Fetch goods receipts from API
  useEffect(() => {
    fetchGoodsReceipts();
    fetchPurchaseOrders();
    fetchWarehouses();
  }, []);

  const fetchGoodsReceipts = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const response = await get(`/goods-receipts?page=${page}`);
      if (response && response.data) {
        if (response.data.data) {
          setGoodsReceipts(response.data.data);
          setPagination({
            current_page: response.data.current_page,
            last_page: response.data.last_page,
            per_page: response.data.per_page,
            total: response.data.total,
            from: response.data.from,
            to: response.data.to
          });
        } else {
          const goodsReceiptsData = Array.isArray(response.data) ? response.data : [];
          setGoodsReceipts(goodsReceiptsData);
        }
      }
    } catch (err) {
      console.error('Error fetching goods receipts:', err);
      setError('Failed to fetch goods receipts');
      setGoodsReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await get('/purchase-orders/ready-for-goods-receipt');
      if (response && response.data) {
        setPurchaseOrders(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await get('/warehouses');
      if (response && response.data) {
        setWarehouses(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateGoodsReceipt = async (e) => {
    e.preventDefault();

    try {
      const selectedPO = purchaseOrders.find(po => po.id === parseInt(formData.purchase_order_id));

      const response = await post('/goods-receipts', {
        ...formData,
        items: selectedPO ? selectedPO.items.map(item => ({
          purchase_order_item_id: item.id,
          product_id: item.product_id,
          quantity_ordered: item.quantity,
          quantity_received: item.quantity, // Default to full quantity
          unit_price: item.unit_price,
          line_total: item.quantity * item.unit_price,
          condition: 'GOOD'
        })) : []
      });

      if (response.data) {
        setShowCreateModal(false);
        setFormData({
          purchase_order_id: '',
          warehouse_id: '',
          received_date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchGoodsReceipts();
      }
    } catch (err) {
      console.error('Error creating goods receipt:', err);
      setError('Failed to create goods receipt');
    }
  };

  const handleViewGoodsReceipt = async (id) => {
    setSelectedGoodsReceipt(goodsReceipts.find(gr => gr.id === id));
    setShowViewModal(true);
  };

  const handleViewItems = async (receipt) => {
    setSelectedGoodsReceipt(receipt);
    try {
      const response = await get(`/goods-receipts/${receipt.id}/items`);
      if (response && response.data) {
        setReceiptItems(Array.isArray(response.data) ? response.data : []);
      }
      setShowItemsModal(true);
    } catch (err) {
      console.error('Error fetching receipt items:', err);
      setError('Failed to fetch receipt items');
    }
  };

  const handleReceiveGoods = async (id) => {
    if (!window.confirm('Are you sure you want to receive these goods? This will update stock levels.')) {
      return;
    }

    try {
      await post(`/goods-receipts/${id}/receive`);
      fetchGoodsReceipts();
    } catch (err) {
      console.error('Error receiving goods:', err);
      setError('Failed to receive goods');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goods receipt?')) {
      return;
    }

    try {
      await deleteRequest(`/goods-receipts/${id}`);
      fetchGoodsReceipts();
    } catch (err) {
      console.error('Error deleting goods receipt:', err);
      setError('Failed to delete goods receipt');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { bg: 'warning', text: 'Pending' },
      'RECEIVED': { bg: 'success', text: 'Received' },
      'REJECTED': { bg: 'danger', text: 'Rejected' }
    };

    const config = statusConfig[status] || { bg: 'secondary', text: status };
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const getConditionBadge = (condition) => {
    const conditionConfig = {
      'GOOD': { bg: 'success', text: 'Good' },
      'DAMAGED': { bg: 'warning', text: 'Damaged' },
      'DEFECTIVE': { bg: 'danger', text: 'Defective' },
      'WRONG_ITEM': { bg: 'info', text: 'Wrong Item' }
    };

    const config = conditionConfig[condition] || { bg: 'secondary', text: condition };
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const canEditReceipt = (receipt) => {
    return hasPermission('goods-receipts.update') && receipt.status === 'PENDING';
  };

  const canDeleteReceipt = (receipt) => {
    return hasPermission('goods-receipts.delete') && receipt.status === 'PENDING';
  };

  const canReceiveGoods = (receipt) => {
    return hasPermission('goods-receipts.update') && receipt.status === 'PENDING';
  };

  const renderPagination = () => {
    if (pagination.last_page <= 1) return null;

    const pages = [];
    const currentPage = pagination.current_page;
    const lastPage = pagination.last_page;

    // Show limited page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(lastPage, currentPage + 2);

    if (currentPage <= 3) {
      endPage = Math.min(5, lastPage);
    }

    if (currentPage >= lastPage - 2) {
      startPage = Math.max(1, lastPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "primary" : "outline-primary"}
          size="sm"
          className="me-1"
          onClick={() => fetchGoodsReceipts(i)}
        >
          {i}
        </Button>
      );
    }

    return (
      <div className="d-flex justify-content-center align-items-center mt-3">
        <Button
          variant="outline-primary"
          size="sm"
          className="me-2"
          disabled={currentPage <= 1}
          onClick={() => fetchGoodsReceipts(currentPage - 1)}
        >
          Previous
        </Button>
        {pages}
        <Button
          variant="outline-primary"
          size="sm"
          className="ms-2"
          disabled={currentPage >= lastPage}
          onClick={() => fetchGoodsReceipts(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading goods receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="goods-receipts">
      <Container fluid>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">Goods Receipts</h2>
            <p className="text-muted mb-0">
              Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total} goods receipts
            </p>
          </div>
          <div>
            {hasPermission('goods-receipts.create') && (
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <i className="bi bi-plus-lg me-2"></i>
                Create Goods Receipt
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <Card>
          <Card.Body>
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>GR Number</th>
                    <th>Purchase Order</th>
                    <th>Supplier</th>
                    <th>Warehouse</th>
                    <th>Status</th>
                    <th>Received Date</th>
                    <th>Total Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {goodsReceipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td className="fw-medium">{receipt.gr_number}</td>
                      <td>{receipt.purchase_order?.po_number || 'N/A'}</td>
                      <td>{receipt.purchase_order?.supplier?.company_name || 'N/A'}</td>
                      <td>{receipt.warehouse?.name || 'N/A'}</td>
                      <td>{getStatusBadge(receipt.status)}</td>
                      <td>{receipt.received_date || '-'}</td>
                      <td className="text-end">{formatCurrency(receipt.total_amount)}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewItems(receipt)}
                          >
                            <i className="bi bi-eye"></i>
                          </Button>
                          {canReceiveGoods(receipt) && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleReceiveGoods(receipt.id)}
                            >
                              <i className="bi bi-check-circle"></i>
                            </Button>
                          )}
                          {canDeleteReceipt(receipt) && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(receipt.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        {renderPagination()}

      {/* Create Goods Receipt Modal */}
        <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="bi bi-plus-circle me-2"></i>
              Create Goods Receipt
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleCreateGoodsReceipt}>
            <Modal.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Purchase Order *</Form.Label>
                    <Form.Select
                      name="purchase_order_id"
                      value={formData.purchase_order_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Purchase Order</option>
                      {purchaseOrders.map(po => (
                        <option key={po.id} value={po.id}>
                          {po.po_number} - {po.supplier?.company_name} ({formatCurrency(po.total_amount)})
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">Select a confirmed purchase order to receive goods from</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Warehouse *</Form.Label>
                    <Form.Select
                      name="warehouse_id"
                      value={formData.warehouse_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Received Date *</Form.Label>
                    <Form.Control
                      type="date"
                      name="received_date"
                      value={formData.received_date}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Enter notes about this goods receipt..."
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <i className="bi bi-check-circle me-2"></i>
                Create Goods Receipt
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* View Items Modal */}
        <Modal show={showItemsModal} onHide={() => setShowItemsModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="bi bi-eye me-2"></i>
              Goods Receipt Items - {selectedGoodsReceipt?.gr_number}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {receiptItems.length > 0 ? (
              <Table hover>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity Ordered</th>
                    <th>Quantity Received</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.product?.name || 'N/A'}</td>
                      <td>{item.quantity_ordered}</td>
                      <td>{item.quantity_received}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td className="text-end">{formatCurrency(item.line_total)}</td>
                      <td>{getConditionBadge(item.condition)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-center text-muted">No items found</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowItemsModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default GoodsReceipts;