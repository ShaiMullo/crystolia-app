// ===============================================
// 🚀 Crystolia Backend - Main Entry Point
// ===============================================
// Production-ready with MongoDB, graceful shutdown, timeouts

import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'http';

import cookieParser from 'cookie-parser';

import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from './db/connection.js';
import leadsRouter from './routes/leads.js';
import crmRouter from './routes/crm.js';
import crmCustomersRouter from './routes/crmCustomers.js';
import crmTasksRouter from './routes/crmTasks.js';
import crmNotificationsRouter from './routes/crmNotifications.js';
import crmAnalyticsRouter from './routes/crmAnalytics.js';
import crmProductsRouter from './routes/crmProducts.js';
import crmInventoryRouter from './routes/crmInventory.js';
import crmOrdersRouter from './routes/crmOrders.js';
import crmPaymentsRouter from './routes/crmPayments.js';
import crmShipmentsRouter from './routes/crmShipments.js';
import crmSuppliersRouter from './routes/crmSuppliers.js';
import crmPurchaseOrdersRouter from './routes/crmPurchaseOrders.js';
import crmSystemRouter from './routes/crmSystem.js';
import crmExportsRouter from './routes/crmExports.js';

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import auditRouter from './routes/audit.js';
import ordersRouter from './routes/orders.js';
import customersRouter from './routes/customers.js';
import meRouter from './routes/me.js';
import companiesRouter from './routes/companies.js';
import invoicesRouter from './routes/invoices.js';
import settingsRouter from './routes/settings.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { deprecatedRoute } from './middleware/deprecation.js';
import { seedAdmin } from './db/seedAdmin.js';
import { seedDefaultRules } from './services/automationService.js';
import { seedScheduledJobs, startScheduler, stopScheduler } from './jobs/scheduler.js';
import passport from './config/passport.js';

// Application instance
const app = express();
let server: Server;

// Fix express-rate-limit X-Forwarded-For warning
app.set('trust proxy', 1);

// Initialize Passport
app.use(passport.initialize());

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔒 Middleware - Security & Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔒 Middleware - Security & Configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Helmet - Security headers
app.use(helmet());

// CORS - Allow frontend requests (MUST be before other middleware)
// 🚀 SECURITY: CORS Configuration
// STRICT ORIGIN REQUIRED for credentials (cookies) to work.
// Do NOT use wildcard '*' or dynamic origin unless absolutely necessary.
app.use(cors({
    origin: config.corsOrigins,      // Allow configured origins
    credentials: true,               // Allow Cookies
}));

// 🚀 SECURITY: Cookie Parser
// REQUIRED to read req.cookies.auth_token
app.use(cookieParser());

// 🚀 SECURITY: CSRF Protection
// Verifies Origin/Referer for state-changing requests
import { csrfCheck } from './middleware/csrf.js';
app.use(csrfCheck);

// Structured request logger — emits one JSON line per request for Loki.
app.use(requestLogger);

// JSON parser with limit
app.use(express.json({ limit: '10mb' }));

// Request timeout middleware
app.use((_req, res, next) => {
    res.setTimeout(config.server.requestTimeout, () => {
        res.status(408).json({ error: 'Request timeout' });
    });
    next();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📍 Routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Root catch-all for load balancer / ingress pings (prevents 404 log noise).
app.get('/', (_req: Request, res: Response) => {
    res.status(200).send('OK');
});

// Lightweight health check — no DB dependency, always 200 if process is alive.
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});

// Health check - Kubernetes readiness/liveness
app.get('/api/health', (_req: Request, res: Response) => {
    const dbConnected = isDatabaseConnected();

    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        service: 'crystolia-backend',
        database: dbConnected ? 'connected' : 'disconnected',
        environment: config.nodeEnv,
    });
});

// Readiness probe (for Kubernetes)
app.get('/api/ready', (_req: Request, res: Response) => {
    if (isDatabaseConnected()) {
        res.status(200).json({ ready: true });
    } else {
        res.status(503).json({ ready: false, reason: 'Database not connected' });
    }
});

