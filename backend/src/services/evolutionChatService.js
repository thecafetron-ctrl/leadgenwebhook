/**
 * Evolution API Chat Listener Service
 * 
 * This service:
 * - Receives incoming WhatsApp messages from Evolution API webhooks
 * - Only processes messages from numbers that exist in our leads database
 * - Stores chat history for those conversations
 * - Uses AI to score intent based on conversation history
 * - Provides insights and recommendations
 */

import { query } from '../database/connection.js';
import OpenAI from 'openai';
import { INTENT_CATEGORIES, INTENT_SCORE_RANGES } from '../database/schema-chat-intent.js';

// Re-export intent constants as named exports for route imports
export { INTENT_CATEGORIES, INTENT_SCORE_RANGES };

// Initialize OpenAI
let openai = null;
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

/**
 * Format phone number to normalized format (digits only)
 */
function normalizePhone(phone) {
  if (!phone) return null;
  // Remove everything except digits
  let cleaned = phone.replace(/[^\d]/g, '');
  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');
  return cleaned;
}

/**
 * Extract phone number from WhatsApp JID
 * JID format: 1234567890@s.whatsapp.net or 1234567890@c.us
 */
function extractPhoneFromJid(jid) {
  if (!jid) return null;
  const match = jid.match(/^(\d+)@/);
  return match ? match[1] : null;
}

/**
 * Check if a phone number exists in our leads database
 */
