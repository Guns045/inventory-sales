import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import './Warehouses.css';

const Warehouses = () => {
  const { get, post, put, delete: deleteReq } = useAPI();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await get('/warehouses');
      setWarehouses(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
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
      if (editingWarehouse) {
        await put(`/warehouses/${editingWarehouse}`, formData);
        setWarehouses(warehouses.map(w => w.id === editingWarehouse ? { ...formData, id: editingWarehouse } : w));
      } else {
        const response = await post('/warehouses', formData);
        setWarehouses([...warehouses, response.data]);
      }
      
      // Reset form and close
      setFormData({ name: '', location: '' });
      setShowForm(false);
      setEditingWarehouse(null);
    } catch (error) {
      console.error('Error saving warehouse:', error);
    }
  };

  const handleEdit = async (warehouse) => {
    // Fetch warehouse details for editing in a real app
    setFormData({
      name: warehouse.name,
      location: warehouse.location
    });
    setEditingWarehouse(warehouse.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await deleteReq(`/warehouses/${id}`);
        setWarehouses(warehouses.filter(warehouse => warehouse.id !== id));
      } catch (error) {
        console.error('Error deleting warehouse:', error);
      }
    }
  };

  const openForm = () => {
    setFormData({ name: '', location: '' });
    setEditingWarehouse(null);
    setShowForm(true);
  };

  if (loading) {
    return <div className="loading">Loading warehouses...</div>;
  }

  return (
    <div className="warehouses">
      <div className="header">
        <h1>Warehouses</h1>
        <button className="btn btn-primary" onClick={openForm}>Add Warehouse</button>
      </div>

      {showForm && (
        <div className="form-container">
          <h2>{editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</h2>
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
              <label htmlFor="location">Location:</label>
              <textarea
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingWarehouse ? 'Update' : 'Create'}
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
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map(warehouse => (
              <tr key={warehouse.id}>
                <td>{warehouse.name}</td>
                <td>{warehouse.location}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={() => handleEdit(warehouse)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={() => handleDelete(warehouse.id)}
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

export default Warehouses;