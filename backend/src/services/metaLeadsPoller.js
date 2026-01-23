/**
 * Meta Leads Poller Service
 * 
 * Polls Meta Graph API for new leads every 2 minutes.
 * Uses OpenAI to intelligently classify leads as 'ebook' or 'consultation'.
 * 
 * CAMPAIGN TRACKING:
 * - Fetches ad/campaign info from Meta if ad_id is available
 * - Uses OpenAI to analyze lead data for classification
 * - Logs raw Meta data for debugging
 */

import Lead from '../models/Lead.js';
import { enrollLead } from './sequenceService.js';
import OpenAI from 'openai';

const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes
let pollInterval = null;
let lastPollTime = null;
let openai = null;

// Initialize OpenAI
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

/**
 * Fetch leads from Meta Graph API
 */
async function fetchMetaLeads(formId, pageAccessToken, since = null) {
  if (!formId || !pageAccessToken) {
    return [];
  }

  try {
    // Request all available fields
    let url = `https://graph.facebook.com/v18.0/${formId}/leads?access_token=${pageAccessToken}&fields=id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform`;
    
    // Only fetch leads created after the last poll
    if (since) {
      url += `&filtering=[{"field":"time_created","operator":"GREATER_THAN","value":${Math.floor(since.getTime() / 1000)}}]`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('❌ Meta API error:', data.error.message);
      return [];
    }

    return data.data || [];
  } catch (error) {
    console.error('❌ Error fetching Meta leads:', error.message);
    return [];
  }
}

/**
 * Try to fetch campaign info from ad_id
 */
async function fetchAdCampaignInfo(adId, pageAccessToken) {
  if (!adId || !pageAccessToken) return null;
  
  try {
    const url = `https://graph.facebook.com/v18.0/${adId}?access_token=${pageAccessToken}&fields=name,campaign_id,campaign{name},adset_id,adset{name}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.log(`⚠️ Could not fetch ad info for ${adId}: ${data.error.message}`);
      return null;
    }
    
    return {
      ad_name: data.name,
      campaign_id: data.campaign_id,
      campaign_name: data.campaign?.name,
      adset_id: data.adset_id,
      adset_name: data.adset?.name
    };
  } catch (error) {
    console.log(`⚠️ Error fetching ad info: ${error.message}`);
    return null;
  }
}

/**
 * Use OpenAI to classify lead type based on available data
 */
async function classifyLeadWithAI(leadData, campaignInfo) {
  const ai = getOpenAI();
  if (!ai) return 'unknown';
  
  try {
    const prompt = `Analyze this lead data and classify it as either "ebook" (lead wanted to download an ebook/guide/playbook) or "consultation" (lead wanted to book a call/consultation/meeting).

Lead form fields: ${JSON.stringify(leadData.custom_fields || {})}
Campaign name: ${campaignInfo?.campaign_name || 'Unknown'}
Ad set name: ${campaignInfo?.adset_name || 'Unknown'}
Ad name: ${campaignInfo?.ad_name || 'Unknown'}
Company: ${leadData.company || 'Unknown'}
Job title: ${leadData.job_title || 'Unknown'}

Based on this data, what type of lead is this? Respond with ONLY one word: "ebook" or "consultation" or "unknown" if you can't determine.`;

    const response = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10,
      temperature: 0
    });

    const classification = response.choices[0]?.message?.content?.trim().toLowerCase();
    
    if (classification === 'ebook' || classification === 'consultation') {
      return classification;
    }
    return 'unknown';
  } catch (error) {
    console.log(`⚠️ AI classification failed: ${error.message}`);
    return 'unknown';
  }
}

/**
 * Determine campaign type using all available methods
 */
async function determineCampaignType(metaLead, formId, leadInfo, campaignInfo) {
  // Method 1: Check campaign/ad names for keywords
  const allNames = [
    campaignInfo?.campaign_name || '',
    campaignInfo?.adset_name || '',
    campaignInfo?.ad_name || '',
    metaLead.campaign_name || '',
    metaLead.adset_name || '',
    metaLead.ad_name || ''
  ].join(' ').toLowerCase();
  
  // Check for ebook-related keywords
  if (allNames.match(/ebook|playbook|guide|download|pdf|free|resource/i)) {
    console.log(`   🏷️ Classified as EBOOK (keyword match)`);
    return 'ebook';
  }
  
  // Check for consultation-related keywords
  if (allNames.match(/consult|call|meeting|demo|book|schedule|discovery|strategy/i)) {
    console.log(`   🏷️ Classified as CONSULTATION (keyword match)`);
    return 'consultation';
  }
  
  // Method 2: Check form field values for hints
  const fieldValues = Object.values(leadInfo.custom_fields || {}).join(' ').toLowerCase();
  if (fieldValues.match(/ebook|playbook|guide|download/i)) {
    console.log(`   🏷️ Classified as EBOOK (form field match)`);
    return 'ebook';
  }
  if (fieldValues.match(/consult|call|meeting|book/i)) {
    console.log(`   🏷️ Classified as CONSULTATION (form field match)`);
    return 'consultation';
  }
  
  // Method 3: Use OpenAI as fallback
  console.log(`   🤖 Using AI to classify lead...`);
  const aiClassification = await classifyLeadWithAI(leadInfo, campaignInfo);
  if (aiClassification !== 'unknown') {
    console.log(`   🏷️ AI classified as ${aiClassification.toUpperCase()}`);
    return aiClassification;
  }
  
  // Default
  console.log(`   🏷️ Could not classify - marked as UNKNOWN`);
  return 'unknown';
}

