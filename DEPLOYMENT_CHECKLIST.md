# Crystolia — Cheap Production Deployment Checklist

מעקב הרמה end-to-end. סמן `[x]` כשמסיימים. פירוט מלא: `docs/infrastructure/CHEAP_PRODUCTION_ACTIVATION.md`.

## Pre-flight (dependencies)
- [ ] AWS CLI מחובר (`aws sts get-caller-identity`)
- [ ] Lightsail key pair קיים / הורד מהקונסולה
- [ ] `gh` CLI מחובר (או גישה ל-GitHub repo settings)
- [ ] `scripts/validate-env.sh` עבר
- [ ] `docs/infrastructure/validate-all.sh` עבר (helm/terraform/compose/yaml)
- [ ] CI (`ci.yml`) ירוק על `main`

## שלב 1 — MongoDB Atlas
- [ ] Atlas cluster M0 הוקם (us-east-1)
- [ ] DB user נוצר (username + password)
- [ ] Network Access: static IP של ה-box ב-allowlist
- [ ] Connection string (SRV) הועתק
- [ ] **Atlas ready**

## שלב 2 — GitHub Secrets
- [ ] `DEMO_SSH_HOST` מוגדר
- [ ] `DEMO_SSH_USER` = `ubuntu`
- [ ] `DEMO_SSH_KEY` (PEM) מוגדר
- [ ] `GHCR_PAT` מוגדר (רק אם packages פרטיים)
- [ ] **GitHub secrets configured**

## שלב 3 — Terraform validate/plan
- [ ] `terraform-cheap/terraform.tfvars` מוכן (ssh_cidr מצומצם ל-IP שלי)
- [ ] `terraform init` עבר
- [ ] `terraform plan` נסקר ואושר
- [ ] **Terraform vars ready**

## שלב 4 — Lightsail provisioning 🔐
- [ ] `terraform apply` הורץ
- [ ] static IP התקבל (`terraform output static_ip`)
- [ ] boot הסתיים (~3 דק', Docker מותקן)
- [ ] SSH עובד (`ssh ubuntu@<IP>`)

## שלב 5 — DNS 🔐
- [ ] `admin.crystolia.com` → static IP
- [ ] `api.crystolia.com` → static IP
- [ ] `crystolia.com` עדיין מצביע ל-CloudFront (לא לגעת)
- [ ] propagation אומת (`dig +short admin.crystolia.com`)
- [ ] **DNS configured**

## שלב 6 — Docker deploy
- [ ] `deploy/demo/.env.demo` על השרת (IMAGE_PREFIX, domains, ACME_EMAIL)
- [ ] `backend/.env.demo` (Atlas URI, JWT_SECRET, CORS)
- [ ] `frontend-admin/.env.demo` (JWT_SECRET זהה, BACKEND_URL)
- [ ] `frontend-client/.env.demo` (BACKEND_URL)
- [ ] `Demo Deploy` workflow הורץ בהצלחה
- [ ] 4 קונטיינרים up (`docker compose ps`)

## שלב 7 — HTTPS / SSL
- [ ] תעודה תקפה ל-`crystolia.com`
- [ ] תעודה תקפה ל-`admin.crystolia.com`
- [ ] תעודה תקפה ל-`api.crystolia.com`
- [ ] **SSL working**

## שלב 8 — Smoke / reachability
- [ ] `https://api.crystolia.com/api/health` → 200 (**Health endpoints healthy**)
- [ ] `https://admin.crystolia.com` נטען + login עובד (**Admin reachable**)
- [ ] `https://crystolia.com` נטען (client) 
- [ ] API מגיב ל-call מאומת (**API reachable**)
- [ ] `scripts/smoke-test.sh` עבר

## שלב 9 — Rollback
- [ ] `scripts/rollback-demo.sh <previous-sha>` נבדק
- [ ] המערכת חזרה לגרסה קודמת בהצלחה
- [ ] **Rollback tested**

## שלב 10 — Monitoring/logging
- [ ] Uptime monitor (UptimeRobot/BetterStack) על `/api/health`
- [ ] cron ל-`docker image prune` + log rotation על השרת
- [ ] גישה ללוגים אומתה (`docker compose logs`)

---
## ✅ Definition of Done
מערכת חיה: client+admin+api עובדים מעל HTTPS, deploy אוטומטי דרך GitHub Actions, rollback מוכח, ניטור בסיסי פעיל. עלות ~$12–13/חודש.
