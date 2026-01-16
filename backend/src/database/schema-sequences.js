/**
 * Email/WhatsApp Sequence Database Schema
 * 
 * CRITICAL: This handles automated follow-up sequences.
 * - Never sends the same message twice
 * - Tracks exact position in sequence for each lead
 * - Supports multiple channels (email, WhatsApp)
 * - Handles different sequence types (new_lead, booked, no_show)
 */

export const SEQUENCE_TABLES = `
-- Sequence Definitions (the overall workflow)
CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL, -- 'new_lead', 'meeting_booked', 'no_show', 'newsletter'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sequence Steps (individual messages in a sequence)
CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  delay_value INTEGER NOT NULL, -- numeric value
  delay_unit VARCHAR(20) NOT NULL, -- 'minutes', 'hours', 'days'
  channel VARCHAR(20) NOT NULL, -- 'email', 'whatsapp', 'both'
  
  -- Email content
  email_subject VARCHAR(255),
  email_body TEXT,
  email_template_id UUID,
  
  -- WhatsApp content
  whatsapp_message TEXT,
  whatsapp_template_id VARCHAR(100), -- Evolution API template ID
  
  -- Conditions
  skip_if_booked BOOLEAN DEFAULT false,
  skip_if_replied BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(sequence_id, step_order)
);

-- Lead Sequence Enrollment (tracks which sequence a lead is in)
CREATE TABLE IF NOT EXISTS lead_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  
  status VARCHAR(30) DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled', 'converted'
  current_step INTEGER DEFAULT 0,
  
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ, -- when they book a meeting
  
  -- For meeting sequences
  meeting_time TIMESTAMPTZ,
  
  -- Metadata
  enrolled_by VARCHAR(50) DEFAULT 'system', -- 'system', 'manual', 'webhook'
  cancel_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(lead_id, sequence_id)
);

-- Sent Messages Log (CRITICAL: prevents duplicate sends)
CREATE TABLE IF NOT EXISTS sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  lead_sequence_id UUID REFERENCES lead_sequences(id) ON DELETE SET NULL,
  sequence_step_id UUID REFERENCES sequence_steps(id) ON DELETE SET NULL,
  
  channel VARCHAR(20) NOT NULL, -- 'email', 'whatsapp'
  message_type VARCHAR(50) NOT NULL, -- 'sequence', 'newsletter', 'manual', 'transactional'
  
  -- Message content (stored for audit)
  subject VARCHAR(255),
  body TEXT,
  
  -- Delivery status
  status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'
  
  -- External IDs
  external_message_id VARCHAR(255), -- email provider message ID
  whatsapp_message_id VARCHAR(255), -- Evolution API message ID
  
  -- Timestamps
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Messages Queue (messages waiting to be sent)
CREATE TABLE IF NOT EXISTS message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  lead_sequence_id UUID NOT NULL REFERENCES lead_sequences(id) ON DELETE CASCADE,
  sequence_step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
  
  channel VARCHAR(20) NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'cancelled', 'failed'
  
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(lead_sequence_id, sequence_step_id, channel)
);

-- Email Templates (reusable templates)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE,
  category VARCHAR(50), -- 'value', 'booking', 'reminder', 'newsletter'
  
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  
  -- Variables: {{first_name}}, {{company}}, {{calendar_link}}, etc.
  variables JSONB DEFAULT '[]',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter Subscribers (leads who completed sequence or booked)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'unsubscribed', 'bounced'
  
  source VARCHAR(50), -- 'sequence_complete', 'meeting_booked', 'manual'
  
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp Config (Evolution API settings)
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name VARCHAR(100) NOT NULL,
  api_url VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON sequence_steps(sequence_id, step_order);
CREATE INDEX IF NOT EXISTS idx_lead_sequences_lead ON lead_sequences(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_sequences_status ON lead_sequences(status);
CREATE INDEX IF NOT EXISTS idx_sent_messages_lead ON sent_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_step ON sent_messages(sequence_step_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_scheduled ON message_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status);
`;

/**
 * Default Sequences to Insert
 */
export const DEFAULT_SEQUENCES = [
  {
    name: 'New Lead Nurture',
    slug: 'new_lead',
    description: 'Automated follow-up sequence for new leads from ads',
    trigger_type: 'new_lead'
  },
  {
    name: 'Meeting Booked',
    slug: 'meeting_booked',
    description: 'Confirmation and reminder sequence for booked meetings',
    trigger_type: 'meeting_booked'
  },
  {
    name: 'No Show Follow-up',
    slug: 'no_show',
    description: 'Rebooking sequence for leads who missed their meeting',
    trigger_type: 'no_show'
  },
  {
    name: 'Newsletter',
    slug: 'newsletter',
    description: 'Regular value content for converted leads',
    trigger_type: 'newsletter'
  }
];

