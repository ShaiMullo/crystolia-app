# Crystolia — Deployment Runbook

Operational guide for deploying and running the Crystolia ERP across
environments. Companion docs:

- [`env-vars.md`](./env-vars.md) — environment variable matrix
- [`secrets.md`](./secrets.md) — secret inventory & rotation
- [`rollback.md`](./rollback.md) — rollback procedures
- [`mongo.md`](./mongo.md) — MongoDB / replica-set requirements

## Architecture

| Component        | Image                       | Port | Notes                                  |
|------------------|-----------------------------|------|----------------------------------------|
| backend          | `crystolia-backend`         | 4000 | Express + MongoDB API                  |
| frontend-admin   | `crystolia-frontend-admin`  | 3000 | Next.js admin CRM/ERP (standalone)     |
| frontend-client  | `crystolia-frontend`        | 3000 | Next.js customer portal                |
| mongo            | managed / in-cluster        | 27017| Replica set recommended (see mongo.md) |

Deployment is **GitOps**: GitHub Actions builds & pushes images to ECR, then
updates image tags in `crystolia-gitops`. ArgoCD syncs the cluster to match.

```
push to main ─▶ CI (ci.yml) ─▶ staging.yml: verify ─▶ build+push ECR
                                     │
                                     ▼
                       crystolia-gitops/staging/values.yaml  (tag bump)
                                     │
                                     ▼
                              ArgoCD sync ─▶ EKS
```

## Environments

| Env        | Trigger                | Values file                         | Hosts |
|------------|------------------------|--------------------------------------|-------|
| local      | `docker-compose`       | `docker-compose.local.yml`           | localhost |
| staging    | push to `main`         | `crystolia-gitops/staging/values.yaml` | `*-staging.crystolia.com` |
| production | git tag `v*`           | `crystolia-gitops/production/values.yaml` | `crystolia.com`, `admin.crystolia.com` |

## CI/CD pipelines

- **`ci.yml`** — runs on every PR + push to `main`. Backend typecheck+lint,
  frontend-admin typecheck+lint+build, frontend-client lint+build. The
  `ci-passed` job is the single status check to require in branch protection.
- **`staging.yml`** — push to `main`. Runs `verify-*` jobs (typecheck/lint/build);
  **images are only built when verify passes**, then GitOps tags are bumped.
- **`production.yml`** — git tag `v*`. Builds & pushes versioned images.
  Production GitOps tags are bumped **manually** (see rollback.md).
- **`backend-lock-verify.yml`** — verifies `package-lock.json` on backend PRs.

## Scheduled jobs (Phase 8 scheduler)

The backend runs an **in-process** scheduler (`ENABLE_SCHEDULER`, default `true`).
It is **single-process** — with more than one backend replica, jobs would run
once per pod.

Until leader-election lands, choose one:

1. **Single backend replica** — simplest; scheduler runs there. (default)
2. **Dedicated scheduler pod** — set `backend.env.ENABLE_SCHEDULER="false"` on
   the main Deployment and run one extra replica with `ENABLE_SCHEDULER="true"`.
3. Accept idempotent double-runs — most seeded jobs are safe to repeat
   (reconciliation, digests), but this is not recommended.

Jobs, run history and manual "run now" are managed from **Admin → System**.

## Autoscaling (opt-in)

HPA templates ship disabled. Enable per workload in the env values file:

```yaml
backend:
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 6
    targetCPUUtilizationPercentage: 70
```

Requires `metrics-server`. **If you enable backend autoscaling, also disable
the scheduler on the autoscaled Deployment** (see above).

## Health & readiness

| Endpoint        | Purpose                          |
|-----------------|----------------------------------|
| `/api/live`     | Liveness — process alive         |
| `/api/ready`    | Readiness — DB connected         |
| `/api/health`   | Detailed health JSON             |
| `/api/crm/system/health` | Operational health (admin) |

The K8s liveness/readiness probes and the Docker `HEALTHCHECK` all use these.

## Deploy checklist (staging)

1. PR green on `ci.yml` → merge to `main`.
2. `staging.yml` runs verify → build → GitOps tag bump.
3. ArgoCD auto-syncs (`crystolia` app). Watch sync status.
4. Verify `https://api-staging.crystolia.com/api/health` returns `ok`.
5. Spot-check Admin → System health score.

## Deploy checklist (production)

1. Tag a release: `git tag v1.x.x && git push origin v1.x.x`.
2. `production.yml` builds & pushes `v1.x.x` images.
3. **Manually** bump tags in `crystolia-gitops/production/values.yaml`.
4. ArgoCD syncs production.
5. Verify health endpoints + System dashboard.
6. Confirm MongoDB is a replica set (see `mongo.md`) — transactions depend on it.

## Verification commands

```bash
# Backend
cd backend && npm ci && npm run typecheck && npm run lint

# Frontend admin
cd frontend-admin && npm ci && npm run typecheck && npm run lint && npm run build

# Helm chart renders
helm template crystolia ./helm/crystolia-chart -f crystolia-gitops/staging/values.yaml

# Smoke tests (against a running backend)
cd backend && npm run smoke
```
