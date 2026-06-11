# Terraform Plan Runbook (NO apply)

מטרה: להגיע ל-`terraform plan` נקי ומובן, ואז לעצור. אף פקודה כאן לא יוצרת resource.
הרץ הכל מ-`crystolia-app/terraform-cheap` אלא אם צוין אחרת.

---

## שלב A — בדיקות סביבה (read-only)

```bash
# 1) מי אני ב-AWS? (מאשר חיבור + חשבון נכון)
aws sts get-caller-identity

# 2) יש hosted zone ל-crystolia.com? (אם ריק → DNS חיצוני, נטפל ב-Stage 5)
aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='crystolia.com.'].{Name:Name,Id:Id}" --output table

# 3) ה-IP הציבורי שלך (ל-ssh_cidr)
curl -s ifconfig.me; echo
```

---

## שלב B — עדכון ssh_cidr ב-terraform.tfvars

החלף `<your-ip>` בערך שקיבלת מ-`curl ifconfig.me`:

```bash
# מ-crystolia-app/terraform-cheap
MY_IP="$(curl -s ifconfig.me)"
# macOS sed:
sed -i '' "s|^ssh_cidr.*|ssh_cidr = \"${MY_IP}/32\"|" terraform.tfvars
# אימות:
grep ssh_cidr terraform.tfvars      # אמור להראות את ה-IP שלך /32
```

> אם אתה בבית עם IP דינמי שמשתנה — זה בסדר, נעדכן שוב בעת הצורך. אפשר גם להוסיף /32 שני ידנית.

---

## שלב C — בדיקת key pair  🔴 ACTION REQUIRED BY SHAI

```bash
# בדיקה: אילו key pairs קיימים ב-Lightsail באזור
aws lightsail get-key-pairs --region us-east-1 \
  --query "keyPairs[].name" --output table
```

**אם יש key pair קיים שתרצה להשתמש בו:**
```bash
# מ-crystolia-app/terraform-cheap — עדכן את השם ב-tfvars:
sed -i '' 's|^key_pair_name.*|key_pair_name = "<EXISTING_KEY_NAME>"|' terraform.tfvars
```

**אם אין key pair / תרצה אחד ייעודי** — יצירה דורשת אישורך (זה לא יוצר עלות, אבל זו פעולת mutate):
```bash
# 🔴 רק אחרי שתחליט — יוצר key pair חדש ושומר PEM מקומית:
aws lightsail create-key-pair --region us-east-1 --key-pair-name crystolia-demo \
  --query 'privateKeyBase64' --output text | base64 --decode > ~/.ssh/crystolia-demo.pem
chmod 600 ~/.ssh/crystolia-demo.pem
# ואז:
sed -i '' 's|^key_pair_name.*|key_pair_name = "crystolia-demo"|' terraform.tfvars
```

**אם תשאיר `key_pair_name = ""`** — Lightsail ישתמש ב-default key pair של האזור (צריך שיהיה כזה; הורד את ה-PEM שלו מהקונסולה ל-SSH בהמשך).

> ל-`terraform plan` עצמו ה-key pair לא חוסם — אבל עדיף לסגור עכשיו כדי שה-apply יהיה חלק.

---

## שלב D — terraform init / validate / plan (לא יוצר כלום)

```bash
cd terraform-cheap          # אם עוד לא שם
terraform init              # מוריד provider AWS ~> 5.0. לא יוצר resources.
terraform validate          # תקינות תחביר ולוגיקה
terraform plan              # ⬅️ עצור כאן. סקור. אל תריץ apply.
```

> טיפ: לשמור את הפלט לקובץ נוח לשיתוף:
> ```bash
> terraform plan -no-color > /tmp/crystolia-plan.txt 2>&1
> ```

---

## למה לצפות ב-plan (כדי שתזהה אם משהו חריג)

עם `manage_dns = false`, ה-plan אמור להראות **`Plan: 4 to add, 0 to change, 0 to destroy`**:

| # | resource | מה זה |
|---|---|---|
| 1 | `aws_lightsail_instance.demo` | השרת (Ubuntu 22, small_3_0) |
| 2 | `aws_lightsail_static_ip.demo` | IP קבוע |
| 3 | `aws_lightsail_static_ip_attachment.demo` | חיבור ה-IP לשרת |
| 4 | `aws_lightsail_instance_public_ports.demo` | firewall (22 מ-ssh_cidr, 80, 443 tcp+udp) |

🚩 **דגלים אדומים** (אם תראה — עצור ושלח לי):
- `to destroy` > 0 (לא אמור להיות שום מחיקה)
- resources של route53 / IAM / EKS / כל דבר מעבר ל-4 הנ"ל
- `0.0.0.0/0` בפורט 22 (סימן ש-ssh_cidr לא התעדכן)

---

## ⛔ לא להריץ עדיין
`terraform apply` · `terraform destroy` · workflow deploy · שינוי DNS · שינוי IAM · יצירת resources (פרט ל-key pair באישורך).

---

## אחרי ה-plan
שלח לי את הפלט (או `/tmp/crystolia-plan.txt`). אני אעבור עליו ואחזיר:
מה ייווצר · עלות מוערכת · דגלים מסוכנים · התאמה ל-Cheap Production · **GO / NO-GO ל-apply**.
