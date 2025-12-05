import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  // 1. Use sessionStorage instead of localStorage for "Logout on Close"
  const [token, setToken] = useState(() => {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken && typeof storedToken === 'string' && storedToken.length > 10) {
      return storedToken;
    }
    return null;
  });

  const [user, setUser] = useState(() => {
    try {
      const storedUser = JSON.parse(sessionStorage.getItem('user') || 'null');
      return storedUser;
    } catch {
      return null;
    }
  });

  // Logout function
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = '/login';
  }, []);

  // 2. Idle Timer Logic (1 Hour = 3600000 ms)
  useEffect(() => {
    if (!token) return; // Only run if logged in

    const TIMEOUT_DURATION = 3600000; // 1 Hour
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log("User inactive for 1 hour. Logging out...");
        logout();
      }, TIMEOUT_DURATION);
    };

    // Events to detect activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    // Attach listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [token, logout]);

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
            const updatedUser = {
              ...response.data.user,
              permissions: response.data.permissions || []
            };
            setUser(updatedUser);
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
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
  }, [token, logout]);

  const login = (token, userData) => {
    setToken(token);
    setUser(userData);
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  // Validate token format
  const validateToken = (token) => {
    return token && typeof token === 'string' && token.length > 10;
  };

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