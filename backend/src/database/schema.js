/**
 * Database Schema Definitions
 * 
 * This schema is designed to support:
 * - Lead management with full tracking
 * - Webhook event logging
 * - Future email automation campaigns
 * - Future WhatsApp automation
 * - Future pipeline/workflow management
 * 
 * Using SQLite for local development, easily portable to PostgreSQL
 */

export const createTablesSQL = `
  -- ============================================
  -- LEADS TABLE
  -- Core table for storing all lead information
  -- ============================================
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    
    -- Contact Information
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    
    -- Source Tracking
    source TEXT NOT NULL DEFAULT 'manual',  -- 'meta_forms', 'calcom', 'manual', 'api', etc.
    source_id TEXT,                          -- External ID from source system
    campaign_id TEXT,                        -- Marketing campaign identifier
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    
    -- Lead Status & Scoring
    status TEXT NOT NULL DEFAULT 'new',      -- 'new', 'contacted', 'qualified', 'converted', 'lost'
    score INTEGER DEFAULT 0,                 -- Lead score (0-100)
    priority TEXT DEFAULT 'medium',          -- 'low', 'medium', 'high', 'urgent'
    
    -- Organization & Tagging
    tags TEXT,                               -- JSON array of tags
    custom_fields TEXT,                      -- JSON object for flexible custom data
    notes TEXT,                              -- Internal notes
    
    -- Assignment & Ownership
    assigned_to TEXT,                        -- User ID of assigned team member
    
    -- Consent & Compliance
    email_consent INTEGER DEFAULT 0,         -- 0 = no, 1 = yes
    sms_consent INTEGER DEFAULT 0,
    whatsapp_consent INTEGER DEFAULT 0,
    consent_timestamp TEXT,
    gdpr_consent TEXT,                       -- JSON object with consent details
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    converted_at TEXT,
    last_contacted_at TEXT,
    
    -- Indexes for common queries
    UNIQUE(email, source)
  );

  CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
  CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
  CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

  -- ============================================
  -- WEBHOOK LOGS TABLE
  -- Stores all incoming webhook events for debugging
  -- ============================================
  CREATE TABLE IF NOT EXISTS webhook_logs (
    id TEXT PRIMARY KEY,
    
    -- Request Details
    source TEXT NOT NULL,                    -- 'meta_forms', 'calcom', 'test', etc.
    endpoint TEXT NOT NULL,                  -- The endpoint that received the webhook
    method TEXT NOT NULL DEFAULT 'POST',
    headers TEXT,                            -- JSON object of headers
    payload TEXT,                            -- Raw JSON payload
    query_params TEXT,                       -- JSON object of query parameters
    
    -- Processing Details
    status TEXT NOT NULL DEFAULT 'received', -- 'received', 'processing', 'processed', 'failed'
    response_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    
    -- Correlation
    lead_id TEXT,                            -- ID of lead created/updated from this webhook
    
    -- IP & Security
    ip_address TEXT,
    user_agent TEXT,
    signature_valid INTEGER,                 -- Was webhook signature valid? 0/1/NULL
    
    -- Timestamps
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    processed_at TEXT,
    
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
  CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
  CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at ON webhook_logs(received_at);
  CREATE INDEX IF NOT EXISTS idx_webhook_logs_lead_id ON webhook_logs(lead_id);

  -- ============================================
  -- LEAD ACTIVITIES TABLE
  -- Tracks all interactions and activities for each lead
  -- ============================================
  CREATE TABLE IF NOT EXISTS lead_activities (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    
    -- Activity Details
    type TEXT NOT NULL,                      -- 'created', 'status_change', 'email_sent', 'email_opened', 
                                             -- 'email_clicked', 'whatsapp_sent', 'note_added', 'call', etc.
    description TEXT,
    metadata TEXT,                           -- JSON object with activity-specific data
    
    -- Attribution
    performed_by TEXT,                       -- User ID or 'system'
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
  CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(type);
  CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at);

  -- ============================================
  -- EMAIL CAMPAIGNS TABLE (Future)
  -- Stores email campaign configurations
  -- ============================================
  CREATE TABLE IF NOT EXISTS email_campaigns (
    id TEXT PRIMARY KEY,
    
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT,
    body_html TEXT,
    body_text TEXT,
    
    -- Campaign Settings
    status TEXT NOT NULL DEFAULT 'draft',    -- 'draft', 'scheduled', 'active', 'paused', 'completed'
    trigger_type TEXT,                       -- 'manual', 'on_lead_created', 'scheduled', 'workflow'
    trigger_config TEXT,                     -- JSON configuration for trigger
    
    -- Filtering
    target_filters TEXT,                     -- JSON object defining lead filters
    
    -- Stats
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    bounce_count INTEGER DEFAULT 0,
    unsubscribe_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    scheduled_at TEXT,
    started_at TEXT,
    completed_at TEXT
  );

  -- ============================================
  -- EMAIL SENDS TABLE (Future)
  -- Tracks individual email sends
  -- ============================================
  CREATE TABLE IF NOT EXISTS email_sends (
    id TEXT PRIMARY KEY,
    campaign_id TEXT,
    lead_id TEXT NOT NULL,
    
    -- Email Details
    to_email TEXT NOT NULL,
    subject TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
    
    -- Provider Details
    provider TEXT,                           -- 'sendgrid', 'smtp', etc.
    provider_message_id TEXT,
    
    -- Tracking
    opened_at TEXT,
    clicked_at TEXT,
    bounced_at TEXT,
    
    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sent_at TEXT,
    
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_email_sends_lead_id ON email_sends(lead_id);
  CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_id ON email_sends(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);

  -- ============================================
  -- WHATSAPP MESSAGES TABLE (Future)
  -- Tracks WhatsApp message interactions
  -- ============================================
  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    
    -- Message Details
    direction TEXT NOT NULL,                 -- 'inbound', 'outbound'
    phone_number TEXT NOT NULL,
    message_type TEXT,                       -- 'text', 'template', 'image', 'document', etc.
    content TEXT,
    template_name TEXT,
    template_params TEXT,                    -- JSON array of template parameters
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'delivered', 'read', 'failed'
    
    -- Provider Details
    provider_message_id TEXT,
    
    -- Error Handling
    error_message TEXT,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sent_at TEXT,
    delivered_at TEXT,
    read_at TEXT,
    
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_id ON whatsapp_messages(lead_id);
  CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);

  -- ============================================
  -- AUTOMATION WORKFLOWS TABLE (Future)
  -- Stores automation workflow definitions
  -- ============================================
  CREATE TABLE IF NOT EXISTS automation_workflows (
    id TEXT PRIMARY KEY,
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Workflow Configuration
    trigger_type TEXT NOT NULL,              -- 'lead_created', 'status_change', 'tag_added', 'scheduled', etc.
    trigger_config TEXT,                     -- JSON configuration
    steps TEXT,                              -- JSON array of workflow steps
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft',    -- 'draft', 'active', 'paused', 'archived'
    
    -- Stats
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ============================================
  -- WORKFLOW EXECUTIONS TABLE (Future)
  -- Tracks workflow execution instances
  -- ============================================
  CREATE TABLE IF NOT EXISTS workflow_executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    
    -- Execution Details
    status TEXT NOT NULL DEFAULT 'running',  -- 'running', 'completed', 'failed', 'cancelled'
    current_step INTEGER DEFAULT 0,
    step_results TEXT,                       -- JSON array of step execution results
    
    -- Error Handling
    error_message TEXT,
    
    -- Timestamps
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    
    FOREIGN KEY (workflow_id) REFERENCES automation_workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_workflow_executions_lead_id ON workflow_executions(lead_id);
  CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
`;

export const dropTablesSQL = `
  DROP TABLE IF EXISTS workflow_executions;
  DROP TABLE IF EXISTS automation_workflows;
  DROP TABLE IF EXISTS whatsapp_messages;
  DROP TABLE IF EXISTS email_sends;
  DROP TABLE IF EXISTS email_campaigns;
  DROP TABLE IF EXISTS lead_activities;
  DROP TABLE IF EXISTS webhook_logs;
  DROP TABLE IF EXISTS leads;
`;
