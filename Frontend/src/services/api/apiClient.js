/**
 * Centralized API client for all backend communication.
 * - Automatically attaches the JWT auth token from localStorage
 * - Handles 401 responses by clearing the session and redirecting to login
 * - Provides a consistent error handling pattern
 */

// const API_BASE = 'https://rudra-erp-backend.onrender.com/api';
// const API_BASE = 'http://localhost:3000/api'

/**
 * Core fetch wrapper
 * @param {string} endpoint - API path (e.g. '/customers')
 * @param {object} options - fetch options (method, body, etc.)
 * @returns {Promise<any>} parsed JSON response
 */
async function apiClient(endpoint, options = {}) {
    const token = localStorage.getItem('rudra_token');

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    };

    // Stringify body if it's an object
    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    // Handle unauthorized — clear auth and redirect to login
    if (response.status === 401) {
        localStorage.removeItem('rudra_token');
        localStorage.removeItem('rudra_user');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
}

// Convenience methods
export const api = {
    get: (endpoint) => apiClient(endpoint, { method: 'GET' }),
    post: (endpoint, body) => apiClient(endpoint, { method: 'POST', body }),
    put: (endpoint, body) => apiClient(endpoint, { method: 'PUT', body }),
    patch: (endpoint, body) => apiClient(endpoint, { method: 'PATCH', body }),
    delete: (endpoint) => apiClient(endpoint, { method: 'DELETE' }),
};

export default api;
