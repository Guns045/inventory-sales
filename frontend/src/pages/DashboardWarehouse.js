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

  useEffect(() => {
    fetchWarehouseData();
  }, []);

  const fetchWarehouseData = async () => {
    try {
      const [ordersResponse] = await Promise.allSettled([
        api.get('/sales-orders?status=PENDING'),
      ]);

      if (ordersResponse.status === 'fulfilled') {
        const pendingOrders = Array.isArray(ordersResponse.value.data)
          ? ordersResponse.value.data
          : ordersResponse.value.data?.data || [];

        setWarehouseData({
          pending_orders: pendingOrders.length,
          processing_orders: 0,
          ready_to_ship: 0,
          pendingOrders: pendingOrders.slice(0, 5),
          loading: false,
          error: null
        });
      }
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

  if (user?.role?.name !== 'Gudang') {
    return (
      <div className="text-center mt-5">
        <Alert variant="danger">
          Akses Ditolak - Hanya untuk role Gudang
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

  return (
    <div>
      <h2 className="mb-4">Dashboard Gudang</h2>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <Card>
            <Card.Body className="text-center">
              <h3 className="text-warning">{warehouseData.pending_orders}</h3>
              <p className="mb-0">Sales Orders Pending</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3">
          <Card>
            <Card.Body className="text-center">
              <h3 className="text-primary">{warehouseData.processing_orders}</h3>
              <p className="mb-0">Sedang Diproses</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3">
          <Card>
            <Card.Body className="text-center">
              <h3 className="text-success">{warehouseData.ready_to_ship}</h3>
              <p className="mb-0">Siap Kirim</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Pending Orders Table */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Sales Orders Pending</h5>
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