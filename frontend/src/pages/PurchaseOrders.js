import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Form, Modal } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { usePermissions } from '../contexts/PermissionContext';
import './PurchaseOrders.css';

const PurchaseOrders = () => {
  const { api } = useAPI();
  const { user } = usePermissions();
  const { hasPermission, canRead, canCreate, canUpdate, canDelete } = usePermissions();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0
  });
  const [formData, setFormData] = useState({
    supplier_id: '',
    warehouse_id: '',
    status: 'DRAFT',
    expected_delivery_date: '',
    notes: ''
  });

  const [newItem, setNewItem] = useState({
    product_id: '',
    quantity: 1,
    unit_price: 0,
    tax_rate: 11 // Default tax 11%
  });

  const [items, setItems] = useState([]);

  // Send PO Form State
  const [sendFormData, setSendFormData] = useState({
    recipient_email: '',
    custom_message: ''
  });

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchWarehouses();
    fetchProducts();
  }, []);

  const fetchPurchaseOrders = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/purchase-orders?page=${page}`);
      if (response && response.data) {
        if (response.data.data) {
          setPurchaseOrders(response.data.data);
          setPagination({
            current_page: response.data.current_page,
            last_page: response.data.last_page,
            per_page: response.data.per_page,
            total: response.data.total,
            from: response.data.from,
            to: response.data.to
          });
        } else {
          const purchaseOrdersData = Array.isArray(response.data) ? response.data : [];
          setPurchaseOrders(purchaseOrdersData);
        }
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      setError('Failed to fetch purchase orders');
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      console.log('Suppliers API response:', response);
      if (response && response.data) {
        const suppliersData = Array.isArray(response.data) ? response.data : [];
        console.log('Suppliers data:', suppliersData);
        setSuppliers(suppliersData);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      if (response && response.data) {
        setWarehouses(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      if (response && response.data) {
        const productsData = response.data.data || response.data;
        const productsArray = Array.isArray(productsData) ? productsData : [];
        setProducts(productsArray);
        console.log('Products fetched:', productsArray);
        if (productsArray.length > 0) {
          console.log('Sample product structure:', productsArray[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    if (name === 'product_id') {
      // Auto-fill unit price when product is selected
      const selectedProduct = products.find(p => p.id === parseInt(value));
      console.log('Selected product:', selectedProduct);

      // Use the correct field name: buy_price
      let unitPrice = 0;
      if (selectedProduct) {
        unitPrice = selectedProduct.buy_price || 0;
        console.log('Unit price found:', unitPrice);
      }

      setNewItem(prev => ({
        ...prev,
        [name]: value,
        unit_price: unitPrice
      }));
    } else if (name === 'quantity') {
      // Ensure quantity is always an integer
      const intValue = parseInt(value) || 1;
      setNewItem(prev => ({
        ...prev,
        [name]: intValue
      }));
    } else {
      setNewItem(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const calculateItemTotal = (quantity, unitPrice, taxRate) => {
    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * (taxRate / 100);
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    };
  };

  const addItem = () => {
    if (!newItem.product_id || newItem.quantity <= 0) return;

    const selectedProduct = products.find(p => p.id === parseInt(newItem.product_id));
    if (!selectedProduct) return;

    // Ensure quantity is integer
    const quantity = parseInt(newItem.quantity) || 1;
    const unitPrice = parseFloat(selectedProduct.buy_price || newItem.unit_price);
    const taxRate = parseFloat(newItem.tax_rate);

    const calculations = calculateItemTotal(quantity, unitPrice, taxRate);

    const item = {
      id: Date.now(), // temporary ID
      product_id: newItem.product_id,
      product_name: selectedProduct.name || 'Product',
      sku: selectedProduct.sku || '',
      part_number: selectedProduct.sku || '',
      description: selectedProduct.description || selectedProduct.name || '',
      quantity: quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      subtotal: calculations.subtotal,
      tax_amount: calculations.taxAmount,
      total: calculations.total
    };

    setItems(prev => [...prev, item]);
    setNewItem({
      product_id: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 11
    });
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = items.reduce((sum, item) => sum + item.total, 0);

    return {
      subtotal,
      taxAmount,
      total
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      setError('Please add at least one item to the purchase order');
      return;
    }

    try {
      const payload = {
        ...formData,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes
        }))
      };

      if (editingOrder) {
        // Update existing order
        await api.put(`/purchase-orders/${editingOrder.id}`, payload);
      } else {
        // Create new order
        await api.post('/purchase-orders', payload);
      }

      // Reset form and state
      setShowCreateForm(false);
      setEditingOrder(null);
      setItems([]);
      setFormData({
        supplier_id: '',
        warehouse_id: '',
        status: 'DRAFT',
        expected_delivery_date: '',
        notes: ''
      });
      setNewItem({
        product_id: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: 11
      });
      fetchPurchaseOrders();
    } catch (err) {
      console.error('Error saving purchase order:', err);
      setError('Failed to save purchase order');
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      supplier_id: order.supplier_id,
      warehouse_id: order.warehouse_id,
      status: order.status,
      expected_date: order.expected_date,
      notes: order.notes
    });
    setShowCreateForm(true);
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingOrder(null);
    setItems([]);
    setFormData({
      supplier_id: '',
      warehouse_id: '',
      status: 'DRAFT',
      expected_delivery_date: '',
      notes: ''
    });
    setNewItem({
      product_id: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 11
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase order?')) {
      return;
    }

    try {
      await api.delete(`/purchase-orders/${id}`);
      fetchPurchaseOrders();
    } catch (err) {
      console.error('Error deleting purchase order:', err);
      setError('Failed to delete purchase order');
    }
  };

  const handleViewItems = async (order) => {
    setSelectedOrder(order);
    try {
      const response = await api.get(`/purchase-orders/${order.id}/items`);
      if (response && response.data) {
        setOrderItems(Array.isArray(response.data) ? response.data : []);
      }
      setShowItemsModal(true);
    } catch (err) {
      console.error('Error fetching order items:', err);
      setError('Failed to fetch order items');
    }
  };

  const handleStatusUpdate = async (order, newStatus) => {
    try {
      await api.put(`/purchase-orders/${order.id}/status`, { status: newStatus });
      fetchPurchaseOrders();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  // Print PDF Function
  const handlePrintPDF = async (orderId) => {
    try {
      console.log('Attempting to print purchase order:', orderId);

      // Use authenticated API call to get PDF
      const response = await api.get(`/purchase-orders/${orderId}/print`, {
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
        link.download = `purchase-order-${orderId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        alert('PDF downloaded. Please open the file to print.');
      }

      console.log('PDF loaded successfully');

    } catch (error) {
      console.error('Error printing purchase order:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      setError('Gagal mencetak purchase order: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    }
  };

  // Send PO Functions
  const handleSendPO = (order) => {
    setSelectedOrder(order);
    setSendFormData({
      recipient_email: order.supplier?.email || '',
      custom_message: ''
    });
    setShowSendModal(true);
    setError('');
    setSuccess('');
  };

  const handleSendPOChange = (e) => {
    const { name, value } = e.target;
    setSendFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendPOSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post(`/purchase-orders/${selectedOrder.id}/send`, sendFormData);

      setShowSendModal(false);
      setSendFormData({
        recipient_email: '',
        custom_message: ''
      });
      fetchPurchaseOrders();

      setSuccess('Purchase Order sent successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error sending purchase order:', err);
      setError('Failed to send purchase order');
    }
  };

  const handleCloseSendModal = () => {
    setShowSendModal(false);
    setSelectedOrder(null);
    setSendFormData({
      recipient_email: '',
      custom_message: ''
    });
    setError('');
    setSuccess('');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'DRAFT': { bg: 'secondary', text: 'Draft' },
      'SENT': { bg: 'info', text: 'Sent' },
      'CONFIRMED': { bg: 'primary', text: 'Confirmed' },
      'PARTIAL_RECEIVED': { bg: 'warning', text: 'Partial Received' },
      'COMPLETED': { bg: 'success', text: 'Completed' },
      'CANCELLED': { bg: 'danger', text: 'Cancelled' }
    };

    const config = statusConfig[status] || { bg: 'secondary', text: status };
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const canEditOrder = (order) => {
    return hasPermission('purchase-orders.update') && order.status === 'DRAFT';
  };

  const canDeleteOrder = (order) => {
    return hasPermission('purchase-orders.delete') && order.status === 'DRAFT';
  };

  const canSendOrder = (order) => {
    return hasPermission('purchase-orders.update') && order.status === 'DRAFT';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const renderPagination = () => {
    if (pagination.last_page <= 1) return null;

    const pages = [];
    const currentPage = pagination.current_page;
    const lastPage = pagination.last_page;

    // Show limited page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(lastPage, currentPage + 2);

    if (currentPage <= 3) {
      endPage = Math.min(5, lastPage);
    }

    if (currentPage >= lastPage - 2) {
      startPage = Math.max(1, lastPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "primary" : "outline-primary"}
          size="sm"
          className="me-1"
          onClick={() => fetchPurchaseOrders(i)}
        >
          {i}
        </Button>
      );
    }

    return (
      <div className="d-flex justify-content-center align-items-center mt-3">
        <Button
          variant="outline-primary"
          size="sm"
          className="me-2"
          disabled={currentPage <= 1}
          onClick={() => fetchPurchaseOrders(currentPage - 1)}
        >
          Previous
        </Button>
        {pages}
        <Button
          variant="outline-primary"
          size="sm"
          className="ms-2"
          disabled={currentPage >= lastPage}
          onClick={() => fetchPurchaseOrders(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading purchase orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-orders">
      <Container fluid>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">Purchase Orders</h2>
            <p className="text-muted mb-0">
              Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total} purchase orders
            </p>
          </div>
          <div>
            {hasPermission('purchase-orders.create') && (
              <Button variant="primary" onClick={() => setShowCreateForm(true)}>
                <i className="bi bi-plus-lg me-2"></i>
                Create Purchase Order
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" role="alert">
            {success}
          </Alert>
        )}

        {showCreateForm && (
          <div className="form-container">
            <h2>{editingOrder ? 'Edit Purchase Order' : 'Add New Purchase Order'}</h2>
            <Form onSubmit={handleSubmit}>
              {/* Simple Header Section */}
              <div className="form-row">
                <div className="form-group">
                  <Form.Label>Supplier:</Form.Label>
                  <Form.Select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </Form.Select>
                </div>
                <div className="form-group">
                  <Form.Label>Deliver To:</Form.Label>
                  <Form.Select
                    name="warehouse_id"
                    value={formData.warehouse_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <Form.Label>Expected Date:</Form.Label>
                  <Form.Control
                    type="date"
                    name="expected_delivery_date"
                    value={formData.expected_delivery_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <Form.Label>Status:</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="CONFIRMED">Confirmed</option>
                  </Form.Select>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="form-group" style={{marginTop: '2rem'}}>
                <h3>Order Items</h3>

                {/* Items Table */}
                {items.length > 0 && (
                  <div className="table-container" style={{marginTop: '1rem', marginBottom: '1rem'}}>
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th width="25%">Product</th>
                          <th width="15%">Quantity</th>
                          <th width="15%">Unit Price</th>
                          <th width="15%">Taxes</th>
                          <th width="15%" className="text-end">Amount</th>
                          <th width="10%">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.part_number}</strong><br/>
                              <small>{item.description}</small>
                            </td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td>{item.tax_rate}%</td>
                            <td className="text-end">{formatCurrency(item.total)}</td>
                            <td>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}

                {/* Add New Item Row */}
                <div className="table-container" style={{marginTop: '1rem'}}>
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th width="25%">Product</th>
                        <th width="15%">Quantity</th>
                        <th width="15%">Unit Price</th>
                        <th width="15%">Taxes</th>
                        <th width="15%" className="text-end">Amount</th>
                        <th width="10%">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <Form.Select
                            name="product_id"
                            value={newItem.product_id}
                            onChange={handleItemChange}
                            style={{fontSize: '0.9rem'}}
                          >
                            <option value="">Select Product</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>
                                {(product.sku || 'NO-SKU')} - {product.description || product.name} - {formatCurrency(product.buy_price || 0)}
                              </option>
                            ))}
                          </Form.Select>
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            name="quantity"
                            value={newItem.quantity}
                            onChange={handleItemChange}
                            min="1"
                            step="1"
                            size="sm"
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            name="unit_price"
                            value={newItem.unit_price}
                            onChange={handleItemChange}
                            min="0"
                            step="0.01"
                            size="sm"
                            readOnly
                            className="bg-light"
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            name="tax_rate"
                            value={newItem.tax_rate}
                            onChange={handleItemChange}
                            min="0"
                            max="100"
                            step="0.1"
                            size="sm"
                          />
                        </td>
                        <td className="text-end">
                          <strong>
                            {newItem.product_id && newItem.quantity > 0
                              ? formatCurrency(
                                  calculateItemTotal(
                                    parseFloat(newItem.quantity),
                                    parseFloat(newItem.unit_price),
                                    parseFloat(newItem.tax_rate)
                                  ).total
                                )
                              : formatCurrency(0)
                            }
                          </strong>
                        </td>
                        <td>
                          <Button
                            type="button"
                            variant="success"
                            size="sm"
                            onClick={addItem}
                            disabled={!newItem.product_id || newItem.quantity <= 0}
                          >
                            <i className="bi bi-plus-lg"></i> Add
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </div>

                {/* Totals Section */}
                {items.length > 0 && (() => {
                  const totals = calculateTotals();
                  return (
                    <div className="table-container" style={{marginTop: '1rem'}}>
                      <Table size="sm">
                        <tbody>
                          <tr>
                            <td width="70%"></td>
                            <td width="15%" className="text-end fw-bold">Subtotal:</td>
                            <td width="15%" className="text-end">{formatCurrency(totals.subtotal)}</td>
                          </tr>
                          <tr>
                            <td></td>
                            <td className="text-end fw-bold">Taxes:</td>
                            <td className="text-end">{formatCurrency(totals.taxAmount)}</td>
                          </tr>
                          <tr className="table-primary fw-bold">
                            <td></td>
                            <td className="text-end">Total:</td>
                            <td className="text-end">{formatCurrency(totals.total)}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>
                  );
                })()}
              </div>

              <div className="form-actions" style={{marginTop: '2rem'}}>
                <Button type="submit" variant="success" disabled={items.length === 0}>
                  {editingOrder ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="secondary" onClick={handleCancelForm}>
                  Cancel
                </Button>
              </div>
            </Form>
          </div>
        )}

        <Card className="table-container">
          <Card.Body>
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Warehouse</th>
                    <th>Status</th>
                    <th>Expected Date</th>
                    <th>Total Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="fw-medium">{order.po_number}</td>
                      <td>{order.supplier?.name || 'N/A'}</td>
                      <td>{order.warehouse?.name || 'N/A'}</td>
                      <td>{getStatusBadge(order.status)}</td>
                      <td>{order.expected_delivery_date || '-'}</td>
                      <td className="text-end">{formatCurrency(order.total_amount)}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewItems(order)}
                          >
                            <i className="bi bi-eye"></i>
                          </Button>
                          {canSendOrder(order) && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleSendPO(order)}
                            >
                              <i className="bi bi-envelope"></i>
                            </Button>
                          )}
                          <Button
                            variant="outline-info"
                            size="sm"
                            onClick={() => handlePrintPDF(order.id)}
                            title="Print PDF"
                          >
                            <i className="bi bi-file-earmark-pdf"></i>
                          </Button>
                          {canEditOrder(order) && (
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => handleEdit(order)}
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                          )}
                          {canDeleteOrder(order) && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(order.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        {renderPagination()}

        
        {/* View Items Modal */}
        <Modal show={showItemsModal} onHide={() => setShowItemsModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Order Items - {selectedOrder?.po_number}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {orderItems.length > 0 ? (
              <Table hover>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.product?.name || 'N/A'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td className="text-end">{formatCurrency(item.line_total)}</td>
                      <td>
                        <Badge bg={item.quantity_received >= item.quantity ? 'success' : 'warning'}>
                          {item.quantity_received}/{item.quantity} received
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-center text-muted">No items found</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowItemsModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Send PO Modal */}
        <Modal show={showSendModal} onHide={handleCloseSendModal} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="bi bi-envelope me-2"></i>
              Send Purchase Order - {selectedOrder?.po_number}
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSendPOSubmit}>
            <Modal.Body>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>PO Details</Form.Label>
                    <div className="p-3 bg-light rounded">
                      <p><strong>PO Number:</strong> {selectedOrder?.po_number}</p>
                      <p><strong>Supplier:</strong> {selectedOrder?.supplier?.name}</p>
                      <p><strong>Warehouse:</strong> {selectedOrder?.warehouse?.name}</p>
                      <p><strong>Total Amount:</strong> {formatCurrency(selectedOrder?.total_amount)}</p>
                      <p><strong>Expected Delivery:</strong> {selectedOrder?.expected_delivery_date || 'To be confirmed'}</p>
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Recipient Email *</Form.Label>
                    <Form.Control
                      type="email"
                      name="recipient_email"
                      value={sendFormData.recipient_email}
                      onChange={handleSendPOChange}
                      placeholder="supplier@example.com"
                      required
                    />
                    <Form.Text className="text-muted">
                      Enter the recipient's email address
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Custom Message (Optional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      name="custom_message"
                      value={sendFormData.custom_message}
                      onChange={handleSendPOChange}
                      rows={4}
                      placeholder="Enter any additional message for the supplier..."
                    />
                    <Form.Text className="text-muted">
                      This message will be included in the email body
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              {error && (
                <Alert variant="danger" className="mt-3">
                  {error}
                </Alert>
              )}

              <Row className="mt-3">
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Attachments</Form.Label>
                    <div className="p-3 bg-light rounded border">
                      <p><i className="bi bi-file-pdf me-2"></i>
                        Purchase Order - {selectedOrder?.po_number}.pdf
                      </p>
                      <small className="text-muted">
                        This PDF will be attached to the email automatically
                      </small>
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseSendModal}>
                Cancel
              </Button>
              <Button type="submit" variant="success">
                <i className="bi bi-send me-2"></i>
                Send Purchase Order
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default PurchaseOrders;