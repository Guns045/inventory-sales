import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert, ProgressBar } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';

const DashboardMain = () => {
  const { api } = useAPI();
  const { user } = useAuth();

  // Only allow Admin to access this dashboard
  if (user?.role?.name !== 'Admin') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have permission to access this dashboard.</p>
        </Alert>
      </div>
    );
  }
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

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [kpiResponse, criticalResponse, quotationsResponse, ordersResponse, pipelineResponse, salesResponse] = await Promise.all([
        api.get('/dashboard'),
        api.get('/reports/stock'),
        api.get('/quotations?status=draft'),
        api.get('/sales-orders?status=ready_to_ship'),
        api.get('/reports/sales'),
        api.get('/reports/sales')
      ]);

      setDashboardData({
        kpi: kpiResponse.data || {
          total_sales_ytd: 0,
          critical_stocks_count: 0,
          pending_quotations_count: 0,
          ready_to_ship_count: 0,
        },
        critical_stocks: Array.isArray(criticalResponse.data) ? criticalResponse.data.slice(0, 10) : [], // Top 10 critical items
        pending_quotations: Array.isArray(quotationsResponse.data) ? quotationsResponse.data : [],
        ready_to_ship_orders: Array.isArray(ordersResponse.data) ? ordersResponse.data : [],
        sales_pipeline: pipelineResponse.data || {
          draft: 0,
          approved: 0,
          rejected: 0,
        },
        monthly_sales: Array.isArray(salesResponse.data) ? salesResponse.data : [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  };

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
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Dashboard Utama</h2>
          <p className="text-muted mb-0">Ringkasan Eksekutif - Sistem Manajemen Penjualan</p>
        </div>
        <div>
          <Button variant="outline-primary" size="sm" className="me-2">
            <i className="bi bi-download me-1"></i>
            Export Laporan
          </Button>
          <Button variant="primary" size="sm">
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Total Penjualan YTD</h6>
                <h3 className="mb-0 text-primary">{formatCurrency(dashboardData.kpi.total_sales_ytd)}</h3>
                <small className="text-success">
                  <i className="bi bi-arrow-up"></i> 12.5% vs tahun lalu
                </small>
              </div>
              <div className="ms-3">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-currency-dollar text-primary fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Stok Kritis</h6>
                <h3 className="mb-0 text-danger">{dashboardData.kpi.critical_stocks_count}</h3>
                <small className="text-muted">Item perlu segera diisi</small>
              </div>
              <div className="ms-3">
                <div className="bg-danger bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-exclamation-triangle text-danger fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Penawaran Pending</h6>
                <h3 className="mb-0 text-warning">{dashboardData.kpi.pending_quotations_count}</h3>
                <small className="text-muted">Menunggu persetujuan</small>
              </div>
              <div className="ms-3">
                <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-file-text text-warning fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Siap Kirim</h6>
                <h3 className="mb-0 text-success">{dashboardData.kpi.ready_to_ship_count}</h3>
                <small className="text-muted">Pesanan siap dikirim</small>
              </div>
              <div className="ms-3">
                <div className="bg-success bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-truck text-success fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Critical Stocks */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Stok Kritis</h6>
                <Button variant="outline-primary" size="sm">
                  Lihat Semua
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {dashboardData.critical_stocks.length > 0 ? (
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>Kode Item</th>
                        <th>Nama Item</th>
                        <th>Stok Aktual</th>
                        <th>Minimum</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.critical_stocks.map((item, index) => (
                        <tr key={index}>
                          <td><small>{item.item_code}</small></td>
                          <td>{item.item_name}</td>
                          <td>
                            <Badge bg="danger">{item.stock_actual}</Badge>
                          </td>
                          <td>{item.stock_minimum}</td>
                          <td>
                            <ProgressBar
                              variant="danger"
                              now={(item.stock_actual / item.stock_minimum) * 100}
                              style={{ height: '4px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-3">
                  <i className="bi bi-check-circle text-success fs-1"></i>
                  <p className="text-muted mt-2">Tidak ada stok kritis</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Sales Pipeline */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Pipeline Penjualan</h6>
                <Button variant="outline-primary" size="sm">
                  Detail
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <Row className="text-center">
                <Col>
                  <div className="mb-3">
                    <h4 className="text-secondary mb-1">{dashboardData.sales_pipeline.draft}</h4>
                    <small className="text-muted">Draft</small>
                  </div>
                  <ProgressBar variant="secondary" now={30} />
                </Col>
                <Col>
                  <div className="mb-3">
                    <h4 className="text-success mb-1">{dashboardData.sales_pipeline.approved}</h4>
                    <small className="text-muted">Approved</small>
                  </div>
                  <ProgressBar variant="success" now={50} />
                </Col>
                <Col>
                  <div className="mb-3">
                    <h4 className="text-danger mb-1">{dashboardData.sales_pipeline.rejected}</h4>
                    <small className="text-muted">Rejected</small>
                  </div>
                  <ProgressBar variant="danger" now={20} />
                </Col>
              </Row>

              <div className="mt-3">
                <small className="text-muted">
                  Total Pipeline: {dashboardData.sales_pipeline.draft + dashboardData.sales_pipeline.approved + dashboardData.sales_pipeline.rejected} Penawaran
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Pending Quotations */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Penawaran Menunggu Persetujuan</h6>
                <Button variant="outline-primary" size="sm">
                  Proses Sekarang
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {dashboardData.pending_quotations.length > 0 ? (
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>No. Quotation</th>
                        <th>Pelanggan</th>
                        <th>Tanggal</th>
                        <th>Total</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.pending_quotations.slice(0, 5).map((quotation, index) => (
                        <tr key={index}>
                          <td><small>{quotation.quotation_number}</small></td>
                          <td>{quotation.customer_name}</td>
                          <td><small>{new Date(quotation.date).toLocaleDateString('id-ID')}</small></td>
                          <td>{formatCurrency(quotation.total)}</td>
                          <td>
                            <Button variant="outline-primary" size="sm">
                              <i className="bi bi-eye"></i>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-3">
                  <i className="bi bi-check-circle text-success fs-1"></i>
                  <p className="text-muted mt-2">Tidak ada penawaran pending</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Ready to Ship */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Pesanan Siap Kirim</h6>
                <Button variant="outline-success" size="sm">
                  Buat Surat Jalan
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {dashboardData.ready_to_ship_orders.length > 0 ? (
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>No. SO</th>
                        <th>Pelanggan</th>
                        <th>Tanggal SO</th>
                        <th>Total</th>
                        <th>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.ready_to_ship_orders.slice(0, 5).map((order, index) => (
                        <tr key={index}>
                          <td><small>{order.so_number}</small></td>
                          <td>{order.customer_name}</td>
                          <td><small>{new Date(order.so_date).toLocaleDateString('id-ID')}</small></td>
                          <td>{formatCurrency(order.total)}</td>
                          <td>
                            <Badge bg={index === 0 ? "danger" : index < 3 ? "warning" : "success"}>
                              {index === 0 ? "High" : index < 3 ? "Medium" : "Low"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-3">
                  <i className="bi bi-info-circle text-info fs-1"></i>
                  <p className="text-muted mt-2">Tidak ada pesanan siap kirim</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Monthly Sales Chart */}
      <Row>
        <Col lg={12} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Grafik Penjualan Bulanan</h6>
                <div>
                  <Button variant="outline-primary" size="sm" className="me-2">
                    <i className="bi bi-download"></i>
                  </Button>
                  <Button variant="outline-primary" size="sm">
                    <i className="bi bi-fullscreen"></i>
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="text-center py-5">
                <i className="bi bi-bar-chart-line text-muted fs-1"></i>
                <p className="text-muted mt-2">Grafik penjualan akan ditampilkan di sini</p>
                <small className="text-muted">Integrasi dengan chart library (Chart.js/Recharts) diperlukan</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardMain;