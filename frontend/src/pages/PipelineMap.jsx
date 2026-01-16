import { useState, useEffect } from 'react';
import api from '../lib/api';

/**
 * Pipeline Map - Visual email sequence tracker
 * Select a lead → See their journey through the sequence
 */
export default function PipelineMap() {
  const [sequences, setSequences] = useState([]);
  const [selectedSequence, setSelectedSequence] = useState('new_lead');
  const [steps, setSteps] = useState([]);
  const [leads, setLeads] = useState([]);
  const [allLeads, setAllLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedSequence]);

  async function loadData() {
    try {
      setLoading(true);
      const [seqRes, stepsRes, leadsRes, allLeadsRes] = await Promise.all([
        api.get('/sequences'),
        api.get(`/sequences/${selectedSequence}/steps`),
        api.get(`/sequences/${selectedSequence}/leads?status=all&limit=200`),
        api.get('/leads?limit=100')
      ]);
      setSequences(seqRes.data.sequences || seqRes.data.data || []);
      setSteps(stepsRes.data.steps || []);
      setLeads(leadsRes.data.leads || []);
      setAllLeads(allLeadsRes.data.data?.leads || allLeadsRes.data.leads || []);
      
      // Auto-select first lead if none selected
      const leadsList = leadsRes.data.leads || [];
      if (leadsList.length > 0 && !selectedLead) {
        setSelectedLead(leadsList[0]);
      }
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  async function manualSend(stepId) {
    if (!selectedLead || sending) return;
    setSending(stepId);
    try {
      await api.post('/sequences/manual-send', { 
        leadId: selectedLead.lead_id || selectedLead.id, 
        stepId 
      });
      await loadData();
    } catch (err) {
      alert('Send failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(null);
    }
  }

  // Get the current step for selected lead
  const currentStep = selectedLead?.current_step || 0;
  const messagesSent = selectedLead?.messages_sent || 0;

  // Get step status
  function getStepStatus(step) {
    if (!selectedLead) return 'inactive';
    if (step.step_order < currentStep) return 'completed';
    if (step.step_order === currentStep) return 'current';
    return 'pending';
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Pipeline Map</h1>
        <p className="text-white/50">Select a lead to visualize their email journey</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Lead Selector */}
        <div className="col-span-3 bg-[#12121a] rounded-2xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Leads</h2>
            <select
              value={selectedSequence}
              onChange={(e) => {
                setSelectedSequence(e.target.value);
                setSelectedLead(null);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs"
            >
              {sequences.map(s => (
                <option key={s.slug} value={s.slug} className="bg-[#1a1a2e]">{s.name}</option>
              ))}
            </select>
          </div>

          {/* Lead List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-white/30 text-center py-8">Loading...</div>
            ) : leads.length === 0 ? (
              <div className="text-white/30 text-center py-8">
                <p>No leads in this sequence</p>
                <p className="text-xs mt-2">Leads auto-enroll from webhooks</p>
              </div>
            ) : (
              leads.map(lead => (
                <button
                  key={lead.lead_id || lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    selectedLead?.lead_id === lead.lead_id || selectedLead?.id === lead.id
                      ? 'bg-blue-600/20 border border-blue-500/50'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                      {(lead.first_name?.[0] || lead.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {lead.first_name || 'Unknown'} {lead.last_name || ''}
                      </p>
                      <p className="text-white/40 text-xs truncate">{lead.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${steps.length > 0 ? ((lead.current_step || 0) / steps.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-white/40 text-xs">
                      {lead.current_step || 0}/{steps.length}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* All Leads (not in sequence) */}
          {allLeads.filter(l => !leads.find(sl => sl.lead_id === l.id)).length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-white/40 text-xs mb-2">Other leads (not in sequence):</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {allLeads.filter(l => !leads.find(sl => sl.lead_id === l.id)).slice(0, 5).map(lead => (
                  <div key={lead.id} className="text-white/30 text-xs truncate">
                    {lead.first_name || lead.email}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Pipeline Flow */}
        <div className="col-span-9">
          {!selectedLead ? (
            <div className="bg-[#12121a] rounded-2xl border border-white/10 p-12 text-center">
              <div className="text-white/30 text-6xl mb-4">←</div>
              <p className="text-white/50">Select a lead from the left to see their email journey</p>
            </div>
          ) : (
            <>
              {/* Selected Lead Header */}
              <div className="bg-[#12121a] rounded-2xl border border-white/10 p-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-medium">
                    {(selectedLead.first_name?.[0] || selectedLead.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white text-xl font-semibold">
                      {selectedLead.first_name || 'Unknown'} {selectedLead.last_name || ''}
                    </h2>
                    <p className="text-white/50">{selectedLead.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/40 text-sm">Progress</p>
                    <p className="text-white text-2xl font-bold">
                      {currentStep}/{steps.length}
                      <span className="text-white/40 text-sm ml-1">steps</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/40 text-sm">Messages Sent</p>
                    <p className="text-emerald-400 text-2xl font-bold">{messagesSent}</p>
                  </div>
                </div>
              </div>

              {/* Pipeline Steps */}
              <div className="bg-[#12121a] rounded-2xl border border-white/10 p-6 overflow-x-auto">
                <div className="flex gap-4 min-w-max pb-4">
                  {steps.map((step, index) => {
                    const status = getStepStatus(step);
                    const isCompleted = status === 'completed';
                    const isCurrent = status === 'current';
                    const isPending = status === 'pending';
                    
                    return (
                      <div key={step.id} className="flex items-start">
                        {/* Step Box */}
                        <div className={`
                          w-64 rounded-xl border-2 transition-all
                          ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/50' : ''}
                          ${isCurrent ? 'bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/30' : ''}
                          ${isPending ? 'bg-white/5 border-white/10 opacity-50' : ''}
                        `}>
                          {/* Step Header */}
                          <div className={`
                            px-4 py-2 border-b flex items-center justify-between
                            ${isCompleted ? 'border-emerald-500/30' : ''}
                            ${isCurrent ? 'border-blue-500/30' : ''}
                            ${isPending ? 'border-white/10' : ''}
                          `}>
                            <span className={`
                              text-xs font-medium
                              ${isCompleted ? 'text-emerald-400' : ''}
                              ${isCurrent ? 'text-blue-400' : ''}
                              ${isPending ? 'text-white/30' : ''}
                            `}>
                              Step {step.step_order}
                            </span>
                            <span className={`
                              text-xs px-2 py-0.5 rounded-full
                              ${isCompleted ? 'bg-emerald-500/20 text-emerald-300' : ''}
                              ${isCurrent ? 'bg-blue-500/20 text-blue-300' : ''}
                              ${isPending ? 'bg-white/10 text-white/30' : ''}
                            `}>
                              {isCompleted && '✓ Sent'}
                              {isCurrent && '● Current'}
                              {isPending && '○ Pending'}
                            </span>
                          </div>

                          {/* Step Content */}
                          <div className="p-4">
                            <h3 className={`
                              font-medium text-sm mb-2
                              ${isCompleted ? 'text-emerald-300' : ''}
                              ${isCurrent ? 'text-white' : ''}
                              ${isPending ? 'text-white/40' : ''}
                            `}>
                              {step.name}
                            </h3>

                            {/* Channel Badge */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`
                                text-xs px-2 py-1 rounded
                                ${isPending ? 'bg-white/5 text-white/30' : 'bg-white/10 text-white/70'}
                              `}>
                                {step.channel === 'both' ? '📧 Email + 💬 WhatsApp' : 
                                 step.channel === 'email' ? '📧 Email' : '💬 WhatsApp'}
                              </span>
                            </div>

                            {/* Timing */}
                            <p className={`text-xs mb-3 ${isPending ? 'text-white/20' : 'text-white/40'}`}>
                              {step.delay_value === 0 ? 'Immediately' : 
                                `${step.delay_value} ${step.delay_unit} after enrollment`}
                            </p>

                            {/* Subject Preview */}
                            {step.email_subject && (
                              <p className={`
                                text-xs truncate mb-3
                                ${isPending ? 'text-white/20' : 'text-white/50'}
                              `}>
                                Subject: {step.email_subject?.substring(0, 30)}...
                              </p>
                            )}

                            {/* Manual Send Button */}
                            {(isCurrent || isPending) && (
                              <button
                                onClick={() => manualSend(step.id)}
                                disabled={sending === step.id}
                                className={`
                                  w-full py-2 px-3 rounded-lg text-xs font-medium transition-all
                                  ${isCurrent 
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                                    : 'bg-white/5 hover:bg-white/10 text-white/50'}
                                  disabled:opacity-50
                                `}
                              >
                                {sending === step.id ? 'Sending...' : 'Send Now'}
                              </button>
                            )}

                            {isCompleted && (
                              <div className="flex items-center gap-1 text-emerald-400 text-xs">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                </svg>
                                Delivered
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Connector Line */}
                        {index < steps.length - 1 && (
                          <div className="flex items-center h-full px-2 pt-16">
                            <div className={`
                              w-8 h-0.5 
                              ${isCompleted ? 'bg-emerald-500' : 'bg-white/10'}
                            `} />
                            <div className={`
                              w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent
                              ${isCompleted ? 'border-l-emerald-500' : 'border-l-white/10'}
                            `} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Scroll hint */}
                {steps.length > 4 && (
                  <div className="text-center text-white/30 text-xs mt-2">
                    ← Scroll horizontally to see all steps →
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500/30 border border-emerald-500"></div>
                  <span className="text-white/50">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500/30 border border-blue-500"></div>
                  <span className="text-white/50">Current Step</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-white/5 border border-white/20"></div>
                  <span className="text-white/50">Pending</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
