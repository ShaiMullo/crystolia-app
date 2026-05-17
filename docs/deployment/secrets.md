# Secrets

## Principles

- **No secrets in git.** `.env*` is git-ignored; `.env.example` files hold
  placeholders only. CI uses OIDC for AWS — no static cloud credentials.
- Cluster secrets are K8s `Secret` objects, some sourced via **ExternalSecrets**.
- `secrets.template.yaml` / `secrets.yaml` (Helm) is the install-time secret
  input and is **never committed** with real values.

## Kubernetes secrets

| Secret name                  | Keys                                                        | Managed by |
|-------------------------------|-------------------------------------------------------------|------------|
| `crystolia-backend-secret`    | `MONGO_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | manual / ExternalSecret |
| `crystolia-secrets`           | `GREEN_INVOICE_*`, `TWILIO_*`, `PAYMENT_PROVIDER`           | Helm `secrets.yaml` |
| `crystolia-whatsapp-secret`   | `ULTRAMSG_INSTANCE_ID`, `ULTRAMSG_TOKEN`, `ADMIN_PHONE_NUMBER` | ExternalSecret |

The backend Deployment marks Google + WhatsApp keys `optional: true` so the
pod still starts when those integrations are not configured.

## GitHub Actions secrets

| Secret                   | Used by         | Purpose |
|--------------------------|-----------------|---------|
| `GITOPS_APP_ID`          | `staging.yml`   | GitHub App — generates a short-lived token to push the GitOps repo |
| `GITOPS_APP_PRIVATE_KEY` | `staging.yml`   | GitHub App private key |

AWS access is via **OIDC** → IAM role `github-actions-ecr-push-role`
(ECR push only). No `AWS_ACCESS_KEY_ID` secret exists or should be added.

## Secret inventory & rotation

| Secret              | Rotation trigger                  | Rotation steps |
|---------------------|-----------------------------------|----------------|
| `JWT_SECRET`        | suspected leak; ~yearly           | Update in `crystolia-backend-secret` **and** the frontend-admin secret (same value), restart both. All sessions invalidate. |
| `MONGO_URI`         | DB credential rotation            | Update secret, restart backend. |
| `GOOGLE_CLIENT_SECRET` | Google console rotation        | Update secret, restart backend. |
| `GREEN_INVOICE_SECRET` | provider rotation              | Update secret, restart backend. |
| `ULTRAMSG_TOKEN`    | provider rotation                 | Update ExternalSecret source, let it resync. |
| `GITOPS_APP_PRIVATE_KEY` | App key rotation             | Regenerate in GitHub App settings, update repo secret. |
| Rivhit (future)     | when Rivhit is integrated         | Add `RIVHIT_*` keys to `crystolia-secrets`; document here. |

## Rotation rules

- Rotate immediately on any suspected exposure.
- `JWT_SECRET` is the highest-impact secret — rotating it logs everyone out;
  schedule it during low traffic.
- After rotation, restart the affected Deployments (`kubectl rollout restart`).
- Record rotations (date, who, why) in your ops log.

## Local secrets

Developers keep `backend/.env` and `frontend-admin/.env.local` locally; never
commit them. The dev `JWT_SECRET` is a throwaway value and must not be reused
in staging or production.
