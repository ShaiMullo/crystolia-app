# Cheap Production — Activation Plan

מצב: **Cheap Production Activation**. מטרה: מערכת אמיתית באוויר, deploy אוטומטי, HTTPS, domain, admin/client/api עובדים, CI/CD — בלי complexity מיותר.

> 🔐 = פעולה שאתה מבצע (עולה כסף / DNS / secrets). 🤖 = אני מכין מראש. לא מבוצע apply בלי אישורך.

---

## Dependency pre-checks (להריץ לפני שמתחילים)

הרץ `scripts/validate-env.sh` — הוא בודק אוטומטית את כל מה שבטבלה:

| Dependency | איך נבדק | אם חסר |
|---|---|---|
| AWS CLI מחובר | `aws sts get-caller-identity` | `aws configure` (🔐) |
| Route53 zone ל-crystolia.com | `aws route53 list-hosted-zones` | DNS חיצוני → ידני (שלב 5) |
| SSH key pair | קיים `~/.ssh/*demo*` / Lightsail key | ליצור/להוריד מהקונסולה (🔐) |
| GitHub secrets (DEMO_SSH_*) | `gh secret list` | להגדיר (שלב 2) |
| Atlas connection string | קובץ `backend/.env.demo` | להקים cluster (שלב 1) |
| Docker images נבנים | `docker build` smoke / CI ירוק | לתקן Dockerfile |
| Workflows תקינים | `validate-all.sh` | לתקן YAML |

---

## שלב 1 — MongoDB Atlas
- **מטרה:** DB מנוהל, חינמי, replica-set (טרנזקציות עובדות).
- **סיכון:** נמוך. M0 חינמי; טעות נפוצה — לשכוח IP allowlist.
- **🔐 ידני:** להקים cluster M0 (us-east-1), משתמש DB, להוסיף את ה-static IP (משלב 4) ל-Network Access, להעתיק SRV connection string.
- **🤖 אוטומטי:** template ל-`backend/.env.demo` עם placeholder ל-`MONGO_URI`.
- **עלות:** $0 (M0).
- **זמן:** ~15 דק'.
- **תלות:** אין. אפשר להתחיל מיד.

## שלב 2 — GitHub Secrets
- **מטרה:** לאפשר ל-`demo-deploy.yml` להתחבר ל-SSH ול-GHCR.
- **סיכון:** נמוך. רק אל תדביק ערכים בלוגים.
- **🔐 ידני:** להגדיר `DEMO_SSH_HOST`, `DEMO_SSH_USER=ubuntu`, `DEMO_SSH_KEY` (PEM), אופ' `GHCR_PAT`. (HOST ידוע רק אחרי שלב 4 — אפשר לעדכן אז.)
- **🤖 אוטומטי:** רשימת secrets מדויקת + פקודות `gh secret set` מוכנות.
- **עלות:** $0.
- **זמן:** ~10 דק'.
- **תלות:** SSH key (שלב 4 מייצר/דורש).

## שלב 3 — terraform-cheap validate/plan
- **מטרה:** לוודא שה-IaC תקין לפני apply.
- **סיכון:** אפס — `validate`/`plan` לא יוצרים כלום.
- **🔐 ידני:** להריץ `terraform plan` ולסקור.
- **🤖 אוטומטי:** `terraform.tfvars` מוכן (region, bundle, ssh_cidr מצומצם ל-IP שלך), `validate-all.sh`.
- **עלות:** $0.
- **זמן:** ~10 דק'.
- **תלות:** AWS CLI מחובר.

## שלב 4 — Lightsail provisioning
- **מטרה:** השרת היחיד + static IP + Docker מותקן (user_data).
- **סיכון:** **בינוני — יוצר משאב בתשלום.** הפיך (`terraform destroy`).
- **🔐 ידני:** `terraform apply` (אחרי סקירת ה-plan). לקחת `static_ip` מה-output.
- **🤖 אוטומטי:** הכל מוכן ב-`terraform-cheap`; פקודות apply מדויקות.
- **עלות:** ~$12/חודש (`small_3_0`).
- **זמן:** ~5 דק' apply + ~2–3 דק' boot.
- **תלות:** שלב 3 עבר.

