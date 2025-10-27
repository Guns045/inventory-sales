import React, { useState, useEffect } from 'react';
import { useAPI } from '../contexts/APIContext';
import './ProductStock.css';

const ProductStock = () => {
  const { get } = useAPI();
  const [productStock, setProductStock] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    // In a real app, fetch product stock from the API
    setProductStock([
      { 
        id: 1, 
        product: { name: 'Engine Oil Filter', sku: 'PART-001' }, 
        warehouse: { name: 'Main Warehouse' }, 
        quantity: 45, 
        reserved_quantity: 5,
        min_stock_level: 10
      },
      { 
        id: 2, 
        product: { name: 'Hydraulic Pump', sku: 'PART-002' }, 
        warehouse: { name: 'Main Warehouse' }, 
        quantity: 12, 
        reserved_quantity: 2,
        min_stock_level: 5
      },
      { 
        id: 3, 
        product: { name: 'Air Filter', sku: 'PART-003' }, 
        warehouse: { name: 'Transit Warehouse' }, 
        quantity: 8, 
        reserved_quantity: 0,
        min_stock_level: 15
      }
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Loading product stock...</div>;
  }

  return (
    <div className="product-stock">
      <div className="header">
        <h1>Product Stock</h1>
        <button className="btn btn-primary">Adjust Stock</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Warehouse</th>
              <th>Available</th>
              <th>Reserved</th>
              <th>Min Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {productStock.map(stock => (
              <tr key={stock.id}>
                <td>{stock.product?.name || 'N/A'}</td>
                <td>{stock.product?.sku || 'N/A'}</td>
                <td>{stock.warehouse?.name || 'N/A'}</td>
                <td>{stock.quantity - stock.reserved_quantity}</td>
                <td>{stock.reserved_quantity}</td>
                <td>{stock.min_stock_level}</td>
                <td>
                  <span className={`status ${stock.quantity <= stock.min_stock_level ? 'status-low' : 'status-normal'}`}>
                    {stock.quantity <= stock.min_stock_level ? 'Low Stock' : 'Normal'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-primary">Adjust</button>
                  <button className="btn btn-sm btn-secondary">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductStock;