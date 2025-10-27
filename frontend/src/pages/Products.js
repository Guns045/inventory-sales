import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import './Products.css';

const Products = () => {
  const { get, post, put, delete: deleteReq } = useAPI();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    supplier_id: '',
    buy_price: '',
    sell_price: '',
    min_stock_level: 0
  });
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
        get('/products'),
        get('/categories'),
        get('/suppliers')
      ]);
      
      setProducts(productsRes.data.data || productsRes.data);
      setCategories(categoriesRes.data);
      setSuppliers(suppliersRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
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
      if (editingProduct) {
        await put(`/products/${editingProduct}`, formData);
        setProducts(products.map(p => p.id === editingProduct ? { ...formData, id: editingProduct } : p));
      } else {
        const response = await post('/products', formData);
        setProducts([...products, response.data]);
      }
      
      // Reset form and close
      setFormData({
        sku: '',
        name: '',
        description: '',
        category_id: '',
        supplier_id: '',
        buy_price: '',
        sell_price: '',
        min_stock_level: 0
      });
      setShowForm(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleEdit = async (product) => {
    // Fetch product details for editing
    try {
      const response = await get(`/products/${product.id}`);
      const productData = response.data;
      
      setFormData({
        sku: productData.sku,
        name: productData.name,
        description: productData.description,
        category_id: productData.category_id,
        supplier_id: productData.supplier_id,
        buy_price: productData.buy_price,
        sell_price: productData.sell_price,
        min_stock_level: productData.min_stock_level
      });
      setEditingProduct(productData.id);
      setShowForm(true);
    } catch (error) {
      console.error('Error fetching product for edit:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteReq(`/products/${id}`);
        setProducts(products.filter(product => product.id !== id));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const openForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      category_id: '',
      supplier_id: '',
      buy_price: '',
      sell_price: '',
      min_stock_level: 0
    });
    setEditingProduct(null);
    setShowForm(true);
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  return (
    <div className="products">
      <div className="header">
        <h1>Products</h1>
        <button className="btn btn-primary" onClick={openForm}>Add Product</button>
      </div>

      {showForm && (
        <div className="form-container">
          <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sku">SKU:</label>
                <input
                  type="text"
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  required
                />
              </div>
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
            </div>

            <div className="form-group">
              <label htmlFor="description">Description:</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category_id">Category:</label>
                <select
                  id="category_id"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="supplier_id">Supplier:</label>
                <select
                  id="supplier_id"
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="buy_price">Buy Price:</label>
                <input
                  type="number"
                  id="buy_price"
                  name="buy_price"
                  value={formData.buy_price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="sell_price">Sell Price:</label>
                <input
                  type="number"
                  id="sell_price"
                  name="sell_price"
                  value={formData.sell_price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="min_stock_level">Min Stock Level:</label>
              <input
                type="number"
                id="min_stock_level"
                name="min_stock_level"
                value={formData.min_stock_level}
                onChange={handleInputChange}
                min="0"
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingProduct ? 'Update' : 'Create'}
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
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Supplier</th>
              <th>Buy Price</th>
              <th>Sell Price</th>
              <th>Min Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>{product.category?.name || 'N/A'}</td>
                <td>{product.supplier?.name || 'N/A'}</td>
                <td>${product.buy_price}</td>
                <td>${product.sell_price}</td>
                <td>{product.min_stock_level}</td>
                <td>
                  <button 
                    className="btn btn-sm btn-primary" 
                    onClick={() => handleEdit(product)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger" 
                    onClick={() => handleDelete(product.id)}
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

export default Products;