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

import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import auditRouter from './routes/audit.js';
import ordersRouter from './routes/orders.js';
import customersRouter from './routes/customers.js';
import invoicesRouter from './routes/invoices.js';
import settingsRouter from './routes/settings.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { seedAdmin } from './db/seedAdmin.js';
import { seedDefaultRules } from './services/automationService.js';
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
app.use('/api/crm/customers', crmCustomersRouter);
app.use('/api/crm/tasks', crmTasksRouter);
app.use('/api/crm/notifications', crmNotificationsRouter);
app.use('/api/crm/analytics', crmAnalyticsRouter);
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/settings', settingsRouter);

app.use('/api/audit', auditRouter);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚠️ Error Handler
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(errorHandler);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛑 Graceful Shutdown
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

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