// Liveness probe (for Kubernetes)
app.get('/api/live', (_req: Request, res: Response) => {
    res.status(200).json({ alive: true });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/crm', crmRouter);
// Old /api/crm/* surface — DEPRECATED in favour of /api/v1/* (M1/B2). The
// deprecatedRoute() shim only sets deprecation headers + logs one line, then the
// SAME router runs unchanged (zero behavior change). The /api/crm meta root above
// is left as-is (its canonical successor is TBD in M3). Removal of these aliases
// is B4. See docs/m1-consolidation-plan.md.
app.use('/api/crm/customers', deprecatedRoute('/api/v1/customers'), crmCustomersRouter);
app.use('/api/crm/tasks', deprecatedRoute('/api/v1/tasks'), crmTasksRouter);
app.use('/api/crm/notifications', deprecatedRoute('/api/v1/notifications'), crmNotificationsRouter);
app.use('/api/crm/analytics', deprecatedRoute('/api/v1/analytics'), crmAnalyticsRouter);
app.use('/api/crm/products', deprecatedRoute('/api/v1/products'), crmProductsRouter);
app.use('/api/crm/inventory', deprecatedRoute('/api/v1/inventory'), crmInventoryRouter);
app.use('/api/crm/orders', deprecatedRoute('/api/v1/orders'), crmOrdersRouter);
app.use('/api/crm/payments', deprecatedRoute('/api/v1/payments'), crmPaymentsRouter);
app.use('/api/crm/shipments', deprecatedRoute('/api/v1/shipments'), crmShipmentsRouter);
app.use('/api/crm/suppliers', deprecatedRoute('/api/v1/suppliers'), crmSuppliersRouter);
app.use('/api/crm/purchase-orders', deprecatedRoute('/api/v1/purchase-orders'), crmPurchaseOrdersRouter);
app.use('/api/crm/system', deprecatedRoute('/api/v1/system'), crmSystemRouter);
app.use('/api/crm/exports', deprecatedRoute('/api/v1/exports'), crmExportsRouter);
app.use('/api/users', usersRouter);
// Customer-facing routers — NOT duplicates of the crm*/v1 (admin) routers.
// ordersRouter serves customer order flows (POST / place, GET /, PATCH /:id,
// payment/approval) and customersRouter serves self-service (/my-profile,
// /complete-profile, /update-profile). frontend-client consumes both, and
// /api/v1/{orders,customers} (CRM/admin) are NOT equivalent successors — so
// these stay mounted plain (no deprecation) until they get their own v1 home.
app.use('/api/orders', ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/settings', settingsRouter);

app.use('/api/audit', auditRouter);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// /api/v1 — versioned API surface (M1 / B1 dual-mount)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Additive aliases that REUSE the same router instances mounted above, so they
// behave identically (same global middleware + each router's own protect/
// authorize). Zero behavior change; nothing above is removed or modified.
// Canonical map: docs/m1-consolidation-plan.md.
// Notes:
//  - customers/orders here alias the crm* (admin) routers. The separate
//    /api/customers and /api/orders are customer-facing routers (self-service /
//    order placement) consumed by frontend-client — NOT duplicates — so they
//    keep their own plain mounts and are not aliased or deprecated here.
//  - the /api/crm meta root (crmRouter) is not aliased (canonical home TBD, M3).
//  - deprecation headers on legacy/crm paths are B2; frontend migration is B3.
// identity
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
// crm
app.use('/api/v1/customers', crmCustomersRouter);
app.use('/api/v1/leads', leadsRouter);
app.use('/api/v1/companies', companiesRouter);
app.use('/api/v1/tasks', crmTasksRouter);
app.use('/api/v1/notifications', crmNotificationsRouter);
// catalog
app.use('/api/v1/products', crmProductsRouter);
// inventory
app.use('/api/v1/inventory', crmInventoryRouter);
// sales
app.use('/api/v1/orders', crmOrdersRouter);
// procurement
app.use('/api/v1/suppliers', crmSuppliersRouter);
app.use('/api/v1/purchase-orders', crmPurchaseOrdersRouter);
app.use('/api/v1/shipments', crmShipmentsRouter);
// accounting
app.use('/api/v1/invoices', invoicesRouter);
app.use('/api/v1/payments', crmPaymentsRouter);
// platform
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/analytics', crmAnalyticsRouter);
app.use('/api/v1/exports', crmExportsRouter);
app.use('/api/v1/system', crmSystemRouter);
// customer portal (self-service) — additive; reuses the customer handlers from
// routes/customers.ts + routes/orders.ts. /api/v1/{customers,orders} above stay
// the admin CRM routers; /api/customers + /api/orders stay mounted unchanged.
app.use('/api/v1/me', meRouter);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚠️ Error Handler
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(errorHandler);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛑 Graceful Shutdown
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    // Stop the scheduler so no new jobs fire mid-shutdown
    stopScheduler();

    // Stop accepting new connections
    server.close(async () => {
        console.log('📦 HTTP server closed');

        try {
            // Disconnect from database
            await disconnectDatabase();
            console.log('✅ Graceful shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
}

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 Start Server
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function startServer(): Promise<void> {
    try {
        // Connect to MongoDB
        await connectDatabase();

        // Seed default admin in development
        await seedAdmin();

        // Seed default automation rules (idempotent — safe to run every boot)
        await seedDefaultRules();

        // Seed scheduled jobs. The in-process scheduler is opt-out via
        // ENABLE_SCHEDULER=false — set it on extra replicas so jobs run on
        // exactly one pod (the scheduler is single-process by design).
        await seedScheduledJobs();
        if (process.env.ENABLE_SCHEDULER !== 'false') {
            startScheduler();
        } else {
            console.log('⏰ Scheduler disabled (ENABLE_SCHEDULER=false)');
        }

        // Start HTTP server
        server = app.listen(config.port, () => {
            console.log(`
  🌻 Crystolia Backend is running!
  
  📍 Local:     http://localhost:${config.port}
  📍 Health:    http://localhost:${config.port}/api/health
  📍 Ready:     http://localhost:${config.port}/api/ready
  📍 Leads:     http://localhost:${config.port}/api/leads
  
  🔧 Environment: ${config.nodeEnv}
  📦 MongoDB:     ${isDatabaseConnected() ? 'Connected' : 'Disconnected'}
            `);
        });

        // Set production timeouts
        server.keepAliveTimeout = config.server.keepAliveTimeout;
        server.headersTimeout = config.server.headersTimeout;

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the application
startServer();

export default app;
