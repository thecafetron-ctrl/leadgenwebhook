/**
 * Validation Middleware
 * 
 * Uses Zod for request validation.
 * Provides reusable validation schemas for leads and webhooks.
 */

import { z } from 'zod';

/**
 * Lead validation schema
 */
export const leadSchema = z.object({
  first_name: z.string().max(100).optional().nullable(),
  last_name: z.string().max(100).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  job_title: z.string().max(200).optional().nullable(),
  source: z.enum(['manual', 'meta_forms', 'calcom', 'api', 'import', 'website', 'referral']).optional(),
  source_id: z.string().max(255).optional().nullable(),
  campaign_id: z.string().max(255).optional().nullable(),
  utm_source: z.string().max(255).optional().nullable(),
  utm_medium: z.string().max(255).optional().nullable(),
  utm_campaign: z.string().max(255).optional().nullable(),
  utm_content: z.string().max(255).optional().nullable(),
  utm_term: z.string().max(255).optional().nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  score: z.number().min(0).max(100).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional(),
  notes: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  email_consent: z.boolean().optional(),
  sms_consent: z.boolean().optional(),
  whatsapp_consent: z.boolean().optional(),
  gdpr_consent: z.object({
    accepted: z.boolean(),
    timestamp: z.string(),
    ip_address: z.string().optional(),
    version: z.string().optional()
  }).optional().nullable()
});

/**
 * Lead query parameters schema
 */
export const leadQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  sortBy: z.enum(['created_at', 'updated_at', 'first_name', 'last_name', 'email', 'status', 'source', 'score', 'priority', 'lead_type']).optional().default('created_at'),
  sortOrder: z.enum(['ASC', 'DESC', 'asc', 'desc']).optional().default('DESC'),
  search: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  leadType: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  scoreMin: z.coerce.number().min(0).max(100).optional(),
  scoreMax: z.coerce.number().min(0).max(100).optional(),
  intentCategory: z.string().optional(), // hot|warm|medium|low|junk (stored in custom_fields.ai_intent_category)
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  shipmentsMin: z.coerce.number().optional(),
  shipmentsMax: z.coerce.number().optional(),
  decisionMaker: z.string().optional(),
  tags: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  assigned_to: z.string().optional()
});

/**
 * Webhook log query parameters schema
 */
export const webhookLogQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  sortBy: z.enum(['received_at', 'processed_at', 'source', 'status', 'endpoint']).optional().default('received_at'),
  sortOrder: z.enum(['ASC', 'DESC', 'asc', 'desc']).optional().default('DESC'),
  source: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  lead_id: z.string().optional()
});

/**
 * Test webhook payload schema
 */
export const testWebhookSchema = z.object({
  source: z.enum(['meta_forms', 'calcom', 'custom']),
  payload: z.record(z.any())
});

/**
 * Middleware to validate request body
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}

/**
 * Middleware to validate query parameters
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}

/**
 * Middleware to validate request params
 */
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}

export default {
  leadSchema,
  leadQuerySchema,
  webhookLogQuerySchema,
  testWebhookSchema,
  validateBody,
  validateQuery,
  validateParams
};
