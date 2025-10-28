import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionContext';
import { Container, Row, Col, Nav, Button, Spinner } from 'react-bootstrap';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const { user, visibleMenuItems, loading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Show loading spinner while permissions are loading
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div className={`sidebar d-none d-lg-block ${sidebarOpen ? 'show' : ''}`} style={{ width: '280px' }}>
        <div className="sidebar-header">
          <h4>
            <i className="bi bi-box-seam me-2"></i>
            Inventory System
          </h4>
          <small className="text-muted d-block mt-1">
            Role: {user?.role || 'Unknown'}
          </small>
        </div>
        <Nav className="flex-column p-3">
          {visibleMenuItems.map((item) => (
            <Nav.Link
              key={item.path}
              as={Link}
              to={item.path}
              className={`mb-1 ${location.pathname === item.path ? 'active' : ''}`}
              title={item.description}
            >
              <i className={`bi ${item.icon} me-3`}></i>
              <div>
                {item.title}
                {item.description && (
                  <small className="d-block text-muted small-desc">
                    {item.description}
                  </small>
                )}
              </div>
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
          <div>
            <h5 className="mb-0">
              <i className="bi bi-box-seam me-2"></i>
              Inventory
            </h5>
            <small className="text-muted">
              Role: {user?.role || 'Unknown'}
            </small>
          </div>
          <Button
            variant="link"
            className="text-white p-0"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="bi bi-x-lg"></i>
          </Button>
        </div>
        <Nav className="flex-column p-3">
          {visibleMenuItems.map((item) => (
            <Nav.Link
              key={item.path}
              as={Link}
              to={item.path}
              className={`mb-1 text-white ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
              title={item.description}
            >
              <i className={`bi ${item.icon} me-3`}></i>
              <div>
                {item.title}
                {item.description && (
                  <small className="d-block text-muted small-desc">
                    {item.description}
                  </small>
                )}
              </div>
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
                  <span className="text-muted">Welcome, {user?.name || 'User'}</span>
                  <span className={`badge role-badge ${(user?.role || '').toLowerCase()} ms-2`}>{user?.role || 'Unknown'}</span>
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