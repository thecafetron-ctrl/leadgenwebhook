/**
 * Lead Pipeline Platform - Backend Server
 * 
 * Express.js server providing:
 * - RESTful API for lead management
 * - Webhook endpoints for external integrations
 * - Real-time statistics and logging
 * - Static file serving for frontend (production)
 * 
 * Environment Variables:
 * - PORT: Server port (default: 3002)
 * - NODE_ENV: Environment (development/production)
 * - FRONTEND_URL: Frontend URL for CORS
 * - WEBHOOK_SECRET: Secret for webhook validation
 * - META_APP_SECRET: Meta/Facebook app secret
 * - CALCOM_WEBHOOK_SECRET: Cal.com webhook secret
 * 
 * Webhook Endpoints (Railway):
 * - POST https://leadgenwebhook-production.up.railway.app/api/webhooks/meta
 * - POST https://leadgenwebhook-production.up.railway.app/api/webhooks/calcom
 * - POST https://leadgenwebhook-production.up.railway.app/api/webhooks/test
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Import database
import { initDatabase, closeDatabase } from './database/connection.js';
import { migrate } from './database/migrate.js';

// Import services
import { initEmailService } from './services/emailService.js';

// Import routes
import leadRoutes from './routes/leads.js';
import webhookRoutes from './routes/webhooks.js';
import emailRoutes from './routes/email.js';
import sequenceRoutes from './routes/sequences.js';

// Import sequence service for scheduler
import { processMessageQueue } from './services/sequenceService.js';
import { initWhatsAppService } from './services/whatsappService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const isDev = process.env.NODE_ENV !== 'production';

// Frontend dist path (for production)
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: isDev ? false : undefined
}));

// CORS configuration
const corsOptions = {
  origin: isDev 
    ? ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173']
    : [
        'https://leadgenwebhook-production.up.railway.app',
        'https://leadgenwebhook.up.railway.app',
        process.env.FRONTEND_URL
      ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Secret']
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 100, // Limit each IP
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  }
});

// Apply rate limiting to API routes (except webhooks)
app.use('/api/leads', apiLimiter);

// Webhook-specific rate limiting (more permissive)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDev ? 500 : 60,
  message: {
    success: false,
    error: 'Too many webhook requests'
  }
});
app.use('/api/webhooks', webhookLimiter);

// Request logging in development
if (isDev) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
  });
}

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Lead Pipeline API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Lead Pipeline Platform API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      leads: {
        list: 'GET /api/leads',
        stats: 'GET /api/leads/stats',
        get: 'GET /api/leads/:id',
        activities: 'GET /api/leads/:id/activities',
        create: 'POST /api/leads',
        update: 'PUT /api/leads/:id',
        delete: 'DELETE /api/leads/:id',
        bulkUpdate: 'POST /api/leads/bulk/update',
        bulkDelete: 'POST /api/leads/bulk/delete'
      },
      webhooks: {
        logs: 'GET /api/webhooks/logs',
        recentLogs: 'GET /api/webhooks/logs/recent',
        stats: 'GET /api/webhooks/stats',
        logById: 'GET /api/webhooks/logs/:id',
        meta: 'POST /api/webhooks/meta',
        calcom: 'POST /api/webhooks/calcom',
        test: 'POST /api/webhooks/test',
        simulate: 'POST /api/webhooks/simulate/:type'
      }
    },
    documentation: {
      webhookIntegration: {
        meta: 'Set up Meta Instant Forms to POST to /api/webhooks/meta',
        calcom: 'Set up Cal.com webhook to POST to /api/webhooks/calcom',
        custom: 'Use /api/webhooks/test for custom integrations'
      }
    }
  });
});

// Mount routes
app.use('/api/leads', leadRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/sequences', sequenceRoutes);

// ============================================
// LEGAL PAGES
// ============================================

// Privacy Policy page (required for Meta/Facebook apps)
app.get('/privacy', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Lead Pipeline Platform</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #e2e8f0;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { 
      font-size: 2.5rem; 
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; color: #f1f5f9; }
    p { margin-bottom: 1rem; color: #94a3b8; }
    ul { margin-left: 1.5rem; margin-bottom: 1rem; color: #94a3b8; }
    li { margin-bottom: 0.5rem; }
    .card {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 1rem;
      padding: 2rem;
      margin-top: 2rem;
    }
    .updated { 
      font-size: 0.875rem; 
      color: #64748b; 
      margin-bottom: 2rem;
    }
    a { color: #818cf8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    
    <div class="card">
      <h2>1. Information We Collect</h2>
      <p>We collect information you provide directly to us, including:</p>
      <ul>
        <li>Contact information (name, email address, phone number)</li>
        <li>Business information (company name, job title)</li>
        <li>Form submission data from lead generation forms</li>
        <li>Calendar booking information</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Process and respond to your inquiries</li>
        <li>Send you relevant communications and follow-ups</li>
        <li>Schedule and manage appointments</li>
        <li>Improve our services and user experience</li>
      </ul>

      <h2>3. Information Sharing</h2>
      <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as required by law or to service providers who assist in our operations.</p>

      <h2>4. Data Security</h2>
      <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

      <h2>5. Data Retention</h2>
      <p>We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law.</p>

      <h2>6. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the personal information we hold about you</li>
        <li>Request correction of inaccurate information</li>
        <li>Request deletion of your information</li>
        <li>Opt-out of marketing communications</li>
      </ul>

      <h2>7. Third-Party Services</h2>
      <p>Our platform integrates with third-party services including:</p>
      <ul>
        <li>Meta (Facebook) Lead Ads</li>
        <li>Cal.com for scheduling</li>
        <li>Email service providers</li>
      </ul>
      <p>Each of these services has their own privacy policies governing their use of your data.</p>

      <h2>8. Contact Us</h2>
      <p>If you have questions about this Privacy Policy, please contact us through our platform.</p>

      <h2>9. Changes to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
    </div>
  </div>
</body>
</html>
  `);
});

// Terms of Service page
app.get('/terms', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - Lead Pipeline Platform</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #e2e8f0;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { 
      font-size: 2.5rem; 
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h2 { font-size: 1.5rem; margin: 2rem 0 1rem; color: #f1f5f9; }
    p { margin-bottom: 1rem; color: #94a3b8; }
    .card {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 1rem;
      padding: 2rem;
      margin-top: 2rem;
    }
    .updated { 
      font-size: 0.875rem; 
      color: #64748b; 
      margin-bottom: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Terms of Service</h1>
    <p class="updated">Last updated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    
    <div class="card">
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing and using this platform, you accept and agree to be bound by the terms and provisions of this agreement.</p>

      <h2>2. Use License</h2>
      <p>Permission is granted to temporarily use this platform for personal, non-commercial transitory viewing only.</p>

      <h2>3. Disclaimer</h2>
      <p>The materials on this platform are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>

      <h2>4. Limitations</h2>
      <p>In no event shall we or our suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this platform.</p>

      <h2>5. Governing Law</h2>
      <p>These terms and conditions are governed by and construed in accordance with applicable laws and you irrevocably submit to the exclusive jurisdiction of the courts in that location.</p>
    </div>
  </div>
</body>
</html>
  `);
});

// ============================================
// STATIC FILE SERVING (Production)
// ============================================

// Serve frontend static files in production
if (!isDev && fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
  
  console.log('✅ Serving frontend from:', FRONTEND_DIST);
}

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler for API routes
app.use((req, res) => {
  // Only return JSON 404 for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.originalUrl}`
    });
  }
  // For non-API routes in dev, return simple 404
  res.status(404).send('Not Found');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : 'Internal Server Error',
    ...(isDev && { stack: err.stack })
  });
});

// ============================================
// SERVER INITIALIZATION
// ============================================

// Message queue scheduler (processes every minute)
let queueInterval = null;

function startMessageScheduler() {
  // Process queue every 60 seconds
  queueInterval = setInterval(async () => {
    try {
      const processed = await processMessageQueue();
      if (processed > 0) {
        console.log(`📬 Processed ${processed} messages from queue`);
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    }
  }, 60000); // Every 60 seconds
  
  // Also process immediately on start
  processMessageQueue().catch(console.error);
  
  console.log('✅ Message queue scheduler started');
}

async function startServer() {
  try {
    // Initialize database and run migrations
    await initDatabase();
    console.log('✅ Database connected');
    
    await migrate();
    console.log('✅ Database migrations complete');

    // Initialize services
    initEmailService();
    await initWhatsAppService();
    
    // Start message queue scheduler
    startMessageScheduler();

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Lead Pipeline Platform API Server                     ║
║                                                            ║
║   Server running at: http://localhost:${PORT}               ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(38)}║
║                                                            ║
║   API Endpoints:                                           ║
║   • Health:    GET  /api/health                            ║
║   • Leads:     GET  /api/leads                             ║
║   • Webhooks:  POST /api/webhooks/meta                     ║
║   •            POST /api/webhooks/calcom                   ║
║   •            POST /api/webhooks/test                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  closeDatabase();
  process.exit(0);
});

// Start the server
startServer();

export default app;
