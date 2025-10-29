import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';

const DashboardWarehouse = () => {
  const { api } = useAPI();
  const [dashboardData, setDashboardData] = useState({
    salesOrders: { pending: 0, processing: 0, ready: 0 },
    deliveryOrders: { preparing: 0, shipped: 0, delivered: 0 },
    lowStockItems: [],
    pendingPickings: [],
    recentDeliveries: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWarehouseDashboard();
  }, []);

  const fetchWarehouseDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/dashboard/warehouse');

      // Ensure we have default values if data is missing
      const data = response.data || {};
      setDashboardData({
        salesOrders: data.sales_orders || { pending: 0, processing: 0, ready: 0 },
        deliveryOrders: data.delivery_orders || { preparing: 0, shipped: 0, delivered: 0 },
        lowStockItems: data.low_stock_items || [],
        pendingPickings: data.pending_pickings || [],
        recentDeliveries: data.recent_deliveries || []
      });
    } catch (error) {
      console.error('Error fetching warehouse dashboard:', error);
      setError('Failed to load warehouse dashboard data. Please try again later.');
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
        <p className="mt-3">Loading warehouse dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchWarehouseDashboard}>
            Try Again
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Warehouse Dashboard</h2>
        <Button variant="primary">
          <i className="bi bi-truck me-2"></i>
          New Delivery Order
        </Button>
      </div>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-clock-history text-warning fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{dashboardData.salesOrders.pending}</h4>
              <Card.Text className="text-muted">Pending SO</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-gear text-primary fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{dashboardData.salesOrders.processing}</h4>
              <Card.Text className="text-muted">Processing</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-truck text-success fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{dashboardData.deliveryOrders.preparing}</h4>
              <Card.Text className="text-muted">Ready to Ship</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card className="text-center">
            <Card.Body>
              <Card.Title>
                <i className="bi bi-exclamation-triangle text-danger fs-3"></i>
              </Card.Title>
              <h4 className="mb-2">{dashboardData.lowStockItems.length}</h4>
              <Card.Text className="text-muted">Low Stock Items</Card.Text>
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
            <Button variant="primary" href="/sales-orders?status=pending">
              <i className="bi bi-list-check me-2"></i>
              Process Pending SO
            </Button>
            <Button variant="outline-primary" href="/delivery-orders?action=new">
              <i className="bi bi-truck me-2"></i>
              Create Delivery Order
            </Button>
            <Button variant="outline-warning" href="/stock">
              <i className="bi bi-archive me-2"></i>
              Check Stock Levels
            </Button>
            <Button variant="outline-success" href="/goods-receipts?action=new">
              <i className="bi bi-receipt-cutoff me-2"></i>
              Receive Goods
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Pending Pickings */}
      <Row>
        <Col lg={8} className="mb-4">
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Sales Orders Ready for Picking</Card.Title>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>SO #</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Priority</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.pendingPickings.map((so) => (
                    <tr key={so.id}>
                      <td>{so.sales_order_number}</td>
                      <td>{so.customer_name}</td>
                      <td>{so.total_items} items</td>
                      <td>
                        <Badge bg={so.priority === 'HIGH' ? 'danger' : so.priority === 'MEDIUM' ? 'warning' : 'info'}>
                          {so.priority}
                        </Badge>
                      </td>
                      <td>
                        <Button size="sm" variant="outline-primary" href={`/sales-orders/${so.id}`}>
                          <i className="bi bi-eye me-1"></i>
                          View
                        </Button>
                        <Button size="sm" variant="outline-success" className="ms-1" href={`/delivery-orders/create?so=${so.id}`}>
                          <i className="bi bi-truck me-1"></i>
                          Ship
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
              <Card.Title className="mb-0">Warehouse Alerts</Card.Title>
            </Card.Header>
            <Card.Body>
              {dashboardData.lowStockItems.length > 0 && (
                <Alert variant="danger" className="mb-3">
                  <Alert.Heading>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Low Stock Alert
                  </Alert.Heading>
                  <p className="mb-0">
                    {dashboardData.lowStockItems.length} items are running low on stock.
                  </p>
                </Alert>
              )}

              <Alert variant="warning" className="mb-3">
                <Alert.Heading>
                  <i className="bi bi-clock-history me-2"></i>
                  Pending Orders
                </Alert.Heading>
                <p className="mb-0">
                  {dashboardData.salesOrders.pending} sales orders are waiting to be processed.
                </p>
              </Alert>

              <Alert variant="info" className="mb-3">
                <Alert.Heading>
                  <i className="bi bi-truck me-2"></i>
                  Ready for Delivery
                </Alert.Heading>
                <p className="mb-0">
                  {dashboardData.salesOrders.ready} orders are ready for shipment.
                </p>
              </Alert>

              <div className="d-grid gap-2">
                <Button variant="outline-primary" href="/sales-orders">
                  View All Sales Orders
                </Button>
                <Button variant="outline-warning" href="/delivery-orders">
                  Manage Deliveries
                </Button>
                <Button variant="outline-danger" href="/stock?filter=low">
                  View Low Stock Items
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardWarehouse;