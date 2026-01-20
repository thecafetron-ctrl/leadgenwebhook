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
  UserCheck
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
                    <option value="">All Priorities</option>
                    {PRIORITIES.map(priority => (
                      <option key={priority} value={priority} className="capitalize">
                        {priority}
                      </option>
                    ))}
                  </select>
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
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortBy === 'status' && (sortOrder === 'ASC' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
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
                    <td className="p-4"><div className="skeleton w-20 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-24 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-24 h-6 rounded" /></td>
                    <td className="p-4"><div className="skeleton w-20 h-6 rounded" /></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-dark-400">
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
                      <span className={cn("badge", getSourceColor(lead.source))}>
                        {formatSource(lead.source)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn("badge", getStatusColor(lead.status))}>
                        {lead.status}
                      </span>
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

export default Leads;
