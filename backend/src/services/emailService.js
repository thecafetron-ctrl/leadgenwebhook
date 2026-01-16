/**
 * Email Service
 * 
 * Handles sending emails using Nodemailer.
 * ROTATES between two SMTP accounts to avoid spam filters.
 * 
 * Environment Variables (Account 1 - Primary):
 * - SMTP_HOST: SMTP server host
 * - SMTP_PORT: SMTP server port (default: 465)
 * - SMTP_SECURE: Use TLS (true for 465)
 * - SMTP_USER: Primary email (haarith@structurelogistics.com)
 * - SMTP_PASS: Primary password
 * 
 * Environment Variables (Account 2 - Secondary):
 * - SMTP_USER_2: Secondary email (sales@structurelogistics.com)
 * - SMTP_PASS_2: Secondary password
 */

import nodemailer from 'nodemailer';

// Two transporters for rotation
let transporter1 = null;  // haarith@
let transporter2 = null;  // sales@
let emailAccounts = [];

/**
 * Initialize email transporters (both accounts)
 */
export function initEmailService() {
  const host = process.env.SMTP_HOST || 'mail.spacemail.com';
  // Try port 587 (STARTTLS) first, then fall back to 465 (SSL)
  const port = parseInt(process.env.SMTP_PORT) || 587;
  // secure should be false for port 587 (STARTTLS), true for port 465
  const secure = port === 465;

  console.log(`📧 Initializing email with: host=${host}, port=${port}, secure=${secure}`);

  // Account 1: haarith@structurelogistics.com
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter1 = nodemailer.createTransport({
      host, 
      port, 
      secure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false // Allow self-signed certs
      }
    });
    emailAccounts.push({
      transporter: transporter1,
      from: process.env.SMTP_USER,
      name: 'STRUCTURE Team'
    });
    console.log('✅ Email account 1 initialized:', process.env.SMTP_USER);
  } else {
    console.log('⚠️ Email account 1 NOT configured - SMTP_USER:', process.env.SMTP_USER ? 'set' : 'MISSING', 'SMTP_PASS:', process.env.SMTP_PASS ? 'set' : 'MISSING');
  }

  // Account 2: sales@structurelogistics.com
  if (process.env.SMTP_USER_2 && process.env.SMTP_PASS_2) {
    transporter2 = nodemailer.createTransport({
      host, 
      port, 
      secure,
      auth: { user: process.env.SMTP_USER_2, pass: process.env.SMTP_PASS_2 },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false
      }
    });
    emailAccounts.push({
      transporter: transporter2,
      from: process.env.SMTP_USER_2,
      name: 'STRUCTURE Sales'
    });
    console.log('✅ Email account 2 initialized:', process.env.SMTP_USER_2);
  } else {
    console.log('⚠️ Email account 2 NOT configured - SMTP_USER_2:', process.env.SMTP_USER_2 ? 'set' : 'MISSING');
  }

  if (emailAccounts.length === 0) {
    console.log('❌ Email service NOT configured (missing SMTP credentials)');
    console.log('   Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
    return false;
  }

  console.log(`✅ Email service ready with ${emailAccounts.length} account(s) for rotation`);
  return true;
}

/**
 * Get email account for sending (rotates based on step number)
 * Steps 1-12: Account 1 (haarith@)
 * Steps 13-24: Account 2 (sales@)
 */
function getEmailAccount(stepNumber = 1) {
  if (emailAccounts.length === 0) return null;
  if (emailAccounts.length === 1) return emailAccounts[0];
  
  // Rotate at halfway point (step 12)
  const useSecondAccount = stepNumber > 12;
  return useSecondAccount ? emailAccounts[1] : emailAccounts[0];
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured() {
  return emailAccounts.length > 0;
}

/**
 * Send a single email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body (optional)
 * @param {string} options.from - From address (optional, uses rotation)
 * @param {number} options.stepOrder - Sequence step number for rotation (1-24)
 */
export async function sendEmail({ to, subject, html, text, from, stepOrder = 1 }) {
  const account = getEmailAccount(stepOrder);
  
  if (!account) {
    throw new Error('Email service not configured. Set SMTP_USER and SMTP_PASS environment variables.');
  }

  const mailOptions = {
    from: from || `"${account.name}" <${account.from}>`,
    to,
    subject,
    html,
    text: text || html?.replace(/<[^>]*>/g, '') // Strip HTML for text version
  };

  try {
    const info = await account.transporter.sendMail(mailOptions);
    console.log(`📧 Email sent via ${account.from}:`, info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      sentFrom: account.from
    };
  } catch (error) {
    console.error(`Email send error (${account.from}):`, error);
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
 * Verify email configuration (non-blocking)
 */
export async function verifyEmailConfig() {
  if (emailAccounts.length === 0) {
    return { 
      configured: false, 
      error: 'Email service not configured - check SMTP_USER and SMTP_PASS env vars',
      envCheck: {
        SMTP_HOST: process.env.SMTP_HOST ? 'set' : 'missing',
        SMTP_USER: process.env.SMTP_USER ? 'set' : 'missing',
        SMTP_PASS: process.env.SMTP_PASS ? 'set' : 'missing',
        SMTP_USER_2: process.env.SMTP_USER_2 ? 'set' : 'missing',
        SMTP_PASS_2: process.env.SMTP_PASS_2 ? 'set' : 'missing'
      }
    };
  }

  // Don't actually verify (it can timeout) - just return config status
  return { 
    configured: true, 
    accounts: emailAccounts.length,
    primary: emailAccounts[0]?.from,
    secondary: emailAccounts[1]?.from || null,
    host: process.env.SMTP_HOST || 'mail.spacemail.com',
    port: process.env.SMTP_PORT || '465'
  };
}

export default {
  initEmailService,
  isEmailConfigured,
  sendEmail,
  sendTestEmail,
  sendEmailSequence,
  verifyEmailConfig
};
