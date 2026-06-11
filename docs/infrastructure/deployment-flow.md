# Deployment Flow

זרימת deploy מקצה-לקצה לשתי התשתיות, כולל rollback.

## Cheap Production (GHCR → Lightsail)

```
git push / workflow_dispatch
        │
        ▼
[Demo Deploy workflow]
  1. verify    — typecheck backend + admin (quality gate)
  2. build     — 3 images → GHCR (tag: <commit-sha> + demo-latest)
  3. deploy    — scp compose+Caddyfile → ssh → remote-deploy.sh
                   pull → up -d → health-check /api/health → prune
        │
        ▼
   Lightsail box  (Caddy TLS → 3 containers → Atlas)
```

**הפעלה:** GitHub → Actions → *Demo Deploy* → Run workflow → `ref=main`.
**זמן:** ~5–8 דק'. **Downtime:** כמעט אפס (compose up מחליף בהדרגה).

### Rollback (Cheap)
```bash
ssh ubuntu@<STATIC_IP> && cd /opt/crystolia
IMAGE_TAG=<previous-sha> docker compose -f docker-compose.demo.yml \
  --env-file deploy/demo/.env.demo up -d
```

---

## Enterprise Showcase (ECR → EKS via ArgoCD)

```
git tag v1.2.3 && git push --tags
        │
        ▼
[Production Build & Push workflow]   (OIDC → ECR push role)
  build 3 images → ECR (268456953512.dkr.ecr.us-east-1.amazonaws.com)
        │
        ▼
  עדכון image tag ב-crystolia-gitops values  (commit)
        │
        ▼
  ArgoCD (app-of-apps) מזהה drift → sync → rollout ל-EKS
```

**Staging:** push ל-`main` (path-filtered) → `staging.yml` בונה ל-ECR → ArgoCD מסנכרן staging values.
**Production:** tag `v*` → `production.yml` בונה ל-ECR. *(כרגע חסר ArgoCD Application ל-prod — ראה STATUS).*

### Rollback (Showcase)
```bash
# אופציה א' — ArgoCD history
argocd app rollback crystolia <revision>
# אופציה ב' — Git revert של ה-tag ב-gitops values + sync
kubectl -n crystolia rollout undo deploy/crystolia-backend   # חירום
```

---

## טבלת השוואה

| | Cheap | Showcase |
|---|---|---|
| Trigger | workflow_dispatch | tag `v*` / push main |
| Registry | GHCR | ECR |
| Deploy mechanism | SSH + Compose | ArgoCD (GitOps) |
| Rollback | IMAGE_TAG קודם | argocd rollback / kubectl undo |
| Downtime | ~0 | rolling (replicas) |
| מתי | תמיד (קבוע) | on-demand |

---

## כלל בטיחות
לפני כל deploy אמיתי, מריצים `docs/infrastructure/validate-all.sh` ומוודאים שה-CI (`ci.yml`) ירוק.
