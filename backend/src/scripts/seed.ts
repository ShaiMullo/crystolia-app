
import mongoose from 'mongoose';
import { UserModel } from '../models/User';
import { CustomerModel } from '../models/Customer';
import { OrderModel } from '../models/Order';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crystolia';

const seedDatabase = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('🍃 Connected to MongoDB for seeding...');

        // Clear existing data
        await UserModel.deleteMany({});
        await CustomerModel.deleteMany({});
        await OrderModel.deleteMany({});
        console.log('🧹 Cleared existing data');

        // 1. Create Users
        const adminUser = await UserModel.create({
            email: 'admin@crystolia.com',
            password: 'admin', // Demo password
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin'
        });

        const customerUser1 = await UserModel.create({
            email: 'olive@restaurant.com',
            password: '123',
            firstName: 'Israel',
            lastName: 'Israeli',
            phone: '050-1234567',
            role: 'customer'
        });

        const customerUser2 = await UserModel.create({
            email: 'info@golden.co.il',
            password: '123',
            firstName: 'Sarah',
            lastName: 'Cohen',
            phone: '052-9876543',
            role: 'customer'
        });

        console.log('👥 Users created');

        // 2. Create Customer Profiles
        const customer1 = await CustomerModel.create({
            businessName: 'מסעדת הזית הירוק',
            contactPerson: 'ישראל ישראלי',
            email: 'olive@restaurant.com',
            phone: '050-1234567',
            address: { street: 'הזית 10', city: 'תל אביב', zip: '64000' },
            pricingTier: 'gold',
            user: customerUser1._id
        });

        const customer2 = await CustomerModel.create({
            businessName: 'קייטרינג גולדן',
            contactPerson: 'שרה כהן',
            email: 'info@golden.co.il',
            phone: '052-9876543',
            address: { street: 'הרימון 5', city: 'רמת גן', zip: '52000' },
            pricingTier: 'platinum',
            user: customerUser2._id
        });

        console.log('🏢 Customer profiles created');

        // 3. Create Orders
        const orders = [
            // Recent orders
            {
                customer: customer1._id,
                status: 'pending',
                items: [
                    { productType: '1L', quantity: 20, unitPrice: 25, totalPrice: 500 },
                    { productType: '5L', quantity: 5, unitPrice: 110, totalPrice: 550 }
                ],
                totalAmount: 1050,
                createdAt: new Date()
            },
            {
                customer: customer2._id,
                status: 'approved',
                items: [
                    { productType: '18L', quantity: 3, unitPrice: 380, totalPrice: 1140 }
                ],
                totalAmount: 1140,
                createdAt: new Date(Date.now() - 86400000) // Yesterday
            },
            // Orders from last month
            {
                customer: customer1._id,
                status: 'delivered',
                items: [{ productType: '5L', quantity: 10, unitPrice: 110, totalPrice: 1100 }],
                totalAmount: 1100,
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            },
            {
                customer: customer2._id,
                status: 'delivered',
                items: [{ productType: 'Bulk', quantity: 1, unitPrice: 5000, totalPrice: 5000 }],
                totalAmount: 5000,
                createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
            },
            // Orders from 2 months ago
            {
                customer: customer1._id,
                status: 'delivered',
                items: [{ productType: '1L', quantity: 100, unitPrice: 22, totalPrice: 2200 }],
                totalAmount: 2200,
                createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
            }
        ];

        await OrderModel.create(orders);
        console.log('📦 Orders created');

        console.log('✅ Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedDatabase();
