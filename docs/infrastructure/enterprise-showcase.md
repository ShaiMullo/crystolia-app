# Enterprise Showcase — EKS + ArgoCD + Helm

תשתית Enterprise מלאה להדגמת ידע מקצועי. **לא רצה 24/7** — מרימים on-demand להדגמה, מכבים אחרי.

## רכיבים (crystolia-infra/terraform)

| רכיב | פירוט | קובץ |
|---|---|---|
| VPC | `10.0.0.0/16`, 2 AZ, **single NAT** (חיסכון) | `modules/vpc` |
| EKS | **v1.29**, node group `general-demo`, ON_DEMAND `t3.medium`, min2/desired3/max4, disk 20GB | `modules/eks` |
| ECR | 3 repos, scan-on-push, keep-last-10, force_delete | `ecr.tf` |
| ACM | cert `crystolia.com` + `*.crystolia.com` (DNS-validated) | `modules/acm` |
| ALB Controller | Helm `aws-load-balancer-controller` v3.1.0 (⚠️ לאמת גרסה) | `load-balancer-controller.tf` |
| ArgoCD | Helm argo-cd 5.51.6, Ingress `argocd.crystolia.com` | `argocd.tf` |
| external-secrets IRSA | scoped ל-`secretsmanager:.../crystolia/*` | `iam-external-secrets.tf` |
| EBS CSI | driver + `gp3-csi` StorageClass | `ebs-csi.tf` |
| GitHub OIDC | terraform-role (plan), ecr-push-role | `github_oidc.tf` |
| DNS | Route53 records — staging בלבד (**prod מוערים-בחוץ**) | `dns.tf` |

נלווים: **terraform-landing** (S3+CloudFront ל-crystolia.com) ו-**terraform-leads** (Lambda+APIGW+DynamoDB).

## GitOps (crystolia-gitops)

- **app-of-apps**: `argocd/bootstrap/root-app.yaml` → מסנכרן את `argocd/apps/*`.
- Apps: `crystolia` (chart מ-app repo + values מ-gitops), `crystolia-mongodb` (Bitnami), `external-secrets`(+config), `loki`, `promtail`, `monitoring` (kube-prometheus-stack), `maintenance`.
- Values: `staging/values.yaml` (פעיל), `production/values.yaml` (**קיים אך לא מחובר ל-ArgoCD**).
- **Modes** (חיסכון): `cheap.yaml` (replicas=1), `sabbath.yaml` (scale-to-0 + maintenance page), `monitoring-cheap.yaml`.
- אוטומציה: `.github/workflows/sabbath-mode.yml` (cron UTC — לא זמני שבת אמיתיים).

## הרמה להדגמה — זרימה (פקודות מוכנות)

> ⚠️ כל שלב כאן יוצר משאבים שעולים כסף. הרץ רק אחרי אישור. סדר חשוב.

```bash
# 1) bring-up התשתית (מתוך crystolia-infra)
cd crystolia-infra/terraform
terraform init
terraform plan -out=tfplan          # סקור!
terraform apply tfplan              # 🔐 EKS+nodes+NAT+ALB → ~$8/יום

# 2) kubeconfig
aws eks update-kubeconfig --name <cluster-name> --region us-east-1

# 3) תיקון ArgoCD אחרי bring-up (re-label repo secret, re-apply root-app)
cd .. && ./fix-argocd.sh

# 4) אימות sync
kubectl -n argocd get applications
argocd app list      # אם CLI מותקן
```

יש סקריפטים מוכנים: `startup-all.sh` (הרמה מלאה) ו-`shutdown-all.sh` (כיבוי תוך שמירת ECR/ACM/DNS/OIDC).

## כיבוי בסיום הדגמה

```bash
cd crystolia-infra
./scripts/shutdown-all.sh           # 🔐 הורס EKS/nodes/NAT/ALB; שומר ECR/ACM/DNS
```
חוסך ~$8/יום. ה-images ב-ECR וה-cert נשמרים, אז ההרמה הבאה מהירה.

## מה חסר / לתקן לפני Showcase תקין (ראה STATUS)
1. ❌ **ArgoCD Application ל-production** — לא קיים. צריך ליצור Application שמצביע ל-`production/values.yaml`.
2. ❌ **Prod DNS** — `api`/`admin` מוערים-בחוץ ב-`dns.tf`. לפתוח (🔐).
3. ⚠️ **כפילות MongoDB** — Bitnami app + manifest ידני, שניהם `mongo`. להחליט על אחד.
4. ⚠️ **`latest` tags** ב-production values — לנעוץ SHA.
5. ⚠️ **dead config** — `modules/addons`, `*.disabled` — למחוק.
6. ⚠️ **ALB controller 3.1.0** — לאמת/לעדכן.
7. ⚠️ **EKS API 0.0.0.0/0** — לצמצם ל-prod.

## מצב נוכחי
💤 בנוי במלואו, **כבוי כרגע** (`destroy.plan`, `shutdown-all.sh`). ECR/ACM/DNS-staging/OIDC נשמרים. ראה [ROADMAP.md](ROADMAP.md) שלב 2.
