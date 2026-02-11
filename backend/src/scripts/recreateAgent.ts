// ===============================================
// 🔄 Recreate Agent Script
// ===============================================

import mongoose from 'mongoose';
import 'dotenv/config';
import User from '../models/User.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';

const recreateAgent = async () => {
    try {
        await connectDatabase();

        const agentEmail = process.env.APP_USER_EMAIL || 'agent@crystolia.com';
        const agentPassword = process.env.APP_USER_PASSWORD || 'agent123';

        // Delete existing agent
        await User.deleteOne({ email: agentEmail });
        console.log(`🗑️  Deleted existing agent: ${agentEmail}`);

        // Create new agent
        await User.create({
            name: 'Sales Agent',
            email: agentEmail,
            password: agentPassword,
            role: 'agent',
            isActive: true,
        });
        console.log(`✅ Created fresh Agent user: ${agentEmail} / ${agentPassword}`);

        console.log('🔄 Recreate complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error recreating agent:', error);
        process.exit(1);
    }
};

recreateAgent();
