import React, { useState, useEffect } from 'react';
import './Invoices.css';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    // In a real app, fetch invoices from the API
    setInvoices([
      { 
        id: 1, 
        invoice_number: 'INV-2024-10-001', 
        customer: { company_name: 'Customer A' }, 
        status: 'PAID', 
        issue_date: '2024-10-15', 
        due_date: '2024-11-15', 
        total_amount: 375.00 
      },
      { 
        id: 2, 
        invoice_number: 'INV-2024-10-002', 
        customer: { company_name: 'Customer B' }, 
        status: 'UNPAID', 
        issue_date: '2024-10-16', 
        due_date: '2024-11-16', 
        total_amount: 25.00 
      },
      { 
        id: 3, 
        invoice_number: 'INV-2024-10-003', 
        customer: { company_name: 'Customer A' }, 
        status: 'OVERDUE', 
        issue_date: '2024-09-15', 
        due_date: '2024-10-15', 
        total_amount: 700.00 
      }
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Loading invoices...</div>;
  }

  return (
    <div className="invoices">
      <div className="header">
        <h1>Invoices</h1>
        <button className="btn btn-primary">Add Invoice</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(invoice => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number}</td>
                <td>{invoice.customer?.company_name || 'N/A'}</td>
                <td>
                  <span className={`status status-${invoice.status.toLowerCase()}`}>
                    {invoice.status}
                  </span>
                </td>
                <td>{invoice.issue_date}</td>
                <td>{invoice.due_date}</td>
                <td>${invoice.total_amount.toFixed(2)}</td>
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

export default Invoices;