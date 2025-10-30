import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert, ProgressBar } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';

const DashboardFinance = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const [financeData, setFinanceData] = useState({
    accounts_receivable: {
      total_outstanding: 0,
      overdue_30_days: 0,
      overdue_60_days: 0,
      overdue_90_days: 0,
    },
    invoices: {
      pending_count: 0,
      pending_amount: 0,
      approved_count: 0,
      approved_amount: 0,
      paid_count: 0,
      paid_amount: 0,
    },
    payments: {
      weekly_total: 0,
      monthly_total: 0,
      pending_count: 0,
    },
    pending_invoices: [],
    recent_payments: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    fetchFinanceData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchFinanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchFinanceData = async () => {
    try {
      const [arResponse, invoicesResponse, paymentsResponse, pendingResponse, recentPaymentsResponse] = await Promise.all([
        api.get('/dashboard/finance'),
        api.get('/invoices'),
        api.get('/payments'),
        api.get('/sales-orders'),
        api.get('/payments')
      ]);

      // Helper function to safely extract array data from response
      const extractArrayData = (response) => {
        if (response?.data?.data && Array.isArray(response.data.data)) {
          return response.data.data; // Pagination response
        }
        if (response?.data && Array.isArray(response.data)) {
          return response.data; // Direct array response
        }
        return []; // Fallback to empty array
      };

      // Helper function to safely extract object data from response
      const extractObjectData = (response) => {
        if (response?.data) {
          return response.data;
        }
        return {};
      };

      setFinanceData({
        accounts_receivable: extractObjectData(arResponse),
        invoices: extractObjectData(invoicesResponse),
        payments: extractObjectData(paymentsResponse),
        pending_invoices: extractArrayData(pendingResponse).slice(0, 10), // Top 10 pending invoices
        recent_payments: extractArrayData(recentPaymentsResponse).slice(0, 5), // Latest 5 payments
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching finance data:', error);
      setFinanceData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getOverdueColor = (days) => {
    if (days >= 90) return 'danger';
    if (days >= 60) return 'warning';
    if (days >= 30) return 'info';
    return 'success';
  };

  const getPaymentStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'danger';
      case 'partial': return 'info';
      default: return 'secondary';
    }
  };

  // Only allow Finance role to access this dashboard
  if (user?.role?.name !== 'Finance') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have permission to access this dashboard.</p>
        </Alert>
      </div>
    );
  }

  if (financeData.loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Memuat data dashboard keuangan...</p>
        </div>
      </div>
    );
  }

  if (financeData.error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Dashboard</Alert.Heading>
        <p>{financeData.error}</p>
      </Alert>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Dashboard Keuangan</h2>
          <p className="text-muted mb-0">Selamat datang, {user?.name || 'Tim Keuangan'} - Manajemen Piutang & Invoice</p>
        </div>
        <div>
          <Button variant="primary" className="me-2">
            <i className="bi bi-file-earmark-plus me-1"></i>
            Buat Invoice Baru
          </Button>
          <Button variant="outline-primary" size="sm">
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </Button>
        </div>
      </div>

      {/* Accounts Receivable Summary */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Total Piutang</h6>
                <h3 className="mb-0 text-primary">{formatCurrency(financeData.accounts_receivable.total_outstanding)}</h3>
                <small className="text-muted">Seluruh invoice belum lunas</small>
              </div>
              <div className="ms-3">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-currency-exchange text-primary fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Jatuh Tempo 30 Hari</h6>
                <h3 className="mb-0 text-info">{formatCurrency(financeData.accounts_receivable.overdue_30_days)}</h3>
                <small className="text-muted">Perlu ditindaklanjuti</small>
              </div>
              <div className="ms-3">
                <div className="bg-info bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-calendar-x text-info fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Jatuh Tempo 60 Hari</h6>
                <h3 className="mb-0 text-warning">{formatCurrency(financeData.accounts_receivable.overdue_60_days)}</h3>
                <small className="text-muted">Prioritas tinggi</small>
              </div>
              <div className="ms-3">
                <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-exclamation-triangle text-warning fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Jatuh Tempo 90+ Hari</h6>
                <h3 className="mb-0 text-danger">{formatCurrency(financeData.accounts_receivable.overdue_90_days)}</h3>
                <small className="text-muted">Kritis</small>
              </div>
              <div className="ms-3">
                <div className="bg-danger bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-x-circle text-danger fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Invoice Summary */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h6 className="mb-0">Ringkasan Invoice</h6>
            </Card.Header>
            <Card.Body>
              <Row className="text-center">
                <Col>
                  <div className="mb-2">
                    <h4 className="text-warning mb-1">{financeData.invoices.pending_count}</h4>
                    <small className="text-muted">Invoice Pending</small>
                  </div>
                  <div className="text-muted">
                    <small>{formatCurrency(financeData.invoices.pending_amount)}</small>
                  </div>
                </Col>
                <Col>
                  <div className="mb-2">
                    <h4 className="text-primary mb-1">{financeData.invoices.approved_count}</h4>
                    <small className="text-muted">Invoice Approved</small>
                  </div>
                  <div className="text-muted">
                    <small>{formatCurrency(financeData.invoices.approved_amount)}</small>
                  </div>
                </Col>
                <Col>
                  <div className="mb-2">
                    <h4 className="text-success mb-1">{financeData.invoices.paid_count}</h4>
                    <small className="text-muted">Invoice Lunas</small>
                  </div>
                  <div className="text-muted">
                    <small>{formatCurrency(financeData.invoices.paid_amount)}</small>
                  </div>
                </Col>
                <Col>
                  <div className="mb-2">
                    <h4 className="text-info mb-1">{formatCurrency(financeData.payments.weekly_total)}</h4>
                    <small className="text-muted">Pembayaran Minggu Ini</small>
                  </div>
                  <div className="text-muted">
                    <small>Total penerimaan</small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Pending Invoices */}
        <Col lg={8} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Invoice Menunggu Pembuatan</h6>
                <div>
                  <Button variant="outline-success" size="sm" className="me-2">
                    <i className="bi bi-file-earmark-plus me-1"></i>
                    Batch Create Invoice
                  </Button>
                  <Button variant="outline-primary" size="sm">
                    Lihat Semua
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {financeData.pending_invoices.length > 0 ? (
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>No. SO</th>
                        <th>Pelanggan</th>
                        <th>Tanggal SO</th>
                        <th>Total</th>
                        <th>Umur</th>
                        <th>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeData.pending_invoices.map((invoice, index) => (
                        <tr key={index}>
                          <td><small className="fw-bold">{invoice.so_number}</small></td>
                          <td>{invoice.customer_name}</td>
                          <td><small>{new Date(invoice.so_date).toLocaleDateString('id-ID')}</small></td>
                          <td className="fw-bold">{formatCurrency(invoice.total)}</td>
                          <td>
                            <small className="text-muted">
                              {Math.ceil((new Date() - new Date(invoice.so_date)) / (1000 * 60 * 60 * 24))} hari
                            </small>
                          </td>
                          <td>
                            <Badge bg={getPaymentStatusColor(invoice.status)}>
                              {invoice.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td>
                            <Button variant="outline-primary" size="sm" className="me-1">
                              <i className="bi bi-eye"></i>
                            </Button>
                            <Button variant="outline-success" size="sm">
                              <i className="bi bi-file-earmark-plus"></i>
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
                  <p className="text-muted mt-2">Tidak ada invoice pending</p>
                  <small className="text-muted">Semua SO sudah dibuatkan invoice</small>
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
                  <i className="bi bi-file-earmark-plus me-2"></i>
                  Buat Invoice Manual
                </Button>
                <Button variant="outline-primary" className="w-100">
                  <i className="bi bi-people me-2"></i>
                  Reminder Pelanggan
                </Button>
                <Button variant="outline-success" className="w-100">
                  <i className="bi bi-cash-stack me-2"></i>
                  Catat Pembayaran
                </Button>
                <Button variant="outline-warning" className="w-100">
                  <i className="bi bi-printer me-2"></i>
                  Cetak Laporan
                </Button>
              </div>

              <hr className="my-3" />

              <div className="text-center">
                <h6 className="text-muted mb-2">Tips</h6>
                <small className="text-muted">
                  Prioritaskan pembuatan invoice untuk SO yang sudah SHIPPED untuk mempercepat aliran kas masuk.
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Payments */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Pembayaran Terkini</h6>
                <Button variant="outline-primary" size="sm">
                  Lihat Semua Pembayaran
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {financeData.recent_payments.length > 0 ? (
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>Waktu</th>
                        <th>No. Invoice</th>
                        <th>Pelanggan</th>
                        <th>Jumlah</th>
                        <th>Metode</th>
                        <th>User</th>
                        <th>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financeData.recent_payments.map((payment, index) => (
                        <tr key={index}>
                          <td>
                            <small>{new Date(payment.created_at).toLocaleTimeString('id-ID')}</small>
                          </td>
                          <td><small>{payment.invoice_number}</small></td>
                          <td>{payment.customer_name}</td>
                          <td className="fw-bold text-success">{formatCurrency(payment.amount)}</td>
                          <td>
                            <Badge bg="info">{payment.payment_method}</Badge>
                          </td>
                          <td><small>{payment.user_name}</small></td>
                          <td><small>{payment.notes || '-'}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-3">
                  <i className="bi bi-cash text-muted fs-1"></i>
                  <p className="text-muted mt-2">Belum ada pembayaran hari ini</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Financial Performance */}
      <Row>
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h6 className="mb-0">Kinerja Keuangan</h6>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Target Bulanan</span>
                  <span className="fw-bold text-primary">80%</span>
                </div>
                <ProgressBar variant="primary" now={80} style={{ height: '20px' }} />
              </div>
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Collection Rate</span>
                  <span className="fw-bold text-success">75%</span>
                </div>
                <ProgressBar variant="success" now={75} style={{ height: '20px' }} />
              </div>
              <div className="text-center">
                <small className="text-muted">
                  Total {formatCurrency(financeData.payments.monthly_total)} penerimaan bulan ini
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h6 className="mb-0">Alert Piutang</h6>
            </Card.Header>
            <Card.Body>
              <div className="alert alert-danger" role="alert">
                <div className="d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <div className="flex-grow-1">
                    <strong>{financeData.accounts_receivable.overdue_90_days > 0 ? 'Ada' : 'Tidak ada'} piutang > 90 hari</strong>
                  </div>
                </div>
              </div>
              <div className="alert alert-warning" role="alert">
                <div className="d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <div className="flex-grow-1">
                    <strong>{financeData.invoices.pending_count} Invoice</strong> perlu segera dibuat
                  </div>
                </div>
              </div>
              <div className="text-center">
                <Button variant="danger" size="sm">
                  <i className="bi bi-eye me-1"></i>
                  Lihat Piutang Bermasalah
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardFinance;