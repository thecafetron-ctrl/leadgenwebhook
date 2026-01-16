/**
 * WhatsApp Service - Evolution API Integration
 * 
 * Sends WhatsApp messages via Evolution API.
 * 
 * Required Environment Variables:
 * - EVOLUTION_API_URL: Your Evolution API instance URL
 * - EVOLUTION_API_KEY: Your Evolution API key
 * - EVOLUTION_INSTANCE: Your WhatsApp instance name
 */

import { query } from '../database/connection.js';

let config = null;

/**
 * Initialize WhatsApp service
 */
export async function initWhatsAppService() {
  // Try to load config from database first
  try {
    const result = await query(
      "SELECT * FROM whatsapp_config WHERE is_active = true LIMIT 1"
    );
    if (result.rows[0]) {
      config = result.rows[0];
      console.log('✅ WhatsApp service initialized from database');
      return true;
    }
  } catch (e) {
    // Table might not exist yet
  }
  
  // Fall back to environment variables
  if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY) {
    config = {
      api_url: process.env.EVOLUTION_API_URL,
      api_key: process.env.EVOLUTION_API_KEY,
      instance_name: process.env.EVOLUTION_INSTANCE || 'default'
    };
    console.log('✅ WhatsApp service initialized from env');
    return true;
  }
  
  console.log('⚠️ WhatsApp service not configured - messages will be logged only');
  return false;
}

/**
 * Format phone number for WhatsApp
 * Removes spaces, dashes, and ensures country code
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Add country code if not present (default to US)
  if (cleaned.length === 10) {
    cleaned = '1' + cleaned;
  }
  
  return cleaned;
}

/**
 * Send WhatsApp message via Evolution API
 */
export async function sendWhatsApp({ phone, message, mediaUrl = null }) {
  const formattedPhone = formatPhoneNumber(phone);
  
  if (!formattedPhone) {
    return { success: false, error: 'Invalid phone number' };
  }
  
  // If not configured, log and return mock success
  if (!config) {
    console.log(`📱 [MOCK] WhatsApp to ${formattedPhone}: ${message.substring(0, 50)}...`);
    return { 
      success: true, 
      messageId: `mock_${Date.now()}`,
      mock: true 
    };
  }
  
  try {
    const endpoint = `${config.api_url}/message/sendText/${config.instance_name}`;
    
    const payload = {
      number: formattedPhone,
      text: message
    };
    
    // If there's media, use different endpoint
    if (mediaUrl) {
      const mediaEndpoint = `${config.api_url}/message/sendMedia/${config.instance_name}`;
      payload.mediatype = 'image';
      payload.media = mediaUrl;
      payload.caption = message;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (response.ok && data.key?.id) {
      console.log(`✅ WhatsApp sent to ${formattedPhone}`);
      return {
        success: true,
        messageId: data.key.id,
        status: data.status
      };
    } else {
      console.error(`❌ WhatsApp failed:`, data);
      return {
        success: false,
        error: data.message || 'Failed to send WhatsApp',
        details: data
      };
    }
  } catch (error) {
    console.error('WhatsApp API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send WhatsApp template message
 */
export async function sendWhatsAppTemplate({ phone, templateId, variables = {} }) {
  const formattedPhone = formatPhoneNumber(phone);
  
  if (!formattedPhone || !config) {
    return { success: false, error: 'Not configured or invalid phone' };
  }
  
  try {
    const endpoint = `${config.api_url}/message/sendTemplate/${config.instance_name}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key
      },
      body: JSON.stringify({
        number: formattedPhone,
        template: templateId,
        language: 'en',
        components: Object.entries(variables).map(([key, value]) => ({
          type: 'body',
          parameters: [{ type: 'text', text: value }]
        }))
      })
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      messageId: data.key?.id,
      error: data.message
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check WhatsApp connection status
 */
export async function getWhatsAppStatus() {
  if (!config) {
    return { connected: false, reason: 'Not configured' };
  }
  
  try {
    const response = await fetch(
      `${config.api_url}/instance/connectionState/${config.instance_name}`,
      {
        headers: { 'apikey': config.api_key }
      }
    );
    
    const data = await response.json();
    
    return {
      connected: data.state === 'open',
      state: data.state,
      instance: config.instance_name
    };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

/**
 * Save WhatsApp config to database
 */
export async function saveWhatsAppConfig(newConfig) {
  const { instance_name, api_url, api_key } = newConfig;
  
  // Deactivate existing configs
  await query("UPDATE whatsapp_config SET is_active = false");
  
  // Insert new config
  const result = await query(`
    INSERT INTO whatsapp_config (instance_name, api_url, api_key, is_active)
    VALUES ($1, $2, $3, true)
    RETURNING *
  `, [instance_name, api_url, api_key]);
  
  // Update local config
  config = result.rows[0];
  
  return config;
}

/**
 * Get current WhatsApp config
 */
export async function getWhatsAppConfig() {
  if (config) {
    return {
      instance_name: config.instance_name,
      api_url: config.api_url,
      is_configured: true
      // Don't expose api_key
    };
  }
  
  return { is_configured: false };
}

export default {
  initWhatsAppService,
  sendWhatsApp,
  sendWhatsAppTemplate,
  getWhatsAppStatus,
  saveWhatsAppConfig,
  getWhatsAppConfig
};
