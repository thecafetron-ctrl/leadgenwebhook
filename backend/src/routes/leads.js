/**
 * Lead Routes - PostgreSQL Version
 * 
 * RESTful API endpoints for lead management.
 * All endpoints are prefixed with /api/leads
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Lead from '../models/Lead.js';
import { leadSchema, leadQuerySchema, validateBody, validateQuery } from '../middleware/validation.js';
import { scoreLead, scoreAllLeads, rescoreAllLeads, getLeadAdvice } from '../services/aiPriorityService.js';
import { sendWhatsApp } from '../services/whatsappService.js';
import { sendEmail } from '../services/emailService.js';
import { query } from '../database/connection.js';

const router = Router();

/**
 * GET /api/leads
 * Get all leads with filtering, sorting, and pagination
 */
router.get('/', validateQuery(leadQuerySchema), async (req, res) => {
  try {
    const options = {
      ...req.query,
      status: req.query.status?.split(','),
      source: req.query.source?.split(','),
      leadType: req.query.leadType?.split(','),
      tags: req.query.tags?.split(','),
      // normalized enrichment filters
      budgetMin: req.query.budgetMin,
      budgetMax: req.query.budgetMax,
      shipmentsMin: req.query.shipmentsMin,
      shipmentsMax: req.query.shipmentsMax,
      decisionMaker: req.query.decisionMaker,
      // intent filters
      scoreMin: req.query.scoreMin,
      scoreMax: req.query.scoreMax,
      intentCategory: req.query.intentCategory
    };

    const result = await Lead.getLeads(options);
    
    res.json({
      success: true,
      data: result.leads,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/stats
 * Get lead statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await Lead.getLeadStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching lead stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/booked
 * Get leads with booked meetings (to mark as attended/no-show)
 */
router.get('/booked', async (req, res) => {
  try {
    const result = await Lead.getLeads({
      limit: 100,
      sortBy: 'updated_at',
      sortOrder: 'desc'
    });
    
    // Filter to leads with booking info
    const bookedLeads = result.leads.filter(lead => 
      lead.custom_fields?.booking_time || lead.custom_fields?.calcom_booking_id
    ).map(lead => ({
      id: lead.id,
      name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      booking_time: lead.custom_fields?.booking_time,
      meeting_status: lead.meeting_status || 'pending', // Show meeting status
      status: lead.status
    }));
    
    res.json({
      success: true,
      data: bookedLeads,
      count: bookedLeads.length
    });
  } catch (error) {
    console.error('Error fetching booked leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch booked leads',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/recent
 * Get recent leads
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leads = await Lead.getRecentLeads(limit);
    
    res.json({
      success: true,
      data: leads
    });
  } catch (error) {
    console.error('Error fetching recent leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent leads',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/:id
 * Get a single lead by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.getLeadById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    res.json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead',
      message: error.message
    });
  }
});

/**
 * POST /api/leads
 * Create a new lead
 */
router.post('/', validateBody(leadSchema), async (req, res) => {
  try {
    const lead = await Lead.createLead(req.body);
    
    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully'
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    
    if (error.message?.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        error: 'Lead already exists with this email and source'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create lead',
      message: error.message
    });
  }
});

/**
 * PUT /api/leads/:id
 * Update a lead
 */
router.put('/:id', validateBody(leadSchema.partial()), async (req, res) => {
  try {
    const lead = await Lead.updateLead(req.params.id, req.body);
    
    res.json({
      success: true,
      data: lead,
      message: 'Lead updated successfully'
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    
    if (error.message === 'Lead not found') {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update lead',
      message: error.message
    });
  }
});

/**
 * POST /api/leads/:id/attended
 * Mark a lead as attended (prevents no-show emails)
 */
router.post('/:id/attended', async (req, res) => {
  try {
    const lead = await Lead.getLeadById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    // Update meeting_status to attended
    const updated = await Lead.updateLead(req.params.id, {
      meeting_status: 'attended'
    });
    
    console.log(`✅ Lead ${lead.first_name} ${lead.last_name} marked as ATTENDED`);
    
    res.json({
      success: true,
      data: updated,
      message: `${lead.first_name} ${lead.last_name} marked as attended - no-show emails will NOT be sent`
    });
  } catch (error) {
    console.error('Error marking lead as attended:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark lead as attended',
      message: error.message
    });
  }
});

/**
 * POST /api/leads/:id/score
 * Calculate priority score for a lead
 */
router.post('/:id/score', async (req, res) => {
  try {
    const result = await scoreLead(req.params.id);
    res.json({
      success: true,
      data: result,
      message: `Lead scored: ${result.score}/100`
    });
  } catch (error) {
    console.error('Error scoring lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to score lead',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/:id/advice
 * Get AI advice on how to approach this lead
 */
router.get('/:id/advice', async (req, res) => {
  try {
    const advice = await getLeadAdvice(req.params.id);
    res.json({
      success: true,
      data: advice
    });
  } catch (error) {
    console.error('Error getting advice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get advice',
      message: error.message
    });
  }
});

/**
 * POST /api/leads/score-all
 * Score all unscored leads
 */
router.post('/score-all', async (req, res) => {
  try {
    const results = await scoreAllLeads();
    res.json({
      success: true,
      data: results,
      message: `Scored ${results.length} leads`
    });
  } catch (error) {
    console.error('Error scoring leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to score leads',
      message: error.message
    });
  }
});

/**
 * POST /api/leads/rescore-all
 * Re-score ALL leads (force recalculation)
 */
router.post('/rescore-all', async (req, res) => {
  try {
    const results = await rescoreAllLeads();
    res.json({
      success: true,
      data: results,
      message: `Re-scored ${results.length} leads`
    });
  } catch (error) {
    console.error('Error rescoring leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rescore leads',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/rescore-stream
 * Stream progressive scoring updates via Server-Sent Events
 * Scores leads one at a time with real-time progress
 */
router.get('/rescore-stream', async (req, res) => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Get all leads to score
    const result = await query('SELECT * FROM leads ORDER BY created_at DESC');
    const leads = result.rows;
    const total = leads.length;

    sendEvent('start', { total, message: `Starting to score ${total} leads...` });

    const results = [];
    
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      
      try {
        // Score this lead
        const scoreResult = await scoreLead(lead.id);
        results.push(scoreResult);
        
        // Send progress update
        sendEvent('progress', {
          current: i + 1,
          total,
          percentage: Math.round(((i + 1) / total) * 100),
          lead: {
            id: lead.id,
            name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
            score: scoreResult.score,
            intentCategory: scoreResult.intentCategory || scoreResult.intent_category,
            priority: scoreResult.priority
          }
        });
      } catch (err) {
        console.error(`Error scoring lead ${lead.id}:`, err);
        sendEvent('error', {
          current: i + 1,
          total,
          leadId: lead.id,
          error: err.message
        });
      }
      
      // Small delay to prevent rate limiting and allow UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    sendEvent('complete', {
      total: results.length,
      message: `Finished scoring ${results.length} leads`,
      results
    });

  } catch (error) {
    console.error('Error in rescore stream:', error);
    sendEvent('error', { message: error.message, fatal: true });
  } finally {
    res.end();
  }
});

/**
 * POST /api/leads/manual-send
 * Send manual message to selected leads
 */
router.post('/manual-send', async (req, res) => {
  try {
    const { leadIds, channel, emailAccount, whatsappInstance, subject, message } = req.body;

    if (!leadIds || leadIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No leads selected' });
    }

    if (!channel || !message) {
      return res.status(400).json({ success: false, error: 'Channel and message are required' });
    }

    const results = [];
    
    for (const leadId of leadIds) {
      const leadResult = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
      const lead = leadResult.rows[0];
      
      if (!lead) {
        results.push({ leadId, success: false, error: 'Lead not found' });
        continue;
      }

      try {
        if (channel === 'email' && lead.email) {
          // Personalize message
          const personalizedMessage = message
            .replace(/{{first_name}}/g, lead.first_name || '')
            .replace(/{{last_name}}/g, lead.last_name || '')
            .replace(/{{company}}/g, lead.company || '')
            .replace(/{{name}}/g, lead.first_name || '');

          const personalizedSubject = (subject || 'Message from STRUCTURE')
            .replace(/{{first_name}}/g, lead.first_name || '')
            .replace(/{{name}}/g, lead.first_name || '');

          // Determine which email account to use
          const fromEmail = emailAccount === 'haarith' 
            ? 'haarith@structurelogistics.com' 
            : 'sales@structurelogistics.com';

          const emailResult = await sendEmail({
            to: lead.email,
            subject: personalizedSubject,
            html: personalizedMessage.replace(/\n/g, '<br>'),
            fromName: emailAccount === 'haarith' ? 'Haarith Imran' : 'STRUCTURE Team',
            fromEmail
          });

          results.push({ 
            leadId, 
            name: `${lead.first_name} ${lead.last_name}`,
            channel: 'email',
            success: emailResult.success !== false,
            to: lead.email
          });
        }

        if (channel === 'whatsapp' && lead.phone) {
          // Personalize message
          const personalizedMessage = message
            .replace(/{{first_name}}/g, lead.first_name || '')
            .replace(/{{last_name}}/g, lead.last_name || '')
            .replace(/{{company}}/g, lead.company || '')
            .replace(/{{name}}/g, lead.first_name || '');

          // Use specified WhatsApp instance
          const isInitial = whatsappInstance === 'haarith';

          const waResult = await sendWhatsApp({
            phone: lead.phone,
            message: personalizedMessage,
            isInitial
          });

          results.push({ 
            leadId, 
            name: `${lead.first_name} ${lead.last_name}`,
            channel: 'whatsapp',
            success: waResult.success,
            to: lead.phone,
            instance: isInitial ? 'Haarith (+971)' : 'Meta (+44)'
          });
        }

        if (channel === 'both') {
          // Send both email and WhatsApp
          if (lead.email) {
            const personalizedMessage = message
              .replace(/{{first_name}}/g, lead.first_name || '')
              .replace(/{{name}}/g, lead.first_name || '');
            const personalizedSubject = (subject || 'Message from STRUCTURE')
              .replace(/{{first_name}}/g, lead.first_name || '');

            const fromEmail = emailAccount === 'haarith' 
              ? 'haarith@structurelogistics.com' 
              : 'sales@structurelogistics.com';

            await sendEmail({
              to: lead.email,
              subject: personalizedSubject,
              html: personalizedMessage.replace(/\n/g, '<br>'),
              fromName: emailAccount === 'haarith' ? 'Haarith Imran' : 'STRUCTURE Team',
              fromEmail
            });
          }

          if (lead.phone) {
            const personalizedMessage = message
              .replace(/{{first_name}}/g, lead.first_name || '')
              .replace(/{{name}}/g, lead.first_name || '');

            await sendWhatsApp({
              phone: lead.phone,
              message: personalizedMessage,
              isInitial: whatsappInstance === 'haarith'
            });
          }

          results.push({ 
            leadId, 
            name: `${lead.first_name} ${lead.last_name}`,
            channel: 'both',
            success: true
          });
        }
      } catch (sendError) {
        results.push({ 
          leadId, 
          name: `${lead.first_name} ${lead.last_name}`,
          success: false, 
          error: sendError.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      data: results,
      message: `Sent to ${successCount}/${leadIds.length} leads`
    });
  } catch (error) {
    console.error('Error in manual send:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send messages',
      message: error.message
    });
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a lead
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Lead.deleteLead(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete lead',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/:id/activities
 * Get all activities for a lead
 */
router.get('/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await query(
      `SELECT * FROM lead_activities 
       WHERE lead_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [id, limit]
    );
    
    const activities = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      performed_by: row.performed_by,
      created_at: row.created_at
    }));
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities',
      message: error.message
    });
  }
});

/**
 * POST /api/leads/:id/calls
 * Log a call for a lead
 */
router.post('/:id/calls', async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome } = req.body; // 'answered' or 'unanswered'
    
    if (!outcome || !['answered', 'unanswered'].includes(outcome)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid outcome. Must be "answered" or "unanswered"'
      });
    }
    
    // Check if lead exists
    const lead = await Lead.getLeadById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    // Create activity
    const activityId = uuidv4();
    const now = new Date().toISOString();
    
    await query(
      `INSERT INTO lead_activities (id, lead_id, type, description, metadata, performed_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        activityId,
        id,
        'call',
        `Call ${outcome === 'answered' ? 'answered' : 'unanswered'}`,
        JSON.stringify({ outcome }),
        'user', // TODO: get from auth
        now
      ]
    );
    
    // Update lead's last_contacted_at
    await query(
      `UPDATE leads SET last_contacted_at = $1, updated_at = $1 WHERE id = $2`,
      [now, id]
    );
    
    // Get call count
    const callCountResult = await query(
      `SELECT COUNT(*) as count FROM lead_activities WHERE lead_id = $1 AND type = 'call'`,
      [id]
    );
    const callCount = parseInt(callCountResult.rows[0].count);
    
    res.json({
      success: true,
      data: {
        id: activityId,
        outcome,
        call_count: callCount,
        created_at: now
      }
    });
  } catch (error) {
    console.error('Error logging call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log call',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/:id/calls
 * Get call count for a lead
 */
router.get('/:id/calls', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT COUNT(*) as count FROM lead_activities WHERE lead_id = $1 AND type = 'call'`,
      [id]
    );
    
    const callCount = parseInt(result.rows[0].count);
    
    res.json({
      success: true,
      data: { call_count: callCount }
    });
  } catch (error) {
    console.error('Error fetching call count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call count',
      message: error.message
    });
  }
});

/**
 * PUT /api/leads/activities/:activityId
 * Update a call activity (change outcome)
 */
router.put('/activities/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;
    const { outcome } = req.body;
    
    if (!outcome || !['answered', 'unanswered'].includes(outcome)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid outcome. Must be "answered" or "unanswered"'
      });
    }
    
    // Check if activity exists and is a call
    const activityCheck = await query(
      `SELECT id, lead_id, type FROM lead_activities WHERE id = $1`,
      [activityId]
    );
    
    if (activityCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    if (activityCheck.rows[0].type !== 'call') {
      return res.status(400).json({
        success: false,
        error: 'Activity is not a call'
      });
    }
    
    // Update the activity
    await query(
      `UPDATE lead_activities 
       SET description = $1, metadata = $2, updated_at = NOW()
       WHERE id = $3`,
      [
        `Call ${outcome === 'answered' ? 'answered' : 'unanswered'}`,
        JSON.stringify({ outcome }),
        activityId
      ]
    );
    
    res.json({
      success: true,
      message: 'Call updated successfully'
    });
  } catch (error) {
    console.error('Error updating call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update call',
      message: error.message
    });
  }
});

/**
 * DELETE /api/leads/activities/:activityId
 * Delete a call activity
 */
router.delete('/activities/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;
    
    // Check if activity exists and is a call
    const activityCheck = await query(
      `SELECT id, lead_id, type FROM lead_activities WHERE id = $1`,
      [activityId]
    );
    
    if (activityCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    if (activityCheck.rows[0].type !== 'call') {
      return res.status(400).json({
        success: false,
        error: 'Activity is not a call'
      });
    }
    
    // Delete the activity
    await query(`DELETE FROM lead_activities WHERE id = $1`, [activityId]);
    
    res.json({
      success: true,
      message: 'Call deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete call',
      message: error.message
    });
  }
});

export default router;
