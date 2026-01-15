/**
 * Email Service
 * 
 * Handles sending emails using Nodemailer.
 * Supports multiple SMTP providers (Gmail, SendGrid, Mailgun, custom SMTP)
 * 
 * Environment Variables:
 * - SMTP_HOST: SMTP server host
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_SECURE: Use TLS (true for 465, false for other ports)
 * - SMTP_USER: SMTP username/email
 * - SMTP_PASS: SMTP password/app password
 * - EMAIL_FROM: Default from address
 */

import nodemailer from 'nodemailer';

// Create reusable transporter
let transporter = null;

/**
 * Initialize email transporter
 */
export function initEmailService() {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // Only create transporter if credentials are provided
  if (config.auth.user && config.auth.pass) {
    transporter = nodemailer.createTransport(config);
    console.log('✅ Email service initialized');
    return true;
  } else {
    console.log('⚠️ Email service not configured (missing SMTP credentials)');
    return false;
  }
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured() {
  return transporter !== null;
}

/**
 * Send a single email
 */
export async function sendEmail({ to, subject, html, text, from }) {
  if (!transporter) {
    throw new Error('Email service not configured. Set SMTP_USER and SMTP_PASS environment variables.');
  }

  const mailOptions = {
    from: from || process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text: text || html?.replace(/<[^>]*>/g, '') // Strip HTML for text version
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

/**
 * Send a test email
 */
export async function sendTestEmail(to, customContent = null) {
  const subject = customContent?.subject || '🧪 Test Email from Lead Pipeline';
  
  const html = customContent?.html || `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; border: 1px solid #334155; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #0ea5e9, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .badge { display: inline-block; background: #0ea5e9; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-top: 10px; }
        h1 { color: #f1f5f9; font-size: 24px; margin: 0 0 20px 0; }
        p { color: #94a3b8; line-height: 1.6; margin: 0 0 15px 0; }
        .highlight { color: #0ea5e9; font-weight: 600; }
        .cta { display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155; }
        .footer p { font-size: 12px; color: #64748b; }
        .timestamp { background: #1e293b; padding: 10px 15px; border-radius: 8px; font-family: monospace; font-size: 14px; color: #94a3b8; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <div class="logo">⚡ Lead Pipeline</div>
            <span class="badge">Test Email</span>
          </div>
          
          <h1>Email Test Successful! ✅</h1>
          
          <p>Great news! Your email configuration is working correctly. This test email was sent from your <span class="highlight">Lead Pipeline</span> platform.</p>
          
          <p>You can now:</p>
          <ul style="color: #94a3b8; line-height: 2;">
            <li>Send automated emails to new leads</li>
            <li>Create email sequences and campaigns</li>
            <li>Track email engagement</li>
          </ul>
          
          <div class="timestamp">
            📧 Sent to: ${to}<br>
            🕐 Time: ${new Date().toISOString()}
          </div>
          
          <div class="footer">
            <p>This is a test email from Lead Pipeline Platform</p>
            <p>Webhook Dashboard • Email Automation • Lead Management</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Send email sequence (multiple emails with delays)
 * For testing purposes, sends immediately with sequence info
 */
export async function sendEmailSequence(to, sequence) {
  const results = [];
  
  for (let i = 0; i < sequence.length; i++) {
    const step = sequence[i];
    const subject = step.subject || `Email ${i + 1} of ${sequence.length}`;
    
    const html = step.html || `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; border: 1px solid #334155; }
          .step-badge { display: inline-block; background: linear-gradient(135deg, #d946ef, #a21caf); color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px; }
          h1 { color: #f1f5f9; font-size: 24px; margin: 0 0 20px 0; }
          p { color: #94a3b8; line-height: 1.6; margin: 0 0 15px 0; }
          .content { background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <span class="step-badge">Step ${i + 1} of ${sequence.length}</span>
            <h1>${subject}</h1>
            <div class="content">
              <p>${step.content || 'This is a test email from your sequence.'}</p>
            </div>
            <p style="font-size: 14px; color: #64748b;">
              ${step.delay ? `⏱️ In production, this would be sent after ${step.delay}` : '📧 Sent immediately for testing'}
            </p>
            <div class="footer">
              <p>Lead Pipeline • Email Sequence Test</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const result = await sendEmail({ to, subject, html });
      results.push({ step: i + 1, success: true, ...result });
    } catch (error) {
      results.push({ step: i + 1, success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig() {
  if (!transporter) {
    return { configured: false, error: 'Email service not configured' };
  }

  try {
    await transporter.verify();
    return { configured: true, verified: true };
  } catch (error) {
    return { configured: true, verified: false, error: error.message };
  }
}

export default {
  initEmailService,
  isEmailConfigured,
  sendEmail,
  sendTestEmail,
  sendEmailSequence,
  verifyEmailConfig
};
