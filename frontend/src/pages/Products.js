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

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Mock data untuk saat ini
      setTimeout(() => {
        const mockProducts = [
          {
            id: 1,
            sku: 'PART-ENG-001',
            name: 'Filter Oli Engine',
            description: 'Filter oli untuk mesin heavy duty',
            category: 'Engine Parts',
            supplier: 'PT. Heavy Equipment Parts',
            buy_price: 250000,
            sell_price: 350000,
            min_stock_level: 10,
            current_stock: 25
          },
          {
            id: 2,
            sku: 'PART-ENG-002',
            name: 'Oil Seal 50x65x8',
            description: 'Oil seal ukuran 50x65x8',
            category: 'Engine Parts',
            supplier: 'PT. Heavy Equipment Parts',
            buy_price: 75000,
            sell_price: 120000,
            min_stock_level: 20,
            current_stock: 15
          },
          {
            id: 3,
            sku: 'PART-FIL-001',
            name: 'Filter Solar',
            description: 'Filter solar untuk alat berat',
            category: 'Filters',
            supplier: 'CV. Teknik Maju',
            buy_price: 180000,
            sell_price: 275000,
            min_stock_level: 15,
            current_stock: 30
          },
          {
            id: 4,
            sku: 'PART-HYD-001',
            name: 'Hydraulic Pump',
            description: 'Pompa hidrolik untuk excavator',
            category: 'Hydraulics',
            supplier: 'PT. Sumber Parts Indonesia',
            buy_price: 2500000,
            sell_price: 3250000,
            min_stock_level: 5,
            current_stock: 3
          },
          {
            id: 5,
            sku: 'PART-HYD-002',
            name: 'Hydraulic Hose 1/2"',
            description: 'Selang hidrolik diameter 1/2 inch',
            category: 'Hydraulics',
            supplier: 'CV. Teknik Maju',
            buy_price: 125000,
            sell_price: 185000,
            min_stock_level: 30,
            current_stock: 45
          },
          {
            id: 6,
            sku: 'PART-TRA-001',
            name: 'Clutch Plate',
            description: 'Kopling untuk transmisi',
            category: 'Transmission',
            supplier: 'PT. Heavy Equipment Parts',
            buy_price: 850000,
            sell_price: 1200000,
            min_stock_level: 8,
            current_stock: 12
          },
          {
            id: 7,
            sku: 'PART-ELE-001',
            name: 'Alternator 24V',
            description: 'Alternator 24 Volt untuk alat berat',
            category: 'Electrical',
            supplier: 'PT. Sumber Parts Indonesia',
            buy_price: 1500000,
            sell_price: 2100000,
            min_stock_level: 6,
            current_stock: 6
          },
          {
            id: 8,
            sku: 'PART-BRA-001',
            name: 'Brake Pad',
            description: 'Kampas rem untuk alat berat',
            category: 'Brakes',
            supplier: 'CV. Teknik Maju',
            buy_price: 320000,
            sell_price: 485000,
            min_stock_level: 12,
            current_stock: 10
          }
        ];
        setProducts(mockProducts);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        // Update product
        setProducts(products.map(p =>
          p.id === editingProduct.id
            ? { ...p, ...formData }
            : p
        ));
      } else {
        // Add new product
        const newProduct = {
          id: products.length + 1,
          ...formData,
          category: 'Category Name',
          supplier: 'Supplier Name',
          current_stock: 0
        };
        setProducts([...products, newProduct]);
      }
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description,
      category_id: '',
      supplier_id: '',
      buy_price: product.buy_price,
      sell_price: product.sell_price,
      min_stock_level: product.min_stock_level
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      setProducts(products.filter(p => p.id !== id));
    }
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
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>
          Tambah Produk
        </Button>
      </div>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="border-0 bg-primary text-white">
            <Card.Body className="text-center">
              <h3 className="mb-1">{products.length}</h3>
              <p className="mb-0">Total Produk</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 bg-warning text-dark">
            <Card.Body className="text-center">
              <h3 className="mb-1">{products.filter(p => p.current_stock <= p.min_stock_level).length}</h3>
              <p className="mb-0">Stok Menipis</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 bg-success text-white">
            <Card.Body className="text-center">
              <h3 className="mb-1">{products.filter(p => p.current_stock > p.min_stock_level).length}</h3>
              <p className="mb-0">Stok Normal</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="border-0 bg-info text-white">
            <Card.Body className="text-center">
              <h3 className="mb-1">
                Rp {products.reduce((sum, p) => sum + (p.sell_price * p.current_stock), 0).toLocaleString()}
              </h3>
              <p className="mb-0">Nilai Inventaris</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
                <i className="bi bi-funnel me-2"></i>
                Filter
              </Button>
              <Button variant="outline-secondary">
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
                  <th>SKU</th>
                  <th>Nama Produk</th>
                  <th>Kategori</th>
                  <th>Supplier</th>
                  <th>Harga Beli</th>
                  <th>Harga Jual</th>
                  <th>Stok</th>
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
                      <Badge bg="light" text="dark" className="text-capitalize">
                        {product.category}
                      </Badge>
                    </td>
                    <td>
                      <small>{product.supplier}</small>
                    </td>
                    <td>
                      <span className="text-muted">Rp </span>
                      {product.buy_price.toLocaleString()}
                    </td>
                    <td>
                      <span className="text-primary fw-semibold">Rp </span>
                      {product.sell_price.toLocaleString()}
                    </td>
                    <td>
                      <span className={`stock-badge ${product.current_stock <= product.min_stock_level ? 'low' : 'normal'}`}>
                        {product.current_stock}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${product.current_stock <= product.min_stock_level ? 'warning' : 'normal'}`}>
                        {product.current_stock <= product.min_stock_level ? 'Stok Menipis' : 'Normal'}
                      </span>
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

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => {
        setShowModal(false);
        resetForm();
      }} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-box me-2"></i>
            {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
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
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              <i className="bi bi-x-circle me-2"></i>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              <i className="bi bi-check-circle me-2"></i>
              {editingProduct ? 'Update' : 'Simpan'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;