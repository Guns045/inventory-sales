import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import './GoodsReceipts.css';

const GoodsReceipts = () => {
  const { api } = useAPI();
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGoodsReceipt, setSelectedGoodsReceipt] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [formData, setFormData] = useState({
    purchase_order_id: '',
    receipt_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Fetch goods receipts from API
  useEffect(() => {
    fetchGoodsReceipts();
    fetchPurchaseOrders();
  }, []);

  const fetchGoodsReceipts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/goods-receipts');
      setGoodsReceipts(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching goods receipts:', error);
      setError('Failed to fetch goods receipts');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await api.get('/purchase-orders?status=APPROVED');
      setPurchaseOrders(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  const handleCreateGoodsReceipt = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/goods-receipts', formData);
      setGoodsReceipts(prev => [response.data, ...prev]);
      setShowCreateModal(false);
      setFormData({
        purchase_order_id: '',
        receipt_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      alert('Goods Receipt created successfully!');
    } catch (error) {
      console.error('Error creating goods receipt:', error);
      setError('Failed to create goods receipt');
    }
  };

  const handleViewGoodsReceipt = async (id) => {
    try {
      const response = await api.get(`/goods-receipts/${id}`);
      setSelectedGoodsReceipt(response.data);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching goods receipt details:', error);
      setError('Failed to fetch goods receipt details');
    }
  };

  const getStatusBadge = (status) => {
    const variant = status === 'RECEIVED' ? 'success' : status === 'PENDING' ? 'warning' : 'secondary';
    return <Badge bg={variant}>{status}</Badge>;
  };

  const formatReceiptNumber = (receiptNumber) => {
    // Ensure format: [KODE]-[URUTAN]/[WAREHOUSE]/[BULAN]-[TAHUN]
    // Example: GR-0001/JKT/11-2025
    return receiptNumber ? receiptNumber.toUpperCase() : '';
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading goods receipts...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-0">Goods Receipts</h4>
                <small className="text-muted">Manage incoming goods from purchase orders</small>
              </div>
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                disabled={purchaseOrders.length === 0}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Create Goods Receipt
              </Button>
            </Card.Header>

            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}

              {purchaseOrders.length === 0 && (
                <Alert variant="warning">
                  <Alert.Heading>No Approved Purchase Orders</Alert.Heading>
                  <p>You need approved purchase orders before creating goods receipts.</p>
                </Alert>
              )}

              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Receipt Number</th>
                      <th>Purchase Order</th>
                      <th>Status</th>
                      <th>Receipt Date</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goodsReceipts.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          <div className="text-muted">
                            <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                            No goods receipts found
                          </div>
                        </td>
                      </tr>
                    ) : (
                      goodsReceipts.map(receipt => (
                        <tr key={receipt.id}>
                          <td>
                            <strong className="text-primary">{formatReceiptNumber(receipt.receipt_number)}</strong>
                          </td>
                          <td>{receipt.purchase_order?.po_number || 'N/A'}</td>
                          <td>{getStatusBadge(receipt.status)}</td>
                          <td>{new Date(receipt.receipt_date).toLocaleDateString()}</td>
                          <td>{receipt.user?.name || 'N/A'}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => handleViewGoodsReceipt(receipt.id)}
                              className="me-2"
                            >
                              <i className="bi bi-eye"></i> View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
                    value={formData.purchase_order_id}
                    onChange={(e) => setFormData({...formData, purchase_order_id: e.target.value})}
                    required
                  >
                    <option value="">Select Purchase Order</option>
                    {purchaseOrders.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.po_number} - {po.supplier?.name} (${po.total_amount})
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text>Select an approved purchase order to receive goods from</Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Receipt Date *</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.receipt_date}
                    onChange={(e) => setFormData({...formData, receipt_date: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any notes about this goods receipt..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <i className="bi bi-check-circle me-2"></i>
              Create Goods Receipt
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Goods Receipt Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-eye me-2"></i>
            Goods Receipt Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedGoodsReceipt && (
            <div>
              <Row className="mb-4">
                <Col md={6}>
                  <h6>Receipt Information</h6>
                  <p><strong>Receipt Number:</strong> <span className="text-primary fw-bold">{formatReceiptNumber(selectedGoodsReceipt.receipt_number)}</span></p>
                  <p><strong>PO Number:</strong> {selectedGoodsReceipt.purchase_order?.po_number}</p>
                  <p><strong>Supplier:</strong> {selectedGoodsReceipt.purchase_order?.supplier?.name}</p>
                </Col>
                <Col md={6}>
                  <h6>Receipt Details</h6>
                  <p><strong>Date:</strong> {new Date(selectedGoodsReceipt.receipt_date).toLocaleDateString()}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedGoodsReceipt.status)}</p>
                  <p><strong>Created By:</strong> {selectedGoodsReceipt.user?.name}</p>
                </Col>
              </Row>

              {selectedGoodsReceipt.goods_receipt_items && (
                <div>
                  <h6>Received Items</h6>
                  <Table striped size="sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity Ordered</th>
                        <th>Quantity Received</th>
                        <th>Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGoodsReceipt.goods_receipt_items.map(item => (
                        <tr key={item.id}>
                          <td>{item.purchase_order_item?.product?.name}</td>
                          <td>{item.purchase_order_item?.quantity_ordered}</td>
                          <td>{item.quantity_received}</td>
                          <td>
                            <Badge bg={item.condition === 'GOOD' ? 'success' : 'warning'}>
                              {item.condition}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}

              {selectedGoodsReceipt.notes && (
                <div className="mt-3">
                  <h6>Notes</h6>
                  <p>{selectedGoodsReceipt.notes}</p>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default GoodsReceipts;