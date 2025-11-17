import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import './Suppliers.css';

const Suppliers = () => {
  const { get, post, put, delete: deleteReq } = useAPI();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await get('/suppliers');
      setSuppliers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
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
      if (editingSupplier) {
        await put(`/suppliers/${editingSupplier}`, formData);
        setSuppliers(suppliers.map(s => s.id === editingSupplier ? { ...formData, id: editingSupplier } : s));
      } else {
        const response = await post('/suppliers', formData);
        setSuppliers([...suppliers, response.data]);
      }
      
      // Reset form and close
      setFormData({ name: '', contact_person: '', phone: '', address: '' });
      setShowForm(false);
      setEditingSupplier(null);
    } catch (error) {
      console.error('Error saving supplier:', error);
    }
  };

  const handleEdit = async (supplier) => {
    // Fetch supplier details for editing in a real app
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person,
      phone: supplier.phone,
      address: supplier.address
    });
    setEditingSupplier(supplier.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await deleteReq(`/suppliers/${id}`);
        setSuppliers(suppliers.filter(supplier => supplier.id !== id));
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  };

  const openForm = () => {
    setFormData({ name: '', contact_person: '', phone: '', address: '' });
    setEditingSupplier(null);
    setShowForm(true);
  };

  if (loading) {
    return <div className="loading">Loading suppliers...</div>;
  }

  return (
    <div className="suppliers">
      <div className="header">
        <h1>Suppliers</h1>
        <button className="btn btn-primary" onClick={openForm}>Add Supplier</button>
      </div>

      {showForm && (
        <div className="form-container">
          <h2>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name:</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
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

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingSupplier ? 'Update' : 'Create'}
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
              <th>Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map(supplier => (
              <tr key={supplier.id}>
                <td>{supplier.name}</td>
                <td>{supplier.contact_person}</td>
                <td>{supplier.phone}</td>
                <td>{supplier.address}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={() => handleEdit(supplier)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={() => handleDelete(supplier.id)}
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

export default Suppliers;