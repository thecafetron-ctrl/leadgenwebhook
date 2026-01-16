/**
 * Sequence Automation Service
 * 
 * CRITICAL SERVICE - Handles all email/WhatsApp sequence logic.
 * 
 * Key responsibilities:
 * - Enroll leads in sequences
 * - Schedule messages based on step delays
 * - Process message queue
 * - PREVENT DUPLICATE SENDS (most important!)
 * - Handle sequence transitions (new_lead -> booked -> no_show)
 */

import { query } from '../database/connection.js';
import { sendEmail } from './emailService.js';
import { sendWhatsApp } from './whatsappService.js';
import { 
  VALUE_EMAILS, 
  CLOSING_EMAILS,
  CALENDAR_LINK, 
  OPERATIONAL_EMAILS,
  WHATSAPP_MESSAGES 
} from '../data/emailTemplates.js';

/**
 * Get email content for a specific step based on step name and order
 * Returns { subject, body, whatsapp } or null if no match
 */
function getTemplateForStep(stepName, stepOrder, sequenceSlug) {
  const name = stepName.toLowerCase();
  
  // Welcome / Calendar step (step 1)
  if (name.includes('welcome') || name.includes('calendar')) {
    return {
      subject: OPERATIONAL_EMAILS.welcome_calendar.subject,
      body: OPERATIONAL_EMAILS.welcome_calendar.body,
      whatsapp: WHATSAPP_MESSAGES.welcome
    };
  }
  
  // Meeting confirmation
  if (name.includes('confirmation')) {
    return {
      subject: OPERATIONAL_EMAILS.meeting_confirmation.subject,
      body: OPERATIONAL_EMAILS.meeting_confirmation.body,
      whatsapp: WHATSAPP_MESSAGES.meeting_confirmation
    };
  }
  
  // Reminder emails
  if (name.includes('24hr reminder') || name.includes('24 hour')) {
    return {
      subject: 'Reminder: Your automation consultation is tomorrow',
      body: `Hi {{first_name}},

Just a quick reminder that your 45-minute automation consultation with STRUCTURE is scheduled for tomorrow.

Please make sure you have a quiet space with stable internet. We will be diving into your logistics operations in detail.

If you need to reschedule, please use the link in your calendar invite.

Looking forward to speaking with you.

Best regards,
STRUCTURE Team`,
      whatsapp: WHATSAPP_MESSAGES.reminder_24hr
    };
  }
  
  if (name.includes('6hr reminder') || name.includes('6 hour')) {
    return {
      subject: 'Your consultation is in 6 hours',
      body: `Hi {{first_name}},

Your automation consultation with STRUCTURE is coming up in about 6 hours.

Make sure you have the meeting link ready and a quiet space to talk.

See you soon.

Best regards,
STRUCTURE Team`,
      whatsapp: WHATSAPP_MESSAGES.reminder_24hr
    };
  }
  
  if (name.includes('1hr reminder') || name.includes('1 hour')) {
    return {
      subject: 'Starting in 1 hour',
      body: `Hi {{first_name}},

Your automation consultation with STRUCTURE starts in about an hour.

Make sure you're ready and have your meeting link handy.

See you shortly.

Best regards,
STRUCTURE Team`,
      whatsapp: WHATSAPP_MESSAGES.reminder_1hr
    };
  }
  
  // No-show / Rebooking
  if (name.includes('no show') || name.includes('no-show') || name.includes('rebook')) {
    return {
      subject: OPERATIONAL_EMAILS.no_show_rebook.subject,
      body: OPERATIONAL_EMAILS.no_show_rebook.body,
      whatsapp: WHATSAPP_MESSAGES.no_show
    };
  }
  
  // Schedule Meeting CTA (step 6 of new_lead)
  if (name.includes('schedule meeting') || name.includes('cta')) {
    return {
      subject: 'Have you had a chance to schedule your consultation?',
      body: `Hi {{first_name}},

Following up on your automation interest.

We haven't seen a consultation scheduled yet. If automation is still something you're actively exploring, the next step is a 45-minute session where we review your workflows and assess fit.

No pressure either way.

If you'd like to move forward, you can book a time <b><a href="${CALENDAR_LINK}">here</a></b>.

Best regards,
STRUCTURE Team`
    };
  }
  
  // No match - return null (will fall back to value email)
  return null;
}

/**
 * Convert delay to milliseconds
 */
