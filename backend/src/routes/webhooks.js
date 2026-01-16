/**
 * Webhook Routes - PostgreSQL Version
 * 
 * Endpoints for receiving webhooks from external services.
 */

import { Router } from 'express';
import crypto from 'crypto';
import Lead from '../models/Lead.js';
import WebhookLog from '../models/WebhookLog.js';
import { webhookLogQuerySchema, validateQuery } from '../middleware/validation.js';
import { enrollLead, onMeetingBooked } from '../services/sequenceService.js';

const router = Router();

/**
 * Helper: Get client IP address
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.ip;
}

/**
 * Helper: Extract lead info from various field formats
 */
function extractLeadInfo(fieldData, rawPayload = {}) {
  const info = {
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    custom_fields: {}
  };

  if (Array.isArray(fieldData)) {
    for (const field of fieldData) {
      const name = (field.name || '').toLowerCase().replace(/[_-]/g, ' ');
      const value = field.values?.[0] || field.value || '';
      
      if (!value) continue;
      
      if (name.includes('email') || value.includes('@')) {
        info.email = value;
      } else if (name.includes('phone') || name.includes('tel') || name.includes('mobile')) {
        info.phone = value;
      } else if (name === 'full name' || name === 'name' || name === 'fullname') {
        const parts = value.trim().split(' ');
        info.first_name = parts[0];
        info.last_name = parts.slice(1).join(' ') || null;
      } else if (name.includes('first') && name.includes('name')) {
        info.first_name = value;
      } else if (name.includes('last') && name.includes('name')) {
        info.last_name = value;
      } else {
        info.custom_fields[field.name || name] = value;
      }
    }
  }
  
  if (rawPayload) {
    if (!info.email && rawPayload.email) info.email = rawPayload.email;
    if (!info.phone && (rawPayload.phone || rawPayload.phone_number)) info.phone = rawPayload.phone || rawPayload.phone_number;
    if (!info.first_name && rawPayload.first_name) info.first_name = rawPayload.first_name;
    if (!info.last_name && rawPayload.last_name) info.last_name = rawPayload.last_name;
  }
  
  return info;
}

/**
 * Helper: Verify Meta webhook signature
 */
function verifyMetaSignature(payload, signature, appSecret) {
  if (!signature || !appSecret) return null;
  const expectedSignature = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
  return signature === `sha256=${expectedSignature}`;
}

/**
 * Helper: Verify Cal.com webhook signature
 */
function verifyCalcomSignature(payload, signature, secret) {
  if (!signature || !secret) return null;
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return signature === expectedSignature;
}

/**
 * GET /api/webhooks/logs
 */
router.get('/logs', validateQuery(webhookLogQuerySchema), async (req, res) => {
  try {
    const options = {
      ...req.query,
      source: req.query.source?.split(','),
      status: req.query.status?.split(',')
    };
    const result = await WebhookLog.getWebhookLogs(options);
    res.json({ success: true, data: result.logs, pagination: result.pagination });
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch webhook logs' });
  }
});

/**
 * GET /api/webhooks/logs/recent
 */
router.get('/logs/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const logs = await WebhookLog.getRecentWebhookLogs(limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Error fetching recent webhook logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent webhook logs' });
  }
});

/**
 * GET /api/webhooks/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await WebhookLog.getWebhookStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching webhook stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch webhook statistics' });
  }
});

/**
 * GET /api/webhooks/logs/:id
 */
router.get('/logs/:id', async (req, res) => {
  try {
    const log = await WebhookLog.getWebhookLogById(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, error: 'Webhook log not found' });
    }
    res.json({ success: true, data: log });
  } catch (error) {
    console.error('Error fetching webhook log:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch webhook log' });
  }
});

/**
 * GET /api/webhooks/meta - Meta verification
 */
router.get('/meta', (req, res) => {
  const verifyToken = process.env.META_VERIFY_TOKEN || 'lead_pipeline_verify';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log('Meta verification:', { mode, token, challenge });
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Meta webhook verified');
    res.set('Content-Type', 'text/plain');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Meta verification failed');
    res.status(403).send('Forbidden');
  }
});

/**
 * POST /api/webhooks/meta - Receive Meta leads
 */
