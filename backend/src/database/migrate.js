/**
 * Database Migration Script
 * 
 * Run with: npm run db:migrate
 * 
 * This script initializes the database and creates all required tables.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */

import { initDatabase, closeDatabase, query } from './connection.js';

async function migrate() {
  console.log('🔄 Starting database migration...\n');
  
  try {
    await initDatabase();
    
    console.log('✅ Database initialized');
    console.log('✅ Tables created successfully\n');
    
    // Show table info
    const tables = query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    
    console.log('📋 Tables in database:');
    tables.forEach(t => console.log(`   • ${t.name}`));
    
    closeDatabase();
    console.log('\n✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
