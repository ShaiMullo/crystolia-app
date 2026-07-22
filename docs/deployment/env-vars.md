# Environment Variables

Runtime vs build-time, required vs optional, per component.

## Backend (`crystolia-backend`)

All backend env vars are **runtime**. Secrets are injected via K8s Secrets;
plain config via Helm `backend.env`.

| Variable               | Required | Default                  | Source        | Notes |
|------------------------|----------|--------------------------|---------------|-------|
| `NODE_ENV`             | yes      | `production`             | Helm          | `development` enables seeders |
| `PORT`                 | no       | `4000`                   | Helm          | |
| `MONGO_URI`            | **yes**  | —                        | K8s Secret    | replica set URI in prod |
| `JWT_SECRET`           | **yes**  | —                        | K8s Secret    | backend refuses to start without it |
| `FRONTEND_URL`         | yes      | `http://localhost:3000`  | Helm          | OAuth redirects |
| `ADMIN_FRONTEND_URL`   | no       | `http://localhost:3001`  | Helm          | |
| `CORS_ALLOW_ORIGINS`   | yes      | localhost origins        | Helm          | comma-separated |
| `COOKIE_DOMAIN`        | no       | host-only                | Helm          | e.g. `.crystolia.com` |
| `ENABLE_SCHEDULER`     | no       | `true`                   | Helm          | `false` disables in-process jobs |
| `GOOGLE_CLIENT_ID`     | no       | —                        | K8s Secret    | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | no       | —                        | K8s Secret    | |
| `GOOGLE_CALLBACK_URL`  | no       | localhost                | Helm          | |
| `GREEN_INVOICE_API_ID` | no       | —                        | K8s Secret    | invoicing provider |
| `GREEN_INVOICE_SECRET` | no       | —                        | K8s Secret    | |
| `GREEN_INVOICE_SANDBOX`| no       | `true`                   | K8s Secret    | `false` = live invoicing |
| `ULTRAMSG_INSTANCE_ID` | no       | —                        | ExternalSecret| WhatsApp |
| `ULTRAMSG_TOKEN`       | no       | —                        | ExternalSecret| |
| `ADMIN_PHONE_NUMBER`   | no       | —                        | ExternalSecret| |
| `TWILIO_ACCOUNT_SID`   | no       | —                        | K8s Secret    | SMS lead alerts |
| `TWILIO_AUTH_TOKEN`    | no       | —                        | K8s Secret    | |
| `TWILIO_PHONE_NUMBER`  | no       | —                        | K8s Secret    | |
| `PAYMENT_PROVIDER`     | no       | `mock`                   | K8s Secret    | |
| `REQUEST_TIMEOUT`      | no       | `30000`                  | Helm          | ms |

## Frontend Admin (`crystolia-frontend-admin`)

| Variable               | Required | Phase       | Notes |
|------------------------|----------|-------------|-------|
| `NEXT_PUBLIC_API_URL`  | yes      | build+runtime | `/api` for same-origin admin |
| `BACKEND_URL`          | yes      | runtime     | server-side `/api/*` rewrite target |
| `JWT_SECRET`           | yes      | runtime     | middleware verifies the auth cookie — **must match backend** |
| `NODE_ENV`             | yes      | build+runtime | |
| `NEXT_TELEMETRY_DISABLED` | no    | build       | set to `1` |

`NEXT_PUBLIC_*` is **inlined at build time** — changing it needs a rebuild.

## Frontend Client (`crystolia-frontend`)

| Variable               | Required | Phase         | Notes |
|------------------------|----------|---------------|-------|
| `NEXT_PUBLIC_API_URL`  | yes      | build time    | passed as Docker `build-arg` |
| `BACKEND_URL`          | yes      | runtime       | rewrite target |

## Build-time vs runtime

- **Build-time** (`build-args`, `NEXT_PUBLIC_*`): baked into the image. A change
  requires a new image build. Used for client API URLs.
- **Runtime** (K8s env / Secrets): read on container start. A change only needs
  a pod restart. Everything backend, plus `BACKEND_URL`, `JWT_SECRET`.

## Local development

`backend/.env` and `frontend-admin/.env.local` (both git-ignored). Copy from
the respective `.env.example`. `JWT_SECRET` must be identical between the two.
