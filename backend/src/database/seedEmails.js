/**
 * Seed Email Templates into Database
 * 
 * Populates all sequence steps with STRUCTURE's email content.
 * Run with: node src/database/seedEmails.js
 */

import { initDatabase, query, closeDatabase } from './connection.js';
import { 
  OPERATIONAL_EMAILS, 
  WHATSAPP_MESSAGES, 
  VALUE_EMAILS, 
  CLOSING_EMAILS,
  CALENDAR_LINK
} from '../data/emailTemplates.js';

async function seedEmails() {
  try {
    console.log('🔄 Seeding email templates...');
    await initDatabase();

    // Get sequence IDs
    const sequences = await query('SELECT id, slug FROM sequences');
    const seqMap = sequences.rows.reduce((acc, s) => ({ ...acc, [s.slug]: s.id }), {});

    // =============================================
    // UPDATE NEW LEAD SEQUENCE STEPS
    // =============================================
    console.log('\n📧 Updating New Lead Nurture sequence...');
    
    const newLeadSteps = await query(
      'SELECT id, step_order, name FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_order',
      [seqMap.new_lead]
    );

    for (const step of newLeadSteps.rows) {
      let emailSubject, emailBody, whatsappMessage;

      if (step.step_order === 1) {
        // Welcome + Calendar (immediate)
        emailSubject = OPERATIONAL_EMAILS.welcome_calendar.subject;
        emailBody = OPERATIONAL_EMAILS.welcome_calendar.body;
        whatsappMessage = WHATSAPP_MESSAGES.welcome_greeting;
      } else if (step.step_order === 6) {
        // Schedule meeting CTA at 24 hours
        emailSubject = 'Have you had a chance to schedule?';
        emailBody = OPERATIONAL_EMAILS.reminder_7day_not_booked.body;
        whatsappMessage = null;
      } else if (step.step_order >= 2 && step.step_order <= 24) {
        // Value emails - assign from pool
        const valueIndex = (step.step_order - 2) % VALUE_EMAILS.length;
        const valueEmail = VALUE_EMAILS[valueIndex];
        emailSubject = valueEmail.subject;
        emailBody = valueEmail.body;
        whatsappMessage = null;
      }

      if (emailSubject) {
        await query(`
          UPDATE sequence_steps 
          SET email_subject = $1, email_body = $2, whatsapp_message = $3, updated_at = NOW()
          WHERE id = $4
        `, [emailSubject, emailBody, whatsappMessage, step.id]);
        console.log(`  ✓ Step ${step.step_order}: ${step.name}`);
      }
    }

    // =============================================
    // UPDATE MEETING BOOKED SEQUENCE STEPS
    // =============================================
    console.log('\n📅 Updating Meeting Booked sequence...');
    
    const meetingSteps = await query(
      'SELECT id, step_order, name FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_order',
      [seqMap.meeting_booked]
    );

    for (const step of meetingSteps.rows) {
      let emailSubject, emailBody, whatsappMessage;

      if (step.step_order === 1) {
        // Confirmation
        emailSubject = OPERATIONAL_EMAILS.meeting_confirmation.subject;
        emailBody = OPERATIONAL_EMAILS.meeting_confirmation.body;
        whatsappMessage = WHATSAPP_MESSAGES.meeting_confirmation;
      } else if (step.step_order === 2) {
        // 24hr reminder
        emailSubject = OPERATIONAL_EMAILS.reminder_24h.subject;
        emailBody = OPERATIONAL_EMAILS.reminder_24h.body;
        whatsappMessage = WHATSAPP_MESSAGES.reminder_24h;
      } else if (step.step_order === 3) {
        // 6hr reminder
        emailSubject = OPERATIONAL_EMAILS.reminder_6h.subject;
        emailBody = OPERATIONAL_EMAILS.reminder_6h.body;
        whatsappMessage = WHATSAPP_MESSAGES.reminder_6h;
      } else if (step.step_order === 4) {
        // 1hr reminder
        emailSubject = OPERATIONAL_EMAILS.reminder_1h.subject;
        emailBody = OPERATIONAL_EMAILS.reminder_1h.body;
        whatsappMessage = WHATSAPP_MESSAGES.reminder_1h;
      }

      if (emailSubject) {
        await query(`
          UPDATE sequence_steps 
          SET email_subject = $1, email_body = $2, whatsapp_message = $3, updated_at = NOW()
          WHERE id = $4
        `, [emailSubject, emailBody, whatsappMessage, step.id]);
        console.log(`  ✓ Step ${step.step_order}: ${step.name}`);
      }
    }

    // =============================================
    // UPDATE NO SHOW SEQUENCE STEPS
    // =============================================
    console.log('\n❌ Updating No Show sequence...');
    
    const noShowSteps = await query(
      'SELECT id, step_order, name FROM sequence_steps WHERE sequence_id = $1 ORDER BY step_order',
      [seqMap.no_show]
    );

    for (const step of noShowSteps.rows) {
      let emailSubject, emailBody, whatsappMessage;

      if (step.step_order === 1) {
        // Rebooking request
        emailSubject = OPERATIONAL_EMAILS.no_show_rebook.subject;
        emailBody = OPERATIONAL_EMAILS.no_show_rebook.body;
        whatsappMessage = WHATSAPP_MESSAGES.no_show_rebook;
      } else if (step.step_order >= 2) {
        // Value emails
        const valueIndex = (step.step_order - 2) % VALUE_EMAILS.length;
        const valueEmail = VALUE_EMAILS[valueIndex];
        emailSubject = valueEmail.subject;
        emailBody = valueEmail.body;
        whatsappMessage = null;
      }

      if (emailSubject) {
        await query(`
          UPDATE sequence_steps 
          SET email_subject = $1, email_body = $2, whatsapp_message = $3, updated_at = NOW()
          WHERE id = $4
        `, [emailSubject, emailBody, whatsappMessage, step.id]);
        console.log(`  ✓ Step ${step.step_order}: ${step.name}`);
      }
    }

    // =============================================
    // STORE VALUE EMAILS AS TEMPLATES
    // =============================================
    console.log('\n📚 Storing value email templates...');
    
    for (const email of VALUE_EMAILS) {
      await query(`
        INSERT INTO email_templates (name, slug, category, subject, body, variables)
        VALUES ($1, $2, 'value', $3, $4, '["first_name"]')
        ON CONFLICT (slug) DO UPDATE SET
          subject = $3,
          body = $4,
          updated_at = NOW()
      `, [
        `Value: ${email.subject.substring(0, 50)}`,
        email.id,
        email.subject,
        email.body
      ]);
    }
    console.log(`  ✓ Stored ${VALUE_EMAILS.length} value email templates`);

    // Store closing emails
    for (const email of CLOSING_EMAILS) {
      await query(`
        INSERT INTO email_templates (name, slug, category, subject, body, variables)
        VALUES ($1, $2, 'closing', $3, $4, '["first_name"]')
        ON CONFLICT (slug) DO UPDATE SET
          subject = $3,
          body = $4,
          updated_at = NOW()
      `, [
        `Close: ${email.subject.substring(0, 50)}`,
        email.id,
        email.subject,
        email.body
      ]);
    }
    console.log(`  ✓ Stored ${CLOSING_EMAILS.length} closing email templates`);

    // =============================================
    // ADD MORE STEPS FOR FULL 18-DAY SEQUENCE
    // =============================================
    console.log('\n📈 Ensuring full 18-day sequence coverage...');
    
    // Check how many steps we have
    const currentSteps = await query(
      'SELECT COUNT(*) as count FROM sequence_steps WHERE sequence_id = $1',
      [seqMap.new_lead]
    );
    
    const currentCount = parseInt(currentSteps.rows[0].count);
    const targetCount = 35; // Enough for 18 days with closing emails
    
    if (currentCount < targetCount) {
      console.log(`  Adding ${targetCount - currentCount} more steps...`);
      
      // Add more value steps
      for (let i = currentCount + 1; i <= targetCount - 5; i++) {
        const dayNumber = Math.ceil((i - 1) / 2) + 7; // Days 8+
        const valueEmail = VALUE_EMAILS[(i - 2) % VALUE_EMAILS.length];
        
        await query(`
          INSERT INTO sequence_steps (sequence_id, step_order, name, delay_value, delay_unit, channel, email_subject, email_body)
          VALUES ($1, $2, $3, $4, 'days', 'email', $5, $6)
          ON CONFLICT (sequence_id, step_order) DO NOTHING
        `, [
          seqMap.new_lead,
          i,
          `Value Email (Day ${dayNumber})`,
          dayNumber,
          valueEmail.subject,
          valueEmail.body
        ]);
      }
      
      // Add closing emails for days 14-18
      const closingDays = [14, 15, 16, 17, 18];
      for (let j = 0; j < CLOSING_EMAILS.length && j < closingDays.length; j++) {
        const stepOrder = targetCount - 4 + j;
        const closeEmail = CLOSING_EMAILS[j];
        
        await query(`
          INSERT INTO sequence_steps (sequence_id, step_order, name, delay_value, delay_unit, channel, email_subject, email_body)
          VALUES ($1, $2, $3, $4, 'days', 'email', $5, $6)
          ON CONFLICT (sequence_id, step_order) DO UPDATE SET
            email_subject = $5,
            email_body = $6,
            updated_at = NOW()
        `, [
          seqMap.new_lead,
          stepOrder,
          `Closing Email ${j + 1} (Day ${closingDays[j]})`,
          closingDays[j],
          closeEmail.subject,
          closeEmail.body
        ]);
      }
    }

    console.log('\n✅ Email templates seeded successfully!');
    console.log(`   • Calendar link: ${CALENDAR_LINK}`);
    console.log(`   • Value emails available: ${VALUE_EMAILS.length}`);
    console.log(`   • Closing emails available: ${CLOSING_EMAILS.length}`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

// Run if called directly
seedEmails().catch(console.error);

export default seedEmails;
