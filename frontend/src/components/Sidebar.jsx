/**
 * Sidebar Navigation Component
 */

import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Webhook, 
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Zap,
  Mail,
  MessageSquare,
  Settings,
  HelpCircle
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { cn } from '../lib/utils';

const mainNavItems = [
  { 
    path: '/', 
    icon: LayoutDashboard, 
    label: 'Dashboard',
    description: 'Overview & stats'
  },
  { 
    path: '/leads', 
    icon: Users, 
    label: 'Leads',
    description: 'Manage contacts'
  },
  { 
    path: '/evolution', 
    icon: MessageSquare, 
    label: 'Evolution API',
    description: 'WhatsApp messaging'
  },
  { 
    path: '/webhooks', 
    icon: Webhook, 
    label: 'Webhook Logs',
    description: 'View incoming data'
  },
  { 
    path: '/playground', 
    icon: FlaskConical, 
    label: 'Testing Playground',
    description: 'Test integrations'
  }
];

const futureNavItems = [
  { 
    icon: Mail, 
    label: 'Email Campaigns',
    description: 'Coming soon',
    disabled: true
  },
  { 
    icon: Zap, 
    label: 'Automations',
    description: 'Coming soon',
    disabled: true
  }
];

function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 256 : 80 }}
      className={cn(
        "fixed left-0 top-0 h-screen z-40",
        "bg-dark-900/80 backdrop-blur-xl border-r border-dark-700/50",
        "flex flex-col"
      )}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center px-4 border-b border-dark-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg glow-primary">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col"
              >
                <span className="font-semibold text-white text-lg tracking-tight">LeadPipe</span>
                <span className="text-[10px] text-dark-400 uppercase tracking-wider">Dashboard</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="mb-4">
          {sidebarOpen && (
            <span className="px-3 text-[10px] font-semibold text-dark-400 uppercase tracking-wider">
              Main Menu
            </span>
          )}
        </div>
        
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary-500/20 text-primary-300" 
                  : "text-dark-300 hover:bg-dark-800/50 hover:text-white"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full"
                />
              )}
              
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                isActive 
                  ? "bg-primary-500/20" 
                  : "bg-dark-800/50 group-hover:bg-dark-700/50"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col"
                  >
                    <span className="font-medium text-sm">{item.label}</span>
                    <span className="text-[10px] text-dark-500">{item.description}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}

        {/* Future Features Section */}
        <div className="pt-6 mt-6 border-t border-dark-700/50">
          {sidebarOpen && (
            <span className="px-3 text-[10px] font-semibold text-dark-400 uppercase tracking-wider">
              Coming Soon
            </span>
          )}
          
          <div className="mt-3 space-y-1">
            {futureNavItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                    "text-dark-500 cursor-not-allowed opacity-60"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-dark-800/30">
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col"
                      >
                        <span className="font-medium text-sm">{item.label}</span>
                        <span className="text-[10px] text-dark-600">{item.description}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-dark-700/50 space-y-1">
        <button className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full",
          "text-dark-400 hover:bg-dark-800/50 hover:text-white transition-colors"
        )}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-dark-800/50">
            <Settings className="w-5 h-5" />
          </div>
          {sidebarOpen && <span className="font-medium text-sm">Settings</span>}
        </button>
        
        <button className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full",
          "text-dark-400 hover:bg-dark-800/50 hover:text-white transition-colors"
        )}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-dark-800/50">
            <HelpCircle className="w-5 h-5" />
          </div>
          {sidebarOpen && <span className="font-medium text-sm">Help & Docs</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "absolute -right-3 top-20 w-6 h-6 rounded-full",
          "bg-dark-800 border border-dark-600 text-dark-400",
          "flex items-center justify-center hover:text-white hover:border-primary-500",
          "transition-all duration-200 z-50"
        )}
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </motion.aside>
  );
}

export default Sidebar;
