// ===============================================
// 🌱 Admin Seeder (Development Only)
// ===============================================
// Idempotent: creates default admin only if none exists.
// Runs only when NODE_ENV === 'development'.

import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { config } from '../config/index.js';

export async function seedAdmin(): Promise<void> {
    if (config.nodeEnv !== 'development') {
        return; // Silent skip in production
    }

    try {
        const existingAdmin = await User.findOne({ role: 'admin' });

        if (existingAdmin) {
            console.log('🌱 Admin already exists — skipping seed');
            return;
        }

        await User.create({
            name: 'Admin',
            email: 'admin@crystolia.com',
            password: 'Admin123!', // Hashed by User pre-save hook
            role: 'admin',
            isActive: true,
        });

        console.log('🌱 Admin seeded (admin@crystolia.com / Admin123!)');
    } catch (error) {
        console.error('❌ Admin seed failed:', error);
        // Non-critical — don't crash the server
    }

    // Seed default business settings if none exist
    try {
        const existingSettings = await Settings.findOne({ key: 'business' });

        if (!existingSettings) {
            await Settings.create({
                key: 'business',
                minimumOrderAmount: 0,
                currency: 'ILS',
                boxPrices: [
                    { label: 'Small Box', sku: 'BOX-S', pricePerUnit: 0, isActive: true },
                    { label: 'Medium Box', sku: 'BOX-M', pricePerUnit: 0, isActive: true },
                    { label: 'Large Box', sku: 'BOX-L', pricePerUnit: 0, isActive: true },
                ],
            });
            console.log('🌱 Default business settings seeded');
        }
    } catch (error) {
        console.error('❌ Settings seed failed:', error);
        // Non-critical — don't crash the server
    }
}
