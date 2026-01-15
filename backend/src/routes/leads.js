/**
 * Lead Routes
 * 
 * RESTful API endpoints for lead management.
 * All endpoints are prefixed with /api/leads
 */

import { Router } from 'express';
import Lead from '../models/Lead.js';
import { leadSchema, leadQuerySchema, validateBody, validateQuery } from '../middleware/validation.js';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/leads
 * Get all leads with filtering, sorting, and pagination
 */
router.get('/', validateQuery(leadQuerySchema), async (req, res) => {
  try {
    const options = {
      ...req.query,
      // Parse comma-separated values for arrays
      status: req.query.status?.split(','),
      source: req.query.source?.split(','),
      tags: req.query.tags?.split(',')
    };

    const result = Lead.getLeads(options);
    
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
    const stats = Lead.getLeadStats();
    
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
 * GET /api/leads/:id
 * Get a single lead by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const lead = Lead.getLeadById(req.params.id);
    
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
 * GET /api/leads/:id/activities
 * Get activities for a lead
 */
router.get('/:id/activities', async (req, res) => {
  try {
    const lead = Lead.getLeadById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const activities = Lead.getLeadActivities(req.params.id, limit);
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching lead activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead activities',
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
    const lead = Lead.createLead(req.body);
    
    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully'
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    
    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE constraint failed')) {
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
    const lead = Lead.updateLead(req.params.id, req.body);
    
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
 * DELETE /api/leads/:id
 * Delete a lead
 */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = Lead.deleteLead(req.params.id);
    
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
 * POST /api/leads/bulk/update
 * Bulk update multiple leads
 */
router.post('/bulk/update', async (req, res) => {
  try {
    const { ids, updates } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required'
      });
    }
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'updates object is required'
      });
    }
    
    const result = Lead.bulkUpdateLeads(ids, updates);
    
    res.json({
      success: true,
      data: result,
      message: `${result.length} leads updated successfully`
    });
  } catch (error) {
    console.error('Error bulk updating leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update leads',
      message: error.message
    });
  }
});

/**
 * POST /api/leads/bulk/delete
 * Bulk delete multiple leads
 */
router.post('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ids array is required'
      });
    }
    
    const deletedCount = Lead.bulkDeleteLeads(ids);
    
    res.json({
      success: true,
      deletedCount,
      message: `${deletedCount} leads deleted successfully`
    });
  } catch (error) {
    console.error('Error bulk deleting leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete leads',
      message: error.message
    });
  }
});

export default router;
