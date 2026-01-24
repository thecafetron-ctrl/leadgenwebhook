/**
 * AI Priority Scoring Service
 * 
 * Upgraded to AI-powered intent scoring:
 * - Detects fake / low-quality leads
 * - Uses campaign context (ebook vs consultation)
 * - Uses budget + shipment volume heavily, but can override ebook bias if signals are strong
 * - Produces an intent category + confidence + next action
 */

import OpenAI from 'openai';
import { query } from '../database/connection.js';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Fallback heuristic scoring (used only if OpenAI not configured)
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

function getNormalizedSignals(lead) {
  const cf = lead.custom_fields || {};
  const budgetMin = cf.estimated_budget_aed_min ?? null;
  const budgetMax = cf.estimated_budget_aed_max ?? null;
  const shipMin = cf.shipments_per_month_min ?? null;
  const shipMax = cf.shipments_per_month_max ?? null;
  const dm = cf.decision_maker ?? null;
  const campaignName = cf.meta_campaign_name || cf.campaign_name || null;
  const adName = cf.meta_ad_name || cf.ad_name || null;
  const why = cf["why_do_you_want_to_automate_now?"] || cf.why_automate || null;
  return { budgetMin, budgetMax, shipMin, shipMax, dm, campaignName, adName, why };
}

function derivePriorityFromScore(score) {
  if (score >= 80) return 'urgent';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function isFreeEmail(email = '') {
  const e = (email || '').toLowerCase();
  return ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].some(d => e.endsWith(`@${d}`));
}

function extractCompanyDomain(email = '') {
  const e = (email || '').toLowerCase().trim();
  const m = e.match(/@([^@\s]+)$/);
  if (!m) return null;
  const domain = m[1];
  if (!domain || domain.includes('gmail.') || domain.includes('yahoo.') || domain.includes('hotmail.') || domain.includes('outlook.') || domain.includes('icloud.')) {
    return null;
  }
  return domain;
}

