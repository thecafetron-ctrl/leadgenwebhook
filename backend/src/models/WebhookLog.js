/**
 * WebhookLog Model - PostgreSQL Version
 * 
 * Tracks all incoming webhooks for debugging and analytics.
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection.js';

/**
 * Create a new webhook log entry
 */
export async function createWebhookLog(data) {
  const id = uuidv4();
  const {
    source,
    endpoint,
    method,
    headers = {},
    payload = {},
    query_params = {},
    ip_address = null,
    user_agent = null,
    signature_valid = null
  } = data;

  const sql = `
    INSERT INTO webhook_logs (
      id, source, endpoint, method, headers, payload, query_params,
      ip_address, user_agent, signature_valid, status, received_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `;

  const result = await query(sql, [
    id, source, endpoint, method,
    JSON.stringify(headers),
    JSON.stringify(payload),
    JSON.stringify(query_params),
    ip_address, user_agent, signature_valid,
    'received',
    new Date().toISOString()
  ]);

  return result.rows[0].id;
}

/**
 * Mark webhook as processed
 */
export async function markWebhookProcessed(id, leadId, responseCode, responseBody) {
  await query(`
    UPDATE webhook_logs 
    SET status = 'processed', 
        lead_id = $1, 
        response_code = $2, 
        response_body = $3,
        processed_at = $4
    WHERE id = $5
  `, [leadId, responseCode, responseBody, new Date().toISOString(), id]);
}

/**
 * Mark webhook as failed
 */
export async function markWebhookFailed(id, errorMessage, responseCode = 500) {
  await query(`
    UPDATE webhook_logs 
    SET status = 'failed', 
        error_message = $1, 
        response_code = $2,
        processed_at = $3
    WHERE id = $4
  `, [errorMessage, responseCode, new Date().toISOString(), id]);
}

/**
 * Get webhook log by ID
 */
export async function getWebhookLogById(id) {
  const result = await query('SELECT * FROM webhook_logs WHERE id = $1', [id]);
  return result.rows[0] ? parseLog(result.rows[0]) : null;
}

/**
 * Get webhook logs with filtering and pagination
 */
export async function getWebhookLogs(options = {}) {
  const {
    page = 1,
    limit = 50,
    source = null,
    status = null,
    dateFrom = null,
    dateTo = null
  } = options;

  let sql = 'SELECT * FROM webhook_logs WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as count FROM webhook_logs WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (source) {
    const sources = Array.isArray(source) ? source : [source];
    const placeholders = sources.map((_, i) => `$${paramIndex + i}`).join(',');
    sql += ` AND source IN (${placeholders})`;
    countSql += ` AND source IN (${placeholders})`;
    params.push(...sources);
    paramIndex += sources.length;
  }

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    const placeholders = statuses.map((_, i) => `$${paramIndex + i}`).join(',');
    sql += ` AND status IN (${placeholders})`;
    countSql += ` AND status IN (${placeholders})`;
    params.push(...statuses);
    paramIndex += statuses.length;
  }

  if (dateFrom) {
    sql += ` AND received_at >= $${paramIndex}`;
    countSql += ` AND received_at >= $${paramIndex}`;
    params.push(dateFrom);
    paramIndex++;
  }
  if (dateTo) {
    sql += ` AND received_at <= $${paramIndex}`;
    countSql += ` AND received_at <= $${paramIndex}`;
    params.push(dateTo);
    paramIndex++;
  }

  const countResult = await query(countSql, params);
  const totalCount = parseInt(countResult.rows[0].count);

  sql += ' ORDER BY received_at DESC';
  
  const offset = (page - 1) * limit;
  sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);
  const logs = result.rows.map(parseLog);

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
export async function getRecentWebhookLogs(limit = 20) {
  const result = await query('SELECT * FROM webhook_logs ORDER BY received_at DESC LIMIT $1', [limit]);
  return result.rows.map(parseLog);
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats() {
  const stats = {};

  const totalResult = await query('SELECT COUNT(*) as count FROM webhook_logs');
  stats.total = parseInt(totalResult.rows[0].count);

  const sourceResult = await query('SELECT source, COUNT(*) as count FROM webhook_logs GROUP BY source');
  stats.bySource = sourceResult.rows.reduce((acc, row) => {
    acc[row.source] = parseInt(row.count);
    return acc;
  }, {});

  const statusResult = await query('SELECT status, COUNT(*) as count FROM webhook_logs GROUP BY status');
  stats.byStatus = statusResult.rows.reduce((acc, row) => {
    acc[row.status] = parseInt(row.count);
    return acc;
  }, {});

  const todayResult = await query("SELECT COUNT(*) as count FROM webhook_logs WHERE DATE(received_at) = CURRENT_DATE");
  stats.todayCount = parseInt(todayResult.rows[0].count);

  return stats;
}

/**
 * Parse log from database row
 */
function parseLog(row) {
  if (!row) return null;
  
  return {
    ...row,
    headers: typeof row.headers === 'string' ? JSON.parse(row.headers) : (row.headers || {}),
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
    query_params: typeof row.query_params === 'string' ? JSON.parse(row.query_params) : (row.query_params || {})
  };
}

export default {
  createWebhookLog,
  markWebhookProcessed,
  markWebhookFailed,
  getWebhookLogById,
  getWebhookLogs,
  getRecentWebhookLogs,
  getWebhookStats
};
