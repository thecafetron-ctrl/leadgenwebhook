/**
 * Webhook Logs Page
 * 
 * View and analyze incoming webhook events.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  X,
  Copy,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { webhooksApi } from '../lib/api';
import { useAppStore } from '../lib/store';
import { 
  cn, 
  formatDateTime, 
  formatRelativeTime, 
  formatSource,
  getWebhookStatusColor,
  getSourceColor,
  copyToClipboard
} from '../lib/utils';

const SOURCES = ['meta_forms', 'calcom', 'test', 'api', 'meta_simulated', 'calcom_simulated'];
const STATUSES = ['received', 'processing', 'processed', 'failed'];

function WebhookLogs() {
  const { webhookFilters, setWebhookFilters, resetWebhookFilters } = useAppStore();
  
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('received_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch webhook logs
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['webhookLogs', page, sortBy, sortOrder, webhookFilters],
    queryFn: () => webhooksApi.getLogs({
      page,
      limit: 20,
      sortBy,
      sortOrder,
      source: webhookFilters.source.join(','),
      status: webhookFilters.status.join(','),
      dateFrom: webhookFilters.dateFrom,
      dateTo: webhookFilters.dateTo
    }),
    refetchInterval: 5000, // Poll every 5 seconds
    keepPreviousData: true
  });

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => refetch();
    window.addEventListener('refresh-data', handleRefresh);
    return () => window.removeEventListener('refresh-data', handleRefresh);
  }, [refetch]);

  const logs = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalCount: 0 };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processed':
        return <CheckCircle2 className="w-4 h-4 text-success-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-danger-400" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-warning-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-primary-400" />;
    }
  };

  const handleCopy = async (text, label) => {
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(`${label} copied to clipboard`);
    }
  };

  const activeFilterCount = [
    webhookFilters.source.length,
    webhookFilters.status.length,
    webhookFilters.dateFrom ? 1 : 0,
    webhookFilters.dateTo ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Webhook Logs</h2>
          <p className="text-dark-400 text-sm mt-1">
            {pagination.totalCount} webhook events • Auto-refreshing
            {isFetching && <Loader2 className="w-3 h-3 inline ml-2 animate-spin" />}
          </p>
        </div>
        
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-dark-800/50 border border-dark-600 text-dark-300 hover:text-white hover:border-primary-500 transition-all flex items-center gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-4 py-2 rounded-xl border flex items-center gap-2 transition-all w-full lg:w-auto justify-center",
              showFilters || activeFilterCount > 0
                ? "bg-primary-500/20 border-primary-500 text-primary-300"
                : "bg-dark-800/50 border-dark-600 text-dark-300 hover:border-primary-500"
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-dark-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Source Filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Source</label>
                  <div className="flex flex-wrap gap-2">
                    {SOURCES.map(source => (
                      <button
                        key={source}
                        onClick={() => {
                          const newSource = webhookFilters.source.includes(source)
                            ? webhookFilters.source.filter(s => s !== source)
                            : [...webhookFilters.source, source];
                          setWebhookFilters({ source: newSource });
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                          webhookFilters.source.includes(source)
                            ? getSourceColor(source.replace('_simulated', ''))
                            : "bg-dark-800/50 text-dark-400 hover:text-white"
                        )}
                      >
                        {formatSource(source)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          const newStatus = webhookFilters.status.includes(status)
                            ? webhookFilters.status.filter(s => s !== status)
                            : [...webhookFilters.status, status];
                          setWebhookFilters({ status: newStatus });
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                          webhookFilters.status.includes(status)
                            ? getWebhookStatusColor(status)
                            : "bg-dark-800/50 text-dark-400 hover:text-white"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-dark-300">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="datetime-local"
                      value={webhookFilters.dateFrom}
                      onChange={(e) => setWebhookFilters({ dateFrom: e.target.value })}
                      className="input-field flex-1"
                    />
                    <span className="text-dark-500 self-center">to</span>
                    <input
                      type="datetime-local"
                      value={webhookFilters.dateTo}
                      onChange={(e) => setWebhookFilters({ dateTo: e.target.value })}
                      className="input-field flex-1"
                    />
                  </div>
                </div>
              </div>
              
              {activeFilterCount > 0 && (
                <button
                  onClick={resetWebhookFilters}
                  className="mt-4 text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th 
                  className="p-4 text-left text-dark-400 text-sm font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('received_at')}
                >
                  <div className="flex items-center gap-1">
                    Received
                    {sortBy === 'received_at' && (sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th 
                  className="p-4 text-left text-dark-400 text-sm font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('source')}
                >
                  <div className="flex items-center gap-1">
                    Source
                    {sortBy === 'source' && (sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th className="p-4 text-left text-dark-400 text-sm font-medium">Endpoint</th>
                <th 
                  className="p-4 text-left text-dark-400 text-sm font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortBy === 'status' && (sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th className="p-4 text-left text-dark-400 text-sm font-medium">Lead</th>
                <th className="p-4 text-right text-dark-400 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="table-row">
                    <td className="p-4"><div className="skeleton w-32 h-8 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-24 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-40 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-20 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-16 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-10 h-6 rounded" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-dark-400">
                    <div className="flex flex-col items-center">
                      <Clock className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No webhook logs found</p>
                      <p className="text-sm mt-1">Incoming webhooks will appear here</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="table-row">
                    <td className="p-4">
                      <div>
                        <p className="text-white text-sm">{formatDateTime(log.received_at)}</p>
                        <p className="text-xs text-dark-500">{formatRelativeTime(log.received_at)}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn("badge", getSourceColor(log.source.replace('_simulated', '')))}>
                        {formatSource(log.source)}
                      </span>
                    </td>
                    <td className="p-4">
                      <code className="text-sm font-mono text-dark-300 bg-dark-800/50 px-2 py-1 rounded">
                        {log.endpoint}
                      </code>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <span className={cn("badge", getWebhookStatusColor(log.status))}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {log.lead_id ? (
                        <span className="text-sm text-primary-400 font-mono">
                          {log.lead_id.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-dark-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-dark-700/50 flex items-center justify-between">
            <p className="text-sm text-dark-400">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pagination.totalCount)} of {pagination.totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-dark-600 text-dark-400 hover:text-white hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-dark-400 text-sm px-2">
                Page {page} of {pagination.totalPages}
              </span>
              
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 rounded-lg border border-dark-600 text-dark-400 hover:text-white hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-dark-700/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Webhook Details</h2>
                  <p className="text-dark-400 text-sm mt-1">
                    {formatDateTime(selectedLog.received_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-dark-800/30 rounded-xl">
                    <p className="text-xs text-dark-400">Source</p>
                    <span className={cn("badge mt-1", getSourceColor(selectedLog.source.replace('_simulated', '')))}>
                      {formatSource(selectedLog.source)}
                    </span>
                  </div>
                  <div className="p-4 bg-dark-800/30 rounded-xl">
                    <p className="text-xs text-dark-400">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedLog.status)}
                      <span className="text-white capitalize">{selectedLog.status}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-dark-800/30 rounded-xl">
                    <p className="text-xs text-dark-400">Response Code</p>
                    <p className={cn(
                      "text-lg font-mono mt-1",
                      selectedLog.response_code >= 200 && selectedLog.response_code < 300 ? "text-success-400" : "text-danger-400"
                    )}>
                      {selectedLog.response_code || '-'}
                    </p>
                  </div>
                  <div className="p-4 bg-dark-800/30 rounded-xl">
                    <p className="text-xs text-dark-400">Signature Valid</p>
                    <p className="text-lg mt-1">
                      {selectedLog.signature_valid === true ? (
                        <span className="text-success-400">✓ Valid</span>
                      ) : selectedLog.signature_valid === false ? (
                        <span className="text-danger-400">✗ Invalid</span>
                      ) : (
                        <span className="text-dark-500">Not checked</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Endpoint & IP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-dark-800/30 rounded-xl">
                    <p className="text-xs text-dark-400 mb-2">Endpoint</p>
                    <code className="text-sm font-mono text-primary-400">{selectedLog.endpoint}</code>
                  </div>
                  <div className="p-4 bg-dark-800/30 rounded-xl">
                    <p className="text-xs text-dark-400 mb-2">IP Address</p>
                    <code className="text-sm font-mono text-white">{selectedLog.ip_address || 'Unknown'}</code>
                  </div>
                </div>

                {/* Error Message */}
                {selectedLog.error_message && (
                  <div className="p-4 bg-danger-500/10 border border-danger-500/30 rounded-xl">
                    <p className="text-xs text-danger-400 font-semibold mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Error Message
                    </p>
                    <p className="text-danger-300 text-sm">{selectedLog.error_message}</p>
                  </div>
                )}

                {/* Payload */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-dark-300">Request Payload</p>
                    <button
                      onClick={() => handleCopy(JSON.stringify(selectedLog.payload, null, 2), 'Payload')}
                      className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                  <div className="code-block text-xs overflow-auto max-h-64">
                    <pre>{JSON.stringify(selectedLog.payload, null, 2)}</pre>
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-dark-300">Request Headers</p>
                    <button
                      onClick={() => handleCopy(JSON.stringify(selectedLog.headers, null, 2), 'Headers')}
                      className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                  <div className="code-block text-xs overflow-auto max-h-48">
                    <pre>{JSON.stringify(selectedLog.headers, null, 2)}</pre>
                  </div>
                </div>

                {/* Response Body */}
                {selectedLog.response_body && (
                  <div>
                    <p className="text-sm font-semibold text-dark-300 mb-2">Response Body</p>
                    <div className="code-block text-xs overflow-auto max-h-32">
                      <pre>{selectedLog.response_body}</pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-dark-700/50 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl bg-dark-800/50 text-dark-300 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WebhookLogs;