async function fetchWebsiteSnapshot(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LeadPipelineBot/1.0 (company research)' }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    const text = noScript.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      url,
      title: titleMatch?.[1]?.trim() || null,
      description: metaMatch?.[1]?.trim() || null,
      textExcerpt: text.slice(0, 6000)
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function aiScoreLeadInternal(lead) {
  const cf = lead.custom_fields || {};
  const signals = getNormalizedSignals(lead);
  const leadType = lead.lead_type || cf.campaign_type || null;

  const prompt = `You are an expert lead qualifier for STRUCTURE (logistics automation for freight forwarders/logistics in UAE/Dubai).

Your job: score BUYING INTENT from 0-100 and classify intent.

BUDGET CALIBRATION (AED - this is CRITICAL):
- 35,000 AED or below = LOW budget (score penalty, max 40 points for budget factor)
- 35,001 - 99,999 AED = MEDIUM budget (decent but not exciting)
- 100,000 - 299,999 AED = GOOD budget (this is where real buyers start)
- 300,000 - 599,999 AED = HIGH budget (serious buyer)
- 600,000 - 999,999 AED = VERY HIGH budget (priority lead)
- 1,000,000+ AED = PREMIUM budget (VIP treatment)

SHIPMENT VOLUME CALIBRATION:
- Under 500/month = Small operation
- 500-1,000/month = Medium operation  
- 1,000-5,000/month = Good volume
- 5,000-10,000/month = High volume (serious)
- 10,000+/month = Enterprise volume (priority)

IMPORTANT RULES:
- Ebook leads usually have LOWER intent because they want something free. Apply a *default penalty* for ebook leads (-15 to -25 points), BUT override it if strong buying signals exist (high budget ≥300k, high volume ≥5000, decision-maker, clear pain, booking intent, realistic company).
- Detect fake/low-quality leads: gibberish names, suspicious email typos, job-seeker answers, inconsistent fields, nonsense text, random characters.
- Budget + shipment volume are the PRIMARY factors (60% weight). Decision-maker is also major (15% weight).
- If data is missing, do not guess aggressively; lower confidence.
- A 35k AED budget is OBJECTIVELY LOW for enterprise automation - do NOT score it highly.

Scoring anchors (use these to calibrate):
  - 0-15 = junk/trash/fake/job-seeker/spam
  - 16-30 = very low (ebook hunters, tiny budget, no real intent)
  - 31-45 = low (35k budget range, small volume, no urgency)
  - 46-59 = medium (decent signals but missing key factors)
  - 60-74 = warm (good budget 100k+, decent volume, some intent)
  - 75-89 = hot (high budget 300k+, high volume, decision-maker)
  - 90-100 = PERFECT (600k+ budget, 5000+ shipments, decision-maker, business email, clear pain). 100 IS allowed for truly perfect leads.

Return ONLY valid JSON with this exact schema:
{
  "score": number,
  "intent_category": "hot" | "warm" | "medium" | "low" | "junk",
  "confidence": number,
  "priority": "urgent" | "high" | "medium" | "low",
  "flags": {
    "likely_fake": boolean,
    "ebook_hunter": boolean,
    "job_seeker": boolean,
    "bad_contact_info": boolean
  },
  "top_reasons": string[],
  "recommended_next_step": string
}

LEAD:
- name: ${lead.first_name || ''} ${lead.last_name || ''}
- email: ${lead.email || ''}
- phone: ${lead.phone || ''}
- company: ${lead.company || ''}
- job_title: ${lead.job_title || ''}
- lead_type: ${leadType || 'unknown'}
- campaign_name: ${signals.campaignName || 'unknown'}
- ad_name: ${signals.adName || 'unknown'}
- budget_min_aed: ${signals.budgetMin ?? 'null'}
- budget_max_aed: ${signals.budgetMax ?? 'null'}
- shipments_min: ${signals.shipMin ?? 'null'}
- shipments_max: ${signals.shipMax ?? 'null'}
- decision_maker_flag: ${signals.dm ?? 'null'}
- why_automate: ${signals.why || 'null'}
- raw_form_fields: ${JSON.stringify(cf).slice(0, 4000)}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
    temperature: 0.2
  });

  const text = completion.choices[0]?.message?.content?.trim() || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);

  // Basic sanity
  const score = Math.max(0, Math.min(100, Number(parsed.score ?? 0)));
  const priority = ['urgent', 'high', 'medium', 'low'].includes(parsed.priority)
    ? parsed.priority
    : derivePriorityFromScore(score);

  return {
    score,
    intent_category: parsed.intent_category || 'low',
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
    priority,
    flags: parsed.flags || {},
    top_reasons: Array.isArray(parsed.top_reasons) ? parsed.top_reasons.slice(0, 6) : [],
    recommended_next_step: parsed.recommended_next_step || 'Follow up with a short qualifying message.'
  };
}

function postProcessAiScore(lead, aiResult) {
  const flags = aiResult.flags || {};
  let score = aiResult.score;

  // Only apply hard caps for clearly fake/junk leads - let AI score stand otherwise
  if (flags.likely_fake) {
    score = Math.min(score, 15);
  }
  if (flags.job_seeker) {
    score = Math.min(score, 20);
  }

  // Trust the AI score - no other caps. Let good leads score high.

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    ...aiResult,
    score,
    priority: derivePriorityFromScore(score)
  };
}

async function persistAiScore(leadId, aiResult) {
  const patch = {
    ai_intent_score: aiResult.score,
    ai_intent_category: aiResult.intent_category,
    ai_confidence: aiResult.confidence,
    ai_flags: aiResult.flags,
    ai_top_reasons: aiResult.top_reasons,
    ai_recommended_next_step: aiResult.recommended_next_step,
    ai_model: 'gpt-4o-mini',
    ai_scored_at: new Date().toISOString()
  };

  await query(
    `UPDATE leads
     SET score = $1,
         priority = $2,
         custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $3::jsonb,
         updated_at = NOW()
     WHERE id = $4`,
    [aiResult.score, aiResult.priority, JSON.stringify(patch), leadId]
  );
}

/**
 * Fetch multiple URLs in parallel with timeout
 */
async function fetchMultipleUrls(urls, timeoutMs = 5000) {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StructureBot/1.0)' }
        });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const html = await res.text();
        return { url, html };
      } catch {
        clearTimeout(timeout);
        return null;
      }
    })
  );
  return results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
}

/**
 * Extract useful info from HTML
 */
function parseHtmlForInsights(html, url) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  
  // Extract visible text (remove scripts, styles)
  const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');
  const text = noScript.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Look for key info
  const aboutMatch = text.match(/(about us|who we are|our company|our story)[:\s]*([^.]+\.[^.]+\.)/i);
  const servicesMatch = text.match(/(our services|what we do|we offer|we provide)[:\s]*([^.]+\.[^.]+\.)/i);
  
  return {
    url,
    title: titleMatch?.[1]?.trim(),
    description: metaDesc?.[1]?.trim(),
    headline: h1Match?.[1]?.trim(),
    aboutSnippet: aboutMatch?.[2]?.trim(),
    servicesSnippet: servicesMatch?.[2]?.trim(),
    textExcerpt: text.slice(0, 4000)
  };
}

/**
 * Get AI advice on how to approach this lead - with REAL company research
 */
export async function getLeadAdvice(leadId) {
  const startTime = Date.now();
  
  const result = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
  if (result.rows.length === 0) {
    throw new Error('Lead not found');
  }

  const lead = result.rows[0];
  const cf = lead.custom_fields || {};
  const domain = extractCompanyDomain(lead.email);
  const companyName = lead.company || '';
  
  // Parallel research: fetch company website + LinkedIn/Google if possible
  let research = { website: null, linkedin: null, additionalPages: [] };
  
  if (domain) {
    const urlsToFetch = [
      `https://${domain}`,
      `https://${domain}/about`,
      `https://${domain}/about-us`,
      `https://${domain}/services`,
      `https://www.${domain}`,
    ];
    
    console.log(`🔍 Researching ${domain} for lead ${lead.first_name}...`);
    const fetched = await fetchMultipleUrls(urlsToFetch, 4000);
    
    if (fetched.length > 0) {
      research.website = parseHtmlForInsights(fetched[0].html, fetched[0].url);
      research.additionalPages = fetched.slice(1).map(f => parseHtmlForInsights(f.html, f.url));
    }
  }
  
  const researchTime = Date.now() - startTime;
  console.log(`📊 Research completed in ${researchTime}ms`);

  if (!openai) {
    return {
      leadId,
      name: `${lead.first_name} ${lead.last_name}`,
      company: lead.company,
      score: lead.score,
      assessment: "OpenAI not configured.",
      companyOverview: research.website?.description || "No company info available",
      researchedInsights: [],
      likelyPainPoints: ["Manual data entry", "Slow quoting", "Invoice errors"],
      talkingPoints: ["Focus on ROI", "Mention similar companies", "Offer pilot"],
      objections: ["Budget timing", "Implementation concerns"],
      openingLine: `Hi ${lead.first_name}, noticed you're in logistics. Happy to show you how we automate ops.`,
      researchSources: research.website ? [research.website.url] : []
    };
  }

  // Build comprehensive research context
  const websiteContent = research.website ? `
COMPANY WEBSITE (${research.website.url}):
- Title: ${research.website.title || 'N/A'}
- Description: ${research.website.description || 'N/A'}
- Headline: ${research.website.headline || 'N/A'}
- About: ${research.website.aboutSnippet || 'N/A'}
- Services: ${research.website.servicesSnippet || 'N/A'}
- Full text excerpt: ${research.website.textExcerpt}
` : 'NO WEBSITE FOUND';

  const additionalContent = research.additionalPages.length > 0 
    ? research.additionalPages.map(p => `
ADDITIONAL PAGE (${p.url}):
${p.textExcerpt?.slice(0, 1500) || 'N/A'}
`).join('\n')
    : '';

  const prompt = `You are an elite B2B sales researcher for STRUCTURE (logistics automation platform in Dubai/UAE). 
Your job: Research this lead's company and give SPECIFIC, ACTIONABLE sales intelligence.

LEAD INFO:
- Name: ${lead.first_name} ${lead.last_name}
- Company: ${companyName || 'Unknown'}
- Email Domain: ${domain || 'N/A'}
- Role: ${cf["what's_your_role_in_the_company?"] || lead.job_title || 'Unknown'}
- Budget: ${cf["what's_your_estimated_budget_for_ai_implementation?"] || 'Not specified'}
- Monthly Shipments: ${cf["how_many_shipments_do_you_receive_on_average_per_month?"] || 'Not specified'}
- Why automating now: ${cf["why_do_you_want_to_automate_now?"] || 'Not specified'}
- Lead Score: ${lead.score}/100
- Lead Type: ${lead.lead_type || 'unknown'}

${websiteContent}

${additionalContent}

STRUCTURE SOLUTIONS (what we sell):
- Automated quoting (instant rate calculations)
- Document automation (BL, invoices, customs docs)
- Finance reconciliation
- Customs compliance automation
- WhatsApp/email communication automation

YOUR TASK:
1. Analyze the company's business model from website
2. Identify SPECIFIC pain points they likely have (based on their industry, size, services)
3. Find angles that show you've done research (mention specific things from their website)
4. Give a hyper-personalized opening line that proves you researched them

Return ONLY valid JSON:
{
  "companyOverview": "What this company actually does (2-3 sentences, be specific)",
  "industryVertical": "Their specific niche (e.g., 'perishables freight', 'automotive logistics', 'e-commerce fulfillment')",
  "estimatedSize": "small/medium/large based on website",
  "researchedInsights": [
    "Specific insight 1 from their website (e.g., 'They handle temperature-controlled cargo based on their services page')",
    "Specific insight 2",
    "Specific insight 3"
  ],
  "likelyPainPoints": [
    "Pain point 1 specific to their business",
    "Pain point 2",
    "Pain point 3"
  ],
  "competitiveContext": "Who they compete with or what market pressures they face",
  "talkingPoints": [
    "Specific talking point referencing their business",
    "ROI angle specific to their volume/budget",
    "Relevant case study angle"
  ],
  "objections": ["Likely objection 1", "Likely objection 2"],
  "openingLine": "Hyper-personalized opener that references something specific about their company",
  "followUpAngle": "What to discuss in the second conversation"
}`;

  try {
    const aiStart = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    });
    const aiTime = Date.now() - aiStart;
    console.log(`🤖 AI analysis completed in ${aiTime}ms`);

    const response = completion.choices[0].message.content.trim();
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    
    return {
      leadId,
      name: `${lead.first_name} ${lead.last_name}`,
      company: lead.company,
      email: lead.email,
      score: lead.score,
      researchSources: [
        research.website?.url,
        ...research.additionalPages.map(p => p.url)
      ].filter(Boolean),
      timings: {
        researchMs: researchTime,
        aiMs: aiTime,
        totalMs: Date.now() - startTime
      },
      ...parsed
    };
  } catch (error) {
    console.error('AI advice error:', error);
    return {
      leadId,
      name: `${lead.first_name} ${lead.last_name}`,
      company: lead.company,
      score: lead.score,
      companyOverview: research.website?.description || "Could not analyze company",
      researchedInsights: research.website ? [
        `Website: ${research.website.title}`,
        research.website.aboutSnippet || "No about section found"
      ] : ["No website found for research"],
      likelyPainPoints: ["Manual quoting processes", "Document handling overhead", "Reconciliation delays"],
      talkingPoints: ["Discuss current ops pain", "Show ROI calculator", "Offer pilot program"],
      objections: ["Implementation timeline", "Integration with existing systems"],
      openingLine: `Hi ${lead.first_name}, saw you're looking to automate your logistics ops. Happy to show you what's possible.`,
      researchSources: research.website ? [research.website.url] : [],
      error: error.message
    };
  }
}

