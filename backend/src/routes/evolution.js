/**
 * Evolution API Routes
 * 
 * Handles:
 * - Webhook endpoints for incoming WhatsApp messages
 * - API endpoints for chat/conversation management
 * - Intent scoring and analytics
 */

import { Router } from 'express';
import {
  processIncomingMessage,
  getConversations,
  getConversationDetails,
  getHotLeads,
  getIntentAnalytics,
  scoreConversationIntent,
  isNumberInDatabase,
  INTENT_CATEGORIES,
  INTENT_SCORE_RANGES
} from '../services/evolutionChatService.js';

const router = Router();

// ============================================
// WEBHOOK ENDPOINTS (from Evolution API)
// ============================================

/**
 * POST /api/evolution/webhook
 * Main webhook endpoint for Evolution API events
 * 
 * Evolution API sends events like:
 * - messages.upsert (new message)
 * - messages.update (message status update)
 * - connection.update (connection status)
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('📥 Evolution webhook received:', {
      event: webhookData.event,
      instance: webhookData.instance,
      hasData: !!webhookData.data
    });
    
    // Process the message
    const result = await processIncomingMessage(webhookData);
    
    if (result.processed) {
      console.log(`✅ Message processed: Lead ${result.leadName}, Intent: ${result.intentScore}/100 (${result.intentCategory})`);
    }
    
    // Always return 200 to acknowledge receipt
    res.status(200).json({
      success: true,
      processed: result.processed,
      ...result
    });
    
  } catch (error) {
    console.error('Evolution webhook error:', error);
    // Still return 200 to prevent retries
    res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/evolution/webhook/:instanceName
 * Instance-specific webhook endpoint
 */
router.post('/webhook/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const webhookData = {
      ...req.body,
      instanceName
    };
    
    console.log(`📥 Evolution webhook (${instanceName}):`, webhookData.event);
    
    const result = await processIncomingMessage(webhookData);
    
    res.status(200).json({
      success: true,
      processed: result.processed,
      ...result
    });
    
  } catch (error) {
    console.error('Evolution webhook error:', error);
    res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// CONVERSATIONS API
// ============================================

/**
 * GET /api/evolution/conversations
 * Get all conversations with intent scores
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - minScore: Minimum intent score (default: 0)
 * - category: Filter by intent category
 * - leadId: Filter by specific lead
 */
router.get('/conversations', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      minScore = 0,
      category,
      leadId
    } = req.query;
    
    const result = await getConversations({
      page: parseInt(page),
      limit: parseInt(limit),
      minScore: parseInt(minScore),
      category,
      leadId
    });
    
    res.json({
      success: true,
      data: result.conversations,
      pagination: result.pagination
    });
    
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
});

/**
 * GET /api/evolution/conversations/:id
 * Get conversation details with full message history
 */
router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const conversation = await getConversationDetails(id);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    res.json({
      success: true,
      data: conversation
    });
    
  } catch (error) {
    console.error('Error fetching conversation details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation details'
    });
  }
});

/**
 * POST /api/evolution/conversations/:id/rescore
 * Manually trigger intent rescoring for a conversation
 */
router.post('/conversations/:id/rescore', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await scoreConversationIntent(id, 'manual_rescore');
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error rescoring conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rescore conversation'
    });
  }
});

// ============================================
// HOT LEADS & ANALYTICS
// ============================================

/**
 * GET /api/evolution/hot-leads
 * Get conversations with high intent scores (potential buyers)
 * 
 * Query params:
 * - minScore: Minimum score (default: 60)
 */
router.get('/hot-leads', async (req, res) => {
  try {
    const { minScore = 60 } = req.query;
    
    const hotLeads = await getHotLeads(parseInt(minScore));
    
    res.json({
      success: true,
      data: hotLeads,
      count: hotLeads.length
    });
    
  } catch (error) {
    console.error('Error fetching hot leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hot leads'
    });
  }
});

/**
 * GET /api/evolution/analytics
 * Get intent scoring analytics and insights
 */
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await getIntentAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

/**
 * GET /api/evolution/categories
 * Get available intent categories
 */
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: {
      categories: INTENT_CATEGORIES,
      scoreRanges: INTENT_SCORE_RANGES
    }
  });
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * POST /api/evolution/check-number
 * Check if a phone number exists in our database
 */
router.post('/check-number', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    const lead = await isNumberInDatabase(phone);
    
    res.json({
      success: true,
      inDatabase: !!lead,
      lead: lead ? {
        id: lead.id,
        name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        email: lead.email,
        company: lead.company,
        status: lead.status
      } : null
    });
    
  } catch (error) {
    console.error('Error checking number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check number'
    });
  }
});

/**
 * GET /api/evolution/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Evolution Chat Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      chatTracking: true,
      intentScoring: !!process.env.OPENAI_API_KEY,
      aiAnalysis: !!process.env.OPENAI_API_KEY
    }
  });
});

/**
 * GET /api/evolution/setup-info
 * Get setup information for configuring Evolution API webhook
 */
router.get('/setup-info', (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  
  res.json({
    success: true,
    webhookUrl: `${baseUrl}/api/evolution/webhook`,
    instructions: {
      step1: 'Go to your Evolution API instance settings',
      step2: 'Add a webhook with the URL above',
      step3: 'Enable the MESSAGES_UPSERT event',
      step4: 'Optionally enable MESSAGES_UPDATE for status updates',
      step5: 'Save and test by sending a message to a number in your leads database'
    },
    events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
    notes: [
      'Only messages from numbers in your leads database will be tracked',
      'Intent scoring uses AI (OpenAI) if OPENAI_API_KEY is configured',
      'Check /api/evolution/health to verify the service is running'
    ]
  });
});

export default router;
