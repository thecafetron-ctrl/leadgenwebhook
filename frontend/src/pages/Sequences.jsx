/**
 * Sequences Page
 * 
 * Email/WhatsApp automation dashboard with:
 * - Sequence overview
 * - Visual board of leads in each sequence
 * - Sent messages log
 * - Template editor
 * - WhatsApp configuration
 */

import { useState, useEffect } from 'react';
import { sequencesApi, leadsApi } from '../lib/api';

// Icons
const PlayIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PauseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function Sequences() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [sequences, setSequences] = useState([]);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [sequenceSteps, setSequenceSteps] = useState([]);
  const [sequenceBoard, setSequenceBoard] = useState({ leads: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [whatsappConfig, setWhatsappConfig] = useState({ instance_name: '', api_url: '', api_key: '' });
  
  // Fetch dashboard data
  useEffect(() => {
    fetchDashboard();
    fetchSequences();
    fetchWhatsAppStatus();
  }, []);
  
  // Fetch sequence details when selected
  useEffect(() => {
    if (selectedSequence) {
      fetchSequenceDetails(selectedSequence.slug);
    }
  }, [selectedSequence]);

  const fetchDashboard = async () => {
    try {
      const result = await sequencesApi.getDashboard();
      setDashboard(result.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  };

  const fetchSequences = async () => {
    try {
      setLoading(true);
      const result = await sequencesApi.getSequences();
      setSequences(result.data || []);
    } catch (error) {
      console.error('Sequences fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSequenceDetails = async (slug) => {
    try {
      const [seqResult, boardResult] = await Promise.all([
        sequencesApi.getSequence(slug),
        sequencesApi.getBoard(slug, { status: 'active', limit: 100 })
      ]);
      setSequenceSteps(seqResult.data.steps || []);
      setSequenceBoard(boardResult.data || { leads: [], pagination: {} });
    } catch (error) {
      console.error('Sequence details fetch error:', error);
    }
  };

  const fetchWhatsAppStatus = async () => {
    try {
      const result = await sequencesApi.getWhatsAppStatus();
      setWhatsappStatus(result.data);
    } catch (error) {
      console.error('WhatsApp status error:', error);
    }
  };

  const handleSaveStep = async (stepId, data) => {
    try {
      await sequencesApi.updateStep(stepId, data);
      setEditingStep(null);
      if (selectedSequence) {
        fetchSequenceDetails(selectedSequence.slug);
      }
    } catch (error) {
      alert('Failed to save: ' + error.message);
    }
  };

  const handleSaveWhatsAppConfig = async () => {
    try {
      await sequencesApi.saveWhatsAppConfig(whatsappConfig);
      alert('WhatsApp configured successfully!');
      fetchWhatsAppStatus();
    } catch (error) {
      alert('Failed to save config: ' + error.message);
    }
  };

  const handleProcessQueue = async () => {
    try {
      const result = await sequencesApi.processQueue();
      alert(`Processed ${result.processed} messages`);
      fetchDashboard();
    } catch (error) {
      alert('Queue processing error: ' + error.message);
    }
  };

  // Tab content renderers
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Pending Messages</p>
              <p className="text-2xl font-bold text-white">{dashboard?.pendingCount || 0}</p>
            </div>
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <ClockIcon />
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Newsletter Subscribers</p>
              <p className="text-2xl font-bold text-white">{dashboard?.newsletterCount || 0}</p>
            </div>
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <UsersIcon />
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Emails Sent Today</p>
              <p className="text-2xl font-bold text-white">
                {dashboard?.todayMessages?.find(m => m.channel === 'email')?.count || 0}
              </p>
            </div>
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <MailIcon />
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">WhatsApp Sent Today</p>
              <p className="text-2xl font-bold text-white">
                {dashboard?.todayMessages?.find(m => m.channel === 'whatsapp')?.count || 0}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <PhoneIcon />
            </div>
          </div>
        </div>
      </div>

      {/* Sequences Overview */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Active Sequences</h2>
          <button 
            onClick={handleProcessQueue}
            className="btn btn-secondary text-sm"
          >
            Process Queue Now
          </button>
        </div>
        
        <div className="space-y-3">
          {dashboard?.sequences?.map((seq, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <h3 className="font-medium text-white">{seq.sequence_name}</h3>
                <p className="text-sm text-slate-400">{seq.slug}</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-green-400 font-semibold">{seq.active || 0}</p>
                  <p className="text-slate-500">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-cyan-400 font-semibold">{seq.completed || 0}</p>
                  <p className="text-slate-500">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-purple-400 font-semibold">{seq.converted || 0}</p>
                  <p className="text-slate-500">Converted</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedSequence(sequences.find(s => s.slug === seq.slug));
                    setActiveTab('board');
                  }}
                  className="btn btn-primary text-sm"
                >
                  View Board
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderBoard = () => (
    <div className="space-y-6">
      {/* Sequence Selector */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <select 
            className="input flex-1"
            value={selectedSequence?.slug || ''}
            onChange={(e) => {
              const seq = sequences.find(s => s.slug === e.target.value);
              setSelectedSequence(seq);
            }}
          >
            <option value="">Select a sequence...</option>
            {sequences.map(seq => (
              <option key={seq.id} value={seq.slug}>{seq.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedSequence && (
        <>
          {/* Steps Timeline */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Sequence Steps ({sequenceSteps.length})
            </h2>
            <div className="overflow-x-auto">
              <div className="flex gap-4 pb-4" style={{ minWidth: sequenceSteps.length * 200 }}>
                {sequenceSteps.map((step, i) => (
                  <div 
                    key={step.id}
                    className="flex-shrink-0 w-48 bg-slate-800/50 rounded-lg p-4 relative"
                  >
                    {/* Connector line */}
                    {i < sequenceSteps.length - 1 && (
                      <div className="absolute top-1/2 right-0 w-4 h-0.5 bg-slate-600 translate-x-full" />
                    )}
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center text-xs font-bold">
                        {step.step_order}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        step.channel === 'both' ? 'bg-purple-500/20 text-purple-400' :
                        step.channel === 'email' ? 'bg-cyan-500/20 text-cyan-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {step.channel}
                      </span>
                    </div>
                    
                    <h3 className="font-medium text-white text-sm mb-1">{step.name}</h3>
                    <p className="text-xs text-slate-400 mb-3">
                      After {step.delay_value} {step.delay_unit}
                    </p>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingStep(step)}
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        Edit Content
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leads in Sequence */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Leads in Sequence ({sequenceBoard.leads?.length || 0})
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm text-slate-400">Lead</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400">Current Step</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400">Messages Sent</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400">Pending</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400">Enrolled</th>
                    <th className="text-left py-3 px-4 text-sm text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sequenceBoard.leads?.map(lead => (
                    <tr key={lead.id} className="border-b border-slate-800">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-white">
                            {lead.first_name} {lead.last_name}
                          </p>
                          <p className="text-sm text-slate-400">{lead.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-sm">
                          Step {lead.current_step}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{lead.messages_sent}</td>
                      <td className="py-3 px-4 text-slate-300">{lead.messages_pending}</td>
                      <td className="py-3 px-4 text-slate-400 text-sm">
                        {new Date(lead.enrolled_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={async () => {
                              if (confirm('Cancel sequence for this lead?')) {
                                await sequencesApi.cancelSequence(lead.lead_id, selectedSequence.slug, 'Manual cancel');
                                fetchSequenceDetails(selectedSequence.slug);
                              }
                            }}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {(!sequenceBoard.leads || sequenceBoard.leads.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No active leads in this sequence
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderTemplates = () => (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Email Templates</h2>
      <p className="text-slate-400 mb-4">
        Select a sequence above to edit step templates, or create reusable templates here.
      </p>
      
      {/* Template editor will show when a step is selected */}
      {editingStep ? (
        <div className="bg-slate-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-white">
              Editing: {editingStep.name}
            </h3>
            <button onClick={() => setEditingStep(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            {(editingStep.channel === 'email' || editingStep.channel === 'both') && (
              <>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email Subject</label>
                  <input 
                    type="text"
                    className="input w-full"
                    value={editingStep.email_subject || ''}
                    onChange={(e) => setEditingStep({ ...editingStep, email_subject: e.target.value })}
                    placeholder="Enter email subject..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Email Body (HTML supported, use {'{{first_name}}'} for variables)
                  </label>
                  <textarea 
                    className="input w-full h-48 font-mono text-sm"
                    value={editingStep.email_body || ''}
                    onChange={(e) => setEditingStep({ ...editingStep, email_body: e.target.value })}
                    placeholder="Enter email body..."
                  />
                </div>
              </>
            )}
            
            {(editingStep.channel === 'whatsapp' || editingStep.channel === 'both') && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  WhatsApp Message (use {'{{first_name}}'} for variables)
                </label>
                <textarea 
                  className="input w-full h-32"
                  value={editingStep.whatsapp_message || ''}
                  onChange={(e) => setEditingStep({ ...editingStep, whatsapp_message: e.target.value })}
                  placeholder="Enter WhatsApp message..."
                />
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingStep(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={() => handleSaveStep(editingStep.id, {
                  email_subject: editingStep.email_subject,
                  email_body: editingStep.email_body,
                  whatsapp_message: editingStep.whatsapp_message
                })}
                className="btn btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400">
          <p>Select a step from the Board tab to edit its content</p>
        </div>
      )}
    </div>
  );

  const renderWhatsApp = () => (
    <div className="space-y-6">
      {/* Status */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">WhatsApp Status</h2>
        
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-3 h-3 rounded-full ${whatsappStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-white">
            {whatsappStatus?.connected ? 'Connected' : 'Not Connected'}
          </span>
          {whatsappStatus?.instance && (
            <span className="text-slate-400">({whatsappStatus.instance})</span>
          )}
        </div>
        
        {!whatsappStatus?.is_configured && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
            <p className="text-amber-400 text-sm">
              WhatsApp is not configured. Enter your Evolution API details below.
            </p>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Evolution API Configuration</h2>
        
        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Instance Name</label>
            <input 
              type="text"
              className="input w-full"
              value={whatsappConfig.instance_name}
              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, instance_name: e.target.value })}
              placeholder="e.g., my-whatsapp-instance"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">API URL</label>
            <input 
              type="text"
              className="input w-full"
              value={whatsappConfig.api_url}
              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, api_url: e.target.value })}
              placeholder="e.g., https://your-evolution-api.com"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">API Key</label>
            <input 
              type="password"
              className="input w-full"
              value={whatsappConfig.api_key}
              onChange={(e) => setWhatsappConfig({ ...whatsappConfig, api_key: e.target.value })}
              placeholder="Enter your Evolution API key"
            />
          </div>
          
          <button onClick={handleSaveWhatsAppConfig} className="btn btn-primary">
            Save Configuration
          </button>
        </div>
      </div>

      {/* Test Message */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Send Test Message</h2>
        
        <div className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Phone Number</label>
            <input 
              type="text"
              id="test-whatsapp-phone"
              className="input w-full"
              placeholder="+1234567890"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">Message</label>
            <textarea 
              id="test-whatsapp-message"
              className="input w-full h-24"
              placeholder="Hello! This is a test message."
            />
          </div>
          
          <button 
            onClick={async () => {
              const phone = document.getElementById('test-whatsapp-phone').value;
              const message = document.getElementById('test-whatsapp-message').value;
              if (phone && message) {
                try {
                  const result = await sequencesApi.testWhatsApp(phone, message);
                  alert(result.success ? 'Message sent!' : 'Failed: ' + result.data?.error);
                } catch (error) {
                  alert('Error: ' + error.message);
                }
              }
            }}
            className="btn btn-secondary"
          >
            Send Test
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Email & WhatsApp Sequences</h1>
        <p className="text-slate-400 mt-1">
          Automated follow-up sequences for leads
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700 pb-2">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: <UsersIcon /> },
          { id: 'board', label: 'Sequence Board', icon: <PlayIcon /> },
          { id: 'templates', label: 'Templates', icon: <MailIcon /> },
          { id: 'whatsapp', label: 'WhatsApp', icon: <PhoneIcon /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id 
                ? 'bg-cyan-500/20 text-cyan-400' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'board' && renderBoard()}
          {activeTab === 'templates' && renderTemplates()}
          {activeTab === 'whatsapp' && renderWhatsApp()}
        </>
      )}

      {/* Edit Step Modal */}
      {editingStep && activeTab !== 'templates' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            {renderTemplates()}
          </div>
        </div>
      )}
    </div>
  );
}