/**
 * Score a single lead (AI-powered when OpenAI is configured)
 */
export async function scoreLead(leadId) {
  const result = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
  if (result.rows.length === 0) throw new Error('Lead not found');

  const lead = result.rows[0];
  
  // AI scoring (preferred)
  if (openai) {
    const rawAi = await aiScoreLeadInternal(lead);
    const aiResult = postProcessAiScore(lead, rawAi);
    await persistAiScore(leadId, aiResult);
    return {
      leadId,
      name: `${lead.first_name} ${lead.last_name}`.trim(),
      score: aiResult.score,
      intentCategory: aiResult.intent_category,
      confidence: aiResult.confidence,
      priority: aiResult.priority,
      flags: aiResult.flags,
      reasons: aiResult.top_reasons,
      recommendedNextStep: aiResult.recommended_next_step
    };
  }

  // Fallback heuristic
  const { score, reason, factors } = await calculatePriorityScore(lead);
  await query('UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2', [score, leadId]);
  return { leadId, name: `${lead.first_name} ${lead.last_name}`.trim(), score, reason, factors };
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
    if (openai) {
      const rawAi = await aiScoreLeadInternal(lead);
      const aiResult = postProcessAiScore(lead, rawAi);
      await persistAiScore(lead.id, aiResult);
      results.push({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`.trim(), score: aiResult.score, intentCategory: aiResult.intent_category });
    } else {
      const { score, reason } = await calculatePriorityScore(lead);
      await query('UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2', [score, lead.id]);
      results.push({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`.trim(), score, reason });
    }
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
    if (openai) {
      const rawAi = await aiScoreLeadInternal(lead);
      const aiResult = postProcessAiScore(lead, rawAi);
      await persistAiScore(lead.id, aiResult);
      results.push({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`.trim(), score: aiResult.score, intentCategory: aiResult.intent_category });
    } else {
      const { score, reason } = await calculatePriorityScore(lead);
      await query('UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2', [score, lead.id]);
      results.push({ id: lead.id, name: `${lead.first_name} ${lead.last_name}`.trim(), score, reason });
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
// Force redeploy Wed Jan 21 16:17:18 PKT 2026
