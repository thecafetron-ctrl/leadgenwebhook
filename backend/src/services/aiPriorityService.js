/**
 * AI Priority Scoring Service
 * 
 * BUDGET + SHIPMENTS = PRIMARY FACTORS (70% of score)
 * Everything else is secondary
 */

import OpenAI from 'openai';
import { query } from '../database/connection.js';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Calculate score - BUDGET AND VOLUME ARE KING
 */
export async function calculatePriorityScore(lead) {
  let score = 0;
  let factors = [];
  
  const cf = lead.custom_fields || {};
  
  // ============================================
  // BUDGET SCORING (40 points max) - PRIMARY
  // ============================================
  const budgetField = (cf["what's_your_estimated_budget_for_ai_implementation?"] || cf.budget || '').toLowerCase();
  
  // Check for high budgets first (1M+, 600k+, 100k+)
  if (budgetField.includes('1m') || budgetField.includes('1,000,000') || budgetField.includes('million')) {
    score += 40;
    factors.push({ factor: '🔥 Budget 1M+ AED', points: 40 });
  } else if (budgetField.includes('600k') || budgetField.includes('500k') || budgetField.includes('600,000') || budgetField.includes('500,000')) {
    score += 38;
    factors.push({ factor: '🔥 Budget 500k-1M AED', points: 38 });
  } else if (budgetField.includes('100k') || budgetField.includes('200k') || budgetField.includes('300k') || budgetField.includes('100,000')) {
    score += 35;
    factors.push({ factor: 'Budget 100k+ AED', points: 35 });
  } else if (budgetField.includes('35k') || budgetField.includes('50k') || budgetField.includes('35,000') || budgetField.includes('50,000') || budgetField.includes('35k_-_100k') || budgetField.includes('35k_aed')) {
    score += 30;
    factors.push({ factor: 'Budget 35k-100k AED', points: 30 });
  } else if (budgetField.includes('15k') || budgetField.includes('20k') || budgetField.includes('25k')) {
    score += 20;
    factors.push({ factor: 'Budget 15k-35k AED', points: 20 });
  } else if (budgetField) {
    score += 10;
    factors.push({ factor: 'Has budget info', points: 10 });
  }

  // ============================================
  // VOLUME SCORING (30 points max) - PRIMARY
  // ============================================
  const volumeField = (cf["how_many_shipments_do_you_receive_on_average_per_month?"] || cf.volume || cf.shipments || '').toLowerCase();
  
  if (volumeField.includes('10,000') || volumeField.includes('10000') || volumeField.includes('10k') || volumeField.includes('5,000_-_10,000')) {
    score += 30;
    factors.push({ factor: '🔥 Volume 10,000+ shipments', points: 30 });
  } else if (volumeField.includes('5,000') || volumeField.includes('5000') || volumeField.includes('5k') || volumeField.includes('1,000_-_5,000')) {
    score += 28;
    factors.push({ factor: 'Volume 5,000+ shipments', points: 28 });
  } else if (volumeField.includes('1,000') || volumeField.includes('1000') || volumeField.includes('1k')) {
    score += 25;
    factors.push({ factor: 'Volume 1,000+ shipments', points: 25 });
  } else if (volumeField.includes('500') || volumeField.includes('500>') || volumeField.includes('500_-_1,000')) {
    score += 22;
    factors.push({ factor: 'Volume 500-1,000 shipments', points: 22 });
  } else if (volumeField.includes('100') || volumeField.includes('200') || volumeField.includes('300') || volumeField.includes('100_-_500')) {
    score += 15;
    factors.push({ factor: 'Volume 100-500 shipments', points: 15 });
  } else if (volumeField) {
    score += 8;
    factors.push({ factor: 'Has volume info', points: 8 });
  }

  // ============================================
  // SECONDARY FACTORS (30 points max total)
  // ============================================
  
  // Role (10 points max)
  const roleField = (cf["what's_your_role_in_the_company?"] || lead.job_title || '').toLowerCase();
  if (roleField.includes('owner') || roleField.includes('ceo') || roleField.includes('founder') || roleField.includes('managing director') || roleField.includes('md')) {
    score += 10;
    factors.push({ factor: 'Owner/CEO', points: 10 });
  } else if (roleField.includes('director') || roleField.includes('vp') || roleField.includes('coo') || roleField.includes('cto')) {
    score += 8;
    factors.push({ factor: 'Director/VP', points: 8 });
  } else if (roleField.includes('manager') || roleField.includes('head') || roleField.includes('lead')) {
    score += 5;
    factors.push({ factor: 'Manager', points: 5 });
  }

  // Meeting booked (8 points)
  if (cf.booking_time || cf.calcom_booking_id) {
    score += 8;
    factors.push({ factor: 'Meeting booked', points: 8 });
  }

  // Contact info (7 points max)
  if (lead.phone) {
    score += 4;
    factors.push({ factor: 'Has phone', points: 4 });
  }
  if (lead.company) {
    score += 3;
    factors.push({ factor: 'Has company', points: 3 });
  }

  // Business email (5 points)
  if (lead.email && !lead.email.includes('gmail') && !lead.email.includes('yahoo') && !lead.email.includes('hotmail') && !lead.email.includes('outlook')) {
    score += 5;
    factors.push({ factor: 'Business email', points: 5 });
  }

  // Cap at 100
  score = Math.min(100, score);
  
  // Generate reason
  const topFactors = factors.sort((a, b) => b.points - a.points).slice(0, 3);
  const reason = topFactors.map(f => f.factor).join(' | ');

  console.log(`📊 Score: ${score}/100 for ${lead.first_name} ${lead.last_name}`);
  console.log(`   Budget: "${budgetField}" | Volume: "${volumeField}"`);
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
      name: `${lead.first_name} ${lead.last_name}`,
      company: lead.company,
      score: lead.score,
      assessment: "OpenAI not configured. This is a high-priority lead based on budget and volume.",
      talkingPoints: [
        "Focus on their specific pain points",
        "Discuss ROI and time savings",
        "Mention case studies from similar companies"
      ],
      objections: ["Budget timing", "Implementation concerns"],
      openingLine: `Hi ${lead.first_name}, I noticed you're handling significant volume. I'd love to show you how we've helped similar operations cut manual work by 70%.`
    };
  }

  const prompt = `You are a senior sales advisor for STRUCTURE, a logistics automation company. Give brief, actionable advice.

LEAD:
- Name: ${lead.first_name} ${lead.last_name}
- Company: ${lead.company || 'Unknown'}
- Role: ${cf["what's_your_role_in_the_company?"] || lead.job_title || 'Unknown'}
- Budget: ${cf["what's_your_estimated_budget_for_ai_implementation?"] || 'Not specified'}
- Monthly Shipments: ${cf["how_many_shipments_do_you_receive_on_average_per_month?"] || 'Not specified'}
- Why automating: ${cf["why_do_you_want_to_automate_now?"] || 'Not specified'}
- Score: ${lead.score}/100

STRUCTURE automates: quoting, documents, invoicing, customs, finance reconciliation.

Return JSON only:
{
  "assessment": "2 sentences max about this lead",
  "talkingPoints": ["point 1", "point 2", "point 3"],
  "objections": ["objection 1", "objection 2"],
  "openingLine": "A personalized WhatsApp/email opener"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content.trim();
    const parsed = JSON.parse(response);
    
    return {
      leadId,
      name: `${lead.first_name} ${lead.last_name}`,
      company: lead.company,
      score: lead.score,
      ...parsed
    };
  } catch (error) {
    console.error('AI advice error:', error);
    return {
      leadId,
      name: `${lead.first_name} ${lead.last_name}`,
      company: lead.company,
      score: lead.score,
      assessment: "High-value lead based on their budget and volume.",
      talkingPoints: ["Discuss their current pain points", "Show ROI potential", "Offer a pilot program"],
      objections: ["Implementation timeline", "Integration concerns"],
      openingLine: `Hi ${lead.first_name}, saw you're looking to automate. Happy to show you what's possible.`
    };
  }
}

/**
 * Score a single lead
 */
export async function scoreLead(leadId) {
  const result = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
  if (result.rows.length === 0) throw new Error('Lead not found');

  const lead = result.rows[0];
  const { score, reason, factors } = await calculatePriorityScore(lead);

  await query('UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2', [score, leadId]);

  return { leadId, name: `${lead.first_name} ${lead.last_name}`, score, reason, factors };
}

/**
 * Score all unscored leads
 */
export async function scoreAllLeads() {
  const result = await query('SELECT * FROM leads WHERE score = 0 OR score IS NULL ORDER BY created_at DESC');
  const leads = result.rows;

  console.log(`📊 Scoring ${leads.length} leads...`);
  const results = [];
  
  for (const lead of leads) {
    const { score, reason } = await calculatePriorityScore(lead);
    await query('UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2', [score, lead.id]);
    results.push({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`, score, reason });
  }

  return results;
}

/**
 * Re-score ALL leads
 */
export async function rescoreAllLeads() {
  const result = await query('SELECT * FROM leads ORDER BY created_at DESC');
  const leads = result.rows;

  console.log(`📊 RE-SCORING ALL ${leads.length} leads...`);
  const results = [];
  
  for (const lead of leads) {
    const { score, reason } = await calculatePriorityScore(lead);
    await query('UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2', [score, lead.id]);
    results.push({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`, score, reason });
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
