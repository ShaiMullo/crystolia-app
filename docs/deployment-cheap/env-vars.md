# Demo Environment Variables

Every variable for the cheap single-server path. Files are copied from their
`*.demo.example` siblings and filled in **on the server**; the real `.env.demo`
files are git-ignored.

## `deploy/demo/.env.demo` — compose-level

Interpolated into `docker-compose.demo.yml`.

| Variable        | Required | Example                  | Notes |
|-----------------|----------|--------------------------|-------|
| `IMAGE_PREFIX`  | yes      | `ghcr.io/shaimullo`      | registry namespace (lowercase) |
| `IMAGE_TAG`     | yes      | `demo-latest`            | overridden per-deploy by the workflow (commit SHA) |
| `CLIENT_DOMAIN` | yes      | `crystolia.com`          | Caddy vhost → frontend-client |
| `ADMIN_DOMAIN`  | yes      | `admin.crystolia.com`    | Caddy vhost → frontend-admin |
| `API_DOMAIN`    | yes      | `api.crystolia.com`      | Caddy vhost → backend |
| `ACME_EMAIL`    | yes      | `you@example.com`        | Let's Encrypt registration |

## `backend/.env.demo` — backend runtime

| Variable              | Required | Notes |
|-----------------------|----------|-------|
| `NODE_ENV`            | yes      | `production` |
| `PORT`                | no       | `4000` |
| `MONGO_URI`           | **yes**  | Atlas `mongodb+srv://…` or `mongodb://mongo:27017/crystolia` (local) |
| `JWT_SECRET`          | **yes**  | `openssl rand -hex 32` — **must equal** the admin's `JWT_SECRET` |
| `FRONTEND_URL`        | yes      | `https://crystolia.com` |
| `ADMIN_FRONTEND_URL`  | no       | `https://admin.crystolia.com` |
| `CORS_ALLOW_ORIGINS`  | yes      | comma-separated; safety net for cross-origin/landing calls |
| `COOKIE_DOMAIN`       | no       | empty (host-only). Set `.crystolia.com` only if needed |
| `ENABLE_SCHEDULER`    | no       | `true` (single container on the box) |
| `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` | no | Google OAuth |
| `GREEN_INVOICE_API_ID/SECRET/SANDBOX`  | no | invoicing; keep `SANDBOX=true` for a demo |
| `ULTRAMSG_*`, `ADMIN_PHONE_NUMBER`     | no | WhatsApp lead alerts |
| `TWILIO_ACCOUNT_SID/AUTH_TOKEN` | no | SMS lead alerts; recipient is `ADMIN_PHONE_NUMBER` |
| `TWILIO_MESSAGING_SERVICE_SID` | no | `MG…`; carries the `Crystolia` Alpha Sender, preferred over `TWILIO_PHONE_NUMBER` when set |
| `TWILIO_PHONE_NUMBER` | no | fallback sender when no Messaging Service SID; one of the two senders is required |

## `frontend-admin/.env.demo`

| Variable             | Required | Notes |
|----------------------|----------|-------|
| `NODE_ENV`           | yes      | `production` |
| `BACKEND_URL`        | yes      | `http://backend:4000` (compose-internal DNS) |
| `JWT_SECRET`         | **yes**  | must equal `backend/.env.demo`'s `JWT_SECRET` |
| `NEXT_PUBLIC_API_URL`| —        | baked at build (`/api`); runtime value inert |

## `frontend-client/.env.demo`

| Variable             | Required | Notes |
|----------------------|----------|-------|
| `NODE_ENV`           | yes      | `production` |
| `BACKEND_URL`        | yes      | `http://backend:4000` |
| `NEXT_PUBLIC_API_URL`| —        | baked at build (`/api`); runtime value inert |

## Build-time vs runtime

- **Build-time**: `NEXT_PUBLIC_API_URL` is baked into the frontend images by
  `demo-deploy.yml` as `/api` (same-origin). Changing it needs a rebuild — but
  you never need to, it is domain-independent.
- **Runtime**: everything else. Editing a `.env.demo` then
  `docker compose … up -d` is enough.

## GitHub Actions — secrets & variables

For the **Demo Deploy** workflow.

| Secret           | Purpose |
|------------------|---------|
| `DEMO_SSH_HOST`  | demo server IP / hostname |
| `DEMO_SSH_USER`  | SSH user (in the `docker` group) |
| `DEMO_SSH_KEY`   | SSH private key (PEM) |
| `GHCR_PAT`       | optional — PAT `read:packages`; omit if GHCR packages are public |

| Variable         | Default              | Purpose |
|------------------|----------------------|---------|
| `DEMO_SSH_PORT`  | `22`                 | SSH port |
| `DEMO_API_DOMAIN` / `DEMO_ADMIN_DOMAIN` / `DEMO_CLIENT_DOMAIN` | `*.crystolia.com` | informational |

Image **push** to GHCR uses the built-in `GITHUB_TOKEN` — no secret needed.

## Secret hygiene

- `.env.demo`, `*.tfstate`, `terraform.tfvars` are git-ignored. Only the
  `*.example` files are committed (placeholders only).
- The dev `JWT_SECRET` from `backend/.env` must **not** be reused for the demo.
- Rotating `JWT_SECRET` logs everyone out — update both files, then
  `docker compose … up -d`.
