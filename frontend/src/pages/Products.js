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
import './Products.css';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSuppliers();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/suppliers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  
  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform API data to match frontend structure
      const transformedProducts = data.data.map(product => ({
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
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      if (editingProduct) {
        // Update product
        const response = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedProduct = await response.json();

        // Refresh products from database to get latest data
        await fetchProducts();
      } else {
        // Add new product
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Refresh products from database to get latest data
        await fetchProducts();
      }

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
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Refresh products from database to get latest data
        await fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <Form.Label>SKU</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Masukkan SKU"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  required
                />
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
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="border-0 bg-primary text-white">
            <Card.Body className="text-center">
              <h4 className="mb-1">{products.length}</h4>
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
                {filteredProducts.map(product => (
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

          {filteredProducts.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-search fs-1 text-muted mb-3"></i>
              <h5 className="text-muted">Tidak ada produk ditemukan</h5>
              <p className="text-muted">Coba ubah kata kunci pencarian atau tambah produk baru</p>
            </div>
          )}
        </Card.Body>
      </Card>

      </div>
  );
};

export default Products;