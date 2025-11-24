import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAPI } from '../contexts/APIContext';
import { useCompany } from '../contexts/CompanyContext';
import { Spinner, Image } from 'react-bootstrap';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { api } = useAPI();
  const { companySettings, getLogoUrl } = useCompany();

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
        console.log('Login successful - user data:', response.data.user);
        console.log('User role:', response.data.user.role?.name);
        login(response.data.token, response.data.user);
        console.log('Login function called, token saved to localStorage');
        // Force redirect after a short delay to ensure state is updated
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      }
    } catch (err) {
      setError('Login gagal. Silakan periksa kembali email dan password Anda.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-card">
              {/* Logo and Title */}
              <div className="login-header">
                <div className="company-logo mb-3">
                  {getLogoUrl() ? (
                    <Image
                      src={getLogoUrl()}
                      alt="Company Logo"
                      className="company-logo-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'inline-block';
                      }}
                    />
                  ) : null}
                  <i
                    className={`bi bi-box-seam company-logo-icon ${getLogoUrl() ? 'd-none' : ''}`}
                    style={{ display: getLogoUrl() ? 'none' : 'inline-block' }}
                  ></i>
                </div>
                <h1 className="company-name">
                  {companySettings?.company_name || 'PT. Jinan Truck Power Indonesia'}
                </h1>
                <p className="login-subtitle">Sign in to your account</p>
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