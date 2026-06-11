# Cheap Production — Lightsail + Docker Compose

התשתית שמחזיקים **קבוע באוויר** לשימוש יומיומי. שרת יחיד, זול, פשוט.

## רכיבים

| רכיב | מה זה עושה | קובץ |
|---|---|---|
| AWS Lightsail instance | שרת יחיד (Ubuntu 22, `small_3_0` = 2GB RAM) שמריץ הכל | `terraform-cheap/main.tf` |
| Static IP | IP קבוע ל-DNS | `terraform-cheap/main.tf` |
| user_data | מתקין Docker+Compose ב-boot ראשון, מכין `/opt/crystolia` | `terraform-cheap/scripts/install-docker.sh` |
| Caddy | reverse proxy + HTTPS אוטומטי (Let's Encrypt) ל-3 hosts | `deploy/demo/Caddyfile` |
| Compose stack | backend + frontend-admin + frontend-client (+mongo אופציונלי) | `docker-compose.demo.yml` |
| MongoDB Atlas M0 | DB מנוהל, חינמי, replica-set (טרנזקציות עובדות) | חיצוני |
| GHCR | מאגר ה-images | `ghcr.io/shaimullo/crystolia-*` |
| demo-deploy workflow | build→push→ssh deploy | `.github/workflows/demo-deploy.yml` |

## דרישות מקדימות (חד-פעמי) 🔐

1. **MongoDB Atlas M0** — להקים cluster חינמי, להוסיף IP של ה-box ל-allowlist, להעתיק connection string.
2. **GitHub secrets** במאגר `crystolia-app`:
   - `DEMO_SSH_HOST` — IP של ה-Lightsail
   - `DEMO_SSH_USER` — `ubuntu`
   - `DEMO_SSH_KEY` — private key (PEM)
   - `GHCR_PAT` *(אופציונלי)* — רק אם ה-packages פרטיים
3. **Lightsail key pair** — להוריד מהקונסולה (או להשתמש בברירת המחדל של האזור).

## הרמה ראשונית — פקודות מוכנות

> ⚠️ שלב 1 (terraform apply) יוצר משאב שעולה כסף (~$12/חודש). הרץ רק אחרי אישור.

```bash
# 1) הקמת השרת (מתוך crystolia-app/terraform-cheap)
cd terraform-cheap
cp terraform.tfvars.example terraform.tfvars     # ערוך לפי הצורך
terraform init
terraform plan                                    # סקור!
terraform apply                                   # 🔐 ~$12/mo
terraform output static_ip                        # → קח את ה-IP ל-DNS
```

```bash
# 2) DNS — הפנה A records ל-static IP (ידנית או manage_dns=true)
#    admin.crystolia.com  → <STATIC_IP>
#    api.crystolia.com    → <STATIC_IP>
#    (crystolia.com כבר ב-CloudFront — ראה enterprise/landing)
```

```bash
# 3) הגדרת env על השרת (חד-פעמי)
ssh ubuntu@<STATIC_IP>
sudo mkdir -p /opt/crystolia/deploy/demo
# העתק את הקבצים: docker-compose.demo.yml, deploy/demo/Caddyfile
# צור את קבצי ה-.env.demo:
#   deploy/demo/.env.demo            (IMAGE_PREFIX, domains, ACME_EMAIL)
#   backend/.env.demo                (MONGO_URI=Atlas, JWT_SECRET, CORS)
#   frontend-admin/.env.demo         (JWT_SECRET זהה לבקאנד, BACKEND_URL)
#   frontend-client/.env.demo        (BACKEND_URL)
# התבניות: *.env.demo.example בכל תיקייה
```

```bash
# 4) Deploy ראשון — דרך GitHub Actions (מומלץ)
#    Actions → "Demo Deploy" → Run workflow → ref=main
#    הזרימה: verify → build & push GHCR → scp compose+Caddyfile → ssh remote-deploy
```

## Deploy שוטף

פשוט מריצים שוב את ה-workflow **Demo Deploy** (workflow_dispatch). הוא:
1. typecheck ל-backend+admin (quality gate)
2. בונה ודוחף 3 images ל-GHCR (tag = commit SHA + `demo-latest`)
3. מעתיק compose+Caddyfile ל-`/opt/crystolia`
4. מריץ `remote-deploy.sh`: `pull → up -d → health-check (/api/health) → prune`

## Rollback

```bash
ssh ubuntu@<STATIC_IP>
cd /opt/crystolia
# פרוס tag קודם ספציפי (SHA מ-GHCR):
IMAGE_TAG=<previous-sha> docker compose -f docker-compose.demo.yml \
  --env-file deploy/demo/.env.demo up -d
```
ראה גם `docs/deployment-cheap/rollback.md`.

## MongoDB — Atlas מול local

- **מומלץ: Atlas M0** — replica-set אמיתי ⇒ טרנזקציות (Phase 7/8) עובדות אטומית.
- **Fallback: mongo container** — `docker compose --profile local-mongo up -d`. Standalone ⇒ ללא טרנזקציות; ה-app נופל בחן ל-fallback mode (Admin→System יראה "Fallback mode").

## תחזוקה שוטפת (מומלץ להוסיף)
- Cron: `docker image prune -f` שבועי + log rotation.
- Uptime monitor חיצוני (UptimeRobot/BetterStack — free) על `/api/health`.
- גיבוי: Atlas M0 ללא backup אוטומטי — לשקול snapshot ידני או שדרוג ל-M2.
- SSH hardening: לצמצם `ssh_cidr` מ-`0.0.0.0/0` ל-IP שלך; fail2ban.

## עלות
~$12/חודש (Lightsail) + $0 (Atlas M0) + $0 (GHCR public). ראה [cost-estimates.md](cost-estimates.md).

## מצב נוכחי
⚠️ הקוד מוכן ~90%. **טרם הורם** — אין instance, אין Atlas, אין secrets. ראה [ROADMAP.md](ROADMAP.md) שלב 1.
