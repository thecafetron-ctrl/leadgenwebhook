/**
 * AI Priority Scoring Service
 * 
 * Uses OpenAI to analyze lead data and calculate a priority score (0-100)
 * Higher scores = higher priority leads
 */

import OpenAI from 'openai';
import { query } from '../database/connection.js';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Calculate AI priority score for a lead
 * Returns a score from 0-100
 */
export async function calculatePriorityScore(lead) {
  if (!openai) {
    console.warn('OpenAI API key not set, using fallback scoring');
    return calculateFallbackScore(lead);
  }

  try {
    const prompt = `You are a B2B lead scoring expert for a logistics automation company (STRUCTURE). 
Analyze this lead and provide a priority score from 0-100 based on their likelihood to convert and potential value.

LEAD DATA:
- Name: ${lead.first_name || ''} ${lead.last_name || ''}
- Email: ${lead.email || 'Not provided'}
- Phone: ${lead.phone || 'Not provided'}
- Company: ${lead.company || 'Not provided'}
- Job Title: ${lead.job_title || 'Not provided'}
- Source: ${lead.source || 'Unknown'}
- Notes: ${lead.notes || 'None'}
- Custom Fields: ${JSON.stringify(lead.custom_fields || {})}

SCORING CRITERIA (weight these factors):
1. Decision maker role (Owner, CEO, COO, Operations Manager = high score)
2. Company provided (yes = +10-20 points)
3. Phone number provided (yes = +10 points, indicates serious interest)
4. Budget mentioned (35k AED+ = high score)
5. Shipment volume (1000+ = high score)
6. Clear automation intent/pain point mentioned
7. Email domain (company email > gmail/yahoo)
8. Source quality (meta_forms with full info = good)

Return ONLY a JSON object like this (no other text):
{"score": 75, "reason": "Decision maker at logistics company with high volume and budget"}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.3, // Lower temperature for more consistent scoring
    });

    const response = completion.choices[0].message.content.trim();
    
    // Parse JSON response
    try {
      const parsed = JSON.parse(response);
      const score = Math.min(100, Math.max(0, parseInt(parsed.score) || 50));
      console.log(`🤖 AI Score for ${lead.first_name}: ${score} - ${parsed.reason}`);
      return { score, reason: parsed.reason };
    } catch (parseError) {
      // Try to extract just the number if JSON parsing fails
      const match = response.match(/\d+/);
      const score = match ? Math.min(100, Math.max(0, parseInt(match[0]))) : 50;
      return { score, reason: 'AI analysis' };
    }
  } catch (error) {
    console.error('AI scoring error:', error);
    return calculateFallbackScore(lead);
  }
}

/**
 * Fallback scoring when OpenAI is unavailable
 */
function calculateFallbackScore(lead) {
  let score = 30; // Base score
  let reasons = [];

  // Has company name
  if (lead.company) {
    score += 15;
    reasons.push('company provided');
  }

  // Has phone number (high intent indicator)
  if (lead.phone) {
    score += 10;
    reasons.push('phone provided');
  }

  // Has job title
  if (lead.job_title) {
    score += 5;
    const title = lead.job_title.toLowerCase();
    if (title.includes('owner') || title.includes('ceo') || title.includes('director') || title.includes('manager')) {
      score += 15;
      reasons.push('decision maker');
    }
  }

  // Email quality
  if (lead.email) {
    if (!lead.email.includes('gmail') && !lead.email.includes('yahoo') && !lead.email.includes('hotmail')) {
      score += 10;
      reasons.push('business email');
    }
  }

  // Source quality
  if (lead.source === 'meta_forms') {
    score += 5;
  }

  // Custom fields analysis
  const cf = lead.custom_fields || {};
  
  // Budget
  const budget = cf["what's_your_estimated_budget_for_ai_implementation?"] || cf.budget || '';
  if (budget.includes('35k') || budget.includes('50k') || budget.includes('100k')) {
    score += 15;
    reasons.push('high budget');
  }

  // Shipment volume
  const volume = cf["how_many_shipments_do_you_receive_on_average_per_month?"] || cf.volume || '';
  if (volume.includes('1,000') || volume.includes('5,000') || volume.includes('10,000')) {
    score += 10;
    reasons.push('high volume');
  }

  // Has meeting booked
  if (cf.booking_time || cf.calcom_booking_id) {
    score += 10;
    reasons.push('meeting booked');
  }

  return { 
    score: Math.min(100, score), 
    reason: reasons.length > 0 ? reasons.join(', ') : 'basic scoring' 
  };
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
  const { score, reason } = await calculatePriorityScore(lead);

  // Update the score in database
  await query(
    'UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2',
    [score, leadId]
  );

  console.log(`📊 Scored lead ${lead.first_name}: ${score}/100 (${reason})`);
  return { leadId, score, reason };
}

/**
 * Score all leads that don't have a score yet
 */
export async function scoreAllLeads() {
  const result = await query('SELECT * FROM leads WHERE score = 0 OR score IS NULL ORDER BY created_at DESC LIMIT 50');
  const leads = result.rows;

  console.log(`📊 Scoring ${leads.length} leads...`);

  const results = [];
  for (const lead of leads) {
    try {
      const { score, reason } = await calculatePriorityScore(lead);
      await query('UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2', [score, lead.id]);
      results.push({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`, score, reason });
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Failed to score lead ${lead.id}:`, error);
    }
  }

  return results;
}

/**
 * Re-score a lead (force recalculation)
 */
export async function rescoreLead(leadId) {
  return scoreLead(leadId);
}

export default {
  calculatePriorityScore,
  scoreLead,
  scoreAllLeads,
  rescoreLead
};
