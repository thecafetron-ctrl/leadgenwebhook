/**
 * PostgreSQL Database Connection (Neon)
 * 
 * Uses pg (node-postgres) to connect to Neon PostgreSQL.
 * Data persists across deploys - no more data loss!
 */

import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * Initialize database connection pool
 */
export async function initDatabase() {
  if (pool) {
    console.log('✅ Database pool already initialized');
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  // Test connection
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL');
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }

  return pool;
}

/**
 * Get database pool
 */
export function getDb() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return pool;
}

/**
 * Execute a query
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100) {
      console.log('Slow query:', { text, duration, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('Query error:', { text, error: error.message });
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection closed');
  }
}

export default { initDatabase, getDb, query, closeDatabase };
