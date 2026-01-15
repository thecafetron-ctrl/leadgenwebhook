/**
 * API Client
 * 
 * Centralized API communication layer with axios.
 * Handles all requests to the backend API.
 */

import axios from 'axios';

// API base URL - uses Vite proxy in development
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject({ message, details: error.response?.data?.details });
  }
);

// ==========================================
// LEADS API
// ==========================================

export const leadsApi = {
  /**
   * Get all leads with optional filters
   */
  getLeads: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    return api.get(`/leads?${queryParams.toString()}`);
  },

  /**
   * Get lead statistics
   */
  getStats: async () => {
    return api.get('/leads/stats');
  },

  /**
   * Get a single lead by ID
   */
  getLead: async (id) => {
    return api.get(`/leads/${id}`);
  },

  /**
   * Get activities for a lead
   */
  getActivities: async (id, limit = 50) => {
    return api.get(`/leads/${id}/activities?limit=${limit}`);
  },

  /**
   * Create a new lead
   */
  createLead: async (data) => {
    return api.post('/leads', data);
  },

  /**
   * Update a lead
   */
  updateLead: async (id, data) => {
    return api.put(`/leads/${id}`, data);
  },

  /**
   * Delete a lead
   */
  deleteLead: async (id) => {
    return api.delete(`/leads/${id}`);
  },

  /**
   * Bulk update leads
   */
  bulkUpdate: async (ids, updates) => {
    return api.post('/leads/bulk/update', { ids, updates });
  },

  /**
   * Bulk delete leads
   */
  bulkDelete: async (ids) => {
    return api.post('/leads/bulk/delete', { ids });
  }
};

// ==========================================
// WEBHOOKS API
// ==========================================

export const webhooksApi = {
  /**
   * Get webhook logs with optional filters
   */
  getLogs: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    return api.get(`/webhooks/logs?${queryParams.toString()}`);
  },

  /**
   * Get recent webhook logs
   */
  getRecentLogs: async (limit = 20) => {
    return api.get(`/webhooks/logs/recent?limit=${limit}`);
  },

  /**
   * Get webhook statistics
   */
  getStats: async () => {
    return api.get('/webhooks/stats');
  },

  /**
   * Get a single webhook log by ID
   */
  getLog: async (id) => {
    return api.get(`/webhooks/logs/${id}`);
  },

  /**
   * Send a test webhook
   */
  sendTestWebhook: async (payload) => {
    return api.post('/webhooks/test', payload);
  },

  /**
   * Simulate a webhook from a specific source
   */
  simulateWebhook: async (type, data = {}) => {
    return api.post(`/webhooks/simulate/${type}`, data);
  }
};

// ==========================================
// HEALTH API
// ==========================================

export const healthApi = {
  /**
   * Check API health
   */
  check: async () => {
    return api.get('/health');
  },

  /**
   * Get API info
   */
  getInfo: async () => {
    return api.get('/');
  }
};

export default api;
