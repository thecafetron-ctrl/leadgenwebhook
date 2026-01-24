/**
 * Dashboard Page
 * 
 * Main overview with statistics, recent leads, and webhook activity.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Webhook, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Activity
} from 'lucide-react';
import { leadsApi, webhooksApi } from '../lib/api';
import { 
  cn, 
  formatRelativeTime, 
  getFullName, 
  getStatusColor, 
  formatSource,
  getSourceColor,
  getWebhookStatusColor 
} from '../lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function Dashboard() {
  // Fetch lead stats
  const { data: leadStats, refetch: refetchLeadStats } = useQuery({
    queryKey: ['leadStats'],
    queryFn: leadsApi.getStats,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch webhook stats
  const { data: webhookStats, refetch: refetchWebhookStats } = useQuery({
    queryKey: ['webhookStats'],
    queryFn: webhooksApi.getStats,
    refetchInterval: 10000
  });

  // Fetch recent leads
  const { data: recentLeads, refetch: refetchLeads } = useQuery({
    queryKey: ['recentLeads'],
    queryFn: () => leadsApi.getLeads({ limit: 5, sortBy: 'created_at', sortOrder: 'DESC' }),
    refetchInterval: 10000
  });

  // Fetch recent webhooks
  const { data: recentWebhooks, refetch: refetchWebhooks } = useQuery({
    queryKey: ['recentWebhooks'],
    queryFn: () => webhooksApi.getRecentLogs(5),
    refetchInterval: 10000
  });

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refetchLeadStats();
      refetchWebhookStats();
      refetchLeads();
      refetchWebhooks();
    };
    window.addEventListener('refresh-data', handleRefresh);
    return () => window.removeEventListener('refresh-data', handleRefresh);
  }, [refetchLeadStats, refetchWebhookStats, refetchLeads, refetchWebhooks]);

  const stats = leadStats?.data || {};
  const webhookData = webhookStats?.data || {};
  const leads = recentLeads?.data || [];
  const webhooks = recentWebhooks?.data || [];

  const statCards = [
    {
      title: 'Total Leads',
      value: stats.total || 0,
      change: `+${stats.todayCount || 0} today`,
      icon: Users,
      color: 'primary',
      trend: 'up'
    },
    {
      title: 'New Leads',
      value: stats.byStatus?.new || 0,
      change: 'Awaiting contact',
      icon: Sparkles,
      color: 'accent',
      trend: 'neutral'
    },
    {
      title: 'Converted',
      value: stats.byStatus?.converted || 0,
      change: `${stats.total ? Math.round((stats.byStatus?.converted || 0) / stats.total * 100) : 0}% rate`,
      icon: CheckCircle2,
      color: 'success',
      trend: 'up'
    },
    {
      title: 'Webhooks (24h)',
      value: webhookData.last24Hours || 0,
      change: `${webhookData.failedLast24Hours || 0} failed`,
      icon: Webhook,
      color: webhookData.failedLast24Hours > 0 ? 'warning' : 'primary',
      trend: webhookData.failedLast24Hours > 0 ? 'warning' : 'neutral'
    }
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Welcome Banner */}
      <motion.div 
        variants={item}
        className="glass-card gradient-border p-6 overflow-hidden relative"
      >
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to Lead Pipeline
          </h2>
          <p className="text-dark-300 max-w-2xl">
            Your centralized dashboard for managing leads and testing webhook integrations. 
            Monitor incoming leads, view webhook activity, and test your automation workflows.
          </p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-primary-500/10 to-accent-500/10 rounded-full blur-3xl" />
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              variants={item}
              className="glass-card p-5 hover:border-primary-500/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-dark-400 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value.toLocaleString()}</p>
                  <p className={cn(
                    "text-xs mt-2 flex items-center gap-1",
                    stat.trend === 'up' && "text-success-400",
                    stat.trend === 'warning' && "text-warning-400",
                    stat.trend === 'neutral' && "text-dark-400"
                  )}>
                    {stat.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                    {stat.trend === 'warning' && <AlertTriangle className="w-3 h-3" />}
                    {stat.change}
                  </p>
                </div>
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  stat.color === 'primary' && "bg-primary-500/20 text-primary-400",
                  stat.color === 'accent' && "bg-accent-500/20 text-accent-400",
                  stat.color === 'success' && "bg-success-500/20 text-success-400",
                  stat.color === 'warning' && "bg-warning-500/20 text-warning-400"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <motion.div variants={item} className="glass-card overflow-hidden">
          <div className="p-4 border-b border-dark-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary-400" />
              </div>
              <h3 className="font-semibold text-white">Recent Leads</h3>
            </div>
            <Link 
              to="/leads" 
              className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="divide-y divide-dark-700/50">
            {leads.length === 0 ? (
              <div className="p-8 text-center text-dark-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No leads yet</p>
                <p className="text-sm mt-1">Leads will appear here as they come in</p>
              </div>
            ) : (
              leads.map((lead) => (
                <div 
                  key={lead.id} 
                  className="p-4 hover:bg-dark-800/30 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center text-white font-medium text-sm">
                      {getFullName(lead.first_name, lead.last_name).charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {getFullName(lead.first_name, lead.last_name)}
                      </p>
                      <p className="text-sm text-dark-400">{lead.email || 'No email'}</p>
                      <p className="text-xs text-dark-300">
                        {lead.lead_type || lead.custom_fields?.campaign_type
                          ? `Type: ${(lead.lead_type || lead.custom_fields?.campaign_type)}`
                          : 'Type: —'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("badge", getStatusColor(lead.status))}>
                      {lead.status}
                    </span>
                    <span className="text-xs text-dark-500">
                      {formatRelativeTime(lead.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Webhooks */}
        <motion.div variants={item} className="glass-card overflow-hidden">
          <div className="p-4 border-b border-dark-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-accent-400" />
              </div>
              <h3 className="font-semibold text-white">Webhook Activity</h3>
            </div>
            <Link 
              to="/webhooks" 
              className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="divide-y divide-dark-700/50">
            {webhooks.length === 0 ? (
              <div className="p-8 text-center text-dark-400">
                <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No webhook activity</p>
                <p className="text-sm mt-1">Incoming webhooks will appear here</p>
              </div>
            ) : (
              webhooks.map((webhook) => (
                <div 
                  key={webhook.id} 
                  className="p-4 hover:bg-dark-800/30 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      webhook.status === 'processed' ? "bg-success-500/20 text-success-400" : 
                      webhook.status === 'failed' ? "bg-danger-500/20 text-danger-400" :
                      "bg-warning-500/20 text-warning-400"
                    )}>
                      {webhook.status === 'processed' ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : webhook.status === 'failed' ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {formatSource(webhook.source)}
                      </p>
                      <p className="text-sm text-dark-400 font-mono">
                        {webhook.endpoint}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("badge", getWebhookStatusColor(webhook.status))}>
                      {webhook.status}
                    </span>
                    <span className="text-xs text-dark-500">
                      {formatRelativeTime(webhook.received_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Source Distribution */}
      <motion.div variants={item} className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4">Lead Sources</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.entries(stats.bySource || {}).map(([source, count]) => (
            <div 
              key={source}
              className="p-4 bg-dark-800/30 rounded-xl text-center"
            >
              <span className={cn("badge mb-2", getSourceColor(source))}>
                {formatSource(source)}
              </span>
              <p className="text-2xl font-bold text-white mt-2">{count}</p>
              <p className="text-xs text-dark-400">leads</p>
            </div>
          ))}
          {Object.keys(stats.bySource || {}).length === 0 && (
            <p className="text-dark-400 col-span-full text-center py-4">
              No lead data yet
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Dashboard;
