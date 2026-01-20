/**
 * Lead Model - PostgreSQL Version
 * 
 * Handles all database operations for leads using Neon PostgreSQL.
 * Data persists across deploys!
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection.js';

/**
 * Valid lead statuses
 */
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

/**
 * Valid lead priorities
 */
export const LEAD_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/**
 * Valid lead sources
 */
export const LEAD_SOURCES = ['manual', 'meta_forms', 'calcom', 'api', 'import', 'website', 'referral', 'ebook'];

/**
 * Create a new lead
 */
export async function createLead(leadData) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const {
    first_name = null,
    last_name = null,
    email = null,
    phone = null,
    company = null,
    job_title = null,
    source = 'manual',
    source_id = null,
    campaign_id = null,
    utm_source = null,
    utm_medium = null,
    utm_campaign = null,
    utm_content = null,
    utm_term = null,
    status = 'new',
    score = 0,
    priority = 'medium',
    tags = [],
    custom_fields = {},
    notes = null,
    assigned_to = null,
    email_consent = false,
    sms_consent = false,
    whatsapp_consent = false,
    gdpr_consent = null
  } = leadData;

  const sql = `
    INSERT INTO leads (
      id, first_name, last_name, email, phone, company, job_title,
      source, source_id, campaign_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      status, score, priority, tags, custom_fields, notes, assigned_to,
      email_consent, sms_consent, whatsapp_consent, consent_timestamp, gdpr_consent,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
    RETURNING *
  `;

  const result = await query(sql, [
    id, first_name, last_name, email, phone, company, job_title,
    source, source_id, campaign_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    status, score, priority, 
    JSON.stringify(tags), 
    JSON.stringify(custom_fields), 
    notes, assigned_to,
    email_consent, sms_consent, whatsapp_consent,
    (email_consent || sms_consent || whatsapp_consent) ? now : null,
    gdpr_consent ? JSON.stringify(gdpr_consent) : null,
    now, now
  ]);

  return parseLead(result.rows[0]);
}

/**
 * Get lead by ID
 */
export async function getLeadById(id) {
  const result = await query('SELECT * FROM leads WHERE id = $1', [id]);
  return result.rows[0] ? parseLead(result.rows[0]) : null;
}

/**
 * Get lead by email and source
 */
export async function getLeadByEmailAndSource(email, source) {
  const result = await query('SELECT * FROM leads WHERE email = $1 AND source = $2', [email, source]);
  return result.rows[0] ? parseLead(result.rows[0]) : null;
}

/**
 * Find lead by email (any source) - for matching Cal.com bookings to existing Meta leads
 */
export async function getLeadByEmail(email) {
  if (!email) return null;
  const result = await query('SELECT * FROM leads WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1', [email]);
  return result.rows[0] ? parseLead(result.rows[0]) : null;
}

/**
 * Find lead by source_id (Meta leadgen_id) - for deduplication
 */
export async function getLeadBySourceId(sourceId) {
  if (!sourceId) return null;
  const result = await query('SELECT * FROM leads WHERE source_id = $1 LIMIT 1', [sourceId]);
  return result.rows[0] ? parseLead(result.rows[0]) : null;
}

/**
 * Get all leads with filtering, sorting, and pagination
 */
export async function getLeads(options = {}) {
  const {
    page = 1,
    limit = 50,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    search = null,
    status = null,
    source = null,
    priority = null,
    dateFrom = null,
    dateTo = null
  } = options;

  let sql = 'SELECT * FROM leads WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as count FROM leads WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  // Search filter
  if (search) {
    const searchClause = ` AND (
      first_name ILIKE $${paramIndex} OR 
      last_name ILIKE $${paramIndex} OR 
      email ILIKE $${paramIndex} OR 
      phone ILIKE $${paramIndex} OR 
      company ILIKE $${paramIndex}
    )`;
    sql += searchClause;
    countSql += searchClause;
    params.push(`%${search}%`);
    paramIndex++;
  }

  // Status filter
  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    const placeholders = statuses.map((_, i) => `$${paramIndex + i}`).join(',');
    sql += ` AND status IN (${placeholders})`;
    countSql += ` AND status IN (${placeholders})`;
    params.push(...statuses);
    paramIndex += statuses.length;
  }

  // Source filter
  if (source) {
    const sources = Array.isArray(source) ? source : [source];
    const placeholders = sources.map((_, i) => `$${paramIndex + i}`).join(',');
    sql += ` AND source IN (${placeholders})`;
    countSql += ` AND source IN (${placeholders})`;
    params.push(...sources);
    paramIndex += sources.length;
  }

  // Priority filter
  if (priority) {
    sql += ` AND priority = $${paramIndex}`;
    countSql += ` AND priority = $${paramIndex}`;
    params.push(priority);
    paramIndex++;
  }

  // Date filters
  if (dateFrom) {
    sql += ` AND created_at >= $${paramIndex}`;
    countSql += ` AND created_at >= $${paramIndex}`;
    params.push(dateFrom);
    paramIndex++;
  }
  if (dateTo) {
    sql += ` AND created_at <= $${paramIndex}`;
    countSql += ` AND created_at <= $${paramIndex}`;
    params.push(dateTo);
    paramIndex++;
  }

  // Get total count
  const countResult = await query(countSql, params);
  const totalCount = parseInt(countResult.rows[0].count);

  // Add sorting
  const validSortColumns = ['created_at', 'updated_at', 'first_name', 'last_name', 'email', 'status', 'source', 'score', 'priority'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;

  // Add pagination
  const offset = (page - 1) * limit;
  sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);
  const leads = result.rows.map(parseLead);

  return {
    leads,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page * limit < totalCount
    }
  };
}

