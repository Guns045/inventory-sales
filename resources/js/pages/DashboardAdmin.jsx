import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert, ProgressBar } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';

const DashboardAdmin = () => {
  const { api } = useAPI();
  const [dashboardData, setDashboardData] = useState({
    summary: {
      critical_stocks: 0,
      pending_approvals: 0,
      ready_to_ship: 0,
      today_sales: 0,
      today_orders: 0,
      today_completed_orders: 0,
      this_month_sales: 0,
      last_month_sales: 0,
      sales_growth: 0,
    },
    inventory: {
      total_products: 0,
      low_stock_products: 0,
      total_inventory_value: 0,
    },
    business_summary: {
      total_customers: 0,
      active_customers: 0,
      total_suppliers: 0,
    },
    approval_stats: {
      pending: 0,
      approved_today: 0,
      rejected_today: 0,
      total_approved_this_month: 0,
    },
    critical_stocks: [],
    pending_quotations: [],
    ready_to_ship_orders: [],
    recent_activities: [],
    unread_notifications: [],
    sales_by_status: [],
    top_products: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAdminDashboard();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchAdminDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAdminDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/dashboard');

      setDashboardData(response.data || {});
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('id-ID');
  };

  const getStatusVariant = (status) => {
    const statusMap = {
      'PENDING': 'warning',
      'PROCESSING': 'info',
      'READY_TO_SHIP': 'primary',
      'SHIPPED': 'success',
      'COMPLETED': 'success',
      'SUBMITTED': 'warning',
      'APPROVED': 'success',
      'REJECTED': 'danger',
      'DRAFT': 'secondary',
    };
    return statusMap[status] || 'secondary';
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <i className="bi bi-arrow-up-up text-success"></i>;
    if (growth < 0) return <i className="bi bi-arrow-down-down text-danger"></i>;
    return <i className="bi bi-dash text-muted"></i>;
  };

  const getStockLevelColor = (current, min) => {
    if (current === 0) return 'danger';
    if (current <= min * 0.5) return 'danger';
    if (current <= min) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchAdminDashboard}>
            Try Again
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Admin Dashboard</h2>
          <p className="text-muted mb-0">Sistem Manajemen Inventaris & Penjualan - Monitoring Penuh</p>
        </div>
        <div className="text-end">
          <small className="text-muted">Last updated: {new Date().toLocaleString()}</small>
        </div>
      </div>

      {/* Critical Alerts */}
      {(dashboardData.summary.critical_stocks > 0 || dashboardData.summary.pending_approvals > 0) && (
        <Alert variant="danger" className="mb-4">
          <Alert.Heading>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Critical Alerts
          </Alert.Heading>
          <div className="d-flex gap-4">
            {dashboardData.summary.critical_stocks > 0 && (
              <div>
                <i className="bi bi-box-seam me-2"></i>
                <strong>{dashboardData.summary.critical_stocks}</strong> products with critical stock levels
              </div>
            )}
            {dashboardData.summary.pending_approvals > 0 && (
              <div>
                <i className="bi bi-clock-history me-2"></i>
                <strong>{dashboardData.summary.pending_approvals}</strong> quotations awaiting approval
              </div>
            )}
            {dashboardData.summary.ready_to_ship > 0 && (
              <div>
                <i className="bi bi-truck me-2"></i>
                <strong>{dashboardData.summary.ready_to_ship}</strong> orders ready to ship
              </div>
            )}
          </div>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-cash-stack text-success fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{formatCurrency(dashboardData.summary.today_sales)}</h4>
              <Card.Text className="text-muted">Today's Sales</Card.Text>
              <small className="text-muted">
                {dashboardData.summary.today_orders} orders • {dashboardData.summary.today_completed_orders} completed
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-graph-up text-primary fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{formatCurrency(dashboardData.summary.this_month_sales)}</h4>
              <Card.Text className="text-muted">This Month Sales</Card.Text>
              <div className="d-flex align-items-center justify-content-center">
                {getGrowthIcon(dashboardData.summary.sales_growth)}
                <span className={`ms-2 ${dashboardData.summary.sales_growth >= 0 ? 'text-success' : 'text-danger'}`}>
                  {Math.abs(dashboardData.summary.sales_growth)}%
                </span>
                <small className="text-muted ms-1">vs last month</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-box-seam text-warning fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{dashboardData.inventory.total_products}</h4>
              <Card.Text className="text-muted">Total Products</Card.Text>
              <Badge bg={dashboardData.inventory.low_stock_products > 0 ? 'warning' : 'success'}>
                {dashboardData.inventory.low_stock_products} low stock
              </Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-archive text-info fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{formatCurrency(dashboardData.inventory.total_inventory_value)}</h4>
              <Card.Text className="text-muted">Inventory Value</Card.Text>
              <small className="text-muted">Total current stock value</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Business Overview */}
      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Business Overview</Card.Title>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col xs={6} className="text-center mb-3">
                  <h5 className="mb-1">{dashboardData.business_summary.total_customers}</h5>
                  <small className="text-muted">Total Customers</small>
                </Col>
                <Col xs={6} className="text-center mb-3">
                  <h5 className="mb-1 text-success">{dashboardData.business_summary.active_customers}</h5>
                  <small className="text-muted">Active Customers</small>
                </Col>
                <Col xs={12} className="text-center">
                  <h5 className="mb-1">{dashboardData.business_summary.total_suppliers}</h5>
                  <small className="text-muted">Total Suppliers</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3">
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Approval Statistics</Card.Title>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col xs={6} className="text-center mb-3">
                  <h5 className="mb-1 text-warning">{dashboardData.approval_stats.pending}</h5>
                  <small className="text-muted">Pending</small>
                </Col>
                <Col xs={6} className="text-center mb-3">
                  <h5 className="mb-1 text-success">{dashboardData.approval_stats.approved_today}</h5>
                  <small className="text-muted">Approved Today</small>
                </Col>
                <Col xs={6} className="text-center mb-3">
                  <h5 className="mb-1 text-danger">{dashboardData.approval_stats.rejected_today}</h5>
                  <small className="text-muted">Rejected Today</small>
                </Col>
                <Col xs={6} className="text-center">
                  <h5 className="mb-1 text-info">{dashboardData.approval_stats.total_approved_this_month}</h5>
                  <small className="text-muted">This Month</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3">
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Sales by Status</Card.Title>
            </Card.Header>
            <Card.Body>
              {dashboardData.sales_by_status.map((item, index) => (
                <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                  <span>
                    <Badge bg={getStatusVariant(item.status)} className="me-2">
                      {item.status}
                    </Badge>
                    <small>({item.count})</small>
                  </span>
                  <strong>{formatCurrency(item.total)}</strong>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card className="mb-4">
        <Card.Header>
          <Card.Title className="mb-0">Quick Actions</Card.Title>
        </Card.Header>
        <Card.Body>
          <div className="d-flex gap-3 flex-wrap">
            <Button variant="primary" href="/approvals">
              <i className="bi bi-check-square me-2"></i>
              Review Approvals
            </Button>
            <Button variant="outline-primary" href="/stock">
              <i className="bi bi-archive me-2"></i>
              Manage Stock
            </Button>
            <Button variant="outline-success" href="/reports/stock">
              <i className="bi bi-graph-up me-2"></i>
              Stock Reports
            </Button>
            <Button variant="outline-info" href="/reports/sales">
              <i className="bi bi-cash-stack me-2"></i>
              Sales Reports
            </Button>
            <Button variant="outline-secondary" href="/activity-logs">
              <i className="bi bi-list-ul me-2"></i>
              Activity Logs
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Detailed Tables */}
      <Row>
        {/* Critical Stocks */}
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Card.Title className="mb-0">Critical Stock Alerts</Card.Title>
              <Button size="sm" variant="outline-primary" href="/stock">
                Manage Stock
              </Button>
            </Card.Header>
            <Card.Body>
              {dashboardData.critical_stocks.length > 0 ? (
                <Table responsive hover size="sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Current Stock</th>
                      <th>Min Level</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.critical_stocks.map((item, index) => (
                      <tr key={index}>
                        <td>{item.product_name}</td>
                        <td><small>{item.sku}</small></td>
                        <td>
                          <Badge bg={getStockLevelColor(item.quantity, item.min_stock_level)}>
                            {item.quantity}
                          </Badge>
                        </td>
                        <td>{item.min_stock_level}</td>
                        <td>
                          <ProgressBar
                            now={Math.min((item.quantity / item.min_stock_level) * 100, 100)}
                            variant={getStockLevelColor(item.quantity, item.min_stock_level)}
                            style={{ height: '6px' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="success">
                  <i className="bi bi-check-circle me-2"></i>
                  No critical stock alerts at the moment.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Pending Quotations */}
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Card.Title className="mb-0">Pending Approvals</Card.Title>
              <Button size="sm" variant="outline-primary" href="/approvals">
                Review All
              </Button>
            </Card.Header>
            <Card.Body>
              {dashboardData.pending_quotations.length > 0 ? (
                <Table responsive hover size="sm">
                  <thead>
                    <tr>
                      <th>Quotation #</th>
                      <th>Customer</th>
                      <th>Sales Person</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.pending_quotations.map((quotation) => (
                      <tr key={quotation.id}>
                        <td>{quotation.quotation_number}</td>
                        <td>{quotation.customer?.company_name}</td>
                        <td>{quotation.user?.name}</td>
                        <td>{formatCurrency(quotation.total_amount)}</td>
                        <td>
                          <Button size="sm" variant="outline-primary" href={`/quotations/${quotation.id}`}>
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">
                  <i className="bi bi-check-circle me-2"></i>
                  No pending quotations to review.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Ready to Ship Orders */}
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Card.Title className="mb-0">Ready to Ship</Card.Title>
              <Button size="sm" variant="outline-success" href="/delivery-orders">
                Process Orders
              </Button>
            </Card.Header>
            <Card.Body>
              {dashboardData.ready_to_ship_orders.length > 0 ? (
                <Table responsive hover size="sm">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Total Amount</th>
                      <th>Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.ready_to_ship_orders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.sales_order_number}</td>
                        <td>{order.customer?.company_name}</td>
                        <td>{formatCurrency(order.total_amount)}</td>
                        <td><small>{formatDateTime(order.updated_at)}</small></td>
                        <td>
                          <Button size="sm" variant="outline-success" href={`/delivery-orders/new?order=${order.id}`}>
                            <i className="bi bi-truck me-1"></i>
                            Ship
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  No orders ready to ship at the moment.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Activities */}
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <Card.Title className="mb-0">Recent Activities (24h)</Card.Title>
              <Button size="sm" variant="outline-secondary" href="/activity-logs">
                View All
              </Button>
            </Card.Header>
            <Card.Body>
              {dashboardData.recent_activities.length > 0 ? (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {dashboardData.recent_activities.map((activity, index) => (
                    <div key={index} className="d-flex align-items-start mb-3 pb-2 border-bottom">
                      <div className="me-3">
                        <i className="bi bi-circle-fill text-primary" style={{ fontSize: '8px' }}></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <strong>{activity.action}</strong>
                          <small className="text-muted">{formatDateTime(activity.created_at)}</small>
                        </div>
                        <p className="mb-1 small">{activity.description}</p>
                        <small className="text-muted">by {activity.user?.name || 'System'}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  No recent activities in the last 24 hours.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Products */}
      {dashboardData.top_products.length > 0 && (
        <Card className="mb-4">
          <Card.Header>
            <Card.Title className="mb-0">Top Selling Products This Month</Card.Title>
          </Card.Header>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Quantity Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.top_products.map((product, index) => (
                  <tr key={product.id}>
                    <td>
                      <Badge bg="primary" className="me-2">#{index + 1}</Badge>
                    </td>
                    <td>{product.name}</td>
                    <td><small>{product.sku}</small></td>
                    <td>{product.total_quantity}</td>
                    <td><strong>{formatCurrency(product.total_revenue)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default DashboardAdmin;