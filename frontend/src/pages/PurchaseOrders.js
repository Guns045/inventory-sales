import React, { useState, useEffect } from 'react';
import './PurchaseOrders.css';

const PurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    // In a real app, fetch purchase orders from the API
    setPurchaseOrders([
      { 
        id: 1, 
        po_number: 'PO-2024-10-001', 
        supplier: { name: 'Supplier A' }, 
        status: 'APPROVED', 
        order_date: '2024-10-01', 
        total_amount: 1500.00 
      },
      { 
        id: 2, 
        po_number: 'PO-2024-10-002', 
        supplier: { name: 'Supplier B' }, 
        status: 'RECEIVED', 
        order_date: '2024-10-05', 
        total_amount: 750.00 
      },
      { 
        id: 3, 
        po_number: 'PO-2024-10-003', 
        supplier: { name: 'Supplier A' }, 
        status: 'SUBMITTED', 
        order_date: '2024-10-10', 
        total_amount: 2200.00 
      }
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Loading purchase orders...</div>;
  }

  return (
    <div className="purchase-orders">
      <div className="header">
        <h1>Purchase Orders</h1>
        <button className="btn btn-primary">Create Purchase Order</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Order Date</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map(order => (
              <tr key={order.id}>
                <td>{order.po_number}</td>
                <td>{order.supplier?.name || 'N/A'}</td>
                <td>
                  <span className={`status status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </td>
                <td>{order.order_date}</td>
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

export default PurchaseOrders;