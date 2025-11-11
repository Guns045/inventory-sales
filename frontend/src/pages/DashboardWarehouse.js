import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';
import './DashboardWarehouse.css';

const DashboardWarehouse = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const [warehouseData, setWarehouseData] = useState({
    pending_orders: 0,
    processing_orders: 0,
    ready_to_ship: 0,
    pendingOrders: [],
    loading: true,
    error: null
  });

  const [loading, setLoading] = useState(false);
  const [userWarehouse, setUserWarehouse] = useState(null);
  const [warehouseStats, setWarehouseStats] = useState({
    total_products: 0,
    low_stock_items: 0,
    pending_transfers: 0,
    recent_activities: []
  });

  useEffect(() => {
    fetchWarehouseData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWarehouseData = async () => {
    try {
      // Get user warehouse info
      let warehouseInfo = null;
      if (user?.warehouse_id) {
        try {
          const warehouseResponse = await api.get(`/warehouses/${user.warehouse_id}`);
          warehouseInfo = warehouseResponse.data;
          setUserWarehouse(warehouseInfo);
        } catch (error) {
          console.error('Error fetching warehouse info:', error);
        }
      }

      // Build warehouse filter for API calls
      const warehouseFilter = user?.warehouse_id
        ? `&warehouse_id=${user.warehouse_id}`
        : '';

      const [ordersResponse, stocksResponse, transfersResponse] = await Promise.allSettled([
        api.get(`/sales-orders?status=PENDING${warehouseFilter}`),
        api.get(`/product-stock${warehouseFilter ? `?${warehouseFilter.substring(1)}` : ''}`),
        api.get(`/warehouse-transfers${warehouseFilter}`)
      ]);

      const pendingOrders = ordersResponse.status === 'fulfilled'
        ? (Array.isArray(ordersResponse.value.data)
            ? ordersResponse.value.data
            : ordersResponse.value.data?.data || [])
        : [];

      const stocksData = stocksResponse.status === 'fulfilled'
        ? (Array.isArray(stocksResponse.value.data)
            ? stocksResponse.value.data
            : stocksResponse.value.data?.data || [])
        : [];

      const transfersData = transfersResponse.status === 'fulfilled'
        ? (Array.isArray(transfersResponse.value.data)
            ? transfersResponse.value.data
            : transfersResponse.value.data?.data || [])
        : [];

      // Calculate warehouse statistics
      const stats = {
        total_products: stocksData.length,
        low_stock_items: stocksData.filter(stock =>
          stock.quantity <= (stock.min_stock_level || 50)
        ).length,
        pending_transfers: transfersData.filter(transfer =>
          ['REQUESTED', 'APPROVED'].includes(transfer.status)
        ).length,
        recent_activities: []
      };

      setWarehouseStats(stats);
      setWarehouseData({
        pending_orders: pendingOrders.length,
        processing_orders: 0,
        ready_to_ship: 0,
        pendingOrders: pendingOrders.slice(0, 5),
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

  const handleProcessOrder = async (orderId) => {
    try {
      setLoading(true);
      alert('✅ Order siap diproses! Silakan buka menu "Picking Lists" → Tab "Pending Orders" untuk membuat dokumen Picking List.');
    } catch (error) {
      console.error('Error processing order:', error);
      alert('❌ Terjadi kesalahan: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Check if user has warehouse access
  const warehouseRoles = [
    'Super Admin',
    'Admin',
    'Admin Jakarta',
    'Admin Makassar',
    'Manager Jakarta',
    'Manager Makassar',
    'Warehouse Staff'
  ];

  if (!warehouseRoles.includes(user?.role?.name)) {
    return (
      <div className="text-center mt-5">
        <Alert variant="danger">
          <i className="bi bi-shield-exclamation me-2"></i>
          Akses Ditolak - Hanya untuk role Warehouse Management
          <br />
          <small>Role Anda: {user?.role?.name || 'Tidak diketahui'}</small>
        </Alert>
      </div>
    );
  }

  if (warehouseData.loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Memuat data...</p>
      </div>
    );
  }

  if (warehouseData.error) {
    return (
      <Alert variant="danger">
        Error: {warehouseData.error}
      </Alert>
    );
  }

  // Warehouse header component
  const WarehouseHeader = ({ warehouse }) => (
    <Card className="mb-4 border-primary">
      <Card.Body>
        <Row>
          <Col>
            <h4 className="mb-1">
              <i className="bi bi-building me-2"></i>
              {warehouse?.name || 'Dashboard Gudang'}
              {warehouse?.code && (
                <Badge
                  bg={
                    warehouse.code === 'JKT' ? 'danger' :
                    warehouse.code === 'MKS' ? 'success' :
                    'primary'
                  }
                  className="ms-2"
                >
                  {warehouse.code}
                </Badge>
              )}
            </h4>
            <p className="text-muted mb-0">
              <i className="bi bi-geo-alt me-1"></i>
              {warehouse?.location || 'System-wide view'}
            </p>
          </Col>
          <Col className="text-end">
            <div className="d-flex flex-column align-items-end">
              <small className="text-muted">Role Anda</small>
              <Badge bg="info">{user?.role?.name}</Badge>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  return (
    <div>
      <WarehouseHeader warehouse={userWarehouse} />

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card>
            <Card.Body className="text-center">
              <h3 className="text-warning">{warehouseData.pending_orders}</h3>
              <p className="mb-0">Sales Orders Pending</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card>
            <Card.Body className="text-center">
              <h3 className="text-info">{warehouseStats.total_products}</h3>
              <p className="mb-0">Total Produk</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card>
            <Card.Body className="text-center">
              <h3 className="text-danger">{warehouseStats.low_stock_items}</h3>
              <p className="mb-0">Stok Menipis</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} className="mb-3">
          <Card>
            <Card.Body className="text-center">
              <h3 className="text-success">{warehouseStats.pending_transfers}</h3>
              <p className="mb-0">Transfer Pending</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Pending Orders Table */}
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              Sales Orders Pending
              {userWarehouse && (
                <Badge bg="secondary" className="ms-2">
                  {userWarehouse.code}
                </Badge>
              )}
            </h5>
            <small className="text-muted">
              {userWarehouse ? 'Warehouse spesifik' : 'Semua Warehouse'}
            </small>
          </div>
        </Card.Header>
        <Card.Body>
          {warehouseData.pendingOrders.length > 0 ? (
            <Table responsive>
              <thead>
                <tr>
                  <th>No. SO</th>
                  <th>Pelanggan</th>
                  <th>Total</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {warehouseData.pendingOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.sales_order_number}</td>
                    <td>{order.customer?.company_name || '-'}</td>
                    <td>{formatCurrency(order.total_amount)}</td>
                    <td>{new Date(order.created_at).toLocaleDateString('id-ID')}</td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleProcessOrder(order.id)}
                        disabled={loading}
                      >
                        <i className="bi bi-clipboard-plus me-1"></i>
                        Buat PL
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-center text-muted">Tidak ada sales orders pending</p>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardWarehouse;