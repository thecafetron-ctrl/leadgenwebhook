/**
 * Email/WhatsApp Sequence Database Schema
 * 
 * STRUCTURE Email Sequences:
 * 
 * NEW LEAD: Form submission → 18 days of nurture
 * MEETING BOOKED: Confirmation + reminders
 * NO SHOW: Rebooking + nurture restart
 */

export const SEQUENCE_TABLES = `
-- Sequence Definitions
CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sequence Steps
CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  delay_value INTEGER NOT NULL,
  delay_unit VARCHAR(20) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  email_subject VARCHAR(255),
  email_body TEXT,
  email_template_id UUID,
  whatsapp_message TEXT,
  whatsapp_template_id VARCHAR(100),
  skip_if_booked BOOLEAN DEFAULT false,
  skip_if_replied BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, step_order)
);

-- Lead Sequence Enrollment
CREATE TABLE IF NOT EXISTS lead_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'active',
  current_step INTEGER DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  meeting_time TIMESTAMPTZ,
  enrolled_by VARCHAR(50) DEFAULT 'system',
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, sequence_id)
);

-- Sent Messages Log
CREATE TABLE IF NOT EXISTS sent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  lead_sequence_id UUID REFERENCES lead_sequences(id) ON DELETE SET NULL,
  sequence_step_id UUID REFERENCES sequence_steps(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  subject VARCHAR(255),
  body TEXT,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(30) DEFAULT 'pending',
  external_message_id VARCHAR(255),
  whatsapp_message_id VARCHAR(255),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Queue
CREATE TABLE IF NOT EXISTS message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  lead_sequence_id UUID NOT NULL REFERENCES lead_sequences(id) ON DELETE CASCADE,
  sequence_step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_sequence_id, sequence_step_id, channel)
);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE,
  category VARCHAR(50),
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter Subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  source VARCHAR(50),
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp Config
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name VARCHAR(100) NOT NULL,
  api_url VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON sequence_steps(sequence_id, step_order);
CREATE INDEX IF NOT EXISTS idx_lead_sequences_lead ON lead_sequences(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_sequences_status ON lead_sequences(status);
CREATE INDEX IF NOT EXISTS idx_sent_messages_lead ON sent_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_step ON sent_messages(sequence_step_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_scheduled ON message_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status);
`;

/**
 * Default Sequences
 */
export const DEFAULT_SEQUENCES = [
  {
    name: 'New Lead Nurture',
    slug: 'new_lead',
    description: 'Form submission → 18 days of value emails until they book',
    trigger_type: 'new_lead'
  },
  {
    name: 'Meeting Booked',
    slug: 'meeting_booked',
    description: 'Confirmation + reminders before meeting',
    trigger_type: 'meeting_booked'
  },
  {
    name: 'No Show',
    slug: 'no_show',
    description: 'Rebooking request + nurture restart',
    trigger_type: 'no_show'
  },
  {
    name: 'Newsletter',
    slug: 'newsletter',
    description: 'Regular value content for converted leads',
    trigger_type: 'newsletter'
  },
  {
    name: 'Ebook Nurture',
    slug: 'ebook_nurture',
    description: 'Ebook delivery + 24 nurture emails over 100 days',
    trigger_type: 'ebook_signup'
  }
];

/**
 * NEW LEAD SEQUENCE
 * Fills form → Calendar link + WhatsApp → Value emails until day 18
 */
