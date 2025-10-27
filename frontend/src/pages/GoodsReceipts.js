import React, { useState, useEffect } from 'react';
import './GoodsReceipts.css';

const GoodsReceipts = () => {
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    // In a real app, fetch goods receipts from the API
    setGoodsReceipts([
      { 
        id: 1, 
        receipt_number: 'GR-2024-10-001', 
        purchase_order: { po_number: 'PO-2024-10-001' }, 
        status: 'RECEIVED', 
        receipt_date: '2024-10-15', 
        total_amount: 1500.00 
      },
      { 
        id: 2, 
        receipt_number: 'GR-2024-10-002', 
        purchase_order: { po_number: 'PO-2024-10-002' }, 
        status: 'RECEIVED', 
        receipt_date: '2024-10-16', 
        total_amount: 750.00 
      },
      { 
        id: 3, 
        receipt_number: 'GR-2024-10-003', 
        purchase_order: { po_number: 'PO-2024-10-003' }, 
        status: 'PENDING', 
        receipt_date: '2024-10-17', 
        total_amount: 2200.00 
      }
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Loading goods receipts...</div>;
  }

  return (
    <div className="goods-receipts">
      <div className="header">
        <h1>Goods Receipts</h1>
        <button className="btn btn-primary">Create Goods Receipt</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Receipt Number</th>
              <th>Purchase Order</th>
              <th>Status</th>
              <th>Receipt Date</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {goodsReceipts.map(receipt => (
              <tr key={receipt.id}>
                <td>{receipt.receipt_number}</td>
                <td>{receipt.purchase_order?.po_number || 'N/A'}</td>
                <td>
                  <span className={`status status-${receipt.status.toLowerCase()}`}>
                    {receipt.status}
                  </span>
                </td>
                <td>{receipt.receipt_date}</td>
                <td>${receipt.total_amount.toFixed(2)}</td>
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

export default GoodsReceipts;