import React, { useState, useEffect } from 'react';
import './Categories.css';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: ''
  });

  useEffect(() => {
    // In a real app, fetch categories from the API
    // For now, using mock data
    setCategories([
      { id: 1, name: 'Engine Parts' },
      { id: 2, name: 'Filters' },
      { id: 3, name: 'Hydraulics' }
    ]);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingCategory) {
      // Update category in a real app
      setCategories(categories.map(cat => 
        cat.id === editingCategory ? { ...cat, ...formData } : cat
      ));
    } else {
      // Create category in a real app
      const newCategory = {
        id: categories.length + 1,
        ...formData
      };
      setCategories([...categories, newCategory]);
    }
    
    // Reset form and close
    setFormData({ name: '' });
    setShowForm(false);
    setEditingCategory(null);
  };

  const handleEdit = (category) => {
    setFormData({ name: category.name });
    setEditingCategory(category.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      // Delete category in a real app
      setCategories(categories.filter(cat => cat.id !== id));
    }
  };

  const openForm = () => {
    setFormData({ name: '' });
    setEditingCategory(null);
    setShowForm(true);
  };

  return (
    <div className="categories">
      <div className="header">
        <h1>Categories</h1>
        <button className="btn btn-primary" onClick={openForm}>Add Category</button>
      </div>

      {showForm && (
        <div className="form-container">
          <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
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
            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingCategory ? 'Update' : 'Create'}
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={() => handleEdit(category)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={() => handleDelete(category.id)}
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

export default Categories;