// ===============================================
// Test Harness — minimal Express app + in-memory MongoDB
// ===============================================
// Mounts the real routers (auth/users/me) with the same middleware order as
// src/index.ts, but without helmet/CORS/CSRF/logging so tests exercise route
// logic directly. Provider services stay unconfigured (see setup.ts) and
// therefore no-op — best-effort semantics are part of what we test.

import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { MongoMemoryServer, MongoMemoryReplSet } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import authRouter from '../routes/auth.js';
import usersRouter from '../routes/users.js';
import meRouter from '../routes/me.js';
import ordersRouter from '../routes/orders.js';
import crmInventoryRouter from '../routes/crmInventory.js';
import crmNotificationsRouter from '../routes/crmNotifications.js';
import crmOrdersRouter from '../routes/crmOrders.js';
import crmPurchaseOrdersRouter from '../routes/crmPurchaseOrders.js';
import crmSystemRouter from '../routes/crmSystem.js';
import settingsRouter from '../routes/settings.js';
import paymentWebhooksRouter from '../routes/paymentWebhooks.js';
import { readyHandler } from '../routes/ready.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';
import User from '../models/User.js';
import Company from '../models/Company.js';

let mongod: MongoMemoryServer | MongoMemoryReplSet | null = null;

/**
 * Start the in-memory database. `replSet: true` boots a single-node
 * replica set so MongoDB TRANSACTIONS work — required by any test that
 * approves/ships orders containing stock-tracked products (the order
 * workflow refuses those with 503 on a standalone mongod). Standalone
 * stays the default: it is faster and also exercises the 503 behavior.
 */
export async function startTestDb(options: { replSet?: boolean } = {}): Promise<void> {
    mongod = options.replSet
        ? await MongoMemoryReplSet.create({ replSet: { count: 1 } })
        : await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await Promise.all([User.init(), Company.init()]);
}

export async function stopTestDb(): Promise<void> {
    await mongoose.disconnect();
    if (mongod) {
        await mongod.stop();
        mongod = null;
    }
}

export async function clearDb(): Promise<void> {
    const collections = mongoose.connection.collections;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

export function buildTestApp(): Express {
    const app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/auth', authRouter);
    app.use('/api/v1/auth', authRouter);
    app.use('/api/users', usersRouter);
    app.use('/api/v1/users', usersRouter);
    app.use('/api/v1/me', meRouter);
    app.use('/api/orders', ordersRouter);
    app.use('/api/v1/inventory', crmInventoryRouter);
    app.use('/api/v1/notifications', crmNotificationsRouter);
    app.use('/api/v1/orders', crmOrdersRouter);
    app.use('/api/v1/purchase-orders', crmPurchaseOrdersRouter);
    app.use('/api/v1/system', crmSystemRouter);
    app.get('/api/ready', readyHandler);
    app.use('/api/settings', settingsRouter);
    app.use('/api/v1/settings', settingsRouter);
    app.use('/api/payments/webhooks', paymentWebhooksRouter);
    app.use(errorHandler);
    return app;
}

export async function createAdmin(overrides: Record<string, unknown> = {}) {
    return User.create({
        name: 'Test Admin',
        email: 'admin@test.crystolia.com',
        password: 'AdminPass1',
        role: 'admin',
        isActive: true,
        registrationStatus: 'approved',
        ...overrides,
    });
}

export function authCookieFor(user: { _id: unknown; role: string; tokenVersion?: number }): string {
    const token = jwt.sign(
        { id: String(user._id), role: user.role, tokenVersion: user.tokenVersion ?? 0 },
        config.jwtSecret,
        { expiresIn: '1h' },
    );
    return `auth_token=${token}`;
}

// Ordering now requires an admin-enabled payment method plus a customer
// paymentPreference — shared fixture for every order-placement test.
export const PAYMENT_OPTIONS_BANK_ENABLED = {
    bankTransfer: {
        enabled: true,
        bankName: 'בנק לאומי',
        branch: '900',
        accountNumber: '12-345-678',
        accountName: 'Crystolia Ltd',
        // Synthetic but structurally valid IL IBAN embedding branch 900 /
        // account 12345678 — matches the fields above, never a real account.
        iban: 'IL530109000000012345678',
    },
    creditCard: { enabled: false, paymentUrl: '' },
};

export const VALID_REGISTRATION = {
    name: 'ישראל ישראלי',
    email: 'new.business@example.com',
    password: 'Password1',
    companyName: 'חברת בדיקה בעמ',
    phone: '052-1234567',
    country: 'IL',
    vatNumber: '515123456',
    locale: 'he',
};
