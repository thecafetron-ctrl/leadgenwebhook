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
                  <div className="flex items-center gap-3 mt-2">
                    <span className={cn("badge", getStatusColor(lead.status))}>
                      {lead.status}
                    </span>
                    <span className={cn("badge", getSourceColor(lead.source))}>
                      {formatSource(lead.source)}
                    </span>
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

                {/* Activity Log */}
                <div>
                  <h4 className="text-sm font-medium text-dark-400 mb-3 flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    Activity Log
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {activities.length === 0 ? (
                      <p className="text-dark-500 text-sm">No activity recorded</p>
                    ) : (
                      activities.map(activity => (
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

                {/* Custom Fields */}
                {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
                  <div className="p-4 bg-dark-800/30 rounded-xl">
                    <h4 className="text-sm font-medium text-dark-400 mb-2">Custom Fields</h4>
                    <div className="code-block text-xs overflow-auto max-h-40">
                      {JSON.stringify(lead.custom_fields, null, 2)}
                    </div>
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
