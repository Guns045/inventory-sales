import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import './Quotations.css';

const Quotations = () => {
  const { get, post, put, delete: deleteApi } = useAPI();
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: '',
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
      const [quotationsRes, customersRes, productsRes] = await Promise.all([
        get('/quotations'),
        get('/customers'),
        get('/products')
      ]);

      setQuotations(quotationsRes.data.data || []);
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data.data || []);
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
        status: 'DRAFT',
        valid_until: '',
        items: []
      });
      setItems([]);
      setShowForm(false);
      setEditingQuotation(null);
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
    // Check if quotation can be edited (only DRAFT status can be edited)
    if (quotation.status !== 'DRAFT') {
      setError(`Cannot edit quotation with status "${quotation.status}". Only DRAFT quotations can be edited.`);
      return;
    }

    try {
      const response = await get(`/quotations/${quotation.id}`);
      const quotationDetails = response.data;

      setFormData({
        customer_id: quotationDetails.customer_id,
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

      setEditingQuotation(quotation.id);
      setShowForm(true);
    } catch (err) {
      setError('Failed to fetch quotation details');
      console.error('Error fetching quotation:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        await deleteApi(`/quotations/${id}`);
        await fetchData();
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
      status: 'DRAFT',
      valid_until: '',
      items: []
    });
    setItems([]);
    setEditingQuotation(null);
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
    <div className="quotations">
      <div className="header">
        <h1>Quotations</h1>
        <button className="btn btn-primary" onClick={openForm}>Add Quotation</button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
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
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="status">Status:</label>
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
                        {prod.sku} - {prod.name} - Rp {(prod.sell_price).toLocaleString()}
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
                        <td>Rp {(item.unit_price).toLocaleString()}</td>
                        <td>{item.discount_percentage}%</td>
                        <td>{item.tax_rate}%</td>
                        <td>Rp {(item.total_price).toLocaleString()}</td>
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

      <div className="table-container">
        <table>
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
            {quotations.map(quotation => (
              <tr key={quotation.id}>
                <td>{quotation.quotation_number}</td>
                <td>{quotation.customer?.company_name || 'N/A'}</td>
                <td>
                  <span className={`status status-${quotation.status.toLowerCase()}`}>
                    {quotation.status}
                  </span>
                  {quotation.status === 'SUBMITTED' && (
                    <small className="text-muted ms-2">(Pending Approval)</small>
                  )}
                </td>
                <td>{quotation.valid_until}</td>
                <td>Rp {(quotation.total_amount || 0).toLocaleString()}</td>
                <td>
                  <button
                    className="btn btn-sm btn-primary me-1"
                    onClick={() => handleEdit(quotation)}
                    disabled={quotation.status !== 'DRAFT'}
                  >
                    Edit
                  </button>
                  {quotation.status === 'DRAFT' && (
                    <button
                      className="btn btn-sm btn-warning me-1"
                      onClick={() => handleSubmitForApproval(quotation)}
                    >
                      Submit for Approval
                    </button>
                  )}
                  {quotation.status === 'SUBMITTED' && (
                    <>
                      <button
                        className="btn btn-sm btn-success me-1"
                        onClick={() => handleApprove(quotation.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-sm btn-danger me-1"
                        onClick={() => handleReject(quotation.id)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {quotation.status === 'APPROVED' && (
                    <button
                      className="btn btn-sm btn-info me-1"
                      onClick={() => handleConvertToSO(quotation)}
                      title="Convert to Sales Order"
                    >
                      Convert to SO
                    </button>
                  )}
                  {quotation.status === 'CONVERTED' && (
                    <span className="badge bg-success me-1">
                      <i className="bi bi-check-circle me-1"></i>
                      Converted
                    </span>
                  )}
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(quotation.id)}
                    disabled={quotation.status === 'APPROVED' || quotation.status === 'SUBMITTED' || quotation.status === 'CONVERTED'}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      {quotations.length === 0 && (
        <div className="text-center py-4">
          <p className="text-muted">No quotations found. Create your first quotation!</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default Quotations;