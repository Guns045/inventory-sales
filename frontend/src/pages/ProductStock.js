import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Modal,
  Form,
  Alert,
  Spinner,
  InputGroup,
  Badge
} from 'react-bootstrap';
import './Products.css';

const ProductStock = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const [productStock, setProductStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [formData, setFormData] = useState({
    adjustment_type: 'increase',
    quantity: '',
    reason: '',
    notes: ''
  });

  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    fetchProductStock();
    fetchWarehouses();
  }, []); // Only fetch once on component mount

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchProductStock = async () => {
    try {
      setLoading(true);
      let endpoint = '/product-stock';

      const params = new URLSearchParams();

      if (user?.role?.name !== 'Super Admin') {
        // TODO: Get user's assigned warehouses
        // params.append('warehouse_ids', user.warehouse_ids);
      }

      const response = await api.get(`${endpoint}?${params.toString()}`);
      setProductStock(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching product stock:', error);
      setError('Failed to fetch product stock data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchProductStock();
  };

  const handleAdjustStock = (stock) => {
    setSelectedStock(stock);
    setShowAdjustModal(true);
  };

  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    try {
      const adjustmentData = {
        product_stock_id: selectedStock.id,
        adjustment_type: formData.adjustment_type,
        quantity: parseInt(formData.quantity),
        reason: formData.reason,
        notes: formData.notes
      };

      await api.post('/product-stock/adjust', adjustmentData);

      // Refresh data to get latest stock information
      await refreshData();

      setShowAdjustModal(false);
      setFormData({
        adjustment_type: 'increase',
        quantity: '',
        reason: '',
        notes: ''
      });

      alert('Stock adjusted successfully!');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      setError('Failed to adjust stock');
    }
  };

  const getStockStatus = (stock) => {
    const available = stock.quantity - stock.reserved_quantity;
    const minStock = stock.min_stock_level || 0;

    if (available <= 0) return { variant: 'danger', text: 'Out of Stock' };
    if (available <= minStock) return { variant: 'warning', text: 'Low Stock' };
    return { variant: 'success', text: 'In Stock' };
  };

  const isSuperAdmin = user?.role?.name === 'Super Admin';

  const filteredStock = productStock.filter(stock => {
    // Apply search filter
    const searchMatch = !searchTerm ||
      stock.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Apply warehouse filter
    const warehouseMatch = !selectedWarehouse ||
      stock.warehouse?.id?.toString() === selectedWarehouse.toString();

    return searchMatch && warehouseMatch;
  });

  if (loading) {
    return (
      <div className="loading">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Container>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Product Stock Management</h2>
          <p className="text-muted mb-0">Monitor and manage inventory across warehouses</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdjustModal(true)} disabled={productStock.length === 0}>
          <i className="bi bi-pencil-square me-2"></i>
          Adjust Stock
        </Button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <InputGroup>
                <Form.Control
                  placeholder="Search by product name, SKU, or warehouse..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                <option value="">All Warehouses</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2} className="text-md-end mt-3 mt-md-0">
              {selectedWarehouse && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setSelectedWarehouse('')}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Clear
                </Button>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Stock Table */}
      <Card className="table-container">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th>Total Stock</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Min Stock</th>
                  <th>Warehouse</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      <i className="bi bi-search fs-1 text-muted mb-3"></i>
                      <h5 className="text-muted">No stock data found</h5>
                      <p className="text-muted">Try adjusting your search criteria</p>
                    </td>
                  </tr>
                ) : (
                  filteredStock.map(stock => {
                    const available = stock.quantity - stock.reserved_quantity;
                    const status = getStockStatus(stock);
                    return (
                      <tr key={stock.id}>
                        <td>
                          <code className="text-secondary">{stock.product?.sku || 'N/A'}</code>
                        </td>
                        <td>
                          <div>
                            <strong>{stock.product?.name || 'N/A'}</strong>
                            <br />
                            <small className="text-muted">
                              {stock.product?.category || 'No Category'}
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className="text-primary fw-semibold">{stock.quantity}</span>
                        </td>
                        <td>
                          <span className="text-warning">{stock.reserved_quantity}</span>
                        </td>
                        <td>
                          <span className={`fw-semibold ${available > 0 ? 'text-success' : 'text-danger'}`}>
                            {available}
                          </span>
                        </td>
                        <td>
                          <small>{stock.min_stock_level || 0}</small>
                        </td>
                        <td>
                          <div className="warehouse-location">
                            <Badge bg="light" text="dark">
                              {stock.warehouse?.code || 'N/A'}
                            </Badge>
                            <br />
                            <small className="text-muted">{stock.warehouse?.name || 'N/A'}</small>
                          </div>
                        </td>
                        <td>
                          <Badge bg={status.variant}>
                            {status.text}
                          </Badge>
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleAdjustStock(stock)}
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                            <Button
                              variant="outline-info"
                              size="sm"
                              title="View Details"
                            >
                              <i className="bi bi-eye"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Stock Adjustment Modal */}
      <Modal show={showAdjustModal} onHide={() => setShowAdjustModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-pencil-square me-2"></i>
            Adjust Stock
          </Modal.Title>
        </Modal.Header>
        {selectedStock && (
          <Form onSubmit={handleSubmitAdjustment}>
            <Modal.Body>
              <Alert variant="info">
                <div className="row">
                  <div className="col-6">
                    <strong>Product:</strong> {selectedStock.product?.name}
                  </div>
                  <div className="col-6">
                    <strong>SKU:</strong> {selectedStock.product?.sku}
                  </div>
                  <div className="col-6">
                    <strong>Warehouse:</strong> {selectedStock.warehouse?.name}
                  </div>
                  <div className="col-6">
                    <strong>Current Stock:</strong> {selectedStock.quantity}
                  </div>
                </div>
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label>Adjustment Type *</Form.Label>
                <Form.Select
                  value={formData.adjustment_type}
                  onChange={(e) => setFormData({...formData, adjustment_type: e.target.value})}
                  required
                >
                  <option value="increase">Increase Stock</option>
                  <option value="decrease">Decrease Stock</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Quantity *</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  placeholder="Enter quantity"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Reason *</Form.Label>
                <Form.Select
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  required
                >
                  <option value="">Select a reason</option>
                  <option value="count_adjustment">Stock Count Adjustment</option>
                  <option value="damaged_goods">Damaged Goods</option>
                  <option value="returned_goods">Returned Goods</option>
                  <option value="lost_items">Lost Items</option>
                  <option value="correction">Data Correction</option>
                  <option value="other">Other</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes about this adjustment..."
                />
              </Form.Group>

              {formData.adjustment_type === 'decrease' && (
                <Alert variant="warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>Warning:</strong> This will reduce the stock quantity. Please ensure accuracy.
                </Alert>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowAdjustModal(false)}>
                <i className="bi bi-x-circle me-2"></i>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                <i className="bi bi-check-circle me-2"></i>
                Adjust Stock
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>
    </Container>
  );
};

export default ProductStock;