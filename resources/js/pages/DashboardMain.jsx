import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert, ProgressBar } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';
import './DashboardMain.css';

const DashboardMain = () => {
  const { api } = useAPI();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState({
    kpi: {
      total_sales_ytd: 0,
      critical_stocks_count: 0,
      pending_quotations_count: 0,
      ready_to_ship_count: 0,
    },
    critical_stocks: [],
    pending_quotations: [],
    ready_to_ship_orders: [],
    sales_pipeline: {
      draft: 0,
      approved: 0,
      rejected: 0,
    },
    monthly_sales: [],
    loading: true,
    error: null
  });

  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }));

      // Use Promise.allSettled to handle partial failures
      const [kpiResponse, criticalResponse, quotationsResponse, ordersResponse, pipelineResponse, salesResponse] = await Promise.allSettled([
        api.get('/dashboard'),
        api.get('/reports/stock'),
        api.get('/quotations?status=SUBMITTED'),
        api.get('/sales-orders?status=ready_to_ship'),
        api.get('/reports/sales'),
        api.get('/reports/sales')
      ]);

      // Get data from fulfilled promises, use defaults for rejected ones
      const kpiData = kpiResponse.status === 'fulfilled' ? kpiResponse.value.data : {
        summary: {
          total_sales_ytd: 0,
          critical_stocks: 0,
          pending_quotations_count: 0,
          ready_to_ship_count: 0,
        }
      };

      const criticalData = criticalResponse.status === 'fulfilled' ? criticalResponse.value.data : [];
      const quotationsData = quotationsResponse.status === 'fulfilled' ? quotationsResponse.value.data.data || quotationsResponse.value.data : [];
      const ordersData = ordersResponse.status === 'fulfilled' ? ordersResponse.value.data.data || ordersResponse.value.data : [];
      const pipelineData = pipelineResponse.status === 'fulfilled' ? pipelineResponse.value.data : { draft: 0, approved: 0, rejected: 0 };
      const salesData = salesResponse.status === 'fulfilled' ? salesResponse.value.data : [];

      // Map admin dashboard data structure to DashboardMain format
      const mappedKpi = kpiData.summary || kpiData;

      setDashboardData({
        kpi: {
          total_sales_ytd: mappedKpi.this_month_sales || mappedKpi.total_sales_ytd || 0,
          critical_stocks_count: mappedKpi.critical_stocks || 0,
          pending_quotations_count: Array.isArray(quotationsData) ? quotationsData.length : 0,
          ready_to_ship_count: mappedKpi.ready_to_ship || 0,
        },
        critical_stocks: Array.isArray(criticalData.low_stock_products) ? criticalData.low_stock_products.slice(0, 10).map(item => ({
          item_code: item.sku || '',
          item_name: item.product?.description || item.description || '',
          stock_actual: item.quantity || 0,
          stock_minimum: item.min_stock_level || 0
        })) : Array.isArray(criticalData) ? criticalData.slice(0, 10).map(item => ({
          item_code: item.sku || '',
          item_name: item.product?.description || item.description || '',
          stock_actual: item.quantity || 0,
          stock_minimum: item.min_stock_level || 0
        })) : [],
        pending_quotations: Array.isArray(quotationsData) ? quotationsData.slice(0, 10) : [],
        ready_to_ship_orders: Array.isArray(ordersData) ? ordersData.slice(0, 10).map(order => ({
          so_number: order.sales_order_number || `SO-${order.id}`,
          customer_name: order.customer?.company_name || order.customer?.name || 'Unknown',
          total: order.total_amount || 0,
          so_date: order.created_at
        })) : [],
        sales_pipeline: {
          draft: pipelineData.draft || 0,
          approved: pipelineData.approved || 0,
          rejected: pipelineData.rejected || 0,
        },
        monthly_sales: Array.isArray(salesData) ? salesData.slice(0, 6) : [],
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data. Please try again.'
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Only allow Admin roles to access this dashboard
  if (!user?.role?.name || (!['Super Admin', 'Admin', 'Admin Jakarta', 'Admin Makassar', 'Manager Jakarta', 'Manager Makassar'].includes(user.role.name))) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have permission to access this dashboard.</p>
          <p className="mb-0">Your role: {user?.role?.name || 'Unknown'}</p>
        </Alert>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (dashboardData.loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Dashboard</Alert.Heading>
        <p>{dashboardData.error}</p>
      </Alert>
    );
  }

  return (
    <div className="dashboard-main p-3 p-lg-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 mb-lg-5">
        <div className="mb-3 mb-md-0">
          <h1 className="h2 fw-bold mb-2">Dashboard Utama</h1>
          <p className="text-muted mb-0">Ringkasan Eksekutif - Sistem Manajemen Penjualan</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-primary" size="sm" onClick={fetchDashboardData}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards - 3 Cards Layout */}
      <Row className="g-3 g-md-4 mb-4">
        <Col xs={12} md={4}>
          <Card className="border-0 shadow-sm h-100 hover-lift">
            <Card.Body className="d-flex align-items-center p-3 p-md-4">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2 mb-md-3 small text-uppercase">Total Penjualan YTD</h6>
                <h2 className="mb-2 mb-md-2 text-primary fw-bold fs-3 fs-2">{formatCurrency(dashboardData.kpi.total_sales_ytd)}</h2>
                <small className="text-success d-flex align-items-center">
                  <i className="bi bi-arrow-up me-1"></i> 12.5% vs tahun lalu
                </small>
              </div>
              <div className="ms-3">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-currency-dollar text-primary fs-3 fs-2"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4}>
          <Card className="border-0 shadow-sm h-100 hover-lift">
            <Card.Body className="d-flex align-items-center p-3 p-md-4">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2 mb-md-3 small text-uppercase">Penawaran Pending</h6>
                <h2 className="mb-2 mb-md-2 text-warning fw-bold fs-3 fs-2">{dashboardData.kpi.pending_quotations_count}</h2>
                <small className="text-muted">Menunggu persetujuan</small>
              </div>
              <div className="ms-3">
                <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-file-text text-warning fs-3 fs-2"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4}>
          <Card className="border-0 shadow-sm h-100 hover-lift">
            <Card.Body className="d-flex align-items-center p-3 p-md-4">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2 mb-md-3 small text-uppercase">Siap Kirim</h6>
                <h2 className="mb-2 mb-md-2 text-success fw-bold fs-3 fs-2">{dashboardData.kpi.ready_to_ship_count}</h2>
                <small className="text-muted">Pesanan siap dikirim</small>
              </div>
              <div className="ms-3">
                <div className="bg-success bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-truck text-success fs-3 fs-2"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Monthly Sales Chart */}
      <Row className="g-2 g-md-3 mb-4">
        <Col xs={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 px-2 px-md-3 pt-2 pt-md-3 pb-2">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                <h5 className="mb-2 mb-md-0 fw-semibold">Grafik Penjualan Bulanan</h5>
                <div className="d-flex gap-2">
                  <Button variant="outline-primary" size="sm">
                    <i className="bi bi-download"></i>
                  </Button>
                  <Button variant="outline-primary" size="sm">
                    <i className="bi bi-fullscreen"></i>
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-3 p-md-4">
              <div className="text-center py-4 py-md-5">
                <i className="bi bi-bar-chart-line text-muted fs-2 fs-md-1"></i>
                <p className="text-muted mt-3 mb-0">Grafik penjualan akan ditampilkan di sini</p>
                <small className="text-muted">Integrasi dengan chart library (Chart.js/Recharts) diperlukan</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Critical Stocks */}
      <Row className="g-2 g-md-3">
        <Col xs={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 px-2 px-md-3 pt-2 pt-md-3 pb-2">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <h3 className="mb-1 fw-bold text-danger">Critical Stocks</h3>
                  </div>
                  <div>
                    <Button variant="outline-primary" size="sm" onClick={() => window.location.href = '/dashboard/product-stock'}>
                      Lihat Semua
                    </Button>
                  </div>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-2 p-md-3">
              {dashboardData.critical_stocks.length > 0 ? (
                <div className="table-responsive">
                  <Table hover className="table-sm">
                    <thead>
                      <tr>
                        <th className="small text-uppercase">Part Number</th>
                        <th className="small text-uppercase">Description</th>
                        <th className="small text-uppercase text-center">Available Stock</th>
                        <th className="small text-uppercase text-center">Minimum Stock</th>
                        <th className="small text-uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.critical_stocks.map((item, index) => (
                        <tr key={index}>
                          <td className="small fw-medium">{item.item_code}</td>
                          <td className="small">{item.item_name}</td>
                          <td className="text-center">
                            <Badge bg="danger" className="px-2 py-1">{item.stock_actual}</Badge>
                          </td>
                          <td className="text-center small">{item.stock_minimum}</td>
                          <td>
                            <ProgressBar
                              variant="danger"
                              now={(item.stock_actual / item.stock_minimum) * 100}
                              style={{ height: '6px' }}
                              className="rounded-pill"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-3 py-md-4">
                  <i className="bi bi-check-circle text-success fs-2 fs-md-1"></i>
                  <p className="text-muted mt-3 mb-0">Tidak ada stok kritis</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardMain;