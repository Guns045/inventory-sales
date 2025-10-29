import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';

const DashboardSales = () => {
  const { api } = useAPI();
  const [dashboardData, setDashboardData] = useState({
    quotations: { draft: 0, approved: 0, rejected: 0 },
    salesOrders: { pending: 0, processing: 0, completed: 0 },
    invoices: { paid: 0, unpaid: 0 },
    recentQuotations: [],
    recentSalesOrders: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSalesDashboard();
  }, []);

  const fetchSalesDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/dashboard/sales');

      // Ensure we have default values if data is missing
      const data = response.data || {};
      setDashboardData({
        quotations: data.quotations || { draft: 0, approved: 0, rejected: 0 },
        salesOrders: data.sales_orders || { pending: 0, processing: 0, completed: 0 },
        invoices: data.invoices || { paid: 0, unpaid: 0 },
        recentQuotations: data.recent_quotations || [],
        recentSalesOrders: data.recent_sales_orders || []
      });
    } catch (error) {
      console.error('Error fetching sales dashboard:', error);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchSalesDashboard}>
            Try Again
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2>Sales Dashboard</h2>
      </div>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-file-text text-primary fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{dashboardData.quotations.draft}</h4>
              <Card.Text className="text-muted">Draft Quotations</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-check-circle text-success fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{dashboardData.quotations.approved}</h4>
              <Card.Text className="text-muted">Approved Quotations</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-cart-check text-warning fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{dashboardData.salesOrders.pending}</h4>
              <Card.Text className="text-muted">Pending Sales Orders</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-receipt text-info fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{dashboardData.invoices.unpaid}</h4>
              <Card.Text className="text-muted">Unpaid Invoices</Card.Text>
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
            <Button variant="primary" href="/quotations?action=new">
              <i className="bi bi-plus-circle me-2"></i>
              Create Quotation
            </Button>
            <Button variant="outline-primary" href="/quotations?status=draft">
              <i className="bi bi-pencil-square me-2"></i>
              Manage Drafts
            </Button>
            <Button variant="outline-success" href="/quotations?status=approved">
              <i className="bi bi-check-circle me-2"></i>
              Convert to SO
            </Button>
            <Button variant="outline-info" href="/stock">
              <i className="bi bi-archive me-2"></i>
              Check Stock
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Recent Quotations */}
      <Row>
        <Col lg={8} className="mb-4">
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Recent Quotations</Card.Title>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Quotation #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recentQuotations.map((quotation) => (
                    <tr key={quotation.id}>
                      <td>{quotation.quotation_number}</td>
                      <td>{quotation.customer_name}</td>
                      <td>Rp {quotation.total_amount.toLocaleString()}</td>
                      <td>
                        <Badge bg={
                          quotation.status === 'DRAFT' ? 'secondary' :
                          quotation.status === 'APPROVED' ? 'success' : 'danger'
                        }>
                          {quotation.status}
                        </Badge>
                      </td>
                      <td>
                        <Button size="sm" variant="outline-primary" href={`/quotations/${quotation.id}`}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4} className="mb-4">
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Sales Activities</Card.Title>
            </Card.Header>
            <Card.Body>
              <Alert variant="info" className="mb-3">
                <Alert.Heading>
                  <i className="bi bi-info-circle me-2"></i>
                  Pending Approvals
                </Alert.Heading>
                <p className="mb-0">
                  You have {dashboardData.quotations.draft} quotations waiting for approval.
                </p>
              </Alert>

              <Alert variant="success" className="mb-3">
                <Alert.Heading>
                  <i className="bi bi-check-circle me-2"></i>
                  Ready to Convert
                </Alert.Heading>
                <p className="mb-0">
                  {dashboardData.quotations.approved} approved quotations can be converted to Sales Orders.
                </p>
              </Alert>

              <div className="d-grid gap-2">
                <Button variant="outline-primary" href="/quotations">
                  View All Quotations
                </Button>
                <Button variant="outline-success" href="/sales-orders">
                  View Sales Orders
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardSales;