/**
 * Lead Model
 * 
 * Handles all database operations for leads.
 * Prepared for future integrations with email and WhatsApp automations.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run, transaction, getDatabase } from '../database/connection.js';

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
export const LEAD_SOURCES = ['manual', 'meta_forms', 'calcom', 'api', 'import', 'website', 'referral'];

/**
 * Create a new lead
 */
export function createLead(leadData) {
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  run(sql, [
    id, first_name, last_name, email, phone, company, job_title,
    source, source_id, campaign_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    status, score, priority, 
    JSON.stringify(tags), 
    JSON.stringify(custom_fields), 
    notes, assigned_to,
    email_consent ? 1 : 0, 
    sms_consent ? 1 : 0, 
    whatsapp_consent ? 1 : 0,
    (email_consent || sms_consent || whatsapp_consent) ? now : null,
    gdpr_consent ? JSON.stringify(gdpr_consent) : null,
    now, now
  ]);

  // Log activity
  createLeadActivity(id, 'created', `Lead created from ${source}`, { source });

  return getLeadById(id);
}

/**
 * Get lead by ID
 */
export function getLeadById(id) {
  const lead = queryOne('SELECT * FROM leads WHERE id = ?', [id]);
  return lead ? parseLead(lead) : null;
}

/**
 * Get lead by email and source
 */
export function getLeadByEmailAndSource(email, source) {
  const lead = queryOne('SELECT * FROM leads WHERE email = ? AND source = ?', [email, source]);
  return lead ? parseLead(lead) : null;
}

/**
 * Get all leads with filtering, sorting, and pagination
 */
