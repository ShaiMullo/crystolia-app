# Cleanup — Dead Code / Duplicates / Obsolete

סריקה של 3 המאגרים. לכל פריט: סיווג **🗑️ SAFE TO DELETE** או **📦 KEEP FOR SHOWCASE** או **⚠️ DECIDE**.
> שום דבר כאן לא נמחק אוטומטית. זו רשימת המלצות בלבד.

## crystolia-app

| פריט | סיווג | נימוק |
|---|---|---|
| `capture-screens.command` | 🗑️ SAFE TO DELETE | helper זמני שיצרתי לצילומי הספר; לא חלק מהפרויקט |
| `launch-demo.command` | 🗑️ SAFE TO DELETE | helper זמני להרמת stack מקומי; `make up` מחליף |
| `restart-admin.command` | 🗑️ SAFE TO DELETE | helper זמני (אחרי תיקון ה-lib mount כבר לא נחוץ) |
| `.env` (root, מקומי) | ⚠️ DECIDE | יצרתי אותו ל-MVP מקומי; gitignored. למחוק אם לא בשימוש |
| `docker-compose.dev.yml` | 📦 KEEP | overrides לפיתוח; קטן, לא מזיק |
| `helm/crystolia-chart` | 📦 KEEP FOR SHOWCASE | משמש את ה-EKS showcase |

## crystolia-infra/terraform

| פריט | סיווג | נימוק |
|---|---|---|
| `route53.tf.disabled` | 🗑️ SAFE TO DELETE | הוחלף ב-`dns.tf` הפעיל |
| `argocd_root_app.tf.disabled` | 🗑️ SAFE TO DELETE | גישת kubernetes_manifest ננטשה; root-app מיושם ב-kubectl (מתועד ב-`argocd-root-app.tf`) |
| `destroy.plan` | 🗑️ SAFE TO DELETE | plan binary ישן (gitignored, לא tracked) — clutter |
| `dns.tfplan` | 🗑️ SAFE TO DELETE | plan binary ישן (gitignored) |
| `modules/addons` | ⚠️ DECIDE | **לא referenced** מאף `.tf`. אם מיועד לעתיד → KEEP; אחרת SAFE TO DELETE |
| `argocd.tf` + `argocd-root-app.tf` | 📦 KEEP FOR SHOWCASE | התקנת ArgoCD פעילה ל-EKS |
| `terraform-landing`, `terraform-leads` | 📦 KEEP | חיים בפועל (CloudFront + Lambda) |

## crystolia-gitops

| פריט | סיווג | נימוק |
|---|---|---|
| כפילות MongoDB: Bitnami app + `mongo/` manifest ידני | ⚠️ DECIDE (חשוב) | שניהם בשם `mongo` ב-ns crystolia → התנגשות. **לבחור אחד**: Bitnami (מומלץ) ולמחוק `mongo/` |
| `.env` + `.env.local` (בעץ העבודה) | ⚠️ DECIDE | מכילים secrets אמיתיים, gitignored, **לא** committed. מומלץ לסובב ולמחוק את הכפילות |
| `production/values.yaml` | 📦 KEEP FOR SHOWCASE | צריך גם ArgoCD Application (חסר) |
| `.playwright-mcp/` | 🗑️ SAFE TO DELETE | תוצרי הרצה ישנים של playwright |
| `staging/modes/*` (cheap/sabbath) | 📦 KEEP FOR SHOWCASE | מנגנון חיסכון לאשכול |

## חשוב — אבחנה ל-Cheap Production

אף אחד מפריטי ה-🗑️ **לא נוגע ב-Cheap Production**. כולם שייכים ל-Showcase או ל-helpers זמניים. ניתן לנקות אותם בבטחה בלי להשפיע על ההרמה הזולה.

## פעולות מומלצות (אחרי אישורך)
```bash
# crystolia-app — helpers זמניים
rm crystolia-app/{capture-screens,launch-demo,restart-admin}.command

# crystolia-infra — קבצים מושבתים + plan artifacts
rm crystolia-infra/terraform/{route53.tf.disabled,argocd_root_app.tf.disabled,destroy.plan,dns.tfplan}

# crystolia-gitops — playwright artifacts
rm -rf crystolia-gitops/.playwright-mcp
```
> ⚠️ כפילות MongoDB ו-secrets בעץ העבודה דורשים החלטה ידנית — לא לכלול ב-rm עיוור.
