# Crystolia — Infrastructure STATUS

> נכון ל-28/05/2026. מבוסס על audit מלא של `crystolia-app`, `crystolia-infra`, `crystolia-gitops`.
> מקרא: ✅ Working · ⚠️ Partial / needs work · ❌ Broken / missing · 💤 Planned / built-but-not-running

---

## תמונה כללית

| תשתית | מטרה | מצב כללי |
|---|---|---|
| **Cheap Production** (Lightsail + Compose) | שימוש יומיומי אמיתי | ⚠️ בנוי ~90%, **לא רץ עדיין** באוויר |
| **Enterprise Showcase** (EKS + ArgoCD) | הדגמה מקצועית / ראיונות | 💤 בנוי במלואו, **כבוי כרגע** (נהרס לחיסכון) |
| **Landing** (S3 + CloudFront) | crystolia.com שיווקי | ✅ חי באוויר |
| **Leads API** (Lambda + DynamoDB) | קליטת לידים מהלנדינג | ✅ פרוס (תלוי ב-build מ-crystolia-app) |

---

## 1. אפליקציה (crystolia-app)

| רכיב | מצב | הערות |
|---|---|---|
| Backend (Express+Mongoose+TS) | ✅ | 23 routers, 14 services, 22 models. `/api/health,/ready,/live` קיימים |
| Frontend Admin (Next 16/React 19) | ✅ | App Router, output: standalone, /api rewrite same-origin |
| Frontend Client (Next 16) | ✅ | RTL, i18n he/en/ru |
| Landing (Next export) | ✅ | סטטי, מוגש מ-CloudFront |
| Dockerfiles (3 שירותים) | ✅ | multi-stage, non-root, HEALTHCHECK מובנה |
| `docker-compose.local.yml` | ✅ | תוקן באג: חסר mount של `frontend-admin/lib` (תוקן) |
| `docker-compose.demo.yml` | ✅ | Caddy+3 שירותים+mongo profile; mem_limits מוגדרים |
| seed admin (dev) | ✅ | admin@crystolia.com / Admin123! (dev בלבד) |

## 2. Cheap Production (terraform-cheap + deploy/demo)

| רכיב | מצב | הערות |
|---|---|---|
| `terraform-cheap` (Lightsail IaC) | ⚠️ | קוד תקין; **לא הורץ apply** → אין instance |
| `scripts/install-docker.sh` (user_data) | ✅ | מתקין Docker+Compose, מכין /opt/crystolia |
| `Caddyfile` (reverse proxy + HTTPS) | ✅ | 3 vhosts, Let's Encrypt אוטומטי |
| `remote-deploy.sh` | ✅ | pull→up→health-check→prune |
| `demo-deploy.yml` (GH Actions) | ✅ | verify→build GHCR→ssh deploy. דורש secrets |
| env.demo.example (×4) | ✅ | מתועד היטב |
| **MongoDB Atlas M0** | ❌ | מומלץ אך **לא הוקם cluster**; כרגע רק mongo container אופציונלי |
| **Lightsail instance רץ** | ❌ | לא קיים → admin/api.crystolia.com מתים |
| **GitHub secrets (DEMO_SSH_*)** | ❌ | צריך להגדיר: HOST/USER/KEY |
| Backups | ⚠️ | מתועד ב-rollback.md; אין אוטומציה ל-Atlas/volume |
| Monitoring בסיסי | ❌ | אין uptime/health monitoring חיצוני |

## 3. Enterprise Showcase (crystolia-infra + crystolia-gitops)

| רכיב | מצב | הערות |
|---|---|---|
| EKS v1.29 (3× t3.medium) | 💤 | מוגדר; כבוי (`destroy.plan`, `shutdown-all.sh`) |
| VPC (single NAT) | 💤 | cost-optimized; כבוי |
| ECR (3 repos) | ✅ | נשמר גם כשהאשכול כבוי |
| ACM wildcard cert | ✅ | `crystolia.com` + `*.crystolia.com` |
| ALB Controller (Helm) | 💤 | v3.1.0 — **לבדוק pin** (חשוד ישן) |
| ArgoCD (app-of-apps) | 💤 | root-app → apps/. נדרש `fix-argocd.sh` אחרי bring-up |
| external-secrets (ESO) | 💤 | מ-AWS Secrets Manager דרך IRSA |
| Monitoring (Prometheus/Grafana/Loki) | 💤 | מוגדר, staging בלבד |
| GitHub OIDC roles | ✅ | terraform (plan) + ecr-push |
| **Production env** | ❌ | values קיימים אך **אין ArgoCD Application** שמצביע עליהם |
| **Prod DNS (api/admin)** | ❌ | מוערים-בחוץ ב-`dns.tf` → לא נוצרו אף פעם |
| MongoDB (k8s) | ⚠️ | **כפילות מסוכנת**: Bitnami app + manifest ידני, שניהם בשם `mongo` |
| image tags ב-production values | ⚠️ | `latest` (לא ננעץ) — נוגד GitOps |
| terraform-leads cross-repo build | ⚠️ | zip תלוי ב-`../../crystolia-app/leads-api` |
| dead config (modules/addons, *.disabled) | ⚠️ | ArgoCD/nginx/cert-manager כפולים, לא בשימוש |

## 4. CI/CD (workflows)

| Workflow | repo | מצב | הערות |
|---|---|---|---|
| `ci.yml` (Quality Gate) | app | ✅ | typecheck/lint/build, path-filtered |
| `backend-lock-verify.yml` | app | ✅ | שלמות package-lock |
| `demo-deploy.yml` (Cheap) | app | ✅ | דורש DEMO_SSH_* secrets |
| `staging.yml` | app | ⚠️ | build→ECR; תלוי באשכול חי |
| `production.yml` | app | ✅ | OIDC→ECR על tags `v*` (push בלבד) |
| `terraform.yml` (plan) | infra | ✅ | OIDC, plan-only |
| `sabbath-mode.yml` | gitops | ✅ | cron scale-to-zero (UTC, לא זמני שבת אמיתיים) |

## 5. סיכונים / כפילויות / מיותר

| פריט | חומרה | פעולה מומלצת |
|---|---|---|
| כפילות MongoDB ב-gitops (Bitnami + manual) | ❌ גבוה | להחליט על אחד, למחוק את השני |
| Prod DNS לא קיים ב-dns.tf | ❌ גבוה | לפתוח records (כשמרימים EKS prod) — דורש אישורך |
| secrets אמיתיים ב-working tree של gitops (.env/.env.local) | ⚠️ | gitignored אך לא tracked; מומלץ לסובב ולמחוק |
| `latest` tags ב-production values | ⚠️ | לנעוץ SHA |
| ALB controller chart 3.1.0 | ⚠️ | לאמת/לעדכן גרסה |
| dead config (modules/addons, *.disabled) | ⚠️ נמוך | למחוק כדי למנוע בלבול |
| EKS API endpoint פתוח 0.0.0.0/0 | ⚠️ | לצמצם ל-prod |
