// ===============================================
// 🔐 Reset Passwords Script
// ===============================================

import mongoose from 'mongoose';
import 'dotenv/config';
import User from '../models/User.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';

const resetPasswords = async () => {
    try {
        await connectDatabase();

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@crystolia.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const agentEmail = process.env.APP_USER_EMAIL || 'agent@crystolia.com';
        const agentPassword = process.env.APP_USER_PASSWORD || 'agent123';

        // Update Admin
        const admin = await User.findOne({ email: adminEmail });
        if (admin) {
            admin.password = adminPassword;
            await admin.save(); // Triggers hashing
            console.log(`✅ Admin password reset to: ${adminPassword}`);
        } else {
            console.log('❌ Admin not found');
        }

        // Update Agent
        const agent = await User.findOne({ email: agentEmail });
        if (agent) {
            agent.password = agentPassword;
            await agent.save(); // Triggers hashing
            console.log(`✅ Agent password reset to: ${agentPassword}`);
        } else {
            console.log('❌ Agent not found');
        }

        console.log('🔐 Password reset complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error resetting passwords:', error);
        process.exit(1);
    }
};

resetPasswords();
