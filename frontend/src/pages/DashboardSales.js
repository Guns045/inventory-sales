import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert, ProgressBar } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';

const DashboardSales = () => {
  const { api } = useAPI();
  const { user } = useAuth();
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

  useEffect(() => {
    fetchSalesData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchSalesData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSalesData = async () => {
    try {
      const [performanceResponse, notificationsResponse, activitiesResponse, quotationsResponse, ordersResponse] = await Promise.all([
        api.get('/dashboard/sales'),
        api.get('/notifications'),
        api.get('/activity-logs/my'),
        api.get('/quotations'),
        api.get('/sales-orders')
      ]);

      // Process API responses
      const salesData = performanceResponse.data || {};

      // Calculate performance metrics from quotations data if not provided by API
      const monthlyTarget = salesData.monthly_target || 50000000; // Default target 50jt
      const approvedQuotations = salesData.quotations?.approved || 0;
      const totalQuotations = salesData.quotations?.total || 0;

      // Calculate YTD total from approved quotations
      const ytdTotal = salesData.recent_quotations?.reduce((total, q) => {
        return q.status === 'APPROVED' ? total + (q.total_amount || 0) : total;
      }, 0) || 0;

      // Calculate achievement percentage
      const achievementPercentage = monthlyTarget > 0 ? Math.round((ytdTotal / monthlyTarget) * 100) : 0;

      setSalesData({
        performance: {
          monthly_target: monthlyTarget,
          monthly_achieved: ytdTotal,
          achievement_percentage: achievementPercentage,
          ytd_total: ytdTotal,
        },
        notifications: Array.isArray(notificationsResponse.data?.notifications?.data) ? notificationsResponse.data.notifications.data.slice(0, 5) : [], // Latest 5 notifications
        activities: Array.isArray(activitiesResponse.data) ? activitiesResponse.data.slice(0, 5) : [], // Latest 5 activities
        quotations: salesData.quotations || {
          draft: 0,
          approved: 0,
          rejected: 0,
          total: 0,
        },
        sales_orders: salesData.recent_sales_orders || [],
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

  const getAchievementColor = (percentage) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'warning';
    return 'danger';
  };

  // Only allow Sales role to access this dashboard
  if (user?.role?.name !== 'Sales') {
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
          <Button variant="primary" className="me-2">
            <i className="bi bi-plus-circle me-1"></i>
            Buat Penawaran Baru
          </Button>
          <Button variant="outline-primary" size="sm">
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
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

      {/* Achievement Progress */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h6 className="mb-0">Pencapaian Target Bulanan</h6>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Progress Pencapaian</span>
                  <span className={`fw-bold text-${getAchievementColor(salesData.performance.achievement_percentage)}`}>
                    {salesData.performance.achievement_percentage}%
                  </span>
                </div>
                <ProgressBar
                  variant={getAchievementColor(salesData.performance.achievement_percentage)}
                  now={salesData.performance.achievement_percentage}
                  style={{ height: '20px' }}
                  label={`${salesData.performance.achievement_percentage}%`}
                />
              </div>
              <div className="row text-center">
                <Col>
                  <small className="text-muted">Target</small>
                  <div className="fw-bold">{formatCurrency(salesData.performance.monthly_target)}</div>
                </Col>
                <Col>
                  <small className="text-muted">Tercapai</small>
                  <div className="fw-bold text-success">{formatCurrency(salesData.performance.monthly_achieved)}</div>
                </Col>
                <Col>
                  <small className="text-muted">Sisa Target</small>
                  <div className="fw-bold text-warning">
                    {formatCurrency(salesData.performance.monthly_target - salesData.performance.monthly_achieved)}
                  </div>
                </Col>
                <Col>
                  <small className="text-muted">Hari Tersisa</small>
                  <div className="fw-bold text-info">
                    {new Date().getDate()} Okt - 31 Okt
                  </div>
                </Col>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Approval Notifications */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Notifikasi Persetujuan</h6>
                <Button variant="outline-primary" size="sm">
                  Lihat Semua
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {salesData.notifications.length > 0 ? (
                <div>
                  {salesData.notifications.map((notification, index) => (
                    <div key={index} className={`alert alert-${notification.type === 'approved' ? 'success' : notification.type === 'rejected' ? 'danger' : 'info'} alert-sm mb-2`} role="alert">
                      <div className="d-flex align-items-center">
                        <i className={`bi bi-${notification.type === 'approved' ? 'check-circle' : notification.type === 'rejected' ? 'x-circle' : 'info-circle'} me-2`}></i>
                        <div className="flex-grow-1">
                          <small className="fw-bold">{notification.title}</small>
                          <div className="small">{notification.message}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            {new Date(notification.created_at).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <Badge bg={notification.type === 'approved' ? 'success' : notification.type === 'rejected' ? 'danger' : 'info'}>
                          {notification.type.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3">
                  <i className="bi bi-bell text-muted fs-1"></i>
                  <p className="text-muted mt-2">Tidak ada notifikasi baru</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Sales Activities */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Aktivitas Penjualan Terkini</h6>
                <Button variant="outline-primary" size="sm">
                  Detail Aktivitas
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {salesData.activities.length > 0 ? (
                <div className="timeline">
                  {salesData.activities.map((activity, index) => (
                    <div key={index} className="d-flex mb-3">
                      <div className="me-3">
                        <div className={`bg-${activity.type === 'create' ? 'primary' : activity.type === 'approve' ? 'success' : activity.type === 'convert' ? 'info' : 'secondary'} bg-opacity-10 rounded-circle p-2`}>
                          <i className={`bi bi-${activity.type === 'create' ? 'plus' : activity.type === 'approve' ? 'check' : activity.type === 'convert' ? 'arrow-right' : 'file-text'} text-${activity.type === 'create' ? 'primary' : activity.type === 'approve' ? 'success' : activity.type === 'convert' ? 'info' : 'secondary'}`}></i>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-bold small">{activity.description}</div>
                        <div className="text-muted" style={{ fontSize: '11px' }}>
                          {new Date(activity.created_at).toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-3">
                  <i className="bi bi-activity text-muted fs-1"></i>
                  <p className="text-muted mt-2">Belum ada aktivitas hari ini</p>
                </div>
              )}
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

              <div className="text-center">
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
                <Button variant="outline-primary" size="sm">
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
                      {salesData.sales_orders.map((order, index) => (
                        <tr key={index}>
                          <td><small className="fw-bold">{order.so_number}</small></td>
                          <td><small>{order.quotation_number}</small></td>
                          <td>{order.customer_name}</td>
                          <td><small>{new Date(order.so_date).toLocaleDateString('id-ID')}</small></td>
                          <td className="fw-bold">{formatCurrency(order.total)}</td>
                          <td>
                            <Badge bg={
                              order.status === 'completed' ? 'success' :
                              order.status === 'shipped' ? 'info' :
                              order.status === 'ready_to_ship' ? 'warning' :
                              order.status === 'processing' ? 'primary' : 'secondary'
                            }>
                              {order.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            <Button variant="outline-primary" size="sm" className="me-1">
                              <i className="bi bi-eye"></i>
                            </Button>
                            <Button variant="outline-success" size="sm">
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
                  <Button variant="primary" size="sm">
                    <i className="bi bi-plus-circle me-1"></i>
                    Konversi Penawaran ke SO
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardSales;