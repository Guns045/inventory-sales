import React, { useState } from 'react';
import { Container, Row, Col, Card, Nav, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import CompanySettingsPage from './CompanySettings';

// Import other settings components (will be created later)
// import SystemSettings from './SystemSettings';
// import BackupRestore from './BackupRestore';
// import DocumentTemplate from './DocumentTemplate';
// import APIIntegration from './APIIntegration';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('company');

  const settingsTabs = [
    {
      id: 'company',
      title: 'Company Settings',
      icon: 'bi-building',
      description: 'Manage company information, logo, and branding',
      component: <CompanySettingsPage />,
      roles: ['Admin']
    },
    {
      id: 'system',
      title: 'System Settings',
      icon: 'bi-gear',
      description: 'Configure system preferences and general settings',
      component: (
        <Alert variant="info" className="m-3">
          <Alert.Heading>Coming Soon</Alert.Heading>
          <p>System settings will be available soon.</p>
          <hr />
          <p className="mb-0">
            This section will include:
          </p>
          <ul>
            <li>Application preferences</li>
            <li>System configuration</li>
            <li>Security settings</li>
            <li>Email configurations</li>
          </ul>
        </Alert>
      ),
      roles: ['Admin']
    },
    {
      id: 'backup',
      title: 'Backup & Restore',
      icon: 'bi-cloud-arrow-up',
      description: 'Manage data backup and restoration',
      component: (
        <Alert variant="info" className="m-3">
          <Alert.Heading>Coming Soon</Alert.Heading>
          <p>Backup & restore functionality will be available soon.</p>
          <hr />
          <p className="mb-0">
            This section will include:
          </p>
          <ul>
            <li>Database backup</li>
            <li>Data restoration</li>
            <li>Scheduled backups</li>
            <li>Export data</li>
          </ul>
        </Alert>
      ),
      roles: ['Admin']
    },
    {
      id: 'templates',
      title: 'Document Templates',
      icon: 'bi-file-text',
      description: 'Manage document templates and formats',
      component: (
        <Alert variant="info" className="m-3">
          <Alert.Heading>Coming Soon</Alert.Heading>
          <p>Document templates will be available soon.</p>
          <hr />
          <p className="mb-0">
            This section will include:
          </p>
          <ul>
            <li>Quotation templates</li>
            <li>Invoice templates</li>
            <li>Report templates</li>
            <li>Email templates</li>
          </ul>
        </Alert>
      ),
      roles: ['Admin']
    },
    {
      id: 'api',
      title: 'API Integration',
      icon: 'bi-link-45deg',
      description: 'Configure API integrations and webhooks',
      component: (
        <Alert variant="info" className="m-3">
          <Alert.Heading>Coming Soon</Alert.Heading>
          <p>API integration settings will be available soon.</p>
          <hr />
          <p className="mb-0">
            This section will include:
          </p>
          <ul>
            <li>External API connections</li>
            <li>Webhook configurations</li>
            <li>API keys management</li>
            <li>Integration monitoring</li>
          </ul>
        </Alert>
      ),
      roles: ['Admin']
    }
  ];

  // Filter tabs based on user role
  const availableTabs = settingsTabs.filter(tab =>
    tab.roles.includes(user?.role?.name)
  );

  // Allow Super Admin and Admin roles to access this page
  if (!['Super Admin', 'Admin'].includes(user?.role?.name)) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Alert variant="danger">
          <Alert.Heading>Access Denied</Alert.Heading>
          <p>You don't have permission to access this page.</p>
        </Alert>
      </div>
    );
  }

  const activeTabData = availableTabs.find(tab => tab.id === activeTab);

  return (
    <Container fluid>
      <Row>
        <Col lg={12}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-4">
              <h3 className="mb-0">
                <i className="bi bi-gear me-2"></i>
                System Settings
              </h3>
              <p className="text-muted mb-0">Configure and manage various system settings</p>
            </Card.Header>

            <Card.Body className="p-0">
              <Row className="g-0">
                {/* Settings Sidebar */}
                <Col md={3} className="border-end">
                  <div className="p-3">
                    <h5 className="mb-3">Settings Categories</h5>
                    <Nav variant="pills" className="flex-column" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                      {availableTabs.map(tab => (
                        <Nav.Item key={tab.id} className="mb-2">
                          <Nav.Link
                            eventKey={tab.id}
                            className="d-flex align-items-start"
                          >
                            <i className={`${tab.icon} me-2 mt-1`}></i>
                            <div>
                              <div className="fw-semibold">{tab.title}</div>
                              <small className="text-muted">{tab.description}</small>
                            </div>
                          </Nav.Link>
                        </Nav.Item>
                      ))}
                    </Nav>
                  </div>
                </Col>

                {/* Settings Content */}
                <Col md={9}>
                  <div className="p-4">
                    <div className="d-flex align-items-center mb-4">
                      <i className={`${activeTabData?.icon} me-2 fs-4`}></i>
                      <div>
                        <h4 className="mb-1">{activeTabData?.title}</h4>
                        <p className="text-muted mb-0">{activeTabData?.description}</p>
                      </div>
                    </div>

                    {activeTabData?.component}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Settings;