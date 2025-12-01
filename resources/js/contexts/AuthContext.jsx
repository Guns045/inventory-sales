import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('token');
    // Validate token format
    if (storedToken && typeof storedToken === 'string' && storedToken.length > 10) {
      return storedToken;
    }
    return null;
  });
  const [user, setUser] = useState(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      return storedUser;
    } catch {
      return null;
    }
  });

  // Refresh user data on mount if token exists
  useEffect(() => {
    const refreshUserData = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/user/permissions', {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json'
            }
          });

          if (response.data && response.data.user) {

            const updatedUser = response.data.user;
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (error) {
          console.error('Failed to refresh user data:', error);
          if (error.response && error.response.status === 401) {
            logout();
          }
        }
      }
    };

    refreshUserData();
  }, [token]);

  const login = (token, userData) => {
    setToken(token);
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Validate token format
  const validateToken = (token) => {
    return token && typeof token === 'string' && token.length > 10;
  };

  // Check if current token is valid
  const isValidToken = validateToken(token);

  const value = {
    token,
    user,
    login,
    logout,
    isAuthenticated: isValidToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};