## שלב 5 — DNS
- **מטרה:** `admin`/`api`.crystolia.com → static IP. (`crystolia.com` כבר ב-CloudFront.)
- **סיכון:** בינוני — שינוי DNS משפיע על production. הפיך.
- **🔐 ידני:** ליצור A records (Route53 או הספק שלך). או `manage_dns=true` ב-terraform.
- **🤖 אוטומטי:** ערכי ה-records המדויקים; אופציה ל-Route53 דרך terraform.
- **עלות:** ~$0 (Route53 zone ~$0.50/חודש אם חדש).
- **זמן:** ~10 דק' + propagation (דקות–שעות).
- **תלות:** שלב 4 (צריך IP).

## שלב 6 — Docker deploy
- **מטרה:** להעלות את 3 השירותים + Caddy לשרת.
- **סיכון:** נמוך. הפיך (rollback בשלב 9).
- **🔐 ידני:** למלא `.env.demo` על השרת (Atlas URI, JWT_SECRET); להריץ `Demo Deploy` workflow.
- **🤖 אוטומטי:** `deploy-demo.sh`, templates ל-env, ה-workflow כבר קיים.
- **עלות:** $0 (כלול ב-Lightsail).
- **זמן:** ~8 דק'.
- **תלות:** שלבים 1,2,4,5.

## שלב 7 — HTTPS validation
- **מטרה:** לוודא ש-Caddy הנפיק תעודות Let's Encrypt תקינות.
- **סיכון:** נמוך. סכנת rate-limit אם DNS לא מוכן — לכן יש staging CA ב-Caddyfile.
- **🔐 ידני:** אין (אוטומטי). לאמת בדפדפן.
- **🤖 אוטומטי:** `health-check.sh` בודק `https://` + תוקף תעודה ל-3 ה-hosts.
- **עלות:** $0.
- **זמן:** ~5 דק' (תלוי propagation).
- **תלות:** שלבים 5,6.

## שלב 8 — CI/CD deploy test
- **מטרה:** לוודא שה-pipeline האוטומטי עובד מקצה לקצה.
- **סיכון:** נמוך.
- **🔐 ידני:** לבצע commit קטן ולהריץ `Demo Deploy`; לוודא שה-tag החדש פרוס.
- **🤖 אוטומטי:** `smoke-test.sh` (login, /api/health, מסכים נטענים).
- **עלות:** $0.
- **זמן:** ~10 דק'.
- **תלות:** שלב 6.

## שלב 9 — Rollback validation
- **מטרה:** להוכיח שאפשר לחזור לגרסה קודמת.
- **סיכון:** נמוך (בודקים בכוונה).
- **🔐 ידני:** להריץ `rollback-demo.sh <previous-sha>`; לוודא שהמערכת חוזרת.
- **🤖 אוטומטי:** `rollback-demo.sh`.
- **עלות:** $0.
- **זמן:** ~5 דק'.
- **תלות:** שלב 8.

## שלב 10 — Monitoring/logging בסיסי
- **מטרה:** התראה אם המערכת נופלת + גישה ללוגים.
- **סיכון:** אפס.
- **🔐 ידני:** להקים UptimeRobot/BetterStack (free) על `/api/health`.
- **🤖 אוטומטי:** cron ל-`docker image prune` + log rotation; הנחיות ל-uptime monitor.
- **עלות:** $0 (free tier).
- **זמן:** ~15 דק'.
- **תלות:** שלבים 6,7.

---

## סיכום זרימה

```
1 Atlas ─┐
2 Secrets ┼─▶ 3 tf plan ─▶ 4 Lightsail ─▶ 5 DNS ─▶ 6 Deploy ─▶ 7 HTTPS ─▶ 8 CI/CD ─▶ 9 Rollback ─▶ 10 Monitoring
         (HOST ל-secrets מתעדכן אחרי שלב 4)
```

**זמן כולל:** ~2 שעות עבודה פעילה + זמן propagation. **עלות חודשית:** ~$12–13.
**הפעולות שאתה מריץ (🔐):** שלבים 1,2,4,5,6 (apply/secrets/DNS). השאר אני מכין/מאמת.

ראה [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) למעקב, ו-`scripts/` לסקריפטים.
