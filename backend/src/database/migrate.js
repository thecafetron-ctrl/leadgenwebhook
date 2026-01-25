/**
 * Database Migration for PostgreSQL (Neon)
 * 
 * Creates all tables including sequence automation and chat intent scoring.
 */

import { initDatabase, query, closeDatabase } from './connection.js';
import { SEQUENCE_TABLES, DEFAULT_SEQUENCES, NEW_LEAD_SEQUENCE_STEPS, MEETING_BOOKED_STEPS, NO_SHOW_STEPS, EBOOK_NURTURE_STEPS } from './schema-sequences.js';
import { CHAT_INTENT_TABLES } from './schema-chat-intent.js';

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
  lead_type VARCHAR(50) DEFAULT NULL,
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

const SYSTEM_SETTINGS_TABLE = `
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const LEAD_ACTIVITIES_TABLE = `
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB,
  performed_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);
`;

export async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    
    await initDatabase();
    
    // Create core tables
    await query(LEADS_TABLE);
    console.log('✅ Leads table ready');
    
    await query(WEBHOOK_LOGS_TABLE);
    console.log('✅ Webhook logs table ready');
    
    // Create system settings table (for email rotation counter, etc.)
    await query(SYSTEM_SETTINGS_TABLE);
    console.log('✅ System settings table ready');
    
    // Create lead activities table
    await query(LEAD_ACTIVITIES_TABLE);
    console.log('✅ Lead activities table ready');
    
    // Create indexes
    await query(INDEXES);
    console.log('✅ Core indexes created');
    
    // Add meeting_status column if it doesn't exist
    try {
      await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS meeting_status VARCHAR(50)`);
      console.log('✅ Meeting status column ready');
    } catch (e) {
      // Column might already exist
    }
    
    // Add lead_type column if it doesn't exist (consultation, ebook, etc.)
    try {
      await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_type VARCHAR(50)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type)`);
      console.log('✅ Lead type column ready');
    } catch (e) {
      // Column might already exist
    }
    
    // Create sequence automation tables
    await query(SEQUENCE_TABLES);
    console.log('✅ Sequence tables ready');
    
    // Create chat intent scoring tables
    await query(CHAT_INTENT_TABLES);
    console.log('✅ Chat intent tables ready');
    
    // Insert default sequences if they don't exist
    await seedDefaultSequences();
    console.log('✅ Default sequences ready');
    
    console.log('✅ Database migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Seed default sequences and steps
 */
async function seedDefaultSequences() {
  for (const seq of DEFAULT_SEQUENCES) {
    // Check if sequence exists
    const existing = await query('SELECT id FROM sequences WHERE slug = $1', [seq.slug]);
    
    if (existing.rows.length === 0) {
      // Insert sequence
      const result = await query(
        `INSERT INTO sequences (name, slug, description, trigger_type) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [seq.name, seq.slug, seq.description, seq.trigger_type]
      );
      
      const sequenceId = result.rows[0].id;
      console.log(`  → Created sequence: ${seq.name}`);
      
      // Insert steps based on sequence type
      let steps = [];
      if (seq.slug === 'new_lead') steps = NEW_LEAD_SEQUENCE_STEPS;
      else if (seq.slug === 'meeting_booked') steps = MEETING_BOOKED_STEPS;
      else if (seq.slug === 'no_show') steps = NO_SHOW_STEPS;
      else if (seq.slug === 'ebook_nurture') steps = EBOOK_NURTURE_STEPS;
      
      for (const step of steps) {
        await query(
          `INSERT INTO sequence_steps (sequence_id, step_order, name, delay_value, delay_unit, channel)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [sequenceId, step.step_order, step.name, step.delay_value, step.delay_unit, step.channel]
        );
      }
      
      if (steps.length > 0) {
        console.log(`    → Added ${steps.length} steps`);
      }
    }
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
