import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Spinner, Alert, ListGroup, Badge, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAPI } from '../../contexts/APIContext';

const SalesDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { api } = useAPI();

  useEffect(() => {
    fetchSalesDashboard();
  }, []);

  const fetchSalesDashboard = async () => {
    try {
      const response = await api.get('/dashboard/sales');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching sales dashboard:', error);
      setError('Failed to load sales dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SUBMITTED': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'danger';
      default: return 'secondary';
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

  const { quotation_stats, recent_quotations, sales_target, approval_notifications } = dashboardData;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Sales Dashboard</h2>
          <p className="text-muted mb-0">Ringkasan Penawaran, Target Penjualan, dan Notifikasi</p>
        </div>
        <Button variant="outline-primary" onClick={fetchSalesDashboard}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon draft mx-auto mb-3">
                <i className="bi bi-file-earmark-text fs-3"></i>
              </div>
              <h3 className="mb-1">{quotation_stats.draft}</h3>
              <p className="text-muted mb-0">Draft</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon submitted mx-auto mb-3">
                <i className="bi bi-clock-history fs-3"></i>
              </div>
              <h3 className="mb-1">{quotation_stats.submitted}</h3>
              <p className="text-muted mb-0">Submitted</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon approved mx-auto mb-3">
                <i className="bi bi-check-circle fs-3"></i>
              </div>
              <h3 className="mb-1">{quotation_stats.approved}</h3>
              <p className="text-muted mb-0">Approved</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon rejected mx-auto mb-3">
                <i className="bi bi-x-circle fs-3"></i>
              </div>
              <h3 className="mb-1">{quotation_stats.rejected}</h3>
              <p className="text-muted mb-0">Rejected</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Sales Target and Recent Quotations */}
      <Row className="mb-4">
        {/* Sales Target */}
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-graph-up me-2"></i>
                Target Penjualan Bulanan
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="text-center mb-3">
                <h4 className="text-primary mb-1">{formatCurrency(sales_target.current_achievement)}</h4>
                <p className="text-muted mb-2">dari {formatCurrency(sales_target.monthly_target)}</p>
                <ProgressBar
                  now={Math.min(sales_target.percentage, 100)}
                  label={`${Math.round(sales_target.percentage)}%`}
                  variant={sales_target.percentage >= 100 ? 'success' : 'primary'}
                  className="mb-3"
                />
                <small className="text-muted">
                  {sales_target.percentage >= 100
                    ? '🎉 Target tercapai!'
                    : `${Math.round(sales_target.percentage)}% dari target bulanan`
                  }
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Quotations */}
        <Col lg={8} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white border-bottom d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Penawaran Terbaru
              </h5>
              <Link to="/quotations" className="btn btn-sm btn-outline-primary">
                Lihat Semua
              </Link>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {recent_quotations.length > 0 ? (
                  recent_quotations.map((quotation) => (
                    <ListGroup.Item key={quotation.id} className="px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                            <h6 className="mb-0 me-2">{quotation.quotation_number}</h6>
                            <Badge bg={getStatusBadgeColor(quotation.status)}>
                              {quotation.status}
                            </Badge>
                          </div>
                          <p className="text-muted mb-1">
                            <i className="bi bi-building me-1"></i>
                            {quotation.customer?.company_name || 'Unknown Customer'}
                          </p>
                          <p className="mb-1 fw-semibold">{formatCurrency(quotation.total_amount)}</p>
                          <small className="text-muted">
                            <i className="bi bi-calendar me-1"></i>
                            {new Date(quotation.created_at).toLocaleDateString('id-ID')}
                          </small>
                        </div>
                        <Link to={`/quotations/${quotation.id}`} className="btn btn-sm btn-outline-secondary">
                          <i className="bi bi-eye"></i>
                        </Link>
                      </div>
                    </ListGroup.Item>
                  ))
                ) : (
                  <div className="text-center text-muted py-3">
                    <i className="bi bi-inbox fs-3"></i>
                    <p className="mb-0">Belum ada penawaran</p>
                  </div>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Approval Notifications */}
      <Row>
        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-bell me-2"></i>
                Notifikasi Persetujuan
              </h5>
            </Card.Header>
            <Card.Body>
              {approval_notifications.length > 0 ? (
                <ListGroup variant="flush">
                  {approval_notifications.map((notification) => (
                    <ListGroup.Item key={notification.id} className="px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                            <Badge bg={notification.status === 'APPROVED' ? 'success' : 'danger'} className="me-2">
                              {notification.status}
                            </Badge>
                            <h6 className="mb-0">
                              {notification.approvable?.quotation_number || 'Unknown Quotation'}
                            </h6>
                          </div>
                          <p className="text-muted mb-1">
                            {notification.status === 'APPROVED'
                              ? `Disetujui oleh ${notification.approver?.name || 'Manager'}`
                              : `Ditolak oleh ${notification.approver?.name || 'Manager'}`
                            }
                          </p>
                          {notification.notes && (
                            <p className="mb-1">
                              <small><strong>Catatan:</strong> {notification.notes}</small>
                            </p>
                          )}
                          <small className="text-muted">
                            <i className="bi bi-calendar me-1"></i>
                            {new Date(notification.updated_at).toLocaleString('id-ID')}
                          </small>
                        </div>
                        <Link to={`/quotations/${notification.approvable_id}`} className="btn btn-sm btn-outline-secondary">
                          <i className="bi bi-eye"></i>
                        </Link>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center text-muted py-3">
                  <i className="bi bi-bell-slash fs-3"></i>
                  <p className="mb-0">Tidak ada notifikasi persetujuan</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row>
        <Col>
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-lightning me-2"></i>
                Aksi Cepat
              </h5>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col md={6} lg={3}>
                  <Link to="/quotations?action=create" className="text-decoration-none">
                    <div className="quick-action-card h-100">
                      <i className="bi bi-file-plus fs-3 text-primary"></i>
                      <h6 className="mb-2">Buat Penawaran</h6>
                      <p className="text-muted small mb-0">Buat penawaran baru untuk pelanggan</p>
                    </div>
                  </Link>
                </Col>
                <Col md={6} lg={3}>
                  <Link to="/quotations?status=submitted" className="text-decoration-none">
                    <div className="quick-action-card h-100">
                      <i className="bi bi-clock-history fs-3 text-warning"></i>
                      <h6 className="mb-2">Pending Approvals</h6>
                      <p className="text-muted small mb-0">Lihat penawaran yang menunggu persetujuan</p>
                    </div>
                  </Link>
                </Col>
                <Col md={6} lg={3}>
                  <Link to="/sales-orders" className="text-decoration-none">
                    <div className="quick-action-card h-100">
                      <i className="bi bi-cart fs-3 text-info"></i>
                      <h6 className="mb-2">Sales Orders</h6>
                      <p className="text-muted small mb-0">Kelola pesanan penjualan</p>
                    </div>
                  </Link>
                </Col>
                <Col md={6} lg={3}>
                  <Link to="/customers" className="text-decoration-none">
                    <div className="quick-action-card h-100">
                      <i className="bi bi-people fs-3 text-success"></i>
                      <h6 className="mb-2">Pelanggan</h6>
                      <p className="text-muted small mb-0">Kelola data pelanggan</p>
                    </div>
                  </Link>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SalesDashboard;