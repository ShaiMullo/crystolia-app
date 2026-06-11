# CI/CD

כל ה-GitHub Actions workflows על פני שלושת המאגרים.

## crystolia-app

| Workflow | Trigger | מה עושה | פורס? |
|---|---|---|---|
| **CI** (`ci.yml`) | push/PR ל-`main` | path-filter (backend/admin/client) → typecheck, lint, build. שער איכות. | לא |
| **Backend Lock File Verification** (`backend-lock-verify.yml`) | שינוי ב-backend deps | מאמת שלמות `package-lock.json` | לא |
| **Demo Deploy** (`demo-deploy.yml`) | workflow_dispatch | verify → build GHCR → ssh deploy ל-Lightsail | ✅ Cheap |
| **Staging Deployment** (`staging.yml`) | push `main` (path) | verify → build ל-ECR (staging) | ✅ EKS staging* |
| **Production Build & Push** (`production.yml`) | tag `v*` / dispatch | OIDC→ECR, בונה 3 images | ✅ push בלבד |

\* תלוי באשכול EKS חי.

### Secrets/Variables נדרשים (crystolia-app)
- Cheap: `DEMO_SSH_HOST`, `DEMO_SSH_USER`, `DEMO_SSH_KEY`, `GHCR_PAT`(אופ'), `DEMO_SSH_PORT`(var).
- Production: OIDC role `github-actions-ecr-push-role` (כבר קיים ב-infra).

## crystolia-infra

| Workflow | Trigger | מה עושה |
|---|---|---|
| **Terraform CI** (`terraform.yml`) | push/PR `terraform/**` | OIDC → fmt-check → init → validate → **plan בלבד** (apply ידני) |

## crystolia-gitops

| Workflow | Trigger | מה עושה |
|---|---|---|
| **Sabbath Mode** (`sabbath-mode.yml`) | cron (Fri 18:00 / Sat 23:00 UTC) + dispatch | מחליף mode values (sabbath/normal/cheap) ב-Application manifests ודוחף → ArgoCD מסנכרן. ⚠️ זמני UTC קבועים, לא זמני שבת אמיתיים בישראל |

## עקרונות
- **CI נפרד מ-CD**: `ci.yml` רק מאמת; deploy תמיד מכוון (dispatch/tag).
- **שני registries**: GHCR ל-Cheap, ECR ל-Enterprise.
- **OIDC במקום מפתחות**: production+terraform משתמשים ב-GitHub OIDC → IAM roles (אין credentials סטטיים).
- **Image tags**: Cheap=commit SHA + `demo-latest`; Enterprise=tag/SHA (⚠️ prod values כרגע `latest` — לתקן).

## המלצות
1. להוסיף ל-`ci.yml` שלב `docker build` smoke (לתפוס בעיות Dockerfile מוקדם).
2. ב-production values לנעוץ SHA במקום `latest`.
3. לשקול workflow ל-terraform-landing/leads (כרגע ידני בלבד).
