import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionContext';
import { useCompany } from '../contexts/CompanyContext';
import { Container, Row, Col, Nav, Button, Spinner, Image } from 'react-bootstrap';
import NotificationsDropdown from './NotificationsDropdown';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const { user, visibleMenuItems, loading } = usePermissions();
  const { companySettings, getLogoUrl } = useCompany();
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
          <div className="d-flex align-items-center mb-2">
            {getLogoUrl() ? (
              <Image
                src={getLogoUrl()}
                alt="Company Logo"
                style={{
                  height: '40px',
                  width: 'auto',
                  maxWidth: '200px',
                  objectFit: 'contain',
                  marginRight: '10px'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
            ) : null}
            <i
              className={`bi bi-box-seam me-2 ${getLogoUrl() ? 'd-none' : ''}`}
              style={{ display: getLogoUrl() ? 'none' : 'inline-block' }}
            ></i>
            <div className="flex-grow-1">
              <h5 className="mb-0 fw-bold">
                {companySettings?.company_name || 'Inventory System'}
              </h5>
            </div>
          </div>
          <small className="text-muted d-block">
            Role: {user?.role || 'Unknown'}
          </small>
        </div>
        <Nav className="flex-column p-3">
          {visibleMenuItems.map((item) => (
            <Nav.Item key={item.path}>
              {item.action === 'logout' ? (
                <Nav.Link
                  className={`mb-1 logout-link ${location.pathname === item.path ? 'active' : ''}`}
                  title={item.description}
                  onClick={() => {
                    console.log('Layout: Clicking logout');
                    handleLogout();
                  }}
                  style={{ cursor: 'pointer' }}
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
              ) : (
                <Nav.Link
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
              )}
            </Nav.Item>
          ))}
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
          <div className="d-flex align-items-center">
            {getLogoUrl() ? (
              <Image
                src={getLogoUrl()}
                alt="Company Logo"
                style={{
                  height: '35px',
                  width: 'auto',
                  maxWidth: '150px',
                  objectFit: 'contain',
                  marginRight: '8px'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'inline-block';
                }}
              />
            ) : null}
            <i
              className={`bi bi-box-seam me-2 ${getLogoUrl() ? 'd-none' : ''}`}
              style={{ display: getLogoUrl() ? 'none' : 'inline-block' }}
            ></i>
            <div>
              <h6 className="mb-0 fw-bold text-white">
                {companySettings?.company_name || 'Inventory'}
              </h6>
              <small className="text-muted">
                Role: {user?.role || 'Unknown'}
              </small>
            </div>
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
            <Nav.Item key={item.path}>
              {item.action === 'logout' ? (
                <Nav.Link
                  className={`mb-1 text-white logout-link ${location.pathname === item.path ? 'active' : ''}`}
                  title={item.description}
                  onClick={() => {
                    handleLogout();
                  }}
                  style={{ cursor: 'pointer' }}
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
              ) : (
                <Nav.Link
                  as={Link}
                  to={item.path}
                  className={`mb-1 text-white ${location.pathname === item.path ? 'active' : ''}`}
                  title={item.description}
                  onClick={() => {
                    setSidebarOpen(false);
                  }}
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
              )}
            </Nav.Item>
          ))}
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
                <div className="d-flex align-items-center">
                  {getLogoUrl() ? (
                    <Image
                      src={getLogoUrl()}
                      alt="Company Logo"
                      style={{
                        height: '35px',
                        width: 'auto',
                        maxWidth: '180px',
                        objectFit: 'contain',
                        marginRight: '12px'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'inline-flex';
                      }}
                    />
                  ) : null}
                  <div
                    className={`d-flex align-items-center ${getLogoUrl() ? 'd-none' : ''}`}
                    style={{ display: getLogoUrl() ? 'none' : 'inline-flex' }}
                  >
                    <i className="bi bi-box-seam me-2 text-primary"></i>
                  </div>
                  <h4 className="mb-0 fw-semibold">
                    {companySettings?.company_name || 'Inventory Management System'}
                  </h4>
                </div>
              </div>
            </Col>
            <Col xs="auto">
              <div className="d-flex align-items-center">
                <NotificationsDropdown />
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