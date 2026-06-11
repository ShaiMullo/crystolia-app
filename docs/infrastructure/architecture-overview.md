# Architecture Overview

## האפליקציה

Crystolia היא פלטפורמת ERP/CRM מבוססת ענן, בנויה כשלוש שכבות עם הפרדה ברורה:

```
                          ┌─────────────────────────────┐
   משתמשים  ─────────────▶│  Frontend (Next.js 16 / R19) │
                          │  • client portal  (RTL)      │
                          │  • admin CRM/ERP             │
                          └──────────────┬──────────────┘
                                         │  /api/* (same-origin rewrite)
                                         ▼
                          ┌─────────────────────────────┐
                          │  Backend API (Express 4)     │
                          │  • 23 routers, 14 services   │
                          │  • JWT + Passport + Google    │
                          └──────────────┬──────────────┘
                                         ▼
                          ┌─────────────────────────────┐
                          │  MongoDB (Atlas / k8s / box) │
                          └─────────────────────────────┘
   אינטגרציות חיצוניות: Green Invoice · UltraMsg (WhatsApp) · Twilio · Google OAuth
```

**עיקרון מפתח — same-origin /api rewrite:** כל frontend מגדיר ב-`next.config.ts` rewrite של `/api/*` ל-`BACKEND_URL`. כך תעבורת ה-UI היא תמיד same-origin (אין CORS, אין צורך ב-API hostname ציבורי לצריכת UI). ה-host `api.crystolia.com` הוא רק ל-webhooks ואינטגרציות חיצוניות.

## שתי התשתיות

### Cheap Production (היומיומית)
```
crystolia.com ─┐
admin.* ───────┼─▶  Caddy (TLS auto)  ─▶  3 containers  ─▶  MongoDB Atlas M0
api.*   ───────┘    [single Lightsail box, docker-compose.demo.yml]
```
- שרת יחיד (Lightsail `small_3_0`, 2GB), Docker Compose, Caddy ל-HTTPS אוטומטי.
- Images מ-GHCR (`ghcr.io/shaimullo/crystolia-*`).
- DB מנוהל ב-Atlas (replica-set → טרנזקציות עובדות).

### Enterprise Showcase (להדגמה)
```
Route53 ─▶ ALB ─▶ EKS (v1.29, 3× t3.medium)
                   ├─ namespace crystolia   (backend, admin, client, mongo)
                   ├─ namespace monitoring  (Prometheus, Grafana, Loki)
                   └─ namespace external-secrets (ESO ← AWS Secrets Manager)
   GitOps: ArgoCD (app-of-apps) ◀── crystolia-gitops repo
   Images: ECR (268456953512.dkr.ecr.us-east-1.amazonaws.com)
   Landing: S3 + CloudFront (crystolia.com)  ·  Leads: Lambda + DynamoDB
```

## הפרדה מכוונת בין התשתיות

- **State נפרד**: terraform-cheap משתמש ב-state מקומי; crystolia-infra ב-S3 remote (`crystolia-tf-state-main`). אין חפיפה — הזולה לא יכולה לפגוע ב-EKS.
- **Registry נפרד**: Cheap=GHCR, Enterprise=ECR.
- **Pipeline נפרד**: `demo-deploy.yml` (SSH) מול `staging.yml`/`production.yml` (ECR+ArgoCD).

## רכיבים משותפים
- אותו source code (3 שירותים) ואותם Dockerfiles.
- אותו Helm chart משמש את ה-Showcase; ה-Compose משמש את ה-Cheap.
- אותו דומיין `crystolia.com` (CloudFront ללנדינג; שאר ה-hosts מצביעים לתשתית הפעילה).

ראה פירוט מלא לכל תשתית ב-[cheap-production.md](cheap-production.md) ו-[enterprise-showcase.md](enterprise-showcase.md).
