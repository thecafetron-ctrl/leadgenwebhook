/**
 * WhatsApp Chat & Intent Scoring Database Schema
 * 
 * This schema supports:
 * - Storing incoming WhatsApp messages for leads in our database
 * - AI-powered intent scoring based on conversation history
 * - Conversation analysis and insights
 */

export const CHAT_INTENT_TABLES = `
-- ============================================
-- WHATSAPP CONVERSATIONS TABLE
-- Tracks conversations with leads
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  phone_number VARCHAR(50) NOT NULL,
  
  -- Conversation metadata
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  
  -- Intent scoring (updated after each message)
  current_intent_score INTEGER DEFAULT 0,
  intent_category VARCHAR(50),
  buying_signals TEXT,
  objections TEXT,
  ai_summary TEXT,
  recommended_action TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Only one active conversation per phone
  UNIQUE(phone_number)
);

CREATE INDEX IF NOT EXISTS idx_conversations_lead ON whatsapp_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_intent ON whatsapp_conversations(current_intent_score DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_active ON whatsapp_conversations(is_active) WHERE is_active = true;

-- ============================================
-- WHATSAPP CHAT MESSAGES TABLE
-- Stores individual messages in conversations
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Message details
  direction VARCHAR(10) NOT NULL,                -- 'inbound' (from lead) or 'outbound' (from us)
  message_type VARCHAR(30) DEFAULT 'text',       -- 'text', 'image', 'audio', 'video', 'document', 'location', etc.
  content TEXT,                                   -- Message text content
  media_url TEXT,                                 -- URL for media messages
  media_caption TEXT,                             -- Caption for media
  
  -- Evolution API message metadata
  evolution_message_id VARCHAR(255),              -- Message ID from Evolution API
  evolution_key_id VARCHAR(255),                  -- Key ID from Evolution API
  sender_jid VARCHAR(255),                        -- Sender JID
  sender_name VARCHAR(255),                       -- Sender push name
  
  -- Message status
  status VARCHAR(30) DEFAULT 'received',          -- 'received', 'read', 'delivered', 'failed'
  
  -- AI analysis for this message
  sentiment VARCHAR(20),                          -- 'positive', 'neutral', 'negative'
  intent_indicators TEXT,                         -- JSON array of detected intents
  is_question BOOLEAN DEFAULT false,
  requires_followup BOOLEAN DEFAULT false,
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL,                 -- When message was sent/received
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON whatsapp_chat_messages(conversation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_lead ON whatsapp_chat_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_direction ON whatsapp_chat_messages(direction);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON whatsapp_chat_messages(timestamp DESC);

-- ============================================
-- INTENT SCORE HISTORY TABLE
-- Tracks how intent score changes over time
-- ============================================
CREATE TABLE IF NOT EXISTS intent_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Score details
  score INTEGER NOT NULL,
  previous_score INTEGER,
  score_change INTEGER,                           -- Positive = improving, negative = declining
  
  -- AI analysis at this point
  intent_category VARCHAR(50),
  confidence DECIMAL(5,2),                        -- 0.00 to 1.00
  key_signals TEXT,                               -- JSON array of signals that affected score
  analysis_summary TEXT,
  
  -- Trigger info
  triggered_by VARCHAR(100),                      -- What triggered this score update
  message_id UUID REFERENCES whatsapp_chat_messages(id) ON DELETE SET NULL,
  
  -- Timestamps
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_history_conversation ON intent_score_history(conversation_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS idx_intent_history_lead ON intent_score_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_intent_history_score ON intent_score_history(score DESC);

-- ============================================
-- CONVERSATION INSIGHTS TABLE
-- AI-generated insights and recommendations
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Insight details
  insight_type VARCHAR(50) NOT NULL,              -- 'buying_signal', 'objection', 'question', 'interest', 'concern', etc.
  insight_text TEXT NOT NULL,
  relevance_score INTEGER DEFAULT 50,             -- 0-100 how relevant/important this insight is
  
  -- Source message
  source_message_id UUID REFERENCES whatsapp_chat_messages(id) ON DELETE SET NULL,
  
  -- Action items
  suggested_response TEXT,
  action_required BOOLEAN DEFAULT false,
  action_status VARCHAR(30) DEFAULT 'pending',    -- 'pending', 'addressed', 'dismissed'
  
  -- Timestamps
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  addressed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_insights_conversation ON conversation_insights(conversation_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON conversation_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_action ON conversation_insights(action_required, action_status);
`;

/**
 * Intent categories for classification
 */
export const INTENT_CATEGORIES = {
  HOT_LEAD: 'hot_lead',           // Ready to buy/book, asking about pricing, availability
  WARM_LEAD: 'warm_lead',         // Interested, asking questions, engaged
  CURIOUS: 'curious',             // Just asking, exploring options
  OBJECTION: 'objection',         // Has concerns, price objections, timing issues
  NOT_INTERESTED: 'not_interested', // Declining, not a fit
  SUPPORT: 'support',             // Existing customer, support questions
  SPAM: 'spam',                   // Not relevant, spam messages
  UNCLEAR: 'unclear'              // Can't determine intent
};

/**
 * Intent score ranges
 */
export const INTENT_SCORE_RANGES = {
  HOT: { min: 80, max: 100, label: '🔥 Hot - Ready to Convert' },
  WARM: { min: 60, max: 79, label: '🌡️ Warm - Highly Interested' },
  ENGAGED: { min: 40, max: 59, label: '💬 Engaged - Asking Questions' },
  LUKEWARM: { min: 20, max: 39, label: '🤔 Lukewarm - Some Interest' },
  COLD: { min: 0, max: 19, label: '❄️ Cold - Low Interest' }
};

export default { CHAT_INTENT_TABLES, INTENT_CATEGORIES, INTENT_SCORE_RANGES };
