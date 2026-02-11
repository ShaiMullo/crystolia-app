// ===============================================
// 🌱 Seed Script
// ===============================================

import mongoose from 'mongoose';
import 'dotenv/config';
import User from '../models/User.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';

const seedUsers = async () => {
    try {
        console.log('🌱 Connecting to database...');
        await connectDatabase();

        // Specific requirements
        const usersToSeed = [
            {
                name: "Admin",
                email: "admin@crystolia.com",
                password: "Admin123!",
                role: "admin",
                company: null, // Explicit null
                isActive: true
            },
            {
                name: "Agent",
                email: "agent@crystolia.com",
                password: "Agent123!",
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
