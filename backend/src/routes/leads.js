/**
 * Lead Routes - PostgreSQL Version
 * 
 * RESTful API endpoints for lead management.
 * All endpoints are prefixed with /api/leads
 */

import { Router } from 'express';
import Lead from '../models/Lead.js';
import { leadSchema, leadQuerySchema, validateBody, validateQuery } from '../middleware/validation.js';

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
      tags: req.query.tags?.split(',')
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

export default router;
