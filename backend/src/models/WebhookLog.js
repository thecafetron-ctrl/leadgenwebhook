/**
 * Webhook Log Model
 * 
 * Handles logging and retrieval of webhook events.
 * Essential for debugging webhook integrations.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../database/connection.js';

/**
 * Valid webhook log statuses
 */
export const WEBHOOK_STATUSES = ['received', 'processing', 'processed', 'failed'];

/**
 * Create a new webhook log entry
 */
export function createWebhookLog(logData) {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const {
    source,
    endpoint,
    method = 'POST',
    headers = {},
    payload = {},
    query_params = {},
    ip_address = null,
    user_agent = null,
    signature_valid = null
  } = logData;

  const sql = `
    INSERT INTO webhook_logs (
      id, source, endpoint, method, headers, payload, query_params,
      status, ip_address, user_agent, signature_valid, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  run(sql, [
    id, source, endpoint, method,
    JSON.stringify(headers),
    JSON.stringify(payload),
    JSON.stringify(query_params),
    'received',
    ip_address,
    user_agent,
    signature_valid === null ? null : (signature_valid ? 1 : 0),
    now
  ]);

  return id;
}

/**
 * Update webhook log status
 */
export function updateWebhookLog(id, updates) {
  const setClauses = [];
  const params = [];

  const allowedFields = ['status', 'response_code', 'response_body', 'error_message', 'lead_id', 'processed_at'];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClauses.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (setClauses.length === 0) {
    return getWebhookLogById(id);
  }

  params.push(id);
  const sql = `UPDATE webhook_logs SET ${setClauses.join(', ')} WHERE id = ?`;
  run(sql, params);

  return getWebhookLogById(id);
}

/**
 * Mark webhook as processed
 */
export function markWebhookProcessed(id, leadId = null, responseCode = 200, responseBody = null) {
  return updateWebhookLog(id, {
    status: 'processed',
    lead_id: leadId,
    response_code: responseCode,
    response_body: responseBody,
    processed_at: new Date().toISOString()
  });
}

/**
 * Mark webhook as failed
 */
export function markWebhookFailed(id, errorMessage, responseCode = 500) {
  return updateWebhookLog(id, {
    status: 'failed',
    error_message: errorMessage,
    response_code: responseCode,
    processed_at: new Date().toISOString()
  });
}

/**
 * Get webhook log by ID
 */
export function getWebhookLogById(id) {
  const log = queryOne('SELECT * FROM webhook_logs WHERE id = ?', [id]);
  return log ? parseWebhookLog(log) : null;
}

/**
 * Get webhook logs with filtering and pagination
 */
export function getWebhookLogs(options = {}) {
  const {
    page = 1,
    limit = 50,
    sortBy = 'received_at',
    sortOrder = 'DESC',
    source = null,
    status = null,
    dateFrom = null,
    dateTo = null,
    lead_id = null
  } = options;

  let sql = 'SELECT * FROM webhook_logs WHERE 1=1';
  const params = [];

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

  // Date range filter
  if (dateFrom) {
    sql += ' AND received_at >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ' AND received_at <= ?';
    params.push(dateTo);
  }

  // Lead ID filter
  if (lead_id) {
    sql += ' AND lead_id = ?';
    params.push(lead_id);
  }

  // Get total count
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const { count: totalCount } = queryOne(countSql, params);

  // Add sorting
  const validSortColumns = ['received_at', 'processed_at', 'source', 'status', 'endpoint'];
  const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'received_at';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;

  // Add pagination
  const offset = (page - 1) * limit;
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const logs = query(sql, params).map(parseWebhookLog);

  return {
    logs,
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
 * Get recent webhook logs
 */
export function getRecentWebhookLogs(limit = 20) {
  return query(`
    SELECT * FROM webhook_logs 
    ORDER BY received_at DESC 
    LIMIT ?
  `, [limit]).map(parseWebhookLog);
}

/**
 * Get webhook statistics
 */
export function getWebhookStats() {
  const stats = {};

  // Total webhooks
  stats.total = queryOne('SELECT COUNT(*) as count FROM webhook_logs').count;

  // By status
  stats.byStatus = query(`
    SELECT status, COUNT(*) as count 
    FROM webhook_logs 
    GROUP BY status
  `).reduce((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {});

  // By source
  stats.bySource = query(`
    SELECT source, COUNT(*) as count 
    FROM webhook_logs 
    GROUP BY source
  `).reduce((acc, row) => {
    acc[row.source] = row.count;
    return acc;
  }, {});

  // Recent webhooks (last 24 hours)
  stats.last24Hours = queryOne(`
    SELECT COUNT(*) as count 
    FROM webhook_logs 
    WHERE received_at >= datetime('now', '-24 hours')
  `).count;

  // Today's webhooks
  stats.today = queryOne(`
    SELECT COUNT(*) as count 
    FROM webhook_logs 
    WHERE date(received_at) = date('now')
  `).count;

  // Failed webhooks (last 24 hours)
  stats.failedLast24Hours = queryOne(`
    SELECT COUNT(*) as count 
    FROM webhook_logs 
    WHERE received_at >= datetime('now', '-24 hours') 
    AND status = 'failed'
  `).count;

  return stats;
}

/**
 * Delete old webhook logs (cleanup utility)
 */
export function deleteOldWebhookLogs(daysOld = 30) {
  const result = run(`
    DELETE FROM webhook_logs 
    WHERE received_at < datetime('now', '-${daysOld} days')
  `);
  return result.changes;
}

/**
 * Parse webhook log from database row
 */
function parseWebhookLog(row) {
  if (!row) return null;

  return {
    ...row,
    headers: row.headers ? JSON.parse(row.headers) : {},
    payload: row.payload ? JSON.parse(row.payload) : {},
    query_params: row.query_params ? JSON.parse(row.query_params) : {},
    signature_valid: row.signature_valid === null ? null : Boolean(row.signature_valid)
  };
}

export default {
  WEBHOOK_STATUSES,
  createWebhookLog,
  updateWebhookLog,
  markWebhookProcessed,
  markWebhookFailed,
  getWebhookLogById,
  getWebhookLogs,
  getRecentWebhookLogs,
  getWebhookStats,
  deleteOldWebhookLogs
};
