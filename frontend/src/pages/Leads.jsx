/**
 * Leads Management Page
 * 
 * Full lead table with filtering, searching, sorting, and management.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Download,
  Upload,
  Mail,
  Phone,
  Building2,
  Calendar,
  Tag,
  X,
  Check,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  Brain,
  Send,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leadsApi, sequencesApi } from '../lib/api';
import { useAppStore } from '../lib/store';
import { 
  cn, 
  formatDate, 
  formatRelativeTime, 
  getFullName, 
  getInitials,
  getStatusColor, 
  getSourceColor,
  getPriorityColor,
  formatSource,
  formatPhone,
  debounce,
  downloadCSV
} from '../lib/utils';
import LeadModal from '../components/LeadModal';
import LeadDetailModal from '../components/LeadDetailModal';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const SOURCES = ['meta_forms', 'calcom', 'manual', 'api', 'website', 'referral'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const LEAD_TYPES = ['consultation', 'ebook'];
// Budget buckets (AED) — treating <100k as low
const BUDGET_OPTIONS = [
  { label: '100k', value: 100000 },
  { label: '300k', value: 300000 },
  { label: '600k', value: 600000 },
  { label: '1m', value: 1000000 },
  { label: '2m', value: 2000000 }
];
const SHIPMENTS_OPTIONS = [
  { label: '500', value: 500 },
  { label: '1,000', value: 1000 },
  { label: '5,000', value: 5000 },
  { label: '15,000', value: 15000 }
];
const INTENT_CATEGORIES = ['', 'hot', 'warm', 'medium', 'low', 'junk'];
const SCORE_OPTIONS = ['', 0, 20, 40, 60, 80, 90, 100];

// Helper for lead type badge styling
const getLeadTypeColor = (type) => {
  switch (type) {
    case 'consultation':
      return 'bg-accent-500/20 text-accent-300 border border-accent-500/30';
    case 'ebook':
      return 'bg-primary-500/20 text-primary-300 border border-primary-500/30';
    default:
      return 'bg-dark-700/50 text-dark-400 border border-dark-600';
  }
};

const formatLeadType = (type) => {
  if (!type) return '—';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const getEffectiveLeadType = (lead) => lead?.lead_type || lead?.custom_fields?.campaign_type || null;

function Leads() {
  const queryClient = useQueryClient();
  const { 
    leadFilters, 
    setLeadFilters, 
    resetLeadFilters,
    selectedLeads, 
    setSelectedLeads, 
    toggleLeadSelection,
    clearSelectedLeads,
    modals,
    openModal,
    closeModal
  } = useAppStore();

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value) => setLeadFilters({ search: value }), 300),
    [setLeadFilters]
  );

  useEffect(() => {
    debouncedSearch(searchInput);
  }, [searchInput, debouncedSearch]);

  // Fetch leads
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['leads', page, sortBy, sortOrder, leadFilters],
    queryFn: () => leadsApi.getLeads({
      page,
      limit: 20,
      sortBy,
      sortOrder,
      search: leadFilters.search,
      status: leadFilters.status.join(','),
      source: leadFilters.source.join(','),
      leadType: leadFilters.leadType?.join(',') || '',
      intentCategory: leadFilters.intentCategory,
      scoreMin: leadFilters.scoreMin,
      scoreMax: leadFilters.scoreMax,
      budgetMin: leadFilters.budgetMin,
      budgetMax: leadFilters.budgetMax,
      shipmentsMin: leadFilters.shipmentsMin,
      shipmentsMax: leadFilters.shipmentsMax,
      decisionMaker: leadFilters.decisionMaker,
      priority: leadFilters.priority,
      dateFrom: leadFilters.dateFrom,
      dateTo: leadFilters.dateTo
    }),
    keepPreviousData: true
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: leadsApi.deleteLead,
    onSuccess: () => {
      toast.success('Lead deleted successfully');
      queryClient.invalidateQueries(['leads']);
      closeModal('deleteConfirm');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete lead');
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: leadsApi.bulkDelete,
    onSuccess: (data) => {
      toast.success(`${data.deletedCount} leads deleted`);
      queryClient.invalidateQueries(['leads']);
      clearSelectedLeads();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete leads');
    }
  });

  // Workflow enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: ({ leadId, sequenceSlug }) => sequencesApi.enrollLead(leadId, sequenceSlug),
    onSuccess: () => {
      toast.success('Lead enrolled in workflow!');
      queryClient.invalidateQueries(['leads']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to enroll lead');
    }
  });

  // Cancel sequence mutation
  const cancelMutation = useMutation({
    mutationFn: ({ leadId, sequenceSlug }) => sequencesApi.cancelSequence(leadId, sequenceSlug),
    onSuccess: () => {
      toast.success('Workflow cancelled');
      queryClient.invalidateQueries(['leads']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel workflow');
    }
  });

  // Mark as attended mutation
  const attendedMutation = useMutation({
    mutationFn: (leadId) => leadsApi.markAttended(leadId),
    onSuccess: (data) => {
      toast.success(`${data.message || 'Lead marked as attended!'}`);
      queryClient.invalidateQueries(['leads']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark as attended');
    }
  });

  // AI Score mutation
  const [scoringLeadId, setScoringLeadId] = useState(null);
  const scoreMutation = useMutation({
    mutationFn: (leadId) => leadsApi.scoreLead(leadId),
    onMutate: (leadId) => {
      setScoringLeadId(leadId);
    },
    onSuccess: (data) => {
      toast.success(`AI Score: ${data.data.score}/100`);
      queryClient.invalidateQueries(['leads']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to score lead');
    },
    onSettled: () => {
      setScoringLeadId(null);
    }
  });

  // Score all leads mutation
  const scoreAllMutation = useMutation({
    mutationFn: () => leadsApi.scoreAllLeads(),
    onSuccess: (data) => {
      toast.success(`Scored ${data.data.length} leads!`);
      queryClient.invalidateQueries(['leads']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to score leads');
    }
  });

  // Rescore all leads mutation
  const rescoreAllMutation = useMutation({
    mutationFn: () => leadsApi.rescoreAllLeads(),
    onSuccess: (data) => {
      toast.success(`Re-scored ${data.data.length} leads!`);
      queryClient.invalidateQueries(['leads']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to rescore leads');
    }
  });

  // Manual send state
  const [showManualSend, setShowManualSend] = useState(false);

  // AI Advice modal state
  const [adviceModal, setAdviceModal] = useState({ open: false, leadId: null });

  // State for workflow modal
  const [workflowModal, setWorkflowModal] = useState({ open: false, lead: null, status: null });

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => refetch();
    window.addEventListener('refresh-data', handleRefresh);
    return () => window.removeEventListener('refresh-data', handleRefresh);
  }, [refetch]);

  const leads = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, totalCount: 0 };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      clearSelectedLeads();
    } else {
      setSelectedLeads(leads.map(l => l.id));
    }
  };

  const handleExport = () => {
    const exportData = leads.map(lead => ({
      name: getFullName(lead.first_name, lead.last_name),
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: formatSource(lead.source),
      status: lead.status,
      priority: lead.priority,
      created_at: formatDate(lead.created_at, 'yyyy-MM-dd HH:mm:ss')
    }));
    downloadCSV(exportData, `leads-export-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('Leads exported successfully');
  };

  const activeFilterCount = [
    leadFilters.status.length,
    leadFilters.source.length,
    leadFilters.leadType?.length || 0,
    leadFilters.intentCategory ? 1 : 0,
    leadFilters.scoreMin !== '' ? 1 : 0,
    leadFilters.scoreMax !== '' ? 1 : 0,
    leadFilters.budgetMin ? 1 : 0,
    leadFilters.budgetMax ? 1 : 0,
    leadFilters.shipmentsMin ? 1 : 0,
    leadFilters.shipmentsMax ? 1 : 0,
    leadFilters.decisionMaker ? 1 : 0,
    leadFilters.priority ? 1 : 0,
    leadFilters.dateFrom ? 1 : 0,
    leadFilters.dateTo ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Leads</h2>
          <p className="text-dark-400 text-sm mt-1">
            {pagination.totalCount} total leads
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => rescoreAllMutation.mutate()}
            disabled={rescoreAllMutation.isLoading || scoreAllMutation.isLoading}
            className="px-4 py-2 rounded-xl bg-accent-500/20 border border-accent-500/50 text-accent-300 hover:bg-accent-500/30 transition-all flex items-center gap-2"
            title="Re-score all leads with proper logic"
          >
            <Sparkles className="w-4 h-4" />
            {rescoreAllMutation.isLoading ? 'Scoring...' : 'Score All'}
          </button>
          <button
            onClick={() => setShowManualSend(true)}
            disabled={selectedLeads.length === 0}
            className={cn(
              "px-4 py-2 rounded-xl border transition-all flex items-center gap-2",
              selectedLeads.length > 0
                ? "bg-success-500/20 border-success-500/50 text-success-300 hover:bg-success-500/30"
                : "bg-dark-800/50 border-dark-600 text-dark-500 cursor-not-allowed"
            )}
            title={selectedLeads.length > 0 ? `Send to ${selectedLeads.length} leads` : 'Select leads first'}
          >
            <Send className="w-4 h-4" />
            Send ({selectedLeads.length})
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-xl bg-dark-800/50 border border-dark-600 text-dark-300 hover:text-white hover:border-primary-500 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => openModal('createLead')}
            className="px-4 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or company..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-4 py-2 rounded-xl border flex items-center gap-2 transition-all",
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
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          const newStatus = leadFilters.status.includes(status)
                            ? leadFilters.status.filter(s => s !== status)
                            : [...leadFilters.status, status];
                          setLeadFilters({ status: newStatus });
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                          leadFilters.status.includes(status)
                            ? getStatusColor(status)
                            : "bg-dark-800/50 text-dark-400 hover:text-white"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source Filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Source</label>
                  <div className="flex flex-wrap gap-2">
                    {SOURCES.map(source => (
                      <button
                        key={source}
                        onClick={() => {
                          const newSource = leadFilters.source.includes(source)
                            ? leadFilters.source.filter(s => s !== source)
                            : [...leadFilters.source, source];
                          setLeadFilters({ source: newSource });
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                          leadFilters.source.includes(source)
                            ? getSourceColor(source)
                            : "bg-dark-800/50 text-dark-400 hover:text-white"
                        )}
                      >
                        {formatSource(source)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Priority</label>
                  <select
                    value={leadFilters.priority}
                    onChange={(e) => setLeadFilters({ priority: e.target.value })}
                    className="input-field"
                  >
                    <option value="" className="bg-dark-800 text-white">All Priorities</option>
                    {PRIORITIES.map(priority => (
                      <option key={priority} value={priority} className="bg-dark-800 text-white capitalize">
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lead Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Lead Type</label>
                  <div className="flex flex-wrap gap-2">
                    {LEAD_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          const newTypes = leadFilters.leadType?.includes(type)
                            ? leadFilters.leadType.filter(t => t !== type)
                            : [...(leadFilters.leadType || []), type];
                          setLeadFilters({ leadType: newTypes });
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                          leadFilters.leadType?.includes(type)
                            ? getLeadTypeColor(type)
                            : "bg-dark-800/50 text-dark-400 hover:text-white"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget Filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Budget (AED)</label>
                  <div className="flex gap-2">
                    <select
                      value={leadFilters.budgetMin}
                      onChange={(e) => setLeadFilters({ budgetMin: e.target.value })}
                      className="input-field"
                    >
                      <option value="" className="bg-dark-800 text-white">Min</option>
                      {BUDGET_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} className="bg-dark-800 text-white">{o.label}</option>
                      ))}
                    </select>
                    <select
                      value={leadFilters.budgetMax}
                      onChange={(e) => setLeadFilters({ budgetMax: e.target.value })}
                      className="input-field"
                    >
                      <option value="" className="bg-dark-800 text-white">Max</option>
                      {BUDGET_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} className="bg-dark-800 text-white">{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Shipments Filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Shipments / Month</label>
                  <div className="flex gap-2">
                    <select
                      value={leadFilters.shipmentsMin}
                      onChange={(e) => setLeadFilters({ shipmentsMin: e.target.value })}
                      className="input-field"
                    >
                      <option value="" className="bg-dark-800 text-white">Min</option>
                      {SHIPMENTS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} className="bg-dark-800 text-white">{o.label}</option>
                      ))}
                    </select>
                    <select
                      value={leadFilters.shipmentsMax}
                      onChange={(e) => setLeadFilters({ shipmentsMax: e.target.value })}
                      className="input-field"
                    >
                      <option value="" className="bg-dark-800 text-white">Max</option>
                      {SHIPMENTS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value} className="bg-dark-800 text-white">{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Decision Maker Filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Decision Maker</label>
                  <select
                    value={leadFilters.decisionMaker}
                    onChange={(e) => setLeadFilters({ decisionMaker: e.target.value })}
                    className="input-field"
                  >
                    <option value="" className="bg-dark-800 text-white">All</option>
                    <option value="true" className="bg-dark-800 text-white">Yes</option>
                    <option value="false" className="bg-dark-800 text-white">No</option>
                  </select>
                </div>

                {/* Intent Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Intent</label>
                  <select
                    value={leadFilters.intentCategory}
                    onChange={(e) => setLeadFilters({ intentCategory: e.target.value })}
                    className="input-field"
                  >
                    {INTENT_CATEGORIES.map((c) => (
                      <option key={c || 'all'} value={c} className="bg-dark-800 text-white">
                        {c ? c.toUpperCase() : 'All'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Score Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Score</label>
                  <div className="flex gap-2">
                    <select
                      value={leadFilters.scoreMin}
                      onChange={(e) => setLeadFilters({ scoreMin: e.target.value })}
                      className="input-field"
                    >
                      {SCORE_OPTIONS.map((v) => (
                        <option key={`min-${v}`} value={v} className="bg-dark-800 text-white">
                          {v === '' ? 'Min' : v}
                        </option>
                      ))}
                    </select>
                    <select
                      value={leadFilters.scoreMax}
                      onChange={(e) => setLeadFilters({ scoreMax: e.target.value })}
                      className="input-field"
                    >
                      {SCORE_OPTIONS.map((v) => (
                        <option key={`max-${v}`} value={v} className="bg-dark-800 text-white">
                          {v === '' ? 'Max' : v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-300">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={leadFilters.dateFrom}
                      onChange={(e) => setLeadFilters({ dateFrom: e.target.value })}
                      className="input-field flex-1"
                    />
                    <input
                      type="date"
                      value={leadFilters.dateTo}
                      onChange={(e) => setLeadFilters({ dateTo: e.target.value })}
                      className="input-field flex-1"
                    />
                  </div>
                </div>
              </div>
              
              {/* Reset Filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={resetLeadFilters}
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

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedLeads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-4 flex items-center justify-between"
          >
            <span className="text-sm text-dark-300">
              <span className="text-white font-medium">{selectedLeads.length}</span> leads selected
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => bulkDeleteMutation.mutate(selectedLeads)}
                className="px-4 py-2 rounded-xl bg-danger-500/20 text-danger-400 hover:bg-danger-500/30 transition-colors flex items-center gap-2 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
              <button
                onClick={clearSelectedLeads}
                className="px-4 py-2 rounded-xl bg-dark-800/50 text-dark-300 hover:text-white transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="p-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedLeads.length === leads.length && leads.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                  />
                </th>
                <th 
                  className="p-4 text-left text-dark-400 text-sm font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('first_name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortBy === 'first_name' && (sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th 
                  className="p-4 text-left text-dark-400 text-sm font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    Contact
                    {sortBy === 'email' && (sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
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
                <th 
                  className="p-4 text-left text-dark-400 text-sm font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('lead_type')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {sortBy === 'lead_type' && (sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th 
                  className="p-4 text-left text-dark-400 text-sm font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortBy === 'status' && (sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th 
                  className="p-4 text-left text-dark-400 text-sm font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('score')}
                >
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Score
                    {sortBy === 'score' && (sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th 
                  className="p-4 text-left text-dark-400 text-sm font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Created
                    {sortBy === 'created_at' && (sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                  </div>
                </th>
                <th className="p-4 text-left text-dark-400 text-sm font-medium">
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    Workflow
                  </div>
                </th>
                <th className="p-4 text-right text-dark-400 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Loading skeleton
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="table-row">
                    <td className="p-4"><div className="skeleton w-4 h-4 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-32 h-10 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-40 h-8 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-20 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-16 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-20 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-12 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-24 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-24 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-20 h-6 rounded" /></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-12 text-center text-dark-400">
                    <div className="flex flex-col items-center">
                      <Search className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No leads found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="table-row">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center text-white font-medium text-sm">
                          {getInitials(lead.first_name, lead.last_name)}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {getFullName(lead.first_name, lead.last_name)}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={cn("badge text-[11px] px-2 py-0.5", getLeadTypeColor(getEffectiveLeadType(lead)))}>
                              {formatLeadType(getEffectiveLeadType(lead))}
                            </span>
                            <span className="text-xs text-dark-400">
                              Type
                            </span>
                          </div>
                          {lead.company && (
                            <p className="text-xs text-dark-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {lead.company}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {lead.email && (
                          <p className="text-sm text-dark-300 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-dark-500" />
                            {lead.email}
                          </p>
                        )}
                        {lead.phone && (
                          <p className="text-sm text-dark-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-dark-500" />
                            {formatPhone(lead.phone)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className={cn("badge", getSourceColor(lead.source))}>
                          {formatSource(lead.source)}
                        </span>
                        {lead.custom_fields?.ad_name && (
                          <p className="text-xs text-dark-500" title={lead.custom_fields?.campaign_name}>
                            {lead.custom_fields.ad_name}
                          </p>
                        )}
                        {lead.custom_fields?.meta_ad_name && !lead.custom_fields?.ad_name && (
                          <p className="text-xs text-dark-500" title={lead.custom_fields?.meta_campaign_name}>
                            {lead.custom_fields.meta_ad_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn("badge text-xs", getLeadTypeColor(lead.lead_type))}>
                        {formatLeadType(lead.lead_type)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn("badge", getStatusColor(lead.status))}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <ScoreCell 
                        score={lead.score} 
                        onScore={() => scoreMutation.mutate(lead.id)}
                        onAdvice={() => setAdviceModal({ open: true, leadId: lead.id })}
                        isLoading={scoringLeadId === lead.id}
                      />
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p className="text-dark-300">{formatDate(lead.created_at)}</p>
                        <p className="text-xs text-dark-500">{formatRelativeTime(lead.created_at)}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <WorkflowCell 
                        lead={lead} 
                        onOpenWorkflow={(lead, status) => setWorkflowModal({ open: true, lead, status })}
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Mark as Attended - only show if has booking */}
                        {lead.custom_fields?.booking_time && (
                          lead.meeting_status === 'attended' ? (
                            <span className="p-2 rounded-lg text-success-400" title="Attended">
                              <UserCheck className="w-4 h-4" />
                            </span>
                          ) : (
                            <button
                              onClick={() => attendedMutation.mutate(lead.id)}
                              disabled={attendedMutation.isLoading}
                              className="p-2 rounded-lg text-dark-400 hover:text-success-400 hover:bg-success-500/10 transition-colors"
                              title="Mark as Attended (prevents no-show emails)"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )
                        )}
                        <button
                          onClick={() => openModal('viewLead', lead)}
                          className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('editLead', lead)}
                          className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                          title="Edit lead"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('deleteConfirm', lead.id)}
                          className="p-2 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors"
                          title="Delete lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
              
              {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "w-10 h-10 rounded-lg font-medium transition-colors",
                      page === pageNum
                        ? "bg-primary-500 text-white"
                        : "border border-dark-600 text-dark-400 hover:text-white hover:border-primary-500"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
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

      {/* Modals */}
      <LeadModal
        isOpen={modals.createLead || !!modals.editLead}
        lead={modals.editLead}
        onClose={() => {
          closeModal('createLead');
          closeModal('editLead');
        }}
      />

      <LeadDetailModal
        lead={modals.viewLead}
        onClose={() => closeModal('viewLead')}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {modals.deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => closeModal('deleteConfirm')}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Delete Lead</h3>
              <p className="text-dark-300 mb-6">
                Are you sure you want to delete this lead? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => closeModal('deleteConfirm')}
                  className="px-4 py-2 rounded-xl bg-dark-800/50 text-dark-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(modals.deleteConfirm)}
                  disabled={deleteMutation.isLoading}
                  className="px-4 py-2 rounded-xl bg-danger-500 text-white hover:bg-danger-600 transition-colors flex items-center gap-2"
                >
                  {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workflow Modal */}
      <WorkflowModal 
        isOpen={workflowModal.open}
        lead={workflowModal.lead}
        initialStatus={workflowModal.status}
        onClose={() => setWorkflowModal({ open: false, lead: null, status: null })}
        onEnroll={(sequenceSlug) => {
          enrollMutation.mutate({ leadId: workflowModal.lead?.id, sequenceSlug });
          setWorkflowModal({ open: false, lead: null, status: null });
        }}
        onCancel={(sequenceSlug) => {
          cancelMutation.mutate({ leadId: workflowModal.lead?.id, sequenceSlug });
          setWorkflowModal({ open: false, lead: null, status: null });
        }}
        isLoading={enrollMutation.isLoading || cancelMutation.isLoading}
      />

      {/* Manual Send Modal */}
      <ManualSendModal
        isOpen={showManualSend}
        selectedLeads={selectedLeads}
        leads={leads}
        onClose={() => setShowManualSend(false)}
      />

      {/* AI Advice Modal */}
      <AdviceModal
        isOpen={adviceModal.open}
        leadId={adviceModal.leadId}
        onClose={() => setAdviceModal({ open: false, leadId: null })}
      />
    </div>
  );
}

