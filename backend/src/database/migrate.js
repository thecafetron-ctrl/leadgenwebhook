/**
 * Database Migration for PostgreSQL (Neon)
 * 
 * Creates leads and webhook_logs tables.
 */

import { initDatabase, query, closeDatabase } from './connection.js';

const LEADS_TABLE = `
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  job_title VARCHAR(255),
  source VARCHAR(50) DEFAULT 'api',
  source_id VARCHAR(255),
  campaign_id VARCHAR(255),
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  status VARCHAR(50) DEFAULT 'new',
  score INTEGER DEFAULT 0,
  priority VARCHAR(20) DEFAULT 'medium',
  tags JSONB DEFAULT '[]',
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  assigned_to VARCHAR(255),
  email_consent BOOLEAN DEFAULT false,
  sms_consent BOOLEAN DEFAULT false,
  whatsapp_consent BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  gdpr_consent JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ
);
`;

const WEBHOOK_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  headers JSONB,
  payload JSONB,
  query_params JSONB,
  status VARCHAR(20) DEFAULT 'received',
  response_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  lead_id UUID REFERENCES leads(id),
  ip_address VARCHAR(45),
  user_agent TEXT,
  signature_valid BOOLEAN,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
`;

const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at ON webhook_logs(received_at DESC);
`;

export async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    
    await initDatabase();
    
    // Create tables
    await query(LEADS_TABLE);
    console.log('✅ Leads table ready');
    
    await query(WEBHOOK_LOGS_TABLE);
    console.log('✅ Webhook logs table ready');
    
    // Create indexes
    await query(INDEXES);
    console.log('✅ Indexes created');
    
    console.log('✅ Database migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1].includes('migrate.js')) {
  migrate()
    .then(() => closeDatabase())
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default migrate;
