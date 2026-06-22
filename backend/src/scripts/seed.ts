// ===============================================
// 🌱 Seed Script
// ===============================================

// Safety guard: this script deletes and recreates users.
// It must never run in staging or production.
if (process.env.NODE_ENV !== 'development') {
    console.error('❌ seed.ts must not be run outside development (NODE_ENV is not "development").');
    process.exit(1);
}

import mongoose from 'mongoose';
import 'dotenv/config';
import User from '../models/User.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import {
    resolveSeedPassword,
    SEED_ADMIN_PASSWORD_VAR,
    SEED_AGENT_PASSWORD_VAR,
} from '../utils/seedCredentials.js';

const seedUsers = async () => {
    try {
        console.log('🌱 Connecting to database...');
        await connectDatabase();

        // Specific requirements
        const usersToSeed = [
            {
                name: "Admin",
                email: "admin@crystolia.com",
                password: resolveSeedPassword(SEED_ADMIN_PASSWORD_VAR),
                role: "admin",
                company: null, // Explicit null
                isActive: true
            },
            {
                name: "Agent",
                email: "agent@crystolia.com",
                password: resolveSeedPassword(SEED_AGENT_PASSWORD_VAR),
                role: "agent",
                company: null, // Explicit null
                isActive: true
            }
        ];

        for (const userData of usersToSeed) {
            // 1. Delete if exists
            await User.deleteOne({ email: userData.email });
            console.log(`🗑️  Deleted existing user: ${userData.email}`);

            // 2. Create new (triggers pre-save hashing)
            await User.create(userData);
            console.log(`✅ Created user: ${userData.email} (${userData.role})`);
        }

        console.log('🌱 Seeding complete successfully');
        await disconnectDatabase();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
};

seedUsers();