function delayToMs(value, unit) {
  const multipliers = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000
  };
  return value * (multipliers[unit] || multipliers.minutes);
}

/**
 * Get next unsent value email for a lead
 * This ensures we never send the same value email twice to the same lead
 */
async function getNextValueEmailForLead(leadId) {
  // Get all value email IDs that have been sent to this lead
  const sentResult = await query(`
    SELECT DISTINCT metadata->>'value_email_id' as email_id
    FROM sent_messages
    WHERE lead_id = $1 
    AND metadata->>'value_email_id' IS NOT NULL
  `, [leadId]);
  
  const sentEmailIds = new Set(sentResult.rows.map(r => r.email_id));
  
  // Find value emails not yet sent
  const availableEmails = VALUE_EMAILS.filter(e => !sentEmailIds.has(e.id));
  
  if (availableEmails.length === 0) {
    // All emails sent - pick random from full list (cycle)
    const randomIndex = Math.floor(Math.random() * VALUE_EMAILS.length);
    return VALUE_EMAILS[randomIndex];
  }
  
  // Randomize from available emails
  const randomIndex = Math.floor(Math.random() * availableEmails.length);
  return availableEmails[randomIndex];
}

/**
 * Calculate scheduled time for a step
 */
function calculateScheduledTime(enrolledAt, delayValue, delayUnit, meetingTime = null) {
  const baseTime = meetingTime ? new Date(meetingTime) : new Date(enrolledAt);
  const delayMs = delayToMs(delayValue, delayUnit);
  return new Date(baseTime.getTime() + delayMs);
}

// ==========================================
// SEQUENCE MANAGEMENT
// ==========================================

/**
 * Get all sequences
 */
export async function getSequences() {
  const result = await query(`
    SELECT s.*, 
           COUNT(ss.id) as step_count,
           COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'active') as active_leads
    FROM sequences s
    LEFT JOIN sequence_steps ss ON s.id = ss.sequence_id
    LEFT JOIN lead_sequences ls ON s.id = ls.sequence_id
    GROUP BY s.id
    ORDER BY s.created_at
  `);
  return result.rows;
}

/**
 * Get sequence by slug
 */
export async function getSequenceBySlug(slug) {
  const result = await query('SELECT * FROM sequences WHERE slug = $1', [slug]);
  return result.rows[0] || null;
}

/**
 * Get sequence steps
 */
export async function getSequenceSteps(sequenceId) {
  const result = await query(`
    SELECT * FROM sequence_steps 
    WHERE sequence_id = $1 
    ORDER BY step_order
  `, [sequenceId]);
  return result.rows;
}

/**
 * Update sequence step content
 */
export async function updateSequenceStep(stepId, updates) {
  const { email_subject, email_body, whatsapp_message, is_active } = updates;
  
  const result = await query(`
    UPDATE sequence_steps 
    SET email_subject = COALESCE($1, email_subject),
        email_body = COALESCE($2, email_body),
        whatsapp_message = COALESCE($3, whatsapp_message),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
    WHERE id = $5
    RETURNING *
  `, [email_subject, email_body, whatsapp_message, is_active, stepId]);
  
  return result.rows[0];
}

// ==========================================
// LEAD ENROLLMENT
// ==========================================

/**
 * Enroll a lead in a sequence
 * CRITICAL: Checks for existing enrollment first
 */
export async function enrollLead(leadId, sequenceSlug, options = {}) {
  const { meetingTime, enrolledBy = 'system' } = options;
  
  // Get sequence
  const sequence = await getSequenceBySlug(sequenceSlug);
  if (!sequence) {
    throw new Error(`Sequence not found: ${sequenceSlug}`);
  }
  
  // Check if already enrolled in this sequence
  const existing = await query(
    'SELECT * FROM lead_sequences WHERE lead_id = $1 AND sequence_id = $2',
    [leadId, sequence.id]
  );
  
  if (existing.rows.length > 0) {
    const enrollment = existing.rows[0];
    // If already active, don't re-enroll
    if (enrollment.status === 'active') {
      console.log(`Lead ${leadId} already active in sequence ${sequenceSlug}`);
      return enrollment;
    }
    // If completed/cancelled, could re-enroll (update status)
  }
  
  // Create enrollment
  const result = await query(`
    INSERT INTO lead_sequences (lead_id, sequence_id, meeting_time, enrolled_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (lead_id, sequence_id) 
    DO UPDATE SET 
      status = 'active',
      current_step = 0,
      enrolled_at = NOW(),
      meeting_time = COALESCE($3, lead_sequences.meeting_time),
      paused_at = NULL,
      completed_at = NULL,
      cancelled_at = NULL,
      updated_at = NOW()
    RETURNING *
  `, [leadId, sequence.id, meetingTime, enrolledBy]);
  
  const enrollment = result.rows[0];
  
  // Schedule all messages for this sequence
  await scheduleSequenceMessages(enrollment.id, sequence.id, enrollment.enrolled_at, meetingTime);
  
  console.log(`✅ Lead ${leadId} enrolled in sequence ${sequenceSlug}`);
  
  // CRITICAL: Immediately process any messages due now (delay=0)
  // Don't wait for scheduler - send welcome message RIGHT NOW
  try {
    const processed = await processMessageQueue();
    console.log(`⚡ Immediately processed ${processed} messages after enrollment`);
  } catch (processError) {
    console.error('Failed to process immediate messages:', processError);
  }
  
  return enrollment;
}

