import { useState, useEffect } from 'react';
import api from '../lib/api';

/**
 * Sequences Page
 * View all email sequences with expandable content and manual send buttons
 */
export default function Sequences() {
  const [sequences, setSequences] = useState([]);
  const [steps, setSteps] = useState({});
  const [leads, setLeads] = useState([]);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadStatus, setLeadStatus] = useState(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [sending, setSending] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [seqRes, leadsRes] = await Promise.all([
        api.get('/sequences'),
        api.get('/leads?limit=100')
      ]);
      
      const seqs = seqRes.data.sequences || seqRes.data.data || [];
      setSequences(seqs);
      setLeads(leadsRes.data.data?.leads || leadsRes.data.leads || []);
      
      // Load steps for each sequence
      const stepsData = {};
      for (const seq of seqs) {
        try {
          const stepsRes = await api.get(`/sequences/${seq.slug}/steps`);
          stepsData[seq.slug] = stepsRes.data.steps || [];
        } catch (e) {
          stepsData[seq.slug] = [];
        }
      }
      setSteps(stepsData);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleStep(stepId) {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  }

  async function manualSend(leadId, stepId) {
    if (sending) return;
    setSending(stepId);
    try {
      await api.post('/sequences/manual-send', { leadId, stepId });
      alert('✅ Message sent!');
    } catch (err) {
      alert('❌ Send failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(null);
    }
  }

  async function enrollLead(leadId, sequenceSlug) {
    try {
      await api.post('/sequences/enroll', { leadId, sequenceSlug });
      alert('✅ Lead enrolled in sequence!');
      loadData();
      if (selectedLead) loadLeadStatus(selectedLead.id);
    } catch (err) {
      alert('❌ Enrollment failed: ' + (err.response?.data?.error || err.message));
    }
  }

  async function loadLeadStatus(leadId) {
    try {
      const res = await api.get(`/sequences/lead/${leadId}/status`);
      setLeadStatus(res.data.data);
    } catch (err) {
      console.error('Failed to load lead status:', err);
      setLeadStatus(null);
    }
  }

  function selectLead(lead) {
    setSelectedLead(lead);
    if (lead) {
      loadLeadStatus(lead.id);
    } else {
      setLeadStatus(null);
    }
  }

  // Filter leads based on search
  const filteredLeads = leads.filter(lead => {
    if (!leadSearch) return true;
    const search = leadSearch.toLowerCase();
    return (
      (lead.first_name || '').toLowerCase().includes(search) ||
      (lead.last_name || '').toLowerCase().includes(search) ||
      (lead.email || '').toLowerCase().includes(search) ||
      (lead.company || '').toLowerCase().includes(search)
    );
  });

  function formatDelay(value, unit) {
    if (value === 0) return 'Immediately';
    if (value < 0) return `${Math.abs(value)} ${unit} before meeting`;
    return `After ${value} ${unit}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white/50">Loading sequences...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Sequences</h1>
          <p className="text-white/50 mt-1">Click any step to see email content. Use manual buttons to test.</p>
        </div>
      </div>

      {/* Lead Selector Card */}
      <div className="bg-[#12121a] rounded-2xl border border-white/10 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-white/50 text-sm font-medium">Select Lead:</span>
          
          {/* Search Input */}
          <input
            type="text"
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            placeholder="Search by name, email, company..."
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white min-w-[250px] placeholder:text-white/30"
          />
          
          {/* Lead Dropdown */}
          <select
            value={selectedLead?.id || ''}
            onChange={(e) => selectLead(leads.find(l => l.id === e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white min-w-[300px]"
          >
            <option value="" className="bg-[#1a1a2e]">Select a lead...</option>
            {filteredLeads.slice(0, 50).map(lead => (
              <option key={lead.id} value={lead.id} className="bg-[#1a1a2e]">
                {lead.first_name || 'Unknown'} {lead.last_name || ''} - {lead.email || 'No email'}
              </option>
            ))}
          </select>

          {filteredLeads.length > 50 && (
            <span className="text-white/40 text-sm">Showing 50 of {filteredLeads.length} leads</span>
          )}
        </div>

        {/* Selected Lead Status */}
        {selectedLead && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-start gap-6">
              <div>
                <h3 className="text-white font-medium">{selectedLead.first_name} {selectedLead.last_name}</h3>
                <p className="text-white/50 text-sm">{selectedLead.email}</p>
                {selectedLead.company && <p className="text-white/40 text-sm">{selectedLead.company}</p>}
              </div>
              
              {leadStatus && (
                <div className="flex-1">
                  {leadStatus.enrolled ? (
                    <div className="flex flex-wrap gap-3">
                      {leadStatus.enrollments.map(enrollment => (
                        <div key={enrollment.id} className="bg-white/5 rounded-lg px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              enrollment.status === 'active' ? 'bg-emerald-500' :
                              enrollment.status === 'completed' ? 'bg-blue-500' :
                              'bg-amber-500'
                            }`}></span>
                            <span className="text-white text-sm font-medium">{enrollment.sequenceName}</span>
                          </div>
                          <p className="text-white/50 text-xs mt-1">
                            Step {enrollment.currentStep}/{enrollment.totalSteps} • 
                            {enrollment.messagesSent} sent, {enrollment.messagesPending} pending
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">Not enrolled in any sequence</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sequences */}
      {sequences.map(sequence => (
        <div key={sequence.slug} className="bg-[#12121a] rounded-2xl border border-white/10 overflow-hidden">
          {/* Sequence Header */}
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">{sequence.name}</h2>
                <p className="text-white/50 text-sm">{sequence.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-white/40 text-sm">
                  {steps[sequence.slug]?.length || 0} steps
                </span>
                {selectedLead && (
                  <button
                    onClick={() => enrollLead(selectedLead.id, sequence.slug)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Enroll {selectedLead.first_name || 'Lead'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="divide-y divide-white/5">
            {(steps[sequence.slug] || []).map((step, index) => (
              <div key={step.id} className="hover:bg-white/5 transition-colors">
                {/* Step Row - Click to expand */}
                <div 
                  onClick={() => toggleStep(step.id)}
                  className="p-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* Step Number */}
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                      ${index === 0 ? 'bg-emerald-500/20 text-emerald-400' : 
                        step.name.includes('Closing') || step.name.includes('Final') ? 'bg-amber-500/20 text-amber-400' :
                        step.name.includes('Reminder') ? 'bg-purple-500/20 text-purple-400' :
                        step.name.includes('Schedule') || step.name.includes('CTA') ? 'bg-rose-500/20 text-rose-400' :
                        'bg-blue-500/20 text-blue-400'}
                    `}>
                      {step.step_order}
                    </div>

                    {/* Step Info */}
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{step.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-white/40 text-sm">
                          {formatDelay(step.delay_value, step.delay_unit)}
                        </span>
                        <span className={`
                          text-xs px-2 py-0.5 rounded
                          ${step.channel === 'both' ? 'bg-purple-500/20 text-purple-300' :
                            step.channel === 'email' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-green-500/20 text-green-300'}
                        `}>
                          {step.channel === 'both' ? '📧 + 💬' : step.channel === 'email' ? '📧 Email' : '💬 WhatsApp'}
                        </span>
                      </div>
                    </div>

                    {/* Manual Send Button */}
                    {selectedLead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          manualSend(selectedLead.id, step.id);
                        }}
                        disabled={sending === step.id}
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        {sending === step.id ? 'Sending...' : 'Send Now'}
                      </button>
                    )}

                    {/* Expand Arrow */}
                    <svg 
                      className={`w-5 h-5 text-white/30 transition-transform ${expandedSteps[step.id] ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedSteps[step.id] && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-4 bg-black/20">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Email Content */}
                      {(step.channel === 'email' || step.channel === 'both') && (
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="text-white/70 text-sm font-medium mb-2">📧 Email Content</h4>
                          {step.email_subject ? (
                            <>
                              <p className="text-white font-medium mb-2">
                                Subject: {step.email_subject}
                              </p>
                              <div className="text-white/60 text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">
                                {step.email_body?.replace(/<[^>]*>/g, '') || 'No body content'}
                              </div>
                            </>
                          ) : (
                            <p className="text-white/40 italic">
                              {step.name.includes('Value') ? 
                                'Randomized value email from template pool' : 
                                'Template not configured yet'}
                            </p>
                          )}
                        </div>
                      )}

                      {/* WhatsApp Content */}
                      {(step.channel === 'whatsapp' || step.channel === 'both') && (
                        <div className="bg-white/5 rounded-xl p-4">
                          <h4 className="text-white/70 text-sm font-medium mb-2">💬 WhatsApp Message</h4>
                          {step.whatsapp_message ? (
                            <div className="text-white/60 text-sm whitespace-pre-wrap">
                              {step.whatsapp_message}
                            </div>
                          ) : (
                            <p className="text-white/40 italic">No WhatsApp message configured</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Variables Info */}
                    <div className="mt-4 text-xs text-white/30">
                      Available variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{email}}'}, {'{{phone}}'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {(!steps[sequence.slug] || steps[sequence.slug].length === 0) && (
            <div className="p-8 text-center text-white/30">
              No steps configured for this sequence
            </div>
          )}
        </div>
      ))}

      {/* Help Text */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 className="text-white font-medium mb-2">How it works:</h3>
        <ul className="text-white/50 text-sm space-y-1">
          <li>• <strong>New Lead:</strong> Form submission → Immediate welcome email + WhatsApp → Value emails for 18 days</li>
          <li>• <strong>Meeting Booked:</strong> When they schedule → Confirmation + reminders at 24h, 6h, 1h before</li>
          <li>• <strong>No Show:</strong> If they miss meeting → Rebooking request + restart nurture sequence</li>
          <li>• Click any step to see the email/WhatsApp content</li>
          <li>• Select a lead and click "Send Now" to manually test any step</li>
        </ul>
      </div>
    </div>
  );
}
