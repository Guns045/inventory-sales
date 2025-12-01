import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert, ProgressBar, Modal, Form } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const DashboardSales = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [salesData, setSalesData] = useState({
    performance: {
      monthly_target: 0,
      monthly_achieved: 0,
      achievement_percentage: 0,
      ytd_total: 0,
    },
    notifications: [],
    activities: [],
    quotations: {
      draft: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    },
    sales_orders: [],
    loading: true,
    error: null
  });

  // Quotation Modal State (matching Quotations.js structure)
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationForm, setQuotationForm] = useState({
    customer_id: '',
    status: 'DRAFT',
    valid_until: '',
    items: []
  });

  // Edit Quotation Modal State
  const [showEditQuotationModal, setShowEditQuotationModal] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [items, setItems] = useState([]);

  // New Item state for adding items (matching Quotations.js)
  const [newItem, setNewItem] = useState({
    product_id: '',
    quantity: 1,
    unit_price: 0,
    discount_percentage: 0,
    tax_rate: 0
  });

  // Sales Order Detail Modal State
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [orderDetailItems, setOrderDetailItems] = useState([]);


  useEffect(() => {
    fetchSalesData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchSalesData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSalesData = async () => {
    try {
      const [performanceResponse, quotationsResponse, ordersResponse] = await Promise.all([
        api.get('/dashboard/sales'),
        api.get('/quotations'),
        api.get('/sales-orders')
      ]);

      // Process API responses
      const salesData = performanceResponse.data || {};
      const quotationsData = quotationsResponse.data?.data || quotationsResponse.data || [];
      const ordersData = ordersResponse.data?.data || ordersResponse.data || [];

      // Calculate performance metrics from quotations data if not provided by API
      const monthlyTarget = salesData.monthly_target || 50000000; // Default target 50jt

      // Calculate quotations statistics
      const quotationsStats = quotationsData.reduce((stats, q) => {
        stats.total++;
        if (q.status === 'DRAFT') stats.draft++;
        else if (q.status === 'SUBMITTED') stats.pending++;
        else if (q.status === 'APPROVED') stats.approved++;
        else if (q.status === 'REJECTED') stats.rejected++;
        return stats;
      }, { draft: 0, pending: 0, approved: 0, rejected: 0, total: 0 });

      // Calculate YTD total from approved quotations
      const ytdTotal = quotationsData
        .filter(q => q.status === 'APPROVED')
        .reduce((total, q) => total + (q.total_amount || 0), 0);

      // Calculate achievement percentage
      const achievementPercentage = monthlyTarget > 0 ? Math.round((ytdTotal / monthlyTarget) * 100) : 0;

      setSalesData({
        performance: {
          monthly_target: monthlyTarget,
          monthly_achieved: ytdTotal,
          achievement_percentage: achievementPercentage,
          ytd_total: ytdTotal,
        },
        quotations: quotationsStats,
        sales_orders: ordersData.slice(0, 5), // Show latest 5 sales orders
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setSalesData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Quotation Modal Functions (matching Quotations.js structure)
  const handleShowQuotationModal = async () => {
    try {
      setLoadingModal(true);
      setErrorModal('');

      // Fetch customers and products for dropdown
      const [customersResponse, productsResponse] = await Promise.all([
        api.get('/customers'),
        api.get('/products')
      ]);

      setCustomers(customersResponse.data?.data || customersResponse.data || []);
      setProducts(productsResponse.data?.data || productsResponse.data || []);

      // Reset form to match Quotations.js structure
      setQuotationForm({
        customer_id: '',
        status: 'DRAFT',
        valid_until: '',
        items: []
      });
      setItems([]);

      setShowQuotationModal(true);
    } catch (error) {
      console.error('Error loading modal data:', error);
      setErrorModal('Gagal memuat data. Silakan coba lagi.');
    } finally {
      setLoadingModal(false);
    }
  };

  const handleCloseQuotationModal = () => {
    setShowQuotationModal(false);
    setErrorModal('');
    setQuotationForm({
      customer_id: '',
      status: 'DRAFT',
      valid_until: '',
      items: []
    });
    setItems([]);
    setNewItem({
      product_id: '',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 0
    });
  };

  const handleQuotationSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoadingModal(true);
      setErrorModal('');

      // Validate items before submission (matching Quotations.js)
      if (items.length === 0) {
        setErrorModal('Quotation must have at least one item');
        return;
      }

      // Validate items data (matching Quotations.js)
      const invalidItem = items.find(item =>
        !item.product_id || !item.quantity || !item.unit_price ||
        item.quantity <= 0 || item.unit_price <= 0
      );

      if (invalidItem) {
        setErrorModal('Please ensure all items have valid product, quantity, and price information');
        return;
      }

      // Validate required fields
      if (!quotationForm.customer_id || !quotationForm.valid_until) {
        setErrorModal('Silakan lengkapi semua field yang wajib diisi.');
        return;
      }

      const quotationData = {
        customer_id: quotationForm.customer_id,
        status: quotationForm.status,
        valid_until: quotationForm.valid_until,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
          tax_rate: item.tax_rate || 0
        }))
      };

      const response = await api.post('/quotations', quotationData);

      console.log('Quotation created:', response.data);

      // Show success message
      alert('Penawaran berhasil dibuat!');

      // Close modal and refresh data
      handleCloseQuotationModal();
      fetchSalesData();

    } catch (error) {
      console.error('Error creating quotation:', error);
      let errorMessage = 'Failed to create quotation';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle Laravel validation errors
        const validationErrors = Object.values(error.response.data.errors).flat();
        errorMessage = validationErrors.join(', ');
      }
      setErrorModal(errorMessage);
    } finally {
      setLoadingModal(false);
    }
  };

  const handleQuotationChange = (e) => {
    const { name, value } = e.target;
    setQuotationForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Item management functions (matching Quotations.js)
  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addItem = () => {
    if (!newItem.product_id || newItem.quantity <= 0) return;

    const product = products.find(p => p.id === parseInt(newItem.product_id, 10));
    if (!product) return;

    const itemTotal = newItem.quantity * product.sell_price;
    const discountAmount = itemTotal * (newItem.discount_percentage / 100);
    const taxAmount = (itemTotal - discountAmount) * (newItem.tax_rate / 100);
    const total = itemTotal - discountAmount + taxAmount;

    const item = {
      id: Date.now(), // Use timestamp for unique ID
      product_id: parseInt(newItem.product_id, 10),
      product_name: product.name,
      quantity: newItem.quantity,
      unit_price: product.sell_price,
      discount_percentage: newItem.discount_percentage,
      tax_rate: newItem.tax_rate,
      total_price: total
    };

    setItems(prev => [...prev, item]);

    // Reset form
    setNewItem({
      product_id: '',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 0
    });
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const getAchievementColor = (percentage) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'warning';
    return 'danger';
  };

  const handlePrintQuotationFromSalesOrder = async (salesOrder) => {
    try {
      // Check if sales order has quotation_id
      if (!salesOrder.quotation_id) {
        alert('Sales Order ini tidak terkait dengan quotation.');
        return;
      }

      // Generate PDF for quotation using quotation_id from sales order
      const response = await fetch(`/preview/quotation-db/${salesOrder.quotation_id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Quotation-${salesOrder.quotation?.quotation_number || salesOrder.quotation_id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to generate quotation PDF');
      }
    } catch (error) {
      console.error('Error printing quotation from sales order:', error);
      alert('Gagal mencetak quotation. Silakan coba lagi.');
    }
  };

  const handleViewSalesOrderDetail = async (order) => {
    try {
      // Fetch sales order details with items
      const response = await api.get(`/sales-orders/${order.id}`);
      if (response.data) {
        setSelectedOrderDetail(response.data);
        // Fetch items for this order
        const itemsResponse = await api.get(`/sales-orders/${order.id}/items`);
        const items = itemsResponse.data?.data || itemsResponse.data || [];
        setOrderDetailItems(items);
        setShowOrderDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching sales order details:', error);
      alert('Gagal memuat detail sales order.');
    }
  };

  const handleCloseOrderDetailModal = () => {
    setShowOrderDetailModal(false);
    setSelectedOrderDetail(null);
    setOrderDetailItems([]);
  };


  // Allow Super Admin, Admin and Sales Team roles to access this dashboard
  if (!['Super Admin', 'Admin', 'Sales Team', 'Sales'].includes(user?.role?.name)) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have permission to access this dashboard.</p>
        </Alert>
      </div>
    );
  }

  if (salesData.loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Memuat data dashboard sales...</p>
        </div>
      </div>
    );
  }

  if (salesData.error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Dashboard</Alert.Heading>
        <p>{salesData.error}</p>
      </Alert>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Dashboard Sales</h2>
          <p className="text-muted mb-0">Selamat datang, {user?.name || 'Sales'} - Ringkasan Kinerja Penjualan</p>
        </div>
        <div>
          <Button variant="primary" onClick={handleShowQuotationModal}>
            <i className="bi bi-plus-circle me-1"></i>
            Buat Penawaran Baru
          </Button>
        </div>
      </div>

      {/* Performance Cards */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Target Bulanan</h6>
                <h3 className="mb-0">{formatCurrency(salesData.performance.monthly_target)}</h3>
                <small className="text-muted">Oktober 2025</small>
              </div>
              <div className="ms-3">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-bullseye text-primary fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Tercapai</h6>
                <h3 className="mb-0 text-success">{formatCurrency(salesData.performance.monthly_achieved)}</h3>
                <small className="text-success">
                  {salesData.performance.achievement_percentage}% dari target
                </small>
              </div>
              <div className="ms-3">
                <div className="bg-success bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-check-circle text-success fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Total YTD</h6>
                <h3 className="mb-0 text-info">{formatCurrency(salesData.performance.ytd_total)}</h3>
                <small className="text-muted">Januari - Oktober</small>
              </div>
              <div className="ms-3">
                <div className="bg-info bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-graph-up text-info fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Total Penawaran</h6>
                <h3 className="mb-0 text-secondary">{salesData.quotations.total}</h3>
                <small className="text-muted">Bulan ini</small>
              </div>
              <div className="ms-3">
                <div className="bg-secondary bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-file-text text-secondary fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quotations Summary */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h6 className="mb-0">Ringkasan Penawaran</h6>
            </Card.Header>
            <Card.Body>
              <Row className="text-center mb-3">
                <Col>
                  <div className="mb-2">
                    <h4 className="text-secondary mb-1">{salesData.quotations.draft}</h4>
                    <small className="text-muted">Draft</small>
                  </div>
                  <ProgressBar variant="secondary" now={30} style={{ height: '4px' }} />
                </Col>
                <Col>
                  <div className="mb-2">
                    <h4 className="text-warning mb-1">{salesData.quotations.pending || 0}</h4>
                    <small className="text-muted">Pending</small>
                  </div>
                  <ProgressBar variant="warning" now={20} style={{ height: '4px' }} />
                </Col>
                <Col>
                  <div className="mb-2">
                    <h4 className="text-success mb-1">{salesData.quotations.approved}</h4>
                    <small className="text-muted">Approved</small>
                  </div>
                  <ProgressBar variant="success" now={40} style={{ height: '4px' }} />
                </Col>
                <Col>
                  <div className="mb-2">
                    <h4 className="text-danger mb-1">{salesData.quotations.rejected}</h4>
                    <small className="text-muted">Rejected</small>
                  </div>
                  <ProgressBar variant="danger" now={10} style={{ height: '4px' }} />
                </Col>
              </Row>

              <div className="text-center mt-3">
                <small className="text-muted">
                  Total {salesData.quotations.total} penawaran bulan ini |
                  Rate Approval: {salesData.quotations.total > 0 ? Math.round((salesData.quotations.approved / salesData.quotations.total) * 100) : 0}%
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Sales Orders */}
      <Row>
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Sales Order Terkini</h6>
                <Button variant="outline-primary" size="sm" onClick={() => navigate('/dashboard/sales-orders')}>
                  Lihat Semua SO
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {salesData.sales_orders.length > 0 ? (
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>No. SO</th>
                        <th>No. Quotation</th>
                        <th>Pelanggan</th>
                        <th>Tanggal SO</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.sales_orders.map((order) => (
                        <tr key={order.id}>
                          <td><small className="fw-bold">{order.sales_order_number}</small></td>
                          <td><small>{order.quotation?.quotation_number || '-'}</small></td>
                          <td>{order.customer?.company_name || order.customer?.name || '-'}</td>
                          <td><small>{new Date(order.created_at).toLocaleDateString('id-ID')}</small></td>
                          <td className="fw-bold">{formatCurrency(order.total_amount)}</td>
                          <td>
                            <Badge bg={
                              order.status === 'COMPLETED' ? 'success' :
                                order.status === 'SHIPPED' ? 'info' :
                                  order.status === 'READY_TO_SHIP' ? 'warning' :
                                    order.status === 'PROCESSING' ? 'primary' : 'secondary'
                            }>
                              {order.status?.replace('_', ' ')?.toUpperCase() || order.status}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-1"
                              title="Lihat Detail"
                              onClick={() => handleViewSalesOrderDetail(order)}
                            >
                              <i className="bi bi-eye"></i>
                            </Button>
                            <Button
                              variant="outline-success"
                              size="sm"
                              title="Cetak Quotation"
                              onClick={() => handlePrintQuotationFromSalesOrder(order)}
                            >
                              <i className="bi bi-printer"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-3">
                  <i className="bi bi-box text-muted fs-1"></i>
                  <p className="text-muted mt-2">Belum ada sales order</p>
                  <Button variant="primary" size="sm" onClick={() => navigate('/dashboard/quotations')}>
                    <i className="bi bi-plus-circle me-1"></i>
                    Buat Sales Order dari Penawaran
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quotation Modal */}
      <Modal
        show={showQuotationModal}
        onHide={handleCloseQuotationModal}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Buat Penawaran Baru</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingModal ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Memuat data...</p>
            </div>
          ) : (
            <Form onSubmit={handleQuotationSubmit}>
              {errorModal && (
                <Alert variant="danger" className="mb-3">
                  {errorModal}
                </Alert>
              )}

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Customer:</Form.Label>
                    <Form.Select
                      name="customer_id"
                      value={quotationForm.customer_id}
                      onChange={handleQuotationChange}
                      required
                    >
                      <option value="">Select Customer</option>
                      {customers.map(cust => (
                        <option key={cust.id} value={cust.id}>{cust.company_name || cust.name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Status:</Form.Label>
                    <Form.Select
                      name="status"
                      value={quotationForm.status}
                      onChange={handleQuotationChange}
                      required
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Valid Until:</Form.Label>
                    <Form.Control
                      type="date"
                      name="valid_until"
                      value={quotationForm.valid_until}
                      onChange={handleQuotationChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Quotation Items Section */}
              <Form.Group className="mb-3">
                <Form.Label><strong>Quotation Items</strong></Form.Label>
                <Row className="mb-2">
                  <Col md={4}>
                    <Form.Label>Product:</Form.Label>
                    <Form.Select
                      name="product_id"
                      value={newItem.product_id}
                      onChange={handleItemChange}
                    >
                      <option value="">Select Product</option>
                      {products.map(prod => (
                        <option key={prod.id} value={prod.id}>
                          {prod.sku} - {prod.name} - Rp {(prod.sell_price).toLocaleString()}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Form.Label>Quantity:</Form.Label>
                    <Form.Control
                      type="number"
                      name="quantity"
                      value={newItem.quantity}
                      onChange={handleItemChange}
                      min="1"
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Discount (%):</Form.Label>
                    <Form.Control
                      type="number"
                      name="discount_percentage"
                      value={newItem.discount_percentage}
                      onChange={handleItemChange}
                      min="0"
                      max="100"
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>Tax (%):</Form.Label>
                    <Form.Control
                      type="number"
                      name="tax_rate"
                      value={newItem.tax_rate}
                      onChange={handleItemChange}
                      min="0"
                      max="100"
                    />
                  </Col>
                  <Col md={2}>
                    <Form.Label>&nbsp;</Form.Label><br />
                    <Button type="button" variant="primary" onClick={addItem}>
                      Add Item
                    </Button>
                  </Col>
                </Row>
              </Form.Group>

              {/* Items Table */}
              {items.length > 0 && (
                <div className="table-responsive mb-3">
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Discount (%)</th>
                        <th>Tax (%)</th>
                        <th>Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>Rp {(item.unit_price).toLocaleString()}</td>
                          <td>{item.discount_percentage}%</td>
                          <td>{item.tax_rate}%</td>
                          <td>Rp {(item.total_price).toLocaleString()}</td>
                          <td>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}

              <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseQuotationModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loadingModal}>
                  {loadingModal ? 'Creating...' : 'Create'}
                </Button>
              </Modal.Footer>
            </Form>
          )}
        </Modal.Body>
      </Modal>

      {/* Sales Order Detail Modal */}
      <Modal
        show={showOrderDetailModal}
        onHide={handleCloseOrderDetailModal}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-cart-check me-2"></i>
            Detail Sales Order - {selectedOrderDetail?.sales_order_number}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrderDetail && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <h6>Informasi Order</h6>
                  <p><strong>No. SO:</strong> {selectedOrderDetail.sales_order_number}</p>
                  <p><strong>Customer:</strong> {selectedOrderDetail.customer?.company_name || selectedOrderDetail.customer?.name}</p>
                  <p><strong>Tanggal:</strong> {new Date(selectedOrderDetail.created_at).toLocaleDateString('id-ID')}</p>
                </Col>
                <Col md={6}>
                  <h6>Status & Total</h6>
                  <p><strong>Status:</strong> {selectedOrderDetail.status}</p>
                  <p><strong>Total Amount:</strong> {formatCurrency(selectedOrderDetail.total_amount)}</p>
                  {selectedOrderDetail.quotation && (
                    <p><strong>Sumber:</strong> {selectedOrderDetail.quotation.quotation_number}</p>
                  )}
                </Col>
              </Row>

              <h6>Item Order</h6>
              <Table striped responsive>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Discount</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetailItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product?.name || 'N/A'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td>{item.discount_percentage}%</td>
                      <td className="fw-semibold">{formatCurrency(item.total_price || (item.quantity * item.unit_price))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="4">Total:</th>
                    <th className="text-primary">{formatCurrency(selectedOrderDetail.total_amount)}</th>
                  </tr>
                </tfoot>
              </Table>

              {selectedOrderDetail.notes && (
                <Row className="mt-3">
                  <Col>
                    <h6>Catatan</h6>
                    <p>{selectedOrderDetail.notes}</p>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseOrderDetailModal}>
            Tutup
          </Button>
          {selectedOrderDetail && (
            <Button variant="success" onClick={() => handlePrintSalesOrder(selectedOrderDetail)}>
              <i className="bi bi-printer me-2"></i>
              Cetak SO
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Sales Order Detail Modal */}
      <Modal
        show={showOrderDetailModal}
        onHide={handleCloseOrderDetailModal}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-cart-check me-2"></i>
            Detail Sales Order - {selectedOrderDetail?.sales_order_number}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrderDetail && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <h6>Informasi Order</h6>
                  <p><strong>No. SO:</strong> {selectedOrderDetail.sales_order_number}</p>
                  <p><strong>Customer:</strong> {selectedOrderDetail.customer?.company_name || selectedOrderDetail.customer?.name}</p>
                  <p><strong>Tanggal:</strong> {new Date(selectedOrderDetail.created_at).toLocaleDateString('id-ID')}</p>
                </Col>
                <Col md={6}>
                  <h6>Status & Total</h6>
                  <p><strong>Status:</strong> {selectedOrderDetail.status}</p>
                  <p><strong>Total Amount:</strong> {formatCurrency(selectedOrderDetail.total_amount)}</p>
                  {selectedOrderDetail.quotation && (
                    <p><strong>Sumber:</strong> {selectedOrderDetail.quotation.quotation_number}</p>
                  )}
                </Col>
              </Row>

              <h6>Item Order</h6>
              <Table striped responsive>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Discount</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderDetailItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product?.name || 'N/A'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td>{item.discount_percentage}%</td>
                      <td className="fw-semibold">{formatCurrency(item.total_price || (item.quantity * item.unit_price))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="4">Total:</th>
                    <th className="text-primary">{formatCurrency(selectedOrderDetail.total_amount)}</th>
                  </tr>
                </tfoot>
              </Table>

              {selectedOrderDetail.notes && (
                <Row className="mt-3">
                  <Col>
                    <h6>Catatan</h6>
                    <p>{selectedOrderDetail.notes}</p>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseOrderDetailModal}>
            Tutup
          </Button>
          {selectedOrderDetail && selectedOrderDetail.quotation_id && (
            <Button variant="success" onClick={() => handlePrintQuotationFromSalesOrder(selectedOrderDetail)}>
              <i className="bi bi-printer me-2"></i>
              Cetak Quotation
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DashboardSales;