router.post('/meta', async (req, res) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['x-hub-signature-256'];
  const signatureValid = verifyMetaSignature(rawBody, signature, process.env.META_APP_SECRET);
  
  console.log('📥 Meta webhook:', JSON.stringify(req.body, null, 2));
  
  const logId = await WebhookLog.createWebhookLog({
    source: 'meta_forms',
    endpoint: '/api/webhooks/meta',
    method: 'POST',
    headers: req.headers,
    payload: req.body,
    query_params: req.query,
    ip_address: getClientIP(req),
    user_agent: req.headers['user-agent'],
    signature_valid: signatureValid
  });

  if (process.env.META_APP_SECRET && signatureValid === false) {
    await WebhookLog.markWebhookFailed(logId, 'Invalid signature', 401);
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  try {
    const { object, entry, field, value } = req.body;
    
    // Handle flat format
    if (field && value) {
      if (field === 'leadgen') {
        let leadInfo = extractLeadInfo(value.field_data, value);
        
        if (!value.field_data && process.env.META_PAGE_ACCESS_TOKEN && value.leadgen_id) {
          try {
            const graphUrl = `https://graph.facebook.com/v18.0/${value.leadgen_id}?access_token=${process.env.META_PAGE_ACCESS_TOKEN}&fields=field_data`;
            const response = await fetch(graphUrl);
            const graphData = await response.json();
            if (graphData.field_data) leadInfo = extractLeadInfo(graphData.field_data, value);
          } catch (err) {
            console.error('Graph API error:', err.message);
          }
        }
        
        const lead = await Lead.createLead({
          first_name: leadInfo.first_name,
          last_name: leadInfo.last_name,
          email: leadInfo.email,
          phone: leadInfo.phone,
          source: 'meta_forms',
          source_id: value.leadgen_id,
          campaign_id: value.form_id,
          custom_fields: {
            ...leadInfo.custom_fields,
            meta_form_id: value.form_id,
            meta_page_id: value.page_id,
            meta_leadgen_id: value.leadgen_id
          },
          notes: 'Lead from Meta Instant Forms'
        });
        
        // CRITICAL: Auto-enroll in nurture sequence
        try {
          await enrollLead(lead.id, 'new_lead', { enrolledBy: 'webhook' });
          console.log(`✅ Lead ${lead.id} auto-enrolled in new_lead sequence`);
        } catch (enrollError) {
          console.error('Failed to enroll lead in sequence:', enrollError);
        }
        
        await WebhookLog.markWebhookProcessed(logId, lead.id, 200, JSON.stringify({ leadId: lead.id }));
        return res.status(200).json({ success: true, data: { leadId: lead.id } });
      }
      
      await WebhookLog.markWebhookProcessed(logId, null, 200, `Received ${field} event`);
      return res.status(200).json({ success: true, message: `Received ${field} event` });
    }
    
    // Handle nested format
    if (object !== 'page' || !entry?.length) {
      await WebhookLog.markWebhookProcessed(logId, null, 200, 'Unknown format - logged');
      return res.status(200).json({ success: true, message: 'Webhook logged' });
    }

    const leadsCreated = [];
    
    for (const pageEntry of entry) {
      for (const change of (pageEntry.changes || [])) {
        if (change.field === 'leadgen') {
          const data = change.value;
          let leadInfo = extractLeadInfo(data.field_data, data);
          
          if (!data.field_data && process.env.META_PAGE_ACCESS_TOKEN && data.leadgen_id) {
            try {
              const graphUrl = `https://graph.facebook.com/v18.0/${data.leadgen_id}?access_token=${process.env.META_PAGE_ACCESS_TOKEN}&fields=field_data`;
              const response = await fetch(graphUrl);
              const graphData = await response.json();
              if (graphData.field_data) leadInfo = extractLeadInfo(graphData.field_data, data);
            } catch (err) {
              console.error('Graph API error:', err.message);
            }
          }
          
          const lead = await Lead.createLead({
            first_name: leadInfo.first_name,
            last_name: leadInfo.last_name,
            email: leadInfo.email,
            phone: leadInfo.phone,
            source: 'meta_forms',
            source_id: data.leadgen_id,
            campaign_id: data.form_id,
            custom_fields: {
              ...leadInfo.custom_fields,
              meta_form_id: data.form_id,
              meta_page_id: data.page_id,
              meta_leadgen_id: data.leadgen_id
            },
            notes: 'Lead from Meta Instant Forms'
          });
          
          // CRITICAL: Auto-enroll in nurture sequence
          try {
            await enrollLead(lead.id, 'new_lead', { enrolledBy: 'webhook' });
            console.log(`✅ Lead ${lead.id} auto-enrolled in new_lead sequence`);
          } catch (enrollError) {
            console.error('Failed to enroll lead in sequence:', enrollError);
          }
          
          leadsCreated.push(lead);
        }
      }
    }

    await WebhookLog.markWebhookProcessed(logId, leadsCreated[0]?.id, 200, JSON.stringify({ count: leadsCreated.length }));
    res.status(200).json({ success: true, message: `Processed ${leadsCreated.length} leads` });
  } catch (error) {
    console.error('Meta webhook error:', error);
    await WebhookLog.markWebhookFailed(logId, error.message, 500);
    res.status(200).json({ success: false, error: 'Processing error' });
  }
});

