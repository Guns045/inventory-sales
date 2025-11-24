import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Form,
  Table,
  Modal,
  Spinner,
  InputGroup,
  Badge
} from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import './Products.css';

// Add custom styles for suggestions
const style = document.createElement('style');
style.textContent = `
  .suggestion-item:hover {
    background-color: #f8f9fa !important;
  }
  .suggestion-item:last-child {
    border-bottom: none !important;
  }
`;
document.head.appendChild(style);

const Products = () => {
  const { api } = useAPI();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState('');

  // Pagination states
  const [paginationInfo, setPaginationInfo] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0
  });
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    supplier_id: '',
    buy_price: '',
    sell_price: '',
    min_stock_level: ''
  });

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Auto-suggestion states
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [suggestionTimeout, setSuggestionTimeout] = useState(null);

  useEffect(() => {
    console.log('Products component mounted - starting data fetch...');
    const loadData = async () => {
      await fetchProducts(1);
      await fetchCategories();
      await fetchSuppliers();
      console.log('All data fetch completed');
    };
    loadData();
  }, []);

  // Refetch data when search term changes
  useEffect(() => {
    fetchProducts(1); // Reset to first page when searching
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (page) => {
    fetchProducts(page);
  };

  const fetchCategories = async () => {
    try {
      console.log('Fetching categories...');
      const response = await api.get('/categories');
      console.log('Categories response:', response.data);
      setCategories(response.data);
      console.log('Categories set:', response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to fetch categories');
    }
  };

  const fetchSuppliers = async () => {
    try {
      console.log('Fetching suppliers...');
      const response = await api.get('/suppliers');
      console.log('Suppliers response:', response.data);
      setSuppliers(response.data);
      console.log('Suppliers set:', response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setError('Failed to fetch suppliers');
    }
  };

  // Auto-suggestion functions
  const searchRawProducts = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSearching(true);

      // Clear existing timeout
      if (suggestionTimeout) {
        clearTimeout(suggestionTimeout);
      }

      // Set new timeout for debouncing
      const timeoutId = setTimeout(async () => {
        const response = await api.get(`/settings/raw-products/search?q=${encodeURIComponent(query)}&limit=10`);
        setSuggestions(response.data.data || []);
        setShowSuggestions(true);
        setSearching(false);
      }, 300);

      setSuggestionTimeout(timeoutId);

    } catch (error) {
      console.error('Error searching raw products:', error);
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
    }
  };

  const handleSkuChange = (value) => {
    setFormData(prev => ({ ...prev, sku: value }));
    searchRawProducts(value);
  };

  const selectSuggestion = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      sku: suggestion.part_number,
      name: suggestion.part_number,
      description: suggestion.description
    }));
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSkuKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // Navigate down (implementation would require tracking selected index)
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Navigate up (implementation would require tracking selected index)
        break;
      case 'Enter':
        e.preventDefault();
        // Select first suggestion
        if (suggestions.length > 0) {
          selectSuggestion(suggestions[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSuggestions([]);
        break;
    }
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('.suggestion-container')) {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      if (suggestionTimeout) {
        clearTimeout(suggestionTimeout);
      }
    };
  }, [suggestionTimeout]);

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);

      // Add pagination parameters
      const params = new URLSearchParams({
        page: page,
        per_page: 20
      });

      // Add search parameter if exists
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`/products?${params}`);

      // Transform API data to match frontend structure
      const transformedProducts = response.data.data.map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        category: product.category?.name || 'Uncategorized',
        supplier: product.supplier?.name || 'Unknown Supplier',
        category_id: product.category_id,
        supplier_id: product.supplier_id,
        buy_price: product.buy_price,
        sell_price: product.sell_price,
        min_stock_level: product.min_stock_level,
        current_stock: product.current_stock || 0,
        total_stock: product.total_stock || 0,
        reserved_stock: product.reserved_stock || 0
      }));

      setProducts(transformedProducts);
      setPaginationInfo({
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
        per_page: response.data.per_page || 20,
        total: response.data.total || 0,
        from: response.data.from || 0,
        to: response.data.to || 0
      });
      setCurrentPage(page);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        // Update product
        await api.put(`/products/${editingProduct.id}`, formData);
      } else {
        // Add new product
        await api.post('/products', formData);
      }

      // Refresh products from database to get latest data
      await fetchProducts(1);
      setShowForm(false);
      resetForm();
      setError(''); // Clear error on success
    } catch (error) {
      console.error('Error saving product:', error);
      setError('Failed to save product. Please try again.');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description,
      category_id: product.category_id || '',
      supplier_id: product.supplier_id || '',
      buy_price: product.buy_price,
      sell_price: product.sell_price,
      min_stock_level: product.min_stock_level
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      try {
        await api.delete(`/products/${id}`);
        // Refresh products from database to get latest data
        await fetchProducts(1);
      } catch (error) {
        console.error('Error deleting product:', error);
        setError('Failed to delete product');
      }
    }
  };

  const openForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      category_id: '',
      supplier_id: '',
      buy_price: '',
      sell_price: '',
      min_stock_level: ''
    });
    setEditingProduct(null);
    setError('');
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      category_id: '',
      supplier_id: '',
      buy_price: '',
      sell_price: '',
      min_stock_level: ''
    });
    setEditingProduct(null);
  };

  // Backend now handles filtering and pagination, no client-side filtering needed
  const displayProducts = products;

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
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Manajemen Produk</h2>
          <p className="text-muted mb-0">Kelola data produk dan inventaris</p>
        </div>
        <Button variant="primary" onClick={openForm}>
          <i className="bi bi-plus-circle me-2"></i>
          Add Product
        </Button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="mb-4">
          <Card.Header className="bg-primary text-white">
            <h5 className="mb-0">
              <i className="bi bi-box me-2"></i>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h5>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Label>Part Number / SKU</Form.Label>
                <div className="suggestion-container position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Ketik part number untuk auto-suggest..."
                    value={formData.sku}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    onKeyDown={handleSkuKeyDown}
                    required
                  />
                  {searching && (
                    <div className="position-absolute" style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                      <Spinner animation="border" size="sm" />
                    </div>
                  )}

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      className="position-absolute w-100 bg-white border border-top-0 rounded-bottom shadow-sm"
                      style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}
                    >
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={suggestion.id}
                          className="px-3 py-2 suggestion-item border-bottom"
                          style={{ cursor: 'pointer' }}
                          onClick={() => selectSuggestion(suggestion)}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <div className="fw-semibold">{suggestion.part_number}</div>
                          <div className="small text-muted">{suggestion.description}</div>
                          {suggestion.category && (
                            <Badge variant="light" size="sm" className="mt-1">
                              {suggestion.category}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Form.Text className="text-muted">
                  Ketik minimal 2 karakter untuk menampilkan suggestions dari master data
                </Form.Text>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>Nama Produk</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Masukkan nama produk"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Deskripsi</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Masukkan deskripsi produk"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </Form.Group>

            <Row>
              <Col md={6} className="mb-3">
                <Form.Label>Kategori</Form.Label>
                <Form.Select
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>Supplier</Form.Label>
                <Form.Select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                  required
                >
                  <option value="">Pilih Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            </Row>

            <Row>
              <Col md={4} className="mb-3">
                <Form.Label>Harga Beli</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="0"
                  value={formData.buy_price}
                  onChange={(e) => setFormData({...formData, buy_price: e.target.value})}
                  required
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Harga Jual</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="0"
                  value={formData.sell_price}
                  onChange={(e) => setFormData({...formData, sell_price: e.target.value})}
                  required
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Stok Minimum</Form.Label>
                <Form.Control
                  type="number"
                  placeholder="0"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})}
                  required
                />
              </Col>
            </Row>
                      <div className="form-actions mt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                    setError('');
                  }}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="ms-2">
                  <i className="bi bi-check-circle me-2"></i>
                  {editingProduct ? 'Update' : 'Create'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Row className="flex-grow-1 stats-cards-container">
          <Col md={3} className="mb-3">
            <Card className="border-0 bg-primary text-white">
              <Card.Body className="text-center">
                <h4 className="mb-1">{paginationInfo.total}</h4>
                <p className="mb-0 small">Total Produk</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="border-0 bg-success text-white">
              <Card.Body className="text-center">
                <h4 className="mb-1">{products.reduce((sum, p) => sum + p.current_stock, 0)}</h4>
                <p className="mb-0 small">Total Stok Tersedia</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="border-0 bg-warning text-dark">
              <Card.Body className="text-center">
                <h4 className="mb-1">{products.reduce((sum, p) => sum + p.reserved_stock, 0)}</h4>
                <p className="mb-0 small">Total Stok Di-reserve</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="border-0 bg-info text-white">
              <Card.Body className="text-center">
                <h4 className="mb-1">{products.reduce((sum, p) => sum + p.total_stock, 0)}</h4>
                <p className="mb-0 small">Total Semua Stok</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Total Nilai Inventaris */}
      <div className="text-end mb-4">
        <span className="text-muted me-2">Total Nilai Inventaris:</span>
        <span className="fw-bold text-primary">
          Rp {new Intl.NumberFormat('id-ID').format(products.reduce((sum, p) => sum + (p.total_stock * p.sell_price), 0))}
        </span>
      </div>

      {/* Search and Filters */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <InputGroup>
                <Form.Control
                  placeholder="Cari produk berdasarkan nama, SKU, atau kategori..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
              </InputGroup>
            </Col>
            <Col md={6} className="text-md-end mt-3 mt-md-0">
              <Button variant="outline-secondary" className="me-2">
                <i className="bi bi-download me-2"></i>
                Export
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Products Table */}
      <Card className="table-container">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Description</th>
                  <th>Stok Tersedia</th>
                  <th>Total Stok</th>
                  <th>Stok Di-reserve</th>
                  <th>Kategori</th>
                  <th>Supplier</th>
                  <th>Harga Beli</th>
                  <th>Harga Jual</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {displayProducts.map(product => (
                  <tr key={product.id}>
                    <td>
                      <code className="text-secondary">{product.sku}</code>
                    </td>
                    <td>
                      <div>
                        <strong>{product.name}</strong>
                        <br />
                        <small className="text-muted">{product.description}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`fw-semibold ${product.current_stock <= product.min_stock_level ? 'text-danger' : 'text-success'}`}>
                        {product.current_stock}
                      </span>
                    </td>
                    <td>
                      <span className="text-muted">{product.total_stock}</span>
                    </td>
                    <td>
                      <span className="text-warning">{product.reserved_stock}</span>
                    </td>
                    <td>
                      <Badge bg="light" text="dark" className="text-capitalize">
                        {product.category}
                      </Badge>
                    </td>
                    <td>
                      <small>{product.supplier}</small>
                    </td>
                    <td>
                      <span className="text-muted">Rp {new Intl.NumberFormat('id-ID').format(product.buy_price)}</span>
                    </td>
                    <td>
                      <span className="text-primary fw-semibold">Rp {new Intl.NumberFormat('id-ID').format(product.sell_price)}</span>
                    </td>
                    <td>
                      <Badge bg={product.current_stock > 0 ? "success" : "danger"} className="text-capitalize">
                        {product.current_stock > 0 ? "Available" : "Out of Stock"}
                      </Badge>
                    </td>
                    <td>
                      <div className="btn-group" role="group">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {displayProducts.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-search fs-1 text-muted mb-3"></i>
              <h5 className="text-muted">Tidak ada produk ditemukan</h5>
              <p className="text-muted">Coba ubah kata kunci pencarian atau tambah produk baru</p>
            </div>
          )}

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

      </div>
  );
};

export default Products;