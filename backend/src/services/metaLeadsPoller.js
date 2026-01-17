/**
 * Meta Leads Poller Service
 * 
 * Polls Meta Graph API for new leads as a fallback when webhooks fail.
 * Runs every 5 minutes to check for leads that may have been missed.
 */

import Lead from '../models/Lead.js';
import { enrollLead } from './sequenceService.js';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
let pollInterval = null;
let lastPollTime = null;

/**
 * Fetch leads from Meta Graph API
 */
async function fetchMetaLeads(formId, pageAccessToken, since = null) {
  if (!formId || !pageAccessToken) {
    return [];
  }

  try {
    let url = `https://graph.facebook.com/v18.0/${formId}/leads?access_token=${pageAccessToken}&fields=id,created_time,field_data`;
    
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
    custom_fields: {}
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
async function processMetaLead(metaLead, formId) {
  const leadgenId = metaLead.id;
  
  // Check if lead already exists by source_id (leadgen_id)
  const existingBySourceId = await Lead.getLeadBySourceId(leadgenId);
  if (existingBySourceId) {
    return null; // Already processed
  }

  // Extract lead info
  const leadInfo = extractLeadInfo(metaLead.field_data);
  
  // Also check by email if we have one
  if (leadInfo.email) {
    const existingByEmail = await Lead.getLeadByEmail(leadInfo.email);
    if (existingByEmail) {
      console.log(`📋 Lead ${leadInfo.email} already exists, skipping`);
      return null;
    }
  }

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
    custom_fields: {
      ...leadInfo.custom_fields,
      meta_form_id: formId,
      meta_leadgen_id: leadgenId,
      imported_via: 'poller'
    },
    notes: 'Lead from Meta Forms (via polling)'
  };

  try {
    const lead = await Lead.createLead(leadData);
    console.log(`✅ [Poller] Created lead: ${leadInfo.first_name || 'Unknown'} ${leadInfo.last_name || ''} (${leadInfo.email || leadInfo.phone})`);

    // Enroll in sequence if we have email or phone
    if (lead.email || lead.phone) {
      await enrollLead(lead.id, 'new_lead', 'meta_poller');
      console.log(`📧 [Poller] Enrolled lead ${lead.id} in new_lead sequence`);
    }

    return lead;
  } catch (error) {
    console.error(`❌ [Poller] Error creating lead:`, error.message);
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
    // Silently skip if not configured
    return 0;
  }

  if (formIds.length === 0) {
    console.log('⚠️ META_FORM_IDS not configured, skipping poll');
    return 0;
  }

  let totalProcessed = 0;
  const since = lastPollTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours

  for (const formId of formIds) {
    const leads = await fetchMetaLeads(formId.trim(), pageAccessToken, since);
    
    for (const metaLead of leads) {
      const processed = await processMetaLead(metaLead, formId.trim());
      if (processed) totalProcessed++;
    }
  }

  lastPollTime = new Date();

  if (totalProcessed > 0) {
    console.log(`📊 [Poller] Processed ${totalProcessed} new leads from Meta`);
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

  // Then poll every 5 minutes
  pollInterval = setInterval(() => {
    pollForLeads().catch(console.error);
  }, POLL_INTERVAL);

  console.log('✅ Meta leads poller started (polling every 5 minutes)');
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
 * Manually trigger a poll (for testing)
 */
export async function manualPoll() {
  return await pollForLeads();
}

export default {
  startMetaLeadsPoller,
  stopMetaLeadsPoller,
  manualPoll
};
