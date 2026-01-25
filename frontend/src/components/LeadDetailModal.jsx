/**
 * Lead Detail View Modal Component
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  X, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Calendar,
  Clock,
  Tag,
  Activity,
  Globe,
  CheckCircle2,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { leadsApi } from '../lib/api';
import { 
  cn, 
  formatDate, 
  formatDateTime,
  formatRelativeTime, 
  getFullName, 
  getInitials,
  getStatusColor, 
  getSourceColor,
  getPriorityColor,
  formatSource,
  formatPhone
} from '../lib/utils';

function LeadDetailModal({ lead, onClose }) {
  // Fetch activities if lead is provided
  const { data: activitiesData } = useQuery({
    queryKey: ['leadActivities', lead?.id],
    queryFn: () => leadsApi.getActivities(lead.id),
    enabled: !!lead
  });

  const activities = activitiesData?.data || [];

  if (!lead) return null;

  const formatValue = (v) => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'number') return v.toLocaleString();
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  const prettyKey = (k) =>
    String(k)
      .replace(/_/g, ' ')
      .replace(/\?/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const cf = lead.custom_fields || {};
  const excludeKeys = new Set([
    'ad_name', 'meta_ad_name', 'campaign_name', 'meta_campaign_name',
    'budget', 'shipments', 'why_automate', 'imported_from_csv',
    'meta_ad_id', 'meta_adset_id', 'meta_adset_name', 'meta_campaign_id',
    'campaign_type', 'raw_meta_data',
    // normalized enrichment
    'estimated_budget_raw', 'estimated_budget_aed_min', 'estimated_budget_aed_max',
    'shipments_per_month_raw', 'shipments_per_month_min', 'shipments_per_month_max',
    'decision_maker', 'decision_maker_confidence', 'decision_maker_reason',
    // AI scoring enrichment (stored in custom_fields)
    'ai_intent_score', 'ai_intent_category', 'ai_confidence', 'ai_flags',
    'ai_top_reasons', 'ai_recommended_next_step', 'ai_model', 'ai_scored_at'
  ]);

  const additionalEntries = Object.entries(cf).filter(([k]) => !excludeKeys.has(k));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-dark-700/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl">
                  {getInitials(lead.first_name, lead.last_name)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {getFullName(lead.first_name, lead.last_name)}
                  </h2>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className={cn("badge", getStatusColor(lead.status))}>
                      {lead.status}
                    </span>
                    <span className={cn("badge", getSourceColor(lead.source))}>
                      {formatSource(lead.source)}
                    </span>
                    {lead.lead_type && (
                      <span className={cn(
                        "badge",
                        lead.lead_type === 'consultation' 
                          ? "bg-accent-500/20 text-accent-300 border border-accent-500/30" 
                          : "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                      )}>
                        {lead.lead_type}
                      </span>
                    )}
                    <span className={cn("text-sm font-medium", getPriorityColor(lead.priority))}>
                      {lead.priority} priority
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider">
                  Contact Information
                </h3>
                
                <div className="space-y-3">
                  {lead.email && (
                    <div className="flex items-center gap-3 p-3 bg-dark-800/30 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <p className="text-xs text-dark-400">Email</p>
                        <a href={`mailto:${lead.email}`} className="text-white hover:text-primary-400 transition-colors">
                          {lead.email}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {lead.phone && (
                    <div className="flex items-center gap-3 p-3 bg-dark-800/30 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                        <Phone className="w-5 h-5 text-accent-400" />
                      </div>
                      <div>
                        <p className="text-xs text-dark-400">Phone</p>
                        <a href={`tel:${lead.phone}`} className="text-white hover:text-accent-400 transition-colors">
                          {formatPhone(lead.phone)}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {lead.company && (
                    <div className="flex items-center gap-3 p-3 bg-dark-800/30 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-success-500/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-success-400" />
                      </div>
                      <div>
                        <p className="text-xs text-dark-400">Company</p>
                        <p className="text-white">{lead.company}</p>
                      </div>
                    </div>
                  )}
                  
                  {lead.job_title && (
                    <div className="flex items-center gap-3 p-3 bg-dark-800/30 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-warning-500/20 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-warning-400" />
                      </div>
                      <div>
                        <p className="text-xs text-dark-400">Job Title</p>
                        <p className="text-white">{lead.job_title}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {lead.tags && lead.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-dark-400 mb-2 flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {lead.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Communication Consent */}
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-2">
                    Communication Consent
                  </h4>
                  <div className="flex gap-4">
                    <span className={cn(
                      "flex items-center gap-1 text-sm",
                      lead.email_consent ? "text-success-400" : "text-dark-500"
                    )}>
                      <Mail className="w-4 h-4" />
                      Email {lead.email_consent ? "✓" : "✗"}
                    </span>
                    <span className={cn(
                      "flex items-center gap-1 text-sm",
                      lead.sms_consent ? "text-success-400" : "text-dark-500"
                    )}>
                      <MessageSquare className="w-4 h-4" />
                      SMS {lead.sms_consent ? "✓" : "✗"}
                    </span>
                    <span className={cn(
                      "flex items-center gap-1 text-sm",
                      lead.whatsapp_consent ? "text-success-400" : "text-dark-500"
                    )}>
                      <Phone className="w-4 h-4" />
                      WhatsApp {lead.whatsapp_consent ? "✓" : "✗"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline & Notes */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider">
                  Timeline & Notes
                </h3>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-dark-800/30 rounded-xl">
                    <p className="text-xs text-dark-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Created
                    </p>
                    <p className="text-white text-sm mt-1">{formatDate(lead.created_at)}</p>
                    <p className="text-xs text-dark-500">{formatRelativeTime(lead.created_at)}</p>
                  </div>
                  <div className="p-3 bg-dark-800/30 rounded-xl">
                    <p className="text-xs text-dark-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated
                    </p>
                    <p className="text-white text-sm mt-1">{formatDate(lead.updated_at)}</p>
                    <p className="text-xs text-dark-500">{formatRelativeTime(lead.updated_at)}</p>
                  </div>
                </div>

                {/* Notes */}
                {lead.notes && (
                  <div className="p-4 bg-dark-800/30 rounded-xl">
                    <h4 className="text-sm font-medium text-dark-400 mb-2">Notes</h4>
                    <p className="text-dark-200 text-sm whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                )}

                {/* Call History */}
                {(() => {
                  const calls = activities.filter(a => a.type === 'call');
                  return calls.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        Call History ({calls.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {calls.map(call => {
                          const outcome = call.metadata?.outcome || 'unknown';
                          const isAnswered = outcome === 'answered';
                          return (
                            <div key={call.id} className="flex gap-3 p-2 bg-dark-800/30 rounded-lg">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                isAnswered ? "bg-success-500/20" : "bg-danger-500/20"
                              )}>
                                {isAnswered ? (
                                  <CheckCircle2 className="w-4 h-4 text-success-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-danger-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white">
                                  Call {isAnswered ? 'Answered' : 'Unanswered'}
                                </p>
                                <p className="text-xs text-dark-500">
                                  {formatDateTime(call.created_at)} • {formatRelativeTime(call.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Activity Log */}
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    Activity Log
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {activities.filter(a => a.type !== 'call').length === 0 ? (
                      <p className="text-dark-500 text-sm">No activity recorded</p>
                    ) : (
                      activities.filter(a => a.type !== 'call').map(activity => (
                        <div key={activity.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-dark-800 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">{activity.description}</p>
                            <p className="text-xs text-dark-500">{formatRelativeTime(activity.created_at)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* UTM Data */}
                {(lead.utm_source || lead.utm_medium || lead.utm_campaign) && (
                  <div className="p-4 bg-dark-800/30 rounded-xl">
                    <h4 className="text-sm font-medium text-dark-400 mb-2 flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      UTM Tracking
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {lead.utm_source && (
                        <div>
                          <span className="text-dark-500">Source:</span>{' '}
                          <span className="text-white">{lead.utm_source}</span>
                        </div>
                      )}
                      {lead.utm_medium && (
                        <div>
                          <span className="text-dark-500">Medium:</span>{' '}
                          <span className="text-white">{lead.utm_medium}</span>
                        </div>
                      )}
                      {lead.utm_campaign && (
                        <div>
                          <span className="text-dark-500">Campaign:</span>{' '}
                          <span className="text-white">{lead.utm_campaign}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lead Source Details (Where From) */}
                {lead.custom_fields && (lead.custom_fields.ad_name || lead.custom_fields.meta_ad_name || lead.custom_fields.campaign_name || lead.custom_fields.meta_campaign_name) && (
                  <div className="p-4 bg-accent-500/10 border border-accent-500/30 rounded-xl">
                    <h4 className="text-sm font-medium text-accent-300 mb-3 flex items-center gap-1">
                      📍 Where They Came From
                    </h4>
                    <div className="space-y-2 text-sm">
                      {(lead.custom_fields.ad_name || lead.custom_fields.meta_ad_name) && (
                        <div className="flex justify-between">
                          <span className="text-dark-400">Ad:</span>
                          <span className="text-white font-medium">{lead.custom_fields.ad_name || lead.custom_fields.meta_ad_name}</span>
                        </div>
                      )}
                      {(lead.custom_fields.campaign_name || lead.custom_fields.meta_campaign_name) && (
                        <div className="flex justify-between">
                          <span className="text-dark-400">Campaign:</span>
                          <span className="text-white font-medium">{lead.custom_fields.campaign_name || lead.custom_fields.meta_campaign_name}</span>
                        </div>
                      )}
                      {lead.custom_fields.budget && (
                        <div className="flex justify-between">
                          <span className="text-dark-400">Budget:</span>
                          <span className="text-white">{lead.custom_fields.budget.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {lead.custom_fields.shipments && (
                        <div className="flex justify-between">
                          <span className="text-dark-400">Shipments:</span>
                          <span className="text-white">{lead.custom_fields.shipments.replace(/_/g, ' ')}</span>
                        </div>
                      )}
                      {lead.custom_fields.why_automate && (
                        <div className="mt-2 pt-2 border-t border-dark-700/50">
                          <span className="text-dark-400 block mb-1">Why they want to automate:</span>
                          <span className="text-white italic">"{lead.custom_fields.why_automate}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lead Type */}
                {lead.lead_type && (
                  <div className="p-4 bg-dark-800/30 rounded-xl">
                    <h4 className="text-sm font-medium text-dark-400 mb-2">Lead Type</h4>
                    <span className={cn(
                      "badge text-sm",
                      lead.lead_type === 'consultation' 
                        ? "bg-accent-500/20 text-accent-300 border border-accent-500/30" 
                        : "bg-primary-500/20 text-primary-300 border border-primary-500/30"
                    )}>
                      {lead.lead_type.charAt(0).toUpperCase() + lead.lead_type.slice(1)}
                    </span>
                  </div>
                )}

                {/* Other Custom Fields */}
                {/* Clean Custom Fields Layout */}
                {Object.keys(cf || {}).length > 0 && (
                  <div className="space-y-3">
                    {/* Budget / Volume / Decision Maker */}
                    <div className="p-4 bg-dark-800/30 rounded-xl">
                      <h4 className="text-sm font-medium text-dark-400 mb-3">Key Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-dark-500">Budget (AED):</span>
                          <span className="text-white">
                            {cf.estimated_budget_aed_min != null
                              ? `${formatValue(cf.estimated_budget_aed_min)} - ${formatValue(cf.estimated_budget_aed_max)}`
                              : formatValue(cf.estimated_budget_raw)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-dark-500">Shipments / month:</span>
                          <span className="text-white">
                            {cf.shipments_per_month_min != null
                              ? `${formatValue(cf.shipments_per_month_min)} - ${formatValue(cf.shipments_per_month_max)}`
                              : formatValue(cf.shipments_per_month_raw)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-dark-500">Decision maker:</span>
                          <span className="text-white">{formatValue(cf.decision_maker)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-dark-500">DM confidence:</span>
                          <span className="text-white">{cf.decision_maker_confidence != null ? Number(cf.decision_maker_confidence).toFixed(2) : '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Intent Scoring (if present) */}
                    {(cf.ai_intent_score != null || lead.score != null) && (
                      <div className="p-4 bg-dark-800/30 rounded-xl">
                        <h4 className="text-sm font-medium text-dark-400 mb-3">AI Intent</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between gap-3">
                            <span className="text-dark-500">Intent score:</span>
                            <span className="text-white font-semibold">{formatValue(cf.ai_intent_score ?? lead.score)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-dark-500">Category:</span>
                            <span className="text-white">{formatValue(cf.ai_intent_category)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-dark-500">Confidence:</span>
                            <span className="text-white">{cf.ai_confidence != null ? Number(cf.ai_confidence).toFixed(2) : '—'}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-dark-500">Next step:</span>
                            <span className="text-white">{formatValue(cf.ai_recommended_next_step)}</span>
                          </div>
                        </div>
                        {Array.isArray(cf.ai_top_reasons) && cf.ai_top_reasons.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-dark-700/50">
                            <p className="text-xs text-dark-500 mb-2">Top reasons</p>
                            <ul className="space-y-1">
                              {cf.ai_top_reasons.slice(0, 6).map((r, idx) => (
                                <li key={idx} className="text-sm text-dark-200">- {r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Remaining fields as a table */}
                    {additionalEntries.length > 0 && (
                      <div className="p-4 bg-dark-800/30 rounded-xl">
                        <h4 className="text-sm font-medium text-dark-400 mb-3">All Form Fields</h4>
                        <div className="space-y-2">
                          {additionalEntries.map(([k, v]) => (
                            <div key={k} className="flex items-start justify-between gap-4">
                              <span className="text-xs text-dark-500 w-1/2">{prettyKey(k)}</span>
                              <span className="text-sm text-white w-1/2 text-right break-words">{formatValue(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Raw JSON (collapsible) */}
                    <details className="p-4 bg-dark-800/30 rounded-xl">
                      <summary className="text-sm font-medium text-dark-400 cursor-pointer">Raw custom_fields JSON</summary>
                      <div className="code-block text-xs overflow-auto max-h-60 mt-3">
                        {JSON.stringify(cf, null, 2)}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-dark-700/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-dark-800/50 text-dark-300 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default LeadDetailModal;
