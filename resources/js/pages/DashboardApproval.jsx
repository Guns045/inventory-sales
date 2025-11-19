import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert, ProgressBar, Form, Modal } from 'react-bootstrap';
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

  // State for rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  useEffect(() => {
    fetchApprovalData();
    fetchRejectionReasons();
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchApprovalData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchApprovalData = async () => {
    try {
      const [approvalResponse, notificationsResponse] = await Promise.all([
        api.get('/dashboard/approval'),
        api.get('/notifications')
      ]);

      // Use the approval dashboard API that returns properly structured data
      const dashboardData = approvalResponse.data;
      const pendingQuotations = Array.isArray(dashboardData.pending_quotations) ? dashboardData.pending_quotations : [];

      // Map the data to match the component's expected format
      const formattedQuotations = pendingQuotations.map(quotation => ({
        ...quotation,
        customer_name: quotation.customer?.company_name || 'Unknown Customer',
        sales_name: quotation.user?.name || 'Unknown Sales'
      }));

      const notifications = Array.isArray(notificationsResponse.data?.notifications?.data) ? notificationsResponse.data.notifications.data.slice(0, 5) : [];

      // Use the stats from the API response
      const stats = {
        pending_count: dashboardData.approval_stats?.pending || 0,
        approved_today: dashboardData.approval_stats?.approved_today || 0,
        rejected_today: dashboardData.approval_stats?.rejected_today || 0,
        total_this_month: formattedQuotations.filter(q => {
          const qDate = new Date(q.created_at);
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          return qDate.getMonth() === currentMonth && qDate.getFullYear() === currentYear;
        }).length
      };

      setApprovalData({
        pending_quotations: formattedQuotations,
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

  const fetchRejectionReasons = async () => {
    try {
      const response = await api.get('/quotations/rejection-reasons');
      setRejectionReasons(response.data.data || []);
    } catch (error) {
      console.error('Error fetching rejection reasons:', error);
      // Set default reasons if API fails
      setRejectionReasons([
        { value: 'No FU', label: 'No FU (No Follow Up)' },
        { value: 'No Stock', label: 'No Stock' },
        { value: 'Price', label: 'Price Issue' }
      ]);
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
      let errorMessage = 'Gagal menyetujui penawaran. Silakan coba lagi.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      alert(errorMessage);
    }
  };

  const handleRejectClick = (quotation) => {
    setSelectedQuotation(quotation);
    setSelectedReason('');
    setCustomNotes('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    try {
      if (!selectedReason) {
        alert('Pilih alasan penolakan terlebih dahulu!');
        return;
      }

      const notes = customNotes.trim() || `Ditolak dengan alasan: ${selectedReason}`;

      await api.post(`/quotations/${selectedQuotation.id}/reject`, {
        reason_type: selectedReason,
        notes: notes
      });

      // Refresh data after rejection
      fetchApprovalData();

      // Close modal and show success notification
      setShowRejectModal(false);
      setSelectedQuotation(null);
      setSelectedReason('');
      setCustomNotes('');

      alert('Penawaran berhasil ditolak!');
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      alert('Gagal menolak penawaran. Silakan coba lagi.');
    }
  };

  const handleCloseRejectModal = () => {
    setShowRejectModal(false);
    setSelectedQuotation(null);
    setSelectedReason('');
    setCustomNotes('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Allow Super Admin, Admin, and Admin variants to access this dashboard
  if (!user || !['Super Admin', 'Admin', 'Admin Jakarta', 'Admin Makassar', 'Manager Jakarta', 'Manager Makassar'].includes(user.role?.name)) {
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
                                onClick={() => handleRejectClick(quotation)}
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

      {/* Rejection Modal */}
      <Modal show={showRejectModal} onHide={handleCloseRejectModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-x-circle text-danger me-2"></i>
            Tolak Penawaran
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedQuotation && (
            <div>
              <div className="mb-3">
                <small className="text-muted">No. Quotation</small>
                <div className="fw-bold">{selectedQuotation.quotation_number}</div>
              </div>
              <div className="mb-3">
                <small className="text-muted">Pelanggan</small>
                <div>{selectedQuotation.customer_name}</div>
              </div>
              <div className="mb-3">
                <small className="text-muted">Total</small>
                <div className="fw-bold">{formatCurrency(selectedQuotation.total_amount || 0)}</div>
              </div>
            </div>
          )}

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Alasan Penolakan <span className="text-danger">*</span></Form.Label>
            <Form.Select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              required
            >
              <option value="">Pilih alasan penolakan...</option>
              {rejectionReasons.map((reason, index) => (
                <option key={index} value={reason.value}>{reason.label}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Catatan Tambahan (Opsional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Tambahkan catatan detail jika diperlukan..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseRejectModal}>
            <i className="bi bi-x-lg me-1"></i>
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={handleRejectConfirm}
            disabled={!selectedReason}
          >
            <i className="bi bi-x-circle me-1"></i>
            Konfirmasi Tolak
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DashboardApproval;