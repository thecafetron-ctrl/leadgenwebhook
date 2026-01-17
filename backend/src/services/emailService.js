/**
 * Email Service - Using Resend API
 * 
 * Resend is an HTTP-based email API that works on Railway (no SMTP blocking).
 * ROTATES between two email addresses to avoid spam filters.
 * 
 * Environment Variables:
 * - RESEND_API_KEY: Your Resend API key (get it from resend.com)
 * - EMAIL_FROM_1: First sender email (haarith@structurelogistics.com)
 * - EMAIL_FROM_2: Second sender email (sales@structurelogistics.com)
 * 
 * OR for backwards compatibility:
 * - SMTP_USER: Primary email
 * - SMTP_USER_2: Secondary email
 */

import { Resend } from 'resend';

let resend = null;
let emailAccounts = [];

/**
 * Initialize email service
 */
export function initEmailService() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ RESEND_API_KEY not set - email service disabled');
    console.log('   Get a free API key at https://resend.com');
    return false;
  }

  resend = new Resend(apiKey);

  // Get email addresses from env
  const email1 = process.env.EMAIL_FROM_1 || process.env.SMTP_USER || 'haarith@structurelogistics.com';
  const email2 = process.env.EMAIL_FROM_2 || process.env.SMTP_USER_2 || 'sales@structurelogistics.com';

  emailAccounts = [
    { from: email1, name: 'Haarith Imran' },    // Initial emails (step 1)
    { from: email2, name: 'Haarith Imran' }     // Reminders & follow-ups (step 2+)
  ];

  console.log('✅ Email service initialized with Resend API');
  console.log(`   Account 1: ${email1}`);
  console.log(`   Account 2: ${email2}`);
  
  return true;
}

/**
 * Get email account for sending
 * 
 * From Haarith (haarith@structurelogistics.com):
 * - Welcome/Initial emails
 * - Value emails
 * - Booking confirmations
 * 
 * From Sales (sales@structurelogistics.com):
 * - Meeting reminders (24hr, 6hr, 1hr)
 * - No-show rebooking
 */
function getEmailAccount(stepOrder = 1, isReminder = false) {
  if (emailAccounts.length === 0) return null;
  if (emailAccounts.length === 1) return emailAccounts[0];
  
  // Only reminders use sales@ account
  // Everything else (welcome, value, confirmation) uses haarith@
  return isReminder ? emailAccounts[1] : emailAccounts[0];
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured() {
  return resend !== null;
}

/**
 * Send a single email
 * @param isReminder - If true, uses sales@ account for reminders
 */
export async function sendEmail({ to, subject, html, text, from, stepOrder = 1, isReminder = false }) {
  if (!resend) {
    throw new Error('Email service not configured. Set RESEND_API_KEY environment variable.');
  }

  const account = getEmailAccount(stepOrder);
  const fromAddress = from || `${account.name} <${account.from}>`;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html,
      text: text || html?.replace(/<[^>]*>/g, '')
    });

    if (error) {
      console.error(`Email send error:`, error);
      throw new Error(error.message);
    }

    console.log(`📧 Email sent via Resend (${account.from}):`, data.id);
    return {
      success: true,
      messageId: data.id,
      sentFrom: account.from
    };
  } catch (error) {
    console.error(`Email send error:`, error);
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
        .timestamp { background: #1e293b; padding: 10px 15px; border-radius: 8px; font-family: monospace; font-size: 14px; color: #94a3b8; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155; }
        .footer p { font-size: 12px; color: #64748b; }
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
          
          <p>Great news! Your email configuration is working correctly. This test email was sent from your <span class="highlight">Lead Pipeline</span> platform using Resend.</p>
          
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
            <p>Powered by Resend</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Send email sequence (for testing)
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
            <div class="footer">
              <p>Lead Pipeline • Email Sequence Test</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const result = await sendEmail({ to, subject, html, stepOrder: i + 1 });
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
  if (!resend) {
    return { 
      configured: false, 
      error: 'RESEND_API_KEY not set',
      instructions: 'Get a free API key at https://resend.com'
    };
  }

  return { 
    configured: true, 
    provider: 'Resend',
    accounts: emailAccounts.length,
    primary: emailAccounts[0]?.from,
    secondary: emailAccounts[1]?.from || null
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