/**
 * Update a lead
 */
export async function updateLead(id, updates) {
  const existingLead = await getLeadById(id);
  if (!existingLead) {
    throw new Error('Lead not found');
  }

  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone', 'company', 'job_title',
    'status', 'score', 'priority', 'tags', 'custom_fields', 'notes', 'assigned_to',
    'email_consent', 'sms_consent', 'whatsapp_consent', 'gdpr_consent',
    'meeting_status'  // For tracking attended/no-show
  ];

  const setClauses = [];
  const params = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = $${paramIndex}`);
      
      if (key === 'tags' || key === 'custom_fields' || key === 'gdpr_consent') {
        params.push(JSON.stringify(value));
      } else {
        params.push(value);
      }
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return existingLead;
  }

  setClauses.push(`updated_at = $${paramIndex}`);
  params.push(new Date().toISOString());
  paramIndex++;

  if (updates.status === 'converted' && existingLead.status !== 'converted') {
    setClauses.push(`converted_at = $${paramIndex}`);
    params.push(new Date().toISOString());
    paramIndex++;
  }

  params.push(id);
  const sql = `UPDATE leads SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  
  const result = await query(sql, params);
  return parseLead(result.rows[0]);
}

/**
 * Delete a lead and all related records
 * Handles cascade delete for foreign key constraints
 */
export async function deleteLead(id) {
  try {
    // Check if lead exists first
    const existsResult = await query('SELECT id FROM leads WHERE id = $1', [id]);
    if (existsResult.rows.length === 0) {
      // Lead doesn't exist - might have been deleted already
      // Return true to avoid error on frontend (idempotent delete)
      return true;
    }

    // Delete in order to respect foreign key constraints
    // 1. Delete from message_queue (references lead_sequences)
    await query(`
      DELETE FROM message_queue 
      WHERE lead_id = $1 
      OR lead_sequence_id IN (SELECT id FROM lead_sequences WHERE lead_id = $1)
    `, [id]);
    
    // 2. Delete from sent_messages
    await query('DELETE FROM sent_messages WHERE lead_id = $1', [id]);
    
    // 3. Delete from lead_sequences
    await query('DELETE FROM lead_sequences WHERE lead_id = $1', [id]);
    
    // 4. Delete from lead_activities (if table exists)
    try {
      await query('DELETE FROM lead_activities WHERE lead_id = $1', [id]);
    } catch (e) {
      // Table might not exist yet, ignore
    }
    
    // 5. Delete from webhook_logs
    await query('DELETE FROM webhook_logs WHERE lead_id = $1', [id]);
    
    // 6. Delete from newsletter_subscribers
    await query('DELETE FROM newsletter_subscribers WHERE lead_id = $1', [id]);
    
    // 7. Finally delete the lead
    const result = await query('DELETE FROM leads WHERE id = $1', [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Delete lead error:', error);
    throw error;
  }
}

/**
 * Get lead statistics
 */
export async function getLeadStats() {
  const stats = {};

  // Total leads
  const totalResult = await query('SELECT COUNT(*) as count FROM leads');
  stats.total = parseInt(totalResult.rows[0].count);

  // By status
  const statusResult = await query('SELECT status, COUNT(*) as count FROM leads GROUP BY status');
  stats.byStatus = statusResult.rows.reduce((acc, row) => {
    acc[row.status] = parseInt(row.count);
    return acc;
  }, {});

  // By source
  const sourceResult = await query('SELECT source, COUNT(*) as count FROM leads GROUP BY source');
  stats.bySource = sourceResult.rows.reduce((acc, row) => {
    acc[row.source] = parseInt(row.count);
    return acc;
  }, {});

  // By priority
  const priorityResult = await query('SELECT priority, COUNT(*) as count FROM leads GROUP BY priority');
  stats.byPriority = priorityResult.rows.reduce((acc, row) => {
    acc[row.priority] = parseInt(row.count);
    return acc;
  }, {});

  // Recent leads (last 7 days)
  const recentResult = await query("SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL '7 days'");
  stats.recentCount = parseInt(recentResult.rows[0].count);

  // Today's leads
  const todayResult = await query("SELECT COUNT(*) as count FROM leads WHERE DATE(created_at) = CURRENT_DATE");
  stats.todayCount = parseInt(todayResult.rows[0].count);

  return stats;
}

/**
 * Get recent leads
 */
export async function getRecentLeads(limit = 10) {
  const result = await query('SELECT * FROM leads ORDER BY created_at DESC LIMIT $1', [limit]);
  return result.rows.map(parseLead);
}

/**
 * Parse lead from database row
 */
function parseLead(row) {
  if (!row) return null;
  
  return {
    ...row,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    custom_fields: typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : (row.custom_fields || {}),
    gdpr_consent: typeof row.gdpr_consent === 'string' ? JSON.parse(row.gdpr_consent) : row.gdpr_consent,
    email_consent: Boolean(row.email_consent),
    sms_consent: Boolean(row.sms_consent),
    whatsapp_consent: Boolean(row.whatsapp_consent)
  };
}

export default {
  LEAD_STATUSES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  createLead,
  getLeadById,
  getLeadByEmailAndSource,
  getLeadByEmail,
  getLeadBySourceId,
  getLeads,
  updateLead,
  deleteLead,
  getLeadStats,
  getRecentLeads
};
