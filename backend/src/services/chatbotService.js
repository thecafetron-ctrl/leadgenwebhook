/**
 * Chatbot Service
 * 
 * AI-powered chatbot that knows about all leads and can answer questions.
 * Uses OpenAI to provide intelligent responses about lead data.
 */

import OpenAI from 'openai';
import { query } from '../database/connection.js';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Get lead statistics for context
 */
async function getLeadStats() {
  const stats = await query(`
    SELECT 
      COUNT(*) as total_leads,
      COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
      COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_leads,
      COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
      COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
      COUNT(CASE WHEN lead_type = 'consultation' THEN 1 END) as consultation_leads,
      COUNT(CASE WHEN lead_type = 'ebook' THEN 1 END) as ebook_leads,
      AVG(score) as avg_score,
      COUNT(CASE WHEN score >= 80 THEN 1 END) as high_score_leads
    FROM leads
  `);
  
  return stats.rows[0];
}

/**
 * Get recent leads for context
 */
async function getRecentLeads(limit = 10) {
  const leads = await query(`
    SELECT 
      id, first_name, last_name, email, phone, company, 
      status, score, lead_type, created_at,
      custom_fields->>'estimated_budget_aed_min' as budget_min,
      custom_fields->>'estimated_budget_aed_max' as budget_max,
      custom_fields->>'shipments_per_month_min' as shipments_min,
      custom_fields->>'shipments_per_month_max' as shipments_max,
      custom_fields->>'decision_maker' as decision_maker
    FROM leads
    ORDER BY created_at DESC
    LIMIT $1
  `, [limit]);
  
  return leads.rows.map(lead => ({
    name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
    email: lead.email,
    company: lead.company,
    status: lead.status,
    score: lead.score,
    type: lead.lead_type,
    budget: lead.budget_min && lead.budget_max 
      ? `${lead.budget_min}-${lead.budget_max} AED`
      : null,
    shipments: lead.shipments_min && lead.shipments_max
      ? `${lead.shipments_min}-${lead.shipments_max}/month`
      : null,
    decisionMaker: lead.decision_maker === 'true',
    createdAt: lead.created_at
  }));
}

/**
 * Search leads by query
 */
