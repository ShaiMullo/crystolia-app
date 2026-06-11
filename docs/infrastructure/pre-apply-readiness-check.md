# Pre-Apply Readiness Check

בדיקה מלאה לפני שמוציאים שקל ב-AWS. נכון ל-28/05/2026. **שום apply לא רץ.**

## 1. אימות אבטחה (אוטומטי — עבר ✅)

| בדיקה | תוצאה |
|---|---|
| כל 5 קבצי ה-config ב-`.gitignore` | ✅ (אומת ב-`git check-ignore`) |
| אין קבצי `.env`/`.tfvars` אמיתיים ב-git index | ✅ |
| ה-`JWT_SECRET` לא דלף לאף קובץ tracked | ✅ (`git grep` ריק) |
| `JWT_SECRET` זהה backend ↔ frontend-admin | ✅ |

קבצים שנבדקו: `backend/.env.demo`, `frontend-admin/.env.demo`, `frontend-client/.env.demo`, `deploy/demo/.env.demo`, `terraform-cheap/terraform.tfvars`.

## 2. אימות env ↔ code (עבר ✅)

| שירות | משתנים מיותרים | משתנים חסרים |
|---|---|---|
| backend | אין | רק `ULTRAMSG_BASE_URL` — **יש default** (`https://api.ultramsg.com`), אופציונלי. לא חוסם. |
| frontend-admin | אין | אין |
| frontend-client | אין | אין |
| deploy/demo (compose) | אין | אין (כל משתני ה-compose בעלי `:-` default) |

**מסקנה:** אין משתנה חובה חסר, אין משתנה מיותר, ולא הומצאו משתנים שלא בקוד.

## 3. ערכים מסוכנים שעדיין פתוחים (לפני apply)

| פריט | מצב | חובה לתקן לפני apply? |
|---|---|---|
| `terraform.tfvars` → `ssh_cidr = "0.0.0.0/0"` | פתוח לעולם | ⚠️ **כן** — לצמצם ל-`<your-ip>/32` |
| `terraform.tfvars` → `key_pair_name = ""` | ברירת מחדל אזורית | בסדר אם יש default key; אחרת למלא |
| `backend/.env.demo` → `MONGO_URI=CHANGE_ME` | placeholder | חובה לפני deploy (לא לפני apply) |
| `deploy/demo/.env.demo` → `ACME_EMAIL=CHANGE_ME` | placeholder | חובה לפני deploy (לא לפני apply) |

> ה-`MONGO_URI`/`ACME_EMAIL` נדרשים ל-**deploy** (Stage 6), לא ל-**apply** (Stage 4). ה-`ssh_cidr` נדרש ל-apply.

---

## 🔴 ACTION REQUIRED BY SHAI

לפני `terraform plan`/apply:
1. **[ssh_cidr]** ערוך `terraform-cheap/terraform.tfvars` → `ssh_cidr = "<your-ip>/32"` (קבל IP: `curl -s ifconfig.me`).
2. **[key pair]** ודא שיש Lightsail key pair (קונסולה → Account → SSH keys), או השאר `key_pair_name = ""` לברירת מחדל. הורד את ה-PEM.

לפני deploy (Stage 6, לא עכשיו):
3. **[Atlas M0]** הקם cluster + DB user `crystolia_app` + Network Access.
4. **[MONGO_URI]** הדבק connection string ל-`backend/.env.demo`.
5. **[ACME_EMAIL]** מלא מייל אמיתי ב-`deploy/demo/.env.demo`.
6. **[GitHub secrets]** `DEMO_SSH_HOST` (אחרי apply), `DEMO_SSH_USER`, `DEMO_SSH_KEY`.
7. **[DNS]** A records ל-`admin`/`api` (Stage 5, אחרי שיש IP).

---

## 4. פקודות לפי סדר (להריץ אצלך — עד `plan` בלבד)

```bash
# ── בדיקות סביבה ──────────────────────────────────────────────
aws sts get-caller-identity                       # מי אני ב-AWS? (מאשר חיבור)
aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='crystolia.com.']"  # יש zone? (אם ריק → DNS חיצוני)
curl -s ifconfig.me; echo                          # ה-IP הציבורי שלך (ל-ssh_cidr)
gh auth status                                     # GitHub CLI מחובר?

# ── הגדרת GitHub secrets (אפשר עכשיו את USER+KEY; HOST אחרי apply) ──
gh secret set DEMO_SSH_USER --repo shaimullo/crystolia-app --body "ubuntu"
gh secret set DEMO_SSH_KEY  --repo shaimullo/crystolia-app < ~/.ssh/<your-demo-key>.pem
# (DEMO_SSH_HOST אחרי Stage 4 כשיש static IP)
gh secret list --repo shaimullo/crystolia-app

# ── ערוך terraform.tfvars (ssh_cidr, key_pair_name) ואז: ─────────
cd terraform-cheap
terraform init            # מוריד provider — לא יוצר משאבים
terraform validate        # תקינות תחביר/לוגיקה
terraform plan            # ⬅️ עצור כאן. סקור מה ייווצר. אל תריץ apply.
```

### ⛔ לא להריץ עדיין
`terraform apply` · `terraform destroy` · workflow deploy · שינוי DNS · יצירת resources · שינוי IAM.

---

## 5. GO / NO-GO

| שאלה | תשובה |
|---|---|
| אפשר לעבור ל-`terraform plan`? | ✅ **GO** — אחרי שתערוך `ssh_cidr` ל-IP שלך |
| חסמים? | אין חסמים טכניים. רק 2 עריכות ידניות (ssh_cidr, key_pair) |
| סיכונים לפני apply? | `ssh_cidr` פתוח — לתקן. אין סיכון אחר; `plan` לא יוצר כלום |
| מוכן להוצאת כסף? | עדיין **לא** — apply (Stage 4) רק אחרי שתראה לי `plan` ותאשר |

### השלב הבא המדויק
1. `curl -s ifconfig.me` → קח IP.
2. ערוך `terraform-cheap/terraform.tfvars`: `ssh_cidr = "<ip>/32"`.
3. `cd terraform-cheap && terraform init && terraform validate && terraform plan`.
4. שלח לי את פלט ה-`plan` — נעבור עליו יחד, ורק אז (אחרי אישורך) Stage 4 = apply.

**מצב כללי: 🟢 READY FOR `terraform plan`** (לא ל-apply).