/**
 * Schedule all messages for a sequence enrollment
 */
async function scheduleSequenceMessages(enrollmentId, sequenceId, enrolledAt, meetingTime) {
  const steps = await getSequenceSteps(sequenceId);
  
  for (const step of steps) {
    if (!step.is_active) continue;
    
    const scheduledFor = calculateScheduledTime(
      enrolledAt,
      step.delay_value,
      step.delay_unit,
      meetingTime
    );
    
    // Get lead_id from enrollment
    const enrollment = await query('SELECT lead_id FROM lead_sequences WHERE id = $1', [enrollmentId]);
    const leadId = enrollment.rows[0].lead_id;
    
    // Schedule email if channel includes email
    if (step.channel === 'email' || step.channel === 'both') {
      await scheduleMessage(leadId, enrollmentId, step.id, 'email', scheduledFor);
    }
    
    // Schedule WhatsApp if channel includes whatsapp
    if (step.channel === 'whatsapp' || step.channel === 'both') {
      await scheduleMessage(leadId, enrollmentId, step.id, 'whatsapp', scheduledFor);
    }
  }
}

/**
 * Schedule a single message
 */
async function scheduleMessage(leadId, enrollmentId, stepId, channel, scheduledFor) {
  // Check if already scheduled or sent
  const existing = await query(`
    SELECT id FROM message_queue 
    WHERE lead_sequence_id = $1 AND sequence_step_id = $2 AND channel = $3
  `, [enrollmentId, stepId, channel]);
  
  if (existing.rows.length > 0) {
    return; // Already scheduled
  }
  
  // Check if already sent
  const sent = await query(`
    SELECT id FROM sent_messages 
    WHERE lead_id = $1 AND sequence_step_id = $2 AND channel = $3
  `, [leadId, stepId, channel]);
  
  if (sent.rows.length > 0) {
    return; // Already sent - NEVER SEND TWICE
  }
  
  // Add to queue
  await query(`
    INSERT INTO message_queue (lead_id, lead_sequence_id, sequence_step_id, channel, scheduled_for)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (lead_sequence_id, sequence_step_id, channel) DO NOTHING
  `, [leadId, enrollmentId, stepId, channel, scheduledFor]);
}

// ==========================================
// SEQUENCE TRANSITIONS
// ==========================================

/**
 * When a lead books a meeting
 * - Cancel current sequence
 * - Enroll in meeting_booked sequence
 * - Move to newsletter after meeting
 */
export async function onMeetingBooked(leadId, meetingTime) {
  // Cancel any active new_lead sequence
  await cancelLeadSequence(leadId, 'new_lead', 'Meeting booked');
  await cancelLeadSequence(leadId, 'no_show', 'Meeting booked');
  
  // Enroll in meeting_booked sequence
  await enrollLead(leadId, 'meeting_booked', { meetingTime, enrolledBy: 'webhook' });
  
  // Update lead status
  await query(
    'UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2',
    ['qualified', leadId]
  );
  
  console.log(`📅 Lead ${leadId} booked meeting for ${meetingTime}`);
}

/**
 * When a lead is a no-show
 */
export async function onNoShow(leadId) {
  // Cancel meeting sequence
  await cancelLeadSequence(leadId, 'meeting_booked', 'No show');
  
  // Enroll in no_show sequence
  await enrollLead(leadId, 'no_show', { enrolledBy: 'system' });
  
  // Update lead status
  await query(
    'UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2',
    ['contacted', leadId]
  );
  
  console.log(`❌ Lead ${leadId} marked as no-show`);
}

