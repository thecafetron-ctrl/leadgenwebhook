/**
 * Database Connection Module
 * 
 * Uses sql.js for a pure JavaScript SQLite implementation.
 * The schema is designed to be portable to PostgreSQL for production.
 * 
 * To migrate to PostgreSQL:
 * 1. Install 'pg' package
 * 2. Set DATABASE_URL environment variable
 * 3. Update this file to use pg instead of sql.js
 * 4. Update schema.js SQL syntax for PostgreSQL (mainly TEXT to VARCHAR, datetime functions)
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTablesSQL } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file location
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/leads.db');

let db = null;
let SQL = null;

/**
 * Initialize database connection and create tables if needed
 */
export async function initDatabase() {
  if (db) return db;

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  try {
    // Initialize SQL.js
    SQL = await initSqlJs();
    
    // Try to load existing database, or create new one
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
      console.log('✅ Loaded existing database');
    } else {
      db = new SQL.Database();
      console.log('✅ Created new database');
    }
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    // Create tables
    db.run(createTablesSQL);
    
    // Save database to file
    saveDatabase();
    
    console.log('✅ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Save database to file
 */
export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

/**
 * Get database instance
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('Database connection closed');
  }
}

/**
 * Run a query and return all results
 */
export function query(sql, params = []) {
  const database = getDatabase();
  try {
    const stmt = database.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    
    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row);
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * Run a query and return first result
 */
export function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results[0] || null;
}

/**
 * Run an insert/update/delete and return result info
 */
export function run(sql, params = []) {
  const database = getDatabase();
  try {
    database.run(sql, params);
    const changes = database.getRowsModified();
    saveDatabase(); // Auto-save after modifications
    return { changes };
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * Run multiple statements in a transaction
 */
export function transaction(callback) {
  const database = getDatabase();
  try {
    database.run('BEGIN TRANSACTION');
    const result = callback();
    database.run('COMMIT');
    saveDatabase();
    return result;
  } catch (error) {
    database.run('ROLLBACK');
    throw error;
  }
}

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  saveDatabase,
  query,
  queryOne,
  run,
  transaction
};
