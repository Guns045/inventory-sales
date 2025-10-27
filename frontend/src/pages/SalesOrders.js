import React, { useState, useEffect } from 'react';
import './SalesOrders.css';

const SalesOrders = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    // In a real app, fetch sales orders from the API
    setSalesOrders([
      { 
        id: 1, 
        sales_order_number: 'SO-2024-10-001', 
        customer: { company_name: 'Customer A' }, 
        status: 'COMPLETED', 
        created_at: '2024-10-15', 
        total_amount: 375.00 
      },
      { 
        id: 2, 
        sales_order_number: 'SO-2024-10-002', 
        customer: { company_name: 'Customer B' }, 
        status: 'SHIPPED', 
        created_at: '2024-10-16', 
        total_amount: 25.00 
      },
      { 
        id: 3, 
        sales_order_number: 'SO-2024-10-003', 
        customer: { company_name: 'Customer A' }, 
        status: 'PENDING', 
        created_at: '2024-10-17', 
        total_amount: 700.00 
      }
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Loading sales orders...</div>;
  }

  return (
    <div className="sales-orders">
      <div className="header">
        <h1>Sales Orders</h1>
        <button className="btn btn-primary">Create Sales Order</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Date</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {salesOrders.map(order => (
              <tr key={order.id}>
                <td>{order.sales_order_number}</td>
                <td>{order.customer?.company_name || 'N/A'}</td>
                <td>
                  <span className={`status status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </td>
                <td>{order.created_at}</td>
                <td>${order.total_amount.toFixed(2)}</td>
                <td>
                  <button className="btn btn-sm btn-primary">View</button>
                  <button className="btn btn-sm btn-secondary">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesOrders;