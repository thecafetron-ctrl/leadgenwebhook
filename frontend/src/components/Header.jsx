/**
 * Header Component
 * 
 * Top navigation bar with search, notifications, and user info.
 */

import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  Bell, 
  RefreshCw, 
  Circle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../lib/api';
import { cn, formatRelativeTime } from '../lib/utils';
import { useAppStore } from '../lib/store';

const pageTitles = {
  '/': 'Dashboard',
  '/leads': 'Lead Management',
  '/webhooks': 'Webhook Logs',
  '/playground': 'Testing Playground'
};

function Header() {
  const location = useLocation();
  const { lastRefresh, setLastRefresh } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Health check query
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
    refetchInterval: 30000 // Check every 30 seconds
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastRefresh();
    // Trigger window event for components to refresh
    window.dispatchEvent(new CustomEvent('refresh-data'));
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const apiStatus = healthData?.success ? 'connected' : healthLoading ? 'checking' : 'disconnected';

  return (
    <header className="h-16 bg-dark-900/50 backdrop-blur-xl border-b border-dark-700/50 px-6 flex items-center justify-between">
      {/* Left Section - Page Title */}
      <div className="flex items-center gap-4">
        <motion.h1 
          key={location.pathname}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-semibold text-white"
        >
          {pageTitles[location.pathname] || 'Dashboard'}
        </motion.h1>
        
        {/* API Status Indicator */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
          apiStatus === 'connected' && "bg-success-500/20 text-success-400 border border-success-500/30",
          apiStatus === 'checking' && "bg-warning-500/20 text-warning-400 border border-warning-500/30",
          apiStatus === 'disconnected' && "bg-danger-500/20 text-danger-400 border border-danger-500/30"
        )}>
          {apiStatus === 'connected' ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : apiStatus === 'checking' ? (
            <Circle className="w-3.5 h-3.5 animate-pulse" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          <span className="capitalize">{apiStatus}</span>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search..."
            className={cn(
              "w-64 pl-10 pr-4 py-2 bg-dark-800/50 border border-dark-600 rounded-xl",
              "text-sm text-dark-100 placeholder-dark-400",
              "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500",
              "transition-all duration-200"
            )}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-dark-500 bg-dark-700 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            "p-2.5 rounded-xl bg-dark-800/50 border border-dark-600",
            "text-dark-400 hover:text-white hover:border-primary-500",
            "transition-all duration-200",
            isRefreshing && "pointer-events-none"
          )}
          title={lastRefresh ? `Last refreshed ${formatRelativeTime(lastRefresh)}` : 'Refresh data'}
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
        </button>

        {/* Notifications */}
        <button className={cn(
          "p-2.5 rounded-xl bg-dark-800/50 border border-dark-600",
          "text-dark-400 hover:text-white hover:border-primary-500",
          "transition-all duration-200 relative"
        )}>
          <Bell className="w-4 h-4" />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-4 border-l border-dark-700">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold text-sm">
            LP
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-sm font-medium text-white">Lead Pipeline</span>
            <span className="text-[10px] text-dark-400">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
