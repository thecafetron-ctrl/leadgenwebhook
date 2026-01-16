/**
 * Evolution API Integration Page
 * 
 * WhatsApp messaging management via Evolution API
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  ExternalLink, 
  QrCode, 
  Users, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
  Zap,
  Globe,
  Shield,
  Copy,
  Check,
  Rocket
} from 'lucide-react';
import { cn } from '../lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// Evolution API URL - set this to your deployed Evolution API URL
const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL || null;
const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || 'evo_api_key_secure_2026';

function Evolution() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  // Check API status
  useEffect(() => {
    if (EVOLUTION_API_URL) {
      checkApiStatus();
    } else {
      setApiStatus('not_configured');
      setLoading(false);
    }
  }, []);

  const checkApiStatus = async () => {
    if (!EVOLUTION_API_URL) {
      setApiStatus('not_configured');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(EVOLUTION_API_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setApiStatus('online');
        fetchInstances();
      } else {
        setApiStatus('offline');
      }
    } catch (error) {
      setApiStatus('offline');
    }
    setLoading(false);
  };

  const fetchInstances = async () => {
    if (!EVOLUTION_API_URL) return;
    
    try {
      const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        headers: { 
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInstances(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch instances:', error);
    }
  };

  const openManager = () => {
    if (EVOLUTION_API_URL) {
      window.open(`${EVOLUTION_API_URL}/manager`, '_blank');
    } else {
      window.open('https://doc.evolution-api.com', '_blank');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const features = [
    {
      icon: MessageSquare,
      title: 'Send Messages',
      description: 'Send text, images, videos, and documents via WhatsApp'
    },
    {
      icon: Users,
      title: 'Manage Contacts',
      description: 'Access and manage your WhatsApp contacts'
    },
    {
      icon: Zap,
      title: 'Webhooks',
      description: 'Receive real-time notifications for incoming messages'
    },
    {
      icon: Shield,
      title: 'Multi-Instance',
      description: 'Manage multiple WhatsApp connections simultaneously'
    }
  ];

  // If Evolution API URL is not configured, show setup instructions
  if (!EVOLUTION_API_URL) {
    return (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header Banner */}
        <motion.div 
          variants={item}
          className="glass-card gradient-border p-6 overflow-hidden relative"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Evolution API</h2>
                <p className="text-dark-400 text-sm">WhatsApp Business Integration</p>
              </div>
            </div>
            <p className="text-dark-300 max-w-2xl">
              Connect your WhatsApp Business account to send messages, receive webhooks, 
              and automate your customer communication workflows.
            </p>
          </div>
          <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full blur-3xl" />
        </motion.div>

        {/* Setup Card */}
        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Deploy Evolution API</h3>
          </div>
          
          <p className="text-dark-300 mb-6">
            Evolution API needs to be deployed as a separate service. Add it to your Railway project:
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-dark-300">1. Add New Service in Railway</span>
              </div>
              <p className="text-sm text-dark-400">
                Click "+ New" → "GitHub Repo" → Select your repo → Set Root Directory to <code className="text-primary-400">evolution-api</code>
              </p>
            </div>

            <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-dark-300">2. Your API Key</span>
                <button 
                  onClick={() => copyToClipboard(EVOLUTION_API_KEY, 'apikey')}
                  className="text-dark-400 hover:text-white transition-colors"
                >
                  {copied === 'apikey' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <code className="text-primary-400 font-mono text-sm">{EVOLUTION_API_KEY}</code>
            </div>

            <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-dark-300">3. After Deployment</span>
              </div>
              <p className="text-sm text-dark-400">
                Add <code className="text-primary-400">VITE_EVOLUTION_API_URL</code> to your frontend service with your Evolution API URL
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <a
              href="https://railway.app/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-4 h-4" />
              Open Railway
            </a>
            <a
              href="https://doc.evolution-api.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-dark-700 text-white font-medium hover:bg-dark-600 transition-colors"
            >
              <Globe className="w-4 h-4" />
              Documentation
            </a>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div variants={item}>
          <h3 className="font-semibold text-white mb-4">What you'll be able to do</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={item}
                  className="glass-card p-5"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-medium text-white mb-1">{feature.title}</h4>
                  <p className="text-sm text-dark-400">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // If Evolution API URL IS configured, show the full interface
  const quickActions = [
    {
      title: 'Open Manager',
      description: 'Access the full Evolution API control panel',
      icon: Settings,
      color: 'primary',
      action: openManager
    },
    {
      title: 'Create Instance',
      description: 'Set up a new WhatsApp connection',
      icon: QrCode,
      color: 'accent',
      action: () => window.open(`${EVOLUTION_API_URL}/manager`, '_blank')
    },
    {
      title: 'API Documentation',
      description: 'View Evolution API documentation',
      icon: Globe,
      color: 'success',
      action: () => window.open('https://doc.evolution-api.com', '_blank')
    }
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header Banner */}
      <motion.div 
        variants={item}
        className="glass-card gradient-border p-6 overflow-hidden relative"
      >
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Evolution API</h2>
                <p className="text-dark-400 text-sm">WhatsApp Business Integration</p>
              </div>
            </div>
            <p className="text-dark-300 max-w-xl mt-3">
              Connect your WhatsApp Business account to send messages, receive webhooks, 
              and automate your customer communication workflows.
            </p>
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl",
              apiStatus === 'online' 
                ? "bg-success-500/20 text-success-400" 
                : apiStatus === 'offline'
                ? "bg-danger-500/20 text-danger-400"
                : "bg-warning-500/20 text-warning-400"
            )}>
              {apiStatus === 'checking' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : apiStatus === 'online' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="font-medium text-sm">
                {apiStatus === 'checking' ? 'Checking...' : 
                 apiStatus === 'online' ? 'API Online' : 'API Offline'}
              </span>
            </div>
            
            <button
              onClick={openManager}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium hover:opacity-90 transition-opacity shadow-lg"
            >
              <ExternalLink className="w-4 h-4" />
              Open Manager
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full blur-3xl" />
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.title}
              variants={item}
              onClick={action.action}
              className={cn(
                "glass-card p-5 text-left hover:border-primary-500/30 transition-all group",
                "hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  action.color === 'primary' && "bg-primary-500/20 text-primary-400 group-hover:bg-primary-500/30",
                  action.color === 'accent' && "bg-accent-500/20 text-accent-400 group-hover:bg-accent-500/30",
                  action.color === 'success' && "bg-success-500/20 text-success-400 group-hover:bg-success-500/30"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-primary-300 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-dark-400 mt-1">{action.description}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-dark-500 group-hover:text-primary-400 transition-colors" />
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Instances Preview */}
      {instances.length > 0 && (
        <motion.div variants={item} className="glass-card overflow-hidden">
          <div className="p-4 border-b border-dark-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="font-semibold text-white">Connected Instances</h3>
            </div>
            <button 
              onClick={fetchInstances}
              className="text-dark-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          <div className="divide-y divide-dark-700/50">
            {instances.map((instance) => (
              <div 
                key={instance.instanceName || instance.name} 
                className="p-4 hover:bg-dark-800/30 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    instance.connectionStatus === 'open' 
                      ? "bg-success-500/20 text-success-400"
                      : "bg-warning-500/20 text-warning-400"
                  )}>
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {instance.instanceName || instance.name}
                    </p>
                    <p className="text-sm text-dark-400">
                      {instance.owner || instance.number || 'Not connected'}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "badge",
                  instance.connectionStatus === 'open' 
                    ? "bg-success-500/20 text-success-400"
                    : "bg-warning-500/20 text-warning-400"
                )}>
                  {instance.connectionStatus || 'disconnected'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Features Grid */}
      <motion.div variants={item}>
        <h3 className="font-semibold text-white mb-4">What you can do</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={item}
                className="glass-card p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400 mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-medium text-white mb-1">{feature.title}</h4>
                <p className="text-sm text-dark-400">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* API Info Card */}
      <motion.div variants={item} className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4">API Connection Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-dark-800/30 rounded-xl">
            <p className="text-sm text-dark-400 mb-1">API Endpoint</p>
            <code className="text-primary-400 font-mono text-sm">{EVOLUTION_API_URL}</code>
          </div>
          <div className="p-4 bg-dark-800/30 rounded-xl">
            <p className="text-sm text-dark-400 mb-1">Manager URL</p>
            <code className="text-primary-400 font-mono text-sm">{EVOLUTION_API_URL}/manager</code>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-dark-800/30 rounded-xl border border-dark-700/50">
          <p className="text-sm text-dark-300">
            <strong className="text-white">Pro tip:</strong> Use the Manager to create WhatsApp instances, 
            scan QR codes, and configure webhooks. Then integrate with your lead pipeline to automate 
            WhatsApp messages when new leads come in.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Evolution;
