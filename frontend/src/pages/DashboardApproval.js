import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert, ProgressBar, Form } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';

const DashboardApproval = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const [approvalData, setApprovalData] = useState({
    pending_quotations: [],
    notifications: [],
    stats: {
      pending_count: 0,
      approved_today: 0,
      rejected_today: 0,
      total_this_month: 0
    },
    loading: true,
    error: null
  });

  useEffect(() => {
    fetchApprovalData();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchApprovalData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchApprovalData = async () => {
    try {
      const [quotationsResponse, notificationsResponse] = await Promise.all([
        api.get('/quotations?status=submitted'),
        api.get('/notifications')
      ]);

      let allQuotations = Array.isArray(quotationsResponse.data?.data) ? quotationsResponse.data.data : [];

      // Filter manually to get only SUBMITTED status quotations with pending approvals
      const pendingQuotations = allQuotations.filter(quotation =>
        quotation.status === 'SUBMITTED' &&
        quotation.approvals &&
        quotation.approvals.some(approval => approval.status === 'PENDING')
      );

      const notifications = Array.isArray(notificationsResponse.data?.notifications?.data) ? notificationsResponse.data.notifications.data.slice(0, 5) : [];

      // Calculate stats
      const today = new Date().toDateString();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const stats = {
        pending_count: pendingQuotations.length,
        approved_today: 0, // Would need actual approved data from API
        rejected_today: 0, // Would need actual rejected data from API
        total_this_month: pendingQuotations.filter(q => {
          const qDate = new Date(q.created_at);
          return qDate.getMonth() === currentMonth && qDate.getFullYear() === currentYear;
        }).length
      };

      setApprovalData({
        pending_quotations: pendingQuotations,
        notifications: notifications,
        stats: stats,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching approval data:', error);
      setApprovalData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  };

  const handleApprove = async (quotationId) => {
    try {
      await api.post(`/quotations/${quotationId}/approve`, {
        notes: 'Disetujui melalui dashboard'
      });

      // Refresh data after approval
      fetchApprovalData();

      // Show success notification
      alert('Penawaran berhasil disetujui!');
    } catch (error) {
      console.error('Error approving quotation:', error);
      alert('Gagal menyetujui penawaran. Silakan coba lagi.');
    }
  };

  const handleReject = async (quotationId, notes = '') => {
    try {
      // Always require notes for rejection
      const rejectNotes = notes || prompt('Alasan penolakan:', 'Penawaran tidak sesuai dengan budget');

      if (!rejectNotes || rejectNotes.trim() === '') {
        alert('Alasan penolakan harus diisi!');
        return;
      }

      await api.post(`/quotations/${quotationId}/reject`, {
        notes: rejectNotes.trim()
      });

      // Refresh data after rejection
      fetchApprovalData();

      // Show success notification
      alert('Penawaran berhasil ditolak!');
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      alert('Gagal menolak penawaran. Silakan coba lagi.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

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

  if (approvalData.loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Memuat data dashboard approval...</p>
        </div>
      </div>
    );
  }

  if (approvalData.error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Dashboard</Alert.Heading>
        <p>{approvalData.error}</p>
      </Alert>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Dashboard Approval</h2>
          <p className="text-muted mb-0">Selamat datang, {user?.name || 'Manager'} - Persetujuan Penawaran</p>
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

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Menunggu Persetujuan</h6>
                <h3 className="mb-0 text-warning">{approvalData.stats.pending_count}</h3>
                <small className="text-muted">Penawaran perlu ditinjau</small>
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
                <h6 className="text-muted mb-2">Disetujui Hari Ini</h6>
                <h3 className="mb-0 text-success">{approvalData.stats.approved_today}</h3>
                <small className="text-success">Penawaran disetujui</small>
              </div>
              <div className="ms-3">
                <div className="bg-success bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-check-circle text-success fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Ditolak Hari Ini</h6>
                <h3 className="mb-0 text-danger">{approvalData.stats.rejected_today}</h3>
                <small className="text-danger">Penawaran ditolak</small>
              </div>
              <div className="ms-3">
                <div className="bg-danger bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-x-circle text-danger fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3} md={6} className="mb-3">
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="text-muted mb-2">Total Bulan Ini</h6>
                <h3 className="mb-0 text-info">{approvalData.stats.total_this_month}</h3>
                <small className="text-muted">Semua penawaran</small>
              </div>
              <div className="ms-3">
                <div className="bg-info bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-file-text text-info fs-4"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Pending Quotations */}
        <Col lg={8} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Penawaran Menunggu Persetujuan</h6>
                <Button variant="outline-primary" size="sm">
                  <i className="bi bi-list-ul me-1"></i>
                  Lihat Semua
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {approvalData.pending_quotations.length > 0 ? (
                <div className="table-responsive">
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>No. Quotation</th>
                        <th>Pelanggan</th>
                        <th>Tanggal</th>
                        <th>Total</th>
                        <th>Sales</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvalData.pending_quotations.map((quotation, index) => (
                        <tr key={index}>
                          <td><small className="fw-bold">{quotation.quotation_number}</small></td>
                          <td>{quotation.customer_name}</td>
                          <td><small>{new Date(quotation.created_at).toLocaleDateString('id-ID')}</small></td>
                          <td className="fw-bold">{formatCurrency(quotation.total_amount || 0)}</td>
                          <td><small>{quotation.sales_name || '-'}</small></td>
                          <td>
                            <div className="btn-group" role="group">
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleApprove(quotation.id)}
                                title="Setujui"
                              >
                                <i className="bi bi-check-lg"></i>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleReject(quotation.id)}
                                title="Tolak"
                              >
                                <i className="bi bi-x-lg"></i>
                              </Button>
                              <Button variant="outline-primary" size="sm" title="Detail">
                                <i className="bi bi-eye"></i>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-check-circle text-success fs-1"></i>
                  <h5 className="text-muted mt-3">Tidak Ada Penawaran Pending</h5>
                  <p className="text-muted">Semua penawaran telah diproses</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Notifications */}
        <Col lg={4} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Notifikasi Terkini</h6>
                <Button variant="outline-primary" size="sm">
                  <i className="bi bi-bell"></i>
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {approvalData.notifications.length > 0 ? (
                <div>
                  {approvalData.notifications.map((notification, index) => (
                    <div key={index} className={`alert alert-${notification.type === 'approved' ? 'success' : notification.type === 'rejected' ? 'danger' : 'info'} alert-sm mb-2`} role="alert">
                      <div className="d-flex align-items-start">
                        <i className={`bi bi-${notification.type === 'approved' ? 'check-circle' : notification.type === 'rejected' ? 'x-circle' : 'info-circle'} me-2 mt-1`}></i>
                        <div className="flex-grow-1">
                          <small className="fw-bold">{notification.title}</small>
                          <div className="small">{notification.message}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            {new Date(notification.created_at).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-bell text-muted fs-3"></i>
                  <p className="text-muted mt-2 mb-0">Tidak ada notifikasi baru</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Approval Summary */}
      <Row>
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-3">
              <h6 className="mb-0">Ringkasan Persetujuan</h6>
            </Card.Header>
            <Card.Body>
              <Row className="text-center">
                <Col>
                  <div className="mb-3">
                    <h4 className="text-warning mb-1">{approvalData.stats.pending_count}</h4>
                    <small className="text-muted">Menunggu</small>
                  </div>
                  <ProgressBar variant="warning" now={30} style={{ height: '8px' }} />
                </Col>
                <Col>
                  <div className="mb-3">
                    <h4 className="text-success mb-1">{approvalData.stats.approved_today}</h4>
                    <small className="text-muted">Disetujui</small>
                  </div>
                  <ProgressBar variant="success" now={50} style={{ height: '8px' }} />
                </Col>
                <Col>
                  <div className="mb-3">
                    <h4 className="text-danger mb-1">{approvalData.stats.rejected_today}</h4>
                    <small className="text-muted">Ditolak</small>
                  </div>
                  <ProgressBar variant="danger" now={20} style={{ height: '8px' }} />
                </Col>
              </Row>

              <div className="text-center mt-3">
                <small className="text-muted">
                  Total {approvalData.stats.pending_count + approvalData.stats.approved_today + approvalData.stats.rejected_today} penawaran diproses hari ini
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardApproval;