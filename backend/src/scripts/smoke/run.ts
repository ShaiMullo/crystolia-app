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

    // ── public website lead flow ──
    // Simulates the landing contact form: unauthenticated, cross-origin from a
    // landing domain (also exercises the CORS/CSRF origin allow-list). The
    // suite is RE-RUNNABLE: each block resets the in-memory rate limiter via
    // the admin system endpoint, so deliberate 429s never poison later tests
    // or a second consecutive run.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same loose shape as api() above
    const publicApi = async (path: string, bodyObj: unknown, origin: string | null = 'https://crystolia.com'): Promise<{ status: number; body: any }> => {
        const res = await fetch(`${BASE}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(origin ? { Origin: origin } : {}), // no auth cookie ever
            },
            body: JSON.stringify(bodyObj),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- same loose shape as api() above
        let body: any = null;
        try { body = await res.json(); } catch { /* non-JSON */ }
        return { status: res.status, body };
    };

    const resetLeadLimiter = async (): Promise<void> => {
        const { status } = await api('/api/v1/system/rate-limit/reset', { method: 'POST' });
        if (status !== 200) throw new Error(`rate-limit reset returned ${status}`);
    };

    const uuid = (): string => crypto.randomUUID();
    const LEAD_PHONE = '0549000001';           // normalizes to 972549000001
    const LEAD_PHONE_2 = '0549000002';
    const LEAD_PHONE_C = '0549000004';         // create-path concurrency
    const HONEYPOT_PHONE = '0549000003';
    const leadIds: string[] = [];

    // ── block A: core flow + idempotency ──
    await resetLeadLimiter();

    const attemptA = uuid();
    await test('leads: public create returns minimal safe response', async () => {
        const { status, body } = await publicApi('/api/v1/leads', {
            name: 'Crystolia Automated Test',
            phone: LEAD_PHONE,
            message: 'TEST — DO NOT CONTACT (smoke)',
            locale: 'he',
            sourcePage: '/he',
            utm: { utm_source: 'smoke', utm_medium: 'test' },
            submissionId: attemptA,
        });
        expect(status === 201, `create returned ${status}`);
        expect(body?.success === true, 'no success flag');
        expect(!!body?.leadId, 'no leadId in response');
        expect(body?.lead === undefined, 'public response leaks the full lead document');
        leadIds.push(body.leadId);
    });

    await test('leads: same submissionId replays without a second contact', async () => {
        const { status, body } = await publicApi('/api/v1/leads', {
            name: 'Crystolia Automated Test',
            phone: LEAD_PHONE,
            message: 'TEST — DO NOT CONTACT (smoke)',
            submissionId: attemptA,
        });
        expect(status === 201, `replay returned ${status}`);
        expect(body?.leadId === leadIds[0], 'replay returned a different lead');
        const got = await api(`/api/v1/leads/${leadIds[0]}`);
        expect(got.body?.lead?.contactCount === 1, `contactCount is ${got.body?.lead?.contactCount}, expected 1 after replay`);
    });

    await test('leads: new submission upserts the same lead, no duplicate', async () => {
        const before = await api(`/api/v1/leads/${leadIds[0]}`);
        const countBefore = before.body?.lead?.contactCount ?? 0;
        const { status, body } = await publicApi('/api/v1/leads', {
            name: 'Crystolia Automated Test',
            phone: LEAD_PHONE,
            message: 'TEST — second contact',
            submissionId: uuid(),
        });
        expect(status === 201, `repeat returned ${status}`);
        expect(body?.leadId === leadIds[0], 'repeat created a different lead');
        const got = await api(`/api/v1/leads/${leadIds[0]}`);
        expect(got.body?.lead?.contactCount === countBefore + 1,
            `contactCount is ${got.body?.lead?.contactCount}, expected ${countBefore + 1}`);
    });

    await test('leads: attribution + initial status stored', async () => {
        const { body } = await api(`/api/v1/leads/${leadIds[0]}`);
        const lead = body?.lead;
        expect(lead?.status === 'new', `status is ${lead?.status}, not "new"`);
        expect(lead?.locale === 'he', `locale is ${lead?.locale}`);
        expect(lead?.sourceDomain === 'crystolia.com', `sourceDomain is ${lead?.sourceDomain} (must come from the Origin header)`);
        expect(lead?.sourcePage === '/he', `sourcePage is ${lead?.sourcePage}`);
        expect(lead?.source === 'website', `source is ${lead?.source}, not forced to "website"`);
        expect(lead?.utm?.utm_source === 'smoke', 'utm_source not stored');
        expect(lead?.phone === '972549000001', `phone not normalized: ${lead?.phone}`);
    });

    await test('leads: internal fields from public are ignored', async () => {
        const { status, body } = await publicApi('/api/v1/leads', {
            name: 'Crystolia Automated Test 2',
            phone: LEAD_PHONE_2,
            status: 'won',
            ownerId: 'evil',
            assignedTo: 'evil',
            isDeleted: true,
            tags: ['vip'],
            source: 'evil-source',
            sourceDomain: 'evil.example',
            submissionId: uuid(),
        });
        expect(status === 201, `create returned ${status}`);
        leadIds.push(body.leadId);
        const got = await api(`/api/v1/leads/${body.leadId}`);
        const lead = got.body?.lead;
        expect(lead?.status === 'new', `status is ${lead?.status}, not "new"`);
        expect((lead?.tags || []).length === 0, 'public tags were not ignored');
        expect(!lead?.ownerId && !lead?.assignedTo, 'owner/assignee accepted from public payload');
        expect(lead?.source === 'website', `source is ${lead?.source} — body source must be ignored`);
        expect(lead?.sourceDomain === 'crystolia.com', `sourceDomain is ${lead?.sourceDomain} — body sourceDomain must be ignored`);
    });

    // ── block B: validation matrix ──
    await resetLeadLimiter();

    await test('leads: whitespace-only name rejected with 400', async () => {
        const { status } = await publicApi('/api/v1/leads', { name: '   ', phone: '0541111111' });
        expect(status === 400, `returned ${status}`);
    });

    await test('leads: missing name rejected with 400', async () => {
        const { status } = await publicApi('/api/v1/leads', { phone: '0541111111' });
        expect(status === 400, `returned ${status}`);
    });

    await test('leads: invalid email rejected with 400', async () => {
        const { status } = await publicApi('/api/v1/leads', {
            name: 'Crystolia Automated Test', phone: '0541111111', email: 'not-an-email',
        });
        expect(status === 400, `returned ${status}`);
    });

    await test('leads: too-short and too-long phones rejected with 400', async () => {
        const short = await publicApi('/api/v1/leads', { name: 'Crystolia Automated Test', phone: '12' });
        expect(short.status === 400, `short phone returned ${short.status}`);
        const long = await publicApi('/api/v1/leads', { name: 'Crystolia Automated Test', phone: '1234567890123456' });
        expect(long.status === 400, `16-digit phone returned ${long.status}`);
    });

    await test('leads: sanitation — bidi phone, valid email, oversized message, junk attribution', async () => {
        // One submission carrying every hostile-but-plausible field at once.
        const { status, body } = await publicApi('/api/v1/leads', {
            name: '  Crystolia Automated Test 3  ',
            phone: '\u200e+972 54-900-0005\u200f',      // RTL bidi marks around a real number
            email: 'test.intl+tag@example.co.il',
            message: 'M'.repeat(2500),                    // over the 2000 cap
            locale: 'xx',                                 // not allow-listed
            sourcePage: 'https://evil.example/phish',     // external URL — must be dropped
            utm: 'not-an-object',
            submissionId: uuid(),
        });
        expect(status === 201, `returned ${status}`);
        leadIds.push(body.leadId);
        const got = await api(`/api/v1/leads/${body.leadId}`);
        const lead = got.body?.lead;
        expect(lead?.name === 'Crystolia Automated Test 3', `name not trimmed: "${lead?.name}"`);
        expect(lead?.phone === '972549000005', `bidi phone not normalized server-side: ${lead?.phone}`);
        expect(lead?.email === 'test.intl+tag@example.co.il', `email is ${lead?.email}`);
        expect((lead?.message || '').length === 2000, `message length ${lead?.message?.length}, expected capped 2000`);
        expect(lead?.locale === undefined, `unsupported locale stored: ${lead?.locale}`);
        expect(lead?.sourcePage === undefined, `external sourcePage stored: ${lead?.sourcePage}`);
        expect(lead?.utm === undefined, `malformed utm stored: ${JSON.stringify(lead?.utm)}`);
    });

    await test('leads: honeypot submission pretends success, stores nothing', async () => {
        const { status, body } = await publicApi('/api/v1/leads', {
            name: 'Bot', phone: HONEYPOT_PHONE, website: 'http://spam.example',
        });
        expect(status === 201, `returned ${status}`);
        expect(body?.success === true, 'honeypot did not pretend success');
        expect(!body?.leadId, 'honeypot response contains a leadId');
        const list = await api('/api/v1/leads?search=972549000003');
        expect((list.body?.data?.leads || []).length === 0, 'honeypot lead was stored');
    });

    // ── block C: origins, CORS and preflights ──
    await resetLeadLimiter();

    await test('leads: disallowed and missing Origins are rejected with 403', async () => {
        const evil = await publicApi('/api/v1/leads', { name: 'X', phone: '0541111111' }, 'https://evil.example');
        expect(evil.status === 403, `disallowed origin returned ${evil.status}`);
        const none = await publicApi('/api/v1/leads', { name: 'X', phone: '0541111111' }, null);
        expect(none.status === 403, `missing origin returned ${none.status}`);
    });

    await test('leads: CORS preflight echoes each landing origin exactly', async () => {
        const origins = [
            'https://crystolia.com', 'https://www.crystolia.com',
            'https://crystolia.ru', 'https://www.crystolia.ru',
            'https://crystolia.co.il', 'https://www.crystolia.co.il',
        ];
        for (const origin of origins) {
            // eslint-disable-next-line no-await-in-loop
            const res = await fetch(`${BASE}/api/v1/leads`, {
                method: 'OPTIONS',
                headers: {
                    Origin: origin,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'content-type',
                },
            });
            expect(res.status === 204 || res.status === 200, `preflight for ${origin} returned ${res.status}`);
            expect(res.headers.get('access-control-allow-origin') === origin,
                `ACAO for ${origin} is ${res.headers.get('access-control-allow-origin')}`);
        }
        const evil = await fetch(`${BASE}/api/v1/leads`, {
            method: 'OPTIONS',
            headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' },
        });
        expect(evil.headers.get('access-control-allow-origin') === null,
            'disallowed origin received an ACAO header');
    });

    await test('leads: preflights do not consume the POST budget', async () => {
        // The six preflights above ran since the last reset; a real POST must
        // still be within the 10/hr budget along with block C's two 403s
        // (which are rejected by csrf BEFORE the limiter).
        const { status } = await publicApi('/api/v1/leads', {
            name: 'Crystolia Automated Test', phone: LEAD_PHONE, submissionId: uuid(),
        });
        expect(status === 201, `post-preflight POST returned ${status}`);
    });

    // ── block D: concurrency ──
    await resetLeadLimiter();

    await test('leads: 5 parallel identical creates yield exactly one lead', async () => {
        const attempt = uuid();
        const payload = {
            name: 'Crystolia Automated Test Concurrent',
            phone: LEAD_PHONE_C,
            message: 'TEST — concurrency',
            submissionId: attempt,
        };
        const results = await Promise.all(
            Array.from({ length: 5 }, () => publicApi('/api/v1/leads', payload)),
        );
        for (const r of results) {
            expect(r.status === 201 && r.body?.success === true, `parallel create returned ${r.status}`);
        }
        const ids = new Set(results.map((r) => String(r.body?.leadId)));
        expect(ids.size === 1, `parallel creates returned ${ids.size} distinct leadIds`);
        const id = results[0].body.leadId;
        leadIds.push(id);
        const list = await api('/api/v1/leads?search=972549000004');
        expect((list.body?.data?.leads || []).length === 1,
            `expected exactly 1 stored lead, found ${list.body?.data?.leads?.length}`);
        const got = await api(`/api/v1/leads/${id}`);
        expect(got.body?.lead?.contactCount === 1, `contactCount is ${got.body?.lead?.contactCount}, expected 1`);
    });

    await test('leads: 5 parallel identical updates increment contactCount once', async () => {
        const before = await api(`/api/v1/leads/${leadIds[0]}`);
        const countBefore = before.body?.lead?.contactCount ?? 0;
        const attempt = uuid();
        const payload = {
            name: 'Crystolia Automated Test',
            phone: LEAD_PHONE,
            message: 'TEST — parallel repeat',
            submissionId: attempt,
        };
        const results = await Promise.all(
            Array.from({ length: 5 }, () => publicApi('/api/v1/leads', payload)),
        );
        for (const r of results) {
            expect(r.status === 201 && r.body?.success === true, `parallel update returned ${r.status}`);
        }
        const got = await api(`/api/v1/leads/${leadIds[0]}`);
        expect(got.body?.lead?.contactCount === countBefore + 1,
            `contactCount is ${got.body?.lead?.contactCount}, expected ${countBefore + 1} (exactly one increment)`);
    });

    // ── block E: rate limiting (deliberate 429, then clean up after ourselves) ──
    await resetLeadLimiter();

    await test('leads: 11th POST in the window returns 429', async () => {
        // Honeypot payloads: they count against the limiter but store nothing.
        let sawLimit = false;
        for (let i = 0; i < 11; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            const { status } = await publicApi('/api/v1/leads', {
                name: 'Bot', phone: HONEYPOT_PHONE, website: 'http://spam.example',
            });
            if (i < 10) {
                expect(status === 201, `request ${i + 1} returned ${status}, expected 201`);
            } else {
                sawLimit = status === 429;
            }
        }
        expect(sawLimit, 'request 11 was not rate-limited with 429');
    });

    await resetLeadLimiter(); // leave the backend clean for a consecutive run

    await test('cleanup: soft-delete smoke leads', async () => {
        for (const id of leadIds) {
            // eslint-disable-next-line no-await-in-loop
            const { status } = await api(`/api/v1/leads/${id}`, { method: 'DELETE' });
            expect(status === 200, `delete ${id} returned ${status}`);
        }
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
