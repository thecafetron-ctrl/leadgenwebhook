/**
 * Webhook & Email Testing Playground
 * 
 * Send test webhooks, simulate integrations, and test email sequences.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  Send, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Code2,
  Play,
  Trash2,
  Clock,
  Copy,
  FileJson,
  Zap,
  Mail,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { webhooksApi, emailApi } from '../lib/api';
import { usePlaygroundStore } from '../lib/store';
import { 
  cn, 
  formatDateTime,
  copyToClipboard,
  samplePayloads
} from '../lib/utils';

const webhookTypes = [
  { 
    id: 'test', 
    name: 'Custom Test', 
    description: 'Send any JSON payload',
    endpoint: '/api/webhooks/test',
    color: 'primary'
  },
  { 
    id: 'meta', 
    name: 'Meta Forms', 
    description: 'Simulate Meta Instant Forms',
    endpoint: '/api/webhooks/simulate/meta',
    color: 'blue'
  },
  { 
    id: 'calcom', 
    name: 'Cal.com', 
    description: 'Simulate Cal.com booking',
    endpoint: '/api/webhooks/simulate/calcom',
    color: 'purple'
  }
];

function Playground() {
  const queryClient = useQueryClient();
  const { 
    webhookType, 
    setWebhookType, 
    payload, 
    setPayload,
    lastResponse,
    setLastResponse,
    isLoading,
    setIsLoading,
    history,
    addToHistory,
    clearHistory
  } = usePlaygroundStore();

  const [jsonError, setJsonError] = useState(null);
  
  // Email testing state
  const [activeTab, setActiveTab] = useState('webhooks'); // 'webhooks' or 'email'
  const [testEmail, setTestEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [emailSequence, setEmailSequence] = useState([
    { subject: 'Welcome! 👋', content: 'Thanks for signing up! We\'re excited to have you.', delay: 'immediately' },
    { subject: 'Quick tip to get started', content: 'Here\'s a quick tip to help you make the most of our platform.', delay: '1 day' },
    { subject: 'How can we help?', content: 'Just checking in - is there anything we can help you with?', delay: '3 days' }
  ]);
  const [emailResponse, setEmailResponse] = useState(null);
  const [emailHistory, setEmailHistory] = useState([]);

  // Check email service status
  const { data: emailStatus } = useQuery({
    queryKey: ['emailStatus'],
    queryFn: async () => {
      const response = await emailApi.getStatus();
      return response.data;
    },
    refetchInterval: 30000
  });

  // Send test webhook mutation
  const sendTestMutation = useMutation({
    mutationFn: async () => {
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(payload);
        setJsonError(null);
      } catch (e) {
        setJsonError('Invalid JSON: ' + e.message);
        throw new Error('Invalid JSON payload');
      }

      if (webhookType === 'test') {
        return webhooksApi.sendTestWebhook(parsedPayload);
      } else {
        return webhooksApi.simulateWebhook(webhookType, parsedPayload);
      }
    },
    onMutate: () => {
      setIsLoading(true);
    },
    onSuccess: (data) => {
      setLastResponse({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
      addToHistory({
        id: Date.now(),
        type: webhookType,
        payload: payload,
        response: data,
        success: true,
        timestamp: new Date().toISOString()
      });
      toast.success('Webhook sent successfully!');
      
      // Refresh leads and webhook logs
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['recentLeads']);
      queryClient.invalidateQueries(['leadStats']);
      queryClient.invalidateQueries(['webhookLogs']);
      queryClient.invalidateQueries(['recentWebhooks']);
    },
    onError: (error) => {
      setLastResponse({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      addToHistory({
        id: Date.now(),
        type: webhookType,
        payload: payload,
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      });
      toast.error(error.message || 'Failed to send webhook');
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const handlePayloadChange = (e) => {
    const value = e.target.value;
    setPayload(value);
    
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (e) {
      setJsonError('Invalid JSON: ' + e.message);
    }
  };

  const loadSamplePayload = (type) => {
    const sample = samplePayloads[type] || samplePayloads.test;
    setPayload(JSON.stringify(sample, null, 2));
    setJsonError(null);
  };

  const formatPayload = () => {
    try {
      const parsed = JSON.parse(payload);
      setPayload(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (e) {
      setJsonError('Cannot format: ' + e.message);
    }
  };

  const handleCopy = async (text) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success('Copied to clipboard');
    }
  };

  const selectedType = webhookTypes.find(t => t.id === webhookType);

  // Send test email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!testEmail) {
        throw new Error('Email address is required');
      }
      return emailApi.sendTest(testEmail, emailSubject || null, emailContent || null);
    },
    onSuccess: (response) => {
      setEmailResponse({
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      });
      setEmailHistory(prev => [{
        id: Date.now(),
        type: 'test',
        email: testEmail,
        success: true,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 20));
      toast.success(`Test email sent to ${testEmail}!`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message;
      setEmailResponse({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      setEmailHistory(prev => [{
        id: Date.now(),
        type: 'test',
        email: testEmail,
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 20));
      toast.error(errorMessage);
    }
  });

  // Send email sequence mutation
  const sendSequenceMutation = useMutation({
    mutationFn: async () => {
      if (!testEmail) {
        throw new Error('Email address is required');
      }
      return emailApi.sendSequence(testEmail, emailSequence);
    },
    onSuccess: (response) => {
      setEmailResponse({
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      });
      setEmailHistory(prev => [{
        id: Date.now(),
        type: 'sequence',
        email: testEmail,
        steps: emailSequence.length,
        success: true,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 20));
      toast.success(`Email sequence (${emailSequence.length} emails) sent to ${testEmail}!`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.message;
      setEmailResponse({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      toast.error(errorMessage);
    }
  });

  const addSequenceStep = () => {
    setEmailSequence(prev => [...prev, { 
      subject: `Email ${prev.length + 1}`, 
      content: 'Your email content here...', 
      delay: '1 day' 
    }]);
  };

  const removeSequenceStep = (index) => {
    setEmailSequence(prev => prev.filter((_, i) => i !== index));
  };

  const updateSequenceStep = (index, field, value) => {
    setEmailSequence(prev => prev.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Testing Playground</h2>
          <p className="text-dark-400 text-sm mt-1">
            Test webhooks and email sequences
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-dark-800/50 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all",
              activeTab === 'webhooks'
                ? "bg-primary-500 text-white"
                : "text-dark-400 hover:text-white"
            )}
          >
            <Zap className="w-4 h-4" />
            Webhooks
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all",
              activeTab === 'email'
                ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white"
                : "text-dark-400 hover:text-white"
            )}
          >
            <Mail className="w-4 h-4" />
            Email Testing
          </button>
        </div>
      </div>

      {activeTab === 'webhooks' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Webhook Type & Payload */}
        <div className="lg:col-span-2 space-y-6">
          {/* Webhook Type Selector */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">Select Webhook Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {webhookTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setWebhookType(type.id);
                    loadSamplePayload(type.id);
                  }}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    webhookType === type.id
                      ? "border-primary-500 bg-primary-500/10"
                      : "border-dark-700 bg-dark-800/30 hover:border-dark-500"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                    type.color === 'primary' && "bg-primary-500/20 text-primary-400",
                    type.color === 'blue' && "bg-blue-500/20 text-blue-400",
                    type.color === 'purple' && "bg-purple-500/20 text-purple-400"
                  )}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <p className="font-medium text-white">{type.name}</p>
                  <p className="text-xs text-dark-400 mt-1">{type.description}</p>
                </button>
              ))}
            </div>
            
            {selectedType && (
              <div className="mt-4 p-3 bg-dark-800/30 rounded-lg">
                <p className="text-xs text-dark-400">Endpoint:</p>
                <code className="text-sm text-primary-400 font-mono">{selectedType.endpoint}</code>
              </div>
            )}
          </div>

          {/* Payload Editor */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <FileJson className="w-5 h-5 text-primary-400" />
                Request Payload
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadSamplePayload(webhookType)}
                  className="text-xs text-dark-400 hover:text-white px-3 py-1.5 rounded-lg bg-dark-800/50 transition-colors"
                >
                  Load Sample
                </button>
                <button
                  onClick={formatPayload}
                  className="text-xs text-dark-400 hover:text-white px-3 py-1.5 rounded-lg bg-dark-800/50 transition-colors"
                >
                  Format
                </button>
                <button
                  onClick={() => handleCopy(payload)}
                  className="text-xs text-dark-400 hover:text-white px-3 py-1.5 rounded-lg bg-dark-800/50 transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            </div>
            
            <div className="relative">
              <textarea
                value={payload}
                onChange={handlePayloadChange}
                rows={12}
                className={cn(
                  "w-full font-mono text-sm bg-dark-900 border rounded-xl p-4 resize-none",
                  "focus:outline-none focus:ring-2 transition-all",
                  jsonError 
                    ? "border-danger-500/50 focus:ring-danger-500/30 text-danger-300"
                    : "border-dark-700 focus:ring-primary-500/30 text-dark-100"
                )}
                placeholder='{"name": "John Doe", "email": "john@example.com"}'
                spellCheck={false}
              />
              {jsonError && (
                <p className="absolute bottom-3 left-4 text-xs text-danger-400 bg-dark-900 px-2">
                  {jsonError}
                </p>
              )}
            </div>

            {/* Send Button */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-dark-500">
                Tip: The payload will be sent to {selectedType?.endpoint}
              </p>
              <button
                onClick={() => sendTestMutation.mutate()}
                disabled={isLoading || !!jsonError}
                className={cn(
                  "px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all",
                  "bg-gradient-to-r from-primary-500 to-accent-500 text-white",
                  "hover:shadow-lg hover:shadow-primary-500/25",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Webhook
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Response Panel */}
          {lastResponse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "glass-card p-6",
                lastResponse.success 
                  ? "border-success-500/30" 
                  : "border-danger-500/30"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  {lastResponse.success ? (
                    <CheckCircle2 className="w-5 h-5 text-success-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-danger-400" />
                  )}
                  Response
                </h3>
                <span className="text-xs text-dark-400">
                  {formatDateTime(lastResponse.timestamp)}
                </span>
              </div>
              
              <div className="code-block text-xs overflow-auto max-h-64">
                <pre>
                  {lastResponse.success 
                    ? JSON.stringify(lastResponse.data, null, 2)
                    : lastResponse.error
                  }
                </pre>
              </div>
              
              {lastResponse.success && lastResponse.data?.data?.id && (
                <div className="mt-4 p-3 bg-success-500/10 rounded-lg border border-success-500/30">
                  <p className="text-sm text-success-400">
                    ✓ Lead created with ID: <code className="font-mono">{lastResponse.data.data.id}</code>
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right Column - History */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setWebhookType('meta');
                  loadSamplePayload('meta');
                  setTimeout(() => sendTestMutation.mutate(), 100);
                }}
                disabled={isLoading}
                className="w-full p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span className="text-sm">Quick Test: Meta Form Lead</span>
              </button>
              <button
                onClick={() => {
                  setWebhookType('calcom');
                  loadSamplePayload('calcom');
                  setTimeout(() => sendTestMutation.mutate(), 100);
                }}
                disabled={isLoading}
                className="w-full p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span className="text-sm">Quick Test: Cal.com Booking</span>
              </button>
            </div>
          </div>

          {/* Test History */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Test History</h3>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs text-dark-400 hover:text-danger-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-center py-8 text-dark-500">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tests yet</p>
                  <p className="text-xs">Send a webhook to see history</p>
                </div>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "p-3 rounded-lg border",
                      entry.success
                        ? "bg-success-500/5 border-success-500/20"
                        : "bg-danger-500/5 border-danger-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {entry.success ? (
                          <CheckCircle2 className="w-4 h-4 text-success-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-danger-400" />
                        )}
                        <span className="text-sm font-medium text-white capitalize">
                          {entry.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-dark-500">
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </div>
                    
                    {entry.success && entry.response?.data?.id && (
                      <p className="text-xs text-dark-400 font-mono truncate">
                        Lead: {entry.response.data.id.slice(0, 8)}...
                      </p>
                    )}
                    
                    {!entry.success && entry.error && (
                      <p className="text-xs text-danger-400 truncate">
                        {entry.error}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Documentation */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary-400" />
              API Documentation
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-dark-400 mb-1">Test Endpoint:</p>
                <code className="text-xs text-primary-400 bg-dark-800/50 px-2 py-1 rounded block">
                  POST /api/webhooks/test
                </code>
              </div>
              <div>
                <p className="text-dark-400 mb-1">Meta Simulation:</p>
                <code className="text-xs text-blue-400 bg-dark-800/50 px-2 py-1 rounded block">
                  POST /api/webhooks/simulate/meta
                </code>
              </div>
              <div>
                <p className="text-dark-400 mb-1">Cal.com Simulation:</p>
                <code className="text-xs text-purple-400 bg-dark-800/50 px-2 py-1 rounded block">
                  POST /api/webhooks/simulate/calcom
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Email Testing Tab */}
      {activeTab === 'email' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Email Testing */}
          <div className="lg:col-span-2 space-y-6">
            {/* Email Service Status */}
            <div className={cn(
              "glass-card p-4 flex items-center gap-4",
              emailStatus?.data?.configured 
                ? "border-success-500/30" 
                : "border-warning-500/30"
            )}>
              {emailStatus?.data?.configured ? (
                <>
                  <div className="w-10 h-10 rounded-lg bg-success-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Email Service Connected</p>
                    <p className="text-xs text-dark-400">SMTP configured and ready to send</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg bg-warning-500/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-warning-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Email Service Not Configured</p>
                    <p className="text-xs text-dark-400">
                      Set SMTP_USER and SMTP_PASS environment variables
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Single Email Test */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Send Test Email</h3>
                  <p className="text-xs text-dark-400">Send a quick test to any email address</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Subject (optional)
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Test email subject..."
                    className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Content (optional)
                  </label>
                  <textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Your test email content..."
                    rows={3}
                    className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-xl text-white placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 resize-none"
                  />
                </div>

                <button
                  onClick={() => sendEmailMutation.mutate()}
                  disabled={!testEmail || sendEmailMutation.isPending}
                  className={cn(
                    "w-full px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all",
                    "bg-gradient-to-r from-pink-500 to-orange-500 text-white",
                    "hover:shadow-lg hover:shadow-pink-500/25",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {sendEmailMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Test Email
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Email Sequence Builder */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Email Sequence</h3>
                    <p className="text-xs text-dark-400">Test a multi-email sequence</p>
                  </div>
                </div>
                <button
                  onClick={addSequenceStep}
                  className="px-3 py-1.5 rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {emailSequence.map((step, index) => (
                  <div
                    key={index}
                    className="p-4 bg-dark-800/30 border border-dark-700 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-medium flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-white">Email {index + 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={step.delay}
                          onChange={(e) => updateSequenceStep(index, 'delay', e.target.value)}
                          className="text-xs px-2 py-1 bg-dark-700 border border-dark-600 rounded-lg text-dark-300 focus:outline-none"
                        >
                          <option value="immediately">Immediately</option>
                          <option value="1 hour">After 1 hour</option>
                          <option value="1 day">After 1 day</option>
                          <option value="2 days">After 2 days</option>
                          <option value="3 days">After 3 days</option>
                          <option value="1 week">After 1 week</option>
                        </select>
                        {emailSequence.length > 1 && (
                          <button
                            onClick={() => removeSequenceStep(index)}
                            className="p-1 text-dark-500 hover:text-danger-400 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      value={step.subject}
                      onChange={(e) => updateSequenceStep(index, 'subject', e.target.value)}
                      placeholder="Email subject..."
                      className="w-full px-3 py-2 mb-2 bg-dark-900/50 border border-dark-700 rounded-lg text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-primary-500/50"
                    />
                    
                    <textarea
                      value={step.content}
                      onChange={(e) => updateSequenceStep(index, 'content', e.target.value)}
                      placeholder="Email content..."
                      rows={2}
                      className="w-full px-3 py-2 bg-dark-900/50 border border-dark-700 rounded-lg text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-primary-500/50 resize-none"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-dark-700">
                <button
                  onClick={() => sendSequenceMutation.mutate()}
                  disabled={!testEmail || sendSequenceMutation.isPending || emailSequence.length === 0}
                  className={cn(
                    "w-full px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all",
                    "bg-gradient-to-r from-purple-500 to-blue-500 text-white",
                    "hover:shadow-lg hover:shadow-purple-500/25",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {sendSequenceMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending Sequence...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Send All {emailSequence.length} Emails to {testEmail || 'recipient'}
                    </>
                  )}
                </button>
                <p className="text-xs text-dark-500 text-center mt-2">
                  For testing, all emails send immediately (delays shown are for reference)
                </p>
              </div>
            </div>

            {/* Email Response */}
            {emailResponse && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "glass-card p-6",
                  emailResponse.success 
                    ? "border-success-500/30" 
                    : "border-danger-500/30"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    {emailResponse.success ? (
                      <CheckCircle2 className="w-5 h-5 text-success-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-danger-400" />
                    )}
                    Email Response
                  </h3>
                  <span className="text-xs text-dark-400">
                    {formatDateTime(emailResponse.timestamp)}
                  </span>
                </div>
                
                <div className="code-block text-xs overflow-auto max-h-64">
                  <pre>
                    {emailResponse.success 
                      ? JSON.stringify(emailResponse.data, null, 2)
                      : emailResponse.error
                    }
                  </pre>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Email History & Setup Guide */}
          <div className="space-y-6">
            {/* Email History */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Email History</h3>
                {emailHistory.length > 0 && (
                  <button
                    onClick={() => setEmailHistory([])}
                    className="text-xs text-dark-400 hover:text-danger-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {emailHistory.length === 0 ? (
                  <div className="text-center py-8 text-dark-500">
                    <Mail className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No emails sent yet</p>
                    <p className="text-xs">Test emails will appear here</p>
                  </div>
                ) : (
                  emailHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className={cn(
                        "p-3 rounded-lg border",
                        entry.success
                          ? "bg-success-500/5 border-success-500/20"
                          : "bg-danger-500/5 border-danger-500/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {entry.success ? (
                            <CheckCircle2 className="w-4 h-4 text-success-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-danger-400" />
                          )}
                          <span className="text-sm font-medium text-white">
                            {entry.type === 'sequence' ? `Sequence (${entry.steps})` : 'Test Email'}
                          </span>
                        </div>
                        <span className="text-[10px] text-dark-500">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-dark-400 truncate">
                        To: {entry.email}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SMTP Setup Guide */}
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary-400" />
                SMTP Setup
              </h3>
              <div className="space-y-3 text-sm">
                <p className="text-dark-400 text-xs">
                  Add these environment variables to enable email:
                </p>
                <div className="space-y-2">
                  <code className="text-xs text-pink-400 bg-dark-800/50 px-2 py-1 rounded block">
                    SMTP_HOST=smtp.gmail.com
                  </code>
                  <code className="text-xs text-pink-400 bg-dark-800/50 px-2 py-1 rounded block">
                    SMTP_PORT=587
                  </code>
                  <code className="text-xs text-pink-400 bg-dark-800/50 px-2 py-1 rounded block">
                    SMTP_USER=your@gmail.com
                  </code>
                  <code className="text-xs text-pink-400 bg-dark-800/50 px-2 py-1 rounded block">
                    SMTP_PASS=app_password
                  </code>
                </div>
                <p className="text-dark-500 text-xs mt-3">
                  💡 For Gmail, use an App Password from your Google Account settings.
                </p>
              </div>
            </div>

            {/* API Reference */}
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-4">Email API</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-dark-400 mb-1">Send Test:</p>
                  <code className="text-xs text-pink-400 bg-dark-800/50 px-2 py-1 rounded block">
                    POST /api/email/test
                  </code>
                </div>
                <div>
                  <p className="text-dark-400 mb-1">Send Sequence:</p>
                  <code className="text-xs text-purple-400 bg-dark-800/50 px-2 py-1 rounded block">
                    POST /api/email/sequence
                  </code>
                </div>
                <div>
                  <p className="text-dark-400 mb-1">Check Status:</p>
                  <code className="text-xs text-blue-400 bg-dark-800/50 px-2 py-1 rounded block">
                    GET /api/email/status
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Playground;
