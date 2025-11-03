import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAPI } from '../contexts/APIContext';
import { Spinner } from 'react-bootstrap';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { api } = useAPI();

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
      <div className="login-wrapper">
        <div className="login-card">
              {/* Logo and Title */}
              <div className="login-header">
                <div className="mb-3">
                  <i className="bi bi-box-seam" style={{ fontSize: '3rem' }}></i>
                </div>
                <h1>Inventory System</h1>
                <p>Sign in to your account</p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="error-message">
                  <i className="bi bi-exclamation-triangle"></i>
                  {error}
                </div>
              )}

            {/* Login Form */}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>
                    <i className="bi bi-envelope me-2"></i>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <i className="bi bi-lock me-2"></i>
                    Password
                  </label>
                  <div className="password-toggle">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="login-button"
                  disabled={loading}
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
                </button>
              </form>

              {/* Demo Accounts */}
              <div className="demo-accounts">
                <h6>
                  <i className="bi bi-info-circle me-2"></i>
                  Demo Accounts
                </h6>
                <div className="small">
                  {demoAccounts.map((account, index) => (
                    <div key={index} className="account-item">
                      <span>
                        <i className="bi bi-person-circle me-2"></i>
                        <strong>{account.role}:</strong>
                      </span>
                      <code>
                        {account.email}
                      </code>
                    </div>
                  ))}
                </div>
                <div className="password-note">
                  <i className="bi bi-key me-2"></i>
                  <strong>Password:</strong> <span>password</span>
                </div>
              </div>

                    {/* Footer */}
              <div className="login-footer">
                <i className="bi bi-shield-check me-1"></i>
                Secure Login • Powered by Laravel & React
              </div>
            </div>
          </div>
        </div>
  );
};

export default Login;