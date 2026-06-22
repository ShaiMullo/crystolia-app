# Crystolia — Security Audit

> **Read-only.** No files were modified or deleted, no secrets rotated, no env/
> CORS/JWT/cookie settings changed. All secret *values* below are **redacted** —
> this report names categories and locations, never the secrets themselves.
> Generated 2026-06-22.
>
> Overall posture is **good**: JWT is mandatory, cookies are hardened, CORS is
> strict, CI uses `${{ secrets.* }}` + OIDC, and Helm/infra secrets are templated
> (no literals in git). The findings below are mostly **operational hygiene** and a
> few concrete code/dependency issues.

## Scope
`crystolia-app` (git repo: `git@github.com:ShaiMullo/crystolia-app.git`) + relevant
on-disk artifacts. Method: `git grep`/`git ls-files` (committed vs untracked),
config review (`config/index.ts`, `index.ts`, `routes/auth.ts`, `middleware/`),
Helm/Terraform/CI inspection.

---

## 1. Secret / key scan (committed code)

- **No live cloud keys, private keys, PATs, or DB credential strings are committed.**
  Scans for `AKIA…`, `BEGIN … PRIVATE KEY`, `ghp_…`, `github_pat_…`, `xox…`, and
  `mongodb+srv://user:pass@…` returned **no real secrets in tracked files**.
- **Committed default credentials (HIGH):** seed/util scripts hardcode well-known
  passwords — `backend/src/scripts/seed.ts` (`Admin123!`, `Agent123!`),
  `backend/src/db/seedAdmin.ts` (`Admin123!`),
  `backend/src/scripts/verify_admin_features.ts` (`…123`). If any of these run
  against a production DB, a publicly-guessable admin login exists.
- **Field-name noise:** the bulk of `password` grep hits are UI labels / TS
  interface fields (`AuthPage.tsx`, `User.ts`, etc.) — not secrets.
- **Infra templates are clean:** `helm/crystolia-chart/templates/secret.yaml` uses
  `{{ .Values.secrets.* | quote }}` placeholders; `helm/secrets.template.yaml` is a
  fill-in template; `docs/deployment/secrets.md` documents secret *names/keys* and
  states "No secrets in git." No literal values found.

## 2. `.env` / `.env.demo` exposure review

- **`backend`/root `.env`** — **NOT committed** (gitignored; `git ls-files` confirms
  untracked). On disk it contains real secrets: `MONGO_URI`, `JWT_SECRET`,
  `COOKIE_SECRET`, `GOOGLE_CLIENT_SECRET`, `ADMIN_PASSWORD`, Google OAuth IDs.
  Risk is **at-rest local exposure only** (laptop/backup), not repo exposure.
  **Severity: Medium.**
- **`deploy/demo/.env.demo`** — **NOT committed**; contains only non-secret config
  (`*_DOMAIN`, `ACME_EMAIL`, `IMAGE_*`). **Severity: Low.**
- **Good practice in place:** `.gitignore` rules `.env`, `.env.*` with an allowlist
  for `*.demo.example`; `.example`/`.demo.example` files hold placeholders only.

## 3. `admin.cookies` review

- Location: `/Users/shaimullo/projects/admin.cookies` (sibling, **outside** the repo
  → not committed). Format: Netscape HTTP Cookie File (5 lines) — a saved **admin
  session cookie jar** (the `auth_token`).
- Risk: a **live/again-replayable admin auth token at rest** on disk. Anyone with
  file access could replay the session until it expires (JWT exp = 1 day).
- **Severity: Medium.** Recommend deleting it and not persisting auth cookies to
  disk; if it was ever shared/committed elsewhere, rotate `JWT_SECRET` (invalidates
  all tokens).

## 4. JWT configuration review — **GOOD**

- `JWT_SECRET` is **mandatory**: `config/index.ts` throws on boot if unset (no weak
  fallback). ✅
- Expiry: `JWT_EXPIRES_IN` default `1d`; cookie maxAge derived from
  `JWT_COOKIE_EXPIRES_IN`. Reasonable.
- Token transported as an **httpOnly cookie** (`auth_token`), not in JS-readable
  storage. ✅
- **Recommendations (Low):** ensure the deployed `JWT_SECRET` is long/high-entropy;
  consider shortening prod expiry + refresh tokens; consider per-session
  revocation (currently only `JWT_SECRET` rotation invalidates tokens).

## 5. CORS review — **GOOD, with one note**

- `index.ts`: `cors({ origin: config.corsOrigins, credentials: true })` — **no
  wildcard**, explicit allowlist from `CORS_ALLOW_ORIGINS` (default localhost:3000/3001).
  Correct pattern for credentialed cookies. ✅
- **Note (Low):** verify the production `CORS_ALLOW_ORIGINS` env is set to the exact
  admin/client domains (the default is localhost). A misconfigured/empty value
  would block prod or, if widened, weaken isolation.

## 6. Cookie / session & CSRF review — **GOOD, with one concrete bug**

- Cookies set with `httpOnly: true`, `secure: config.secureCookie`
  (`= NODE_ENV==='production'`), `sameSite: 'lax'`. ✅ `cookieDomain` defaults to
  host-only. ✅
