import React, { useState, useEffect } from 'react';
import './DeliveryOrders.css';

const DeliveryOrders = () => {
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    // In a real app, fetch delivery orders from the API
    setDeliveryOrders([
      { 
        id: 1, 
        delivery_order_number: 'SJ-2024-10-001', 
        customer: { company_name: 'Customer A' }, 
        status: 'SHIPPED', 
        shipping_date: '2024-10-15', 
        total_amount: 375.00 
      },
      { 
        id: 2, 
        delivery_order_number: 'SJ-2024-10-002', 
        customer: { company_name: 'Customer B' }, 
        status: 'PREPARING', 
        shipping_date: '2024-10-16', 
        total_amount: 25.00 
      },
      { 
        id: 3, 
        delivery_order_number: 'SJ-2024-10-003', 
        customer: { company_name: 'Customer A' }, 
        status: 'DELIVERED', 
        shipping_date: '2024-10-14', 
        total_amount: 700.00 
      }
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Loading delivery orders...</div>;
  }

  return (
    <div className="delivery-orders">
      <div className="header">
        <h1>Delivery Orders</h1>
        <button className="btn btn-primary">Create Delivery Order</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Shipping Date</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveryOrders.map(order => (
              <tr key={order.id}>
                <td>{order.delivery_order_number}</td>
                <td>{order.customer?.company_name || 'N/A'}</td>
                <td>
                  <span className={`status status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </td>
                <td>{order.shipping_date}</td>
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

export default DeliveryOrders;