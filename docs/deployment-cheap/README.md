# Crystolia — Low-Cost Demo Deployment

A **parallel, low-cost** way to run the full Crystolia ERP on a single small
server — built for a final-project demo / book, **without EKS**.

The production EKS path (`helm/`, `crystolia-gitops/`, `crystolia-infra/`,
`staging.yml`, `production.yml`) is untouched and still works. This is an
*alternative*, not a replacement.

| | EKS path | Cheap demo path |
|---|---|---|
| Cost | ~$180-250/mo | **~$12/mo** |
| Compute | EKS + worker nodes | one Lightsail box |
| Proxy / TLS | ALB + cert-manager | Caddy (auto Let's Encrypt) |
| Deploy | GitOps + ArgoCD | `demo-deploy.yml` → SSH → `docker compose` |
| DB | in-cluster Mongo | MongoDB Atlas M0 (free) |
| Best for | real production | demos, presentations, low traffic |

## Architecture

```
                         Internet
                            │
              DNS A records ▼  (crystolia.com, admin.*, api.*)
                ┌───────────────────────────┐
                │  AWS Lightsail (2 GB box)  │
                │                            │
                │   ┌────────────────────┐   │
                │   │ Caddy :80 :443     │   │  ← auto HTTPS (Let's Encrypt)
                │   └─────────┬──────────┘   │
                │     ┌───────┼────────┐     │
                │     ▼       ▼        ▼     │
                │  client   admin   backend  │  ← Docker Compose network
                │  :3000    :3000    :4000   │     (no host ports exposed)
                │     │       │        │     │
                │     └── /api rewrite ┘     │
                └────────────┼──────────────┘
                             ▼
                   MongoDB Atlas M0 (free, replica set)
```

- `crystolia.com` → frontend-client. `admin.crystolia.com` → frontend-admin.
  Both call the API **same-origin** via the Next.js `/api` rewrite to
  `backend:4000` — no CORS for normal UI traffic.
- `api.crystolia.com` → backend directly (webhooks, landing-site leads,
  integrations, debugging).
- Only Caddy publishes host ports (80/443). App containers are internal.

## Components

| File / dir                         | Role |
|-------------------------------------|------|
| `docker-compose.demo.yml`           | the single-server stack |
| `deploy/demo/Caddyfile`             | reverse proxy + TLS routing |
| `deploy/demo/.env.demo.example`     | compose-level vars (images, domains) |
| `deploy/demo/remote-deploy.sh`      | the on-server deploy script |
| `backend/.env.demo.example`         | backend runtime env |
| `frontend-admin/.env.demo.example`  | admin runtime env |
| `frontend-client/.env.demo.example` | client runtime env |
| `.github/workflows/demo-deploy.yml` | CI: build → push GHCR → SSH deploy |
| `terraform-cheap/`                  | optional Lightsail provisioning |

## End-to-end flow

1. **Provision** the box — `terraform-cheap/` (or create Lightsail by hand:
   [`aws-lightsail.md`](./aws-lightsail.md)).
2. **DNS** — point three A records at the static IP ([`dns.md`](./dns.md)).
3. **First deploy** — copy `.env.demo` files to the box, log in to GHCR,
   `docker compose up -d`, seed the admin user ([`aws-lightsail.md`](./aws-lightsail.md)).
4. **Updates** — run the **Demo Deploy** GitHub Action (manual trigger). It
   verifies, builds & pushes images to GHCR, SSHes in, pulls and restarts.
5. **Rollback** — re-run the action against an older ref, or run
   `remote-deploy.sh` with an older `IMAGE_TAG` ([`rollback.md`](./rollback.md)).

## MongoDB

Use **Atlas M0** (free): it is a 3-node replica set, so the Phase 7/8
transactions (payments, shipments, PO receiving) are atomic. Admin → System
will show topology `replica_set`.

For a fully offline demo, start the bundled Mongo with
`docker compose --profile local-mongo …` — but it is standalone, so
transactions run in non-atomic **fallback mode** (the app handles this
gracefully; Admin → System shows "Fallback mode").

## Not included

- `leads-api` and `landing` are out of scope for the demo box (the demo serves
  the three core services). They can be added later as extra compose services.
- Real off-site backups — the Phase 8 backup layer is metadata-only. For a
  demo, Atlas' own snapshots cover it.

## Docs index

- [`aws-lightsail.md`](./aws-lightsail.md) — server setup + first deploy
- [`env-vars.md`](./env-vars.md) — demo environment variables
- [`dns.md`](./dns.md) — DNS records
- [`rollback.md`](./rollback.md) — rollback procedures
- [`cost-estimate.md`](./cost-estimate.md) — cost comparison
