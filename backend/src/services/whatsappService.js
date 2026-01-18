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
import OpenAI from 'openai';

let config = null;
let openai = null;

// Initialize OpenAI if API key is available
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

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
 * Use AI to infer the correct country code for a phone number
 * Based on lead context (name, company, form data)
 */
async function inferCountryCode(phone, leadContext = {}) {
  const ai = getOpenAI();
  if (!ai) {
    console.log('⚠️ OpenAI not configured, cannot infer country code');
    return null;
  }

  try {
    const prompt = `You are a phone number formatting expert. Given a phone number and context about the person, determine the most likely country code.

Phone number: ${phone}
Context:
- Name: ${leadContext.name || 'Unknown'}
- Company: ${leadContext.company || 'Unknown'}
- Email domain: ${leadContext.email ? leadContext.email.split('@')[1] : 'Unknown'}
- Form data: ${JSON.stringify(leadContext.custom_fields || {})}

Rules:
1. Middle Eastern names/Arabic text → likely UAE (+971), Oman (+968), Qatar (+974), Saudi (+966), Bahrain (+973), Kuwait (+965)
2. Indian names → likely India (+91)
3. Pakistani names → likely Pakistan (+92)
4. 8-digit numbers starting with 7 or 9 → likely Oman (+968)
5. 8-digit numbers starting with 3, 5, 6 → likely Qatar (+974)
6. 10-digit numbers → likely US (+1) or India (+91)
7. Look at email domain for country hints (.ae, .qa, .om, .in, .pk, etc.)

Return ONLY the full phone number with country code (digits only, no + symbol). 
Example: If the number is 77426398 and context suggests Oman, return: 96877426398

Phone number with country code:`;

    const response = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0
    });

    const inferredNumber = response.choices[0].message.content.trim().replace(/[^\d]/g, '');
    
    if (inferredNumber && inferredNumber.length > phone.replace(/[^\d]/g, '').length) {
      console.log(`🤖 AI inferred phone: ${phone} → ${inferredNumber}`);
      return inferredNumber;
    }
    
    return null;
  } catch (error) {
    console.error('AI phone inference error:', error.message);
    return null;
  }
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
 * Internal function to send WhatsApp message
 */
async function sendWhatsAppInternal(formattedPhone, message, mediaUrl, useInitialInstance) {
  const instanceConfig = getInstanceConfig(useInitialInstance);
  const { instance: instanceName, apiKey } = instanceConfig;
  const endpoint = `${config.api_url}/message/sendText/${instanceName}`;
  
  console.log(`📱 Sending WhatsApp via "${instanceName}" (${useInitialInstance ? 'Haarith' : 'Meta +44'}) to ${formattedPhone}`);
  
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
    return {
      success: false,
      error: data.message || 'Failed to send WhatsApp',
      details: data
    };
  }
}

/**
 * Send WhatsApp message via Evolution API
 * With AI-powered phone number correction on failure
 * 
 * @param phone - Phone number to send to
 * @param message - Message text
 * @param isInitial - If true, sends from Haarith's number; if false, sends from Meta number
 * @param leadContext - Optional lead data for AI phone inference
 */
export async function sendWhatsApp({ phone, message, mediaUrl = null, isInitial = false, stepOrder = 1, leadContext = null }) {
  const formattedPhone = formatPhoneNumber(phone);
  
  if (!formattedPhone) {
    return { success: false, error: 'Invalid phone number' };
  }
  
  // ONLY use isInitial flag - this is set correctly by the caller
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
    // First attempt with the formatted phone
    let result = await sendWhatsAppInternal(formattedPhone, message, mediaUrl, useInitialInstance);
    
    // If failed and we have lead context, try AI-powered phone correction
    if (!result.success && leadContext) {
      console.log(`⚠️ WhatsApp failed for ${formattedPhone}, attempting AI phone correction...`);
      
      const correctedPhone = await inferCountryCode(phone, leadContext);
      
      if (correctedPhone && correctedPhone !== formattedPhone) {
        console.log(`🔄 Retrying with AI-corrected number: ${correctedPhone}`);
        result = await sendWhatsAppInternal(correctedPhone, message, mediaUrl, useInitialInstance);
        
        if (result.success) {
          result.aiCorrected = true;
          result.originalPhone = formattedPhone;
          result.correctedPhone = correctedPhone;
          console.log(`✅ AI phone correction successful: ${formattedPhone} → ${correctedPhone}`);
        }
      }
    }
    
    if (!result.success) {
      console.error(`❌ WhatsApp failed:`, result.error);
    }
    
    return result;
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