/**
 * When a meeting is completed successfully
 */
export async function onMeetingCompleted(leadId) {
  // Cancel all sequences
  await cancelAllSequences(leadId, 'Meeting completed');
  
  // Add to newsletter
  await addToNewsletter(leadId, 'meeting_completed');
  
  // Update lead status
  await query(
    'UPDATE leads SET status = $1, converted_at = NOW(), updated_at = NOW() WHERE id = $2',
    ['converted', leadId]
  );
  
  console.log(`✅ Lead ${leadId} meeting completed - added to newsletter`);
}

/**
 * Manually send a specific step to a lead
 * TAMPERPROOF: Won't duplicate - if already sent, skips. Auto will move to next.
 */
export async function manualSendStep(leadId, stepId) {
  // Get step details
  const stepResult = await query('SELECT * FROM sequence_steps WHERE id = $1', [stepId]);
  const step = stepResult.rows[0];
  if (!step) throw new Error('Step not found');
  
  // Get lead details
  const leadResult = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
  const lead = leadResult.rows[0];
  if (!lead) throw new Error('Lead not found');
  
  // Check if already sent
  const alreadySent = await query(`
    SELECT id FROM sent_messages 
    WHERE lead_id = $1 AND sequence_step_id = $2
  `, [leadId, stepId]);
  
  if (alreadySent.rows.length > 0) {
    return { 
      success: false, 
      message: 'Already sent - automatic sequence will skip to next step',
      alreadySent: true 
    };
  }
  
  // Get enrollment
  const enrollmentResult = await query(`
    SELECT ls.* FROM lead_sequences ls
    JOIN sequences s ON ls.sequence_id = s.id
    WHERE ls.lead_id = $1 AND s.id = $2
  `, [leadId, step.sequence_id]);
  
  const enrollment = enrollmentResult.rows[0];
  
  // Get template or value email
  let emailSubject = step.email_subject;
  let emailBody = step.email_body;
  let whatsappMessage = step.whatsapp_message;
  let valueEmailId = null;
  
  // 1. First check for a specific template based on step name
  const template = getTemplateForStep(step.name, step.step_order, null);
  if (template) {
    emailSubject = template.subject;
    emailBody = template.body;
    whatsappMessage = template.whatsapp || whatsappMessage;
  }
  // 2. Otherwise, if it's a value email step OR we still don't have content, use value email
  else if (step.name.toLowerCase().includes('value') || !emailSubject) {
    const valueEmail = await getNextValueEmailForLead(leadId);
    if (valueEmail) {
      emailSubject = valueEmail.subject;
      emailBody = valueEmail.body;
      valueEmailId = valueEmail.id;
    }
  }
  
  // Substitute variables using the shared function (includes HTML formatting)
  const content = substituteVariables({
    subject: emailSubject,
    body: emailBody,
    whatsapp: whatsappMessage
  }, {
    first_name: lead.first_name || 'there',
    last_name: lead.last_name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    calendar_link: CALENDAR_LINK
  });
  
  let result = { success: false };
  
  // Send email
  if ((step.channel === 'email' || step.channel === 'both') && lead.email) {
    result = await sendEmail({
      to: lead.email,
      subject: content.subject,
      html: content.body,
      text: content.body?.replace(/<[^>]*>/g, '')
    });
  }
  
  // Send WhatsApp
  if ((step.channel === 'whatsapp' || step.channel === 'both') && lead.phone && content.whatsapp) {
    await sendWhatsApp({ phone: lead.phone, message: content.whatsapp });
  }
  
  // Record sent message
  const metadata = valueEmailId ? JSON.stringify({ value_email_id: valueEmailId, manual: true }) : JSON.stringify({ manual: true });
  
  await query(`
    INSERT INTO sent_messages (
      lead_id, lead_sequence_id, sequence_step_id, channel, message_type,
      subject, body, status, metadata, sent_at
    ) VALUES ($1, $2, $3, $4, 'sequence', $5, $6, 'sent', $7, NOW())
  `, [
    leadId,
    enrollment?.id || null,
    stepId,
    step.channel,
    content.subject,
    content.body,
    metadata
  ]);
  
  // Cancel this from queue if pending (auto will skip)
  if (enrollment) {
    await query(`
      UPDATE message_queue 
      SET status = 'sent'
      WHERE lead_sequence_id = $1 AND sequence_step_id = $2 AND status = 'pending'
    `, [enrollment.id, stepId]);
    
    // Update current step
    await query(`
      UPDATE lead_sequences 
      SET current_step = $1, updated_at = NOW()
      WHERE id = $2
    `, [step.step_order, enrollment.id]);
  }
  
  // Update lead's last_contacted_at
  await query('UPDATE leads SET last_contacted_at = NOW() WHERE id = $1', [leadId]);
  
  console.log(`✅ Manual send: ${step.name} to ${lead.email}`);
  
  return {
    success: true,
    message: `Sent "${step.name}" to ${lead.email}`,
    channel: step.channel,
    stepOrder: step.step_order
  };
}

