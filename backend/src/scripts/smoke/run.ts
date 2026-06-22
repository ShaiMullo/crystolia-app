// ===============================================
// 🔥 Operational Smoke Tests
// ===============================================
// Exercises core flows against a RUNNING backend over HTTP using the
// built-in fetch — no external test framework or dependency.
//
//   npm run smoke            (expects backend on http://localhost:4000)
//   SMOKE_BASE_URL=... npm run smoke
//
// Exit code 0 = all passed, 1 = any failure.

import { resolveSeedPassword, SEED_ADMIN_PASSWORD_VAR } from '../../utils/seedCredentials.js';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:4000';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || 'admin@crystolia.com';
const ADMIN_PASSWORD = resolveSeedPassword(SEED_ADMIN_PASSWORD_VAR);

let cookie = '';
let passed = 0;
let failed = 0;

function ok(name: string) {
    passed += 1;
    console.log(`  ✅ ${name}`);
}
function fail(name: string, detail: string) {
    failed += 1;
    console.log(`  ❌ ${name} — ${detail}`);
}

async function api(path: string, init: RequestInit = {}): Promise<{ status: number; body: any }> {
    const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(cookie ? { Cookie: cookie } : {}),
            // Smoke runs server-side; satisfy the CSRF origin check.
            Origin: BASE,
            ...(init.headers || {}),
        },
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    let body: any = null;
    try { body = await res.json(); } catch { /* non-JSON */ }
    return { status: res.status, body };
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
    try {
        await fn();
        ok(name);
    } catch (err) {
        fail(name, err instanceof Error ? err.message : String(err));
    }
}

function expect(cond: boolean, msg: string): void {
    if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
    console.log(`\n🔥 Crystolia smoke tests → ${BASE}\n`);

    // ── auth flow ──
    await test('auth: login as admin', async () => {
        const { status, body } = await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
        });
        expect(status === 200, `login returned ${status}`);
        expect(!!body?.user, 'no user in login response');
    });

    await test('auth: /auth/me returns the session user', async () => {
        const { status, body } = await api('/api/auth/me');
        expect(status === 200, `me returned ${status}`);
        expect(body?.user?.role === 'admin', 'session user is not admin');
    });

    // ── system health ──
    await test('system: health endpoint responds', async () => {
        const { status, body } = await api('/api/crm/system/health');
        expect(status === 200, `health returned ${status}`);
        expect(typeof body?.data?.healthScore === 'number', 'no healthScore');
    });

    await test('system: diagnostics report topology', async () => {
        const { status, body } = await api('/api/crm/system/diagnostics');
        expect(status === 200, `diagnostics returned ${status}`);
        expect(typeof body?.data?.transactionsSupported === 'boolean', 'no transactionsSupported flag');
    });

    // ── reconciliation run ──
    await test('reconciliation: dry run completes', async () => {
        const { status, body } = await api('/api/crm/inventory/reconciliation', {
            method: 'POST',
            body: JSON.stringify({ autoFix: false }),
        });
        expect(status === 200, `reconciliation returned ${status}`);
        expect(typeof body?.data?.healthScore === 'number', 'no healthScore in result');
    });

    // ── inventory reserve / release via a throwaway product ──
    let productId = '';
    await test('inventory: create product + stock-in', async () => {
        const sku = `SMOKE-${Date.now()}`;
        const created = await api('/api/crm/products', {
            method: 'POST',
            body: JSON.stringify({ name: 'Smoke Test Product', sku, price: 10, stockTrackingEnabled: true }),
        });
        expect(created.status === 201, `product create returned ${created.status}`);
        productId = created.body?.data?._id;
        expect(!!productId, 'no product id');

        const move = await api('/api/crm/inventory/movements', {
            method: 'POST',
            body: JSON.stringify({ productId, type: 'in', quantity: 50, reason: 'smoke' }),
        });
        expect(move.status === 201, `stock-in returned ${move.status}`);
        expect(move.body?.data?.inventory?.quantity === 50, 'quantity is not 50 after stock-in');
    });

    await test('inventory: reserve then release', async () => {
        const reserve = await api('/api/crm/inventory/movements', {
            method: 'POST',
            body: JSON.stringify({ productId, type: 'reserved', quantity: 10, reason: 'smoke' }),
        });
        expect(reserve.status === 201, `reserve returned ${reserve.status}`);
        expect(reserve.body?.data?.inventory?.reservedQuantity === 10, 'reserved is not 10');

        const release = await api('/api/crm/inventory/movements', {
            method: 'POST',
            body: JSON.stringify({ productId, type: 'released', quantity: 10, reason: 'smoke' }),
        });
        expect(release.status === 201, `release returned ${release.status}`);
        expect(release.body?.data?.inventory?.reservedQuantity === 0, 'reserved is not 0 after release');
    });

    // ── cleanup ──
    await test('cleanup: soft-delete smoke product', async () => {
        if (!productId) throw new Error('no product to clean up');
        const { status } = await api(`/api/crm/products/${productId}`, { method: 'DELETE' });
        expect(status === 200, `delete returned ${status}`);
    });

    // ── read-checks for operational endpoints ──
    for (const [name, path] of [
        ['orders', '/api/crm/orders'],
        ['payments', '/api/crm/payments'],
        ['shipments', '/api/crm/shipments'],
        ['suppliers', '/api/crm/suppliers'],
        ['purchase orders', '/api/crm/purchase-orders'],
    ] as const) {
        // eslint-disable-next-line no-await-in-loop
        await test(`endpoint: ${name} list reachable`, async () => {
            const { status, body } = await api(path);
            expect(status === 200, `${name} returned ${status}`);
            expect(body?.success === true, `${name} not successful`);
        });
    }

    console.log(`\n${failed === 0 ? '✅' : '❌'} smoke: ${passed} passed, ${failed} failed\n`);
    process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
    console.error('smoke runner crashed:', err);
    process.exit(1);
});
