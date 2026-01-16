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

  let connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Remove channel_binding parameter (causes issues with Railway/Neon)
  connectionString = connectionString.replace(/[&?]channel_binding=[^&]*/g, '');
  
  // Clean up any double && or trailing &
  connectionString = connectionString.replace(/&&/g, '&').replace(/\?&/g, '?').replace(/&$/g, '');

  console.log('🔄 Connecting to database...');

  // Parse the connection string manually to avoid pg picking up other env vars
  const url = new URL(connectionString);
  
  pool = new Pool({
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1), // Remove leading /
    user: url.username,
    password: url.password,
    ssl: {
      rejectUnauthorized: false
    },
    max: 5,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 30000
  });
  
  console.log('   Host:', url.hostname);
  console.log('   Database:', url.pathname.slice(1));

  // Test connection with retries
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const client = await pool.connect();
      console.log('✅ Connected to Neon PostgreSQL');
      client.release();
      return pool;
    } catch (error) {
      lastError = error;
      console.error(`❌ Connection attempt ${attempt}/3 failed:`, error.message);
      if (attempt < 3) {
        console.log('   Retrying in 3 seconds...');
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  throw lastError;
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
