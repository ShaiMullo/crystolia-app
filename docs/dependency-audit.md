# Crystolia — Dependency Audit

> **Read-only.** No packages were installed, upgraded, or removed; no
> `package.json` or lockfile was modified; no `npm audit fix` was run. All
> remediation below is **advisory only**. Generated 2026-06-22.
>
> Data sources: `npm audit --json`, `npm outdated`, and import-grep across each
> workspace's source (excluding `node_modules`/`.next`).

## Workspaces

| Workspace | deps | devDeps | lockfile | Vulns (total) |
|---|---|---|---|---|
| backend | 12 | 14 | yes | **20** (12 high, 8 moderate) |
| frontend-admin | 12 | 10 | yes | **15** (1 critical, 6 high, 7 moderate, 1 low) |
| frontend-client | 11 | 9 | yes | **15** (1 critical, 6 high, 7 moderate, 1 low) |
| landing | 4 | 6 | yes | **2** (1 critical, 1 moderate) |
| leads-api | 0 | 0 | **no** | n/a (no manifest deps) |

---

## 1. Unused dependencies (verified by full-tree import-grep)

| Workspace | Package | Evidence | Class |
|---|---|---|---|
| frontend-admin | **exceljs** | 0 references in app/components/lib | LIKELY SAFE TO REMOVE |
| frontend-admin | **file-saver** (+ `@types/file-saver`) | 0 references | LIKELY SAFE TO REMOVE |
| frontend-admin | **react-icons** | 0 references (uses `lucide-react`, 49 files) | LIKELY SAFE TO REMOVE |
| frontend-admin | **react-hook-form** | 0 references | LIKELY SAFE TO REMOVE |
| frontend-admin | **server-only** | 0 references | NEEDS REVIEW |
| frontend-client | **exceljs** | 0 references | LIKELY SAFE TO REMOVE |
| frontend-client | **file-saver** (+ `@types/file-saver` if present) | 0 references | LIKELY SAFE TO REMOVE |
| root (`crystolia-app/package.json`) | **@aws-sdk/client-sns** | 0 references in any source | NEEDS REVIEW (see cleanup report #4) |

Notes:
- **frontend-client** *does* use `react-icons` (1), `server-only` (1),
  `react-hook-form` (2) — keep those there.
- **backend `dotenv`** is **used** (`import 'dotenv/config'`) — not unused.
- These are import-grep results; confirm there's no dynamic/`require`/string-built
  import before removing. **No removal performed.**

## 2. Outdated dependencies

**Major upgrades available (breaking — plan deliberately):**

| Package | Current | Latest | Workspaces | Note |
|---|---|---|---|---|
| next | 16.0.5 | 16.2.9 | admin, client, landing | *minor*, but includes the security fix (see §5) |
| mongoose | 8.22.1 | 9.7.1 | backend | major (8→9) |
| express | 4.22.1 | 5.2.1 | backend | major (4→5) |
| eslint | 8.57.1 / 9.39 | 10.5.0 | all | major(s) |
| typescript | 5.9.3 | 6.0.3 | all | major (5→6) |
| @typescript-eslint/* | 6.21.0 | 8.61.1 | backend | 2 majors behind |
| @types/node | 20.x | 26.0.0 | all | track your Node runtime, not latest |
| helmet | 7.2.0 | 8.2.0 | backend | major |
| bcryptjs | 2.4.3 | 3.0.3 | backend | major |
| lucide-react | 0.562.0 | 1.21.0 | all FE | major (icon lib) |
| react / react-dom | 19.2.0 | 19.2.7 | all FE | patch |

**Minor/patch (low-risk, "wanted" already satisfiable):** axios 1.13.2→1.18.0
(security — see §5), express-rate-limit 8.2.1→8.5.2, dotenv 17.2.3→17.4.2,
mongoose 8.22.1→8.24.0 (within major), tailwindcss/@tailwindcss/postcss
4.1.x→4.3.1, react-hook-form 7.71→7.80, jose 6.1.3→6.2.3, react-icons 5.5→5.6.

## 3. Deprecated dependencies

| Package | Where | Why | Class |
|---|---|---|---|
| **@types/express-rate-limit** | backend devDeps | Stub types package — `express-rate-limit` ships its own types since v6; this `@types` package is deprecated/empty. | LIKELY SAFE TO REMOVE |
| Transitive advisories (axios, follow-redirects, next) | see §5 | superseded by patched versions | upgrade, don't remove |

No other directly-declared package is hard-deprecated. (Confirm `@types/express`
v4 stays paired with `express` v4 — do **not** bump `@types/express` to 5 while on
express 4.)

## 4. Duplicate packages

- **Two icon libraries**: `lucide-react` **and** `react-icons` are both declared
  in frontend-admin and frontend-client. Admin uses only `lucide-react`
  (`react-icons` unused → remove). Client uses both — consider standardizing on
  one to cut bundle size. **Class: NEEDS REVIEW.**
- **axios** is pinned to the same `1.13.2` across backend/admin/client. These are
  separate installs (each workspace has its own `node_modules`), so it's not an
  in-tree duplicate, but it does mean the §5 axios CVEs must be fixed in **three**
  places.
- No conflicting multiple-major copies of `react`/`next` were observed across
  frontends (all on 19.2.0 / 16.0.5).

## 5. Security vulnerabilities (from `npm audit`, read-only)

> These overlap with `docs/security-audit.md`; dependency-level CVEs are detailed
> here, app-level config issues there.

**Critical**
- **Next.js — Middleware/Proxy bypass (App Router segment-prefetch), incomplete-fix
  follow-up** — `GHSA-26hh-7cqf-hhc6`. Affects **landing, frontend-admin,
  frontend-client** (all on `next@16.0.5`). **Fix:** upgrade to `next@16.2.9`.
  Given admin uses `middleware.ts` for auth gating, this is **high priority**.

**High / Moderate**
- **axios `1.13.2`** (backend, admin, client) — multiple advisories:
  `GHSA-m7pr-hjqh-92cm` (NO_PROXY bypass → SSRF), `GHSA-q8qp-cvcw-x6jj`
  (prototype-pollution gadget / credential injection), `GHSA-pjwm-pj3p-43mv`
  (IPv4-mapped IPv6 NO_PROXY bypass). **Fix:** upgrade axios to `1.18.0` (the
  "wanted" target) in all three workspaces.
- **follow-redirects `<=1.15.11`** (transitive via axios) — flagged in admin/client;
  resolved by the axios bump.

**Totals:** backend 20 (12 high / 8 moderate), admin 15 (1 crit/6 high/7 mod/1 low),
client 15 (same), landing 2 (1 crit/1 mod).

## 6. Workspace-by-workspace summary

- **backend** — Healthy set, all 12 runtime deps are imported and used. Main risks:
  **axios CVEs** (upgrade to 1.18.0) and many *major* upgrades deferred (mongoose 9,
  express 5, eslint 10, ts 6) — these are roadmap items, not emergencies. Remove
  deprecated `@types/express-rate-limit`.
- **frontend-admin** — Carries **5 unused deps** (exceljs, file-saver, react-icons,
  react-hook-form, + `server-only` to confirm). **Critical Next.js CVE** + axios
  CVEs. Highest cleanup payoff.
- **frontend-client** — 2 unused deps (exceljs, file-saver). Same Next.js + axios
  CVEs.
- **landing** — Lean (4 deps). Only issue is the **critical Next.js CVE** → bump to
  16.2.9.
- **leads-api** — No dependency manifest with deps (and no lockfile). Confirm it's a
  real service or a stub; if active, it needs its own `package.json`/lockfile for
  reproducible installs. **NEEDS REVIEW.**

## 7. Recommendations (prioritized)

**P0 — Security (do first, in a controlled PR):**
1. Upgrade **Next.js → 16.2.9** in landing, frontend-admin, frontend-client (critical middleware-bypass CVE).
2. Upgrade **axios → 1.18.0** in backend, frontend-admin, frontend-client (SSRF / prototype-pollution).

**P1 — Low-risk hygiene:**
3. Remove confirmed **unused deps** (admin: exceljs, file-saver, react-icons, react-hook-form; client: exceljs, file-saver) after a final dynamic-import check.
4. Remove deprecated **@types/express-rate-limit**.
5. Resolve the **two-icon-library** duplication (standardize on `lucide-react`).
6. Decide on root **@aws-sdk/client-sns** / root package.json (see cleanup report).

**P2 — Roadmap (breaking majors, schedule deliberately, test heavily):**
7. mongoose 8→9, express 4→5 (+ `@types/express` 5), eslint→10, typescript→6, helmet→8, bcryptjs→3, lucide-react→1, tailwind 4.3.
8. Pin `@types/node` to your deployed Node major (not 26) to avoid type drift.

**P3 — Process:**
9. Give **leads-api** a proper manifest/lockfile or remove it.
10. Add automated `npm audit` to CI (report-only gate) so these don't accumulate.

> **No changes were made.** Apply the above only via reviewed PRs with full
> typecheck/build/test runs.
