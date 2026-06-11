# Cheap Production — Next Steps (Stage 1 + 3 ready)

הקרקע הוכנה. **שום משאב לא נוצר, שום apply לא רץ.** המסמך הזה אומר בדיוק מה לעשות ידנית, מה הפקודה הבאה, ומה עוד אסור להריץ.

## מה כבר מוכן (קבצים, git-ignored)

| קובץ | מצב | מה חסר למלא ידנית |
|---|---|---|
| `backend/.env.demo` | ✅ template מלא | `MONGO_URI` (משלב Atlas) |
| `frontend-admin/.env.demo` | ✅ JWT תואם backend | — |
| `frontend-client/.env.demo` | ✅ | — |
| `deploy/demo/.env.demo` | ✅ | `ACME_EMAIL` (המייל שלך) |
| `terraform-cheap/terraform.tfvars` | ✅ ערכים בטוחים | `ssh_cidr` (ה-IP שלך), `key_pair_name` |

> `JWT_SECRET` כבר יוצר (אקראי) וזהה ב-backend+admin. לרוטציה: `openssl rand -hex 32` בשני הקבצים.

---

## Stage 1 — MongoDB Atlas (ידני, ~15 דק', $0)

לא להריץ שום פקודה אצלי — זה בקונסולת Atlas:

1. **צור Project + Cluster M0** ב-https://cloud.mongodb.com → "Build a Database" → **M0 Free** → Provider AWS, Region `us-east-1`.
2. **Database user**: Database Access → Add New Database User → Authentication=Password.
   - Username: `crystolia_app`
   - Password: צור חזק (Autogenerate) — שמור אותו.
   - Role: `Read and write to any database` (או scoped ל-`crystolia`).
3. **Network Access**: Network Access → Add IP Address.
   - כרגע אפשר `0.0.0.0/0` זמנית לבדיקה, **אבל** אחרי Stage 4 החלף ל-static IP של ה-Lightsail בלבד.
4. **Connection string**: Database → Connect → Drivers → Node.js. תקבל:
   ```
   mongodb+srv://crystolia_app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   הוסף את שם ה-DB אחרי הסלאש: `.../crystolia?retryWrites=...`
5. **הדבק ל-`backend/.env.demo`** במקום `CHANGE_ME__ATLAS_SRV_CONNECTION_STRING`.

✅ Atlas ready כשיש לך connection string תקין ב-`backend/.env.demo`.

---

## Stage 2 — GitHub Secrets (להגדיר, פקודות מוכנות)

נדרשים במאגר `crystolia-app`. דורש `gh` מחובר (`gh auth login`).

| Secret | למה משמש | חובה? |
|---|---|---|
| `DEMO_SSH_HOST` | IP של ה-Lightsail (ידוע אחרי Stage 4) | ✅ חובה |
| `DEMO_SSH_USER` | משתמש SSH (`ubuntu`) | ✅ חובה |
| `DEMO_SSH_KEY` | private key (PEM) להתחברות לשרת | ✅ חובה |
| `GHCR_PAT` | PAT עם `read:packages` | ⭕ רק אם ה-packages פרטיים |

פקודות (מלא ערכים אמיתיים; את HOST אחרי Stage 4):
```bash
gh secret set DEMO_SSH_USER  --repo shaimullo/crystolia-app --body "ubuntu"
gh secret set DEMO_SSH_HOST  --repo shaimullo/crystolia-app --body "<STATIC_IP_FROM_STAGE_4>"
gh secret set DEMO_SSH_KEY   --repo shaimullo/crystolia-app < ~/.ssh/crystolia-demo.pem
# אופציונלי:
gh secret set GHCR_PAT       --repo shaimullo/crystolia-app --body "<github_pat_read_packages>"

# אימות:
gh secret list --repo shaimullo/crystolia-app
```
> אופציונלי: `gh variable set DEMO_SSH_PORT --repo shaimullo/crystolia-app --body "22"`

---

## Stage 3 — Terraform validate/plan (אתה מריץ; $0, לא יוצר כלום)

לפני: ערוך ב-`terraform-cheap/terraform.tfvars` את `ssh_cidr` (ל-`$(curl -s ifconfig.me)/32`) ו-`key_pair_name`.

```bash
cd terraform-cheap
terraform init                     # מוריד provider, לא יוצר משאבים
terraform validate                 # בדיקת תקינות
terraform plan                     # סקור! מראה מה ייווצר (instance, static IP, ports)
```

✅ Terraform vars ready כש-`terraform plan` נקי ואתה מבין כל resource שייווצר.

---

## ⛔ מה עדיין אסור להריץ (עד אישור מפורש)

- `terraform apply` / `terraform destroy`
- כל יצירת/מחיקת resource ב-AWS
- שינוי DNS / Route53
- שינוי IAM
- deploy אמיתי / הרצת workflow ה-Deploy

הפקודה הבאה שמותר להריץ עכשיו: **`terraform plan`** (Stage 3) — וגם `scripts/validate-env.sh`.

---

## ✅ Checklist לפני apply (Stage 4)
- [ ] `backend/.env.demo` → `MONGO_URI` אמיתי מ-Atlas
- [ ] `deploy/demo/.env.demo` → `ACME_EMAIL` אמיתי
- [ ] `terraform.tfvars` → `ssh_cidr` = ה-IP שלי /32
- [ ] `terraform.tfvars` → `key_pair_name` מוגדר (או "" לברירת מחדל)
- [ ] `terraform plan` נסקר ואושר
- [ ] `scripts/validate-env.sh` רץ (מה שאפשר בשלב זה)

## ✅ Checklist אחרי apply (Stage 4→5)
- [ ] `terraform output static_ip` → רשום את ה-IP
- [ ] עדכן `DEMO_SSH_HOST` secret ל-static IP
- [ ] עדכן Atlas Network Access ל-static IP (הסר את 0.0.0.0/0)
- [ ] צור A records: `admin` + `api` → static IP (Stage 5)
- [ ] `dig +short admin.crystolia.com` מחזיר את ה-IP
- [ ] העלה את קבצי `.env.demo` לשרת (`/opt/crystolia/...`)
- [ ] הרץ Demo Deploy (Stage 6) — רק אחרי אישור

---

## הפקודה הבאה שלך

```bash
# 1) מלא Atlas → backend/.env.demo (MONGO_URI)
# 2) ערוך terraform.tfvars (ssh_cidr, key_pair_name)
# 3) ואז, ללא apply:
cd terraform-cheap && terraform init && terraform plan
```
כשתרצה — תראה לי את פלט ה-`plan`, ונעבור יחד ל-Stage 4 (apply) רק אחרי אישורך.
