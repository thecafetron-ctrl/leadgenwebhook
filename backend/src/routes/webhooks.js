/**
 * Webhook Routes
 * 
 * Endpoints for receiving webhooks from external services.
 * Includes validation, logging, and lead creation.
 * 
 * Supported integrations:
 * - Meta Instant Forms (Facebook/Instagram Lead Ads)
 * - Cal.com (Booking notifications)
 * - Custom/Test webhooks
 * 
 * To add new webhook integrations:
 * 1. Add a new endpoint handler (e.g., POST /api/webhooks/new-service)
 * 2. Implement signature validation if the service supports it
 * 3. Create a transformer function to normalize data to lead format
 * 4. Update the WEBHOOK_SOURCES constant in models
 */

import { Router } from 'express';
import crypto from 'crypto';
import Lead from '../models/Lead.js';
import WebhookLog from '../models/WebhookLog.js';
import { webhookLogQuerySchema, validateQuery } from '../middleware/validation.js';

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
 * Helper: Verify Meta webhook signature
 */
function verifyMetaSignature(payload, signature, appSecret) {
  if (!signature || !appSecret) return null;
  
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}

/**
 * Helper: Verify Cal.com webhook signature
 */
function verifyCalcomSignature(payload, signature, secret) {
  if (!signature || !secret) return null;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
}

/**
 * GET /api/webhooks/logs
 * Get webhook logs with filtering and pagination
 */
router.get('/logs', validateQuery(webhookLogQuerySchema), async (req, res) => {
  try {
    const options = {
      ...req.query,
      // Parse comma-separated values for arrays
      source: req.query.source?.split(','),
      status: req.query.status?.split(',')
    };

    const result = WebhookLog.getWebhookLogs(options);
    
    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook logs',
      message: error.message
    });
  }
});

/**
 * GET /api/webhooks/logs/recent
 * Get recent webhook logs
 */
router.get('/logs/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const logs = WebhookLog.getRecentWebhookLogs(limit);
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching recent webhook logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent webhook logs',
      message: error.message
    });
  }
});

/**
 * GET /api/webhooks/stats
 * Get webhook statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = WebhookLog.getWebhookStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching webhook stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/webhooks/logs/:id
 * Get a specific webhook log
 */
router.get('/logs/:id', async (req, res) => {
  try {
    const log = WebhookLog.getWebhookLogById(req.params.id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Webhook log not found'
      });
    }
    
    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching webhook log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook log',
      message: error.message
    });
  }
});

/**
 * GET /api/webhooks/meta
 * Meta webhook verification (for Facebook/Instagram)
 * This is called by Meta when you set up the webhook
 */
