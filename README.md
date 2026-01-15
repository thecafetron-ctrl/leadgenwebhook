# Lead Pipeline Platform

A modern lead management and automation testing dashboard built with React and Node.js.

![Lead Pipeline Dashboard](https://via.placeholder.com/1200x600/0f172a/0ea5e9?text=Lead+Pipeline+Platform)

## 🔗 Webhook Endpoints (Production)

```
POST https://leadgenwebhook-production.up.railway.app/api/webhooks/meta
POST https://leadgenwebhook-production.up.railway.app/api/webhooks/calcom
POST https://leadgenwebhook-production.up.railway.app/api/webhooks/test
```

## Features

### 📊 Dashboard
- Real-time statistics and metrics
- Recent leads overview
- Webhook activity monitoring
- Lead source distribution

### 👥 Lead Management
- Full CRUD operations for leads
- Advanced filtering (status, source, priority, date range)
- Search across name, email, phone, company
- Sorting by any column
- Bulk actions (update, delete)
- Export to CSV

### 🔗 Webhook Integration
- **Meta Instant Forms** - Receive leads from Facebook/Instagram Lead Ads
- **Cal.com** - Capture booking notifications
- **Custom/Test** - Accept any JSON payload
- Automatic signature validation
- Comprehensive logging

### 🧪 Testing Playground
- Send test webhooks
- Simulate Meta and Cal.com events
- Real-time response display
- Test history tracking

### 🗄️ Future-Ready Database Schema
- Email campaigns table
- WhatsApp messages table
- Automation workflows table
- Activity logging

## Tech Stack

### Frontend
- **React 18** with Vite
- **TailwindCSS** for styling
- **React Query** for data fetching
- **Zustand** for state management
- **Framer Motion** for animations
- **React Router** for navigation

### Backend
- **Express.js** server
- **SQLite** database (easily portable to PostgreSQL)
- **Zod** for validation
- **Helmet** for security
- **Rate limiting** protection

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd emailpipelinesoftware
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Start development servers:
```bash
npm run dev
```

This will start:
- Backend API at http://localhost:3001
- Frontend at http://localhost:5173

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=3001
NODE_ENV=development

# Security
WEBHOOK_SECRET=your-webhook-secret

# External Services
META_APP_SECRET=your-meta-app-secret
META_VERIFY_TOKEN=lead_pipeline_verify
CALCOM_WEBHOOK_SECRET=your-calcom-secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Leads
```
GET    /api/leads              # List leads (with filtering/pagination)
GET    /api/leads/stats        # Get lead statistics
GET    /api/leads/:id          # Get single lead
GET    /api/leads/:id/activities # Get lead activities
POST   /api/leads              # Create lead
PUT    /api/leads/:id          # Update lead
DELETE /api/leads/:id          # Delete lead
POST   /api/leads/bulk/update  # Bulk update
POST   /api/leads/bulk/delete  # Bulk delete
```

### Webhooks
```
GET  /api/webhooks/logs         # List webhook logs
GET  /api/webhooks/logs/recent  # Recent logs
GET  /api/webhooks/stats        # Webhook statistics
GET  /api/webhooks/logs/:id     # Single log detail

# Webhook Receivers
GET  /api/webhooks/meta         # Meta verification
POST /api/webhooks/meta         # Meta lead webhook
POST /api/webhooks/calcom       # Cal.com booking webhook
POST /api/webhooks/test         # Test webhook endpoint

# Simulation
POST /api/webhooks/simulate/meta   # Simulate Meta webhook
POST /api/webhooks/simulate/calcom # Simulate Cal.com webhook
```

## Webhook Integration Guide

### Meta Instant Forms

1. Go to Facebook Business Suite > Events Manager
2. Create a new webhook subscription
3. Set the callback URL to: `https://your-domain.com/api/webhooks/meta`
4. Set the verify token to match `META_VERIFY_TOKEN` in your environment
5. Subscribe to `leadgen` events

### Cal.com

1. Go to Cal.com Settings > Webhooks
2. Add a new webhook with URL: `https://your-domain.com/api/webhooks/calcom`
3. Select events: `BOOKING_CREATED`, `BOOKING_RESCHEDULED`
4. Copy the signing secret to `CALCOM_WEBHOOK_SECRET`

## Deployment (Railway)

This project is configured for **one-click deployment on Railway**.

### Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `thecafetron-ctrl/leadgenwebhook`
4. Railway auto-detects the configuration from `railway.json`
5. Set environment variables:
   ```
   NODE_ENV=production
   ```
6. Deploy! 🚀

### Your Production URLs

Once deployed, your app will be available at:
```
Dashboard: https://leadgenwebhook-production.up.railway.app
```

### Webhook Endpoints for External Services

**Meta Instant Forms:**
```
POST https://leadgenwebhook-production.up.railway.app/api/webhooks/meta
GET  https://leadgenwebhook-production.up.railway.app/api/webhooks/meta (verification)
Verify Token: lead_pipeline_verify
```

**Cal.com:**
```
POST https://leadgenwebhook-production.up.railway.app/api/webhooks/calcom
```

**Custom/Test:**
```
POST https://leadgenwebhook-production.up.railway.app/api/webhooks/test
```

### Alternative: Netlify + Railway

If you prefer Netlify for frontend:
1. Deploy frontend to Netlify (it will use `netlify.toml`)
2. Deploy backend to Railway
3. Update Netlify env: `VITE_API_URL=https://your-railway-backend.up.railway.app/api`

### Database Migration to PostgreSQL

For production with high traffic, migrate from SQLite to PostgreSQL:

1. Install `pg` package
2. Update `DATABASE_URL` environment variable
3. Modify `backend/src/database/connection.js` to use `pg`
4. Update SQL syntax in `schema.js` (mainly datetime functions)

## Adding Future Automations

The database schema is prepared for:

### Email Campaigns
```javascript
// Tables: email_campaigns, email_sends
// Add email service integration (SendGrid, etc.)
// Create campaign management UI
// Implement email sending service
```

### WhatsApp Automation
```javascript
// Table: whatsapp_messages
// Add WhatsApp Business API integration
// Create message templates
// Implement message sending service
```

### Workflow Automation
```javascript
// Tables: automation_workflows, workflow_executions
// Create workflow builder UI
// Implement workflow engine
// Add trigger handlers
```

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── connection.js    # Database connection
│   │   │   ├── schema.js        # Table definitions
│   │   │   └── migrate.js       # Migration script
│   │   ├── middleware/
│   │   │   └── validation.js    # Request validation
│   │   ├── models/
│   │   │   ├── Lead.js          # Lead model
│   │   │   └── WebhookLog.js    # Webhook log model
│   │   ├── routes/
│   │   │   ├── leads.js         # Lead routes
│   │   │   └── webhooks.js      # Webhook routes
│   │   └── index.js             # Server entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx       # Main layout
│   │   │   ├── Sidebar.jsx      # Navigation
│   │   │   ├── Header.jsx       # Top bar
│   │   │   ├── LeadModal.jsx    # Create/Edit modal
│   │   │   └── LeadDetailModal.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Main dashboard
│   │   │   ├── Leads.jsx        # Lead management
│   │   │   ├── WebhookLogs.jsx  # Webhook viewer
│   │   │   └── Playground.jsx   # Testing interface
│   │   ├── lib/
│   │   │   ├── api.js           # API client
│   │   │   ├── store.js         # State management
│   │   │   └── utils.js         # Utility functions
│   │   ├── App.jsx              # App component
│   │   ├── main.jsx             # Entry point
│   │   └── index.css            # Global styles
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
├── netlify.toml                 # Netlify config
├── env.example                  # Environment template
├── package.json                 # Root package
└── README.md
```

## License

MIT License - Feel free to use this for your own projects!

## Support

For questions or issues, please open a GitHub issue.
