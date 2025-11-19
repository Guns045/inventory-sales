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
  Alert,
  InputGroup,
  Badge,
  Pagination,
  Dropdown
} from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useAPI } from '../contexts/APIContext';

const MasterDataProducts = () => {
  const { user } = useAuth();
  const { api } = useAPI();

  // Debug: Log user info on component mount
  React.useEffect(() => {
    console.log('Current user:', user);
    console.log('User role:', user?.role?.name);
    console.log('User permissions:', user?.role?.permissions);

    // Check if user is logged in
    const token = localStorage.getItem('token');
    console.log('Token in localStorage:', !!token);
    console.log('Token starts with Bearer:', token?.startsWith('Bearer'));
  }, [user]);

  // State management
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    supplier: ''
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0
  });

  const [formData, setFormData] = useState({
    excel_file: null
  });

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchRawProducts();
    fetchStatistics();
  }, [searchTerm, filters, pagination.current_page]);

  const fetchStatistics = async () => {
    try {
      // Debug: Check if token exists
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      console.log('Token length:', token?.length);

      // Debug: Show full API URL
      const apiUrl = api.defaults.baseURL + '/settings/raw-products/statistics';
      console.log('Fetching from URL:', apiUrl);

      const response = await api.get('/settings/raw-products/statistics');
      console.log('Statistics response:', response.status, response.data);
      setStatistics(response.data.statistics);
      setCategories(response.data.categories);
      setSuppliers(response.data.suppliers);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);

      // Show more specific error message
      if (error.response?.status === 401) {
        setError('Please login to access this feature');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to access this feature');
      } else {
        setError('Failed to fetch statistics: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const fetchRawProducts = async () => {
    try {
      setLoading(true);

      // Debug: Check if token exists
      const token = localStorage.getItem('token');
      console.log('Token exists for fetchRawProducts:', !!token);

      const params = new URLSearchParams({
        page: pagination.current_page,
        per_page: pagination.per_page,
        search: searchTerm,
        ...filters
      });

      const url = `/settings/raw-products?${params}`;
      console.log('Fetching raw products from URL:', api.defaults.baseURL + url);

      const response = await api.get(url);
      console.log('Raw products response:', response.status);
      setRawProducts(response.data.data);
      setPagination(response.data.pagination);

    } catch (error) {
      console.error('Error fetching raw products:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      // Show more specific error message
      if (error.response?.status === 401) {
        setError('Please login to access this feature');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to access this feature');
      } else {
        setError('Failed to fetch raw products: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid Excel file (.xlsx, .xls, or .csv)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFormData({ excel_file: file });
    setSuccess('');
    setError('');
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.excel_file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const uploadFormData = new FormData();
      uploadFormData.append('excel_file', formData.excel_file);

      const response = await api.post('/settings/raw-products/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(`Successfully uploaded ${response.data.imported_count} products!`);
      setUploadPreview(response.data.preview || []);
      setShowPreviewModal(true);
      setShowUploadModal(false);
      setFormData({ excel_file: null });

      // Refresh data
      await fetchRawProducts();
      await fetchStatistics();

    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await api.delete(`/settings/raw-products/${id}`);
      await fetchRawProducts();
      await fetchStatistics();
      setSuccess('Product deleted successfully');

    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete product');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      setError('Please select products to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) {
      return;
    }

    try {
      await api.post('/settings/raw-products/bulk-delete', { ids: selectedProducts });
      setSelectedProducts([]);
      await fetchRawProducts();
      await fetchStatistics();
      setSuccess('Products deleted successfully');

    } catch (error) {
      console.error('Bulk delete error:', error);
      setError('Failed to delete products');
    }
  };

  const handleSelectProduct = (id) => {
    setSelectedProducts(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === rawProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(rawProducts.map(p => p.id));
    }
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current_page: page }));
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <div>
      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="mb-1 text-primary">{statistics.total || 0}</h3>
              <p className="mb-0 text-muted">Total Products</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="mb-1 text-warning">{statistics.unprocessed || 0}</h3>
              <p className="mb-0 text-muted">Raw Products</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="mb-1 text-success">{statistics.processed || 0}</h3>
              <p className="mb-0 text-muted">Processed</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h3 className="mb-1 text-info">{statistics.categories || 0}</h3>
              <p className="mb-0 text-muted">Categories</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={clearMessages}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={clearMessages}>
          {success}
        </Alert>
      )}

      {/* Action Bar */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <Button
                variant="primary"
                onClick={() => setShowUploadModal(true)}
                className="me-2"
              >
                <i className="bi bi-upload me-2"></i>
                Upload Excel
              </Button>

              {selectedProducts.length > 0 && (
                <Button
                  variant="danger"
                  onClick={handleBulkDelete}
                >
                  <i className="bi bi-trash me-2"></i>
                  Delete Selected ({selectedProducts.length})
                </Button>
              )}
            </Col>
            <Col md={6}>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button variant="outline-secondary">
                  <i className="bi bi-search"></i>
                </Button>
              </InputGroup>
            </Col>
          </Row>

          {/* Filters */}
          <Row className="mt-3">
            <Col md={4}>
              <Form.Select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All Status</option>
                <option value="raw">Raw</option>
                <option value="processed">Processed</option>
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select
                value={filters.supplier}
                onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value }))}
              >
                <option value="">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Products Table */}
      <Card className="border-0 shadow-sm">
        <Card.Header>
          <h5 className="mb-0">Master Data Products</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">Loading products...</p>
            </div>
          ) : rawProducts.length > 0 ? (
            <>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>
                      <Form.Check
                        checked={selectedProducts.length === rawProducts.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th>Buy Price</th>
                    <th>Sell Price</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rawProducts.map(product => (
                    <tr key={product.id}>
                      <td>
                        <Form.Check
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                        />
                      </td>
                      <td className="fw-semibold">{product.part_number}</td>
                      <td>{product.description}</td>
                      <td>
                        <Badge bg="light" text="dark">
                          {product.category || 'Uncategorized'}
                        </Badge>
                      </td>
                      <td>{product.supplier || '-'}</td>
                      <td>
                        {product.buy_price
                          ? `Rp ${Number(product.buy_price).toLocaleString('id-ID')}`
                          : '-'
                        }
                      </td>
                      <td>
                        {product.sell_price
                          ? `Rp ${Number(product.sell_price).toLocaleString('id-ID')}`
                          : '-'
                        }
                      </td>
                      <td>
                        {product.is_processed ? (
                          <Badge bg="success">Processed</Badge>
                        ) : (
                          <Badge bg="warning">Raw</Badge>
                        )}
                      </td>
                      <td>
                        <small className="text-muted">
                          {product.source_file ?
                            product.source_file.split('_').slice(1).join('_').substring(0, 20) + '...'
                            : '-'
                          }
                        </small>
                      </td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* Pagination */}
              {pagination.last_page > 1 && (
                <div className="d-flex justify-content-center mt-3">
                  <Pagination>
                    <Pagination.Prev
                      disabled={pagination.current_page === 1}
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                    />
                    {[...Array(pagination.last_page)].map((_, i) => (
                      <Pagination.Item
                        key={i + 1}
                        active={i + 1 === pagination.current_page}
                        onClick={() => handlePageChange(i + 1)}
                      >
                        {i + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next
                      disabled={pagination.current_page === pagination.last_page}
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                    />
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <i className="bi bi-inbox fs-1 text-muted"></i>
              <h5 className="mt-3">No products found</h5>
              <p className="text-muted">
                {searchTerm || filters.status || filters.category || filters.supplier
                  ? 'Try adjusting your filters or search terms.'
                  : 'Upload your first Excel file to get started.'
                }
              </p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-upload me-2"></i>
            Upload Master Data Products
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUploadSubmit}>
          <Modal.Body>
            <Alert variant="info">
              <Alert.Heading>Excel Format Requirements</Alert.Heading>
              <p>Your Excel file should contain the following columns:</p>
              <ul>
                <li><strong>part_number</strong> (Required) - Product part number or SKU</li>
                <li><strong>description</strong> (Required) - Product description</li>
                <li><strong>category</strong> (Optional) - Product category</li>
                <li><strong>supplier</strong> (Optional) - Supplier name</li>
                <li><strong>buy_price</strong> (Optional) - Purchase price</li>
                <li><strong>sell_price</strong> (Optional) - Selling price</li>
              </ul>
              <hr />
              <p className="mb-0">
                <strong>Note:</strong> Column names should match exactly. Case-insensitive.
              </p>
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>Select Excel File</Form.Label>
              <Form.Control
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                required
              />
              <Form.Text className="text-muted">
                Supported formats: .xlsx, .xls, .csv (Max 10MB)
              </Form.Text>
            </Form.Group>

            {formData.excel_file && (
              <Alert variant="success">
                <i className="bi bi-file-earmark-excel me-2"></i>
                Selected file: {formData.excel_file.name}
                <br />
                <small>Size: {(formData.excel_file.size / 1024 / 1024).toFixed(2)} MB</small>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowUploadModal(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={uploading || !formData.excel_file}
            >
              {uploading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" />
                  <span className="ms-2">Uploading...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-upload me-2"></i>
                  Upload File
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-check-circle me-2 text-success"></i>
            Upload Successful - Preview
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="success">
            <i className="bi bi-check-circle me-2"></i>
            Your Excel file has been successfully uploaded and processed!
          </Alert>

          {uploadPreview.length > 0 && (
            <>
              <h6>First 5 rows uploaded:</h6>
              <Table responsive striped>
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th>Buy Price</th>
                    <th>Sell Price</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadPreview.map((product, index) => (
                    <tr key={index}>
                      <td className="fw-semibold">{product.part_number}</td>
                      <td>{product.description}</td>
                      <td>{product.category || '-'}</td>
                      <td>{product.supplier || '-'}</td>
                      <td>
                        {product.buy_price
                          ? `Rp ${Number(product.buy_price).toLocaleString('id-ID')}`
                          : '-'
                        }
                      </td>
                      <td>
                        {product.sell_price
                          ? `Rp ${Number(product.sell_price).toLocaleString('id-ID')}`
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => {
              setShowPreviewModal(false);
              setUploadPreview([]);
            }}
          >
            Done
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MasterDataProducts;