import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Image } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { useCompany } from '../contexts/CompanyContext';
import { useAuth } from '../contexts/AuthContext';

const CompanySettingsPage = () => {
  const { get, post, put } = useAPI();
  const { companySettings, fetchCompanySettings } = useCompany();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    tax_id: '',
    theme_color: '#0d6efd',
    theme_dark_color: '#212529'
  });

  const [logoFile, setLogoFile] = useState(null);
  const logoFileRef = useRef(null); // Backup untuk file
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (companySettings) {
      setFormData({
        company_name: companySettings.company_name || '',
        company_address: companySettings.company_address || '',
        company_phone: companySettings.company_phone || '',
        company_email: companySettings.company_email || '',
        company_website: companySettings.company_website || '',
        tax_id: companySettings.tax_id || '',
        theme_color: companySettings.theme_color || '#0d6efd',
        theme_dark_color: companySettings.theme_dark_color || '#212529'
      });
    }
  }, [companySettings]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    console.log('handleLogoChange called, file:', file);

    if (file) {
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Validate file
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      if (file.size > 2 * 1024 * 1024) { // 2MB
        setError('Logo file size must be less than 2MB');
        return;
      }

      setLogoFile(file);
      logoFileRef.current = file; // Simpan di ref sebagai backup
      setLogoPreview(URL.createObjectURL(file));
      setError('');
      console.log('Logo file set successfully');
      console.log('File stored in ref:', logoFileRef.current);

      // IMMEDIATE TEST: Check state after set
      setTimeout(() => {
        console.log('State check after 100ms - logoFile:', logoFile);
        console.log('Ref check after 100ms - logoFileRef.current:', logoFileRef.current);
      }, 100);
    } else {
      console.log('No file selected');
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    document.getElementById('logo-upload').value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Debug current state before anything else
    console.log('=== SUBMIT DEBUG ===');
    console.log('Current logoFile state:', logoFile);
    console.log('Current formData:', formData);
    console.log('companySettings:', companySettings);
    console.log('====================');

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Create clean FormData
      const data = new FormData();

      // Add all text fields
      data.append('company_name', formData.company_name);
      data.append('company_address', formData.company_address || '');
      data.append('company_phone', formData.company_phone || '');
      data.append('company_email', formData.company_email || '');
      data.append('company_website', formData.company_website || '');
      data.append('tax_id', formData.tax_id || '');
      data.append('theme_color', formData.theme_color);
      data.append('theme_dark_color', formData.theme_dark_color);

      // Add logo file if selected (check both state and ref)
      const fileToUpload = logoFile || logoFileRef.current;
      if (fileToUpload) {
        console.log('Adding logo file to FormData:', fileToUpload.name);
        console.log('File type:', fileToUpload.type);
        console.log('File size:', fileToUpload.size);
        console.log('Source: logoFile =', !!logoFile, ', logoFileRef.current =', !!logoFileRef.current);
        data.append('company_logo', fileToUpload);
        console.log('company_logo appended to FormData');
      } else {
        console.log('NO LOGO FILE SELECTED - both logoFile and logoFileRef.current are null/undefined');
      }

      // Debug logging
      console.log('Final FormData:');
      for (let [key, value] of data.entries()) {
        console.log(`${key}:`, value);
      }

      let response;
      if (companySettings?.id) {
        // Update existing settings
        data.append('_method', 'PUT');
        console.log('Sending update request to:', `/company-settings/${companySettings.id}`);
        response = await post(`/company-settings/${companySettings.id}`, data);
      } else {
        // Create new settings
        console.log('Sending create request to: /company-settings');
        response = await post('/company-settings', data);
      }

      if (response) {
        setSuccess('Company settings updated successfully!');
        await fetchCompanySettings();
        setLogoFile(null);
        setLogoPreview('');
      }

    } catch (err) {
      console.error('Error saving company settings:', err);
      let errorMessage = 'Failed to save company settings';

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.errors) {
        const validationErrors = Object.values(err.response.data.errors).flat();
        errorMessage = validationErrors.join(', ');
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div>
      <Form onSubmit={handleSubmit}>
                {/* Company Logo Section */}
                <Card className="mb-4 border">
                  <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">
                      <i className="bi bi-image me-2"></i>
                      Company Logo
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Row className="align-items-center">
                      <Col md={4}>
                        <div className="text-center">
                          {(logoPreview || companySettings?.company_logo) ? (
                            <Image
                              src={logoPreview || (companySettings?.company_logo && companySettings.company_logo.startsWith('http') ? companySettings.company_logo : companySettings?.company_logo ? `http://localhost:8000/storage/logos/${companySettings.company_logo}` : '')}
                              alt="Company Logo Preview"
                              style={{
                                maxHeight: '150px',
                                maxWidth: '200px',
                                objectFit: 'contain'
                              }}
                              className="border rounded p-3 bg-white"
                            />
                          ) : (
                            <div className="border rounded p-4 bg-light d-flex align-items-center justify-content-center" style={{ minHeight: '150px' }}>
                              <div className="text-center text-muted">
                                <i className="bi bi-image fs-1 d-block mb-2"></i>
                                <small>No logo uploaded</small>
                              </div>
                            </div>
                          )}
                        </div>
                      </Col>
                      <Col md={8}>
                        <Form.Group className="mb-3">
                          <Form.Label>Upload Logo</Form.Label>
                          <Form.Control
                            type="file"
                            id="logo-upload"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="mb-2"
                          />
                          <Form.Text className="text-muted">
                            Supported formats: JPG, PNG, GIF, SVG. Max size: 2MB
                          </Form.Text>
                          {(logoPreview || companySettings?.company_logo) && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={handleRemoveLogo}
                              className="mt-2"
                            >
                              <i className="bi bi-trash me-1"></i>
                              Remove Logo
                            </Button>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* Company Information */}
                <Card className="mb-4 border">
                  <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">
                      <i className="bi bi-building me-2"></i>
                      Company Information
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Company Name *</Form.Label>
                          <Form.Control
                            type="text"
                            name="company_name"
                            value={formData.company_name}
                            onChange={handleInputChange}
                            required
                            placeholder="Enter company name"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Email</Form.Label>
                          <Form.Control
                            type="email"
                            name="company_email"
                            value={formData.company_email}
                            onChange={handleInputChange}
                            placeholder="company@example.com"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Phone</Form.Label>
                          <Form.Control
                            type="tel"
                            name="company_phone"
                            value={formData.company_phone}
                            onChange={handleInputChange}
                            placeholder="+62 21 1234 5678"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Website</Form.Label>
                          <Form.Control
                            type="url"
                            name="company_website"
                            value={formData.company_website}
                            onChange={handleInputChange}
                            placeholder="https://www.example.com"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Address</Form.Label>
                      <Form.Control
                        as="textarea"
                        name="company_address"
                        value={formData.company_address}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Enter company address"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Tax ID</Form.Label>
                      <Form.Control
                        type="text"
                        name="tax_id"
                        value={formData.tax_id}
                        onChange={handleInputChange}
                        placeholder="e.g., NPWP, GST number"
                      />
                    </Form.Group>
                  </Card.Body>
                </Card>

                {/* Theme Settings */}
                <Card className="mb-4 border">
                  <Card.Header className="bg-light">
                    <h5 className="mb-0">
                      <i className="bi bi-palette me-2"></i>
                      Theme Settings
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Primary Theme Color</Form.Label>
                          <div className="d-flex align-items-center">
                            <Form.Control
                              type="color"
                              name="theme_color"
                              value={formData.theme_color}
                              onChange={handleInputChange}
                              className="me-3"
                              style={{ width: '80px', height: '40px' }}
                            />
                            <Form.Control
                              type="text"
                              value={formData.theme_color}
                              onChange={(e) => {
                                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                  setFormData(prev => ({ ...prev, theme_color: e.target.value }));
                                }
                              }}
                              placeholder="#0d6efd"
                            />
                          </div>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Dark Theme Color</Form.Label>
                          <div className="d-flex align-items-center">
                            <Form.Control
                              type="color"
                              name="theme_dark_color"
                              value={formData.theme_dark_color}
                              onChange={handleInputChange}
                              className="me-3"
                              style={{ width: '80px', height: '40px' }}
                            />
                            <Form.Control
                              type="text"
                              value={formData.theme_dark_color}
                              onChange={(e) => {
                                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                  setFormData(prev => ({ ...prev, theme_dark_color: e.target.value }));
                                }
                              }}
                              placeholder="#212529"
                            />
                          </div>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                      <div className="d-flex justify-content-end mt-4">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Save Settings
              </>
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default CompanySettingsPage;