- `helmet()` enabled. ✅
- CSRF: custom `middleware/csrf.ts` verifies `Origin`/`Referer` against
  `config.corsOrigins` for state-changing methods, blocks when both are missing. ✅
- **Bug (Medium): prefix-match CSRF/Origin check.** `csrf.ts` uses
  `source.startsWith(allowed)`. An attacker origin like
  `https://admin.crystolia.com.evil.com` **starts with** an allowed
  `https://admin.crystolia.com`, so the check passes → CSRF/origin bypass. Use an
  **exact origin match** (parse and compare the full origin), not `startsWith`.
  (The CORS layer is exact, but this hand-rolled check is not.)

## 7. Hardcoded IP review

- **Committed source: none.** `git grep` for public IPv4 (excluding
  loopback/private/`0.0.0.0`) found **no hardcoded public IPs in tracked files**. ✅
- **Local `tools/local/*.command` (gitignored): yes.** They embed public IPs
  (a server IP `5.28.x.x`, DNS `8.8.x.x`, and `98.88.x.x`). This is exactly why
  they are git-ignored (per `tools/local/README.md`). **Severity: Low** — keep them
  out of git; treat the embedded server/home IP as sensitive.

## 8. Public-repo exposure risk

- Repo is hosted on GitHub (`ShaiMullo/crystolia-app`). **Action required: confirm
  the repository is PRIVATE.** If public:
  - the committed **default seed passwords** (§1) become an immediate **HIGH** risk;
  - the Hebrew infra guides (`docs/infrastructure/stage1-atlas.md`,
    `cheap-production-next-steps.md`) expose Atlas/PAT *setup instructions* and
    URI **templates** (no embedded creds observed, but verify) — informational
    exposure of architecture.
- No `.env`, keys, or cookie jars are committed, so the primary leak vectors are
  closed regardless.

## 9. AWS / Terraform / credentials risk review — **GOOD**

- `terraform-cheap/`: **no hardcoded secrets/access keys/tokens** in `*.tf`
  (values come from variables). ✅
- CI: GitHub Actions reference everything via `${{ secrets.* }}`
  (`GITOPS_APP_PRIVATE_KEY`, `DEMO_SSH_KEY`, `GHCR_PAT`, `GITHUB_TOKEN`, …) —
  **no inline literal secrets**. ✅ `docs/deployment/secrets.md` states CI uses
  **OIDC for AWS** (no static cloud creds). ✅
- **Recommendations (Low):** ensure Terraform **state** (which can contain
  sensitive outputs) is stored in a private, encrypted backend (gitignore already
  excludes `*.tfstate`); confirm least-privilege on the OIDC role and the
  `GHCR_PAT` scope.

## 10. MongoDB Atlas exposure review

- `config.mongoUri` defaults to `mongodb://localhost:27017/crystolia`; real URI
  injected via env / K8s `Secret` (`MONGO_URI`). **No Atlas credential string is
  committed.** ✅
- `docs/infrastructure/stage1-atlas.md` / `cheap-production-next-steps.md` contain
  **template** connection strings (`…mongodb.net/…?retryWrites=…`) without embedded
  user:pass in the scanned lines — they are setup guides. **Verify** no real
  user/password was pasted into these guides. **Severity: Low–Medium** (informational
  if repo is private).
- **Recommendations:** enforce Atlas **IP allowlist / PrivateLink**, a
  least-privilege DB user, and rotation. (These also matter for the future Comax
  egress IP allowlisting.)

## 11. Recommendations by severity

### 🔴 Critical
1. **Patch dependency CVEs** (cross-ref `docs/dependency-audit.md`): Next.js
   `16.0.5` middleware/proxy-bypass (`GHSA-26hh-7cqf-hhc6`) in landing + both
   frontends → `next@16.2.9`. Admin gates auth in `middleware.ts`, so this is
   security-relevant, not cosmetic.

### 🟠 High
2. **Remove/replace committed default seed passwords** (`Admin123!`, `Agent123!`,
   `…123`). Make seed scripts read an env var or generate a random password printed
   once; never ship a guessable admin login. Verify no prod DB was seeded with these.
3. **Confirm the GitHub repo is private.** If public, #2 and the infra guides are
   urgent.
4. **axios SSRF / prototype-pollution CVEs** (backend/admin/client) → `axios@1.18.0`.

### 🟡 Medium
5. **Fix CSRF/Origin prefix-match bug** in `middleware/csrf.ts` — use exact origin
   comparison instead of `startsWith`.
6. **Rotate & delete the `admin.cookies` jar**; stop persisting auth cookies to disk.
7. **Protect local `.env`** (full-disk encryption, exclude from backups/sync);
   confirm prod `JWT_SECRET`/`CORS_ALLOW_ORIGINS` are set correctly (not defaults).

### 🟢 Low
8. Treat gitignored `*.command` files (embedded server IP) as sensitive; keep out of git.
9. Verify Atlas IP allowlist/least-privilege user; verify Terraform state backend is
   private+encrypted; confirm OIDC role + `GHCR_PAT` least-privilege.
10. Consider shorter prod JWT expiry + refresh tokens + per-session revocation.

---

*No remediation was applied. This document is advisory; fix items via reviewed
changes (and rotate any secret that may have been exposed).*
