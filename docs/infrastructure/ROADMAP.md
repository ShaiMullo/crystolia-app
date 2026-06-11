# Crystolia — Infrastructure ROADMAP

> גישה: **MVP Production First** — קודם מרימים את ה-Cheap Production יציב באוויר, רק אחר כך משקיעים ב-Enterprise Showcase.
> כל שלב שמסומן 🔐 דורש את אישורך ופעולה שלך (apply / יצירת משאב / DNS / secrets). אני מכין הכל, אתה מריץ.

---

## שלב 0 — תיקונים מקדימים (קוד בלבד, ללא ענן) — ~1 שעה

ניתן לבצע מיד, אפס סיכון, אפס עלות:

1. ✅ **תוקן**: `docker-compose.local.yml` חסר mount של `frontend-admin/lib` (גרם ל-Build Error).
2. ⬜ להריץ `docs/infrastructure/validate-all.sh` (helm lint / terraform validate / compose config) ולתקן ממצאים.
3. ⬜ לנעוץ image tags ב-`crystolia-gitops/production/values.yaml` (להחליף `latest` ב-SHA) — ל-Showcase.
4. ⬜ להחליט על MongoDB יחיד ב-gitops (למחוק את הכפילות Bitnami↔manual).

**תוצר:** קוד נקי שעובר את כל ה-static checks.

---

## שלב 1 — Cheap Production MVP (היעד העיקרי) — ~2–3 שעות עבודה + זמן propagation

המטרה: `crystolia.com` (כבר חי) + `admin.crystolia.com` + `api.crystolia.com` חיים ויציבים על Lightsail.

| # | פעולה | מי | סיכון/עלות |
|---|---|---|---|
| 1.1 | להקים **MongoDB Atlas M0** (free, replica-set) ולהשיג connection string | 🔐 אתה | חינם |
| 1.2 | להגדיר GitHub secrets: `DEMO_SSH_HOST/USER/KEY` (+ אופציונלי `GHCR_PAT`) | 🔐 אתה | חינם |
| 1.3 | `terraform apply` ב-`terraform-cheap` → Lightsail instance + static IP | 🔐 אתה (אני מכין פקודות) | ~$12/חודש |
| 1.4 | להפנות DNS A records (admin/api) ל-static IP | 🔐 אתה | חינם |
| 1.5 | למלא `.env.demo` על השרת (Atlas URI, JWT_SECRET, CORS) | 🔐 אתה (אני מכין template) | — |
| 1.6 | להריץ `demo-deploy.yml` (workflow_dispatch) → build+push+deploy | אני מכין, אתה מאשר run | — |
| 1.7 | אימות: HTTPS תקין, login עובד, health=200 | אני מאמת | — |

**תוצר:** Cheap Production חי ויציב. **זה מה שמחזיקים קבוע באוויר.**

### שיפורי MVP (nice-to-have, מיד אחרי שעולה)
- ⬜ Atlas automated backups (מובנה ב-M0? לא — לשקול M2/snapshot ידני) — 🔐
- ⬜ Uptime monitoring חיצוני (UptimeRobot/BetterStack — free tier) — 🔐
- ⬜ Cron ל-`docker image prune` + log rotation על השרת
- ⬜ Fail2ban / SSH hardening בסיסי על ה-box

---

## שלב 2 — Enterprise Showcase (אחרי ש-Cheap יציב) — ~half day להרמה

המטרה: אשכול EKS מלא, תקין, ניתן להרמה ב-on-demand להדגמות. **לא 24/7.**

| # | פעולה | מי | עלות |
|---|---|---|---|
| 2.1 | לנקות dead config (modules/addons, *.disabled) | אני | — |
| 2.2 | לאמת `terraform plan` נקי ב-`crystolia-infra/terraform` | אני מכין, אתה מריץ plan | חינם (plan) |
| 2.3 | להוסיף ArgoCD Application ל-production values (חסר!) | אני | — |
| 2.4 | לפתוח prod DNS records ב-`dns.tf` (api/admin) | אני מכין, 🔐 אתה apply | — |
| 2.5 | `bring-up`: `startup-all.sh` → EKS+nodes+ALB+ArgoCD | 🔐 אתה | ~$215–250/חודש בזמן ריצה |
| 2.6 | `fix-argocd.sh` + אימות sync של כל ה-apps | אני מלווה | — |
| 2.7 | תיעוד runbook "הרמה להדגמה תוך 20 דק'" | אני | — |
| 2.8 | `shutdown-all.sh` בסיום הדגמה (חוסך ~$8/יום) | 🔐 אתה | — |

**תוצר:** Showcase שניתן להרים לראיון/הדגמה ולכבות אחרי, עם documentation מלא.

---

## עדיפויות (TL;DR)

**חובה ל-Production אמיתי (שלב 1):**
Atlas M0 · DEMO_SSH secrets · terraform-cheap apply · DNS · .env.demo · demo-deploy run.

**Nice-to-have:**
uptime monitoring · backups אוטומטיים · SSH hardening · ניקוי dead config · נעיצת tags.

**Showcase (שלב 2, לא דחוף):**
ArgoCD prod app · prod DNS · bring-up/shutdown runbooks · ניקוי כפילות Mongo.

---

## הערכת זמן לסגירה מלאה

| יעד | זמן עבודה שלי (הכנה) | זמן שלך (פעולות 🔐) | זמן קלנדרי (כולל propagation) |
|---|---|---|---|
| Cheap Production חי | ~2–3 שעות | ~30–45 דק' | חצי יום (DNS/TLS) |
| Showcase ניתן-להרמה | ~half day | ~1 שעה | יום–יומיים |
