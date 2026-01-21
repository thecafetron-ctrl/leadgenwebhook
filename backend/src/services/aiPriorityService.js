/**
 * AI Priority Scoring Service
 * 
 * Calculates priority score based on REAL business logic for logistics automation
 * Higher scores = higher priority leads
 */

import OpenAI from 'openai';
import { query } from '../database/connection.js';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * SCORING WEIGHTS - Based on actual conversion signals
 */
const WEIGHTS = {
  // Budget is KING - someone with 35k+ budget is serious
  BUDGET_100K_PLUS: 30,      // 100k+ AED budget
  BUDGET_35K_100K: 25,       // 35k-100k budget (sweet spot)
  BUDGET_15K_35K: 15,        // 15k-35k budget
  BUDGET_UNDER_15K: 5,       // Under 15k

  // Volume indicates scale and need
  VOLUME_5000_PLUS: 20,      // 5000+ shipments/month = enterprise
  VOLUME_1000_5000: 18,      // 1000-5000 = serious operation
  VOLUME_500_1000: 15,       // 500-1000 = growing business
  VOLUME_100_500: 10,        // 100-500 = small but viable
  VOLUME_UNDER_100: 5,       // Under 100 = maybe too small

  // Decision maker role
  ROLE_OWNER_CEO: 15,        // Owner/CEO/Founder = can sign
  ROLE_DIRECTOR_VP: 12,      // Director/VP = strong influence
  ROLE_MANAGER: 8,           // Manager = can champion
  ROLE_OTHER: 3,             // Other = might be researcher

  // Contact completeness (shows intent)
  HAS_PHONE: 8,              // Gave phone = serious
  HAS_COMPANY: 5,            // Named company = not tire-kicker
  BUSINESS_EMAIL: 5,         // Company email > gmail
  
  // Meeting status
  HAS_MEETING_BOOKED: 10,    // Already booked = very hot
  
  // Automation intent mentioned
  CLEAR_PAIN_POINT: 5,       // Mentioned specific problem
};

/**
 * Calculate score with REAL logic
 */
