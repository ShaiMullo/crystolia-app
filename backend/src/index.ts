// ===============================================
// 🚀 Crystolia Backend - Main Entry Point
// ===============================================

import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import leadsRouter from './routes/leads.js';
import whatsappRouter from './routes/whatsapp.js';
import ordersRouter from './routes/orders.js';
import customersRouter from './routes/customers.js';
import authRouter from './routes/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// יצירת האפליקציה
const app = express();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔒 Middleware - אבטחה והגדרות
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Helmet - מוסיף headers לאבטחה
app.use(helmet());

// CORS - מאפשר בקשות מה-frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));

// JSON parser - מפענח בקשות JSON
app.use(express.json());

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📍 Routes - הנתיבים
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Health check - לבדיקת תקינות (Kubernetes)
app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'crystolia-backend',
    });
});

// Auth API
app.use('/api/auth', authRouter);

// Leads API
app.use('/api/leads', leadsRouter);

// WhatsApp API
app.use('/api/whatsapp', whatsappRouter);

// Orders API
app.use('/api/orders', ordersRouter);

// Customers API
app.use('/api/customers', customersRouter);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚠️ Error Handler
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(errorHandler);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 Start Server
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`
  🌻 Crystolia Backend is running!
  
  📍 Local:    http://localhost:${PORT}
  📍 Health:   http://localhost:${PORT}/api/health
  📍 Leads:    http://localhost:${PORT}/api/leads
  
  🔧 Environment: ${process.env.NODE_ENV || 'development'}
  `);
});

export default app;
