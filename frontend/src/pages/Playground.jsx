/**
 * Webhook Testing Playground
 * 
 * Send test webhooks and simulate integrations.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { webhooksApi } from '../lib/api';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Testing Playground</h2>
        <p className="text-dark-400 text-sm mt-1">
          Send test webhooks and simulate external integrations
        </p>
      </div>

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
    </div>
  );
}

export default Playground;
