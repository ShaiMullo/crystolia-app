# Crystolia — Infrastructure Documentation

תיעוד התשתית המלא של Crystolia. הפרויקט מחזיק **שתי תשתיות נפרדות בכוונה** לאותה אפליקציה.

| תשתית | מטרה | מתי משתמשים | עלות |
|---|---|---|---|
| **Cheap Production** | שימוש יומיומי אמיתי, קבוע באוויר | תמיד | ~$12/חודש |
| **Enterprise Showcase** | הדגמה מקצועית (ראיונות/בוחנים/לקוחות) | on-demand | ~$215–250/חודש בזמן ריצה |

## מפת המסמכים

| מסמך | תוכן |
|---|---|
| [architecture-overview.md](architecture-overview.md) | תרשים כללי, רכיבים, איך הכל מתחבר |
| [cheap-production.md](cheap-production.md) | Lightsail + Compose + Caddy + Atlas — המדריך המלא |
| [enterprise-showcase.md](enterprise-showcase.md) | EKS + ArgoCD + Helm + monitoring — הרמה וכיבוי |
| [local-development.md](local-development.md) | הרצה מקומית (`make up`), ports, seed |
| [deployment-flow.md](deployment-flow.md) | זרימת deploy מקצה לקצה לשתי התשתיות + rollback |
| [ci-cd.md](ci-cd.md) | כל ה-GitHub Actions workflows |
| [troubleshooting.md](troubleshooting.md) | תקלות נפוצות ופתרונות |
| [cost-estimates.md](cost-estimates.md) | פירוט עלויות לשתי התשתיות |
| [STATUS.md](STATUS.md) | מטריצת מצב ✅/⚠️/❌/💤 לכל רכיב |
| [ROADMAP.md](ROADMAP.md) | תוכנית עבודה — cheap-first |

## כלים

- `validate-all.sh` — בדיקות סטטיות (helm lint / terraform validate / compose config / yamllint). בטוח להרצה, אפס פעולות ענן.

## מאגרים

| repo | תפקיד |
|---|---|
| `crystolia-app` | אפליקציה + Cheap Production (terraform-cheap, deploy/demo) + Helm chart |
| `crystolia-infra` | Terraform ל-EKS/ECR/ALB/OIDC + terraform-landing + terraform-leads |
| `crystolia-gitops` | ArgoCD apps + Helm values (staging/prod) + monitoring + modes |

> ⚠️ **כלל זהב:** אף פעם לא מריצים `terraform apply/destroy`, שינוי DNS, או deploy אמיתי בלי אישור מפורש. כל הפקודות מוכנות במסמכים — אתה מריץ.