/**
 * Cancel a specific sequence for a lead
 */
export async function cancelLeadSequence(leadId, sequenceSlug, reason = null) {
  const sequence = await getSequenceBySlug(sequenceSlug);
  if (!sequence) return;
  
  // Update enrollment status
  await query(`
    UPDATE lead_sequences 
    SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = $3, updated_at = NOW()
    WHERE lead_id = $1 AND sequence_id = $2 AND status = 'active'
  `, [leadId, sequence.id, reason]);
  
  // Cancel pending messages
  await query(`
    UPDATE message_queue 
    SET status = 'cancelled'
    WHERE lead_id = $1 AND status = 'pending'
    AND lead_sequence_id IN (SELECT id FROM lead_sequences WHERE sequence_id = $2)
  `, [leadId, sequence.id]);
}

/**
 * Cancel all sequences for a lead
 */
export async function cancelAllSequences(leadId, reason = null) {
  await query(`
    UPDATE lead_sequences 
    SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = $2, updated_at = NOW()
    WHERE lead_id = $1 AND status = 'active'
  `, [leadId, reason]);
  
  await query(`
    UPDATE message_queue 
    SET status = 'cancelled'
    WHERE lead_id = $1 AND status = 'pending'
  `, [leadId]);
}

// ==========================================
// MESSAGE PROCESSING
// ==========================================

/**
 * Process the message queue
 * Called by scheduler every minute
 */
export async function processMessageQueue() {
  // Get messages that are due
  const result = await query(`
    SELECT mq.*, 
           ls.lead_id, ls.status as sequence_status,
           ss.step_order, ss.email_subject, ss.email_body, ss.whatsapp_message,
           l.first_name, l.last_name, l.email, l.phone
    FROM message_queue mq
    JOIN lead_sequences ls ON mq.lead_sequence_id = ls.id
    JOIN sequence_steps ss ON mq.sequence_step_id = ss.id
    JOIN leads l ON mq.lead_id = l.id
    WHERE mq.status = 'pending'
    AND mq.scheduled_for <= NOW()
    AND ls.status = 'active'
    ORDER BY mq.scheduled_for
    LIMIT 50
  `);
  
  const messages = result.rows;
  console.log(`📬 Processing ${messages.length} messages from queue`);
  
  for (const msg of messages) {
    try {
      await processMessage(msg);
    } catch (error) {
      console.error(`Failed to process message ${msg.id}:`, error);
      
      // Update retry count
      await query(`
        UPDATE message_queue 
        SET attempts = attempts + 1, 
            last_attempt_at = NOW(),
            error_message = $2,
            status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END
        WHERE id = $1
      `, [msg.id, error.message]);
    }
  }
  
  return messages.length;
}

/**
 * Process a single message
 */
