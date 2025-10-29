import React, { createContext, useContext, useState } from 'react';

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
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};