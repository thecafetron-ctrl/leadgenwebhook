/**
 * Main Application Component
 * 
 * Handles routing and main layout structure.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Evolution from './pages/Evolution';
import WebhookLogs from './pages/WebhookLogs';
import Playground from './pages/Playground';
import Sequences from './pages/Sequences';
import EbookLandingPage from './pages/EbookLandingPage';

function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        {/* Standalone landing page - no header/nav, accessible only via direct URL */}
        <Route path="/ebook" element={<EbookLandingPage />} />
        
        {/* Main app routes with Layout (header/sidebar) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="sequences" element={<Sequences />} />
          <Route path="evolution" element={<Evolution />} />
          <Route path="webhooks" element={<WebhookLogs />} />
          <Route path="playground" element={<Playground />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default App;
