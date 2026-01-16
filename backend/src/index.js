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

async function startServer() {
  try {
    // Initialize database and run migrations
    await initDatabase();
    console.log('✅ Database connected');
    
    await migrate();
    console.log('✅ Database migrations complete');

    // Initialize email service
    initEmailService();

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
