import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Spinner, Alert, ListGroup, Badge, Modal, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAPI } from '../../contexts/APIContext';

const WarehouseDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { api } = useAPI();

  useEffect(() => {
    fetchWarehouseDashboard();
  }, []);

  const fetchWarehouseDashboard = async () => {
    try {
      const response = await api.get('/dashboard/warehouse');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching warehouse dashboard:', error);
      setError('Failed to load warehouse dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    setProcessing(true);
    try {
      await api.post(`/sales-orders/${selectedOrder.id}/update-status`, {
        status: selectedStatus,
        notes: notes
      });
      setShowStatusModal(false);
      setNotes('');
      setSelectedOrder(null);
      setSelectedStatus('');
      fetchWarehouseDashboard(); // Refresh data
    } catch (error) {
      console.error('Error updating order status:', error);
      setError('Failed to update order status');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'PROCESSING': return 'info';
      case 'READY_TO_SHIP': return 'primary';
      case 'SHIPPED': return 'success';
      case 'COMPLETED': return 'success';
      default: return 'secondary';
    }
  };

  const getStatusOptions = (currentStatus) => {
    switch (currentStatus) {
      case 'PENDING':
        return [
          { value: 'PROCESSING', label: 'Start Processing', color: 'info' }
        ];
      case 'PROCESSING':
        return [
          { value: 'READY_TO_SHIP', label: 'Ready to Ship', color: 'primary' }
        ];
      default:
        return [];
    }
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

  const { pending_sales_orders, processing_sales_orders, ready_to_ship_orders, warehouse_stats } = dashboardData;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Gudang Dashboard</h2>
          <p className="text-muted mb-0">Daftar Sales Order yang PENDING dan Siap Diproses</p>
        </div>
        <Button variant="outline-primary" onClick={fetchWarehouseDashboard}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon pending mx-auto mb-3">
                <i className="bi bi-clock-history fs-3"></i>
              </div>
              <h3 className="mb-1">{warehouse_stats.pending_processing}</h3>
              <p className="text-muted mb-0">Pending Processing</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon processing mx-auto mb-3">
                <i className="bi bi-gear fs-3"></i>
              </div>
              <h3 className="mb-1">{warehouse_stats.processing}</h3>
              <p className="text-muted mb-0">Processing</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon ready mx-auto mb-3">
                <i className="bi bi-truck fs-3"></i>
              </div>
              <h3 className="mb-1">{warehouse_stats.ready_to_ship}</h3>
              <p className="text-muted mb-0">Ready to Ship</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon total mx-auto mb-3">
                <i className="bi bi-cart3 fs-3"></i>
              </div>
              <h3 className="mb-1">{warehouse_stats.total_orders}</h3>
              <p className="text-muted mb-0">Total Orders</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Pending Sales Orders */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Sales Order Menunggu Proses
              </h5>
            </Card.Header>
            <Card.Body>
              {pending_sales_orders.length > 0 ? (
                <ListGroup variant="flush">
                  {pending_sales_orders.map((order) => (
                    <ListGroup.Item key={order.id} className="px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="mb-0 me-2">{order.sales_order_number}</h6>
                            <Badge bg="warning">PENDING</Badge>
                          </div>
                          <Row className="mb-2">
                            <Col md={6}>
                              <p className="text-muted mb-1">
                                <i className="bi bi-building me-1"></i>
                                <strong>Pelanggan:</strong> {order.customer?.company_name || 'Unknown Customer'}
                              </p>
                              <p className="text-muted mb-1">
                                <i className="bi bi-person me-1"></i>
                                <strong>Sales:</strong> {order.user?.name || 'Unknown Sales'}
                              </p>
                            </Col>
                            <Col md={6}>
                              <p className="mb-1">
                                <strong>Total:</strong> {formatCurrency(order.total_amount)}
                              </p>
                              <p className="text-muted mb-1">
                                <i className="bi bi-calendar me-1"></i>
                                {new Date(order.created_at).toLocaleDateString('id-ID')}
                              </p>
                            </Col>
                          </Row>
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
                          {order.notes && (
                            <p className="mb-1">
                              <small><strong>Catatan:</strong> {order.notes}</small>
                            </p>
                          )}
                        </div>
                        <div className="d-flex gap-2">
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setSelectedStatus('PROCESSING');
                              setShowStatusModal(true);
                            }}
                          >
                            <i className="bi bi-play-fill me-1"></i>
                            Start Processing
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
                  <i className="bi bi-check-circle fs-1"></i>
                  <h5 className="mt-3">Tidak Ada Order Pending</h5>
                  <p>Semua order telah diproses</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Processing Orders */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-gear me-2"></i>
                Sedang Diproses
              </h5>
            </Card.Header>
            <Card.Body>
              {processing_sales_orders.length > 0 ? (
                <ListGroup variant="flush">
                  {processing_sales_orders.map((order) => (
                    <ListGroup.Item key={order.id} className="px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="mb-0 me-2">{order.sales_order_number}</h6>
                            <Badge bg="info">PROCESSING</Badge>
                          </div>
                          <p className="text-muted mb-1">
                            <i className="bi bi-building me-1"></i>
                            {order.customer?.company_name || 'Unknown Customer'}
                          </p>
                          <p className="mb-1">
                            <strong>Total:</strong> {formatCurrency(order.total_amount)}
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
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setSelectedStatus('READY_TO_SHIP');
                              setShowStatusModal(true);
                            }}
                          >
                            <i className="bi bi-check-lg me-1"></i>
                            Ready to Ship
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
                <div className="text-center text-muted py-3">
                  <i className="bi bi-gear fs-3"></i>
                  <p className="mb-0">Tidak ada order yang sedang diproses</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Ready to Ship Orders */}
      <Row>
        <Col>
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-truck me-2"></i>
                Siap Dikirim
              </h5>
            </Card.Header>
            <Card.Body>
              {ready_to_ship_orders.length > 0 ? (
                <ListGroup variant="flush">
                  {ready_to_ship_orders.map((order) => (
                    <ListGroup.Item key={order.id} className="px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="mb-0 me-2">{order.sales_order_number}</h6>
                            <Badge bg="primary">READY TO SHIP</Badge>
                          </div>
                          <p className="text-muted mb-1">
                            <i className="bi bi-building me-1"></i>
                            {order.customer?.company_name || 'Unknown Customer'}
                          </p>
                          <p className="mb-1">
                            <strong>Total:</strong> {formatCurrency(order.total_amount)}
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
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => {
                              // Create delivery order logic here
                              alert('Create delivery order functionality would be implemented here');
                            }}
                          >
                            <i className="bi bi-truck me-1"></i>
                            Create DO
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
                <div className="text-center text-muted py-3">
                  <i className="bi bi-truck fs-3"></i>
                  <p className="mb-0">Tidak ada order yang siap dikirim</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Update Status Modal */}
      <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-gear text-info me-2"></i>
            Update Status Order
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <>
              <p>
                <strong>Order:</strong> {selectedOrder.sales_order_number}<br />
                <strong>Pelanggan:</strong> {selectedOrder.customer?.company_name}<br />
                <strong>Status Saat Ini:</strong>{' '}
                <Badge bg={getStatusBadgeColor(selectedOrder.status)}>
                  {selectedOrder.status}
                </Badge>
              </p>

              {getStatusOptions(selectedOrder.status).map((option) => (
                <Button
                  key={option.value}
                  variant={option.color}
                  className="w-100 mb-2"
                  onClick={() => setSelectedStatus(option.value)}
                  active={selectedStatus === option.value}
                >
                  <i className="bi bi-arrow-right me-2"></i>
                  {option.label}
                </Button>
              ))}

              {selectedStatus && (
                <Form.Group className="mt-3">
                  <Form.Label>Catatan (Opsional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Tambahkan catatan untuk update status..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Form.Group>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdateStatus}
            disabled={processing || !selectedStatus}
          >
            {processing ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg me-2"></i>
                Update Status
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default WarehouseDashboard;