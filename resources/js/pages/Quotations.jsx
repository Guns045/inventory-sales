import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Card,
  Row,
  Col,
  Button,
  Form,
  Table,
  Modal,
  Spinner,
  InputGroup,
  Badge,
  Alert,
  Container
} from 'react-bootstrap';
import './Quotations.css';

const Quotations = () => {
  const { get, post, put, delete: deleteApi } = useAPI();
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [rejectionInfo, setRejectionInfo] = useState(null);

  // Format currency for Indonesia
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Get available actions based on user role and quotation status
  const getAvailableActions = (quotation) => {
    const userRole = user?.role?.name || user?.role || '';
    const isSalesTeam = userRole.toLowerCase().includes('sales');
    const isAdmin = userRole.toLowerCase().includes('admin') || userRole.toLowerCase().includes('manager');
    const isSuperAdmin = userRole === 'Super Admin';

    const actions = {
      canEdit: false,
      canDelete: false,
      canSubmit: false,
      canApprove: false,
      canReject: false,
      canConvertToSO: false,
      viewOnly: false
    };

    // Sales Team specific logic
    if (isSalesTeam) {
      switch (quotation.status) {
        case 'DRAFT':
          actions.canEdit = true;
          actions.canDelete = true;
          actions.canSubmit = true;
          break;
        case 'SUBMITTED':
          actions.viewOnly = true;
          break;
        case 'APPROVED':
          actions.canConvertToSO = true;
          break;
        case 'REJECTED':
          actions.canEdit = true;
          actions.canSubmit = true;
          break;
        case 'CONVERTED':
          actions.viewOnly = true;
          break;
      }
    }

    // Admin/Manager logic
    if (isAdmin) {
      switch (quotation.status) {
        case 'DRAFT':
          actions.canEdit = true;
          actions.canDelete = true;
          actions.canSubmit = true;
          break;
        case 'SUBMITTED':
          actions.canApprove = true;
          actions.canReject = true;
          break;
        case 'APPROVED':
          actions.canConvertToSO = true;
          break;
        case 'REJECTED':
          actions.canEdit = true;
          actions.canDelete = true;
          actions.canSubmit = true;
          break;
        case 'CONVERTED':
          actions.viewOnly = true;
          break;
      }
    }

    // Super Admin logic (can delete any quotation regardless of status)
    if (isSuperAdmin) {
      actions.canDelete = true;
      // Also inherit admin/manager permissions
      switch (quotation.status) {
        case 'DRAFT':
          actions.canEdit = true;
          actions.canSubmit = true;
          break;
        case 'SUBMITTED':
          actions.canApprove = true;
          actions.canReject = true;
          break;
        case 'APPROVED':
          actions.canConvertToSO = true;
          break;
        case 'REJECTED':
          actions.canEdit = true;
          actions.canSubmit = true;
          break;
        case 'CONVERTED':
          actions.viewOnly = true;
          break;
      }
    }

    return actions;
  };
  const [formData, setFormData] = useState({
    customer_id: '',
    warehouse_id: '',
    status: 'DRAFT',
    valid_until: '',
    items: []
  });

  const [newItem, setNewItem] = useState({
    product_id: '',
    quantity: 1,
    unit_price: 0,
    discount_percentage: 0,
    tax_rate: 0
  });

  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotationsRes, customersRes, productsRes, warehousesRes] = await Promise.all([
        get('/quotations'),
        get('/customers'),
        get('/products'),
        get('/warehouses')
      ]);

      setQuotations(quotationsRes.data.data || []);
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data.data || []);
      setWarehouses(warehousesRes.data || []);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setNewItem({
      ...newItem,
      [name]: value
    });
  };

  const addItem = () => {
    if (!newItem.product_id || newItem.quantity <= 0) return;

    const product = products.find(p => p.id === parseInt(newItem.product_id, 10));
    if (!product) return;

    const itemTotal = newItem.quantity * product.sell_price;
    const discountAmount = itemTotal * (newItem.discount_percentage / 100);
    const taxAmount = (itemTotal - discountAmount) * (newItem.tax_rate / 100);
    const total = itemTotal - discountAmount + taxAmount;

    const item = {
      id: Date.now(), // Use timestamp for unique ID
      product_id: parseInt(newItem.product_id, 10),
      product_name: product.name,
      quantity: newItem.quantity,
      unit_price: product.sell_price,
      discount_percentage: newItem.discount_percentage,
      tax_rate: newItem.tax_rate,
      total_price: total
    };

    setItems([...items, item]);

    // Reset form
    setNewItem({
      product_id: '',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 0
    });
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const discount = subtotal * (formData.discount / 100);
    const tax = (subtotal - discount) * (formData.tax / 100);
    const total = subtotal - discount + tax;
    
    setFormData({
      ...formData,
      subtotal,
      total_amount: total
    });
  };

  useEffect(() => {
    calculateTotals();
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate items before submission
    if (items.length === 0) {
      setError('Quotation must have at least one item');
      return;
    }

    // Validate items data
    const invalidItem = items.find(item =>
      !item.product_id || !item.quantity || !item.unit_price ||
      item.quantity <= 0 || item.unit_price <= 0
    );

    if (invalidItem) {
      setError('Please ensure all items have valid product, quantity, and price information');
      return;
    }

    try {
      const quotationData = {
        customer_id: formData.customer_id,
        warehouse_id: formData.warehouse_id,
        status: formData.status,
        valid_until: formData.valid_until,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
          tax_rate: item.tax_rate || 0
        }))
      };

      if (editingQuotation) {
        await put(`/quotations/${editingQuotation}`, quotationData);
      } else {
        await post('/quotations', quotationData);
      }

      // Refresh data
      await fetchData();

      // Reset form and close
      setFormData({
        customer_id: '',
        warehouse_id: '',
        status: 'DRAFT',
        valid_until: '',
        items: []
      });
      setItems([]);
      setShowForm(false);
      setEditingQuotation(null);
      setRejectionInfo(null);
    } catch (err) {
      let errorMessage = editingQuotation ? 'Failed to update quotation' : 'Failed to create quotation';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.errors) {
        // Handle Laravel validation errors
        const validationErrors = Object.values(err.response.data.errors).flat();
        errorMessage = validationErrors.join(', ');
      }
      setError(errorMessage);
      console.error('Error saving quotation:', err);
    }
  };

  const handleEdit = async (quotation) => {
    // Check if quotation can be edited (DRAFT and REJECTED status can be edited)
    if (!['DRAFT', 'REJECTED'].includes(quotation.status)) {
      setError(`Cannot edit quotation with status "${quotation.status}". Only DRAFT and REJECTED quotations can be edited.`);
      return;
    }

    try {
      const response = await get(`/quotations/${quotation.id}`);
      const quotationDetails = response.data;

      // Debug: Log the response data
      console.log('Quotation Details:', quotationDetails);
      console.log('Approvals:', quotationDetails.approvals);
      console.log('Status:', quotationDetails.status);

      setFormData({
        customer_id: quotationDetails.customer_id,
        warehouse_id: quotationDetails.warehouse_id || '',
        status: quotationDetails.status,
        valid_until: quotationDetails.valid_until ? quotationDetails.valid_until.split('T')[0] : '',
        items: []
      });

      // Set items from quotation details
      const quotationItems = quotationDetails.quotation_items || [];
      setItems(quotationItems.map(item => ({
        id: Date.now() + item.id,
        product_id: item.product_id,
        product_name: item.product?.name || 'Product',
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        tax_rate: item.tax_rate,
        total_price: item.total_price
      })));

      // Capture rejection information if status is REJECTED
      if (quotationDetails.status === 'REJECTED' && quotationDetails.approvals && quotationDetails.approvals.length > 0) {
        console.log('Found REJECTED status with approvals, checking for rejected approval...');
        const latestApproval = quotationDetails.approvals[quotationDetails.approvals.length - 1];
        console.log('Latest approval:', latestApproval);
        if (latestApproval.status === 'REJECTED') {
          console.log('Setting rejection info:', {
            reason_type: latestApproval.reason_type,
            notes: latestApproval.notes,
            rejected_by: latestApproval.approver_name,
            rejected_at: latestApproval.updated_at
          });
          setRejectionInfo({
            reason_type: latestApproval.reason_type,
            notes: latestApproval.notes,
            rejected_by: latestApproval.approver_name,
            rejected_at: latestApproval.updated_at
          });
        } else {
          console.log('Latest approval is not REJECTED, setting rejectionInfo to null');
          setRejectionInfo(null);
        }
      } else {
        console.log('No REJECTED status or approvals found, setting rejectionInfo to null');
        setRejectionInfo(null);
      }

      setEditingQuotation(quotation.id);
      setShowForm(true);
    } catch (err) {
      setError('Failed to fetch quotation details');
      console.error('Error fetching quotation:', err);
    }
  };

  const handleDelete = async (id, quotationNumber) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus Quotation ${quotationNumber}?`)) {
      try {
        await deleteApi(`/quotations/${id}`);
        await fetchData();
        // Show success message
        setError(''); // Clear any existing errors
        alert(`Quotation ${quotationNumber} berhasil dihapus!`);
      } catch (err) {
        setError('Failed to delete quotation');
        console.error('Error deleting quotation:', err);
      }
    }
  };

  const handleApprove = async (id) => {
    if (window.confirm('Are you sure you want to approve this quotation?')) {
      try {
        // Send notes field (even if empty) to match backend validation
        await post(`/quotations/${id}/approve`, { notes: '' });
        await fetchData();
      } catch (err) {
        let errorMessage = 'Failed to approve quotation';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.data?.errors) {
          // Handle Laravel validation errors
          const validationErrors = Object.values(err.response.data.errors).flat();
          errorMessage = validationErrors.join(', ');
        }
        setError(errorMessage);
        console.error('Error approving quotation:', err);
      }
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      try {
        await post(`/quotations/${id}/reject`, { notes: reason });
        await fetchData();
      } catch (err) {
        let errorMessage = 'Failed to reject quotation';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.data?.errors) {
          // Handle Laravel validation errors
          const validationErrors = Object.values(err.response.data.errors).flat();
          errorMessage = validationErrors.join(', ');
        }
        setError(errorMessage);
        console.error('Error rejecting quotation:', err);
      }
    }
  };

  const handleConvertToSO = async (quotation) => {
    if (window.confirm('Convert this quotation to Sales Order? Stock will be reserved for this order.')) {
      try {
        const response = await post(`/quotations/${quotation.id}/create-sales-order`, {
          notes: `Converted from Quotation ${quotation.quotation_number}`
        });

        if (response.stock_reserved) {
          alert('Quotation converted to Sales Order successfully! Stock has been reserved.');
        } else {
          alert('Quotation converted to Sales Order successfully!');
        }

        await fetchData();
      } catch (err) {
        let errorMessage = 'Failed to convert quotation to Sales Order';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
          if (err.response.data?.can_convert === false) {
            errorMessage += '\n\nPlease check if:\n- Quotation is approved\n- Sufficient stock is available\n- Quotation has not been converted before';
          }
        } else if (err.response?.data?.errors) {
          // Handle Laravel validation errors
          const validationErrors = Object.values(err.response.data.errors).flat();
          errorMessage = validationErrors.join(', ');
        }
        setError(errorMessage);
        console.error('Error converting to SO:', err);
      }
    }
  };

  const handleSubmitForApproval = async (quotation) => {
    if (window.confirm('Submit this quotation for approval?')) {
      try {
        await post(`/quotations/${quotation.id}/submit`, {
          notes: 'Please review this quotation for approval'
        });
        alert('Quotation submitted for approval successfully!');
        await fetchData();
      } catch (err) {
        let errorMessage = 'Failed to submit quotation for approval';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response?.data?.errors) {
          // Handle Laravel validation errors
          const validationErrors = Object.values(err.response.data.errors).flat();
          errorMessage = validationErrors.join(', ');
        }
        setError(errorMessage);
        console.error('Error submitting for approval:', err);
      }
    }
  };

  const openForm = () => {
    setFormData({
      customer_id: '',
      warehouse_id: '',
      status: 'DRAFT',
      valid_until: '',
      items: []
    });
    setItems([]);
    setEditingQuotation(null);
    setRejectionInfo(null);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="quotations">
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Container>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Quotation Management</h2>
          <p className="text-muted mb-0">Create and manage customer quotations</p>
        </div>
        <Button
          variant="primary"
          onClick={openForm}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Create Quotation
        </Button>
      </div>

      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}

      {showForm && (
        <div className="form-container">
          <h2>{editingQuotation ? 'Edit Quotation' : 'Add New Quotation'}</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="customer_id">Customer:</label>
                <select
                  id="customer_id"
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map(cust => (
                    <option key={cust.id} value={cust.id}>{cust.company_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="warehouse_id">Warehouse:</label>
                <select
                  id="warehouse_id"
                  name="warehouse_id"
                  value={formData.warehouse_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} {wh.code ? `(${wh.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status">Status:</label>
                {formData.status === 'REJECTED' && rejectionInfo ? (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '4px',
                    color: '#856404'
                  }}>
                    <strong>REJECTED</strong><br/>
                    Reason: {rejectionInfo.reason_type}
                  </div>
                ) : (
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="valid_until">Valid Until:</label>
                <input
                  type="date"
                  id="valid_until"
                  name="valid_until"
                  value={formData.valid_until}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            
            <div className="form-group">
              <h3>Quotation Items</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="product_id">Product:</label>
                  <select
                    id="product_id"
                    name="product_id"
                    value={newItem.product_id}
                    onChange={handleItemChange}
                  >
                    <option value="">Select Product</option>
                    {products.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.sku} - {prod.description || prod.name} - {formatCurrency(prod.sell_price)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="quantity">Quantity:</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={newItem.quantity}
                    onChange={handleItemChange}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="discount_percentage">Discount (%):</label>
                  <input
                    type="number"
                    id="discount_percentage"
                    name="discount_percentage"
                    value={newItem.discount_percentage}
                    onChange={handleItemChange}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tax_rate">Tax (%):</label>
                  <input
                    type="number"
                    id="tax_rate"
                    name="tax_rate"
                    value={newItem.tax_rate}
                    onChange={handleItemChange}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <button type="button" className="btn btn-primary" onClick={addItem}>
                Add Item
              </button>
            </div>

            {items.length > 0 && (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Discount (%)</th>
                      <th>Tax (%)</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td>{item.discount_percentage}%</td>
                        <td>{item.tax_rate}%</td>
                        <td>{formatCurrency(item.total_price)}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-danger" 
                            onClick={() => removeItem(item.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingQuotation ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <Card className="table-container">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead>
                <tr>
                  <th>Quotation Number</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Valid Until</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <i className="bi bi-inbox fs-1 text-muted mb-3"></i>
                      <h5 className="text-muted">No quotations found</h5>
                      <p className="text-muted">No quotation records available in the system</p>
                      <Button
                        variant="primary"
                        onClick={openForm}
                        className="mt-2"
                      >
                        <i className="bi bi-plus-circle me-2"></i>
                        Create First Quotation
                      </Button>
                    </td>
                  </tr>
                ) : (
                  quotations.map(quotation => (
                    <tr key={quotation.id}>
                      <td>
                        <code className="text-secondary">{quotation.quotation_number}</code>
                      </td>
                      <td>
                        <div>
                          <strong>{quotation.customer?.company_name || 'N/A'}</strong>
                          <br />
                          <small className="text-muted">
                            {quotation.customer?.contact_person || 'No Contact'}
                          </small>
                        </div>
                      </td>
                      <td>
                        <Badge bg={
                          quotation.status === 'DRAFT' ? 'secondary' :
                          quotation.status === 'SUBMITTED' ? 'warning' :
                          quotation.status === 'APPROVED' ? 'success' :
                          quotation.status === 'REJECTED' ? 'danger' :
                          quotation.status === 'CONVERTED' ? 'info' : 'secondary'
                        }>
                          {quotation.status}
                        </Badge>
                        {quotation.status === 'SUBMITTED' && (
                          <div className="mt-1">
                            <small className="text-muted">
                              <i className="bi bi-clock me-1"></i>
                              Pending Approval
                            </small>
                          </div>
                        )}
                      </td>
                      <td>{quotation.valid_until}</td>
                      <td>
                        <span className="text-primary fw-semibold">{formatCurrency(quotation.total_amount)}</span>
                      </td>
                      <td>
                        {(() => {
                          const actions = getAvailableActions(quotation);
                          return (
                            <div className="btn-group" role="group">
                              {actions.canEdit && (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleEdit(quotation)}
                                  title="Edit Quotation"
                                >
                                  <i className="bi bi-pencil"></i>
                                </Button>
                              )}

                              {actions.canSubmit && (
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  onClick={() => handleSubmitForApproval(quotation)}
                                  title="Submit for Approval"
                                >
                                  <i className="bi bi-send"></i>
                                </Button>
                              )}

                              {actions.canApprove && (
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleApprove(quotation.id)}
                                  title="Approve Quotation"
                                >
                                  <i className="bi bi-check-circle"></i>
                                </Button>
                              )}

                              {actions.canReject && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleReject(quotation.id)}
                                  title="Reject Quotation"
                                >
                                  <i className="bi bi-x-circle"></i>
                                </Button>
                              )}

                              {actions.canConvertToSO && (
                                <Button
                                  variant="outline-info"
                                  size="sm"
                                  onClick={() => handleConvertToSO(quotation)}
                                  title="Convert to Sales Order"
                                >
                                  <i className="bi bi-arrow-right-circle"></i>
                                </Button>
                              )}

                              {quotation.status === 'CONVERTED' && (
                                <Badge bg="success" className="ms-2">
                                  <i className="bi bi-check-circle me-1"></i>
                                  
                                </Badge>
                              )}

                              {actions.canDelete && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDelete(quotation.id, quotation.quotation_number)}
                                  title="Delete Quotation"
                                >
                                  <i className="bi bi-trash"></i>
                                </Button>
                              )}

                              {actions.viewOnly && quotation.status === 'SUBMITTED' && (
                                <Badge bg="warning" className="ms-2">
                                  <i className="bi bi-clock me-1"></i>
                                  Pending Approval
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Quotations;