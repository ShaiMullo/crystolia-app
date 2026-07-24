// ===============================================
// 🌱 Demo Seed — realistic development dataset
// ===============================================
//   npm run seed:demo           (additive seed)
//   npm run seed:demo -- --reset (wipe demo data first)
//
// Deterministic: same inputs → same dataset (no randomness).
// Development-only — load .env before checking, then require an explicit
// development value. This prevents a production URI in .env from slipping
// past the guard when NODE_ENV was not exported by the parent shell.
import 'dotenv/config';

if (process.env.NODE_ENV !== 'development') {
    console.error('❌ seedDemo refuses to run outside development.');
    process.exit(1);
}

import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import Company from '../models/Company.js';
import Customer from '../models/Customer.js';
import Lead from '../models/Lead.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import Inventory from '../models/Inventory.js';
import InventoryMovement from '../models/InventoryMovement.js';
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

const LEADS = [
    { name: 'Noa Peretz', companyName: 'Carmel Deli', phone: '050-0000001', email: 'noa@demo.example', message: 'Interested in wholesale olive oil pricing', status: 'new' as const },
    { name: 'Eli Mizrahi', companyName: 'Sharon Catering', phone: '050-0000002', email: 'eli@demo.example', message: 'Looking for monthly 5L supply', status: 'contacted' as const },
];

async function reset(): Promise<void> {
    console.log('🗑️  Resetting demo data…');
    // Demo records are tagged or prefixed so resets never touch real data.
    const demoProducts = await Product.find({ sku: /^DEMO-/ }).select('_id');
    const productIds = demoProducts.map((product) => product._id);
    await InventoryMovement.deleteMany({ product: { $in: productIds } });
    await Inventory.deleteMany({ product: { $in: productIds } });
    await Product.deleteMany({ _id: { $in: productIds } });
    await Supplier.deleteMany({ name: { $in: SUPPLIERS.map((s) => s.name) } });
    await Lead.deleteMany({ tags: DEMO_TAG });
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
        // Opening stock only once — re-runs must not inflate inventory.
        // eslint-disable-next-line no-await-in-loop
        const hasOpeningStock = await InventoryMovement.exists({ product: product._id, reason: 'demo opening stock' });
        if (!hasOpeningStock) {
            // eslint-disable-next-line no-await-in-loop
            await applyMovement({ productId: product._id, type: 'adjustment', quantity: 100 + i * 20, reason: 'demo opening stock' });
        }
    }

    // Leads — the top of the funnel, shown on the admin Leads screen.
    for (const l of LEADS) {
        // eslint-disable-next-line no-await-in-loop
        await Lead.findOneAndUpdate(
            { phone: l.phone },
            {
                $setOnInsert: {
                    ...l,
                    source: 'demo-seed',
                    tags: [DEMO_TAG],
                    timeline: [{ type: 'lead_created', at: new Date() }],
                },
            },
            { upsert: true },
        );
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

    // Orders + invoices + payments + shipments — one chain per customer,
    // telling a coherent story across the whole lifecycle:
    //   customer 0: completed order, paid invoice, delivered shipment
    //   customer 1: approved order, issued (unpaid) invoice, pending shipment
    //   customer 2: pending order, draft invoice (no PDF yet), no shipment
    for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        const product = products[i % products.length];
        const qty = 5 + i;
        const subtotal = product.price * qty;
        const taxTotal = Math.round(subtotal * 0.17);
        const total = subtotal + taxTotal;
        const stage: 'completed' | 'approved' | 'pending' =
            i === 0 ? 'completed' : i === 1 ? 'approved' : 'pending';

        // eslint-disable-next-line no-await-in-loop
        const existing = await Order.findOne({ company: company._id, notes: 'demo order' });
        if (existing) continue;

        const dayMs = 24 * 3600 * 1000;
        const createdAt = new Date(Date.now() - (7 - i) * dayMs);
        const timeline: Array<{ type: string; at: Date; meta?: Record<string, unknown> }> = [
            { type: 'order_created', at: createdAt },
        ];
        if (stage !== 'pending') {
            timeline.push({ type: 'status_changed', at: new Date(createdAt.getTime() + dayMs), meta: { from: 'pending', to: 'approved' } });
        }
        if (stage === 'completed') {
            timeline.push({ type: 'status_changed', at: new Date(createdAt.getTime() + 3 * dayMs), meta: { from: 'approved', to: 'completed', via: 'shipment_delivered' } });
        }

        // eslint-disable-next-line no-await-in-loop
        const order = await Order.create({
            company: company._id,
            createdBy: undefined,
            items: [{ productId: product._id, productName: product.name, quantity: qty, price: product.price, taxRate: 17 }],
            totalAmount: total,
            subtotal,
            taxTotal,
            status: stage,
            notes: 'demo order',
            timeline,
        });

        // eslint-disable-next-line no-await-in-loop
        const invoice = await Invoice.create({
            company: company._id,
            order: order._id,
            invoiceNumber: `DEMO-INV-${1000 + i}`,
            totalAmount: total,
            // The pending order keeps a draft invoice with no pdfUrl, so the
            // customer dashboard shows the "PDF available after issuance" state.
            status: stage === 'pending' ? 'draft' : 'issued',
            paymentStatus: stage === 'completed' ? 'paid' : 'unpaid',
            amountPaid: stage === 'completed' ? total : 0,
            dueDate: new Date(Date.now() + 14 * dayMs),
        });

        if (stage === 'completed') {
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

        if (stage !== 'pending') {
            // eslint-disable-next-line no-await-in-loop
            await Shipment.create({
                order: order._id,
                company: company._id,
                status: stage === 'completed' ? 'delivered' : 'pending',
                courier: 'Demo Courier',
                timeline: [{ type: 'shipment_created', at: new Date(createdAt.getTime() + 2 * dayMs) }],
            });
        }
    }

    console.log(`✅ Demo seed complete: ${products.length} products, ${companies.length} customers, ${suppliers.length} suppliers, ${LEADS.length} leads.`);
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