router.get('/meta', (req, res) => {
  const verifyToken = process.env.META_VERIFY_TOKEN || 'lead_pipeline_verify';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Meta webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('Meta webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

/**
 * POST /api/webhooks/meta
 * Receive Meta Instant Forms webhook
 * 
 * Meta sends lead data in the following format:
 * {
 *   "object": "page",
 *   "entry": [{
 *     "id": "page_id",
 *     "time": 1234567890,
 *     "changes": [{
 *       "field": "leadgen",
 *       "value": {
 *         "form_id": "...",
 *         "leadgen_id": "...",
 *         "created_time": 1234567890,
 *         "page_id": "..."
 *       }
 *     }]
 *   }]
 * }
 * 
 * Note: Meta only sends a notification. You need to fetch the actual lead data
 * using the Graph API with the leadgen_id. For this demo, we simulate the data.
 */
router.post('/meta', async (req, res) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.META_APP_SECRET;
  
  // Log the webhook
  const logId = WebhookLog.createWebhookLog({
    source: 'meta_forms',
    endpoint: '/api/webhooks/meta',
    method: 'POST',
    headers: req.headers,
    payload: req.body,
    query_params: req.query,
    ip_address: getClientIP(req),
    user_agent: req.headers['user-agent'],
    signature_valid: verifyMetaSignature(rawBody, signature, appSecret)
  });

  try {
    const { object, entry } = req.body;
    
    if (object !== 'page' || !entry || entry.length === 0) {
      WebhookLog.markWebhookFailed(logId, 'Invalid payload structure', 400);
      return res.status(400).json({
        success: false,
        error: 'Invalid Meta webhook payload'
      });
    }

    const leadsCreated = [];
    
    for (const pageEntry of entry) {
      const changes = pageEntry.changes || [];
      
      for (const change of changes) {
        if (change.field === 'leadgen') {
          const leadgenData = change.value;
          
          // In production, you would fetch the lead data from Meta Graph API
          // For now, we create a lead with the leadgen_id
          // 
          // To implement full Meta integration:
          // 1. Use the leadgen_id to fetch lead details via Graph API
          // 2. GET https://graph.facebook.com/v18.0/{leadgen_id}
          //    ?access_token={page_access_token}
          //    &fields=created_time,id,ad_id,form_id,field_data
          
          const lead = Lead.createLead({
            source: 'meta_forms',
            source_id: leadgenData.leadgen_id,
            campaign_id: leadgenData.form_id,
            custom_fields: {
              meta_form_id: leadgenData.form_id,
              meta_page_id: leadgenData.page_id,
              meta_leadgen_id: leadgenData.leadgen_id,
              meta_created_time: leadgenData.created_time
            },
            notes: 'Lead from Meta Instant Forms - fetch details from Graph API'
          });
          
          leadsCreated.push(lead);
        }
      }
    }

    WebhookLog.markWebhookProcessed(
      logId, 
      leadsCreated[0]?.id,
      200,
      JSON.stringify({ leadsCreated: leadsCreated.length })
    );
    
    // Meta expects a 200 response
    res.status(200).json({
      success: true,
      message: `Processed ${leadsCreated.length} leads`
    });
  } catch (error) {
    console.error('Error processing Meta webhook:', error);
    WebhookLog.markWebhookFailed(logId, error.message, 500);
    
    // Still return 200 to Meta to prevent retries
    res.status(200).json({
      success: false,
      error: 'Internal processing error'
    });
  }
});

/**
 * POST /api/webhooks/calcom
 * Receive Cal.com webhook
 * 
 * Cal.com webhook payload structure:
 * {
 *   "triggerEvent": "BOOKING_CREATED",
 *   "createdAt": "2024-01-01T00:00:00.000Z",
 *   "payload": {
 *     "title": "Meeting with John",
 *     "startTime": "...",
 *     "endTime": "...",
 *     "attendees": [{
 *       "email": "john@example.com",
 *       "name": "John Doe",
 *       "timeZone": "..."
 *     }],
 *     "organizer": {...},
 *     "responses": {
 *       "name": "John Doe",
 *       "email": "john@example.com",
 *       "phone": "+1234567890"
 *     }
 *   }
 * }
 */
router.post('/calcom', async (req, res) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['x-cal-signature-256'];
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  
  // Log the webhook
  const logId = WebhookLog.createWebhookLog({
    source: 'calcom',
    endpoint: '/api/webhooks/calcom',
    method: 'POST',
    headers: req.headers,
    payload: req.body,
    query_params: req.query,
    ip_address: getClientIP(req),
    user_agent: req.headers['user-agent'],
    signature_valid: verifyCalcomSignature(rawBody, signature, secret)
  });

  try {
    const { triggerEvent, payload } = req.body;
    
    // Only process booking-related events
    const validEvents = ['BOOKING_CREATED', 'BOOKING_RESCHEDULED', 'BOOKING_CONFIRMED'];
    
    if (!validEvents.includes(triggerEvent)) {
      WebhookLog.markWebhookProcessed(logId, null, 200, 'Event type ignored');
      return res.status(200).json({
        success: true,
        message: `Event ${triggerEvent} ignored`
      });
    }

    if (!payload || !payload.attendees || payload.attendees.length === 0) {
      WebhookLog.markWebhookFailed(logId, 'No attendees in payload', 400);
      return res.status(400).json({
        success: false,
        error: 'Invalid Cal.com webhook payload'
      });
    }

    const leadsCreated = [];
    
    for (const attendee of payload.attendees) {
      // Extract name parts
      const nameParts = (attendee.name || '').split(' ');
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ') || null;
      
      // Get additional responses
      const responses = payload.responses || {};
      
      // Check if lead already exists
      const existingLead = Lead.getLeadByEmailAndSource(attendee.email, 'calcom');
      
      if (existingLead) {
        // Update existing lead with new booking info
        Lead.updateLead(existingLead.id, {
          custom_fields: {
            ...existingLead.custom_fields,
            last_booking_title: payload.title,
            last_booking_time: payload.startTime,
            booking_count: (existingLead.custom_fields?.booking_count || 0) + 1
          }
        });
        Lead.createLeadActivity(existingLead.id, 'booking', `New booking: ${payload.title}`, {
          event: triggerEvent,
          booking_title: payload.title,
          booking_time: payload.startTime
        });
        leadsCreated.push(existingLead);
      } else {
        // Create new lead
        const lead = Lead.createLead({
          first_name: firstName,
          last_name: lastName,
          email: attendee.email,
          phone: responses.phone || attendee.phone || null,
          source: 'calcom',
          source_id: payload.uid,
          custom_fields: {
            calcom_booking_id: payload.uid,
            booking_title: payload.title,
            booking_time: payload.startTime,
            booking_end_time: payload.endTime,
            timezone: attendee.timeZone,
            booking_count: 1,
            ...responses
          },
          notes: `Booked via Cal.com: ${payload.title}`
        });
        
        leadsCreated.push(lead);
      }
    }

    WebhookLog.markWebhookProcessed(
      logId,
      leadsCreated[0]?.id,
      200,
      JSON.stringify({ leadsProcessed: leadsCreated.length })
    );
    
    res.status(200).json({
      success: true,
      message: `Processed ${leadsCreated.length} attendees`,
      data: leadsCreated.map(l => l.id)
    });
  } catch (error) {
    console.error('Error processing Cal.com webhook:', error);
    WebhookLog.markWebhookFailed(logId, error.message, 500);
    
    res.status(500).json({
      success: false,
      error: 'Internal processing error'
    });
  }
});

/**
 * POST /api/webhooks/test
 * Test webhook endpoint for the playground
 * Accepts any payload and creates a lead
 */
router.post('/test', async (req, res) => {
  // Log the webhook
  const logId = WebhookLog.createWebhookLog({
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
    
    // Extract lead data from various payload formats
    let leadData = {};
    
    // Support direct lead format
    if (payload.email || payload.first_name || payload.name) {
      const nameParts = (payload.name || '').split(' ');
      leadData = {
        first_name: payload.first_name || nameParts[0] || null,
        last_name: payload.last_name || nameParts.slice(1).join(' ') || null,
        email: payload.email || null,
        phone: payload.phone || null,
        company: payload.company || null,
        job_title: payload.job_title || null,
        tags: payload.tags || [],
        custom_fields: payload.custom_fields || {}
      };
    }
    // Support nested data format
    else if (payload.data) {
      const data = payload.data;
      const nameParts = (data.name || '').split(' ');
      leadData = {
        first_name: data.first_name || nameParts[0] || null,
        last_name: data.last_name || nameParts.slice(1).join(' ') || null,
        email: data.email || null,
        phone: data.phone || null,
        company: data.company || null,
        job_title: data.job_title || null,
        tags: data.tags || [],
        custom_fields: data
      };
    }
    // Support Meta-like format
    else if (payload.entry) {
      leadData = {
        source_id: payload.entry[0]?.id,
        custom_fields: payload
      };
    }
    // Fallback: store entire payload in custom fields
    else {
      leadData = {
        custom_fields: payload
      };
    }

    // Set source to test
    leadData.source = 'api';
    leadData.notes = 'Created via test webhook endpoint';
    
    // Only create lead if we have some useful data
    if (!leadData.email && !leadData.first_name && !leadData.phone && Object.keys(leadData.custom_fields || {}).length === 0) {
      WebhookLog.markWebhookFailed(logId, 'No lead data could be extracted', 400);
      return res.status(400).json({
        success: false,
        error: 'No lead data found in payload'
      });
    }

    const lead = Lead.createLead(leadData);
    
    WebhookLog.markWebhookProcessed(logId, lead.id, 200, JSON.stringify({ leadId: lead.id }));
    
    res.status(201).json({
      success: true,
      message: 'Test webhook processed successfully',
      data: lead,
      webhookLogId: logId
    });
  } catch (error) {
    console.error('Error processing test webhook:', error);
    WebhookLog.markWebhookFailed(logId, error.message, 500);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process test webhook',
      message: error.message,
      webhookLogId: logId
    });
  }
});