/**
 * WorkflowCell - Shows the lead's workflow status inline
 */
function WorkflowCell({ lead, onOpenWorkflow }) {
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['leadSequenceStatus', lead.id],
    queryFn: () => sequencesApi.getLeadSequenceStatus(lead.id),
    staleTime: 30000, // Cache for 30 seconds
  });

  if (isLoading) {
    return <div className="skeleton w-24 h-6 rounded" />;
  }

  const status = statusData?.data;

  if (!status?.enrolled) {
    // Not enrolled - show start button
    return (
      <button
        onClick={() => onOpenWorkflow(lead, status)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors text-sm"
      >
        <Play className="w-3.5 h-3.5" />
        Start Workflow
      </button>
    );
  }

  const active = status.activeSequence;
  
  if (active) {
    // Active in a sequence - show progress
    return (
      <button
        onClick={() => onOpenWorkflow(lead, status)}
        className="flex items-center gap-2 text-left"
      >
        <div className="flex flex-col">
          <span className="text-xs text-success-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {active.name.replace(' Nurture', '').replace(' Follow-up', '')}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-16 h-1.5 bg-dark-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-success-500 rounded-full transition-all"
                style={{ width: `${active.progress}%` }}
              />
            </div>
            <span className="text-xs text-dark-400">
              {active.currentStep}/{active.totalSteps}
            </span>
          </div>
        </div>
      </button>
    );
  }

  // Completed or cancelled
  const lastEnrollment = status.enrollments[0];
  const statusIcon = lastEnrollment?.status === 'completed' 
    ? <CheckCircle2 className="w-3.5 h-3.5 text-success-400" />
    : lastEnrollment?.status === 'cancelled'
    ? <XCircle className="w-3.5 h-3.5 text-warning-400" />
    : <AlertCircle className="w-3.5 h-3.5 text-dark-400" />;

  return (
    <button
      onClick={() => onOpenWorkflow(lead, status)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/50 text-dark-300 hover:bg-dark-700/50 transition-colors text-sm"
    >
      {statusIcon}
      <span className="capitalize">{lastEnrollment?.status || 'View'}</span>
      {status.messagesSent > 0 && (
        <span className="text-xs text-dark-500">({status.messagesSent} sent)</span>
      )}
    </button>
  );
}

/**
 * WorkflowModal - Full workflow management for a lead
 */
function WorkflowModal({ isOpen, lead, initialStatus, onClose, onEnroll, onCancel, isLoading }) {
  const queryClient = useQueryClient();
  
  // Fetch fresh status when modal opens
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['leadSequenceStatus', lead?.id],
    queryFn: () => sequencesApi.getLeadSequenceStatus(lead.id),
    enabled: isOpen && !!lead?.id,
  });

  const status = statusData?.data || initialStatus;

  if (!isOpen) return null;

  const getSequenceInfo = (slug) => {
    const info = {
      new_lead: { name: 'New Lead Nurture', description: '18-day email sequence with value content', color: 'primary' },
      meeting_booked: { name: 'Meeting Booked', description: 'Confirmation + reminders before meeting', color: 'success' },
      no_show: { name: 'No Show', description: 'Rebooking + nurture sequence', color: 'warning' },
    };
    return info[slug] || { name: slug, description: '', color: 'dark' };
  };

  return (
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
        className="glass-card p-6 w-full max-w-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">Workflow Manager</h3>
            <p className="text-sm text-dark-400 mt-1">
              {lead?.first_name} {lead?.last_name} • {lead?.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-dark-400 mt-4">Loading workflow status...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Status Summary */}
            <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700">
              <h4 className="text-sm font-medium text-dark-300 mb-3">Current Status</h4>
              
              {!status?.enrolled ? (
                <div className="text-center py-4">
                  <AlertCircle className="w-10 h-10 text-dark-500 mx-auto mb-2" />
                  <p className="text-dark-300">Not enrolled in any workflow</p>
                  <p className="text-xs text-dark-500 mt-1">Start a workflow to begin automated follow-ups</p>
                </div>
              ) : status.activeSequence ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-success-400 font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {status.activeSequence.name}
                    </span>
                    <span className="text-sm text-dark-400">
                      Step {status.activeSequence.currentStep} of {status.activeSequence.totalSteps}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success-500 rounded-full transition-all"
                      style={{ width: `${status.activeSequence.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-dark-400 mt-2">
                    {status.messagesSent} messages sent • {status.activeSequence.progress}% complete
                  </p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <CheckCircle2 className="w-8 h-8 text-success-400 mx-auto mb-2" />
                  <p className="text-dark-300">Workflow completed</p>
                  <p className="text-xs text-dark-500 mt-1">{status.messagesSent} messages sent</p>
                </div>
              )}
            </div>

            {/* Enrollment History */}
            {status?.enrollments?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-dark-300 mb-3">History</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {status.enrollments.map((enrollment) => (
                    <div 
                      key={enrollment.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-dark-800/30 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {enrollment.status === 'active' && <Clock className="w-4 h-4 text-success-400" />}
                        {enrollment.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-success-400" />}
                        {enrollment.status === 'cancelled' && <XCircle className="w-4 h-4 text-warning-400" />}
                        <span className="text-dark-300">{enrollment.sequenceName}</span>
                      </div>
                      <span className="text-xs text-dark-500">
                        {enrollment.messagesSent} sent • Step {enrollment.currentStep}/{enrollment.totalSteps}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div>
              <h4 className="text-sm font-medium text-dark-300 mb-3">Actions</h4>
              
              {status?.activeSequence ? (
                // Active sequence - show cancel option
                <div className="space-y-2">
                  <p className="text-xs text-dark-500 mb-2">
                    The workflow will continue automatically. You can cancel it if needed.
                  </p>
                  <button
                    onClick={() => onCancel(status.activeSequence.slug)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-xl bg-warning-500/20 text-warning-400 hover:bg-warning-500/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Current Workflow
                  </button>
                </div>
              ) : (
                // No active sequence - show enrollment options
                <div className="space-y-2">
                  {['new_lead', 'meeting_booked', 'no_show'].map((slug) => {
                    const info = getSequenceInfo(slug);
                    const wasInSequence = status?.enrollments?.find(e => e.sequenceSlug === slug);
                    
                    return (
                      <button
                        key={slug}
                        onClick={() => onEnroll(slug)}
                        disabled={isLoading}
                        className={cn(
                          "w-full p-3 rounded-xl border transition-all flex items-start gap-3 text-left",
                          "bg-dark-800/50 border-dark-600 hover:border-primary-500 hover:bg-dark-800"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center mt-0.5",
                          info.color === 'primary' && "bg-primary-500/20 text-primary-400",
                          info.color === 'success' && "bg-success-500/20 text-success-400",
                          info.color === 'warning' && "bg-warning-500/20 text-warning-400",
                        )}>
                          {wasInSequence ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{info.name}</span>
                            {wasInSequence && (
                              <span className="text-xs px-2 py-0.5 rounded bg-dark-700 text-dark-400">
                                Re-enroll
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-dark-400 mt-0.5">{info.description}</p>
                          {wasInSequence && (
                            <p className="text-xs text-dark-500 mt-1">
                              Previously: {wasInSequence.messagesSent} messages sent, step {wasInSequence.currentStep}/{wasInSequence.totalSteps}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * ScoreCell - Shows priority score with color coding and advice button
 */
function ScoreCell({ score, onScore, onAdvice, isLoading }) {
  if (score === null || score === undefined || score === 0) {
    return (
      <div>
        <button
          onClick={onScore}
          disabled={isLoading}
          className="px-2 py-1 rounded-lg bg-dark-800/50 text-dark-400 hover:text-accent-400 hover:bg-accent-500/10 transition-colors text-xs flex items-center gap-1 disabled:opacity-60"
        >
          <Sparkles className="w-3 h-3" />
          {isLoading ? 'Scoring…' : 'Score'}
        </button>
        {isLoading && (
          <div className="mt-1 h-1 w-24 bg-dark-700 rounded overflow-hidden">
            <div className="h-1 w-2/3 bg-accent-500 animate-pulse" />
          </div>
        )}
        <button
          onClick={onAdvice}
          className="mt-2 block text-xs text-primary-400 hover:text-primary-300"
        >
          AI: more info
        </button>
      </div>
    );
  }

  // Color based on score
  const getScoreColor = (s) => {
    if (s >= 80) return 'text-success-400 bg-success-500/20 border-success-500/30';
    if (s >= 60) return 'text-primary-400 bg-primary-500/20 border-primary-500/30';
    if (s >= 40) return 'text-warning-400 bg-warning-500/20 border-warning-500/30';
    return 'text-dark-400 bg-dark-700/50 border-dark-600';
  };

  return (
    <button
      onClick={onAdvice}
      className={cn("px-2 py-1 rounded-lg text-sm font-bold border hover:scale-105 transition-transform", getScoreColor(score))}
      title="Click for AI advice on this lead"
    >
      {score}
    </button>
  );
}

/**
 * ManualSendModal - Send messages to selected leads
 */
function ManualSendModal({ isOpen, selectedLeads, leads, onClose }) {
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState('email');
  const [emailAccount, setEmailAccount] = useState('haarith');
  const [whatsappInstance, setWhatsappInstance] = useState('meta');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const selectedLeadData = leads.filter(l => selectedLeads.includes(l.id));

  const sendMutation = useMutation({
    mutationFn: (data) => leadsApi.manualSend(data),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries(['leads']);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send messages');
    }
  });

  const handleSend = () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    sendMutation.mutate({
      leadIds: selectedLeads,
      channel,
      emailAccount,
      whatsappInstance,
      subject,
      message
    });
  };

  if (!isOpen) return null;

  return (
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
        className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-primary-400" />
              Manual Send
            </h3>
            <p className="text-sm text-dark-400 mt-1">
              Send to {selectedLeads.length} selected lead{selectedLeads.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Leads Summary */}
        <div className="mb-6 p-3 rounded-xl bg-dark-800/50 border border-dark-700 max-h-32 overflow-y-auto">
          <p className="text-xs text-dark-400 mb-2">Recipients:</p>
          <div className="flex flex-wrap gap-2">
            {selectedLeadData.map(lead => (
              <span key={lead.id} className="px-2 py-1 rounded bg-dark-700 text-xs text-dark-300">
                {lead.first_name} {lead.last_name}
                {lead.score > 0 && <span className="ml-1 text-accent-400">({lead.score})</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Channel Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-dark-300 mb-2">Channel</label>
          <div className="flex gap-2">
            {['email', 'whatsapp', 'both'].map(ch => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={cn(
                  "px-4 py-2 rounded-lg capitalize transition-all",
                  channel === ch
                    ? "bg-primary-500 text-white"
                    : "bg-dark-800/50 text-dark-300 hover:text-white"
                )}
              >
                {ch === 'both' ? 'Both' : ch}
              </button>
            ))}
          </div>
        </div>

        {/* Email Account Selection */}
        {(channel === 'email' || channel === 'both') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-300 mb-2">Send Email From</label>
            <div className="flex gap-2">
              <button
                onClick={() => setEmailAccount('haarith')}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all flex-1",
                  emailAccount === 'haarith'
                    ? "bg-primary-500 text-white"
                    : "bg-dark-800/50 text-dark-300 hover:text-white"
                )}
              >
                haarith@structurelogistics.com
              </button>
              <button
                onClick={() => setEmailAccount('sales')}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all flex-1",
                  emailAccount === 'sales'
                    ? "bg-primary-500 text-white"
                    : "bg-dark-800/50 text-dark-300 hover:text-white"
                )}
              >
                sales@structurelogistics.com
              </button>
            </div>
          </div>
        )}

        {/* WhatsApp Instance Selection */}
        {(channel === 'whatsapp' || channel === 'both') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-300 mb-2">Send WhatsApp From</label>
            <div className="flex gap-2">
              <button
                onClick={() => setWhatsappInstance('haarith')}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all flex-1",
                  whatsappInstance === 'haarith'
                    ? "bg-success-500 text-white"
                    : "bg-dark-800/50 text-dark-300 hover:text-white"
                )}
              >
                Haarith (+971)
              </button>
              <button
                onClick={() => setWhatsappInstance('meta')}
                className={cn(
                  "px-4 py-2 rounded-lg transition-all flex-1",
                  whatsappInstance === 'meta'
                    ? "bg-success-500 text-white"
                    : "bg-dark-800/50 text-dark-300 hover:text-white"
                )}
              >
                Meta (+44)
              </button>
            </div>
          </div>
        )}

        {/* Subject (for email) */}
        {(channel === 'email' || channel === 'both') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-dark-300 mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject (use {{first_name}} for personalization)"
              className="input-field"
            />
          </div>
        )}

        {/* Message */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-dark-300 mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Your message (use {{first_name}}, {{company}} for personalization)"
            rows={6}
            className="input-field resize-none"
          />
          <p className="text-xs text-dark-500 mt-1">
            Variables: {'{{first_name}}'}, {'{{last_name}}'}, {'{{company}}'}, {'{{name}}'}
          </p>
        </div>

        {/* Send Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-dark-800/50 text-dark-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sendMutation.isLoading || !message.trim()}
            className="px-6 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {sendMutation.isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to {selectedLeads.length} leads
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * AdviceModal - AI-powered advice for approaching a lead
 */
function AdviceModal({ isOpen, leadId, onClose }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leadAdvice', leadId],
    queryFn: () => leadsApi.getAdvice(leadId),
    enabled: isOpen && !!leadId,
  });

  if (!isOpen) return null;

  const advice = data?.data;

  return (
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
        className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-accent-400" />
              AI Sales Advice
            </h3>
            {advice && (
              <p className="text-sm text-dark-400 mt-1">
                {advice.name} • {advice.company || 'Unknown Company'} • Score: <span className="text-accent-400 font-bold">{advice.score}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="w-10 h-10 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-dark-400">Analyzing lead...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-danger-400">
            <p>Failed to get advice. Please try again.</p>
          </div>
        ) : advice ? (
          <div className="space-y-6">
            {/* Assessment */}
            <div className="p-4 rounded-xl bg-accent-500/10 border border-accent-500/30">
              <h4 className="text-sm font-semibold text-accent-300 mb-2">Assessment</h4>
              <p className="text-dark-200">{advice.assessment}</p>
            </div>

            {/* Talking Points */}
            {advice.talkingPoints && advice.talkingPoints.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-dark-300 mb-3">Key Talking Points</h4>
                <ul className="space-y-2">
                  {advice.talkingPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 p-3 rounded-lg bg-dark-800/50">
                      <CheckCircle2 className="w-5 h-5 text-success-400 mt-0.5 shrink-0" />
                      <span className="text-dark-200">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Potential Objections */}
            {advice.objections && advice.objections.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-dark-300 mb-3">Prepare For These Objections</h4>
                <ul className="space-y-2">
                  {advice.objections.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 p-3 rounded-lg bg-warning-500/10 border border-warning-500/20">
                      <AlertCircle className="w-5 h-5 text-warning-400 mt-0.5 shrink-0" />
                      <span className="text-dark-200">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Opening Line */}
            {advice.openingLine && (
              <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/30">
                <h4 className="text-sm font-semibold text-primary-300 mb-2">Suggested Opening</h4>
                <p className="text-dark-200 italic">"{advice.openingLine}"</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(advice.openingLine);
                    toast.success('Copied to clipboard!');
                  }}
                  className="mt-2 text-xs text-primary-400 hover:text-primary-300"
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

export default Leads;