/**
 * POST /api/webhooks/calcom - Receive Cal.com bookings
 */
router.post('/calcom', async (req, res) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['x-cal-signature-256'];
  const signatureValid = verifyCalcomSignature(rawBody, signature, process.env.CALCOM_WEBHOOK_SECRET);
  
  const logId = await WebhookLog.createWebhookLog({
    source: 'calcom',
    endpoint: '/api/webhooks/calcom',
    method: 'POST',
    headers: req.headers,
    payload: req.body,
    query_params: req.query,
    ip_address: getClientIP(req),
    user_agent: req.headers['user-agent'],
    signature_valid: signatureValid
  });

  if (process.env.CALCOM_WEBHOOK_SECRET && signatureValid === false) {
    await WebhookLog.markWebhookFailed(logId, 'Invalid signature', 401);
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  try {
    const { triggerEvent, payload } = req.body;
    const validEvents = ['BOOKING_CREATED', 'BOOKING_RESCHEDULED', 'BOOKING_CONFIRMED'];
    
    if (!validEvents.includes(triggerEvent)) {
      await WebhookLog.markWebhookProcessed(logId, null, 200, 'Event ignored');
      return res.status(200).json({ success: true, message: `Event ${triggerEvent} ignored` });
    }

    if (!payload?.attendees?.length) {
      await WebhookLog.markWebhookFailed(logId, 'No attendees', 400);
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }

    const leadsCreated = [];
    
    for (const attendee of payload.attendees) {
      const nameParts = (attendee.name || '').split(' ');
      const responses = payload.responses || {};
      
      const existingLead = await Lead.getLeadByEmailAndSource(attendee.email, 'calcom');
      
      if (existingLead) {
        await Lead.updateLead(existingLead.id, {
          custom_fields: {
            ...existingLead.custom_fields,
            last_booking_title: payload.title,
            last_booking_time: payload.startTime
          }
        });
        
        // Trigger meeting booked sequence
        try {
          await onMeetingBooked(existingLead.id, payload.startTime);
          console.log(`📅 Meeting booked sequence triggered for ${existingLead.id}`);
        } catch (seqError) {
          console.error('Failed to trigger meeting sequence:', seqError);
        }
        
        leadsCreated.push(existingLead);
      } else {
        const lead = await Lead.createLead({
          first_name: nameParts[0] || null,
          last_name: nameParts.slice(1).join(' ') || null,
          email: attendee.email,
          phone: responses.phone || attendee.phone || null,
          source: 'calcom',
          source_id: payload.uid,
          custom_fields: {
            calcom_booking_id: payload.uid,
            booking_title: payload.title,
            booking_time: payload.startTime,
            timezone: attendee.timeZone,
            ...responses
          },
          notes: `Booked via Cal.com: ${payload.title}`
        });
        
        // New lead from Cal.com = meeting already booked
        try {
          await onMeetingBooked(lead.id, payload.startTime);
          console.log(`📅 Meeting booked sequence triggered for new lead ${lead.id}`);
        } catch (seqError) {
          console.error('Failed to trigger meeting sequence:', seqError);
        }
        
        leadsCreated.push(lead);
      }
    }

    await WebhookLog.markWebhookProcessed(logId, leadsCreated[0]?.id, 200, JSON.stringify({ count: leadsCreated.length }));
    res.status(200).json({ success: true, message: `Processed ${leadsCreated.length} attendees` });
  } catch (error) {
    console.error('Cal.com webhook error:', error);
    await WebhookLog.markWebhookFailed(logId, error.message, 500);
    res.status(500).json({ success: false, error: 'Processing error' });
  }
});

