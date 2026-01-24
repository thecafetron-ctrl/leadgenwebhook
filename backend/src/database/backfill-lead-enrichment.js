/**
 * Backfill lead enrichment fields for filtering + labeling.
 *
 * - Sets leads.lead_type from custom_fields.campaign_type when missing
 * - Normalizes budget + shipments ranges into:
 *   custom_fields.estimated_budget_aed_min/max
 *   custom_fields.shipments_per_month_min/max
 * - Adds decision_maker guess into custom_fields.decision_maker (+confidence/reason)
 *
 * Run:
 *   DATABASE_URL="..." node src/database/backfill-lead-enrichment.js
 */

import 'dotenv/config';
import { initDatabase, query, closeDatabase } from './connection.js';

function parseBudgetRangeAED(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.toLowerCase().trim();
  const normalize = (x) => {
    if (x.endsWith('m')) return Math.round(parseFloat(x.slice(0, -1)) * 1_000_000);
    if (x.endsWith('k')) return Math.round(parseFloat(x.slice(0, -1)) * 1_000);
    return parseInt(x, 10);
  };
  const cleaned = s.replace(/aed|\s/g, '').replace(/>/g, '+').replace(/_/g, '');
  const rangeMatch = cleaned.match(/^(\d+(?:\.\d+)?[km]?)-(\d+(?:\.\d+)?[km]?)\+?$/);
  if (rangeMatch) {
    const min = normalize(rangeMatch[1]);
    const max = normalize(rangeMatch[2]);
    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
  }
  const plusMatch = cleaned.match(/^(\d+(?:\.\d+)?[km]?)\+$/);
  if (plusMatch) {
    const min = normalize(plusMatch[1]);
    return Number.isFinite(min) ? { min, max: min } : null;
  }
  return null;
}

function parseShipmentsRange(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/_/g, ' ').replace(/,/g, '').trim();
  if (cleaned.endsWith('>')) {
    const min = parseInt(cleaned.replace('>', '').trim(), 10);
    return Number.isFinite(min) ? { min, max: min } : null;
  }
  const m = cleaned.match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) {
    const min = parseInt(m[1], 10);
    const max = parseInt(m[2], 10);
    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
  }
  return null;
}

function guessDecisionMaker({ job_title, company, custom_fields }) {
  const text = `${job_title || ''} ${company || ''} ${Object.values(custom_fields || {}).join(' ')}`.toLowerCase();
  const yes = /(owner|founder|ceo|cfo|coo|director|head|vp|vice president|general manager|gm|managing director|md|partner)/i;
  const no = /(student|intern|assistant|coordinator|need job|job seeker)/i;
  if (no.test(text)) return { decision_maker: false, confidence: 0.75, reason: 'title_keyword_no' };
  if (yes.test(text)) return { decision_maker: true, confidence: 0.75, reason: 'title_keyword_yes' };
  return { decision_maker: null, confidence: 0.0, reason: 'unknown' };
}

function getCustomField(obj, keys) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k]) return obj[k];
  }
  return null;
}

async function main() {
  await initDatabase();
  try {
    console.log('🔄 Backfilling lead enrichment...');

    const res = await query(`
      SELECT id, lead_type, job_title, company, custom_fields
      FROM leads
      ORDER BY created_at DESC
    `);

    let updated = 0;

    for (const row of res.rows) {
      const custom = row.custom_fields || {};

      // lead_type from campaign_type if missing
      let leadType = row.lead_type;
      const campaignType = custom.campaign_type;
      if (!leadType && (campaignType === 'ebook' || campaignType === 'consultation')) {
        leadType = campaignType;
      }

      // budget/shipment raw fields (handles both CSV import + meta poller raw)
      const budgetRaw =
        getCustomField(custom, [
          'estimated_budget_raw',
          "what's_your_estimated_budget_for_ai_implementation?",
          "what's your estimated budget for ai implementation?",
          'estimated_budget'
        ]) ||
        null;

      const shipmentsRaw =
        getCustomField(custom, [
          'shipments_per_month_raw',
          'how_many_shipments_do_you_receive_on_average_per_month?',
          'how many shipments do you receive on average per month?',
          'shipments_per_month'
        ]) ||
        null;

      const budgetRange = custom.estimated_budget_aed_min != null && custom.estimated_budget_aed_max != null
        ? null
        : parseBudgetRangeAED(budgetRaw);
      const shipmentsRange = custom.shipments_per_month_min != null && custom.shipments_per_month_max != null
        ? null
        : parseShipmentsRange(shipmentsRaw);

      const dmAlready = custom.decision_maker !== undefined && custom.decision_maker !== null;
      const dmGuess = dmAlready ? null : guessDecisionMaker({ job_title: row.job_title, company: row.company, custom_fields: custom });

      // Build patch object
      const patch = { ...custom };
      let needsUpdate = false;

      if (leadType && leadType !== row.lead_type) {
        needsUpdate = true;
      }
      if (budgetRaw && !patch.estimated_budget_raw) {
        patch.estimated_budget_raw = budgetRaw;
        needsUpdate = true;
      }
      if (budgetRange) {
        patch.estimated_budget_aed_min = budgetRange.min;
        patch.estimated_budget_aed_max = budgetRange.max;
        needsUpdate = true;
      }
      if (shipmentsRaw && !patch.shipments_per_month_raw) {
        patch.shipments_per_month_raw = shipmentsRaw;
        needsUpdate = true;
      }
      if (shipmentsRange) {
        patch.shipments_per_month_min = shipmentsRange.min;
        patch.shipments_per_month_max = shipmentsRange.max;
        needsUpdate = true;
      }
      if (dmGuess) {
        patch.decision_maker = dmGuess.decision_maker;
        patch.decision_maker_confidence = dmGuess.confidence;
        patch.decision_maker_reason = dmGuess.reason;
        needsUpdate = true;
      }

      if (!needsUpdate) continue;

      await query(
        `UPDATE leads SET lead_type = COALESCE($2, lead_type), custom_fields = $3::jsonb, updated_at = NOW() WHERE id = $1`,
        [row.id, leadType, JSON.stringify(patch)]
      );
      updated++;
    }

    console.log(`✅ Backfill complete. Updated ${updated} leads.`);
  } finally {
    await closeDatabase();
  }
}

main().catch((e) => {
  console.error('❌ Backfill failed:', e);
  process.exit(1);
});

