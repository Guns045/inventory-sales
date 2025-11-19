import React, { useState, useEffect } from 'react';
import './Payments.css';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    // In a real app, fetch payments from the API
    setPayments([
      { 
        id: 1, 
        invoice_number: 'INV-2024-10-001', 
        customer: { company_name: 'Customer A' }, 
        amount_paid: 375.00, 
        payment_date: '2024-10-15', 
        payment_method: 'Bank Transfer',
        reference_number: 'REF-001'
      },
      { 
        id: 2, 
        invoice_number: 'INV-2024-10-002', 
        customer: { company_name: 'Customer B' }, 
        amount_paid: 25.00, 
        payment_date: '2024-10-16', 
        payment_method: 'Cash',
        reference_number: 'REF-002'
      },
      { 
        id: 3, 
        invoice_number: 'INV-2024-10-003', 
        customer: { company_name: 'Customer A' }, 
        amount_paid: 700.00, 
        payment_date: '2024-10-14', 
        payment_method: 'Credit Card',
        reference_number: 'REF-003'
      }
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Loading payments...</div>;
  }

  return (
    <div className="payments">
      <div className="header">
        <h1>Payments</h1>
        <button className="btn btn-primary">Record Payment</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Payment Date</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id}>
                <td>{payment.invoice_number}</td>
                <td>{payment.customer?.company_name || 'N/A'}</td>
                <td>${payment.amount_paid.toFixed(2)}</td>
                <td>{payment.payment_date}</td>
                <td>{payment.payment_method}</td>
                <td>{payment.reference_number}</td>
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

export default Payments;