export const NEW_LEAD_SEQUENCE_STEPS = [
  // Immediate
  { step_order: 1, name: 'Welcome + Calendar Link', delay_value: 0, delay_unit: 'minutes', channel: 'both' },
  
  // First day
  { step_order: 2, name: 'Value Email #1', delay_value: 1, delay_unit: 'hours', channel: 'email' },
  { step_order: 3, name: 'Value Email #2', delay_value: 4, delay_unit: 'hours', channel: 'email' },
  { step_order: 4, name: 'Value Email #3', delay_value: 6, delay_unit: 'hours', channel: 'email' },
  { step_order: 5, name: 'Value Email #4', delay_value: 12, delay_unit: 'hours', channel: 'email' },
  
  // Day 2
  { step_order: 6, name: 'Schedule Meeting CTA', delay_value: 24, delay_unit: 'hours', channel: 'email' },
  { step_order: 7, name: 'Value Email #5', delay_value: 36, delay_unit: 'hours', channel: 'email' },
  { step_order: 8, name: 'Value Email #6', delay_value: 48, delay_unit: 'hours', channel: 'email' },
  
  // Days 3-7
  { step_order: 9, name: 'Value Email #7', delay_value: 3, delay_unit: 'days', channel: 'email' },
  { step_order: 10, name: 'Value Email #8', delay_value: 4, delay_unit: 'days', channel: 'email' },
  { step_order: 11, name: 'Value Email #9', delay_value: 5, delay_unit: 'days', channel: 'email' },
  { step_order: 12, name: 'Value Email #10', delay_value: 6, delay_unit: 'days', channel: 'email' },
  { step_order: 13, name: 'Value Email #11', delay_value: 7, delay_unit: 'days', channel: 'email' },
  
  // Days 8-14
  { step_order: 14, name: 'Value Email #12', delay_value: 8, delay_unit: 'days', channel: 'email' },
  { step_order: 15, name: 'Value Email #13', delay_value: 9, delay_unit: 'days', channel: 'email' },
  { step_order: 16, name: 'Value Email #14', delay_value: 10, delay_unit: 'days', channel: 'email' },
  { step_order: 17, name: 'Value Email #15', delay_value: 11, delay_unit: 'days', channel: 'email' },
  { step_order: 18, name: 'Value Email #16', delay_value: 12, delay_unit: 'days', channel: 'email' },
  { step_order: 19, name: 'Value Email #17', delay_value: 13, delay_unit: 'days', channel: 'email' },
  { step_order: 20, name: 'Value Email #18', delay_value: 14, delay_unit: 'days', channel: 'email' },
  
  // Days 15-18 (Closing)
  { step_order: 21, name: 'Closing Email #1', delay_value: 15, delay_unit: 'days', channel: 'email' },
  { step_order: 22, name: 'Closing Email #2', delay_value: 16, delay_unit: 'days', channel: 'email' },
  { step_order: 23, name: 'Closing Email #3', delay_value: 17, delay_unit: 'days', channel: 'email' },
  { step_order: 24, name: 'Final Message', delay_value: 18, delay_unit: 'days', channel: 'email' }
];

/**
 * MEETING BOOKED SEQUENCE
 * Confirmation + Reminders (24h, 6h, 1h before)
 */
export const MEETING_BOOKED_STEPS = [
  { step_order: 1, name: 'Confirmation', delay_value: 0, delay_unit: 'minutes', channel: 'both' },
  { step_order: 2, name: '24hr Reminder', delay_value: -24, delay_unit: 'hours', channel: 'both' },
  { step_order: 3, name: '6hr Reminder', delay_value: -6, delay_unit: 'hours', channel: 'both' },
  { step_order: 4, name: '1hr Reminder', delay_value: -1, delay_unit: 'hours', channel: 'both' }
];

/**
 * NO SHOW SEQUENCE
 * Rebooking + Same nurture as new lead
 */
export const NO_SHOW_STEPS = [
  // Immediate rebooking
  { step_order: 1, name: 'Rebooking Request', delay_value: 0, delay_unit: 'minutes', channel: 'both' },
  
  // Same nurture as new lead
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
  { step_order: 21, name: 'Closing Email #1', delay_value: 15, delay_unit: 'days', channel: 'email' },
  { step_order: 22, name: 'Closing Email #2', delay_value: 16, delay_unit: 'days', channel: 'email' },
  { step_order: 23, name: 'Closing Email #3', delay_value: 17, delay_unit: 'days', channel: 'email' },
  { step_order: 24, name: 'Final Message', delay_value: 18, delay_unit: 'days', channel: 'email' }
];

/**
 * EBOOK NURTURE SEQUENCE
 * Ebook delivery → 6hr follow-up → 35 days of value emails (daily)
 */
