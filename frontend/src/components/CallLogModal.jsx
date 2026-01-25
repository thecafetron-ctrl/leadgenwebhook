/**
 * Call Logging Modal Component
 * 
 * Quick popup to log a call with keyboard shortcuts
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { Phone, CheckCircle2, XCircle, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../lib/api';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

function CallLogModal({ lead, onClose, isOpen = true }) {
  const queryClient = useQueryClient();

  if (!isOpen || !lead) return null;

  const logCallMutation = useMutation({
    mutationFn: ({ id, outcome }) => leadsApi.logCall(id, outcome),
    onSuccess: (data, variables) => {
      toast.success(`Call logged: ${variables.outcome === 'answered' ? 'Answered' : 'Unanswered'}`);
      queryClient.invalidateQueries(['leads']);
      queryClient.invalidateQueries(['leadActivities', variables.id]);
      queryClient.invalidateQueries(['leadCallCount', variables.id]);
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to log call');
    }
  });

  const handleLogCall = (outcome) => {
    if (!lead) return;
    logCallMutation.mutate({ id: lead.id, outcome });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '1') {
        e.preventDefault();
        handleLogCall('answered');
      } else if (e.key === '2') {
        e.preventDefault();
        handleLogCall('unanswered');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [lead]);

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
          className="glass-card w-full max-w-md p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Phone className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Log Call</h2>
                <p className="text-sm text-dark-400">
                  {lead.first_name} {lead.last_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <p className="text-sm text-dark-300 mb-2">
              Press <kbd className="px-2 py-1 rounded bg-dark-700 text-white text-xs font-mono">1</kbd> for Answered
            </p>
            <p className="text-sm text-dark-300">
              Press <kbd className="px-2 py-1 rounded bg-dark-700 text-white text-xs font-mono">2</kbd> for Unanswered
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleLogCall('answered')}
              disabled={logCallMutation.isLoading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all",
                "bg-success-500/20 text-success-400 border border-success-500/30",
                "hover:bg-success-500/30 hover:border-success-500/50",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <CheckCircle2 className="w-5 h-5" />
              Answered
              <kbd className="ml-auto px-2 py-1 rounded bg-dark-700 text-xs font-mono">1</kbd>
            </button>
            <button
              onClick={() => handleLogCall('unanswered')}
              disabled={logCallMutation.isLoading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all",
                "bg-danger-500/20 text-danger-400 border border-danger-500/30",
                "hover:bg-danger-500/30 hover:border-danger-500/50",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <XCircle className="w-5 h-5" />
              Unanswered
              <kbd className="ml-auto px-2 py-1 rounded bg-dark-700 text-xs font-mono">2</kbd>
            </button>
          </div>

          {/* Loading state */}
          {logCallMutation.isLoading && (
            <div className="mt-4 text-center text-sm text-dark-400">
              Logging call...
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CallLogModal;
