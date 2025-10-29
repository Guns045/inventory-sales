import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';

const DashboardFinance = () => {
  const { api } = useAPI();
  const [dashboardData, setDashboardData] = useState({
    invoices: { total: 0, paid: 0, unpaid: 0, overdue: 0 },
    payments: { thisMonth: 0, outstanding: 0 },
    recentInvoices: [],
    topCustomers: [],
    monthlyRevenue: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFinanceDashboard();
  }, []);

  const fetchFinanceDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/dashboard/finance');

      // Ensure we have default values if data is missing
      const data = response.data || {};
      setDashboardData({
        invoices: data.invoices || { total: 0, paid: 0, unpaid: 0, overdue: 0 },
        payments: data.payments || { this_month: 0, outstanding: 0 },
        recentInvoices: data.recent_invoices || [],
        topCustomers: data.top_customers || [],
        monthlyRevenue: data.monthly_revenue || []
      });
    } catch (error) {
      console.error('Error fetching finance dashboard:', error);
      setError('Failed to load finance dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading finance dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchFinanceDashboard}>
            Try Again
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Finance Dashboard</h2>
        <Button variant="primary">
          <i className="bi bi-receipt me-2"></i>
          New Invoice
        </Button>
      </div>

      {/* Financial Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-receipt text-primary fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{dashboardData.invoices.total}</h4>
              <Card.Text className="text-muted">Total Invoices</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-cash text-success fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{formatCurrency(dashboardData.payments.this_month || 0)}</h4>
              <Card.Text className="text-muted">This Month Revenue</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-clock text-warning fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{dashboardData.invoices.unpaid}</h4>
              <Card.Text className="text-muted">Unpaid Invoices</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-exclamation-triangle text-danger fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{formatCurrency(dashboardData.payments.outstanding || 0)}</h4>
              <Card.Text className="text-muted">Outstanding Payments</Card.Text>
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
            <Button variant="primary" href="/invoices?action=new">
              <i className="bi bi-plus-circle me-2"></i>
              Create Invoice
            </Button>
            <Button variant="outline-success" href="/payments?action=new">
              <i className="bi bi-credit-card me-2"></i>
              Record Payment
            </Button>
            <Button variant="outline-warning" href="/invoices?status=unpaid">
              <i className="bi bi-clock-history me-2"></i>
              Follow Up Payments
            </Button>
            <Button variant="outline-info" href="/reports">
              <i className="bi bi-graph-up me-2"></i>
              Generate Reports
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Row>
        {/* Recent Invoices */}
        <Col lg={8} className="mb-4">
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Recent Invoices</Card.Title>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recentInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.invoice_number}</td>
                      <td>{invoice.customer_name}</td>
                      <td>{formatCurrency(invoice.total_amount)}</td>
                      <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                      <td>
                        <Badge bg={
                          invoice.status === 'PAID' ? 'success' :
                          invoice.status === 'OVERDUE' ? 'danger' : 'warning'
                        }>
                          {invoice.status}
                        </Badge>
                      </td>
                      <td>
                        <Button size="sm" variant="outline-primary" href={`/invoices/${invoice.id}`}>
                          View
                        </Button>
                        {invoice.status !== 'PAID' && (
                          <Button size="sm" variant="outline-success" className="ms-1" href={`/payments/new?invoice=${invoice.id}`}>
                            <i className="bi bi-credit-card me-1"></i>
                            Pay
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Financial Summary */}
        <Col lg={4} className="mb-4">
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Financial Summary</Card.Title>
            </Card.Header>
            <Card.Body>
              {dashboardData.invoices.overdue > 0 && (
                <Alert variant="danger" className="mb-3">
                  <Alert.Heading>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Overdue Invoices
                  </Alert.Heading>
                  <p className="mb-0">
                    {dashboardData.invoices.overdue} invoices are overdue. Total outstanding: {formatCurrency(dashboardData.payments.outstanding || 0)}
                  </p>
                </Alert>
              )}

              <Alert variant="warning" className="mb-3">
                <Alert.Heading>
                  <i className="bi bi-clock me-2"></i>
                  Pending Payments
                </Alert.Heading>
                <p className="mb-0">
                  {dashboardData.invoices.unpaid} invoices are awaiting payment.
                </p>
              </Alert>

              <Alert variant="success" className="mb-3">
                <Alert.Heading>
                  <i className="bi bi-graph-up me-2"></i>
                  Monthly Performance
                </Alert.Heading>
                <p className="mb-0">
                  Revenue this month: {formatCurrency(dashboardData.payments.this_month || 0)}
                </p>
              </Alert>

              <div className="d-grid gap-2">
                <Button variant="outline-primary" href="/invoices">
                  View All Invoices
                </Button>
                <Button variant="outline-success" href="/payments">
                  Manage Payments
                </Button>
                <Button variant="outline-info" href="/reports">
                  Financial Reports
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Customers */}
      <Card className="mb-4">
        <Card.Header>
          <Card.Title className="mb-0">Top Customers by Revenue</Card.Title>
        </Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Total Invoices</th>
                <th>Total Revenue</th>
                <th>Last Invoice</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData.topCustomers.map((customer, index) => (
                <tr key={customer.id}>
                  <td>
                    <Badge bg="primary" className="me-2">#{index + 1}</Badge>
                    {customer.name}
                  </td>
                  <td>{customer.total_invoices}</td>
                  <td>{formatCurrency(customer.total_revenue)}</td>
                  <td>{new Date(customer.last_invoice_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardFinance;