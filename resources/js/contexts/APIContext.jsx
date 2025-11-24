import React, { createContext, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const APIContext = createContext();

export const useAPI = () => {
  return useContext(APIContext);
};

export const APIProvider = ({ children }) => {
  const { token } = useAuth();

  // Dynamic base URL - supports both localhost and network access
  const getBaseURL = () => {
    // If accessing from network IP, use the same IP for API
    const hostname = window.location.hostname;
    const port = window.location.port;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8001/api';
    } else if (hostname === '127.0.0.1') {
      return 'http://127.0.0.1:8001/api';
    } else {
      // Use the same hostname as the frontend for API access
      return `http://${hostname}:8001/api`;
    }
  };

  // Create axios instance with base configuration
  const api = axios.create({
    baseURL: getBaseURL(),
    headers: {
      'Accept': 'application/json',
    },
    timeout: 30000, // 30 seconds timeout
  });

  // Add request interceptor to include token
  api.interceptors.request.use(
    (config) => {
      // Get fresh token from localStorage for each request
      const freshToken = localStorage.getItem('token');
      if (freshToken && typeof freshToken === 'string' && freshToken.length > 10) {
        config.headers.Authorization = `Bearer ${freshToken}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor to handle errors
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Clear stored auth data and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  const value = {
    api,
    get: (url, config) => api.get(url, config),
    post: (url, data, config) => api.post(url, data, config),
    put: (url, data, config) => api.put(url, data, config),
    delete: (url, config) => api.delete(url, config),
  };

  return (
    <APIContext.Provider value={value}>
      {children}
    </APIContext.Provider>
  );
};