export async function calculatePriorityScore(lead) {
  let score = 0;
  let factors = [];
  
  const cf = lead.custom_fields || {};
  
  // ============================================
  // BUDGET SCORING (Most important)
  // ============================================
  const budgetField = cf["what's_your_estimated_budget_for_ai_implementation?"] || cf.budget || '';
  const budgetLower = budgetField.toLowerCase();
  
  if (budgetLower.includes('100k') || budgetLower.includes('100,000')) {
    score += WEIGHTS.BUDGET_100K_PLUS;
    factors.push({ factor: 'Budget 100k+', points: WEIGHTS.BUDGET_100K_PLUS });
  } else if (budgetLower.includes('35k') || budgetLower.includes('50k') || budgetLower.includes('35,000') || budgetLower.includes('35k_aed>') || budgetLower.includes('35k aed')) {
    score += WEIGHTS.BUDGET_35K_100K;
    factors.push({ factor: 'Budget 35k-100k AED', points: WEIGHTS.BUDGET_35K_100K });
  } else if (budgetLower.includes('15k') || budgetLower.includes('20k') || budgetLower.includes('25k')) {
    score += WEIGHTS.BUDGET_15K_35K;
    factors.push({ factor: 'Budget 15k-35k', points: WEIGHTS.BUDGET_15K_35K });
  } else if (budgetField) {
    score += WEIGHTS.BUDGET_UNDER_15K;
    factors.push({ factor: 'Has budget (under 15k)', points: WEIGHTS.BUDGET_UNDER_15K });
  }

  // ============================================
  // VOLUME SCORING (Scale indicator)
  // ============================================
  const volumeField = cf["how_many_shipments_do_you_receive_on_average_per_month?"] || cf.volume || cf.shipments || '';
  const volumeLower = volumeField.toLowerCase();
  
  if (volumeLower.includes('10,000') || volumeLower.includes('10000') || volumeLower.includes('5,000_-_10,000') || volumeLower.includes('10k')) {
    score += WEIGHTS.VOLUME_5000_PLUS;
    factors.push({ factor: 'Volume 5000+ shipments', points: WEIGHTS.VOLUME_5000_PLUS });
  } else if (volumeLower.includes('1,000_-_5,000') || volumeLower.includes('1000') || volumeLower.includes('5,000') || volumeLower.includes('1k-5k')) {
    score += WEIGHTS.VOLUME_1000_5000;
    factors.push({ factor: 'Volume 1000-5000 shipments', points: WEIGHTS.VOLUME_1000_5000 });
  } else if (volumeLower.includes('500') || volumeLower.includes('500>') || volumeLower.includes('500_-_1,000') || volumeLower.includes('500-1000')) {
    score += WEIGHTS.VOLUME_500_1000;
    factors.push({ factor: 'Volume 500-1000 shipments', points: WEIGHTS.VOLUME_500_1000 });
  } else if (volumeLower.includes('100') || volumeLower.includes('200') || volumeLower.includes('300')) {
    score += WEIGHTS.VOLUME_100_500;
    factors.push({ factor: 'Volume 100-500 shipments', points: WEIGHTS.VOLUME_100_500 });
  } else if (volumeField) {
    score += WEIGHTS.VOLUME_UNDER_100;
    factors.push({ factor: 'Has volume info', points: WEIGHTS.VOLUME_UNDER_100 });
  }

  // ============================================
  // ROLE SCORING (Decision maker?)
  // ============================================
  const roleField = cf["what's_your_role_in_the_company?"] || lead.job_title || '';
  const roleLower = roleField.toLowerCase();
  
  if (roleLower.includes('owner') || roleLower.includes('ceo') || roleLower.includes('founder') || roleLower.includes('managing director') || roleLower.includes('md')) {
    score += WEIGHTS.ROLE_OWNER_CEO;
    factors.push({ factor: 'Owner/CEO/Founder', points: WEIGHTS.ROLE_OWNER_CEO });
  } else if (roleLower.includes('director') || roleLower.includes('vp') || roleLower.includes('vice president') || roleLower.includes('coo') || roleLower.includes('cto')) {
    score += WEIGHTS.ROLE_DIRECTOR_VP;
    factors.push({ factor: 'Director/VP level', points: WEIGHTS.ROLE_DIRECTOR_VP });
  } else if (roleLower.includes('manager') || roleLower.includes('head') || roleLower.includes('lead') || roleLower.includes('supervisor')) {
    score += WEIGHTS.ROLE_MANAGER;
    factors.push({ factor: 'Manager level', points: WEIGHTS.ROLE_MANAGER });
  } else if (roleField) {
    score += WEIGHTS.ROLE_OTHER;
    factors.push({ factor: 'Has role info', points: WEIGHTS.ROLE_OTHER });
  }

  // ============================================
  // CONTACT COMPLETENESS
  // ============================================
  if (lead.phone) {
    score += WEIGHTS.HAS_PHONE;
    factors.push({ factor: 'Provided phone number', points: WEIGHTS.HAS_PHONE });
  }
  
  if (lead.company) {
    score += WEIGHTS.HAS_COMPANY;
    factors.push({ factor: 'Named their company', points: WEIGHTS.HAS_COMPANY });
  }
  
  if (lead.email && !lead.email.includes('gmail') && !lead.email.includes('yahoo') && !lead.email.includes('hotmail') && !lead.email.includes('outlook')) {
    score += WEIGHTS.BUSINESS_EMAIL;
    factors.push({ factor: 'Business email domain', points: WEIGHTS.BUSINESS_EMAIL });
  }

  // ============================================
  // MEETING STATUS
  // ============================================
  if (cf.booking_time || cf.calcom_booking_id) {
    score += WEIGHTS.HAS_MEETING_BOOKED;
    factors.push({ factor: 'Meeting already booked', points: WEIGHTS.HAS_MEETING_BOOKED });
  }

  // ============================================
  // AUTOMATION INTENT
  // ============================================
  const whyAutomate = cf["why_do_you_want_to_automate_now?"] || '';
  if (whyAutomate && whyAutomate.length > 20) {
    score += WEIGHTS.CLEAR_PAIN_POINT;
    factors.push({ factor: 'Explained automation need', points: WEIGHTS.CLEAR_PAIN_POINT });
  }

  // Cap at 100
  score = Math.min(100, score);
  
  // Generate reason summary
  const topFactors = factors.sort((a, b) => b.points - a.points).slice(0, 3);
  const reason = topFactors.map(f => f.factor).join(', ');

  console.log(`📊 Score for ${lead.first_name}: ${score}/100`);
  factors.forEach(f => console.log(`   +${f.points}: ${f.factor}`));

  return { score, reason, factors };
}

