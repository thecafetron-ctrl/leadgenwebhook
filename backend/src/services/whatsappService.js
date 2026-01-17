/**
 * WhatsApp Service - Evolution API Integration
 * 
 * DUAL INSTANCE SUPPORT:
 * - Instance "lead" (Haarith): Used for INITIAL messages (welcome, confirmation)
 * - Instance "meta" (+44 number): Used for FOLLOW-UP messages (reminders, value emails)
 * 
 * Required Environment Variables:
 * - EVOLUTION_API_URL: Your Evolution API instance URL (e.g., https://evolution-production-3990.up.railway.app)
 * - EVOLUTION_API_KEY: Your Evolution API key
 * - EVOLUTION_INSTANCE_INITIAL: Instance for initial messages (default: "lead")
 * - EVOLUTION_INSTANCE_FOLLOWUP: Instance for follow-up messages (default: "meta")
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
  // HARDCODED: Both instances with their respective API keys
  const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://evolution-production-3990.up.railway.app';
  
  config = {
    api_url: EVOLUTION_URL,
    // Initial messages (Haarith +971) - ONLY for new_lead step 1
    instance_initial: 'lead',
    api_key_initial: '47AB4E03B894-421B-8F28-91D255097A26',
    // ALL other messages (Meta +44) - confirmations, reminders, value emails
    instance_followup: 'meta',
    api_key_followup: 'A394DBD5EE55-48A8-A771-CE7539ECBE01'
  };
  console.log('✅ WhatsApp service initialized with dual instances:');
  console.log(`   Initial (Haarith +971): ${config.instance_initial}`);
  console.log(`   Follow-up (Meta +44): ${config.instance_followup}`);
  return true;
  
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
 * Get the appropriate instance and API key based on message type
 * @param isInitial - true for welcome/confirmation messages, false for follow-ups
 * @returns { instance, apiKey }
 */
function getInstanceConfig(isInitial = false) {
  if (!config) return null;
  
  // For initial messages (step 1), use the "lead" instance (Haarith)
  // For follow-ups (step 2+), use the "meta" instance (+44 number)
  if (isInitial) {
    return {
      instance: config.instance_initial || 'lead',
      apiKey: config.api_key_initial || config.api_key
    };
  }
  return {
    instance: config.instance_followup || 'meta',
    apiKey: config.api_key_followup || config.api_key
  };
}

/**
 * Send WhatsApp message via Evolution API
 * @param phone - Phone number to send to
 * @param message - Message text
 * @param isInitial - If true, sends from Haarith's number; if false, sends from Meta number
 * @param stepOrder - Step number (1 = initial, >1 = follow-up)
 */
export async function sendWhatsApp({ phone, message, mediaUrl = null, isInitial = false, stepOrder = 1 }) {
  const formattedPhone = formatPhoneNumber(phone);
  
  if (!formattedPhone) {
    return { success: false, error: 'Invalid phone number' };
  }
  
  // ONLY use isInitial flag - this is set correctly by the caller
  // isInitial=true ONLY for new_lead sequence step 1
  // Everything else (confirmations, reminders, value emails) uses Meta
  const useInitialInstance = isInitial;
  
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
    const instanceConfig = getInstanceConfig(useInitialInstance);
    const { instance: instanceName, apiKey } = instanceConfig;
    const endpoint = `${config.api_url}/message/sendText/${instanceName}`;
    
    console.log(`📱 Sending WhatsApp via "${instanceName}" (${useInitialInstance ? 'Haarith' : 'Meta +44'})`);
    
    const payload = {
      number: formattedPhone,
      text: message
    };
    
    // If there's media, use different endpoint
    if (mediaUrl) {
      const mediaEndpoint = `${config.api_url}/message/sendMedia/${instanceName}`;
      payload.mediatype = 'image';
      payload.media = mediaUrl;
      payload.caption = message;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (response.ok && data.key?.id) {
      console.log(`✅ WhatsApp sent to ${formattedPhone} via ${instanceName}`);
      return {
        success: true,
        messageId: data.key.id,
        status: data.status,
        instance: instanceName
      };
    } else {
      console.error(`❌ WhatsApp failed via ${instanceName}:`, data);
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
export async function sendWhatsAppTemplate({ phone, templateId, variables = {}, isInitial = false }) {
  const formattedPhone = formatPhoneNumber(phone);
  
  if (!formattedPhone || !config) {
    return { success: false, error: 'Not configured or invalid phone' };
  }
  
  const instanceConfig = getInstanceConfig(isInitial);
  const { instance: instanceName, apiKey } = instanceConfig;
  
  try {
    const response = await fetch(`${config.api_url}/message/sendTemplate/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: formattedPhone,
        template: templateId,
        language: 'en',
        variables
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        messageId: data.key?.id,
        instance: instanceName
      };
    } else {
      return {
        success: false,
        error: data.message || 'Failed to send template'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check WhatsApp connection status for both instances
 */
export async function getWhatsAppStatus() {
  if (!config) {
    return { 
      connected: false, 
      message: 'WhatsApp service not configured' 
    };
  }
  
  try {
    const instances = [
      { name: config.instance_initial || 'lead', type: 'initial', apiKey: config.api_key_initial },
      { name: config.instance_followup || 'meta', type: 'followup', apiKey: config.api_key_followup }
    ];
    
    const statuses = {};
    
    for (const inst of instances) {
      try {
        const response = await fetch(`${config.api_url}/instance/connectionState/${inst.name}`, {
          headers: { 'apikey': inst.apiKey }
        });
        const data = await response.json();
        statuses[inst.type] = {
          instance: inst.name,
          state: data.instance?.state || 'unknown',
          connected: data.instance?.state === 'open'
        };
      } catch (e) {
        statuses[inst.type] = {
          instance: inst.name,
          state: 'error',
          connected: false,
          error: e.message
        };
      }
    }
    
    return {
      connected: statuses.initial?.connected || statuses.followup?.connected,
      instances: statuses
    };
  } catch (error) {
    return {
      connected: false,
      message: error.message
    };
  }
}

/**
 * Save WhatsApp configuration to database
 */
export async function saveWhatsAppConfig(configData) {
  const { api_url, api_key, instance_initial, instance_followup } = configData;
  
  // Deactivate existing configs
  await query('UPDATE whatsapp_config SET is_active = false WHERE is_active = true');
  
  // Insert new config
  const result = await query(`
    INSERT INTO whatsapp_config (api_url, api_key, instance_name, is_active)
    VALUES ($1, $2, $3, true)
    RETURNING *
  `, [api_url, api_key, instance_initial || 'lead']);
  
  // Update local config
  config = {
    api_url,
    api_key,
    instance_initial: instance_initial || 'lead',
    instance_followup: instance_followup || 'meta'
  };
  
  return result.rows[0];
}

/**
 * Get current WhatsApp configuration
 */
export async function getWhatsAppConfig() {
  if (config) {
    return {
      api_url: config.api_url,
      instance_initial: config.instance_initial || config.instance_name,
      instance_followup: config.instance_followup || 'meta',
      configured: true
    };
  }
  return { configured: false };
}

export default {
  initWhatsAppService,
  sendWhatsApp,
  sendWhatsAppTemplate,
  getWhatsAppStatus,
  saveWhatsAppConfig,
  getWhatsAppConfig
};
