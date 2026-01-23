/**
 * Email Service - Using Resend API (BULLETPROOF VERSION)
 * 
 * CRITICAL: This service handles all email sending with spam protection.
 * 
 * Features:
 * - Round-robin rotation across 5 email accounts
 * - Persistent counter in database (survives restarts)
 * - Automatic retry with fallback to next account on failure
 * - Full logging of which account sent each email
 * - Real-time stats tracking
 * 
 * Email Accounts (in rotation order):
 * 1. haarith@structurelogistics.com (primary)
 * 2. sales@structurelogistics.com (primary)
 * 3. haarith@structureai.site
 * 4. info@structureai.site
 * 5. bookings@structureai.site
 */

import { Resend } from 'resend';
import { query } from '../database/connection.js';

let resend = null;
let emailAccounts = [];
let emailSendCounter = 0;
let isInitialized = false;

// Define all 5 email accounts with their configs
const EMAIL_ACCOUNTS_CONFIG = [
  { env: 'EMAIL_FROM_1', default: 'haarith@structurelogistics.com', name: 'Haarith Imran', priority: 'primary' },
  { env: 'EMAIL_FROM_2', default: 'sales@structurelogistics.com', name: 'Haarith Imran', priority: 'primary' },
  { env: 'EMAIL_FROM_3', default: 'haarith@structureai.site', name: 'Haarith Imran', priority: 'secondary' },
  { env: 'EMAIL_FROM_4', default: 'info@structureai.site', name: 'Haarith Imran', priority: 'secondary' },
  { env: 'EMAIL_FROM_5', default: 'bookings@structureai.site', name: 'Haarith Imran', priority: 'secondary' }
];

/**
 * Initialize email service
 * Loads counter from database to persist across restarts
 */
export async function initEmailService() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ RESEND_API_KEY not set - email service disabled');
    console.log('   Get a free API key at https://resend.com');
    return false;
  }

  resend = new Resend(apiKey);

  // Build email accounts from config
  emailAccounts = EMAIL_ACCOUNTS_CONFIG.map((config, index) => ({
    from: process.env[config.env] || config.default,
    name: config.name,
    priority: config.priority,
    index: index,
    sendCount: 0,
    lastUsed: null,
    failures: 0
  }));

  // Load counter from database (persists across restarts)
  try {
    await loadCounterFromDatabase();
  } catch (err) {
    console.log('   ⚠️ Could not load email counter from DB, starting fresh');
    emailSendCounter = 0;
  }

  isInitialized = true;

  console.log('✅ Email service initialized with Resend API');
  console.log(`   📧 ${emailAccounts.length} sender accounts configured for rotation:`);
  emailAccounts.forEach((acc, i) => {
    console.log(`      ${i + 1}. ${acc.from} (${acc.priority})`);
  });
  console.log(`   🔄 Current rotation position: ${emailSendCounter % emailAccounts.length + 1}`);
  console.log(`   📊 Total emails sent: ${emailSendCounter}`);
  
  return true;
}

/**
 * Load email send counter from database
 * Creates the settings row if it doesn't exist
 */
async function loadCounterFromDatabase() {
  try {
    // Try to get existing counter
    const result = await query(`
      SELECT value FROM system_settings WHERE key = 'email_send_counter'
    `);
    
    if (result.rows.length > 0) {
      emailSendCounter = parseInt(result.rows[0].value) || 0;
      console.log(`   📊 Loaded email counter from DB: ${emailSendCounter}`);
    } else {
      // Create the setting if it doesn't exist
      await query(`
        INSERT INTO system_settings (key, value, description)
        VALUES ('email_send_counter', '0', 'Round-robin counter for email rotation')
        ON CONFLICT (key) DO NOTHING
      `);
      emailSendCounter = 0;
    }
  } catch (err) {
    // Table might not exist yet, that's ok
    console.log('   ⚠️ system_settings table not ready, using memory counter');
    emailSendCounter = 0;
  }
}

/**
 * Save email send counter to database
 */
