import React, { createContext, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const APIContext = createContext();

export const useAPI = () => {
  return useContext(APIContext);
};

export const APIProvider = ({ children }) => {
  const { token } = useAuth();

  // Create axios instance with base configuration
  const api = axios.create({
    baseURL: 'http://localhost:8000/api', // Update this to match your Laravel backend URL
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor to include token
  api.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
        // Handle unauthorized access - maybe redirect to login
        console.error('Unauthorized access - token may have expired');
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