/**
 * POST /api/webhooks/test - Test webhook endpoint
 */
router.post('/test', async (req, res) => {
  const logId = await WebhookLog.createWebhookLog({
    source: 'test',
    endpoint: '/api/webhooks/test',
    method: 'POST',
    headers: req.headers,
    payload: req.body,
    query_params: req.query,
    ip_address: getClientIP(req),
    user_agent: req.headers['user-agent'],
    signature_valid: null
  });

  try {
    const payload = req.body;
    const nameParts = (payload.name || '').split(' ');
    
    const leadData = {
      first_name: payload.first_name || nameParts[0] || null,
      last_name: payload.last_name || nameParts.slice(1).join(' ') || null,
      email: payload.email || null,
      phone: payload.phone || null,
      company: payload.company || null,
      source: 'api',
      custom_fields: payload.custom_fields || {},
      notes: 'Created via test webhook'
    };

    if (!leadData.email && !leadData.first_name && !leadData.phone) {
      await WebhookLog.markWebhookFailed(logId, 'No lead data found', 400);
      return res.status(400).json({ success: false, error: 'No lead data found' });
    }

    const lead = await Lead.createLead(leadData);
    await WebhookLog.markWebhookProcessed(logId, lead.id, 200, JSON.stringify({ leadId: lead.id }));
    
    res.status(201).json({ success: true, data: lead, webhookLogId: logId });
  } catch (error) {
    console.error('Test webhook error:', error);
    await WebhookLog.markWebhookFailed(logId, error.message, 500);
    res.status(500).json({ success: false, error: 'Processing error' });
  }
});

/**
 * POST /api/webhooks/simulate/:type - Simulate webhooks
 */
router.post('/simulate/:type', async (req, res) => {
  const { type } = req.params;
  const customData = req.body;
  
  const logId = await WebhookLog.createWebhookLog({
    source: `${type}_simulated`,
    endpoint: `/api/webhooks/simulate/${type}`,
    method: 'POST',
    headers: { 'x-simulated': 'true' },
    payload: customData,
    query_params: {},
    ip_address: getClientIP(req),
    user_agent: req.headers['user-agent'],
    signature_valid: null
  });

  try {
    let lead;
    
    if (type === 'meta') {
      lead = await Lead.createLead({
        first_name: customData.first_name || 'John',
        last_name: customData.last_name || 'Doe',
        email: customData.email || `test${Date.now()}@example.com`,
        phone: customData.phone || '+1234567890',
        source: 'meta_forms',
        source_id: `sim_${Date.now()}`,
        campaign_id: customData.form_id || 'simulated_form',
        custom_fields: { simulated: true },
        notes: 'Simulated Meta lead'
      });
    } else if (type === 'calcom') {
      const nameParts = (customData.name || 'Jane Smith').split(' ');
      lead = await Lead.createLead({
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' '),
        email: customData.email || `test${Date.now()}@example.com`,
        phone: customData.phone || '+1987654321',
        source: 'calcom',
        source_id: `sim_${Date.now()}`,
        custom_fields: { booking_title: customData.title || 'Discovery Call', simulated: true },
        notes: 'Simulated Cal.com booking'
      });
    } else {
      return res.status(400).json({ success: false, error: `Unknown type: ${type}` });
    }

    await WebhookLog.markWebhookProcessed(logId, lead.id, 200, JSON.stringify({ leadId: lead.id }));
    res.status(201).json({ success: true, data: lead, webhookLogId: logId });
  } catch (error) {
    console.error('Simulate webhook error:', error);
    await WebhookLog.markWebhookFailed(logId, error.message, 500);
    res.status(500).json({ success: false, error: 'Processing error' });
  }
});

export default router;