async function searchLeads(searchQuery, limit = 5) {
  const leads = await query(`
    SELECT 
      id, first_name, last_name, email, phone, company, 
      status, score, lead_type, created_at,
      custom_fields->>'estimated_budget_aed_min' as budget_min,
      custom_fields->>'estimated_budget_aed_max' as budget_max
    FROM leads
    WHERE 
      first_name ILIKE $1 OR
      last_name ILIKE $1 OR
      email ILIKE $1 OR
      company ILIKE $1 OR
      phone ILIKE $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [`%${searchQuery}%`, limit]);
  
  return leads.rows.map(lead => ({
    name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
    email: lead.email,
    company: lead.company,
    status: lead.status,
    score: lead.score,
    type: lead.lead_type,
    budget: lead.budget_min && lead.budget_max 
      ? `${lead.budget_min}-${lead.budget_max} AED`
      : null
  }));
}

/**
 * Get lead by ID
 */
async function getLeadById(leadId) {
  const result = await query(`
    SELECT 
      id, first_name, last_name, email, phone, company, job_title,
      status, score, priority, lead_type, created_at, updated_at,
      custom_fields
    FROM leads
    WHERE id = $1
  `, [leadId]);
  
  if (result.rows.length === 0) return null;
  
  const lead = result.rows[0];
  const cf = lead.custom_fields || {};
  
  return {
    id: lead.id,
    name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    jobTitle: lead.job_title,
    status: lead.status,
    score: lead.score,
    priority: lead.priority,
    type: lead.lead_type,
    budget: cf.estimated_budget_aed_min && cf.estimated_budget_aed_max
      ? `${cf.estimated_budget_aed_min}-${cf.estimated_budget_aed_max} AED`
      : null,
    shipments: cf.shipments_per_month_min && cf.shipments_per_month_max
      ? `${cf.shipments_per_month_min}-${cf.shipments_per_month_max}/month`
      : null,
    decisionMaker: cf.decision_maker === 'true',
    createdAt: lead.created_at,
    updatedAt: lead.updated_at
  };
}

/**
 * Process chatbot query with OpenAI
 */
export async function processChatbotQuery(userMessage, conversationHistory = []) {
  if (!openai) {
    return {
      response: "I'm sorry, but OpenAI is not configured. Please set the OPENAI_API_KEY environment variable.",
      error: 'OpenAI not configured'
    };
  }

  try {
    // Get context about leads
    const [stats, recentLeads] = await Promise.all([
      getLeadStats(),
      getRecentLeads(5)
    ]);

    // Build system prompt with lead context
    const systemPrompt = `You are an AI assistant helping manage a lead generation pipeline. You have access to lead data and can answer questions about leads, their status, scores, budgets, and more.

Current Lead Statistics:
- Total Leads: ${stats.total_leads}
- New: ${stats.new_leads} | Contacted: ${stats.contacted_leads} | Qualified: ${stats.qualified_leads} | Converted: ${stats.converted_leads}
- Consultation Leads: ${stats.consultation_leads} | Ebook Leads: ${stats.ebook_leads}
- Average Score: ${Math.round(stats.avg_score || 0)}
- High Score Leads (80+): ${stats.high_score_leads}

Recent Leads (last 5):
${recentLeads.map((lead, i) => 
  `${i + 1}. ${lead.name} (${lead.email}) - ${lead.company || 'No company'} - Status: ${lead.status} - Score: ${lead.score} - Type: ${lead.type || 'N/A'}`
).join('\n')}

You can:
- Answer questions about lead statistics
- Help find specific leads by name, email, or company
- Provide insights about lead quality, scores, and status
- Suggest next actions for leads
- Answer questions about the lead pipeline

Be concise, helpful, and data-driven. If asked about a specific lead, you can search for them. Always format numbers and dates clearly.`;

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: userMessage }
    ];

    // Check if user is asking about a specific lead (email or name)
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const namePattern = /(?:find|search|show|tell me about|who is|details about|lead)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
    
    let leadContext = '';
    const emailMatch = userMessage.match(emailPattern);
    const nameMatch = userMessage.match(namePattern);
    
    if (emailMatch || nameMatch) {
      const searchTerm = emailMatch ? emailMatch[0] : nameMatch[1];
      const searchResults = await searchLeads(searchTerm, 3);
      
      if (searchResults.length > 0) {
        leadContext = `\n\nFound ${searchResults.length} matching lead(s):\n${searchResults.map((lead, i) => 
          `${i + 1}. ${lead.name} (${lead.email}) - Company: ${lead.company || 'N/A'} - Status: ${lead.status} - Score: ${lead.score} - Type: ${lead.type || 'N/A'} - Budget: ${lead.budget || 'N/A'}`
        ).join('\n')}`;
        
        // If exact match by email, get full details
        if (emailMatch) {
          const exactMatch = searchResults.find(l => l.email?.toLowerCase() === searchTerm.toLowerCase());
          if (exactMatch && exactMatch.id) {
            const fullLead = await getLeadById(exactMatch.id);
            if (fullLead) {
              leadContext += `\n\nFull Details for ${fullLead.name}:\n${JSON.stringify(fullLead, null, 2)}`;
            }
          }
        }
      }
    }

    // Add lead context to the last user message if found
    if (leadContext) {
      messages[messages.length - 1].content += leadContext;
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    });

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    return {
      response,
      stats: {
        totalLeads: parseInt(stats.total_leads),
        newLeads: parseInt(stats.new_leads),
        avgScore: Math.round(stats.avg_score || 0)
      }
    };
  } catch (error) {
    console.error('Chatbot error:', error);
    return {
      response: "I'm sorry, I encountered an error processing your request. Please try again.",
      error: error.message
    };
  }
}