/**
 * Default Steps for New Lead Sequence
 * Delay is calculated from ENROLLMENT time
 */
export const NEW_LEAD_SEQUENCE_STEPS = [
  { step_order: 1, name: 'Welcome + Calendar', delay_value: 0, delay_unit: 'minutes', channel: 'both' },
  { step_order: 2, name: 'Value Email #1', delay_value: 1, delay_unit: 'hours', channel: 'email' },
  { step_order: 3, name: 'Value Email #2', delay_value: 4, delay_unit: 'hours', channel: 'email' },
  { step_order: 4, name: 'Value Email #3', delay_value: 6, delay_unit: 'hours', channel: 'email' },
  { step_order: 5, name: 'Value Email #4', delay_value: 12, delay_unit: 'hours', channel: 'email' },
  { step_order: 6, name: 'Schedule Meeting CTA', delay_value: 24, delay_unit: 'hours', channel: 'email' },
  { step_order: 7, name: 'Value Email #5', delay_value: 36, delay_unit: 'hours', channel: 'email' },
  { step_order: 8, name: 'Value Email #6', delay_value: 48, delay_unit: 'hours', channel: 'email' },
  { step_order: 9, name: 'Value Email #7', delay_value: 3, delay_unit: 'days', channel: 'email' },
  { step_order: 10, name: 'Value Email #8', delay_value: 4, delay_unit: 'days', channel: 'email' },
  { step_order: 11, name: 'Value Email #9', delay_value: 5, delay_unit: 'days', channel: 'email' },
  { step_order: 12, name: 'Value Email #10', delay_value: 6, delay_unit: 'days', channel: 'email' },
  { step_order: 13, name: 'Value Email #11', delay_value: 7, delay_unit: 'days', channel: 'email' },
  { step_order: 14, name: 'Value Email #12', delay_value: 8, delay_unit: 'days', channel: 'email' },
  { step_order: 15, name: 'Value Email #13', delay_value: 9, delay_unit: 'days', channel: 'email' },
  { step_order: 16, name: 'Value Email #14', delay_value: 10, delay_unit: 'days', channel: 'email' },
  { step_order: 17, name: 'Value Email #15', delay_value: 11, delay_unit: 'days', channel: 'email' },
  { step_order: 18, name: 'Value Email #16', delay_value: 12, delay_unit: 'days', channel: 'email' },
  { step_order: 19, name: 'Value Email #17', delay_value: 13, delay_unit: 'days', channel: 'email' },
  { step_order: 20, name: 'Value Email #18', delay_value: 14, delay_unit: 'days', channel: 'email' },
  { step_order: 21, name: 'Value Email #19', delay_value: 15, delay_unit: 'days', channel: 'email' },
  { step_order: 22, name: 'Value Email #20', delay_value: 16, delay_unit: 'days', channel: 'email' },
  { step_order: 23, name: 'Value Email #21', delay_value: 17, delay_unit: 'days', channel: 'email' },
  { step_order: 24, name: 'Final Value Email', delay_value: 18, delay_unit: 'days', channel: 'email' }
];

/**
 * Meeting Booked Sequence Steps
 * Delay is calculated from MEETING time (negative = before)
 */
export const MEETING_BOOKED_STEPS = [
  { step_order: 1, name: 'Confirmation', delay_value: 0, delay_unit: 'minutes', channel: 'both' },
  { step_order: 2, name: '24hr Reminder', delay_value: -24, delay_unit: 'hours', channel: 'both' },
  { step_order: 3, name: '6hr Reminder', delay_value: -6, delay_unit: 'hours', channel: 'both' },
  { step_order: 4, name: '1hr Reminder', delay_value: -1, delay_unit: 'hours', channel: 'both' }
];

/**
 * No Show Sequence (same as new lead but starts with rebooking)
 */
export const NO_SHOW_STEPS = [
  { step_order: 1, name: 'Rebooking Request', delay_value: 0, delay_unit: 'minutes', channel: 'both' },
  { step_order: 2, name: 'Value Email #1', delay_value: 1, delay_unit: 'hours', channel: 'email' },
  { step_order: 3, name: 'Value Email #2', delay_value: 4, delay_unit: 'hours', channel: 'email' },
  // ... continues same as new lead
];

export default { SEQUENCE_TABLES, DEFAULT_SEQUENCES, NEW_LEAD_SEQUENCE_STEPS, MEETING_BOOKED_STEPS, NO_SHOW_STEPS };