async function processMessage(msg) {
  // CRITICAL: Check if already sent (double-check)
  const alreadySent = await query(`
    SELECT id FROM sent_messages 
    WHERE lead_id = $1 AND sequence_step_id = $2 AND channel = $3
  `, [msg.lead_id, msg.sequence_step_id, msg.channel]);
  
  if (alreadySent.rows.length > 0) {
    console.log(`⚠️ Message already sent, skipping: ${msg.id}`);
    await query('UPDATE message_queue SET status = $1 WHERE id = $2', ['sent', msg.id]);
    return;
  }
  
  // Mark as processing
  await query('UPDATE message_queue SET status = $1 WHERE id = $2', ['processing', msg.id]);
  
  // Get step name for template lookup
  const stepResult = await query('SELECT name, step_order FROM sequence_steps WHERE id = $1', [msg.sequence_step_id]);
  const stepName = stepResult.rows[0]?.name || '';
  const stepOrder = stepResult.rows[0]?.step_order || msg.step_order || 1;
  
  // Try to get template content first
  let emailSubject = msg.email_subject;
  let emailBody = msg.email_body;
  let whatsappMessage = msg.whatsapp_message;
  let valueEmailId = null;
  
  // 1. First check for a specific template based on step name
  const template = getTemplateForStep(stepName, stepOrder, null);
  if (template) {
    emailSubject = template.subject;
    emailBody = template.body;
    whatsappMessage = template.whatsapp || whatsappMessage;
    console.log(`📧 Using template for step "${stepName}"`);
  }
  // 2. Otherwise, if it's a value email step OR we still don't have content, use value email
  else if (stepName.toLowerCase().includes('value') || !emailSubject) {
    const valueEmail = await getNextValueEmailForLead(msg.lead_id);
    if (valueEmail) {
      emailSubject = valueEmail.subject;
      emailBody = valueEmail.body;
      valueEmailId = valueEmail.id;
      console.log(`📧 Using value email "${valueEmail.id}" for lead ${msg.lead_id}`);
    }
  }
  
  // Prepare content with variable substitution
  const content = substituteVariables({
    subject: emailSubject,
    body: emailBody,
    whatsapp: whatsappMessage
  }, {
    first_name: msg.first_name || 'there',
    last_name: msg.last_name || '',
    email: msg.email,
    phone: msg.phone,
    calendar_link: CALENDAR_LINK
  });
  
  let externalId = null;
  let status = 'sent';
  
  // Send based on channel
  // Email rotation: steps 1-12 use account 1, steps 13-24 use account 2
  if (msg.channel === 'email' && msg.email) {
    const result = await sendEmail({
      to: msg.email,
      subject: content.subject,
      html: content.body,
      text: content.body.replace(/<[^>]*>/g, ''),
      stepNumber: msg.step_order || 1  // For rotation between accounts
    });
    externalId = result.messageId;
    if (!result.success) {
      status = 'failed';
    }
  } else if (msg.channel === 'whatsapp' && msg.phone) {
    const result = await sendWhatsApp({
      phone: msg.phone,
      message: content.whatsapp
    });
    externalId = result.messageId;
    if (!result.success) {
      status = 'failed';
    }
  }
  
  // Build metadata object
  const metadata = valueEmailId ? JSON.stringify({ value_email_id: valueEmailId }) : null;
  
  // Record in sent_messages (CRITICAL)
  await query(`
    INSERT INTO sent_messages (
      lead_id, lead_sequence_id, sequence_step_id, channel, message_type,
      subject, body, status, external_message_id, metadata, sent_at
    ) VALUES ($1, $2, $3, $4, 'sequence', $5, $6, $7, $8, $9, NOW())
  `, [
    msg.lead_id, msg.lead_sequence_id, msg.sequence_step_id, msg.channel,
    content.subject, msg.channel === 'email' ? content.body : content.whatsapp,
    status, externalId, metadata
  ]);
  
  // Update queue status
  await query('UPDATE message_queue SET status = $1 WHERE id = $2', [status, msg.id]);
  
  // Update lead's last_contacted_at
  await query('UPDATE leads SET last_contacted_at = NOW() WHERE id = $1', [msg.lead_id]);
  
  // Update sequence current_step
  await query(`
    UPDATE lead_sequences 
    SET current_step = (
      SELECT step_order FROM sequence_steps WHERE id = $2
    ), updated_at = NOW()
    WHERE id = $1
  `, [msg.lead_sequence_id, msg.sequence_step_id]);
  
  console.log(`✅ Sent ${msg.channel} to ${msg.email || msg.phone}`);
}

/**
 * Substitute variables in content and format for HTML
 */
function substituteVariables(content, variables) {
  const result = {};
  
  for (const [key, value] of Object.entries(content)) {
    if (value) {
      let text = value;
      for (const [varName, varValue] of Object.entries(variables)) {
        text = text.replace(new RegExp(`{{${varName}}}`, 'gi'), varValue || '');
      }
      
      // Convert newlines to <br> for HTML body (but not for subject or whatsapp)
      if (key === 'body') {
        text = formatEmailHtml(text);
      }
      
      result[key] = text;
    }
  }
  
  return result;
}

/**
 * Format email body as clean HTML with proper spacing
 */
