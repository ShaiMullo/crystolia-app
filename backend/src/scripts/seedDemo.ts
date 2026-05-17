// ===============================================
// 🌱 Demo Seed — realistic development dataset
// ===============================================
//   npm run seed:demo           (additive seed)
//   npm run seed:demo -- --reset (wipe demo data first)
//
// Deterministic: same inputs → same dataset (no randomness).
// Development-only — refuses to run when NODE_ENV !== 'development'.

if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
    console.error('❌ seedDemo refuses to run outside development.');
    process.exit(1);
}

import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import Company from '../models/Company.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Shipment from '../models/Shipment.js';
import { applyMovement } from '../services/inventoryService.js';

const DEMO_TAG = 'demo-seed';

const PRODUCTS = [
    { name: 'Olive Oil 1L', sku: 'DEMO-OIL-1L', price: 45, costPrice: 28, taxRate: 17 },
    { name: 'Olive Oil 5L', sku: 'DEMO-OIL-5L', price: 190, costPrice: 130, taxRate: 17 },
    { name: 'Gift Box Small', sku: 'DEMO-BOX-S', price: 80, costPrice: 50, taxRate: 17 },
    { name: 'Gift Box Large', sku: 'DEMO-BOX-L', price: 150, costPrice: 95, taxRate: 17 },
];

const CUSTOMERS = [
    { company: 'Galilee Foods Ltd', contact: 'Dana Levi' },
    { company: 'Mediterranean Imports', contact: 'Yossi Cohen' },
    { company: 'North Market Co', contact: 'Rina Bar' },
];

const SUPPLIERS = [
    { name: 'Golan Press House', contact: 'Avi Shemesh' },
    { name: 'Coastal Packaging', contact: 'Maya Tal' },
];

async function reset(): Promise<void> {
    console.log('🗑️  Resetting demo data…');
    // Demo records are tagged or prefixed so resets never touch real data.
    await Product.deleteMany({ sku: /^DEMO-/ });
    await Supplier.deleteMany({ name: { $in: SUPPLIERS.map((s) => s.name) } });
    const demoCompanies = await Company.find({ name: { $in: CUSTOMERS.map((c) => c.company) } }).select('_id');
    const companyIds = demoCompanies.map((c) => c._id);
    await Customer.deleteMany({ company: { $in: companyIds } });
    await Order.deleteMany({ company: { $in: companyIds } });
    await Invoice.deleteMany({ company: { $in: companyIds } });
    await Payment.deleteMany({ company: { $in: companyIds } });
    await Shipment.deleteMany({ company: { $in: companyIds } });
    await Company.deleteMany({ _id: { $in: companyIds } });
}

async function seed(): Promise<void> {
    console.log('🌱 Seeding demo data…');

    // Suppliers
    const suppliers = [];
    for (const s of SUPPLIERS) {
        // eslint-disable-next-line no-await-in-loop
        const supplier = await Supplier.findOneAndUpdate(
            { name: s.name },
            { $setOnInsert: { name: s.name, contactName: s.contact, isActive: true } },
            { upsert: true, new: true },
        );
        suppliers.push(supplier);
    }

    // Products (+ deterministic opening stock)
    const products = [];
    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        // eslint-disable-next-line no-await-in-loop
        const product = await Product.findOneAndUpdate(
            { sku: p.sku },
            {
                $setOnInsert: {
                    ...p, unit: 'unit', currency: 'ILS', isActive: true,
                    stockTrackingEnabled: true, tags: [DEMO_TAG],
                    supplierId: suppliers[i % suppliers.length]._id,
                },
            },
            { upsert: true, new: true },
        );
        products.push(product);
        // eslint-disable-next-line no-await-in-loop
        await applyMovement({ productId: product._id, type: 'adjustment', quantity: 100 + i * 20, reason: 'demo opening stock' });
    }

    // Customers (company + CRM customer)
    const companies = [];
    for (const c of CUSTOMERS) {
        // eslint-disable-next-line no-await-in-loop
        const company = await Company.findOneAndUpdate(
            { name: c.company },
            { $setOnInsert: { name: c.company, isActive: true } },
            { upsert: true, new: true },
        );
        companies.push(company);
        // eslint-disable-next-line no-await-in-loop
        await Customer.findOneAndUpdate(
            { company: company._id },
            { $setOnInsert: { company: company._id, contactName: c.contact, status: 'active', tags: [DEMO_TAG] } },
            { upsert: true },
        );
    }

    // Orders + invoices + payments + shipments — one chain per customer.
    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        const product = products[i % products.length];
        const qty = 5 + i;
        const subtotal = product.price * qty;
        const taxTotal = Math.round(subtotal * 0.17);
        const total = subtotal + taxTotal;

        // eslint-disable-next-line no-await-in-loop
        const existing = await Order.findOne({ company: company._id, notes: 'demo order' });
        if (existing) continue;

        // eslint-disable-next-line no-await-in-loop
        const order = await Order.create({
            company: company._id,
            createdBy: undefined,
            items: [{ productId: product._id, productName: product.name, quantity: qty, price: product.price, taxRate: 17 }],
            totalAmount: total,
            subtotal,
            taxTotal,
            status: 'approved',
            notes: 'demo order',
            timeline: [{ type: 'order_created', at: new Date() }],
        });

        // eslint-disable-next-line no-await-in-loop
        const invoice = await Invoice.create({
            company: company._id,
            order: order._id,
            invoiceNumber: `DEMO-INV-${1000 + i}`,
            totalAmount: total,
            status: 'issued',
            paymentStatus: i === 0 ? 'paid' : 'unpaid',
            amountPaid: i === 0 ? total : 0,
            dueDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        });

        if (i === 0) {
            // eslint-disable-next-line no-await-in-loop
            await Payment.create({
                invoice: invoice._id,
                company: company._id,
                amount: total,
                method: 'bank_transfer',
                status: 'posted',
                paidAt: new Date(),
            });
        }

        // eslint-disable-next-line no-await-in-loop
        await Shipment.create({
            order: order._id,
            company: company._id,
            status: i === 0 ? 'delivered' : 'pending',
            courier: 'Demo Courier',
            timeline: [{ type: 'shipment_created', at: new Date() }],
        });
    }

    console.log(`✅ Demo seed complete: ${products.length} products, ${companies.length} customers, ${suppliers.length} suppliers.`);
}

async function main(): Promise<void> {
    await connectDatabase();
    if (process.argv.includes('--reset')) {
        await reset();
    }
    await seed();
    await disconnectDatabase();
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ seedDemo failed:', err);
    process.exit(1);
});
