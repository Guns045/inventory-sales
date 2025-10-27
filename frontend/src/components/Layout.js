import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Filter menu items based on user role
  const getMenuItems = () => {
    const allItems = [
      { 
        name: 'Dashboard', 
        path: '/', 
        roles: ['Admin', 'Sales', 'Gudang', 'Finance'] 
      },
      { 
        name: 'Products', 
        path: '/products', 
        roles: ['Admin', 'Sales', 'Gudang', 'Finance'] 
      },
      { 
        name: 'Categories', 
        path: '/categories', 
        roles: ['Admin'] 
      },
      { 
        name: 'Suppliers', 
        path: '/suppliers', 
        roles: ['Admin', 'Finance'] 
      },
      { 
        name: 'Customers', 
        path: '/customers', 
        roles: ['Admin', 'Sales', 'Finance'] 
      },
      { 
        name: 'Warehouses', 
        path: '/warehouses', 
        roles: ['Admin', 'Gudang'] 
      },
      { 
        name: 'Stock Levels', 
        path: '/product-stock', 
        roles: ['Admin', 'Gudang', 'Sales'] 
      },
      { 
        name: 'Quotations', 
        path: '/quotations', 
        roles: ['Admin', 'Sales'] 
      },
      { 
        name: 'Sales Orders', 
        path: '/sales-orders', 
        roles: ['Admin', 'Sales', 'Gudang'] 
      },
      { 
        name: 'Delivery Orders', 
        path: '/delivery-orders', 
        roles: ['Admin', 'Gudang'] 
      },
      { 
        name: 'Invoices', 
        path: '/invoices', 
        roles: ['Admin', 'Finance'] 
      },
      { 
        name: 'Payments', 
        path: '/payments', 
        roles: ['Admin', 'Finance'] 
      },
      { 
        name: 'Purchase Orders', 
        path: '/purchase-orders', 
        roles: ['Admin', 'Finance'] 
      },
      { 
        name: 'Goods Receipts', 
        path: '/goods-receipts', 
        roles: ['Admin', 'Gudang'] 
      }
    ];

    // Filter items based on user role
    return allItems.filter(item => 
      item.roles.includes(user?.role?.name)
    );
  };

  const menuItems = getMenuItems();

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="nav-header">
          <h3>Inventory System</h3>
        </div>
        <ul className="nav-menu">
          {menuItems.map((item, index) => (
            <li key={index}>
              <Link 
                to={item.path} 
                className={isActive(item.path) ? 'active' : ''}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="user-info">
          <div className="user-details">
            <span className="user-name">Welcome, {user?.name}</span>
            <span className="user-role">{user?.role?.name}</span>
          </div>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;