export async function isNumberInDatabase(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  
  // Try various formats to match
  const variations = [
    normalized,
    `+${normalized}`,
    normalized.replace(/^(\d{2})/, '+$1 '), // +XX format
  ];
  
  // Also try without country code if it starts with common codes
  if (normalized.length > 10) {
    // Remove country code variations
    variations.push(normalized.slice(-10)); // Last 10 digits
    variations.push(normalized.slice(-11)); // Last 11 digits
  }
  
  try {
    const result = await query(`
      SELECT id, first_name, last_name, email, phone, company, status, score, source
      FROM leads 
      WHERE phone IS NOT NULL 
      AND (
        REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $1
        OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE '%' || $2
        OR REGEXP_REPLACE(phone, '[^0-9]', '', 'g') LIKE $3 || '%'
      )
      LIMIT 1
    `, [normalized, normalized.slice(-10), normalized.slice(-10)]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error checking phone in database:', error);
    return null;
  }
}

/**
 * Get or create a conversation for a phone number
 */
async function getOrCreateConversation(phone, lead) {
  const normalized = normalizePhone(phone);
  
  try {
    // Try to find existing conversation
    const existing = await query(`
      SELECT * FROM whatsapp_conversations 
      WHERE phone_number = $1
    `, [normalized]);
    
    if (existing.rows[0]) {
      return existing.rows[0];
    }
    
    // Create new conversation
    const result = await query(`
      INSERT INTO whatsapp_conversations (
        lead_id, phone_number, is_active, message_count,
        current_intent_score, intent_category
      ) VALUES ($1, $2, true, 0, 0, 'unclear')
      RETURNING *
    `, [lead?.id || null, normalized]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    throw error;
  }
}

/**
 * Store a chat message
 */
async function storeMessage(conversationId, leadId, messageData) {
  const {
    direction,
    messageType = 'text',
    content,
    mediaUrl,
    mediaCaption,
    evolutionMessageId,
    evolutionKeyId,
    senderJid,
    senderName,
    timestamp
  } = messageData;
  
  try {
    const result = await query(`
      INSERT INTO whatsapp_chat_messages (
        conversation_id, lead_id, direction, message_type, content,
        media_url, media_caption, evolution_message_id, evolution_key_id,
        sender_jid, sender_name, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      conversationId, leadId, direction, messageType, content,
      mediaUrl, mediaCaption, evolutionMessageId, evolutionKeyId,
      senderJid, senderName, timestamp || new Date()
    ]);
    
    // Update conversation message count and last message time
    await query(`
      UPDATE whatsapp_conversations 
      SET message_count = message_count + 1,
          last_message_at = $2,
          updated_at = NOW()
      WHERE id = $1
    `, [conversationId, timestamp || new Date()]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error storing message:', error);
    throw error;
  }
}

/**
 * Get conversation history for AI analysis
 */
async function getConversationHistory(conversationId, limit = 20) {
  try {
    const result = await query(`
      SELECT direction, content, message_type, sender_name, timestamp
      FROM whatsapp_chat_messages
      WHERE conversation_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `, [conversationId, limit]);
    
    // Reverse to get chronological order
    return result.rows.reverse();
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

/**
 * Get lead context for AI analysis
 */
async function getLeadContext(leadId) {
  if (!leadId) return null;
  
  try {
    const result = await query(`
      SELECT first_name, last_name, email, company, job_title,
             source, status, score, priority, custom_fields, notes
      FROM leads WHERE id = $1
    `, [leadId]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting lead context:', error);
    return null;
  }
}

/**
 * AI-powered intent scoring based on conversation history
 */
export async function scoreConversationIntent(conversationId, triggeredBy = 'message') {
  const ai = getOpenAI();
  if (!ai) {
    console.log('⚠️ OpenAI not configured, using basic intent scoring');
    return basicIntentScoring(conversationId);
  }
  
  try {
    // Get conversation
    const convResult = await query(`
      SELECT * FROM whatsapp_conversations WHERE id = $1
    `, [conversationId]);
    const conversation = convResult.rows[0];
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    // Get message history
    const history = await getConversationHistory(conversationId, 30);
    if (history.length === 0) {
      return { score: 0, category: 'unclear', signals: [] };
    }
    
    // Get lead context
    const leadContext = await getLeadContext(conversation.lead_id);
    
    // Format messages for AI
    const formattedHistory = history.map(msg => ({
      role: msg.direction === 'inbound' ? 'customer' : 'business',
      content: msg.content || `[${msg.message_type} message]`,
      timestamp: msg.timestamp
    }));
    
    const prompt = `You are an expert sales intent analyzer. Analyze this WhatsApp conversation and score the lead's buying intent.

COMPANY CONTEXT:
We are STRUCTURE, a logistics automation company. We help freight forwarders and logistics companies automate their operations using AI.

LEAD CONTEXT:
${leadContext ? `
- Name: ${leadContext.first_name || ''} ${leadContext.last_name || ''}
- Company: ${leadContext.company || 'Unknown'}
- Role: ${leadContext.job_title || 'Unknown'}
- Source: ${leadContext.source || 'Unknown'}
- Current Status: ${leadContext.status || 'new'}
- Lead Score: ${leadContext.score || 0}/100
- Additional Info: ${JSON.stringify(leadContext.custom_fields || {})}
` : 'No lead context available'}

CONVERSATION HISTORY:
${formattedHistory.map(m => `[${m.role}]: ${m.content}`).join('\n')}

Analyze the conversation and return a JSON response with:
1. intent_score: 0-100 (100 = definitely buying, 0 = not interested at all)
2. intent_category: One of: "hot_lead", "warm_lead", "curious", "objection", "not_interested", "support", "spam", "unclear"
3. buying_signals: Array of specific buying signals detected (max 5)
4. objections: Array of objections or concerns raised (max 5)
5. summary: 2-3 sentence summary of the conversation state
6. recommended_action: What the sales team should do next
7. sentiment: Overall sentiment - "positive", "neutral", "negative"
8. urgency: "high", "medium", "low" - how urgent is follow-up
9. confidence: 0.0-1.0 - how confident you are in this analysis

Return ONLY valid JSON, no markdown or explanation.`;

    const response = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.3
    });
    
    const analysisText = response.choices[0].message.content.trim();
    let analysis;
    
    try {
      // Try to parse JSON, handling potential markdown code blocks
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      return basicIntentScoring(conversationId);
    }
    
    // Get previous score
    const prevResult = await query(`
      SELECT current_intent_score FROM whatsapp_conversations WHERE id = $1
    `, [conversationId]);
    const previousScore = prevResult.rows[0]?.current_intent_score || 0;
    
    // Update conversation with new analysis
    await query(`
      UPDATE whatsapp_conversations SET
        current_intent_score = $2,
        intent_category = $3,
        buying_signals = $4,
        objections = $5,
        ai_summary = $6,
        recommended_action = $7,
        updated_at = NOW()
      WHERE id = $1
    `, [
      conversationId,
      analysis.intent_score,
      analysis.intent_category,
      JSON.stringify(analysis.buying_signals || []),
      JSON.stringify(analysis.objections || []),
      analysis.summary,
      analysis.recommended_action
    ]);
    
    // Record score history
    await query(`
      INSERT INTO intent_score_history (
        conversation_id, lead_id, score, previous_score, score_change,
        intent_category, confidence, key_signals, analysis_summary, triggered_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      conversationId,
      conversation.lead_id,
      analysis.intent_score,
      previousScore,
      analysis.intent_score - previousScore,
      analysis.intent_category,
      analysis.confidence,
      JSON.stringify(analysis.buying_signals || []),
      analysis.summary,
      triggeredBy
    ]);
    
    // Extract and store insights
    if (analysis.buying_signals?.length > 0) {
      for (const signal of analysis.buying_signals) {
        await storeInsight(conversationId, conversation.lead_id, 'buying_signal', signal, analysis.intent_score);
      }
    }
    
    if (analysis.objections?.length > 0) {
      for (const objection of analysis.objections) {
        await storeInsight(conversationId, conversation.lead_id, 'objection', objection, 70, true);
      }
    }
    
    console.log(`📊 Intent scored for conversation ${conversationId}: ${analysis.intent_score}/100 (${analysis.intent_category})`);
    
    return {
      score: analysis.intent_score,
      category: analysis.intent_category,
      signals: analysis.buying_signals,
      objections: analysis.objections,
      summary: analysis.summary,
      recommended_action: analysis.recommended_action,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      confidence: analysis.confidence
    };
    
  } catch (error) {
    console.error('AI intent scoring error:', error);
    return basicIntentScoring(conversationId);
  }
}

/**
 * Basic intent scoring without AI (fallback)
 */
async function basicIntentScoring(conversationId) {
  try {
    const history = await getConversationHistory(conversationId, 20);
    
    let score = 20; // Base score
    const signals = [];
    
    // Count messages
    const inboundCount = history.filter(m => m.direction === 'inbound').length;
    if (inboundCount > 5) {
      score += 15;
      signals.push('Multiple engaged messages');
    }
    
    // Check for buying keywords in recent messages
    const recentContent = history
      .slice(-10)
      .filter(m => m.direction === 'inbound')
      .map(m => (m.content || '').toLowerCase())
      .join(' ');
    
    const buyingKeywords = ['price', 'cost', 'pricing', 'demo', 'meeting', 'schedule', 'call', 'interested', 'how much', 'start', 'begin', 'when'];
    const objectionKeywords = ['expensive', 'not now', 'later', 'busy', 'not interested', 'maybe', 'think about'];
    const hotKeywords = ['sign up', 'ready', 'let\'s go', 'book', 'yes', 'definitely', 'now', 'today', 'asap'];
    
    for (const keyword of hotKeywords) {
      if (recentContent.includes(keyword)) {
        score += 15;
        signals.push(`Hot keyword: "${keyword}"`);
        break;
      }
    }
    
    for (const keyword of buyingKeywords) {
      if (recentContent.includes(keyword)) {
        score += 10;
        signals.push(`Buying signal: "${keyword}"`);
        break;
      }
    }
    
    for (const keyword of objectionKeywords) {
      if (recentContent.includes(keyword)) {
        score -= 15;
        signals.push(`Objection: "${keyword}"`);
        break;
      }
    }
    
    // Questions indicate engagement
    if (recentContent.includes('?')) {
      score += 5;
      signals.push('Asking questions');
    }
    
    score = Math.max(0, Math.min(100, score));
    
    // Determine category
    let category = 'unclear';
    if (score >= 80) category = 'hot_lead';
    else if (score >= 60) category = 'warm_lead';
    else if (score >= 40) category = 'curious';
    else if (score >= 20) category = 'objection';
    else category = 'not_interested';
    
    // Update conversation
    await query(`
      UPDATE whatsapp_conversations SET
        current_intent_score = $2,
        intent_category = $3,
        buying_signals = $4,
        updated_at = NOW()
      WHERE id = $1
    `, [conversationId, score, category, JSON.stringify(signals)]);
    
    return { score, category, signals };
  } catch (error) {
    console.error('Basic scoring error:', error);
    return { score: 0, category: 'unclear', signals: [] };
  }
}

/**
 * Store a conversation insight
 */
async function storeInsight(conversationId, leadId, type, text, relevanceScore = 50, actionRequired = false) {
  try {
    await query(`
      INSERT INTO conversation_insights (
        conversation_id, lead_id, insight_type, insight_text,
        relevance_score, action_required
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [conversationId, leadId, type, text, relevanceScore, actionRequired]);
  } catch (error) {
    console.error('Error storing insight:', error);
  }
}

/**
 * Process incoming message from Evolution API
 * This is the main entry point for webhook messages
 */
export async function processIncomingMessage(webhookData) {
  try {
    const { instanceName, event, data } = webhookData;
    
    // Only process message events
    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') {
      return { processed: false, reason: 'Not a message event' };
    }
    
    const message = data?.message || data;
    if (!message) {
      return { processed: false, reason: 'No message data' };
    }
    
    // Extract phone number from the remote JID
    const remoteJid = message.key?.remoteJid || data.key?.remoteJid;
    const phone = extractPhoneFromJid(remoteJid);
    
    if (!phone) {
      return { processed: false, reason: 'Could not extract phone number' };
    }
    
    // Check if this number is in our database
    const lead = await isNumberInDatabase(phone);
    
    if (!lead) {
      console.log(`📱 Message from ${phone} - NOT in database, skipping`);
      return { processed: false, reason: 'Number not in database' };
    }
    
    console.log(`📱 Message from ${phone} - Lead found: ${lead.first_name} ${lead.last_name}`);
    
    // Get or create conversation
    const conversation = await getOrCreateConversation(phone, lead);
    
    // Determine message direction
    const isFromMe = message.key?.fromMe || false;
    const direction = isFromMe ? 'outbound' : 'inbound';
    
    // Extract message content
    const messageContent = extractMessageContent(message);
    
    // Store the message
    const storedMessage = await storeMessage(conversation.id, lead.id, {
      direction,
      messageType: messageContent.type,
      content: messageContent.text,
      mediaUrl: messageContent.mediaUrl,
      mediaCaption: messageContent.caption,
      evolutionMessageId: message.key?.id,
      evolutionKeyId: message.key?.id,
      senderJid: message.key?.participant || remoteJid,
      senderName: message.pushName || data.pushName,
      timestamp: message.messageTimestamp ? new Date(message.messageTimestamp * 1000) : new Date()
    });
    
    // Only score intent for inbound messages (from the lead)
    let intentResult = null;
    if (direction === 'inbound') {
      intentResult = await scoreConversationIntent(conversation.id, 'new_message');
    }
    
    return {
      processed: true,
      leadId: lead.id,
      leadName: `${lead.first_name} ${lead.last_name}`,
      conversationId: conversation.id,
      messageId: storedMessage.id,
      direction,
      intentScore: intentResult?.score,
      intentCategory: intentResult?.category
    };
    
  } catch (error) {
    console.error('Error processing incoming message:', error);
    return { processed: false, reason: error.message };
  }
}

/**
 * Extract message content from Evolution API message format
 */
function extractMessageContent(message) {
  const msg = message.message || message;
  
  // Text message
  if (msg.conversation) {
    return { type: 'text', text: msg.conversation };
  }
  
  if (msg.extendedTextMessage) {
    return { type: 'text', text: msg.extendedTextMessage.text };
  }
  
  // Image message
  if (msg.imageMessage) {
    return {
      type: 'image',
      text: msg.imageMessage.caption || '[Image]',
      caption: msg.imageMessage.caption,
      mediaUrl: msg.imageMessage.url
    };
  }
  
  // Video message
  if (msg.videoMessage) {
    return {
      type: 'video',
      text: msg.videoMessage.caption || '[Video]',
      caption: msg.videoMessage.caption,
      mediaUrl: msg.videoMessage.url
    };
  }
  
  // Audio message
  if (msg.audioMessage) {
    return { type: 'audio', text: '[Audio message]' };
  }
  
  // Document message
  if (msg.documentMessage) {
    return {
      type: 'document',
      text: msg.documentMessage.caption || `[Document: ${msg.documentMessage.fileName}]`,
      caption: msg.documentMessage.caption
    };
  }
  
  // Location message
  if (msg.locationMessage) {
    return { type: 'location', text: '[Location shared]' };
  }
  
  // Contact message
  if (msg.contactMessage) {
    return { type: 'contact', text: '[Contact shared]' };
  }
  
  // Reaction
  if (msg.reactionMessage) {
    return { type: 'reaction', text: `[Reaction: ${msg.reactionMessage.text}]` };
  }
  
  // Default
  return { type: 'unknown', text: '[Message]' };
}

/**
 * Get all conversations with their latest intent scores
 */
export async function getConversations({ page = 1, limit = 20, minScore = 0, category = null, leadId = null }) {
  try {
    let sql = `
      SELECT 
        c.*,
        l.first_name, l.last_name, l.email, l.company, l.status as lead_status, l.score as lead_score,
        (SELECT content FROM whatsapp_chat_messages WHERE conversation_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message
      FROM whatsapp_conversations c
      LEFT JOIN leads l ON c.lead_id = l.id
      WHERE c.current_intent_score >= $1
    `;
    const params = [minScore];
    let paramIndex = 2;
    
    if (category) {
      sql += ` AND c.intent_category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (leadId) {
      sql += ` AND c.lead_id = $${paramIndex}`;
      params.push(leadId);
      paramIndex++;
    }
    
    sql += ` ORDER BY c.current_intent_score DESC, c.last_message_at DESC`;
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, (page - 1) * limit);
    
    const result = await query(sql, params);
    
    // Get total count
    let countSql = `
      SELECT COUNT(*) as count
      FROM whatsapp_conversations c
      WHERE c.current_intent_score >= $1
    `;
    const countParams = [minScore];
    if (category) countSql += ` AND c.intent_category = '${category}'`;
    if (leadId) countSql += ` AND c.lead_id = '${leadId}'`;
    
    const countResult = await query(countSql, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    return {
      conversations: result.rows.map(conv => ({
        ...conv,
        buying_signals: safeJSONParse(conv.buying_signals, []),
        objections: safeJSONParse(conv.objections, []),
        scoreLabel: getScoreLabel(conv.current_intent_score)
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
}

/**
 * Get conversation details with full message history
 */
export async function getConversationDetails(conversationId) {
  try {
    // Get conversation
    const convResult = await query(`
      SELECT 
        c.*,
        l.first_name, l.last_name, l.email, l.phone, l.company, l.job_title,
        l.status as lead_status, l.score as lead_score, l.source, l.custom_fields
      FROM whatsapp_conversations c
      LEFT JOIN leads l ON c.lead_id = l.id
      WHERE c.id = $1
    `, [conversationId]);
    
    if (!convResult.rows[0]) {
      return null;
    }
    
    const conversation = convResult.rows[0];
    
    // Get messages
    const messagesResult = await query(`
      SELECT * FROM whatsapp_chat_messages
      WHERE conversation_id = $1
      ORDER BY timestamp ASC
    `, [conversationId]);
    
    // Get insights
    const insightsResult = await query(`
      SELECT * FROM conversation_insights
      WHERE conversation_id = $1
      ORDER BY detected_at DESC
    `, [conversationId]);
    
    // Get score history
    const historyResult = await query(`
      SELECT * FROM intent_score_history
      WHERE conversation_id = $1
      ORDER BY scored_at DESC
      LIMIT 10
    `, [conversationId]);
    
    return {
      ...conversation,
      buying_signals: safeJSONParse(conversation.buying_signals, []),
      objections: safeJSONParse(conversation.objections, []),
      custom_fields: safeJSONParse(conversation.custom_fields, {}),
      scoreLabel: getScoreLabel(conversation.current_intent_score),
      messages: messagesResult.rows,
      insights: insightsResult.rows,
      scoreHistory: historyResult.rows.map(h => ({
        ...h,
        key_signals: safeJSONParse(h.key_signals, [])
      }))
    };
  } catch (error) {
    console.error('Error getting conversation details:', error);
    throw error;
  }
}

/**
 * Get hot leads (high intent score conversations)
 */
export async function getHotLeads(minScore = 60) {
  try {
    const result = await query(`
      SELECT 
        c.*,
        l.first_name, l.last_name, l.email, l.company, l.phone,
        l.status as lead_status, l.score as lead_score
      FROM whatsapp_conversations c
      LEFT JOIN leads l ON c.lead_id = l.id
      WHERE c.current_intent_score >= $1
      AND c.is_active = true
      ORDER BY c.current_intent_score DESC
      LIMIT 20
    `, [minScore]);
    
    return result.rows.map(conv => ({
      ...conv,
      buying_signals: safeJSONParse(conv.buying_signals, []),
      scoreLabel: getScoreLabel(conv.current_intent_score)
    }));
  } catch (error) {
    console.error('Error getting hot leads:', error);
    throw error;
  }
}

/**
 * Get intent analytics
 */
export async function getIntentAnalytics() {
  try {
    // Distribution by category
    const categoryResult = await query(`
      SELECT intent_category, COUNT(*) as count, AVG(current_intent_score) as avg_score
      FROM whatsapp_conversations
      WHERE is_active = true
      GROUP BY intent_category
      ORDER BY count DESC
    `);
    
    // Score distribution
    const scoreResult = await query(`
      SELECT 
        CASE 
          WHEN current_intent_score >= 80 THEN 'hot'
          WHEN current_intent_score >= 60 THEN 'warm'
          WHEN current_intent_score >= 40 THEN 'engaged'
          WHEN current_intent_score >= 20 THEN 'lukewarm'
          ELSE 'cold'
        END as score_tier,
        COUNT(*) as count
      FROM whatsapp_conversations
      WHERE is_active = true
      GROUP BY score_tier
      ORDER BY count DESC
    `);
    
    // Recent score changes
    const trendsResult = await query(`
      SELECT 
        DATE(scored_at) as date,
        AVG(score) as avg_score,
        COUNT(*) as scores_recorded
      FROM intent_score_history
      WHERE scored_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(scored_at)
      ORDER BY date DESC
    `);
    
    // Top insights
    const insightsResult = await query(`
      SELECT insight_type, COUNT(*) as count
      FROM conversation_insights
      WHERE detected_at >= NOW() - INTERVAL '7 days'
      GROUP BY insight_type
      ORDER BY count DESC
      LIMIT 10
    `);
    
    return {
      byCategory: categoryResult.rows,
      byScoreTier: scoreResult.rows,
      scoreTrends: trendsResult.rows,
      topInsights: insightsResult.rows,
      scoreRanges: INTENT_SCORE_RANGES
    };
  } catch (error) {
    console.error('Error getting intent analytics:', error);
    throw error;
  }
}

/**
 * Helper: Safe JSON parse
 */
function safeJSONParse(str, defaultValue = null) {
  if (!str) return defaultValue;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

/**
 * Helper: Get score label
 */
function getScoreLabel(score) {
  if (score >= 80) return INTENT_SCORE_RANGES.HOT.label;
  if (score >= 60) return INTENT_SCORE_RANGES.WARM.label;
  if (score >= 40) return INTENT_SCORE_RANGES.ENGAGED.label;
  if (score >= 20) return INTENT_SCORE_RANGES.LUKEWARM.label;
  return INTENT_SCORE_RANGES.COLD.label;
}

export default {
  processIncomingMessage,
  isNumberInDatabase,
  scoreConversationIntent,
  getConversations,
  getConversationDetails,
  getHotLeads,
  getIntentAnalytics,
  INTENT_CATEGORIES,
  INTENT_SCORE_RANGES
};
