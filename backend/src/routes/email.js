/**
 * Email Routes
 * 
 * Endpoints for email testing and sending.
 */

import { Router } from 'express';
import { 
  isEmailConfigured, 
  sendTestEmail, 
  sendEmail,
  sendEmailSequence,
  verifyEmailConfig 
} from '../services/emailService.js';

const router = Router();

/**
 * GET /api/email/status
 * Check if email service is configured
 */
router.get('/status', async (req, res) => {
  try {
    const status = await verifyEmailConfig();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/email/test
 * Send a test email to any address
 */
router.post('/test', async (req, res) => {
  try {
    const { email, subject, content } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Email service not configured',
        message: 'Set SMTP_USER and SMTP_PASS environment variables to enable email sending'
      });
    }

    const customContent = subject || content ? {
      subject: subject || '🧪 Test Email from Lead Pipeline',
      html: content ? `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .card { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; border: 1px solid #334155; }
            h1 { color: #f1f5f9; font-size: 24px; margin: 0 0 20px 0; }
            p { color: #94a3b8; line-height: 1.6; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <h1>${subject || 'Test Email'}</h1>
              <p>${content}</p>
              <div class="footer">
                <p>Sent from Lead Pipeline • ${new Date().toISOString()}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      ` : null
    } : null;

    const result = await sendTestEmail(email, customContent);
    
    res.json({
      success: true,
      message: `Test email sent to ${email}`,
      data: result
    });
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      message: error.message
    });
  }
});

/**
 * POST /api/email/send
 * Send a custom email
 */
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Email address and subject are required'
      });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Email service not configured'
      });
    }

    const result = await sendEmail({ to, subject, html, text });
    
    res.json({
      success: true,
      message: `Email sent to ${to}`,
      data: result
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: error.message
    });
  }
});

/**
 * POST /api/email/sequence
 * Send an email sequence (for testing)
 */
router.post('/sequence', async (req, res) => {
  try {
    const { email, sequence } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    if (!sequence || !Array.isArray(sequence) || sequence.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Sequence array is required'
      });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Email service not configured'
      });
    }

    const results = await sendEmailSequence(email, sequence);
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Sent ${successCount}/${sequence.length} emails to ${email}`,
      data: results
    });
  } catch (error) {
    console.error('Email sequence error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email sequence',
      message: error.message
    });
  }
});

export default router;
