import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Spinner, Alert, ListGroup, Badge, Modal, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAPI } from '../../contexts/APIContext';

const FinanceDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    tax_rate: 11,
    shipping_cost: 0,
    notes: ''
  });
  const [processing, setProcessing] = useState(false);
  const { api } = useAPI();

  useEffect(() => {
    fetchFinanceDashboard();
  }, []);

  const fetchFinanceDashboard = async () => {
    try {
      const response = await api.get('/dashboard/finance');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching finance dashboard:', error);
      setError('Failed to load finance dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    setProcessing(true);
    try {
      await api.post('/invoices', {
        sales_order_id: selectedOrder.id,
        invoice_number: invoiceData.invoice_number,
        tax_rate: invoiceData.tax_rate,
        shipping_cost: invoiceData.shipping_cost,
        notes: invoiceData.notes
      });
      setShowInvoiceModal(false);
      setInvoiceData({
        invoice_number: '',
        tax_rate: 11,
        shipping_cost: 0,
        notes: ''
      });
      setSelectedOrder(null);
      fetchFinanceDashboard(); // Refresh data
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Failed to create invoice');
    } finally {
      setProcessing(false);
    }
  };

  const openInvoiceModal = (order) => {
    setSelectedOrder(order);
    // Generate invoice number automatically
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '-');
    const invoiceNum = `INV-${dateStr}-${String(order.id).padStart(3, '0')}`;
    setInvoiceData({
      ...invoiceData,
      invoice_number: invoiceNum
    });
    setShowInvoiceModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateTotalWithTaxAndShipping = (subtotal, taxRate, shippingCost) => {
    const taxAmount = (subtotal * taxRate) / 100;
    return subtotal + taxAmount + shippingCost;
  };

  if (loading) {
    return (
      <div className="loading">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  const { shipped_sales_orders, completed_sales_orders, finance_summary } = dashboardData;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Finance Dashboard</h2>
          <p className="text-muted mb-0">Daftar SO yang SHIPPED dan Ringkasan Piutang</p>
        </div>
        <Button variant="outline-primary" onClick={fetchFinanceDashboard}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </Button>
      </div>

      {/* Finance Summary Cards */}
      <Row className="mb-4">
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon receivable mx-auto mb-3">
                <i className="bi bi-cash-stack fs-3"></i>
              </div>
              <h3 className="mb-1">{formatCurrency(finance_summary.total_receivable)}</h3>
              <p className="text-muted mb-0">Total Piutang</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon revenue mx-auto mb-3">
                <i className="bi bi-graph-up fs-3"></i>
              </div>
              <h3 className="mb-1">{formatCurrency(finance_summary.monthly_revenue)}</h3>
              <p className="text-muted mb-0">Pendapatan Bulan Ini</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon pending-invoices mx-auto mb-3">
                <i className="bi bi-file-earmark-text fs-3"></i>
              </div>
              <h3 className="mb-1">{finance_summary.pending_invoices}</h3>
              <p className="text-muted mb-0">Pending Invoice</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon total-orders mx-auto mb-3">
                <i className="bi bi-cart3 fs-3"></i>
              </div>
              <h3 className="mb-1">{finance_summary.total_orders}</h3>
              <p className="text-muted mb-0">Total Orders</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Shipped Orders (Ready for Invoicing) */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-truck me-2"></i>
                Sales Order Siap Di-Invoice
              </h5>
            </Card.Header>
            <Card.Body>
              {shipped_sales_orders.length > 0 ? (
                <ListGroup variant="flush">
                  {shipped_sales_orders.map((order) => (
                    <ListGroup.Item key={order.id} className="px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="mb-0 me-2">{order.sales_order_number}</h6>
                            <Badge bg="success">SHIPPED</Badge>
                          </div>
                          <Row className="mb-2">
                            <Col md={6}>
                              <p className="text-muted mb-1">
                                <i className="bi bi-building me-1"></i>
                                <strong>Pelanggan:</strong> {order.customer?.company_name || 'Unknown Customer'}
                              </p>
                              <p className="text-muted mb-1">
                                <i className="bi bi-calendar me-1"></i>
                                <strong>Tanggal SO:</strong> {new Date(order.created_at).toLocaleDateString('id-ID')}
                              </p>
                            </Col>
                            <Col md={6}>
                              <p className="mb-1">
                                <strong>Subtotal:</strong> {formatCurrency(order.total_amount)}
                              </p>
                              <p className="text-muted mb-1">
                                <i className="bi bi-truck me-1"></i>
                                <strong>Shipped:</strong> {new Date(order.updated_at).toLocaleDateString('id-ID')}
                              </p>
                            </Col>
                          </Row>
                          {order.quotation && (
                            <p className="text-muted mb-1">
                              <i className="bi bi-file-text me-1"></i>
                              <strong>Quotation:</strong> {order.quotation.quotation_number}
                            </p>
                          )}
                          {order.items && order.items.length > 0 && (
                            <div className="mb-2">
                              <small className="text-muted">
                                <strong>Items ({order.items.length}):</strong>
                              </small>
                              <div className="mt-1">
                                {order.items.slice(0, 3).map((item, index) => (
                                  <Badge key={index} bg="light" text="dark" className="me-1 mb-1">
                                    {item.product?.name || 'Unknown Product'} x{item.quantity}
                                  </Badge>
                                ))}
                                {order.items.length > 3 && (
                                  <Badge bg="secondary" className="mb-1">
                                    +{order.items.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="d-flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openInvoiceModal(order)}
                          >
                            <i className="bi bi-receipt me-1"></i>
                            Buat Invoice
                          </Button>
                          <Link to={`/sales-orders/${order.id}`} className="btn btn-sm btn-outline-secondary">
                            <i className="bi bi-eye"></i>
                          </Link>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-receipt fs-1"></i>
                  <h5 className="mt-3">Tidak Ada Order Siap Invoice</h5>
                  <p>Belum ada sales order yang siap untuk dibuatkan invoice</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Completed Orders (Already Invoiced) */}
      <Row>
        <Col>
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-check-circle me-2"></i>
                Order Selesai (Sudah Di-Invoice)
              </h5>
            </Card.Header>
            <Card.Body>
              {completed_sales_orders.length > 0 ? (
                <ListGroup variant="flush">
                  {completed_sales_orders.map((order) => (
                    <ListGroup.Item key={order.id} className="px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="mb-0 me-2">{order.sales_order_number}</h6>
                            <Badge bg="success">COMPLETED</Badge>
                          </div>
                          <p className="text-muted mb-1">
                            <i className="bi bi-building me-1"></i>
                            {order.customer?.company_name || 'Unknown Customer'}
                          </p>
                          <p className="mb-1">
                            <strong>Total:</strong> {formatCurrency(order.total_amount)}
                          </p>
                          <p className="text-muted mb-1">
                            <i className="bi bi-calendar-check me-1"></i>
                            <strong>Completed:</strong> {new Date(order.updated_at).toLocaleDateString('id-ID')}
                          </p>
                          {order.items && order.items.length > 0 && (
                            <div className="mb-2">
                              <small className="text-muted">
                                <strong>Items ({order.items.length}):</strong>
                              </small>
                              <div className="mt-1">
                                {order.items.slice(0, 3).map((item, index) => (
                                  <Badge key={index} bg="light" text="dark" className="me-1 mb-1">
                                    {item.product?.name || 'Unknown Product'} x{item.quantity}
                                  </Badge>
                                ))}
                                {order.items.length > 3 && (
                                  <Badge bg="secondary" className="mb-1">
                                    +{order.items.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="d-flex gap-2">
                          <Link to={`/invoices?so=${order.id}`} className="btn btn-sm btn-outline-info">
                            <i className="bi bi-receipt me-1"></i>
                            Lihat Invoice
                          </Link>
                          <Link to={`/sales-orders/${order.id}`} className="btn btn-sm btn-outline-secondary">
                            <i className="bi bi-eye"></i>
                          </Link>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center text-muted py-3">
                  <i className="bi bi-clipboard-check fs-3"></i>
                  <p className="mb-0">Belum ada order yang selesai</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create Invoice Modal */}
      <Modal show={showInvoiceModal} onHide={() => setShowInvoiceModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-receipt text-primary me-2"></i>
            Buat Invoice
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <>
              <div className="mb-4">
                <h6>Detail Sales Order</h6>
                <p>
                  <strong>SO Number:</strong> {selectedOrder.sales_order_number}<br />
                  <strong>Pelanggan:</strong> {selectedOrder.customer?.company_name}<br />
                  <strong>Subtotal:</strong> {formatCurrency(selectedOrder.total_amount)}
                </p>
              </div>

              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Invoice Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={invoiceData.invoice_number}
                        onChange={(e) => setInvoiceData({
                          ...invoiceData,
                          invoice_number: e.target.value
                        })}
                        placeholder="Masukkan nomor invoice"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pajak (PPN) %</Form.Label>
                      <Form.Control
                        type="number"
                        value={invoiceData.tax_rate}
                        onChange={(e) => setInvoiceData({
                          ...invoiceData,
                          tax_rate: parseFloat(e.target.value) || 0
                        })}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Biaya Pengiriman</Form.Label>
                  <Form.Control
                    type="number"
                    value={invoiceData.shipping_cost}
                    onChange={(e) => setInvoiceData({
                      ...invoiceData,
                      shipping_cost: parseFloat(e.target.value) || 0
                    })}
                    placeholder="0"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Catatan (Opsional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Tambahkan catatan untuk invoice..."
                    value={invoiceData.notes}
                    onChange={(e) => setInvoiceData({
                      ...invoiceData,
                      notes: e.target.value
                    })}
                  />
                </Form.Group>

                {selectedOrder.total_amount > 0 && (
                  <div className="bg-light p-3 rounded">
                    <h6>Perhitungan Total</h6>
                    <Row>
                      <Col md={4}>
                        <small>Subtotal:</small>
                        <p className="mb-0 fw-semibold">{formatCurrency(selectedOrder.total_amount)}</p>
                      </Col>
                      <Col md={4}>
                        <small>Pajak ({invoiceData.tax_rate}%):</small>
                        <p className="mb-0 fw-semibold">
                          {formatCurrency((selectedOrder.total_amount * invoiceData.tax_rate) / 100)}
                        </p>
                      </Col>
                      <Col md={4}>
                        <small>Biaya Kirim:</small>
                        <p className="mb-0 fw-semibold">{formatCurrency(invoiceData.shipping_cost)}</p>
                      </Col>
                    </Row>
                    <hr />
                    <Row>
                      <Col>
                        <h5 className="mb-0">
                          Total: {formatCurrency(
                            calculateTotalWithTaxAndShipping(
                              selectedOrder.total_amount,
                              invoiceData.tax_rate,
                              invoiceData.shipping_cost
                            )
                          )}
                        </h5>
                      </Col>
                    </Row>
                  </div>
                )}
              </Form>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateInvoice}
            disabled={processing || !invoiceData.invoice_number.trim()}
          >
            {processing ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-receipt me-2"></i>
                Buat Invoice
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FinanceDashboard;