/**
 * Extract lead info from Meta field_data
 */
function extractLeadInfo(fieldData) {
  const info = {
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    company: null,
    job_title: null,
    custom_fields: {},
    raw_fields: fieldData // Keep raw for debugging
  };

  if (!Array.isArray(fieldData)) return info;

  for (const field of fieldData) {
    const name = (field.name || '').toLowerCase().replace(/[_-]/g, ' ');
    const value = field.values?.[0] || '';

    if (!value) continue;

    if (name.includes('email') || value.includes('@')) {
      info.email = value;
    } else if (name.includes('phone') || name.includes('tel') || name.includes('mobile')) {
      info.phone = value;
    } else if (name === 'full name' || name === 'name' || name === 'fullname') {
      const parts = value.trim().split(' ');
      info.first_name = parts[0];
      info.last_name = parts.slice(1).join(' ') || null;
    } else if (name.includes('first') && name.includes('name')) {
      info.first_name = value;
    } else if (name.includes('last') && name.includes('name')) {
      info.last_name = value;
    } else if (name.includes('company')) {
      info.company = value;
    } else if (name.includes('role') || name.includes('title') || name.includes('job')) {
      info.job_title = value;
    } else {
      info.custom_fields[field.name || name] = value;
    }
  }

  return info;
}

/**
 * Process a single lead from Meta
 */
async function processMetaLead(metaLead, formId, pageAccessToken) {
  const leadgenId = metaLead.id;
  
  // Check if lead already exists
  const existingBySourceId = await Lead.getLeadBySourceId(leadgenId);
  if (existingBySourceId) {
    return null;
  }

  // Extract lead info
  const leadInfo = extractLeadInfo(metaLead.field_data);
  
  if (leadInfo.email) {
    const existingByEmail = await Lead.getLeadByEmail(leadInfo.email);
    if (existingByEmail) {
      console.log(`📋 Lead ${leadInfo.email} already exists, skipping`);
      return null;
    }
  }

  console.log(`\n📥 Processing new lead: ${leadInfo.first_name || 'Unknown'} ${leadInfo.last_name || ''}`);
  console.log(`   📧 Email: ${leadInfo.email || 'N/A'}`);
  console.log(`   📞 Phone: ${leadInfo.phone || 'N/A'}`);
  
  // Log raw Meta data for debugging
  console.log(`   📊 Raw Meta data:`);
  console.log(`      - ad_id: ${metaLead.ad_id || 'N/A'}`);
  console.log(`      - ad_name: ${metaLead.ad_name || 'N/A'}`);
  console.log(`      - campaign_id: ${metaLead.campaign_id || 'N/A'}`);
  console.log(`      - campaign_name: ${metaLead.campaign_name || 'N/A'}`);
  console.log(`      - adset_name: ${metaLead.adset_name || 'N/A'}`);

  // Try to fetch additional campaign info from ad_id
  let campaignInfo = null;
  if (metaLead.ad_id && pageAccessToken) {
    console.log(`   🔍 Fetching campaign info from ad_id...`);
    campaignInfo = await fetchAdCampaignInfo(metaLead.ad_id, pageAccessToken);
    if (campaignInfo) {
      console.log(`      - Campaign: ${campaignInfo.campaign_name || 'N/A'}`);
      console.log(`      - Ad Set: ${campaignInfo.adset_name || 'N/A'}`);
      console.log(`      - Ad: ${campaignInfo.ad_name || 'N/A'}`);
    }
  }

  // Determine campaign type
  const campaignType = await determineCampaignType(metaLead, formId, leadInfo, campaignInfo);

  // Merge all campaign data
  const finalCampaignInfo = {
    campaign_id: campaignInfo?.campaign_id || metaLead.campaign_id || null,
    campaign_name: campaignInfo?.campaign_name || metaLead.campaign_name || null,
    adset_id: campaignInfo?.adset_id || metaLead.adset_id || null,
    adset_name: campaignInfo?.adset_name || metaLead.adset_name || null,
    ad_id: metaLead.ad_id || null,
    ad_name: campaignInfo?.ad_name || metaLead.ad_name || null
  };

  // Create the lead
  const leadData = {
    first_name: leadInfo.first_name,
    last_name: leadInfo.last_name,
    email: leadInfo.email,
    phone: leadInfo.phone,
    company: leadInfo.company,
    job_title: leadInfo.job_title,
    source: 'meta_forms',
    source_id: leadgenId,
    campaign_id: finalCampaignInfo.campaign_id,
    custom_fields: {
      ...leadInfo.custom_fields,
      meta_form_id: formId,
      meta_leadgen_id: leadgenId,
      meta_ad_id: finalCampaignInfo.ad_id,
      meta_ad_name: finalCampaignInfo.ad_name,
      meta_adset_id: finalCampaignInfo.adset_id,
      meta_adset_name: finalCampaignInfo.adset_name,
      meta_campaign_id: finalCampaignInfo.campaign_id,
      meta_campaign_name: finalCampaignInfo.campaign_name,
      campaign_type: campaignType,
      imported_via: 'poller',
      raw_meta_data: JSON.stringify({
        ad_id: metaLead.ad_id,
        ad_name: metaLead.ad_name,
        campaign_id: metaLead.campaign_id,
        campaign_name: metaLead.campaign_name,
        adset_id: metaLead.adset_id,
        adset_name: metaLead.adset_name,
        platform: metaLead.platform
      })
    },
    notes: `Lead from Meta Forms - Campaign: ${finalCampaignInfo.campaign_name || 'Unknown'} - Type: ${campaignType.toUpperCase()}`
  };

  try {
    const lead = await Lead.createLead(leadData);
    console.log(`   ✅ Created lead ID: ${lead.id}`);
    console.log(`   🏷️ Campaign Type: ${campaignType.toUpperCase()}`);

    // Enroll in sequence
    if (lead.email || lead.phone) {
      await enrollLead(lead.id, 'new_lead', { enrolledBy: 'meta_poller' });
      console.log(`   📧 Enrolled in new_lead sequence`);
    }

    return lead;
  } catch (error) {
    console.error(`   ❌ Error creating lead:`, error.message);
    return null;
  }
}

