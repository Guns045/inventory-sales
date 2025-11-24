import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionContext';
import { useCompany } from '../contexts/CompanyContext';
import { Container, Row, Col, Nav, Button, Spinner, Image } from 'react-bootstrap';
import NotificationsDropdown from './NotificationsDropdown';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const { logout } = useAuth();
  const { user, visibleMenuItems, loading } = usePermissions();
  const { companySettings, getLogoUrl } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();

  // Debug layout mounting
  useEffect(() => {
    console.log('Layout component mounted');
    console.log('Current path:', location.pathname);
    console.log('User loaded:', !!user);
    console.log('Menu loading:', loading);
    console.log('Available menu items:', visibleMenuItems);
  }, [location.pathname, user, loading, visibleMenuItems]);

  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSubmenu = (menuPath) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuPath]: !prev[menuPath]
    }));
  };

  const isMenuActive = (path) => {
    return location.pathname === path;
  };

  const isParentMenuActive = (children) => {
    if (!children || !Array.isArray(children)) return false;
    return children.some(child => isMenuActive(child.path));
  };

  const renderMenuItem = (item, isSubmenu = false) => {
    const hasChildren = item.children && Array.isArray(item.children) && item.children.length > 0;
    const isActive = isMenuActive(item.path);
    const isParentActive = hasChildren && isParentMenuActive(item.children);
    const isExpanded = expandedMenus[item.path] || isParentActive;

    if (item.action === 'logout') {
      return (
        <Nav.Item key={item.path}>
          <Nav.Link
            className={`mb-1 logout-link ${isActive ? 'active' : ''} ${isSubmenu ? 'submenu-item' : ''}`}
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
        </Nav.Item>
      );
    }

    if (hasChildren) {
      return (
        <Nav.Item key={item.path}>
          <Nav.Link
            className={`mb-1 ${isParentActive ? 'active' : ''} ${isSubmenu ? 'submenu-item' : ''}`}
            onClick={() => toggleSubmenu(item.path)}
            style={{ cursor: 'pointer' }}
            title={item.description}
          >
            <i className={`bi ${item.icon} me-3`}></i>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                {item.title}
                {item.description && (
                  <small className="d-block text-muted small-desc">
                    {item.description}
                  </small>
                )}
              </div>
              <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} ms-auto`}></i>
            </div>
          </Nav.Link>
          {isExpanded && (
            <div className="submenu">
              {item.children.map(child => renderMenuItem(child, true))}
            </div>
          )}
        </Nav.Item>
      );
    }

    return (
      <Nav.Item key={item.path}>
        <Nav.Link
          as={Link}
          to={item.path}
          className={`mb-1 ${isActive ? 'active' : ''} ${isSubmenu ? 'submenu-item' : ''}`}
          title={item.description}
          onClick={(e) => {
            console.log('Menu clicked:', item.title, '->', item.path);
            console.log('Event target:', e.target);
            console.log('Default prevented?:', e.defaultPrevented);
            if (sidebarOpen) {
              setSidebarOpen(false);
            }
          }}
          onMouseEnter={() => {
            console.log('Menu hover:', item.title, 'path:', item.path);
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
      </Nav.Item>
    );
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
        <div className="sidebar-header text-center">
          <div className="mb-3">
            {getLogoUrl() ? (
              <Image
                src={getLogoUrl()}
                alt="Company Logo"
                style={{
                  height: '50px',
                  width: 'auto',
                  maxWidth: '180px',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'inline-block';
                }}
              />
            ) : null}
            <i
              className={`bi bi-box-seam fs-2 ${getLogoUrl() ? 'd-none' : ''}`}
              style={{ display: getLogoUrl() ? 'none' : 'inline-block' }}
            ></i>
          </div>
          <h5 className="mb-2 fw-bold">
            PT. Jinan Truck Power Indonesia
          </h5>
          <small className="text-muted">
            Role: {user?.role || 'Unknown'}
          </small>
        </div>
        <Nav className="flex-column p-3">
          {visibleMenuItems.map((item) => renderMenuItem(item))}
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
        <div className="sidebar-header">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="flex-grow-1 text-center">
              {getLogoUrl() ? (
                <Image
                  src={getLogoUrl()}
                  alt="Company Logo"
                  style={{
                    height: '40px',
                    width: 'auto',
                    maxWidth: '150px',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'inline-block';
                  }}
                />
              ) : null}
              <i
                className={`bi bi-box-seam fs-3 ${getLogoUrl() ? 'd-none' : ''}`}
                style={{ display: getLogoUrl() ? 'none' : 'inline-block' }}
              ></i>
            </div>
            <Button
              variant="link"
              className="text-white p-0"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="bi bi-x-lg"></i>
            </Button>
          </div>
          <h6 className="mb-1 fw-bold text-white text-center">
            PT. Jinan Truck Power Indonesia
          </h6>
          <small className="text-muted text-center d-block">
            Role: {user?.role || 'Unknown'}
          </small>
        </div>
        <Nav className="flex-column p-3">
          {visibleMenuItems.map((item) => renderMenuItem(item))}
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