export const EBOOK_NURTURE_STEPS = [
  // Immediate - Ebook Delivery
  { step_order: 1, name: 'Ebook Delivery', delay_value: 0, delay_unit: 'minutes', channel: 'email' },
  
  // 6 hours - Follow-up with consultation CTA
  { step_order: 2, name: 'Ebook Follow-up', delay_value: 6, delay_unit: 'hours', channel: 'email' },
  
  // 12 hours (6hrs after follow-up) - Start value emails
  { step_order: 3, name: 'Value Email #1', delay_value: 12, delay_unit: 'hours', channel: 'email' },
  { step_order: 4, name: 'Value Email #2', delay_value: 1, delay_unit: 'days', channel: 'email' },
  { step_order: 5, name: 'Value Email #3', delay_value: 2, delay_unit: 'days', channel: 'email' },
  { step_order: 6, name: 'Value Email #4', delay_value: 3, delay_unit: 'days', channel: 'email' },
  { step_order: 7, name: 'Value Email #5', delay_value: 4, delay_unit: 'days', channel: 'email' },
  { step_order: 8, name: 'Value Email #6', delay_value: 5, delay_unit: 'days', channel: 'email' },
  { step_order: 9, name: 'Value Email #7', delay_value: 6, delay_unit: 'days', channel: 'email' },
  { step_order: 10, name: 'Value Email #8', delay_value: 7, delay_unit: 'days', channel: 'email' },
  { step_order: 11, name: 'Value Email #9', delay_value: 8, delay_unit: 'days', channel: 'email' },
  { step_order: 12, name: 'Value Email #10', delay_value: 9, delay_unit: 'days', channel: 'email' },
  { step_order: 13, name: 'Value Email #11', delay_value: 10, delay_unit: 'days', channel: 'email' },
  { step_order: 14, name: 'Value Email #12', delay_value: 11, delay_unit: 'days', channel: 'email' },
  { step_order: 15, name: 'Value Email #13', delay_value: 12, delay_unit: 'days', channel: 'email' },
  { step_order: 16, name: 'Value Email #14', delay_value: 13, delay_unit: 'days', channel: 'email' },
  { step_order: 17, name: 'Value Email #15', delay_value: 14, delay_unit: 'days', channel: 'email' },
  { step_order: 18, name: 'Value Email #16', delay_value: 15, delay_unit: 'days', channel: 'email' },
  { step_order: 19, name: 'Value Email #17', delay_value: 16, delay_unit: 'days', channel: 'email' },
  { step_order: 20, name: 'Value Email #18', delay_value: 17, delay_unit: 'days', channel: 'email' },
  { step_order: 21, name: 'Value Email #19', delay_value: 18, delay_unit: 'days', channel: 'email' },
  { step_order: 22, name: 'Value Email #20', delay_value: 19, delay_unit: 'days', channel: 'email' },
  { step_order: 23, name: 'Value Email #21', delay_value: 20, delay_unit: 'days', channel: 'email' },
  { step_order: 24, name: 'Value Email #22', delay_value: 21, delay_unit: 'days', channel: 'email' },
  { step_order: 25, name: 'Value Email #23', delay_value: 22, delay_unit: 'days', channel: 'email' },
  { step_order: 26, name: 'Value Email #24', delay_value: 23, delay_unit: 'days', channel: 'email' },
  { step_order: 27, name: 'Value Email #25', delay_value: 24, delay_unit: 'days', channel: 'email' },
  { step_order: 28, name: 'Value Email #26', delay_value: 25, delay_unit: 'days', channel: 'email' },
  { step_order: 29, name: 'Value Email #27', delay_value: 26, delay_unit: 'days', channel: 'email' },
  { step_order: 30, name: 'Value Email #28', delay_value: 27, delay_unit: 'days', channel: 'email' },
  { step_order: 31, name: 'Value Email #29', delay_value: 28, delay_unit: 'days', channel: 'email' },
  { step_order: 32, name: 'Value Email #30', delay_value: 29, delay_unit: 'days', channel: 'email' },
  { step_order: 33, name: 'Value Email #31', delay_value: 30, delay_unit: 'days', channel: 'email' },
  { step_order: 34, name: 'Value Email #32', delay_value: 31, delay_unit: 'days', channel: 'email' },
  { step_order: 35, name: 'Value Email #33', delay_value: 32, delay_unit: 'days', channel: 'email' },
  { step_order: 36, name: 'Value Email #34', delay_value: 33, delay_unit: 'days', channel: 'email' },
  { step_order: 37, name: 'Value Email #35', delay_value: 34, delay_unit: 'days', channel: 'email' },
  { step_order: 38, name: 'Closing Email #1', delay_value: 35, delay_unit: 'days', channel: 'email' }
];

export default { SEQUENCE_TABLES, DEFAULT_SEQUENCES, NEW_LEAD_SEQUENCE_STEPS, MEETING_BOOKED_STEPS, NO_SHOW_STEPS, EBOOK_NURTURE_STEPS };