/**
 * Get AI advice on how to approach this lead
 */
export async function getLeadAdvice(leadId) {
  const result = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
  if (result.rows.length === 0) {
    throw new Error('Lead not found');
  }

  const lead = result.rows[0];
  const cf = lead.custom_fields || {};

  if (!openai) {
    return {
      leadId,
      advice: "OpenAI not configured. Based on the data: Focus on their specific pain points and volume. Emphasize ROI.",
      talkingPoints: [
        "Ask about their current manual processes",
        "Discuss time savings with automation",
        "Mention case studies of similar companies"
      ]
    };
  }

  const prompt = `You are a senior sales advisor for STRUCTURE, a logistics automation company. Analyze this lead and give specific, actionable advice.

LEAD DATA:
- Name: ${lead.first_name} ${lead.last_name}
- Company: ${lead.company || 'Not provided'}
- Role: ${cf["what's_your_role_in_the_company?"] || lead.job_title || 'Unknown'}
- Email: ${lead.email}
- Phone: ${lead.phone || 'Not provided'}

BUSINESS INFO:
- Budget: ${cf["what's_your_estimated_budget_for_ai_implementation?"] || 'Not specified'}
- Monthly Shipments: ${cf["how_many_shipments_do_you_receive_on_average_per_month?"] || 'Not specified'}
- Why automating: ${cf["why_do_you_want_to_automate_now?"] || 'Not specified'}

STRUCTURE offers AI automation for:
- Quote generation
- Document processing  
- Invoicing
- Customs paperwork
- Finance reconciliation

Provide:
1. A brief assessment (2-3 sentences)
2. 3 specific talking points for the call
3. Potential objections they might have
4. A suggested opening line for WhatsApp/email

Format as JSON:
{
  "assessment": "...",
  "talkingPoints": ["...", "...", "..."],
  "objections": ["...", "..."],
  "openingLine": "..."
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content.trim();
    
    try {
      const parsed = JSON.parse(response);
      return {
        leadId,
        name: `${lead.first_name} ${lead.last_name}`,
        company: lead.company,
        score: lead.score,
        ...parsed
      };
    } catch {
      return {
        leadId,
        name: `${lead.first_name} ${lead.last_name}`,
        advice: response,
        talkingPoints: []
      };
    }
  } catch (error) {
    console.error('AI advice error:', error);
    throw new Error('Failed to get AI advice');
  }
}

/**
 * Score a single lead and update in database
 */
export async function scoreLead(leadId) {
  const result = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
  if (result.rows.length === 0) {
    throw new Error('Lead not found');
  }

  const lead = result.rows[0];
  const { score, reason, factors } = await calculatePriorityScore(lead);

  // Update the score in database
  await query(
    'UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2',
    [score, leadId]
  );

  console.log(`📊 Scored lead ${lead.first_name}: ${score}/100 (${reason})`);
  return { leadId, name: `${lead.first_name} ${lead.last_name}`, score, reason, factors };
}

/**
 * Score all leads that don't have a score yet
 */
export async function scoreAllLeads() {
  const result = await query('SELECT * FROM leads WHERE score = 0 OR score IS NULL ORDER BY created_at DESC LIMIT 100');
  const leads = result.rows;

  console.log(`📊 Scoring ${leads.length} leads...`);

  const results = [];
  for (const lead of leads) {
    try {
      const { score, reason, factors } = await calculatePriorityScore(lead);
      await query('UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2', [score, lead.id]);
      results.push({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`, score, reason });
    } catch (error) {
      console.error(`Failed to score lead ${lead.id}:`, error);
    }
  }

  return results;
}

/**
 * Re-score ALL leads (force recalculation)
 */
export async function rescoreAllLeads() {
  const result = await query('SELECT * FROM leads ORDER BY created_at DESC');
  const leads = result.rows;

  console.log(`📊 Re-scoring ALL ${leads.length} leads...`);

  const results = [];
  for (const lead of leads) {
    try {
      const { score, reason } = await calculatePriorityScore(lead);
      await query('UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2', [score, lead.id]);
      results.push({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`, score, reason });
    } catch (error) {
      console.error(`Failed to score lead ${lead.id}:`, error);
    }
  }

  return results;
}

export default {
  calculatePriorityScore,
  scoreLead,
  scoreAllLeads,
  rescoreAllLeads,
  getLeadAdvice
};
