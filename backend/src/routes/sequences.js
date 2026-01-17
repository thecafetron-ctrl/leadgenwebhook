/**
 * Sequence Routes
 * 
 * API endpoints for managing email/WhatsApp sequences.
 */

import { Router } from 'express';
import * as SequenceService from '../services/sequenceService.js';
import * as WhatsAppService from '../services/whatsappService.js';

const router = Router();

// ==========================================
// DASHBOARD
// ==========================================

/**
 * GET /api/sequences/dashboard
 * Get sequence dashboard overview
 */
router.get('/dashboard', async (req, res) => {
  try {
    const data = await SequenceService.getSequenceDashboard();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// SEQUENCES
// ==========================================

/**
 * GET /api/sequences
 * List all sequences
 */
router.get('/', async (req, res) => {
  try {
    const sequences = await SequenceService.getSequences();
    res.json({ success: true, data: sequences });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sequences/:slug
 * Get sequence details with steps
 */
router.get('/:slug', async (req, res) => {
  try {
    const sequence = await SequenceService.getSequenceBySlug(req.params.slug);
    if (!sequence) {
      return res.status(404).json({ success: false, error: 'Sequence not found' });
    }
    
    const steps = await SequenceService.getSequenceSteps(sequence.id);
    res.json({ success: true, data: { ...sequence, steps } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sequences/:slug/steps
 * Get steps for a sequence (for pipeline map)
 */
router.get('/:slug/steps', async (req, res) => {
  try {
    const sequence = await SequenceService.getSequenceBySlug(req.params.slug);
    if (!sequence) {
      return res.status(404).json({ success: false, error: 'Sequence not found' });
    }
    const steps = await SequenceService.getSequenceSteps(sequence.id);
    res.json({ success: true, steps });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sequences/:slug/leads
 * Get leads enrolled in a sequence with their current step
 */
router.get('/:slug/leads', async (req, res) => {
  try {
    const { page = 1, limit = 100, status = 'active' } = req.query;
    const data = await SequenceService.getLeadSequenceBoard(req.params.slug, {
      page: parseInt(page),
      limit: parseInt(limit),
      status: status === 'all' ? null : status
    });
    res.json({ success: true, leads: data.leads, pagination: data.pagination });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sequences/:slug/board
 * Get leads board for a sequence
 */
router.get('/:slug/board', async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const data = await SequenceService.getLeadSequenceBoard(req.params.slug, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/sequences/steps/:stepId
 * Update a sequence step (content)
 */
router.put('/steps/:stepId', async (req, res) => {
  try {
    const step = await SequenceService.updateSequenceStep(req.params.stepId, req.body);
    res.json({ success: true, data: step });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// LEAD ENROLLMENT
// ==========================================

/**
 * POST /api/sequences/enroll
 * Manually enroll a lead in a sequence
 */
router.post('/enroll', async (req, res) => {
  try {
    const { leadId, sequenceSlug, meetingTime } = req.body;
    
    if (!leadId || !sequenceSlug) {
      return res.status(400).json({ success: false, error: 'leadId and sequenceSlug required' });
    }
    
    const enrollment = await SequenceService.enrollLead(leadId, sequenceSlug, {
      meetingTime,
      enrolledBy: 'manual'
    });
    
    res.json({ success: true, data: enrollment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sequences/manual-send
 * Manually trigger sending a specific step to a lead
 * This is TAMPERPROOF - it won't duplicate sends and auto will skip to next
 */
router.post('/manual-send', async (req, res) => {
  try {
    const { leadId, stepId } = req.body;
    
    if (!leadId || !stepId) {
      return res.status(400).json({ success: false, error: 'leadId and stepId required' });
    }
    
    const result = await SequenceService.manualSendStep(leadId, stepId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Manual send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sequences/cancel
 * Cancel a lead's sequence
 */
router.post('/cancel', async (req, res) => {
  try {
    const { leadId, sequenceSlug, reason } = req.body;
    
    if (sequenceSlug) {
      await SequenceService.cancelLeadSequence(leadId, sequenceSlug, reason);
    } else {
      await SequenceService.cancelAllSequences(leadId, reason);
    }
    
    res.json({ success: true, message: 'Sequence cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sequences/meeting-booked
 * Handle meeting booked event
 */
router.post('/meeting-booked', async (req, res) => {
  try {
    const { leadId, meetingTime } = req.body;
    
    if (!leadId || !meetingTime) {
      return res.status(400).json({ success: false, error: 'leadId and meetingTime required' });
    }
    
    await SequenceService.onMeetingBooked(leadId, meetingTime);
    res.json({ success: true, message: 'Meeting booked sequence activated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sequences/no-show
 * Handle no-show event
 */
router.post('/no-show', async (req, res) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId required' });
    }
    
    await SequenceService.onNoShow(leadId);
    res.json({ success: true, message: 'No-show sequence activated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sequences/meeting-completed
 * Handle meeting completed event
 */
router.post('/meeting-completed', async (req, res) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId required' });
    }
    
    await SequenceService.onMeetingCompleted(leadId);
    res.json({ success: true, message: 'Lead moved to newsletter' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// LEAD MESSAGES
// ==========================================

/**
 * GET /api/sequences/lead/:leadId/messages
 * Get all messages sent to a lead
 */
router.get('/lead/:leadId/messages', async (req, res) => {
  try {
    const messages = await SequenceService.getLeadMessages(req.params.leadId);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sequences/lead/:leadId/status
 * Get the sequence status for a lead (which sequence they're in, current step, etc.)
 */
router.get('/lead/:leadId/status', async (req, res) => {
  try {
    const status = await SequenceService.getLeadSequenceStatus(req.params.leadId);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// NEWSLETTER
// ==========================================

/**
 * POST /api/sequences/newsletter/send
 * Send newsletter to all subscribers
 */
router.post('/newsletter/send', async (req, res) => {
  try {
    const { subject, body } = req.body;
    
    if (!subject || !body) {
      return res.status(400).json({ success: false, error: 'subject and body required' });
    }
    
    const result = await SequenceService.sendNewsletter(subject, body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// WHATSAPP CONFIG
// ==========================================

/**
 * GET /api/sequences/whatsapp/status
 * Get WhatsApp connection status
 */
router.get('/whatsapp/status', async (req, res) => {
  try {
    const status = await WhatsAppService.getWhatsAppStatus();
    const config = await WhatsAppService.getWhatsAppConfig();
    res.json({ success: true, data: { ...status, ...config } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sequences/whatsapp/config
 * Save WhatsApp config
 */
router.post('/whatsapp/config', async (req, res) => {
  try {
    const { instance_name, api_url, api_key } = req.body;
    
    if (!instance_name || !api_url || !api_key) {
      return res.status(400).json({ success: false, error: 'All fields required' });
    }
    
    const config = await WhatsAppService.saveWhatsAppConfig({
      instance_name,
      api_url,
      api_key
    });
    
    res.json({ success: true, message: 'WhatsApp configured', data: { instance_name: config.instance_name } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sequences/whatsapp/test
 * Send test WhatsApp message
 */
router.post('/whatsapp/test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'phone and message required' });
    }
    
    const result = await WhatsAppService.sendWhatsApp({ phone, message });
    res.json({ success: result.success, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// QUEUE PROCESSING (for scheduler)
// ==========================================

/**
 * POST /api/sequences/process-queue
 * Manually trigger queue processing (for testing)
 * In production, this should be called by a scheduler
 */
router.post('/process-queue', async (req, res) => {
  try {
    const processed = await SequenceService.processMessageQueue();
    res.json({ success: true, processed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sequences/admin/seed-ebook
 * Admin endpoint to seed or update the ebook_nurture sequence
 */
router.post('/admin/seed-ebook', async (req, res) => {
  try {
    const { query } = await import('../database/connection.js');
    const { EBOOK_NURTURE_STEPS } = await import('../database/schema-sequences.js');
    
    // Check if sequence already exists
    const existing = await query("SELECT id FROM sequences WHERE slug = 'ebook_nurture'");
    let sequenceId;
    
    if (existing.rows.length > 0) {
      sequenceId = existing.rows[0].id;
      
      // Delete old steps and add new ones
      await query('DELETE FROM sequence_steps WHERE sequence_id = $1', [sequenceId]);
      
      // Update description
      await query(
        `UPDATE sequences SET description = $1, updated_at = NOW() WHERE id = $2`,
        ['Ebook delivery → 6hr follow-up → 35 days of value emails', sequenceId]
      );
    } else {
      // Create the sequence
      const result = await query(
        `INSERT INTO sequences (name, slug, description, trigger_type)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['Ebook Nurture', 'ebook_nurture', 'Ebook delivery → 6hr follow-up → 35 days of value emails', 'ebook_signup']
      );
      sequenceId = result.rows[0].id;
    }
    
    // Add steps
    for (const step of EBOOK_NURTURE_STEPS) {
      await query(
        `INSERT INTO sequence_steps (sequence_id, step_order, name, delay_value, delay_unit, channel)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sequenceId, step.step_order, step.name, step.delay_value, step.delay_unit, step.channel]
      );
    }
    
    res.json({ 
      success: true, 
      message: existing.rows.length > 0 ? 'Ebook sequence updated' : 'Ebook sequence created', 
      sequenceId, 
      stepsCreated: EBOOK_NURTURE_STEPS.length 
    });
  } catch (error) {
    console.error('Seed ebook sequence error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