function formatEmailHtml(body) {
  // Convert newlines to <br> tags, preserving double newlines as paragraph breaks
  const paragraphs = body.split(/\n\n+/);
  
  const htmlParagraphs = paragraphs.map(p => {
    // Convert single newlines within paragraphs to <br>
    const lines = p.trim().split('\n').map(line => line.trim()).join('<br>\n');
    return `<p style="margin: 0 0 16px 0; line-height: 1.6;">${lines}</p>`;
  });
  
  // Wrap in a clean HTML template
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${htmlParagraphs.join('\n  ')}
</body>
</html>`.trim();
}

// ==========================================
// NEWSLETTER
// ==========================================

/**
 * Add lead to newsletter
 */
export async function addToNewsletter(leadId, source) {
  const leadResult = await query('SELECT email, first_name, last_name FROM leads WHERE id = $1', [leadId]);
  const lead = leadResult.rows[0];
  
  if (!lead?.email) return;
  
  await query(`
    INSERT INTO newsletter_subscribers (lead_id, email, first_name, last_name, source)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (email) DO UPDATE SET
      lead_id = COALESCE($1, newsletter_subscribers.lead_id),
      first_name = COALESCE($3, newsletter_subscribers.first_name),
      last_name = COALESCE($4, newsletter_subscribers.last_name),
      status = 'active'
  `, [leadId, lead.email, lead.first_name, lead.last_name, source]);
}

/**
 * Send newsletter to all subscribers
 */
export async function sendNewsletter(subject, body) {
  const result = await query(
    "SELECT * FROM newsletter_subscribers WHERE status = 'active'"
  );
  
  const subscribers = result.rows;
  let sent = 0;
  let failed = 0;
  
  for (const sub of subscribers) {
    try {
      const content = substituteVariables({ subject, body }, {
        first_name: sub.first_name || 'there',
        last_name: sub.last_name || ''
      });
      
      await sendEmail({
        to: sub.email,
        subject: content.subject,
        html: content.body
      });
      
      // Log the newsletter send
      await query(`
        INSERT INTO sent_messages (lead_id, channel, message_type, subject, body, status, sent_at)
        VALUES ($1, 'email', 'newsletter', $2, $3, 'sent', NOW())
      `, [sub.lead_id, content.subject, content.body]);
      
      sent++;
    } catch (error) {
      console.error(`Newsletter failed for ${sub.email}:`, error);
      failed++;
    }
  }
  
  return { sent, failed, total: subscribers.length };
}

// ==========================================
// DASHBOARD DATA
// ==========================================

/**
 * Get sequence dashboard data
 */
export async function getSequenceDashboard() {
  // Active enrollments by sequence
  const enrollments = await query(`
    SELECT 
      s.name as sequence_name,
      s.slug,
      COUNT(ls.id) FILTER (WHERE ls.status = 'active') as active,
      COUNT(ls.id) FILTER (WHERE ls.status = 'completed') as completed,
      COUNT(ls.id) FILTER (WHERE ls.status = 'converted') as converted,
      COUNT(ls.id) FILTER (WHERE ls.status = 'cancelled') as cancelled
    FROM sequences s
    LEFT JOIN lead_sequences ls ON s.id = ls.sequence_id
    GROUP BY s.id
  `);
  
  // Messages sent today
  const todayMessages = await query(`
    SELECT channel, COUNT(*) as count
    FROM sent_messages
    WHERE DATE(sent_at) = CURRENT_DATE AND status = 'sent'
    GROUP BY channel
  `);
  
  // Pending messages
  const pendingMessages = await query(`
    SELECT COUNT(*) as count FROM message_queue WHERE status = 'pending'
  `);
  
  // Newsletter subscribers
  const newsletter = await query(`
    SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = 'active'
  `);
  
  return {
    sequences: enrollments.rows,
    todayMessages: todayMessages.rows,
    pendingCount: parseInt(pendingMessages.rows[0]?.count || 0),
    newsletterCount: parseInt(newsletter.rows[0]?.count || 0)
  };
}

/**
 * Get lead sequence status (for board view)
 */
export async function getLeadSequenceBoard(sequenceSlug, options = {}) {
  const { page = 1, limit = 50, status = 'active' } = options;
  const offset = (page - 1) * limit;
  
  const sequence = await getSequenceBySlug(sequenceSlug);
  if (!sequence) return { leads: [], pagination: {} };
  
  const result = await query(`
    SELECT 
      ls.*,
      l.first_name, l.last_name, l.email, l.phone, l.source,
      (SELECT COUNT(*) FROM sent_messages sm WHERE sm.lead_sequence_id = ls.id) as messages_sent,
      (SELECT COUNT(*) FROM message_queue mq WHERE mq.lead_sequence_id = ls.id AND mq.status = 'pending') as messages_pending
    FROM lead_sequences ls
    JOIN leads l ON ls.lead_id = l.id
    WHERE ls.sequence_id = $1
    AND ($2::text IS NULL OR ls.status = $2)
    ORDER BY ls.enrolled_at DESC
    LIMIT $3 OFFSET $4
  `, [sequence.id, status, limit, offset]);
  
  const countResult = await query(`
    SELECT COUNT(*) FROM lead_sequences WHERE sequence_id = $1 AND ($2::text IS NULL OR status = $2)
  `, [sequence.id, status]);
  
  return {
    leads: result.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  };
}

/**
 * Get sent messages for a lead
 */
export async function getLeadMessages(leadId) {
  const result = await query(`
    SELECT sm.*, ss.name as step_name
    FROM sent_messages sm
    LEFT JOIN sequence_steps ss ON sm.sequence_step_id = ss.id
    WHERE sm.lead_id = $1
    ORDER BY sm.created_at DESC
  `, [leadId]);
  
  return result.rows;
}

/**
 * Get sequence status for a lead
 * Shows which sequences they're enrolled in, current step, messages sent, etc.
 */
export async function getLeadSequenceStatus(leadId) {
  // Get all sequence enrollments for this lead
  const enrollments = await query(`
    SELECT ls.*, 
           s.name as sequence_name, 
           s.slug as sequence_slug,
           (SELECT COUNT(*) FROM sequence_steps ss WHERE ss.sequence_id = s.id) as total_steps,
           (SELECT COUNT(*) FROM sent_messages sm WHERE sm.lead_id = $1 AND sm.lead_sequence_id = ls.id) as messages_sent,
           (SELECT COUNT(*) FROM message_queue mq WHERE mq.lead_id = $1 AND mq.lead_sequence_id = ls.id AND mq.status = 'pending') as messages_pending
    FROM lead_sequences ls
    JOIN sequences s ON ls.sequence_id = s.id
    WHERE ls.lead_id = $1
    ORDER BY ls.enrolled_at DESC
  `, [leadId]);
  
  if (enrollments.rows.length === 0) {
    return {
      enrolled: false,
      enrollments: [],
      activeSequence: null,
      messagesSent: 0,
      currentStep: 0,
      totalSteps: 0
    };
  }
  
  // Get the active sequence (if any)
  const activeEnrollment = enrollments.rows.find(e => e.status === 'active');
  
  // Get total messages sent across all sequences
  const totalSent = await query(`
    SELECT COUNT(*) FROM sent_messages WHERE lead_id = $1
  `, [leadId]);
  
  return {
    enrolled: true,
    enrollments: enrollments.rows.map(e => ({
      id: e.id,
      sequenceId: e.sequence_id,
      sequenceName: e.sequence_name,
      sequenceSlug: e.sequence_slug,
      status: e.status,
      currentStep: e.current_step,
      totalSteps: parseInt(e.total_steps),
      messagesSent: parseInt(e.messages_sent),
      messagesPending: parseInt(e.messages_pending),
      enrolledAt: e.enrolled_at,
      completedAt: e.completed_at,
      cancelledAt: e.cancelled_at,
      meetingTime: e.meeting_time
    })),
    activeSequence: activeEnrollment ? {
      name: activeEnrollment.sequence_name,
      slug: activeEnrollment.sequence_slug,
      currentStep: activeEnrollment.current_step,
      totalSteps: parseInt(activeEnrollment.total_steps),
      progress: Math.round((activeEnrollment.current_step / parseInt(activeEnrollment.total_steps)) * 100)
    } : null,
    messagesSent: parseInt(totalSent.rows[0].count),
    canResume: enrollments.rows.some(e => e.status === 'paused' || e.status === 'cancelled')
  };
}

export default {
  getSequences,
  getSequenceBySlug,
  getSequenceSteps,
  updateSequenceStep,
  enrollLead,
  manualSendStep,
  onMeetingBooked,
  onNoShow,
  onMeetingCompleted,
  cancelLeadSequence,
  cancelAllSequences,
  processMessageQueue,
  addToNewsletter,
  sendNewsletter,
  getSequenceDashboard,
  getLeadSequenceBoard,
  getLeadMessages,
  getLeadSequenceStatus
};
