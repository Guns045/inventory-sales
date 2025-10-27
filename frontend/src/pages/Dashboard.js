import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAPI } from '../contexts/APIContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const { get } = useAPI();
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingOrders: 0,
    lowStockItems: 0,
    todaySales: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        // In a real app, we would fetch these stats from the API
        // For now, using mock data based on user role
        const mockStats = {
          totalProducts: 156,
          pendingOrders: user?.role?.name === 'Sales' ? 5 : 
                        user?.role?.name === 'Gudang' ? 3 : 
                        user?.role?.name === 'Finance' ? 2 : 12,
          lowStockItems: 8,
          todaySales: user?.role?.name === 'Finance' ? 15750.00 : 0
        };
        
        setStats(mockStats);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  // Determine available actions based on user role
  const getAvailableActions = () => {
    const baseActions = [
      { 
        title: 'View Products', 
        description: 'Manage your product inventory',
        path: '/products',
        roles: ['Admin', 'Sales', 'Gudang', 'Finance']
      },
      { 
        title: 'View Customers', 
        description: 'Manage customer information',
        path: '/customers',
        roles: ['Admin', 'Sales']
      }
    ];

    // Add role-specific actions
    if (user?.role?.name === 'Sales' || user?.role?.name === 'Admin') {
      baseActions.push(
        { 
          title: 'Create Quotation', 
          description: 'Create a new quotation for a customer',
          path: '/quotations',
          roles: ['Admin', 'Sales']
        },
        { 
          title: 'View Sales Orders', 
          description: 'Manage sales orders',
          path: '/sales-orders',
          roles: ['Admin', 'Sales']
        }
      );
    }

    if (user?.role?.name === 'Gudang' || user?.role?.name === 'Admin') {
      baseActions.push(
        { 
          title: 'Process Orders', 
          description: 'Process pending sales orders',
          path: '/sales-orders',
          roles: ['Admin', 'Gudang']
        },
        { 
          title: 'Create Delivery Orders', 
          description: 'Create delivery orders for shipments',
          path: '/delivery-orders',
          roles: ['Admin', 'Gudang']
        }
      );
    }

    if (user?.role?.name === 'Finance' || user?.role?.name === 'Admin') {
      baseActions.push(
        { 
          title: 'Create Invoices', 
          description: 'Generate invoices from sales orders',
          path: '/invoices',
          roles: ['Admin', 'Finance']
        },
        { 
          title: 'Manage Payments', 
          description: 'Track and manage payments',
          path: '/payments',
          roles: ['Admin', 'Finance']
        }
      );
    }

    // Filter actions based on user role
    return baseActions.filter(action => 
      action.roles.includes(user?.role?.name)
    );
  };

  if (loading) {
    return (
      <div className="dashboard">
        <h1>Dashboard</h1>
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  const availableActions = getAvailableActions();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.name}</h1>
        <p className="user-role">Role: {user?.role?.name}</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="stat-icon-products">📦</i>
          </div>
          <div className="stat-content">
            <h3>Total Products</h3>
            <p className="stat-value">{stats.totalProducts}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="stat-icon-orders">📋</i>
          </div>
          <div className="stat-content">
            <h3>Pending Orders</h3>
            <p className="stat-value">{stats.pendingOrders}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="stat-icon-low-stock">⚠️</i>
          </div>
          <div className="stat-content">
            <h3>Low Stock Items</h3>
            <p className="stat-value">{stats.lowStockItems}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="stat-icon-sales">💰</i>
          </div>
          <div className="stat-content">
            <h3>Today's Sales</h3>
            <p className="stat-value">${stats.todaySales.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            {availableActions.map((action, index) => (
              <div key={index} className="action-card" onClick={() => window.location.hash = action.path}>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
                <div className="action-button">Go to {action.title}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Role-specific widgets */}
        <div className="dashboard-widgets">
          {user?.role?.name === 'Sales' && (
            <div className="widget">
              <h3>Sales Summary</h3>
              <p>Track your quotations and sales orders</p>
              <div className="widget-stats">
                <div className="widget-stat">
                  <span className="stat-label">Quotations This Month:</span>
                  <span className="stat-value">12</span>
                </div>
                <div className="widget-stat">
                  <span className="stat-label">Conversion Rate:</span>
                  <span className="stat-value">45%</span>
                </div>
              </div>
            </div>
          )}

          {user?.role?.name === 'Gudang' && (
            <div className="widget">
              <h3>Warehouse Summary</h3>
              <p>Manage your inventory and orders</p>
              <div className="widget-stats">
                <div className="widget-stat">
                  <span className="stat-label">Pending Orders:</span>
                  <span className="stat-value">3</span>
                </div>
                <div className="widget-stat">
                  <span className="stat-label">Ready to Ship:</span>
                  <span className="stat-value">2</span>
                </div>
              </div>
            </div>
          )}

          {user?.role?.name === 'Finance' && (
            <div className="widget">
              <h3>Finance Summary</h3>
              <p>Monitor invoices and payments</p>
              <div className="widget-stats">
                <div className="widget-stat">
                  <span className="stat-label">Pending Invoices:</span>
                  <span className="stat-value">5</span>
                </div>
                <div className="widget-stat">
                  <span className="stat-label">Total Amount Due:</span>
                  <span className="stat-value">$12,450</span>
                </div>
              </div>
            </div>
          )}

          <div className="widget">
            <h3>Recent Activity</h3>
            <ul className="activity-list">
              <li>New quotation #Q-2024-10-001 created</li>
              <li>Sales order #SO-2024-10-001 approved</li>
              <li>Product stock updated: Engine Oil Filter</li>
              <li>Delivery order #SJ-2024-10-001 shipped</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;