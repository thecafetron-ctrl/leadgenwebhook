/**
 * Main Layout Component
 * 
 * Provides the overall structure with sidebar and main content area.
 */

import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppStore } from '../lib/store';
import { cn } from '../lib/utils';

function Layout() {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      {/* Grid background pattern */}
      <div className="fixed inset-0 bg-grid-pattern opacity-50 pointer-events-none" />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div 
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-20"
        )}
      >
        <Header />
        
        <main className="flex-1 overflow-auto p-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-[1800px] mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
