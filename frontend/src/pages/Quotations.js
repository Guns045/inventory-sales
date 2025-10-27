import React, { useState, useEffect } from 'react';
import './Quotations.css';

const Quotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [formData, setFormData] = useState({
    quotation_number: '',
    customer_id: '',
    status: 'DRAFT',
    valid_until: '',
    subtotal: 0,
    discount: 0,
    tax: 0,
    total_amount: 0
  });
  
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    product_id: '',
    quantity: 1,
    unit_price: 0,
    discount_percentage: 0,
    tax_rate: 0
  });

  // Mock data
  const customers = [
    { id: 1, company_name: 'Customer A' },
    { id: 2, company_name: 'Customer B' }
  ];
  
  const products = [
    { id: 1, name: 'Engine Oil Filter', sell_price: 25.00 },
    { id: 2, name: 'Hydraulic Pump', sell_price: 350.00 }
  ];

  useEffect(() => {
    // In a real app, fetch quotations from the API
    // For now, using mock data
    setQuotations([
      { id: 1, quotation_number: 'Q-2024-10-001', customer: { company_name: 'Customer A' }, status: 'APPROVED', valid_until: '2024-12-31', total_amount: 375.00 },
      { id: 2, quotation_number: 'Q-2024-10-002', customer: { company_name: 'Customer B' }, status: 'DRAFT', valid_until: '2024-11-30', total_amount: 25.00 }
    ]);
  }, []);

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
      id: items.length + 1,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingQuotation) {
      // Update quotation in a real app
      console.log('Updating quotation:', { ...formData, items });
    } else {
      // Create quotation in a real app
      console.log('Creating quotation:', { ...formData, items });
    }
    
    // Reset form and close
    setFormData({
      quotation_number: '',
      customer_id: '',
      status: 'DRAFT',
      valid_until: '',
      subtotal: 0,
      discount: 0,
      tax: 0,
      total_amount: 0
    });
    setItems([]);
    setShowForm(false);
    setEditingQuotation(null);
  };

  const handleEdit = (quotation) => {
    // In a real app, fetch quotation details and items
    setFormData({
      quotation_number: quotation.quotation_number,
      customer_id: quotation.customer_id || '',
      status: quotation.status,
      valid_until: quotation.valid_until,
      subtotal: quotation.total_amount, // Simplified for demo
      discount: 0,
      tax: 0,
      total_amount: quotation.total_amount
    });
    setItems([]); // Would fetch items in real app
    setEditingQuotation(quotation.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      // Delete quotation in a real app
      setQuotations(quotations.filter(q => q.id !== id));
    }
  };

  const openForm = () => {
    setFormData({
      quotation_number: '',
      customer_id: '',
      status: 'DRAFT',
      valid_until: '',
      subtotal: 0,
      discount: 0,
      tax: 0,
      total_amount: 0
    });
    setItems([]);
    setEditingQuotation(null);
    setShowForm(true);
  };

  return (
    <div className="quotations">
      <div className="header">
        <h1>Quotations</h1>
        <button className="btn btn-primary" onClick={openForm}>Add Quotation</button>
      </div>

      {showForm && (
        <div className="form-container">
          <h2>{editingQuotation ? 'Edit Quotation' : 'Add New Quotation'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quotation_number">Quotation Number:</label>
                <input
                  type="text"
                  id="quotation_number"
                  name="quotation_number"
                  value={formData.quotation_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="discount">Discount (%):</label>
                <input
                  type="number"
                  id="discount"
                  name="discount"
                  value={formData.discount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>
              <div className="form-group">
                <label htmlFor="tax">Tax (%):</label>
                <input
                  type="number"
                  id="tax"
                  name="tax"
                  value={formData.tax}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  max="100"
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
                      <option key={prod.id} value={prod.id}>{prod.name} - ${prod.sell_price}</option>
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
                        <td>${item.unit_price.toFixed(2)}</td>
                        <td>{item.discount_percentage}%</td>
                        <td>{item.tax_rate}%</td>
                        <td>${item.total_price.toFixed(2)}</td>
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
                </td>
                <td>{quotation.valid_until}</td>
                <td>${quotation.total_amount.toFixed(2)}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={() => handleEdit(quotation)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={() => handleDelete(quotation.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Quotations;