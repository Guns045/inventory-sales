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
    search: '',
    date_from: '',
    date_to: '',
    customer: '',
    min_amount: '',
    max_amount: ''
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_date: '',
    notes: ''
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [statusModal, setStatusModal] = useState({
    show: false,
    invoice: null,
    newStatus: ''
  });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Build query params for invoices
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);
      if (filter.date_from) params.append('date_from', filter.date_from);
      if (filter.date_to) params.append('date_to', filter.date_to);
      if (filter.customer) params.append('customer', filter.customer);
      if (filter.min_amount) params.append('min_amount', filter.min_amount);
      if (filter.max_amount) params.append('max_amount', filter.max_amount);

      const queryString = params.toString();
      const invoiceUrl = `/invoices${queryString ? '?' + queryString : ''}`;

      const [invoicesResponse, shippedOrdersResponse] = await Promise.allSettled([
        api.get(invoiceUrl),
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

      // Fetch payment history for this invoice
      await fetchPaymentHistory(invoice.id);

      setShowDetailModal(true);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError('Failed to fetch invoice details');
    }
  };

  const fetchPaymentHistory = async (invoiceId) => {
    try {
      const response = await api.get(`/payments?invoice_id=${invoiceId}`);
      setPaymentHistory(response.data.data || response.data || []);
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setPaymentHistory([]);
    }
  };

  const handleViewPaymentHistory = async (invoice) => {
    try {
      setSelectedInvoice(invoice);
      await fetchPaymentHistory(invoice.id);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error viewing payment history:', err);
      alert('❌ Failed to load payment history');
    }
  };

  const handleStatusDropdown = (invoice) => {
    setStatusModal({
      show: true,
      invoice: invoice,
      newStatus: invoice.status
    });
  };

  const getAvailableStatuses = (currentStatus) => {
    const statuses = ['UNPAID', 'PAID', 'PARTIAL', 'OVERDUE'];

    // Business rules for status transitions
    if (currentStatus === 'PAID') {
      return []; // Cannot change from PAID
    }

    return statuses.filter(status => {
      if (status === currentStatus) return false;
      if (currentStatus === 'PARTIAL' && status === 'UNPAID') return false;
      return true;
    });
  };

  const handleStatusChange = async () => {
    if (!statusModal.invoice || !statusModal.newStatus) return;

    try {
      await handleUpdateStatus(
        statusModal.invoice.id,
        statusModal.newStatus,
        `Status changed by user`
      );

      setStatusModal({ show: false, invoice: null, newStatus: '' });
      await fetchData();
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleExportExcel = async () => {
    try {
      // Build query params for export
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);
      if (filter.date_from) params.append('date_from', filter.date_from);
      if (filter.date_to) params.append('date_to', filter.date_to);
      if (filter.customer) params.append('customer', filter.customer);
      if (filter.min_amount) params.append('min_amount', filter.min_amount);
      if (filter.max_amount) params.append('max_amount', filter.max_amount);
      params.append('export', 'excel');

      const queryString = params.toString();
      const exportUrl = `/invoices/export${queryString ? '?' + queryString : ''}`;

      const response = await api.get(exportUrl, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      // Create blob URL and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('✅ Invoice data exported successfully!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('❌ Failed to export data: ' + (error.response?.data?.message || error.message));
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

  const handleUpdateStatus = async (invoiceId, newStatus, notes = '') => {
    try {
      const response = await api.patch(`/invoices/${invoiceId}/status`, {
        status: newStatus,
        notes: notes
      });

      if (response.data) {
        await fetchData(); // Refresh the invoice list
        alert(`✅ Invoice status berhasil diubah ke ${newStatus}!`);
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      alert('❌ Gagal mengubah status invoice: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleMarkAsPaid = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.total_amount || '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;

    // Validation
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert('❌ Jumlah pembayaran harus lebih dari 0');
      return;
    }

    if (!paymentData.payment_date) {
      alert('❌ Tanggal pembayaran harus diisi');
      return;
    }

    const paymentAmount = parseFloat(paymentData.amount);
    const totalAmount = parseFloat(selectedInvoice.total_amount);

    // Check if payment amount exceeds total
    if (paymentAmount > totalAmount) {
      alert(`❌ Jumlah pembayaran melebihi total invoice (${formatCurrency(totalAmount)})`);
      return;
    }

    try {
      // Create payment record
      const paymentRecord = {
        invoice_id: selectedInvoice.id,
        payment_date: paymentData.payment_date,
        amount_paid: paymentAmount,
        payment_method: 'Transfer Bank', // Default, can be made configurable
        reference_number: paymentData.notes || null
      };

      await api.post('/payments', paymentRecord);

      // Show appropriate success message
      let successMessage = '✅ Pembayaran berhasil dicatat!';
      if (paymentAmount < totalAmount) {
        const remaining = totalAmount - paymentAmount;
        successMessage += `\nSisa pembayaran: ${formatCurrency(remaining)}`;
      }

      // Reset and close modal
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentData({ amount: '', payment_date: '', notes: '' });

      // Refresh data
      await fetchData();
      alert(successMessage);

    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('❌ Gagal mencatat pembayaran: ' + (error.response?.data?.message || error.message));
    }
  };

  const isInvoiceOverdue = (invoice) => {
    if (!invoice.due_date || invoice.status === 'PAID' || invoice.status === 'OVERDUE') {
      return false;
    }
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const handleMarkAsOverdue = (invoice) => {
    if (window.confirm(`Apakah Anda yakin ingin mengubah status invoice ${invoice.invoice_number} ke OVERDUE?`)) {
      const notes = `Status diubah ke OVERDUE pada ${formatDate(new Date())}. Melewati tanggal jatuh tempo: ${formatDate(invoice.due_date)}.`;
      handleUpdateStatus(invoice.id, 'OVERDUE', notes);
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

  // Allow Super Admin, Admin and Finance roles to access this page
  if (!['Super Admin', 'Admin', 'Finance'].includes(user?.role?.name)) {
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
            <Button variant="outline-success" size="sm" onClick={handleExportExcel}>
              <i className="bi bi-file-earmark-excel me-1"></i>
              Export to Excel
            </Button>
            <div className="d-flex gap-2 flex-wrap">
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
              <Form.Group className="mb-0">
                <Form.Control
                  type="date"
                  placeholder="From Date"
                  value={filter.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="form-control form-control-sm"
                  title="From Date"
                />
              </Form.Group>
              <Form.Group className="mb-0">
                <Form.Control
                  type="date"
                  placeholder="To Date"
                  value={filter.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="form-control form-control-sm"
                  title="To Date"
                />
              </Form.Group>
              <Form.Group className="mb-0">
                <Form.Control
                  type="text"
                  placeholder="Customer"
                  value={filter.customer}
                  onChange={(e) => handleFilterChange('customer', e.target.value)}
                  className="form-control form-control-sm"
                />
              </Form.Group>
              <Form.Group className="mb-0">
                <Form.Control
                  type="number"
                  placeholder="Min Amount"
                  value={filter.min_amount}
                  onChange={(e) => handleFilterChange('min_amount', e.target.value)}
                  className="form-control form-control-sm"
                />
              </Form.Group>
              <Form.Group className="mb-0">
                <Form.Control
                  type="number"
                  placeholder="Max Amount"
                  value={filter.max_amount}
                  onChange={(e) => handleFilterChange('max_amount', e.target.value)}
                  className="form-control form-control-sm"
                />
              </Form.Group>
              <Button variant="outline-secondary" size="sm" onClick={() => setFilter({ status: '', search: '', date_from: '', date_to: '', customer: '', min_amount: '', max_amount: '' })}>
                <i className="bi bi-arrow-clockwise"></i> Reset
              </Button>
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
                  <tr
                    key={invoice.id}
                    className={isInvoiceOverdue(invoice) && invoice.status !== 'OVERDUE' ? 'table-warning' : ''}
                  >
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
                        {isInvoiceOverdue(invoice) && invoice.status !== 'OVERDUE' && (
                          <i className="bi bi-exclamation-triangle ms-1"></i>
                        )}
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
                      {(invoice.status === 'UNPAID' || invoice.status === 'PARTIAL') && (
                        <>
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-1"
                            onClick={() => handleMarkAsPaid(invoice)}
                            title="Add Payment"
                          >
                            <i className="bi bi-plus-circle"></i>
                          </Button>
                          {invoice.status === 'UNPAID' && isInvoiceOverdue(invoice) && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="me-1"
                              onClick={() => handleMarkAsOverdue(invoice)}
                              title="Mark as Overdue"
                            >
                              <i className="bi bi-exclamation-triangle"></i>
                            </Button>
                          )}
                        </>
                      )}

                      {/* Status Management Dropdown */}
                      <div className="btn-group me-1">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleStatusDropdown(invoice)}
                          title="Change Status"
                        >
                          <i className="bi bi-arrow-repeat"></i>
                        </Button>
                      </div>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        className="me-1"
                        onClick={() => handleViewPaymentHistory(invoice)}
                        title="View Payment History"
                      >
                        <i className="bi bi-clock-history"></i>
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

              {/* Payment Progress */}
              {paymentHistory.length > 0 && (
                <div className="mt-3">
                  <h6>Payment Progress</h6>
                  <div className="progress mb-2" style={{ height: '25px' }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${(paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0) / selectedInvoice.total_amount) * 100}%` }}
                    >
                      {Math.round((paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0) / selectedInvoice.total_amount) * 100)}% Paid
                    </div>
                  </div>
                  <small className="text-muted">
                    {formatCurrency(paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0))} of {formatCurrency(selectedInvoice.total_amount)}
                  </small>
                </div>
              )}

              {selectedInvoice.notes && (
                <div className="mt-3">
                  <h6>Notes</h6>
                  <p>{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Payment History Section */}
              <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0">Payment History</h6>
                  {paymentHistory.length > 0 && (
                    <div className="d-flex gap-2">
                      <Badge bg="success">
                        Total Paid: {formatCurrency(paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0))}
                      </Badge>
                      <Badge bg="warning">
                        Remaining: {formatCurrency(selectedInvoice.total_amount - paymentHistory.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0))}
                      </Badge>
                    </div>
                  )}
                </div>

                {paymentHistory.length > 0 ? (
                  <Table responsive size="sm">
                    <thead>
                      <tr>
                        <th>Payment Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td>{formatDate(payment.payment_date)}</td>
                          <td className="fw-semibold text-success">{formatCurrency(payment.amount_paid)}</td>
                          <td>{payment.payment_method}</td>
                          <td>{payment.reference_number || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <div className="text-center py-3 bg-light rounded">
                    <i className="bi bi-clock-history text-muted fs-4"></i>
                    <p className="text-muted mt-2 mb-0">No payment history found</p>
                  </div>
                )}
              </div>
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

      {/* Payment Confirmation Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-check-circle text-success me-2"></i>
            Konfirmasi Pembayaran
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedInvoice && (
            <div>
              <div className="mb-3">
                <strong>Invoice: </strong>{selectedInvoice.invoice_number}
              </div>
              <div className="mb-3">
                <strong>Total: </strong>{formatCurrency(selectedInvoice.total_amount)}
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Jumlah Pembayaran *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Masukkan jumlah pembayaran"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Tanggal Pembayaran *</Form.Label>
                <Form.Control
                  type="date"
                  value={paymentData.payment_date}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Catatan (Opsional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Masukkan catatan pembayaran..."
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
            <i className="bi bi-x-circle me-1"></i>
            Batal
          </Button>
          <Button variant="success" onClick={handleConfirmPayment}>
            <i className="bi bi-check-circle me-1"></i>
            Konfirmasi Pembayaran
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Status Change Modal */}
      <Modal show={statusModal.show} onHide={() => setStatusModal({ show: false, invoice: null, newStatus: '' })} size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-arrow-repeat text-primary me-2"></i>
            Change Invoice Status
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {statusModal.invoice && (
            <div>
              <div className="mb-3">
                <strong>Invoice: </strong>{statusModal.invoice.invoice_number}
              </div>
              <div className="mb-3">
                <strong>Current Status: </strong>
                <Badge bg={getStatusBadge(statusModal.invoice.status)}>
                  {statusModal.invoice.status}
                </Badge>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>New Status *</Form.Label>
                <Form.Select
                  value={statusModal.newStatus}
                  onChange={(e) => setStatusModal(prev => ({ ...prev, newStatus: e.target.value }))}
                  required
                >
                  <option value="">Select Status</option>
                  {getAvailableStatuses(statusModal.invoice.status).map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              {getAvailableStatuses(statusModal.invoice.status).length === 0 && (
                <Alert variant="warning">
                  <i className="bi bi-info-circle me-2"></i>
                  Cannot change status from {statusModal.invoice.status}
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setStatusModal({ show: false, invoice: null, newStatus: '' })}>
            <i className="bi bi-x-circle me-1"></i>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleStatusChange}
            disabled={!statusModal.newStatus || statusModal.newStatus === statusModal.invoice?.status}
          >
            <i className="bi bi-check-circle me-1"></i>
            Change Status
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Invoices;