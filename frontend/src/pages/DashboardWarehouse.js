import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert, ProgressBar } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';

const DashboardWarehouse = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const [warehouseData, setWarehouseData] = useState({
    tasks: {
      pending_orders: 0,
      processing_orders: 0,
      ready_to_ship: 0,
      completed_today: 0,
    },
    inventory: {
      total_reserved: 0,
      today_movements: {
        goods_in: 0,
        goods_out: 0,
      },
      low_stock_count: 0,
    },
    pendingOrders: [],
    recentMovements: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    fetchWarehouseData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchWarehouseData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchWarehouseData = async () => {
    try {
      const [tasksResponse, inventoryResponse, ordersResponse, movementsResponse] = await Promise.all([
        api.get('/dashboard/warehouse'),
        api.get('/product-stock'),
        api.get('/sales-orders'),
        api.get('/activity-logs')
      ]);

      setWarehouseData({
        tasks: tasksResponse.data,
        inventory: inventoryResponse.data,
        pendingOrders: ordersResponse.data.slice(0, 10), // Top 10 pending orders
        recentMovements: movementsResponse.data.slice(0, 5), // Latest 5 movements
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching warehouse data:', error);
      setWarehouseData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getOrderPriorityColor = (orderDate) => {
    const daysDiff = Math.ceil((new Date() - new Date(orderDate)) / (1000 * 60 * 60 * 24));
    if (daysDiff >= 3) return 'danger';
    if (daysDiff >= 1) return 'warning';
    return 'success';
  };

  const getOrderPriorityText = (orderDate) => {
    const daysDiff = Math.ceil((new Date() - new Date(orderDate)) / (1000 * 60 * 60 * 24));
    if (daysDiff >= 3) return 'High';
    if (daysDiff >= 1) return 'Medium';
    return 'Low';
  };

  // Only allow Gudang role to access this dashboard
  if (user?.role?.name !== 'Gudang') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have permission to access this dashboard.</p>
        </Alert>
      </div>
    );
  }

  if (warehouseData.loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Memuat data dashboard gudang...</p>
        </div>
      </div>
    );
  }

  if (warehouseData.error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Dashboard</Alert.Heading>
        <p>{warehouseData.error}</p>
      </Alert>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Dashboard Gudang</h2>
          <p className="text-muted mb-0">Selamat datang, {user?.name || 'Tim Gudang'} - Manajemen Inventaris & Pengiriman</p>
        </div>
        <div>
          <Button variant="success" className="me-2">
            <i className="bi bi-truck me-1"></i>
            Buat Surat Jalan
          </Button>
          <Button variant="outline-primary" size="sm">
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </Button>
        </div>
      </div>

      {/* Task Cards */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">SO Pending</h6>
                <h3 className="mb-0 text-warning">{warehouseData.tasks.pending_orders}</h3>
                <small className="text-muted">Perlu diproses</small>
              </div>
              <div className="ms-3">
                <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-clock-history text-warning fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Sedang Proses</h6>
                <h3 className="mb-0 text-primary">{warehouseData.tasks.processing_orders}</h3>
                <small className="text-muted">Sedang disiapkan</small>
              </div>
              <div className="ms-3">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-gear text-primary fs-4"></i>
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
                <h3 className="mb-0 text-success">{warehouseData.tasks.ready_to_ship}</h3>
                <small className="text-muted">Siap dikirim</small>
              </div>
              <div className="ms-3">
                <div className="bg-success bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-check2-circle text-success fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Selesai Hari Ini</h6>
                <h3 className="mb-0 text-info">{warehouseData.tasks.completed_today}</h3>
                <small className="text-muted">Telah selesai</small>
              </div>
              <div className="ms-3">
                <div className="bg-info bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-check-circle text-info fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Inventory Summary */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h6 className="mb-0">Ringkasan Inventaris</h6>
            </Card.Header>
            <Card.Body>
              <Row className="text-center">
                <Col>
                  <div className="mb-2">
                    <h4 className="text-warning mb-1">{warehouseData.inventory.total_reserved}</h4>
                    <small className="text-muted">Stok Reserved</small>
                  </div>
                  <div className="text-muted">
                    <small>Total barang yang dikunci untuk SO</small>
                  </div>
                </Col>
                <Col>
                  <div className="mb-2">
                    <h4 className="text-success mb-1">{warehouseData.inventory.today_movements.goods_in}</h4>
                    <small className="text-muted">Barang Masuk</small>
                  </div>
                  <div className="text-muted">
                    <small>Goods Receipt hari ini</small>
                  </div>
                </Col>
                <Col>
                  <div className="mb-2">
                    <h4 className="text-danger mb-1">{warehouseData.inventory.today_movements.goods_out}</h4>
                    <small className="text-muted">Barang Keluar</small>
                  </div>
                  <div className="text-muted">
                    <small>Delivery Order hari ini</small>
                  </div>
                </Col>
                <Col>
                  <div className="mb-2">
                    <h4 className="text-secondary mb-1">{warehouseData.inventory.low_stock_count}</h4>
                    <small className="text-muted">Stok Rendah</small>
                  </div>
                  <div className="text-muted">
                    <small>Item perlu diisi ulang</small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Pending Sales Orders */}
        <Col lg={8} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Tugas Harian - SO Pending</h6>
                <div>
                  <Button variant="outline-success" size="sm" className="me-2">
                    <i className="bi bi-file-earmark-text me-1"></i>
                    Cetak Picking List
                  </Button>
                  <Button variant="outline-primary" size="sm">
                    Lihat Semua
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {warehouseData.pendingOrders.length > 0 ? (
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>No. SO</th>
                        <th>Pelanggan</th>
                        <th>Tanggal SO</th>
                        <th>Umur</th>
                        <th>Total Item</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseData.pendingOrders.map((order, index) => (
                        <tr key={index}>
                          <td><small className="fw-bold">{order.so_number}</small></td>
                          <td>{order.customer_name}</td>
                          <td><small>{new Date(order.so_date).toLocaleDateString('id-ID')}</small></td>
                          <td>
                            <small className="text-muted">
                              {Math.ceil((new Date() - new Date(order.so_date)) / (1000 * 60 * 60 * 24))} hari
                            </small>
                          </td>
                          <td><small>{order.total_items || 0} item</small></td>
                          <td>
                            <Badge bg="warning">PENDING</Badge>
                          </td>
                          <td>
                            <Badge bg={getOrderPriorityColor(order.so_date)}>
                              {getOrderPriorityText(order.so_date)}
                            </Badge>
                          </td>
                          <td>
                            <Button variant="outline-primary" size="sm" className="me-1">
                              <i className="bi bi-eye"></i>
                            </Button>
                            <Button variant="outline-success" size="sm" className="me-1">
                              <i className="bi bi-play"></i>
                            </Button>
                            <Button variant="outline-warning" size="sm">
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
                  <i className="bi bi-check-circle text-success fs-1"></i>
                  <p className="text-muted mt-2">Tidak ada SO pending</p>
                  <small className="text-muted">Semua pesanan telah diproses</small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Quick Actions */}
        <Col lg={4} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h6 className="mb-0">Aksi Cepat</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="primary" className="w-100">
                  <i className="bi bi-plus-circle me-2"></i>
                  Proses SO Manual
                </Button>
                <Button variant="outline-primary" className="w-100">
                  <i className="bi bi-clipboard-check me-2"></i>
                  Batch Processing
                </Button>
                <Button variant="outline-success" className="w-100">
                  <i className="bi bi-truck me-2"></i>
                  Buat DO Manual
                </Button>
                <Button variant="outline-warning" className="w-100">
                  <i className="bi bi-search me-2"></i>
                  Cari Lokasi Barang
                </Button>
              </div>

              <hr className="my-3" />

              <div className="text-center">
                <h6 className="text-muted mb-2">Tips</h6>
                <small className="text-muted">
                  Prioritaskan SO yang paling lama (berdasarkan warna priority) untuk meminimalkan keterlambatan pengiriman.
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Stock Movements */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Mutasi Stok Hari Ini</h6>
                <Button variant="outline-primary" size="sm">
                  Lihat Semua Mutasi
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {warehouseData.recentMovements.length > 0 ? (
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>Waktu</th>
                        <th>Jenis</th>
                        <th>No. Dokumen</th>
                        <th>Item</th>
                        <th>Kuantitas</th>
                        <th>Lokasi</th>
                        <th>User</th>
                        <th>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseData.recentMovements.map((movement, index) => (
                        <tr key={index}>
                          <td>
                            <small>{new Date(movement.created_at).toLocaleTimeString('id-ID')}</small>
                          </td>
                          <td>
                            <Badge bg={movement.type === 'IN' ? 'success' : 'danger'}>
                              {movement.type}
                            </Badge>
                          </td>
                          <td><small>{movement.document_number}</small></td>
                          <td>{movement.item_name}</td>
                          <td className="fw-bold">{movement.quantity}</td>
                          <td><small>{movement.location || '-'}</small></td>
                          <td><small>{movement.user_name}</small></td>
                          <td><small>{movement.notes || '-'}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-3">
                  <i className="bi bi-arrows-collapse text-muted fs-1"></i>
                  <p className="text-muted mt-2">Belum ada mutasi stok hari ini</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Warehouse Performance */}
      <Row>
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h6 className="mb-0">Kinerja Hari Ini</h6>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Proses SO</span>
                  <span className="fw-bold text-primary">75%</span>
                </div>
                <ProgressBar variant="primary" now={75} style={{ height: '20px' }} />
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Pengiriman</span>
                  <span className="fw-bold text-success">60%</span>
                </div>
                <ProgressBar variant="success" now={60} style={{ height: '20px' }} />
              </div>
              <div className="text-center">
                <small className="text-muted">
                  Total {warehouseData.tasks.completed_today} SO selesai hari ini
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h6 className="mb-0">Alert Stok</h6>
            </Card.Header>
            <Card.Body>
              <div className="alert alert-warning" role="alert">
                <div className="d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <div className="flex-grow-1">
                    <strong>{warehouseData.inventory.low_stock_count} Item</strong> dengan stok rendah
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Button variant="warning" size="sm">
                  <i className="bi bi-eye me-1"></i>
                  Lihat Item Stok Rendah
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