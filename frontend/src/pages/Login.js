import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAPI } from '../contexts/APIContext';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Alert, Spinner, Container, Row, Col } from 'react-bootstrap';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { api } = useAPI();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/login', {
        email,
        password
      });

      if (response.data.token && response.data.user) {
        login(response.data.token, response.data.user);
        // Force page reload to refresh permissions
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError('Login gagal. Silakan periksa kembali email dan password Anda.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'admin@example.com', role: 'Administrator' },
    { email: 'sales@example.com', role: 'Sales' },
    { email: 'gudang@example.com', role: 'Gudang' },
    { email: 'finance@example.com', role: 'Finance' }
  ];

  return (
    <div className="login-container">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <div className="login-card">
              {/* Logo and Title */}
              <div className="text-center mb-4">
                <div className="mb-3">
                  <i className="bi bi-box-seam text-primary" style={{ fontSize: '3rem' }}></i>
                </div>
                <h2 className="text-dark fw-bold mb-1">Inventory System</h2>
                <p className="text-secondary">Sign in to your account</p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="danger" className="mb-4">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </Alert>
              )}

              {/* Login Form */}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label className="text-dark fw-semibold">
                    <i className="bi bi-envelope text-primary me-2"></i>
                    Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    size="lg"
                    className="bg-white text-dark border border-secondary-subtle"
                    style={{
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '16px'
                    }}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="text-dark fw-semibold">
                    <i className="bi bi-lock text-primary me-2"></i>
                    Password
                  </Form.Label>
                  <div className="password-toggle">
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      size="lg"
                      className="bg-white text-dark border border-secondary-subtle"
                      style={{
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        fontSize: '16px',
                        paddingRight: '50px'
                      }}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-secondary`}></i>
                    </button>
                  </div>
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 mb-3 fw-semibold py-3"
                  size="lg"
                  disabled={loading}
                  style={{
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Signing in...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Sign In
                    </>
                  )}
                </Button>
              </Form>

              {/* Demo Accounts */}
              <div className="mt-4 p-3 bg-light rounded-3">
                <h6 className="text-dark mb-3 fw-semibold">
                  <i className="bi bi-info-circle text-primary me-2"></i>
                  Demo Accounts
                </h6>
                <div className="small">
                  {demoAccounts.map((account, index) => (
                    <div key={index} className="text-secondary mb-2 d-flex justify-content-between align-items-center">
                      <span>
                        <i className="bi bi-person-circle text-primary me-2"></i>
                        <strong>{account.role}:</strong>
                      </span>
                      <code className="text-dark bg-white px-2 py-1 rounded border">
                        {account.email}
                      </code>
                    </div>
                  ))}
                </div>
                <div className="text-secondary small mt-3 p-2 bg-white rounded-2 border">
                  <i className="bi bi-key text-primary me-2"></i>
                  <strong>Password:</strong> <span className="text-dark">password</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-4">
                <small className="text-secondary">
                  <i className="bi bi-shield-check text-primary me-1"></i>
                  Secure Login • Powered by Laravel & React
                </small>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;