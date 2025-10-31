import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';
import './SalesOrders.css';

const SalesOrders = () => {
  const { get, post, put, delete: deleteRequest } = useAPI();
  const { user } = useAuth();

  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0
  });
  const [formData, setFormData] = useState({
    customer_id: '',
    status: 'PENDING',
    notes: ''
  });

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  const fetchSalesOrders = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const response = await get(`/sales-orders?page=${page}`);
      if (response && response.data) {
        // Handle paginated response - Laravel pagination returns data in response.data.data
        if (response.data.data) {
          // Paginated response
          setSalesOrders(response.data.data);
          setPagination({
            current_page: response.data.current_page,
            last_page: response.data.last_page,
            per_page: response.data.per_page,
            total: response.data.total,
            from: response.data.from,
            to: response.data.to
          });
        } else {
          // Simple array response (fallback)
          const salesOrdersData = Array.isArray(response.data) ? response.data : [];
          setSalesOrders(salesOrdersData);
          setPagination({
            current_page: 1,
            last_page: 1,
            per_page: salesOrdersData.length,
            total: salesOrdersData.length,
            from: 1,
            to: salesOrdersData.length
          });
        }
      }
    } catch (err) {
      console.error('Error fetching sales orders:', err);
      setError('Failed to fetch sales orders');
      setSalesOrders([]); // Ensure we always set an array
      setPagination({
        current_page: 1,
        last_page: 1,
        per_page: 0,
        total: 0,
        from: 0,
        to: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async (orderId) => {
    try {
      const response = await get(`/sales-orders/${orderId}/items`);
      if (response && response.data) {
        // Handle both array and paginated responses
        const itemsData = Array.isArray(response.data) ? response.data : response.data.data || [];
        setOrderItems(itemsData);
      }
    } catch (err) {
      console.error('Error fetching order items:', err);
      setError('Failed to fetch order items');
      setOrderItems([]); // Ensure we always set an array
    }
  };

  const handleView = async (order) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
    setShowItemsModal(true);
  };

  const handleStatusUpdate = async (order, newStatus) => {
    try {
      setError('');
      await post(`/sales-orders/${order.id}/update-status`, {
        status: newStatus,
        notes: `Status updated to ${newStatus} by ${user.name}`
      });

      await fetchSalesOrders(pagination.current_page);
      setShowItemsModal(false);

    } catch (err) {
      let errorMessage = 'Failed to update status';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
    }
  };

  const handleDelete = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this sales order?')) {
      try {
        setError('');
        await deleteRequest(`/sales-orders/${orderId}`);
        await fetchSalesOrders(pagination.current_page);
      } catch (err) {
        let errorMessage = 'Failed to delete sales order';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        }
        setError(errorMessage);
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { bg: 'warning', text: 'Pending' },
      'PROCESSING': { bg: 'info', text: 'Processing' },
      'READY_TO_SHIP': { bg: 'primary', text: 'Ready to Ship' },
      'SHIPPED': { bg: 'success', text: 'Shipped' },
      'COMPLETED': { bg: 'success', text: 'Completed' },
      'CANCELLED': { bg: 'danger', text: 'Cancelled' }
    };

    const config = statusConfig[status] || { bg: 'secondary', text: status };
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading sales orders...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row>
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h3 className="mb-0">
                    <i className="bi bi-cart-check me-2"></i>
                    Sales Orders
                  </h3>
                  <p className="text-muted mb-0">Manage and track all sales orders</p>
                </div>
                <Button variant="primary">
                  <i className="bi bi-plus-circle me-2"></i>
                  Create Sales Order
                </Button>
              </div>
            </Card.Header>

            <Card.Body>
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {salesOrders.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-cart-x fs-1 text-muted mb-3 d-block"></i>
                  <h5 className="text-muted">No Sales Orders Found</h5>
                  <p className="text-muted">Create your first sales order or convert a quotation to get started.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table hover className="align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>SO Number</th>
                          <th>Customer</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Total Amount</th>
                          <th>Created By</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesOrders.map(order => (
                          <tr key={order.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <div>
                                  <div className="fw-semibold">{order.sales_order_number}</div>
                                  {order.quotation && (
                                    <small className="text-muted">
                                      From: {order.quotation.quotation_number}
                                    </small>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="fw-medium">
                                {order.customer?.company_name || 'N/A'}
                              </div>
                            </td>
                            <td>
                              {getStatusBadge(order.status)}
                            </td>
                            <td>
                              <div>{formatDate(order.created_at)}</div>
                            </td>
                            <td>
                              <div className="fw-semibold text-primary">
                                {formatCurrency(order.total_amount)}
                              </div>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2"
                                     style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                                  {order.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <div className="small fw-medium">{order.user?.name || 'Unknown'}</div>
                                  <small className="text-muted">{order.user?.role?.name || ''}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleView(order)}
                                  title="View Details"
                                >
                                  <i className="bi bi-eye"></i>
                                </Button>

                                {order.status === 'PENDING' && (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => handleStatusUpdate(order, 'PROCESSING')}
                                    title="Start Processing"
                                  >
                                    <i className="bi bi-play-circle"></i>
                                  </Button>
                                )}

                                {order.status === 'PROCESSING' && (
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleStatusUpdate(order, 'READY_TO_SHIP')}
                                    title="Mark as Ready to Ship"
                                  >
                                    <i className="bi bi-truck"></i>
                                  </Button>
                                )}

                                {order.status === 'READY_TO_SHIP' && (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => handleStatusUpdate(order, 'SHIPPED')}
                                    title="Mark as Shipped"
                                  >
                                    <i className="bi bi-box-seam"></i>
                                  </Button>
                                )}

                                {order.status === 'SHIPPED' && (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => handleStatusUpdate(order, 'COMPLETED')}
                                    title="Mark as Completed"
                                  >
                                    <i className="bi bi-check-circle"></i>
                                  </Button>
                                )}

                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDelete(order.id)}
                                  disabled={order.status !== 'PENDING'}
                                  title="Delete Sales Order"
                                >
                                  <i className="bi bi-trash"></i>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {pagination.last_page > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="text-muted">
                        Showing {pagination.from} to {pagination.to} of {pagination.total} entries
                      </div>
                      <div className="btn-group" role="group">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => fetchSalesOrders(pagination.current_page - 1)}
                          disabled={pagination.current_page === 1}
                        >
                          <i className="bi bi-chevron-left"></i> Previous
                        </Button>

                        {/* Page Numbers */}
                        {[...Array(Math.min(5, pagination.last_page))].map((_, index) => {
                          const pageNumber = index + 1;
                          const isActive = pageNumber === pagination.current_page;
                          return (
                            <Button
                              key={pageNumber}
                              variant={isActive ? "primary" : "outline-secondary"}
                              size="sm"
                              onClick={() => fetchSalesOrders(pageNumber)}
                            >
                              {pageNumber}
                            </Button>
                          );
                        })}

                        {pagination.last_page > 5 && (
                          <>
                            <span className="btn btn-outline-secondary btn-sm disabled">...</span>
                            <Button
                              variant={pagination.current_page === pagination.last_page ? "primary" : "outline-secondary"}
                              size="sm"
                              onClick={() => fetchSalesOrders(pagination.last_page)}
                            >
                              {pagination.last_page}
                            </Button>
                          </>
                        )}

                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => fetchSalesOrders(pagination.current_page + 1)}
                          disabled={pagination.current_page === pagination.last_page}
                        >
                          Next <i className="bi bi-chevron-right"></i>
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Order Details Modal */}
      <Modal show={showItemsModal} onHide={() => setShowItemsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-cart-check me-2"></i>
            Sales Order Details - {selectedOrder?.sales_order_number}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <h6>Order Information</h6>
                  <p><strong>Customer:</strong> {selectedOrder.customer?.company_name}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedOrder.status)}</p>
                  <p><strong>Date:</strong> {formatDate(selectedOrder.created_at)}</p>
                </Col>
                <Col md={6}>
                  <h6>Created By</h6>
                  <p><strong>Name:</strong> {selectedOrder.user?.name}</p>
                  <p><strong>Role:</strong> {selectedOrder.user?.role?.name}</p>
                  {selectedOrder.quotation && (
                    <p><strong>Source:</strong> {selectedOrder.quotation.quotation_number}</p>
                  )}
                </Col>
              </Row>

              {selectedOrder.notes && (
                <Row className="mb-4">
                  <Col>
                    <h6>Notes</h6>
                    <p>{selectedOrder.notes}</p>
                  </Col>
                </Row>
              )}

              <h6>Order Items</h6>
              <Table striped responsive>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Discount</th>
                    <th>Tax</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product?.name || 'N/A'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td>{item.discount_percentage}%</td>
                      <td>{item.tax_rate}%</td>
                      <td className="fw-semibold">{formatCurrency(item.total_price || (item.quantity * item.unit_price))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="5">Total Amount:</th>
                    <th className="text-primary">{formatCurrency(selectedOrder.total_amount)}</th>
                  </tr>
                </tfoot>
              </Table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowItemsModal(false)}>
            Close
          </Button>
          {selectedOrder && selectedOrder.status === 'PENDING' && (
            <Button
              variant="success"
              onClick={() => handleStatusUpdate(selectedOrder, 'PROCESSING')}
            >
              <i className="bi bi-play-circle me-2"></i>
              Start Processing
            </Button>
          )}
          {selectedOrder && selectedOrder.status === 'PROCESSING' && (
            <Button
              variant="primary"
              onClick={() => handleStatusUpdate(selectedOrder, 'READY_TO_SHIP')}
            >
              <i className="bi bi-truck me-2"></i>
              Ready to Ship
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SalesOrders;