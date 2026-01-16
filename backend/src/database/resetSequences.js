/**
 * Reset Sequences Script
 * 
 * Clears and rebuilds all sequences with the correct step structure.
 * Run with: node src/database/resetSequences.js
 */

import { initDatabase, query, closeDatabase } from './connection.js';
import { DEFAULT_SEQUENCES, NEW_LEAD_SEQUENCE_STEPS, MEETING_BOOKED_STEPS, NO_SHOW_STEPS } from './schema-sequences.js';
import { OPERATIONAL_EMAILS, WHATSAPP_MESSAGES, VALUE_EMAILS, CLOSING_EMAILS } from '../data/emailTemplates.js';

async function resetSequences() {
  try {
    console.log('🔄 Resetting sequences...');
    await initDatabase();

    // Clear existing steps
    console.log('  Clearing old steps...');
    await query('DELETE FROM message_queue');
    await query('DELETE FROM sent_messages WHERE sequence_step_id IS NOT NULL');
    await query('DELETE FROM sequence_steps');
    await query('DELETE FROM lead_sequences');
    await query('DELETE FROM sequences');

    // Create sequences
    console.log('  Creating sequences...');
    for (const seq of DEFAULT_SEQUENCES) {
      await query(
        `INSERT INTO sequences (name, slug, description, trigger_type) VALUES ($1, $2, $3, $4)`,
        [seq.name, seq.slug, seq.description, seq.trigger_type]
      );
    }

    // Get sequence IDs
    const seqResult = await query('SELECT id, slug FROM sequences');
    const seqMap = {};
    for (const row of seqResult.rows) {
      seqMap[row.slug] = row.id;
    }

    // Create New Lead steps
    console.log('  Creating New Lead steps...');
    for (const step of NEW_LEAD_SEQUENCE_STEPS) {
      let emailSubject = null;
      let emailBody = null;
      let whatsappMessage = null;

      // Assign content based on step
      if (step.step_order === 1) {
        emailSubject = OPERATIONAL_EMAILS.welcome_calendar.subject;
        emailBody = OPERATIONAL_EMAILS.welcome_calendar.body;
        whatsappMessage = WHATSAPP_MESSAGES.welcome_greeting;
      } else if (step.name.includes('Schedule Meeting') || step.name.includes('CTA')) {
        emailSubject = 'Have you scheduled your consultation yet?';
        emailBody = OPERATIONAL_EMAILS.reminder_7day_not_booked.body;
      } else if (step.name.includes('Closing') || step.name.includes('Final')) {
        const closeIndex = step.step_order - 21;
        if (CLOSING_EMAILS[closeIndex]) {
          emailSubject = CLOSING_EMAILS[closeIndex].subject;
          emailBody = CLOSING_EMAILS[closeIndex].body;
        }
      }
      // Value emails are assigned dynamically at send time

      await query(
        `INSERT INTO sequence_steps (sequence_id, step_order, name, delay_value, delay_unit, channel, email_subject, email_body, whatsapp_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [seqMap.new_lead, step.step_order, step.name, step.delay_value, step.delay_unit, step.channel, emailSubject, emailBody, whatsappMessage]
      );
    }
    console.log(`    ✓ ${NEW_LEAD_SEQUENCE_STEPS.length} steps created`);

    // Create Meeting Booked steps
    console.log('  Creating Meeting Booked steps...');
    for (const step of MEETING_BOOKED_STEPS) {
      let emailSubject = null;
      let emailBody = null;
      let whatsappMessage = null;

      if (step.step_order === 1) {
        emailSubject = OPERATIONAL_EMAILS.meeting_confirmation.subject;
        emailBody = OPERATIONAL_EMAILS.meeting_confirmation.body;
        whatsappMessage = WHATSAPP_MESSAGES.meeting_confirmation;
      } else if (step.name.includes('24hr')) {
        emailSubject = OPERATIONAL_EMAILS.reminder_24h.subject;
        emailBody = OPERATIONAL_EMAILS.reminder_24h.body;
        whatsappMessage = WHATSAPP_MESSAGES.reminder_24h;
      } else if (step.name.includes('6hr')) {
        emailSubject = OPERATIONAL_EMAILS.reminder_6h.subject;
        emailBody = OPERATIONAL_EMAILS.reminder_6h.body;
        whatsappMessage = WHATSAPP_MESSAGES.reminder_6h;
      } else if (step.name.includes('1hr')) {
        emailSubject = OPERATIONAL_EMAILS.reminder_1h.subject;
        emailBody = OPERATIONAL_EMAILS.reminder_1h.body;
        whatsappMessage = WHATSAPP_MESSAGES.reminder_1h;
      }

      await query(
        `INSERT INTO sequence_steps (sequence_id, step_order, name, delay_value, delay_unit, channel, email_subject, email_body, whatsapp_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [seqMap.meeting_booked, step.step_order, step.name, step.delay_value, step.delay_unit, step.channel, emailSubject, emailBody, whatsappMessage]
      );
    }
    console.log(`    ✓ ${MEETING_BOOKED_STEPS.length} steps created`);

    // Create No Show steps
    console.log('  Creating No Show steps...');
    for (const step of NO_SHOW_STEPS) {
      let emailSubject = null;
      let emailBody = null;
      let whatsappMessage = null;

      if (step.step_order === 1) {
        emailSubject = OPERATIONAL_EMAILS.no_show_rebook.subject;
        emailBody = OPERATIONAL_EMAILS.no_show_rebook.body;
        whatsappMessage = WHATSAPP_MESSAGES.no_show_rebook;
      } else if (step.name.includes('Schedule Meeting') || step.name.includes('CTA')) {
        emailSubject = 'Have you scheduled your consultation yet?';
        emailBody = OPERATIONAL_EMAILS.reminder_7day_not_booked.body;
      } else if (step.name.includes('Closing') || step.name.includes('Final')) {
        const closeIndex = step.step_order - 21;
        if (CLOSING_EMAILS[closeIndex]) {
          emailSubject = CLOSING_EMAILS[closeIndex].subject;
          emailBody = CLOSING_EMAILS[closeIndex].body;
        }
      }

      await query(
        `INSERT INTO sequence_steps (sequence_id, step_order, name, delay_value, delay_unit, channel, email_subject, email_body, whatsapp_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [seqMap.no_show, step.step_order, step.name, step.delay_value, step.delay_unit, step.channel, emailSubject, emailBody, whatsappMessage]
      );
    }
    console.log(`    ✓ ${NO_SHOW_STEPS.length} steps created`);

    console.log('\n✅ Sequences reset successfully!');
    console.log(`   • New Lead: ${NEW_LEAD_SEQUENCE_STEPS.length} steps (18 days)`);
    console.log(`   • Meeting Booked: ${MEETING_BOOKED_STEPS.length} steps`);
    console.log(`   • No Show: ${NO_SHOW_STEPS.length} steps (18 days)`);

  } catch (error) {
    console.error('❌ Reset failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

resetSequences().catch(console.error);
