import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

/**
 * Visual Pipeline Map
 * Shows the entire email sequence as a flowchart with leads positioned at their current step
 */
export default function PipelineMap() {
  const [sequences, setSequences] = useState([]);
  const [selectedSequence, setSelectedSequence] = useState('new_lead');
  const [steps, setSteps] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [selectedSequence]);

  async function loadData() {
    try {
      setLoading(true);
      const [seqRes, stepsRes, leadsRes] = await Promise.all([
        api.get('/sequences'),
        api.get(`/sequences/${selectedSequence}/steps`),
        api.get(`/sequences/${selectedSequence}/leads?status=active&limit=100`)
      ]);
      setSequences(seqRes.data.sequences || []);
      setSteps(stepsRes.data.steps || []);
      setLeads(leadsRes.data.leads || []);
    } catch (err) {
      console.error('Failed to load pipeline data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function manualTrigger(leadId, stepId) {
    if (processing) return;
    setProcessing(`${leadId}-${stepId}`);
    try {
      await api.post(`/sequences/manual-send`, { leadId, stepId });
      // Refresh data
      await loadData();
    } catch (err) {
      console.error('Manual trigger failed:', err);
      alert('Failed to send: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(null);
    }
  }

  // Mouse handlers for panning
  function handleMouseDown(e) {
    if (e.target === containerRef.current || e.target.classList.contains('pipeline-canvas')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }

  function handleMouseMove(e) {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  // Get leads at a specific step
  function getLeadsAtStep(stepOrder) {
    return leads.filter(l => l.current_step === stepOrder);
  }

  // Get step status color
  function getStepColor(step, index) {
    if (step.name.toLowerCase().includes('welcome')) return 'from-emerald-500 to-emerald-600';
    if (step.name.toLowerCase().includes('value')) return 'from-blue-500 to-blue-600';
    if (step.name.toLowerCase().includes('closing') || step.name.toLowerCase().includes('final')) return 'from-amber-500 to-amber-600';
    if (step.name.toLowerCase().includes('reminder')) return 'from-purple-500 to-purple-600';
    if (step.name.toLowerCase().includes('no-show') || step.name.toLowerCase().includes('rebooking')) return 'from-rose-500 to-rose-600';
    if (step.name.toLowerCase().includes('confirmation')) return 'from-teal-500 to-teal-600';
    return 'from-slate-500 to-slate-600';
  }

  const sequenceInfo = sequences.find(s => s.slug === selectedSequence);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="flex-none border-b border-white/10 bg-[#0d0d14] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Pipeline Map</h1>
            <p className="text-white/50 text-sm mt-1">Visual flowchart of your email sequences</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Sequence Selector */}
            <select
              value={selectedSequence}
              onChange={(e) => setSelectedSequence(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {sequences.map(seq => (
                <option key={seq.slug} value={seq.slug} className="bg-[#1a1a2e]">
                  {seq.name}
                </option>
              ))}
            </select>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1">
              <button 
                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                className="text-white/70 hover:text-white p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-white/70 text-sm min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
              <button 
                onClick={() => setZoom(z => Math.min(2, z + 0.25))}
                className="text-white/70 hover:text-white p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button 
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                className="text-white/50 hover:text-white p-1 ml-1 border-l border-white/10 pl-2"
              >
                Reset
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={loading}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white hover:bg-white/10 transition-colors"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-white/70 text-sm">Active: <span className="text-white font-medium">{leads.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-white/70 text-sm">Steps: <span className="text-white font-medium">{steps.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-white/70 text-sm">Auto-refresh: <span className="text-emerald-400 font-medium">ON</span></span>
          </div>
        </div>
      </div>

      {/* Pipeline Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing pipeline-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="pipeline-canvas min-h-full p-8"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {loading && steps.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-white/50">Loading pipeline...</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Sequence Title */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">{sequenceInfo?.name || selectedSequence}</h2>
                <p className="text-white/50 text-sm">{sequenceInfo?.description}</p>
              </div>

              {/* Pipeline Flow */}
              <div className="flex flex-wrap gap-4">
                {steps.map((step, index) => {
                  const leadsAtStep = getLeadsAtStep(step.step_order);
                  const colorClass = getStepColor(step, index);
                  
                  return (
                    <div key={step.id} className="flex items-center">
                      {/* Step Box */}
                      <div className="relative">
                        <div className={`
                          w-56 rounded-xl bg-gradient-to-br ${colorClass} p-[1px]
                          shadow-lg shadow-black/20
                        `}>
                          <div className="bg-[#12121a] rounded-xl p-4">
                            {/* Step Header */}
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-medium text-white/40">Step {step.step_order}</span>
                              <span className={`
                                text-xs px-2 py-0.5 rounded-full
                                ${step.channel === 'both' ? 'bg-purple-500/20 text-purple-300' : 
                                  step.channel === 'email' ? 'bg-blue-500/20 text-blue-300' : 
                                  'bg-green-500/20 text-green-300'}
                              `}>
                                {step.channel === 'both' ? '📧 + 💬' : step.channel === 'email' ? '📧' : '💬'}
                              </span>
                            </div>

                            {/* Step Name */}
                            <h3 className="text-white font-medium text-sm mb-2 truncate" title={step.name}>
                              {step.name}
                            </h3>

                            {/* Timing */}
                            <div className="text-white/50 text-xs mb-3">
                              {step.delay_value === 0 ? 'Immediately' : 
                                `After ${step.delay_value} ${step.delay_unit}`}
                            </div>

                            {/* Leads at this step */}
                            <div className="border-t border-white/10 pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-white/40">Leads here</span>
                                <span className={`
                                  text-sm font-bold
                                  ${leadsAtStep.length > 0 ? 'text-emerald-400' : 'text-white/30'}
                                `}>
                                  {leadsAtStep.length}
                                </span>
                              </div>

                              {/* Lead Avatars */}
                              {leadsAtStep.length > 0 && (
                                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                  {leadsAtStep.slice(0, 8).map(lead => (
                                    <div 
                                      key={lead.lead_id}
                                      className="group relative"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:ring-2 ring-white/30 transition-all">
                                        {(lead.first_name?.[0] || lead.email?.[0] || '?').toUpperCase()}
                                      </div>
                                      
                                      {/* Tooltip with manual trigger */}
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50">
                                        <div className="bg-[#1a1a2e] border border-white/10 rounded-lg p-3 shadow-xl min-w-[200px]">
                                          <p className="text-white font-medium text-sm truncate">
                                            {lead.first_name} {lead.last_name}
                                          </p>
                                          <p className="text-white/50 text-xs truncate">{lead.email}</p>
                                          <p className="text-white/30 text-xs mt-1">
                                            Msgs sent: {lead.messages_sent || 0}
                                          </p>
                                          
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              manualTrigger(lead.lead_id, step.id);
                                            }}
                                            disabled={processing === `${lead.lead_id}-${step.id}`}
                                            className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 px-3 rounded-lg transition-colors disabled:opacity-50"
                                          >
                                            {processing === `${lead.lead_id}-${step.id}` ? 'Sending...' : 'Send Now (Manual)'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {leadsAtStep.length > 8 && (
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 text-xs">
                                      +{leadsAtStep.length - 8}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Connection Line */}
                        {index < steps.length - 1 && (
                          <div className="absolute top-1/2 -right-4 w-4 h-0.5 bg-gradient-to-r from-white/30 to-white/10"></div>
                        )}
                      </div>

                      {/* Arrow between steps */}
                      {index < steps.length - 1 && (
                        <div className="flex items-center mx-1">
                          <svg className="w-4 h-4 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-white/70 text-sm font-medium mb-3">Legend</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-500 to-emerald-600"></div>
                    <span className="text-white/50 text-xs">Welcome</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-blue-600"></div>
                    <span className="text-white/50 text-xs">Value Emails</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500 to-purple-600"></div>
                    <span className="text-white/50 text-xs">Reminders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-amber-500 to-amber-600"></div>
                    <span className="text-white/50 text-xs">Closing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-rose-500 to-rose-600"></div>
                    <span className="text-white/50 text-xs">No-Show</span>
                  </div>
                </div>
                <p className="text-white/30 text-xs mt-3">
                  💡 Hover over lead avatars to see details and manually trigger emails. 
                  Manual sends won't duplicate - automatic will skip to next step.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions Footer */}
      <div className="flex-none border-t border-white/10 bg-[#0d0d14] px-6 py-3">
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>🖱️ Click and drag to pan • Scroll to navigate • Use zoom controls</span>
          <span>Auto-refreshes every 30 seconds</span>
        </div>
      </div>
    </div>
  );
}
