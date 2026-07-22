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
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

import authRouter from '../routes/auth.js';
import usersRouter from '../routes/users.js';
import meRouter from '../routes/me.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { config } from '../config/index.js';
import User from '../models/User.js';

let mongod: MongoMemoryServer | null = null;

export async function startTestDb(): Promise<void> {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
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
