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
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [adjustingStockId, setAdjustingStockId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [formData, setFormData] = useState({
    adjustment_type: 'increase',
    quantity: '',
    reason: '',
    notes: ''
  });
  const [createFormData, setCreateFormData] = useState({
    product_id: '',
    product_search: '',
    warehouse_id: '',
    quantity: '',
    reserved_quantity: '0',
    min_stock_level: '50'
  });
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [products, setProducts] = useState([]); // eslint-disable-line no-unused-vars
  const [warehouses, setWarehouses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0
  });

  useEffect(() => {
    fetchProductStock();
    fetchWarehouses();
    fetchProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch data when search term or warehouse filter changes
  useEffect(() => {
    fetchProductStock(1); // Reset to first page when searching/filtering
  }, [searchTerm, selectedWarehouse]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchProductStock = async (page = 1) => {
    try {
      setLoading(true);
      let endpoint = '/product-stock';

      // Add pagination parameters
      const params = new URLSearchParams({
        page: page,
        per_page: 10
      });

      // Add search parameter
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      // Add warehouse filter
      if (selectedWarehouse) {
        params.append('warehouse_id', selectedWarehouse);
      }

      // Add view mode to show all warehouses
      if (user?.role?.name === 'Sales Team' || user?.role?.name === 'Super Admin') {
        params.append('view_mode', 'all-warehouses');
      }

      const response = await api.get(`${endpoint}?${params}`);

      // Set both data and pagination info
      setProductStock(response.data.data || response.data);
      setPaginationInfo({
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
        per_page: response.data.per_page || 10,
        total: response.data.total || 0,
        from: response.data.from || 0,
        to: response.data.to || 0
      });
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching product stock:', error);
      setError('Failed to fetch product stock data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchProductStock(currentPage);
  };

  const handlePageChange = (page) => {
    fetchProductStock(page);
  };

  const handleAdjustStock = (stock) => {
    setSelectedStock(stock);
    setAdjustingStockId(stock.id);
    setShowAdjustForm(true);
    setFormData({
      adjustment_type: 'increase',
      quantity: '',
      reason: '',
      notes: ''
    });
  };

  const handleCancelAdjustment = () => {
    setShowAdjustForm(false);
    setAdjustingStockId(null);
    setSelectedStock(null);
    setFormData({
      adjustment_type: 'increase',
      quantity: '',
      reason: '',
      notes: ''
    });
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

      setShowAdjustForm(false);
      setAdjustingStockId(null);
      setSelectedStock(null);
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

  const handleCreateStock = async (e) => { // eslint-disable-line no-unused-vars
    e.preventDefault();
    try {
      const stockData = {
        product_id: parseInt(createFormData.product_id),
        warehouse_id: parseInt(createFormData.warehouse_id),
        quantity: parseInt(createFormData.quantity),
        reserved_quantity: parseInt(createFormData.reserved_quantity),
      };

      await api.post('/product-stock', stockData);

      // Refresh data to get latest stock information
      await refreshData();

      setShowCreateForm(false);
      setCreateFormData({
        product_id: '',
        product_search: '',
        warehouse_id: '',
        quantity: '',
        reserved_quantity: '0',
        min_stock_level: '50'
      });

      alert('Initial stock created successfully!');
    } catch (error) {
      console.error('Error creating stock:', error);
      setError('Failed to create stock record');
    }
  };

  // Auto-suggest functions
  const handleProductSearch = (searchTerm) => {
    setCreateFormData({...createFormData, product_search: searchTerm});
    setSelectedSuggestionIndex(0);

    if (!searchTerm) {
      setFilteredProducts([]);
      return;
    }

    const filtered = products.filter(product => {
      const matchesSearch = product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // Filter by warehouse if selected
      if (createFormData.warehouse_id !== '') {
        return !productStock.some(stock =>
          stock.product_id === product.id &&
          stock.warehouse_id === parseInt(createFormData.warehouse_id)
        );
      }

      return true;
    });

    setFilteredProducts(filtered);
    setShowProductSuggestions(true);
  };

  const selectProduct = (product) => {
    setCreateFormData({
      ...createFormData,
      product_id: product.id,
      product_search: `${product.sku} - ${product.description || product.name}`
    });
    setShowProductSuggestions(false);
    setFilteredProducts([]);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showProductSuggestions || filteredProducts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredProducts[selectedSuggestionIndex]) {
          selectProduct(filteredProducts[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowProductSuggestions(false);
        break;
    }
  };

  const getStockStatus = (stock) => {
    const available = stock.quantity - stock.reserved_quantity;
    const minStock = stock.min_stock_level || 0;

    if (available <= 0) return { variant: 'danger', text: 'Out of Stock' };
    if (available <= minStock) return { variant: 'warning', text: 'Low Stock' };
    return { variant: 'success', text: 'In Stock' };
  };

  
  // Backend already handles filtering, but we still need client-side filtering as a fallback
  const filteredStock = productStock.filter(stock => {
    // Backend does primary filtering, this is just for display safety
    return true; // All data is already filtered by backend
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
        {(['Super Admin', 'Admin'].includes(user?.role?.name)) && (
          <Button
            variant="success"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="me-2"
          >
            <i className={`bi bi-${showCreateForm ? 'x-circle' : 'plus-circle'} me-2`}></i>
            {showCreateForm ? 'Cancel' : 'Create Stock'}
          </Button>
        )}
        <Button variant="outline-primary" onClick={refreshData}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Create Stock Form */}
      {showCreateForm && (['Super Admin', 'Admin'].includes(user?.role?.name)) && (
        <Card className="mb-4 border-success">
          <Card.Header className="bg-success text-white">
            <i className="bi bi-plus-circle me-2"></i>
            Create New Stock Record
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleCreateStock}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3 position-relative">
                    <Form.Label>Product *</Form.Label>
                    <div className="product-suggest-wrapper">
                      <Form.Control
                        type="text"
                        placeholder="Ketik part number untuk auto-suggest..."
                        value={createFormData.product_search || ''}
                        onChange={(e) => handleProductSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowProductSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
                        required
                        className="product-search-input"
                        autoComplete="off"
                      />
                      {showProductSuggestions && (
                        <div className="product-suggestions-dropdown">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product, index) => (
                              <div
                                key={product.id}
                                className={`suggestion-item ${index === selectedSuggestionIndex ? 'active' : ''}`}
                                onClick={() => selectProduct(product)}
                                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                              >
                                <div className="suggestion-sku">{product.sku}</div>
                                <div className="suggestion-name">{product.description || product.name}</div>
                              </div>
                            ))
                          ) : (
                            <div className="suggestion-item no-results">
                              <div className="text-muted">No products found</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Form.Text className="text-muted">
                      {showProductSuggestions && filteredProducts.length > 0 &&
                        `Ditemukan ${filteredProducts.length} produk. Gunakan arrow keys untuk navigasi, Enter untuk memilih.`}
                      {createFormData.product_search && filteredProducts.length === 0 &&
                        'Tidak ada produk yang ditemukan. Coba kata kunci lain.'}
                      {!createFormData.product_search && !showProductSuggestions &&
                        'Ketik SKU atau nama produk untuk mencari...'}
                      {createFormData.product_id && !showProductSuggestions &&
                        `✓ Terpilih: ${products.find(p => p.id === createFormData.product_id)?.sku || ''} - ${products.find(p => p.id === createFormData.product_id)?.name || ''}`}
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Warehouse *</Form.Label>
                    <select
                      className="form-select scrollable-dropdown"
                      value={createFormData.warehouse_id}
                      onChange={(e) => setCreateFormData({...createFormData, warehouse_id: e.target.value})}
                      required
                      style={{
                        height: '40px',
                        overflowY: 'auto',
                        resize: 'vertical'
                      }}
                    >
                      <option value="">Select a warehouse</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.code} - {warehouse.name}
                        </option>
                      ))}
                    </select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Initial Quantity *</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={createFormData.quantity}
                      onChange={(e) => setCreateFormData({...createFormData, quantity: e.target.value})}
                      placeholder="Enter initial quantity"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Reserved Quantity</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={createFormData.reserved_quantity}
                      onChange={(e) => setCreateFormData({...createFormData, reserved_quantity: e.target.value})}
                      placeholder="Enter reserved quantity"
                    />
                    <Form.Text className="text-muted">
                      Quantity already allocated for orders
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              {createFormData.product_id && createFormData.warehouse_id && (
                <Alert variant="success">
                  <h6 className="mb-2">Stock Preview</h6>
                  <div className="row">
                    <div className="col-6">
                      <strong>Product:</strong> {products.find(p => p.id === parseInt(createFormData.product_id))?.description || products.find(p => p.id === parseInt(createFormData.product_id))?.name || 'N/A'}
                    </div>
                    <div className="col-6">
                      <strong>SKU:</strong> {products.find(p => p.id === parseInt(createFormData.product_id))?.sku || 'N/A'}
                    </div>
                    <div className="col-6">
                      <strong>Warehouse:</strong> {warehouses.find(w => w.id === parseInt(createFormData.warehouse_id))?.name || 'N/A'}
                    </div>
                    <div className="col-6">
                      <strong>Available:</strong> {parseInt(createFormData.quantity || 0) - parseInt(createFormData.reserved_quantity || 0)} units
                    </div>
                  </div>
                </Alert>
              )}

              <div className="d-flex gap-2">
                <Button variant="secondary" onClick={() => setShowCreateForm(false)}>
                  <i className="bi bi-x-circle me-2"></i>
                  Cancel
                </Button>
                <Button variant="success" type="submit">
                  <i className="bi bi-check-circle me-2"></i>
                  Create Stock Record
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <InputGroup>
                <Form.Control
                  placeholder="Search by product description, SKU, or warehouse..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
              </InputGroup>
            </Col>
            {(['Super Admin', 'Admin', 'Sales Team'].includes(user?.role?.name)) && (
              <>
                <Col md={4}>
                  <Form.Select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    size="3"
                    className="scrollable-dropdown"
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
              </>
            )}
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
                  {user?.role?.name === 'Super Admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role?.name === 'Super Admin' ? 9 : 8} className="text-center py-5">
                      {searchTerm || selectedWarehouse ? (
                        <>
                          <i className="bi bi-search fs-1 text-muted mb-3"></i>
                          <h5 className="text-muted">No stock data found</h5>
                          <p className="text-muted">Try adjusting your search criteria</p>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-inbox fs-1 text-muted mb-3"></i>
                          <h5 className="text-muted">No stock records found</h5>
                          <p className="text-muted">No stock records available in the system</p>
                          {(['Super Admin', 'Admin'].includes(user?.role?.name)) && (
                            <Button
                              variant="success"
                              onClick={() => setShowCreateForm(true)}
                              className="mt-2"
                            >
                              <i className="bi bi-plus-circle me-2"></i>
                              Create First Stock Record
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredStock.map(stock => {
                    const available = stock.quantity - stock.reserved_quantity;
                    const status = getStockStatus(stock);
                    const isAdjusting = showAdjustForm && adjustingStockId === stock.id;

                    return (
                      <React.Fragment key={stock.id}>
                        <tr>
                          <td>
                            <code className="text-secondary">{stock.product?.sku || 'N/A'}</code>
                          </td>
                          <td>
                            <div>
                              <strong>{stock.product?.description || stock.product?.name || 'N/A'}</strong>
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
                          {user?.role?.name === 'Super Admin' && (
                            <td>
                              <div className="btn-group" role="group">
                                <Button
                                  variant={isAdjusting ? "secondary" : "outline-primary"}
                                  size="sm"
                                  onClick={() => isAdjusting ? handleCancelAdjustment() : handleAdjustStock(stock)}
                                >
                                  <i className={`bi bi-${isAdjusting ? 'x' : 'pencil'}`}></i>
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
                          )}
                        </tr>
                        {isAdjusting && (
                          <tr>
                            <td colSpan={user?.role?.name === 'Super Admin' ? 9 : 8} className="p-0">
                              <div className="adjust-stock-form-container p-4 bg-light">
                                <Card className="border-primary">
                                  <Card.Header className="bg-primary text-white">
                                    <i className="bi bi-pencil-square me-2"></i>
                                    Adjust Stock - {stock.product?.sku}
                                  </Card.Header>
                                  <Card.Body>
                                    <Form onSubmit={handleSubmitAdjustment}>
                                      <Alert variant="info">
                                        <div className="row">
                                          <div className="col-md-3">
                                            <strong>Product:</strong> {selectedStock.product?.description || selectedStock.product?.name}
                                          </div>
                                          <div className="col-md-3">
                                            <strong>Current Stock:</strong> {selectedStock.quantity}
                                          </div>
                                          <div className="col-md-3">
                                            <strong>Warehouse:</strong> {selectedStock.warehouse?.name}
                                          </div>
                                          <div className="col-md-3">
                                            <strong>Available:</strong> {selectedStock.quantity - selectedStock.reserved_quantity}
                                          </div>
                                        </div>
                                      </Alert>

                                      <Row>
                                        <Col md={3}>
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
                                        </Col>
                                        <Col md={3}>
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
                                        </Col>
                                        <Col md={3}>
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
                                        </Col>
                                        <Col md={3}>
                                          <Form.Group className="mb-3">
                                            <Form.Label>Resulting Stock</Form.Label>
                                            <div className="form-control bg-light">
                                              {formData.adjustment_type === 'increase'
                                                ? parseInt(selectedStock.quantity || 0) + parseInt(formData.quantity || 0)
                                                : parseInt(selectedStock.quantity || 0) - parseInt(formData.quantity || 0)
                                              } units
                                            </div>
                                          </Form.Group>
                                        </Col>
                                      </Row>

                                      <Row>
                                        <Col md={12}>
                                          <Form.Group className="mb-3">
                                            <Form.Label>Notes</Form.Label>
                                            <Form.Control
                                              as="textarea"
                                              rows={2}
                                              value={formData.notes}
                                              onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                              placeholder="Additional notes about this adjustment..."
                                            />
                                          </Form.Group>
                                        </Col>
                                      </Row>

                                      {formData.adjustment_type === 'decrease' && (
                                        <Alert variant="warning">
                                          <i className="bi bi-exclamation-triangle me-2"></i>
                                          <strong>Warning:</strong> This will reduce the stock quantity from {selectedStock.quantity} to {parseInt(selectedStock.quantity || 0) - parseInt(formData.quantity || 0)} units.
                                        </Alert>
                                      )}

                                      <div className="d-flex gap-2">
                                        <Button variant="secondary" onClick={handleCancelAdjustment}>
                                          <i className="bi bi-x-circle me-2"></i>
                                          Cancel
                                        </Button>
                                        <Button variant="primary" type="submit">
                                          <i className="bi bi-check-circle me-2"></i>
                                          Adjust Stock
                                        </Button>
                                      </div>
                                    </Form>
                                  </Card.Body>
                                </Card>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          {paginationInfo.total > 0 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <div className="text-muted">
                Showing {paginationInfo.from} to {paginationInfo.to} of {paginationInfo.total} entries
              </div>
              <div className="btn-group" role="group">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={paginationInfo.current_page === 1}
                >
                  <i className="bi bi-chevron-double-left"></i>
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handlePageChange(paginationInfo.current_page - 1)}
                  disabled={paginationInfo.current_page === 1}
                >
                  <i className="bi bi-chevron-left"></i>
                </Button>

                <span className="px-3 py-2 bg-light border">
                  Page {paginationInfo.current_page} of {paginationInfo.last_page}
                </span>

                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handlePageChange(paginationInfo.current_page + 1)}
                  disabled={paginationInfo.current_page === paginationInfo.last_page}
                >
                  <i className="bi bi-chevron-right"></i>
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handlePageChange(paginationInfo.last_page)}
                  disabled={paginationInfo.current_page === paginationInfo.last_page}
                >
                  <i className="bi bi-chevron-double-right"></i>
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ProductStock;