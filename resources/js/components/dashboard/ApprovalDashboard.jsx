import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Spinner, Alert, ListGroup, Badge, Modal, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAPI } from '../../contexts/APIContext';

const ApprovalDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { api } = useAPI();

  useEffect(() => {
    fetchApprovalDashboard();
  }, []);

  const fetchApprovalDashboard = async () => {
    try {
      const response = await api.get('/dashboard/approval');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching approval dashboard:', error);
      setError('Failed to load approval dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    setError(null); // Clear previous errors
    try {
      await api.post(`/quotations/${selectedQuotation.id}/approve`, { notes });
      setShowApproveModal(false);
      setNotes('');
      setSelectedQuotation(null);
      fetchApprovalDashboard(); // Refresh data
    } catch (error) {
      let errorMessage = 'Failed to approve quotation';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle Laravel validation errors
        const validationErrors = Object.values(error.response.data.errors).flat();
        errorMessage = validationErrors.join(', ');
      } else if (error.response?.status === 422) {
        errorMessage = 'Quotation cannot be approved. It may not be in SUBMITTED status or has no pending approval request.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to approve quotations.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Quotation not found.';
      }
      setError(errorMessage);
      console.error('Error approving quotation:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    setError(null); // Clear previous errors
    try {
      await api.post(`/quotations/${selectedQuotation.id}/reject`, { notes });
      setShowRejectModal(false);
      setNotes('');
      setSelectedQuotation(null);
      fetchApprovalDashboard(); // Refresh data
    } catch (error) {
      let errorMessage = 'Failed to reject quotation';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle Laravel validation errors
        const validationErrors = Object.values(error.response.data.errors).flat();
        errorMessage = validationErrors.join(', ');
      } else if (error.response?.status === 422) {
        errorMessage = 'Quotation cannot be rejected. It may not be in SUBMITTED status or has no pending approval request.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to reject quotations.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Quotation not found.';
      }
      setError(errorMessage);
      console.error('Error rejecting quotation:', error);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

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

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  const { pending_quotations, approval_stats, recent_approvals } = dashboardData;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Approval Dashboard</h2>
          <p className="text-muted mb-0">Daftar Penawaran yang Pending Approval</p>
        </div>
        <Button variant="outline-primary" onClick={fetchApprovalDashboard}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon pending mx-auto mb-3">
                <i className="bi bi-clock-history fs-3"></i>
              </div>
              <h3 className="mb-1">{approval_stats.pending}</h3>
              <p className="text-muted mb-0">Pending Approvals</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon approved-today mx-auto mb-3">
                <i className="bi bi-check-circle fs-3"></i>
              </div>
              <h3 className="mb-1">{approval_stats.approved_today}</h3>
              <p className="text-muted mb-0">Approved Today</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon rejected-today mx-auto mb-3">
                <i className="bi bi-x-circle fs-3"></i>
              </div>
              <h3 className="mb-1">{approval_stats.rejected_today}</h3>
              <p className="text-muted mb-0">Rejected Today</p>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="stats-icon total-approved mx-auto mb-3">
                <i className="bi bi-check2-all fs-3"></i>
              </div>
              <h3 className="mb-1">{approval_stats.total_approved}</h3>
              <p className="text-muted mb-0">Total Approved</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Pending Quotations */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Penawaran Menunggu Persetujuan
              </h5>
            </Card.Header>
            <Card.Body>
              {pending_quotations.length > 0 ? (
                <ListGroup variant="flush">
                  {pending_quotations.map((quotation) => (
                    <ListGroup.Item key={quotation.id} className="px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <h6 className="mb-0 me-2">{quotation.quotation_number}</h6>
                            <Badge bg="warning">SUBMITTED</Badge>
                          </div>
                          <Row className="mb-2">
                            <Col md={6}>
                              <p className="text-muted mb-1">
                                <i className="bi bi-building me-1"></i>
                                <strong>Pelanggan:</strong> {quotation.customer?.company_name || 'Unknown Customer'}
                              </p>
                              <p className="text-muted mb-1">
                                <i className="bi bi-person me-1"></i>
                                <strong>Sales:</strong> {quotation.user?.name || 'Unknown Sales'}
                              </p>
                            </Col>
                            <Col md={6}>
                              <p className="mb-1">
                                <strong>Total:</strong> {formatCurrency(quotation.total_amount)}
                              </p>
                              <p className="text-muted mb-1">
                                <i className="bi bi-calendar me-1"></i>
                                {new Date(quotation.created_at).toLocaleDateString('id-ID')}
                              </p>
                            </Col>
                          </Row>
                          {quotation.items && quotation.items.length > 0 && (
                            <div className="mb-2">
                              <small className="text-muted">
                                <strong>Items ({quotation.items.length}):</strong>
                              </small>
                              <div className="mt-1">
                                {quotation.items.slice(0, 3).map((item, index) => (
                                  <Badge key={index} bg="light" text="dark" className="me-1 mb-1">
                                    {item.product?.name || 'Unknown Product'} x{item.quantity}
                                  </Badge>
                                ))}
                                {quotation.items.length > 3 && (
                                  <Badge bg="secondary" className="mb-1">
                                    +{quotation.items.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="d-flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => {
                              setSelectedQuotation(quotation);
                              setShowApproveModal(true);
                            }}
                          >
                            <i className="bi bi-check-lg me-1"></i>
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setSelectedQuotation(quotation);
                              setShowRejectModal(true);
                            }}
                          >
                            <i className="bi bi-x-lg me-1"></i>
                            Reject
                          </Button>
                          <Link to={`/quotations/${quotation.id}`} className="btn btn-sm btn-outline-secondary">
                            <i className="bi bi-eye"></i>
                          </Link>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center text-muted py-5">
                  <i className="bi bi-check-circle fs-1"></i>
                  <h5 className="mt-3">Tidak Ada Penawaran Pending</h5>
                  <p>Semua penawaran telah diproses</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Approvals */}
      <Row>
        <Col>
          <Card>
            <Card.Header className="bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Persetujuan Terbaru
              </h5>
            </Card.Header>
            <Card.Body>
              {recent_approvals.length > 0 ? (
                <ListGroup variant="flush">
                  {recent_approvals.map((approval) => (
                    <ListGroup.Item key={approval.id} className="px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                            <h6 className="mb-0 me-2">
                              {approval.approvable?.quotation_number || 'Unknown Quotation'}
                            </h6>
                            <Badge bg={approval.status === 'APPROVED' ? 'success' : 'danger'}>
                              {approval.status}
                            </Badge>
                          </div>
                          <p className="text-muted mb-1">
                            <i className="bi bi-building me-1"></i>
                            {approval.approvable?.customer?.company_name || 'Unknown Customer'}
                          </p>
                          <p className="mb-1">
                            <strong>Sales:</strong> {approval.approvable?.user?.name || 'Unknown Sales'}
                          </p>
                          {approval.notes && (
                            <p className="mb-1">
                              <small><strong>Catatan:</strong> {approval.notes}</small>
                            </p>
                          )}
                          <small className="text-muted">
                            <i className="bi bi-calendar me-1"></i>
                            {new Date(approval.updated_at).toLocaleString('id-ID')}
                          </small>
                        </div>
                        <Link to={`/quotations/${approval.approvable_id}`} className="btn btn-sm btn-outline-secondary">
                          <i className="bi bi-eye"></i>
                        </Link>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-center text-muted py-3">
                  <i className="bi bi-clock-history fs-3"></i>
                  <p className="mb-0">Belum ada persetujuan</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Approve Modal */}
      <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-check-circle text-success me-2"></i>
            Approve Penawaran
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedQuotation && (
            <>
              <p>
                <strong>Penawaran:</strong> {selectedQuotation.quotation_number}<br />
                <strong>Pelanggan:</strong> {selectedQuotation.customer?.company_name}<br />
                <strong>Total:</strong> {formatCurrency(selectedQuotation.total_amount)}
              </p>
              <Form.Group>
                <Form.Label>Catatan (Opsional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Tambahkan catatan persetujuan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
            Batal
          </Button>
          <Button variant="success" onClick={handleApprove} disabled={processing}>
            {processing ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg me-2"></i>
                Approve
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-x-circle text-danger me-2"></i>
            Reject Penawaran
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedQuotation && (
            <>
              <p>
                <strong>Penawaran:</strong> {selectedQuotation.quotation_number}<br />
                <strong>Pelanggan:</strong> {selectedQuotation.customer?.company_name}<br />
                <strong>Total:</strong> {formatCurrency(selectedQuotation.total_amount)}
              </p>
              <Form.Group>
                <Form.Label>Alasan Penolakan <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Jelaskan alasan penolakan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  required
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleReject} disabled={processing || !notes.trim()}>
            {processing ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-x-lg me-2"></i>
                Reject
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ApprovalDashboard;