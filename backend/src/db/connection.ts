// ===============================================
// 🗄️ MongoDB Connection Module
// ===============================================

import mongoose from 'mongoose';
import { config } from '../config/index.js';

let isConnected = false;

export async function connectDatabase(): Promise<void> {
    if (isConnected) {
        console.log('📦 MongoDB already connected');
        return;
    }

    try {
        console.log('📦 Connecting to MongoDB...');

        await mongoose.connect(config.mongoUri, {
            // Connection pool settings for production
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        console.log('✅ MongoDB connected successfully');

        // 🛡️ Safe Schema Migration
        try {
            await migrateIndexes();
        } catch (migrationError) {
            console.error('⚠️ Index migration failed (non-critical):', migrationError);
        }

        // Connection event handlers
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
            isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected');
            isConnected = true;
        });

    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        throw error;
    }
}

export async function disconnectDatabase(): Promise<void> {
    if (!isConnected) {
        return;
    }

    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log('📦 MongoDB disconnected gracefully');
    } catch (error) {
        console.error('❌ Error disconnecting from MongoDB:', error);
        throw error;
    }
}

export function isDatabaseConnected(): boolean {
    return isConnected && mongoose.connection.readyState === 1;
}


async function migrateIndexes() {
    try {
        const db = mongoose.connection.db;
        if (!db) {
            console.warn('⚠️ Migration skipped: database handle not yet available');
            return;
        }

        const collections = await db.listCollections({ name: 'leads' }).toArray();
        if (collections.length === 0) return;

        const indexes = await db.collection('leads').indexes();
        const phoneIndex = indexes.find((idx: Record<string, unknown>) => idx.name === 'phone_1');

        if (phoneIndex && phoneIndex.unique) {
            console.log('🔄 Migration: Dropping unique index on phone...');
            await db.collection('leads').dropIndex('phone_1');
            console.log('✅ Migration: Unique phone index dropped. New non-unique index will be created by Mongoose.');
        } else {
            console.log('✅ Migration: Phone index is already compatible (non-unique or missing).');
        }
    } catch (error) {
        console.error('❌ Migration Error:', error);
        // Don't throw, let app start up even if this fails (e.g. permissions)
    }
}

export default { connectDatabase, disconnectDatabase, isDatabaseConnected };
