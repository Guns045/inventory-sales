import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Container, Row, Col, Nav, Button } from 'react-bootstrap';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { path: '/products', label: 'Products', icon: 'bi-box' },
    { path: '/categories', label: 'Categories', icon: 'bi-tags' },
    { path: '/suppliers', label: 'Suppliers', icon: 'bi-truck' },
    { path: '/customers', label: 'Customers', icon: 'bi-people' },
    { path: '/warehouses', label: 'Warehouses', icon: 'bi-building' },
    { path: '/product-stock', label: 'Stock', icon: 'bi-graph-up' },
    { path: '/quotations', label: 'Quotations', icon: 'bi-file-text' },
    { path: '/sales-orders', label: 'Sales Orders', icon: 'bi-cart' },
    { path: '/delivery-orders', label: 'Delivery Orders', icon: 'bi-truck-flatbed' },
    { path: '/purchase-orders', label: 'Purchase Orders', icon: 'bi-box-arrow-in-down' },
    { path: '/goods-receipts', label: 'Goods Receipts', icon: 'bi-receipt' },
    { path: '/invoices', label: 'Invoices', icon: 'bi-file-earmark-text' },
    { path: '/payments', label: 'Payments', icon: 'bi-credit-card' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div className={`sidebar d-none d-lg-block ${sidebarOpen ? 'show' : ''}`} style={{ width: '280px' }}>
        <div className="sidebar-header">
          <h3>
            <i className="bi bi-box-seam me-2"></i>
            Inventory System
          </h3>
        </div>
        <Nav className="flex-column p-3">
          {menuItems.map((item) => (
            <Nav.Link
              key={item.path}
              as={Link}
              to={item.path}
              className={`mb-1 ${location.pathname === item.path ? 'active' : ''}`}
            >
              <i className={`bi ${item.icon} me-3`}></i>
              {item.label}
            </Nav.Link>
          ))}
          <div className="mt-auto pt-3 border-top border-white-50">
            <Nav.Link onClick={handleLogout} className="text-white">
              <i className="bi bi-box-arrow-right me-3"></i>
              Logout
            </Nav.Link>
          </div>
        </Nav>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1040 }}
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Mobile Sidebar */}
      <div className={`sidebar d-lg-none position-fixed top-0 start-0 h-100 ${sidebarOpen ? 'show' : ''}`} style={{ zIndex: 1045 }}>
        <div className="sidebar-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-box-seam me-2"></i>
            Inventory
          </h5>
          <Button
            variant="link"
            className="text-white p-0"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="bi bi-x-lg"></i>
          </Button>
        </div>
        <Nav className="flex-column p-3">
          {menuItems.map((item) => (
            <Nav.Link
              key={item.path}
              as={Link}
              to={item.path}
              className={`mb-1 text-white ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <i className={`bi ${item.icon} me-3`}></i>
              {item.label}
            </Nav.Link>
          ))}
          <div className="mt-auto pt-3 border-top border-white-50">
            <Nav.Link onClick={handleLogout} className="text-white">
              <i className="bi bi-box-arrow-right me-3"></i>
              Logout
            </Nav.Link>
          </div>
        </Nav>
      </div>

      {/* Main Content */}
      <div className="main-content flex-grow-1">
        {/* Top Navigation */}
        <header className="top-navbar">
          <Row className="align-items-center">
            <Col>
              <div className="d-flex align-items-center">
                <Button
                  variant="light"
                  className="d-lg-none me-3"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <i className="bi bi-list fs-5"></i>
                </Button>
                <h4 className="mb-0 fw-semibold">
                  <i className="bi bi-box-seam me-2 text-primary"></i>
                  Inventory Management System
                </h4>
              </div>
            </Col>
            <Col xs="auto">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <i className="bi bi-person-circle me-2"></i>
                  <span className="text-muted">Welcome, Admin</span>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={handleLogout} className="d-none d-md-inline-block">
                  <i className="bi bi-box-arrow-right me-1"></i>
                  Logout
                </Button>
              </div>
            </Col>
          </Row>
        </header>

        {/* Content Area */}
        <main className="p-4">
          <Container fluid>
            <Outlet />
          </Container>
        </main>
      </div>
    </div>
  );
};

export default Layout;