async function saveCounterToDatabase() {
  try {
    await query(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('email_send_counter', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()
    `, [emailSendCounter.toString()]);
  } catch (err) {
    // Non-critical, just log
    console.error('   ⚠️ Could not save email counter to DB:', err.message);
  }
}

/**
 * Get next email account for sending (round-robin)
 * Returns the account and increments counter
 */
function getNextEmailAccount() {
  if (emailAccounts.length === 0) {
    throw new Error('No email accounts configured');
  }
  
  const accountIndex = emailSendCounter % emailAccounts.length;
  const account = emailAccounts[accountIndex];
  
  // Increment counter BEFORE returning (ensures next call gets next account)
  emailSendCounter++;
  
  // Update account stats
  account.sendCount++;
  account.lastUsed = new Date();
  
  return { account, accountIndex };
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured() {
  return resend !== null && isInitialized;
}

/**
 * Send a single email with automatic rotation and retry
 * 
 * BULLETPROOF FEATURES:
 * - Uses round-robin rotation automatically
 * - Retries with next account if current fails
 * - Logs which account was used
 * - Persists counter to database
 * 
 * @param to - Recipient email
 * @param subject - Email subject
 * @param html - HTML body
 * @param text - Plain text (optional, auto-generated from HTML)
 * @param from - Override sender (optional, uses rotation if not set)
 */
export async function sendEmail({ to, subject, html, text, from }) {
  if (!resend) {
    throw new Error('Email service not configured. Set RESEND_API_KEY environment variable.');
  }

  if (!to || !subject) {
    throw new Error('Missing required fields: to and subject');
  }

  // If custom 'from' is provided, use it directly (no rotation)
  if (from) {
    return await sendWithAccount({ to, subject, html, text, from }, null);
  }

  // Get next account from rotation
  const { account, accountIndex } = getNextEmailAccount();
  const fromAddress = `${account.name} <${account.from}>`;
  
  // Try to send with current account
  try {
    const result = await sendWithAccount({ to, subject, html, text, from: fromAddress }, account);
    
    // Save counter to database after successful send
    await saveCounterToDatabase();
    
    return result;
  } catch (error) {
    console.error(`❌ Failed with account ${account.from}:`, error.message);
    account.failures++;
    
    // RETRY: Try with next 2 accounts before giving up
    for (let retry = 1; retry <= 2; retry++) {
      const retryAccountIndex = (accountIndex + retry) % emailAccounts.length;
      const retryAccount = emailAccounts[retryAccountIndex];
      const retryFromAddress = `${retryAccount.name} <${retryAccount.from}>`;
      
      console.log(`🔄 Retry ${retry}/2: Trying account ${retryAccount.from}...`);
      
      try {
        const result = await sendWithAccount({ to, subject, html, text, from: retryFromAddress }, retryAccount);
        
        // Update stats for retry account
        retryAccount.sendCount++;
        retryAccount.lastUsed = new Date();
        
        // Save counter (we still increment even on retry)
        await saveCounterToDatabase();
        
        return result;
      } catch (retryError) {
        console.error(`❌ Retry ${retry} failed with ${retryAccount.from}:`, retryError.message);
        retryAccount.failures++;
      }
    }
    
    // All retries failed
    throw new Error(`Email send failed after 3 attempts. Last error: ${error.message}`);
  }
}

/**
 * Internal: Actually send the email via Resend
 */
async function sendWithAccount({ to, subject, html, text, from }, account) {
  const startTime = Date.now();
  
  const { data, error } = await resend.emails.send({
    from: from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text: text || html?.replace(/<[^>]*>/g, '')
  });

  if (error) {
    throw new Error(error.message);
  }

  const duration = Date.now() - startTime;
  const accountEmail = account?.from || from;
  
  console.log(`📧 Email sent successfully:`);
  console.log(`   → To: ${to}`);
  console.log(`   → From: ${accountEmail}`);
  console.log(`   → Subject: ${subject.substring(0, 50)}${subject.length > 50 ? '...' : ''}`);
  console.log(`   → Resend ID: ${data.id}`);
  console.log(`   → Duration: ${duration}ms`);
  console.log(`   → Rotation position: ${emailSendCounter} (next: account ${(emailSendCounter % emailAccounts.length) + 1})`);

  return {
    success: true,
    messageId: data.id,
    sentFrom: accountEmail,
    rotationPosition: emailSendCounter,
    duration
  };
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
    rotationMode: 'round-robin',
    accountCount: emailAccounts.length,
    accounts: emailAccounts.map(a => ({
      email: a.from,
      priority: a.priority,
      sendCount: a.sendCount,
      failures: a.failures,
      lastUsed: a.lastUsed
    })),
    totalSent: emailSendCounter,
    nextAccount: emailAccounts[emailSendCounter % emailAccounts.length]?.from,
    nextAccountIndex: (emailSendCounter % emailAccounts.length) + 1
  };
}

/**
 * Get current email rotation stats (for monitoring/debugging)
 */
export function getRotationStats() {
  return {
    totalSent: emailSendCounter,
    accountCount: emailAccounts.length,
    currentPosition: emailSendCounter % emailAccounts.length,
    nextAccount: emailAccounts[emailSendCounter % emailAccounts.length]?.from,
    accounts: emailAccounts.map((acc, i) => ({
      index: i + 1,
      email: acc.from,
      priority: acc.priority,
      sendCount: acc.sendCount,
      failures: acc.failures,
      lastUsed: acc.lastUsed,
      isNext: i === emailSendCounter % emailAccounts.length
    })),
    distribution: emailAccounts.map((acc, i) => {
      const expected = Math.floor(emailSendCounter / emailAccounts.length) + 
                      (i < emailSendCounter % emailAccounts.length ? 1 : 0);
      return {
        email: acc.from,
        expected,
        actual: acc.sendCount,
        variance: acc.sendCount - expected
      };
    })
  };
}

/**
 * Reset rotation counter (admin function)
 */
export async function resetRotationCounter() {
  emailSendCounter = 0;
  emailAccounts.forEach(acc => {
    acc.sendCount = 0;
    acc.failures = 0;
    acc.lastUsed = null;
  });
  await saveCounterToDatabase();
  console.log('🔄 Email rotation counter reset to 0');
  return { success: true, newCounter: 0 };
}

export default {
  initEmailService,
  isEmailConfigured,
  sendEmail,
  sendTestEmail,
  sendEmailSequence,
  verifyEmailConfig,
  getRotationStats,
  resetRotationCounter
};
