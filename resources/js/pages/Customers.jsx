import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import './Customers.css';

const Customers = () => {
  const { get, post, put, delete: deleteReq } = useAPI();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await get('/customers');
      setCustomers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCustomer) {
        await put(`/customers/${editingCustomer}`, formData);
        setCustomers(customers.map(c => c.id === editingCustomer ? { ...formData, id: editingCustomer } : c));
      } else {
        const response = await post('/customers', formData);
        setCustomers([...customers, response.data]);
      }
      
      // Reset form and close
      setFormData({ 
        company_name: '', 
        contact_person: '', 
        email: '', 
        phone: '', 
        address: '', 
        tax_id: '' 
      });
      setShowForm(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleEdit = async (customer) => {
    // Fetch customer details for editing in a real app
    setFormData({
      company_name: customer.company_name,
      contact_person: customer.contact_person,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      tax_id: customer.tax_id
    });
    setEditingCustomer(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteReq(`/customers/${id}`);
        setCustomers(customers.filter(customer => customer.id !== id));
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  const openForm = () => {
    setFormData({ 
      company_name: '', 
      contact_person: '', 
      email: '', 
      phone: '', 
      address: '', 
      tax_id: '' 
    });
    setEditingCustomer(null);
    setShowForm(true);
  };

  if (loading) {
    return <div className="loading">Loading customers...</div>;
  }

  return (
    <div className="customers">
      <div className="header">
        <h1>Customers</h1>
        <button className="btn btn-primary" onClick={openForm}>Add Customer</button>
      </div>

      {showForm && (
        <div className="form-container">
          <h2>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="company_name">Company Name:</label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="contact_person">Contact Person:</label>
              <input
                type="text"
                id="contact_person"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone:</label>
              <input
                type="text"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address:</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tax_id">Tax ID:</label>
              <input
                type="text"
                id="tax_id"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingCustomer ? 'Update' : 'Create'}
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
              <th>Company Name</th>
              <th>Contact Person</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id}>
                <td>{customer.company_name}</td>
                <td>{customer.contact_person}</td>
                <td>{customer.email}</td>
                <td>{customer.phone}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={() => handleEdit(customer)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={() => handleDelete(customer.id)}
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

export default Customers;