export function getLeads(options = {}) {
  const {
    page = 1,
    limit = 50,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    search = null,
    status = null,
    source = null,
    priority = null,
    tags = null,
    dateFrom = null,
    dateTo = null,
    assigned_to = null
  } = options;

  let sql = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  // Search filter (name, email, phone, company)
  if (search) {
    sql += ` AND (
      first_name LIKE ? OR 
      last_name LIKE ? OR 
      email LIKE ? OR 
      phone LIKE ? OR 
      company LIKE ?
    )`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Status filter
  if (status) {
    if (Array.isArray(status)) {
      sql += ` AND status IN (${status.map(() => '?').join(',')})`;
      params.push(...status);
    } else {
      sql += ' AND status = ?';
      params.push(status);
    }
  }

  // Source filter
  if (source) {
    if (Array.isArray(source)) {
      sql += ` AND source IN (${source.map(() => '?').join(',')})`;
      params.push(...source);
    } else {
      sql += ' AND source = ?';
      params.push(source);
    }
  }

  // Priority filter
  if (priority) {
    sql += ' AND priority = ?';
    params.push(priority);
  }

  // Tags filter
  if (tags && tags.length > 0) {
    // SQLite JSON contains check
    tags.forEach(tag => {
      sql += ` AND tags LIKE ?`;
      params.push(`%"${tag}"%`);
    });
  }

  // Date range filter
  if (dateFrom) {
    sql += ' AND created_at >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ' AND created_at <= ?';
    params.push(dateTo);
  }

  // Assigned to filter
  if (assigned_to) {
    sql += ' AND assigned_to = ?';
    params.push(assigned_to);
  }

  // Get total count
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const { count: totalCount } = queryOne(countSql, params);

  // Add sorting
  const validSortColumns = ['created_at', 'updated_at', 'first_name', 'last_name', 'email', 'status', 'source', 'score', 'priority'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;

  // Add pagination
  const offset = (page - 1) * limit;
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const leads = query(sql, params).map(parseLead);

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
export function updateLead(id, updates) {
  const existingLead = getLeadById(id);
  if (!existingLead) {
    throw new Error('Lead not found');
  }

  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone', 'company', 'job_title',
    'status', 'score', 'priority', 'tags', 'custom_fields', 'notes', 'assigned_to',
    'email_consent', 'sms_consent', 'whatsapp_consent', 'gdpr_consent'
  ];

  const setClauses = [];
  const params = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`);
      
      // Handle special fields
      if (key === 'tags' || key === 'custom_fields' || key === 'gdpr_consent') {
        params.push(JSON.stringify(value));
      } else if (key.endsWith('_consent')) {
        params.push(value ? 1 : 0);
      } else {
        params.push(value);
      }
    }
  }

  if (setClauses.length === 0) {
    return existingLead;
  }

  // Always update updated_at
  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString());

  // Handle status change tracking
  if (updates.status && updates.status !== existingLead.status) {
    if (updates.status === 'converted') {
      setClauses.push('converted_at = ?');
      params.push(new Date().toISOString());
    }
    createLeadActivity(id, 'status_change', `Status changed from ${existingLead.status} to ${updates.status}`, {
      old_status: existingLead.status,
      new_status: updates.status
    });
  }

  params.push(id);
  const sql = `UPDATE leads SET ${setClauses.join(', ')} WHERE id = ?`;
  run(sql, params);

  return getLeadById(id);
}

/**
 * Delete a lead
 */
export function deleteLead(id) {
  const result = run('DELETE FROM leads WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * Bulk update leads
 */
export function bulkUpdateLeads(ids, updates) {
  const db = getDatabase();
  const updateFn = db.transaction(() => {
    return ids.map(id => updateLead(id, updates));
  });
  return updateFn();
}

/**
 * Bulk delete leads
 */
export function bulkDeleteLeads(ids) {
  const placeholders = ids.map(() => '?').join(',');
  const result = run(`DELETE FROM leads WHERE id IN (${placeholders})`, ids);
  return result.changes;
}

/**
 * Get lead statistics
 */
export function getLeadStats() {
  const stats = {};

  // Total leads
  stats.total = queryOne('SELECT COUNT(*) as count FROM leads').count;

  // By status
  stats.byStatus = query(`
    SELECT status, COUNT(*) as count 
    FROM leads 
    GROUP BY status
  `).reduce((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {});

  // By source
  stats.bySource = query(`
    SELECT source, COUNT(*) as count 
    FROM leads 
    GROUP BY source
  `).reduce((acc, row) => {
    acc[row.source] = row.count;
    return acc;
  }, {});

  // By priority
  stats.byPriority = query(`
    SELECT priority, COUNT(*) as count 
    FROM leads 
    GROUP BY priority
  `).reduce((acc, row) => {
    acc[row.priority] = row.count;
    return acc;
  }, {});

  // Recent leads (last 7 days)
  stats.recentCount = queryOne(`
    SELECT COUNT(*) as count 
    FROM leads 
    WHERE created_at >= datetime('now', '-7 days')
  `).count;

  // Today's leads
  stats.todayCount = queryOne(`
    SELECT COUNT(*) as count 
    FROM leads 
    WHERE date(created_at) = date('now')
  `).count;

  return stats;
}

/**
 * Create lead activity log
 */
export function createLeadActivity(leadId, type, description, metadata = {}) {
  const id = uuidv4();
  run(`
    INSERT INTO lead_activities (id, lead_id, type, description, metadata, performed_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, leadId, type, description, JSON.stringify(metadata), 'system']);
  return id;
}

/**
 * Get activities for a lead
 */
export function getLeadActivities(leadId, limit = 50) {
  return query(`
    SELECT * FROM lead_activities 
    WHERE lead_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `, [leadId, limit]).map(activity => ({
    ...activity,
    metadata: activity.metadata ? JSON.parse(activity.metadata) : {}
  }));
}

/**
 * Parse lead from database row (handle JSON fields)
 */
function parseLead(row) {
  if (!row) return null;
  
  return {
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : [],
    custom_fields: row.custom_fields ? JSON.parse(row.custom_fields) : {},
    gdpr_consent: row.gdpr_consent ? JSON.parse(row.gdpr_consent) : null,
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
  getLeads,
  updateLead,
  deleteLead,
  bulkUpdateLeads,
  bulkDeleteLeads,
  getLeadStats,
  createLeadActivity,
  getLeadActivities
};