/**
 * Poll for new leads
 */
async function pollForLeads() {
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const formIds = (process.env.META_FORM_IDS || '').split(',').filter(Boolean);

  if (!pageAccessToken) {
    return 0;
  }

  if (formIds.length === 0) {
    console.log('⚠️ META_FORM_IDS not configured, skipping poll');
    return 0;
  }

  let totalProcessed = 0;
  const since = lastPollTime || new Date(Date.now() - 24 * 60 * 60 * 1000);

  console.log(`\n🔄 [${new Date().toISOString()}] Polling Meta for new leads...`);

  for (const formId of formIds) {
    const leads = await fetchMetaLeads(formId.trim(), pageAccessToken, since);
    console.log(`   Form ${formId}: ${leads.length} leads found`);
    
    for (const metaLead of leads) {
      const processed = await processMetaLead(metaLead, formId.trim(), pageAccessToken);
      if (processed) totalProcessed++;
    }
  }

  lastPollTime = new Date();

  if (totalProcessed > 0) {
    console.log(`\n📊 Processed ${totalProcessed} new leads`);
  }

  return totalProcessed;
}

/**
 * Start the polling service
 */
export function startMetaLeadsPoller() {
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
  
  if (!pageAccessToken) {
    console.log('ℹ️ Meta leads poller not started (META_PAGE_ACCESS_TOKEN not set)');
    return;
  }

  // Poll immediately on start
  pollForLeads().catch(console.error);

  // Then poll every 2 minutes
  pollInterval = setInterval(() => {
    pollForLeads().catch(console.error);
  }, POLL_INTERVAL);

  console.log('✅ Meta leads poller started (polling every 2 minutes)');
  console.log('   🤖 OpenAI classification: ' + (process.env.OPENAI_API_KEY ? 'enabled' : 'disabled'));
}

/**
 * Stop the polling service
 */
export function stopMetaLeadsPoller() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('🛑 Meta leads poller stopped');
  }
}

/**
 * Manually trigger a poll
 */
export async function manualPoll() {
  return await pollForLeads();
}

/**
 * Get poller status
 */
export function getPollerStatus() {
  return {
    running: pollInterval !== null,
    lastPollTime,
    pollIntervalMinutes: POLL_INTERVAL / 1000 / 60,
    aiEnabled: !!process.env.OPENAI_API_KEY,
    formIds: (process.env.META_FORM_IDS || '').split(',').filter(Boolean)
  };
}

export default {
  startMetaLeadsPoller,
  stopMetaLeadsPoller,
  manualPoll,
  getPollerStatus
};
