import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockProducts: 0,
    pendingQuotations: 0,
    pendingSalesOrders: 0,
    totalCustomers: 0,
    totalSuppliers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Mock data untuk saat ini
      setTimeout(() => {
        setStats({
          totalProducts: 150,
          lowStockProducts: 8,
          pendingQuotations: 5,
          pendingSalesOrders: 12,
          totalCustomers: 45,
          totalSuppliers: 15
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const activities = [
    { time: '2 jam lalu', desc: 'Penawaran #Q-2024-10-001 telah disetujui' },
    { time: '4 jam lalu', desc: 'Stok Part-ABC-001 hampir habis (sisa 3 unit)' },
    { time: '6 jam lalu', desc: 'Sales Order #SO-2024-10-001 telah dikirim' },
    { time: '8 jam lalu', desc: 'Invoice #INV-2024-10-001 telah dibuat' },
    { time: '1 hari lalu', desc: 'Produk baru ditambahkan: Hydraulic Pump' }
  ];

  const quickActions = [
    {
      title: 'Buat Penawaran',
      desc: 'Buat penawaran baru untuk pelanggan',
      icon: 'bi-file-plus',
      link: '/quotations',
      color: 'primary'
    },
    {
      title: 'Tambah Produk',
      desc: 'Tambah produk baru ke inventaris',
      icon: 'bi-plus-circle',
      link: '/products',
      color: 'success'
    },
    {
      title: 'Buat Invoice',
      desc: 'Buat invoice untuk pesanan',
      icon: 'bi-receipt',
      link: '/invoices',
      color: 'info'
    },
    {
      title: 'Stok Opname',
      desc: 'Lakukan pengecekan stok',
      icon: 'bi-clipboard-check',
      link: '/product-stock',
      color: 'warning'
    }
  ];

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

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Dashboard</h2>
          <p className="text-muted mb-0">Ringkasan Sistem Manajemen Inventaris & Penjualan</p>
        </div>
        <Button variant="outline-primary">
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col xs={12} sm={6} lg={4} xl={2} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon products mx-auto mb-3">
                <i className="bi bi-box fs-3"></i>
              </div>
              <h3 className="mb-1">{stats.totalProducts}</h3>
              <p className="text-muted mb-0">Total Produk</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4} xl={2} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon low-stock mx-auto mb-3">
                <i className="bi bi-exclamation-triangle fs-3"></i>
              </div>
              <h3 className="mb-1">{stats.lowStockProducts}</h3>
              <p className="text-muted mb-0">Stok Menipis</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4} xl={2} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon quotations mx-auto mb-3">
                <i className="bi bi-file-text fs-3"></i>
              </div>
              <h3 className="mb-1">{stats.pendingQuotations}</h3>
              <p className="text-muted mb-0">Penawaran Pending</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4} xl={2} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon orders mx-auto mb-3">
                <i className="bi bi-cart fs-3"></i>
              </div>
              <h3 className="mb-1">{stats.pendingSalesOrders}</h3>
              <p className="text-muted mb-0">Pesanan Pending</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4} xl={2} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon customers mx-auto mb-3">
                <i className="bi bi-people fs-3"></i>
              </div>
              <h3 className="mb-1">{stats.totalCustomers}</h3>
              <p className="text-muted mb-0">Total Pelanggan</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={4} xl={2} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon suppliers mx-auto mb-3">
                <i className="bi bi-truck fs-3"></i>
              </div>
              <h3 className="mb-1">{stats.totalSuppliers}</h3>
              <p className="text-muted mb-0">Total Supplier</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row>
        {/* Recent Activities */}
        <Col lg={8} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Aktivitas Terkini
              </h5>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                {activities.map((activity, index) => (
                  <ListGroup.Item key={index} className="activity-item px-0">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <p className="mb-1 activity-desc">{activity.desc}</p>
                        <small className="activity-time">{activity.time}</small>
                      </div>
                      <i className="bi bi-chevron-right text-muted"></i>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Actions */}
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-lightning me-2"></i>
                Aksi Cepat
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-3">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    to={action.link}
                    className="text-decoration-none"
                  >
                    <div className="quick-action-card">
                      <i className={`bi ${action.icon} fs-3 text-${action.color}`}></i>
                      <h6 className="mb-2">{action.title}</h6>
                      <p className="text-muted small mb-0">{action.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Additional Info Cards */}
      <Row>
        <Col md={6} className="mb-4">
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-graph-up me-2"></i>
                Performa Penjualan
              </h5>
            </Card.Header>
            <Card.Body>
              <Row className="text-center">
                <Col>
                  <h4 className="text-primary mb-1">Rp 125.5M</h4>
                  <p className="text-muted small mb-0">Total Penjualan Bulan Ini</p>
                </Col>
                <Col>
                  <h4 className="text-success mb-1">+23.5%</h4>
                  <p className="text-muted small mb-0">Pertumbuhan vs Bulan Lalu</p>
                </Col>
                <Col>
                  <h4 className="text-info mb-1">328</h4>
                  <p className="text-muted small mb-0">Total Transaksi</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Peringatan Stok
              </h5>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between align-items-center px-0">
                  <div>
                    <strong>PART-HYD-001</strong>
                    <p className="text-muted small mb-0">Hydraulic Pump</p>
                  </div>
                  <span className="stock-badge low">Stok: 3</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center px-0">
                  <div>
                    <strong>PART-ENG-002</strong>
                    <p className="text-muted small mb-0">Oil Seal 50x65x8</p>
                  </div>
                  <span className="stock-badge low">Stok: 5</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center px-0">
                  <div>
                    <strong>PART-ELE-001</strong>
                    <p className="text-muted small mb-0">Alternator 24V</p>
                  </div>
                  <span className="stock-badge low">Stok: 6</span>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;