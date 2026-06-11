# Terraform Plan — Analysis & GO/NO-GO

מקור: `terraform plan` אמיתי שרץ במחשב של Shai (28/05/2026). פלט מלא: `~/Downloads/crystolia-plan-output.txt`.
**לא בוצע apply.**

## 1. האם plan הצליח?
✅ כן. `terraform init` ✓, `terraform validate` → "Success! The configuration is valid", `terraform plan` הסתיים נקי.
- Terraform v1.5.7, aws-cli 2.33.28, provider hashicorp/aws v5.100.0.

## 2. כמה resources ייווצרו?
**`Plan: 4 to add, 0 to change, 0 to destroy`**

| # | resource | פרטים |
|---|---|---|
| 1 | `aws_lightsail_instance.demo` | `ubuntu_22_04`, `small_3_0`, name `crystolia-demo` |
| 2 | `aws_lightsail_static_ip.demo` | name `crystolia-demo-ip` |
| 3 | `aws_lightsail_static_ip_attachment.demo` | מחבר IP↔instance |
| 4 | `aws_lightsail_instance_public_ports.demo` | firewall |

## 3. destroy / change?
✅ **0 to change, 0 to destroy.** אין שום מחיקה או שינוי של משאב קיים. בנייה טהורה.

## 4. DNS / IAM / EKS בטעות?
✅ **נקי.** אין `aws_route53_record`, אין `aws_iam_*`, אין EKS, אין כלום מעבר ל-4 הנ"ל. (האזכור היחיד של route53 הוא בבדיקת ה-read-only שלי, לא resource.)

## 5. האם פורט SSH מוגבל ל-IP שלך בלבד?
✅ **כן.** firewall שייווצר:
- port **22/tcp** → cidrs `["<YOUR_PUBLIC_IP>/32"]` (ה-IP הציבורי שלך בלבד) ✓
- port **80/tcp** → פתוח (נדרש ל-HTTP→HTTPS redirect)
- port **443/tcp** + **443/udp** → פתוח (HTTPS + HTTP/3) ✓

## 6. עלות משוערת
- Lightsail `small_3_0`: **~$12/חודש** (2GB RAM)
- Static IP: $0 כל עוד מחובר ל-instance פעיל
- **סה"כ ~$12/חודש.** (Atlas M0 חינמי בנפרד.)

## 7. תואם Cheap Production?
✅ **מדויק.** בדיוק הסטאק המתוכנן: שרת יחיד + IP קבוע + firewall מינימלי. אפס over-provisioning, אפס רכיבי Enterprise.

---

## 8. ממצאים שדורשים תשומת לב לפני apply

### 🔴 חוסם usable deploy — Lightsail key pair
`Key pairs found: <none>` ו-`key_pair_name = ""`. המשמעות: גם אם apply יצליח, **לא יהיה מפתח SSH** לשרת — וה-deploy workflow (וגם אתה) צריכים SSH. **חובה לפתור לפני apply.**
**ACTION REQUIRED BY SHAI** — בחר אחת:
```bash
# אופציה א' (מומלץ) — צור key pair ייעודי (פעולת mutate, באישורך):
aws lightsail create-key-pair --region us-east-1 --key-pair-name crystolia-demo \
  --query 'privateKeyBase64' --output text | base64 --decode > ~/.ssh/crystolia-demo.pem
chmod 600 ~/.ssh/crystolia-demo.pem
# ואז ב-terraform-cheap/terraform.tfvars:
#   key_pair_name = "crystolia-demo"
```
> ה-PEM הזה הוא גם מה שתכניס ל-GitHub secret `DEMO_SSH_KEY` בהמשך.

### 🟡 המלצת אבטחה — לא root
AWS identity בפלט: `arn:aws:iam::268456953512:root`. אתה עובד עם **מפתחות root** — נוגד best practice. לא חוסם את ה-apply, אבל מומלץ מאוד ליצור IAM user ייעודי עם הרשאות מצומצמות (Lightsail + Route53) ולהשתמש בו. אפשר לטפל בזה אחרי שה-MVP עולה.

### 🟢 בונוס — Route53 zone קיים
נמצא zone ל-crystolia.com: `Z09838333QSV2YSAPVCWL`. כלומר ב-Stage 5 נוכל לנהל DNS דרך terraform (`manage_dns=true` + ה-zone id) אם תרצה — חלופה נקייה ליצירה ידנית.

---

## 9. GO / NO-GO ל-apply

| שאלה | תשובה |
|---|---|
| ה-plan עצמו נקי ותקין? | ✅ כן |
| תואם Cheap Production? | ✅ מדויק |
| סיכון מחיקה/שינוי? | ✅ אין (0/0) |
| SSH מאובטח? | ✅ ל-IP שלך בלבד |
| מוכן ל-apply עכשיו? | ⚠️ **כמעט** — חסר key pair |

### ההכרעה: 🟡 CONDITIONAL GO
ה-plan מאושר טכנית. **חסם יחיד לפני apply: ליצור/לבחור Lightsail key pair** (🔴 ACTION REQUIRED). ברגע שזה מסודר ו-`key_pair_name` מעודכן — זה **GO ל-apply** (Stage 4), באישורך המפורש.

### השלב הבא המדויק
1. 🔴 צור key pair (פקודה בסעיף 8) → עדכן `key_pair_name` ב-tfvars.
2. (אופציונלי, מומלץ) הקם Atlas M0 + מלא `MONGO_URI` ו-`ACME_EMAIL` — כדי שאחרי apply נמשיך ישר ל-deploy.
3. הרץ שוב `terraform plan` (לוודא שעכשיו מופיע key_pair_name) ושלח לי.
4. רק אז — באישורך — `terraform apply` (Stage 4).

⛔ עד אישור מפורש: לא apply, לא יצירת key pair (פרט להחלטתך), לא DNS, לא deploy.
