/**
 * Chatbot Routes
 * 
 * API endpoints for the AI chatbot that knows about leads.
 */

import { Router } from 'express';
import { processChatbotQuery } from '../services/chatbotService.js';

const router = Router();

/**
 * POST /api/chatbot/query
 * Process a chatbot query
 */
router.post('/query', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const result = await processChatbotQuery(message, conversationHistory);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error processing chatbot query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process query',
      message: error.message
    });
  }
});

export default router;
