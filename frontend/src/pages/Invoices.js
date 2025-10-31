import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Alert, Modal, Form } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';
import './Invoices.css';

const Invoices = () => {
  const { api } = useAPI();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [shippedOrders, setShippedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    status: '',
    search: ''
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesResponse, shippedOrdersResponse] = await Promise.allSettled([
        api.get('/invoices'),
        api.get('/sales-orders?status=SHIPPED')
      ]);

      if (invoicesResponse.status === 'fulfilled') {
        setInvoices(invoicesResponse.value.data.data || invoicesResponse.value.data || []);
      }

      if (shippedOrdersResponse.status === 'fulfilled') {
        setShippedOrders(shippedOrdersResponse.value.data.data || shippedOrdersResponse.value.data || []);
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (salesOrderId) => {
    try {
      setCreateLoading(true);

      // Get sales order details to extract customer information
      const salesOrderResponse = await api.get(`/sales-orders/${salesOrderId}`);
      const salesOrder = salesOrderResponse.data;

      // Prepare invoice data
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

      const invoiceData = {
        sales_order_id: salesOrderId,
        customer_id: salesOrder.customer_id,
        issue_date: today,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'UNPAID'
      };

      const response = await api.post(`/invoices`, invoiceData);

      if (response.data) {
        // The sales order status is automatically updated to COMPLETED in the backend
        setShowCreateModal(false);
        setSelectedInvoice(null);
        await fetchData();
        alert('✅ Invoice berhasil dibuat! Sales Order status diperbarui ke COMPLETED.');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('❌ Gagal membuat invoice: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const handleViewDetail = async (invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice.id}`);
      setSelectedInvoice(response.data);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError('Failed to fetch invoice details');
    }
  };

  const handlePrintInvoice = async (invoiceId) => {
    try {
      console.log('Attempting to print invoice:', invoiceId);

      // Use authenticated API call to get PDF
      const response = await api.get(`/invoices/${invoiceId}/print`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      // Create blob URL and open in new window
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Open PDF in new window for printing
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        printWindow.onload = function() {
          // Auto-trigger print dialog when PDF loads
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        };
      } else {
        // Fallback: download the PDF
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        alert('PDF downloaded. Please open the file to print.');
      }

      console.log('PDF loaded successfully');

    } catch (error) {
      console.error('Error printing invoice:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      alert('Gagal mencetak invoice: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'status-paid';
      case 'unpaid': return 'status-unpaid';
      case 'partial': return 'status-partial';
      case 'overdue': return 'status-overdue';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-draft';
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'success';
      case 'unpaid': return 'warning';
      case 'partial': return 'info';
      case 'overdue': return 'danger';
      case 'cancelled': return 'secondary';
      default: return 'primary';
    }
  };

  // Only allow Finance role to access this page
  if (user?.role?.name !== 'Finance') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have permission to access this page.</p>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Memuat data invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Data</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  return (
    <div className="invoices">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Invoice Management</h2>
          <p className="text-muted mb-0">Manajemen Invoice & Pembayaran</p>
        </div>
        <div>
          <Button variant="primary" className="me-2" onClick={() => setShowCreateModal(true)}>
            <i className="bi bi-file-earmark-plus me-1"></i>
            Create Invoice
          </Button>
          <Button variant="outline-primary" size="sm">
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <span>{error}</span>
          <Button variant="link" onClick={() => setError(null)} className="btn-close">×</Button>
        </Alert>
      )}

      {/* Shipped Orders - Ready for Invoice Creation */}
      <Card className="mb-4">
        <Card.Header className="bg-warning bg-opacity-10 border-warning">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 text-warning">
              <i className="bi bi-truck me-2"></i>
              Sales Orders Siap Dibuatkan Invoice ({shippedOrders.length})
            </h5>
            <Button variant="outline-success" size="sm" onClick={() => setShowCreateModal(true)}>
              <i className="bi bi-file-earmark-plus me-1"></i>
              Create Invoice
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {shippedOrders.length > 0 ? (
            <Table responsive hover>
              <thead className="table-light">
                <tr>
                  <th>No. SO</th>
                  <th>Pelanggan</th>
                  <th>Tanggal SO</th>
                  <th>Total</th>
                  <th>Umur Kirim</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shippedOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="fw-bold">{order.sales_order_number}</div>
                    </td>
                    <td>{order.customer?.company_name || order.customer?.name || '-'}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td className="fw-bold text-primary">{formatCurrency(order.total_amount)}</td>
                    <td>
                      <Badge bg={
                        Math.ceil((new Date() - new Date(order.updated_at)) / (1000 * 60 * 60 * 24)) >= 3 ? 'danger' :
                        Math.ceil((new Date() - new Date(order.updated_at)) / (1000 * 60 * 60 * 24)) >= 1 ? 'warning' : 'success'
                      }>
                        {Math.ceil((new Date() - new Date(order.updated_at)) / (1000 * 60 * 60 * 24))} hari
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="success">SHIPPED</Badge>
                    </td>
                    <td>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(order);
                          setShowCreateModal(true);
                        }}
                        title="Create Invoice"
                      >
                        <i className="bi bi-file-earmark-plus me-1"></i>
                        Create Invoice
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-4">
              <i className="bi bi-check-circle text-success fs-1"></i>
              <p className="text-muted mt-2">Tidak ada Sales Orders yang siap dibuatkan invoice</p>
              <small className="text-muted">Menunggu Sales Orders dengan status SHIPPED dari Tim Gudang</small>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Invoices List */}
      <Card>
        <Card.Header className="bg-white border-0">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Invoices ({invoices.length})</h5>
            <div className="d-flex gap-2">
              <Form.Group className="mb-0">
                <Form.Control
                  as="select"
                  value={filter.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="form-control form-control-sm"
                >
                  <option value="">All Status</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                </Form.Control>
              </Form.Group>
              <Form.Group className="mb-0">
                <Form.Control
                  type="text"
                  placeholder="Search invoice..."
                  value={filter.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="form-control form-control-sm"
                />
              </Form.Group>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {invoices.length > 0 ? (
            <Table responsive hover>
              <thead className="table-light">
                <tr>
                  <th>Invoice Number</th>
                  <th>Customer</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <div className="fw-bold">{invoice.invoice_number}</div>
                      {invoice.sales_order_number && (
                        <small className="text-muted">SO: {invoice.sales_order_number}</small>
                      )}
                    </td>
                    <td>
                      {invoice.customer?.company_name || invoice.customer?.name || '-'}
                    </td>
                    <td>{formatDate(invoice.issue_date)}</td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td className="fw-semibold text-primary">{formatCurrency(invoice.total_amount)}</td>
                    <td>
                      <Badge bg={getStatusBadge(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-1"
                        onClick={() => handleViewDetail(invoice)}
                      >
                        <i className="bi bi-eye"></i>
                      </Button>
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => handlePrintInvoice(invoice.id)}
                      >
                        <i className="bi bi-printer"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-4">
              <i className="bi bi-file-earmark text-muted fs-1"></i>
              <p className="text-muted mt-2">No invoices found</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Create Invoice Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-file-earmark-plus me-2"></i>
            Create Invoice
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedInvoice ? (
            <>
              <h6>Invoice Details</h6>
              <p><strong>Sales Order:</strong> {selectedInvoice.sales_order_number}</p>
              <p><strong>Customer:</strong> {selectedInvoice.customer?.company_name || selectedInvoice.customer?.name}</p>
              <p><strong>Total Amount:</strong> {formatCurrency(selectedInvoice.total_amount)}</p>
              <hr />
              <p className="text-muted">Invoice akan dibuat dengan data dari Sales Order di atas.</p>
            </>
          ) : (
            <p>Please select a sales order to create invoice.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          {selectedInvoice && (
            <Button
              variant="primary"
              onClick={() => handleCreateInvoice(selectedInvoice.id)}
              disabled={createLoading}
            >
              {createLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                  Creating...
                </>
              ) : (
                'Create Invoice'
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-file-earmark-text me-2"></i>
            Invoice Details - {selectedInvoice?.invoice_number}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedInvoice && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <h6>Invoice Information</h6>
                  <p><strong>Invoice Number:</strong> {selectedInvoice.invoice_number}</p>
                  <p><strong>Sales Order:</strong> {selectedInvoice.sales_order_number}</p>
                  <p><strong>Issue Date:</strong> {formatDate(selectedInvoice.issue_date)}</p>
                  <p><strong>Due Date:</strong> {formatDate(selectedInvoice.due_date)}</p>
                </Col>
                <Col md={6}>
                  <h6>Customer Information</h6>
                  <p><strong>Name:</strong> {selectedInvoice.customer?.company_name || selectedInvoice.customer?.name}</p>
                  <p><strong>Status:</strong>
                    <Badge bg={getStatusBadge(selectedInvoice.status)}>
                      {selectedInvoice.status}
                    </Badge>
                  </p>
                  <p><strong>Total Amount:</strong> {formatCurrency(selectedInvoice.total_amount)}</p>
                </Col>
              </Row>
              {selectedInvoice.notes && (
                <div className="mt-3">
                  <h6>Notes</h6>
                  <p>{selectedInvoice.notes}</p>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
          {selectedInvoice && (
            <Button variant="info" onClick={() => handlePrintInvoice(selectedInvoice.id)}>
              <i className="bi bi-printer me-1"></i>
              Print Invoice
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Invoices;