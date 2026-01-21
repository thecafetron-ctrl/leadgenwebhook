/**
 * API Client
 * 
 * Centralized API communication layer with axios.
 * Handles all requests to the backend API.
 */

import axios from 'axios';

// API base URL - uses Vite proxy in development, relative path in production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Railway production URL for reference:
// https://leadgenwebhook-production.up.railway.app/api

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
  },

  /**
   * Mark lead as attended (prevents no-show emails)
   */
  markAttended: async (id) => {
    return api.post(`/leads/${id}/attended`);
  },

  /**
   * Score a lead with AI
   */
  scoreLead: async (id) => {
    return api.post(`/leads/${id}/score`);
  },

  /**
   * Score all unscored leads with AI
   */
  scoreAllLeads: async () => {
    return api.post('/leads/score-all');
  },

  /**
   * Manual send messages to selected leads
   */
  manualSend: async (data) => {
    return api.post('/leads/manual-send', data);
  },

  /**
   * Re-score ALL leads
   */
  rescoreAllLeads: async () => {
    return api.post('/leads/rescore-all');
  },

  /**
   * Get AI advice on how to approach a lead
   */
  getAdvice: async (id) => {
    return api.get(`/leads/${id}/advice`);
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

// ==========================================
// SEQUENCES API
// ==========================================

export const sequencesApi = {
  /**
   * Get sequence dashboard overview
   */
  getDashboard: async () => {
    return api.get('/sequences/dashboard');
  },

  /**
   * Get all sequences
   */
  getSequences: async () => {
    return api.get('/sequences');
  },

  /**
   * Get sequence details with steps
   */
  getSequence: async (slug) => {
    return api.get(`/sequences/${slug}`);
  },

  /**
   * Get leads board for a sequence
   */
  getBoard: async (slug, params = {}) => {
    const queryParams = new URLSearchParams(params);
    return api.get(`/sequences/${slug}/board?${queryParams.toString()}`);
  },

  /**
   * Update a sequence step
   */
  updateStep: async (stepId, data) => {
    return api.put(`/sequences/steps/${stepId}`, data);
  },

  /**
   * Manually enroll a lead in a sequence
   */
  enrollLead: async (leadId, sequenceSlug, meetingTime = null) => {
    return api.post('/sequences/enroll', { leadId, sequenceSlug, meetingTime });
  },

  /**
   * Cancel a lead's sequence
   */
  cancelSequence: async (leadId, sequenceSlug = null, reason = null) => {
    return api.post('/sequences/cancel', { leadId, sequenceSlug, reason });
  },

  /**
   * Mark meeting as booked
   */
  meetingBooked: async (leadId, meetingTime) => {
    return api.post('/sequences/meeting-booked', { leadId, meetingTime });
  },

  /**
   * Mark as no-show
   */
  noShow: async (leadId) => {
    return api.post('/sequences/no-show', { leadId });
  },

  /**
   * Mark meeting completed
   */
  meetingCompleted: async (leadId) => {
    return api.post('/sequences/meeting-completed', { leadId });
  },

  /**
   * Get messages sent to a lead
   */
  getLeadMessages: async (leadId) => {
    return api.get(`/sequences/lead/${leadId}/messages`);
  },

  /**
   * Get sequence status for a lead
   */
  getLeadSequenceStatus: async (leadId) => {
    return api.get(`/sequences/lead/${leadId}/status`);
  },

  /**
   * Send newsletter
   */
  sendNewsletter: async (subject, body) => {
    return api.post('/sequences/newsletter/send', { subject, body });
  },

  /**
   * Get WhatsApp status
   */
  getWhatsAppStatus: async () => {
    return api.get('/sequences/whatsapp/status');
  },

  /**
   * Save WhatsApp config
   */
  saveWhatsAppConfig: async (config) => {
    return api.post('/sequences/whatsapp/config', config);
  },

  /**
   * Test WhatsApp message
   */
  testWhatsApp: async (phone, message) => {
    return api.post('/sequences/whatsapp/test', { phone, message });
  },

  /**
   * Manually process message queue (for testing)
   */
  processQueue: async () => {
    return api.post('/sequences/process-queue');
  }
};

// ==========================================
// EMAIL API
// ==========================================

export const emailApi = {
  /**
   * Check email service status
   */
  getStatus: async () => {
    return api.get('/email/status');
  },

  /**
   * Send a test email
   */
  sendTest: async (email, subject = null, content = null) => {
    return api.post('/email/test', { email, subject, content });
  },

  /**
   * Send a custom email
   */
  send: async ({ to, subject, html, text }) => {
    return api.post('/email/send', { to, subject, html, text });
  },

  /**
   * Send an email sequence
   */
  sendSequence: async (email, sequence) => {
    return api.post('/email/sequence', { email, sequence });
  }
};

export default api;