/**
 * POST /api/webhooks/simulate/:type
 * Simulate webhook events for testing
 * Supported types: 'meta', 'calcom'
 */
router.post('/simulate/:type', async (req, res) => {
  const { type } = req.params;
  const customData = req.body;
  
  let simulatedPayload;
  
  switch (type) {
    case 'meta':
      simulatedPayload = {
        object: 'page',
        entry: [{
          id: customData.page_id || 'simulated_page_123',
          time: Date.now(),
          changes: [{
            field: 'leadgen',
            value: {
              form_id: customData.form_id || 'simulated_form_456',
              leadgen_id: customData.leadgen_id || `lead_${Date.now()}`,
              created_time: Math.floor(Date.now() / 1000),
              page_id: customData.page_id || 'simulated_page_123',
              // Simulated additional data (normally fetched from Graph API)
              simulated_data: {
                first_name: customData.first_name || 'John',
                last_name: customData.last_name || 'Doe',
                email: customData.email || `test${Date.now()}@example.com`,
                phone: customData.phone || '+1234567890'
              }
            }
          }]
        }]
      };
      break;
      
    case 'calcom':
      simulatedPayload = {
        triggerEvent: customData.triggerEvent || 'BOOKING_CREATED',
        createdAt: new Date().toISOString(),
        payload: {
          uid: customData.booking_id || `booking_${Date.now()}`,
          title: customData.title || 'Discovery Call',
          startTime: customData.startTime || new Date(Date.now() + 86400000).toISOString(),
          endTime: customData.endTime || new Date(Date.now() + 86400000 + 1800000).toISOString(),
          attendees: [{
            email: customData.email || `test${Date.now()}@example.com`,
            name: customData.name || 'Jane Smith',
            timeZone: customData.timezone || 'America/New_York'
          }],
          responses: {
            name: customData.name || 'Jane Smith',
            email: customData.email || `test${Date.now()}@example.com`,
            phone: customData.phone || '+1987654321',
            ...customData.responses
          }
        }
      };
      break;
      
    default:
      return res.status(400).json({
        success: false,
        error: `Unknown simulation type: ${type}. Supported: meta, calcom`
      });
  }

  // Log the simulated webhook
  const logId = WebhookLog.createWebhookLog({
    source: `${type}_simulated`,
    endpoint: `/api/webhooks/simulate/${type}`,
    method: 'POST',
    headers: { 'x-simulated': 'true' },
    payload: simulatedPayload,
    query_params: {},
    ip_address: getClientIP(req),
    user_agent: req.headers['user-agent'],
    signature_valid: null
  });

  try {
    let lead;
    
    if (type === 'meta') {
      const data = simulatedPayload.entry[0].changes[0].value;
      const simData = data.simulated_data;
      
      lead = Lead.createLead({
        first_name: simData.first_name,
        last_name: simData.last_name,
        email: simData.email,
        phone: simData.phone,
        source: 'meta_forms',
        source_id: data.leadgen_id,
        campaign_id: data.form_id,
        custom_fields: {
          meta_form_id: data.form_id,
          meta_page_id: data.page_id,
          simulated: true
        },
        notes: 'Simulated Meta Instant Forms lead'
      });
    } else if (type === 'calcom') {
      const payload = simulatedPayload.payload;
      const attendee = payload.attendees[0];
      const nameParts = attendee.name.split(' ');
      
      lead = Lead.createLead({
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' '),
        email: attendee.email,
        phone: payload.responses?.phone,
        source: 'calcom',
        source_id: payload.uid,
        custom_fields: {
          calcom_booking_id: payload.uid,
          booking_title: payload.title,
          booking_time: payload.startTime,
          simulated: true
        },
        notes: 'Simulated Cal.com booking lead'
      });
    }

    WebhookLog.markWebhookProcessed(logId, lead.id, 200, JSON.stringify({ leadId: lead.id }));
    
    res.status(201).json({
      success: true,
      message: `Simulated ${type} webhook processed`,
      data: {
        lead,
        simulatedPayload,
        webhookLogId: logId
      }
    });
  } catch (error) {
    console.error('Error processing simulated webhook:', error);
    WebhookLog.markWebhookFailed(logId, error.message, 500);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process simulated webhook',
      message: error.message
    });
  }
});

export default router;
