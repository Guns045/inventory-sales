import axios from 'axios';

/**
 * API Utility
 * Configured axios instance for API requests
 */

// Create axios instance with default config
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // Important for Sanctum cookie-based auth
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Get token from local storage if using token-based auth
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common errors
        if (error.response) {
            // 401 Unauthorized - Redirect to login
            if (error.response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }

            // 403 Forbidden
            if (error.response.status === 403) {
                console.error('Permission denied');
            }

            // 422 Validation Error
            if (error.response.status === 422) {
                console.error('Validation error', error.response.data.errors);
            }
        } else if (error.request) {
            // Network error
            console.error('Network error', error.request);
        } else {
            console.error('Error', error.message);
        }

        return Promise.reject(error);
    }
);

export default api;
