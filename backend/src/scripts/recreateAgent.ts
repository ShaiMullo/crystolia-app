// ===============================================
// 🔄 Recreate Agent Script
// ===============================================

// Safety guard: this script deletes and recreates a user with a known password.
// It must never run in staging or production.
if (process.env.NODE_ENV !== 'development') {
    console.error('❌ recreateAgent.ts must not be run outside development (NODE_ENV is not "development").');
    process.exit(1);
}

import 'dotenv/config';
import User from '../models/User.js';
import { connectDatabase } from '../db/connection.js';

const recreateAgent = async () => {
    try {
        await connectDatabase();

        const agentEmail = process.env.APP_USER_EMAIL || 'agent@crystolia.com';
        const agentPassword = process.env.APP_USER_PASSWORD || 'agent123';

        await User.deleteOne({ email: agentEmail });
        console.log(`🗑️  Deleted existing agent: ${agentEmail}`);

        await User.create({
            name: 'Sales Agent',
            email: agentEmail,
            password: agentPassword,
            role: 'agent',
            isActive: true,
        });
        console.log(`✅ Created fresh Agent user: ${agentEmail}`);

        console.log('🔄 Recreate complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error recreating agent:', error);
        process.exit(1);
    }
};

recreateAgent();
