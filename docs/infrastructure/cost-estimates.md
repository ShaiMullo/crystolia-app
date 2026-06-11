# Cost Estimates

הערכות עלות (us-east-1, מחירי on-demand, מעוגל). לפרטים מלאים לתשתית הזולה ראה גם `docs/deployment-cheap/cost-estimate.md`.

## Cheap Production (קבוע באוויר)

| רכיב | עלות חודשית |
|---|---|
| Lightsail `small_3_0` (2GB RAM, 60GB SSD, 3TB transfer) | **~$12** |
| MongoDB Atlas M0 (free tier) | $0 |
| GHCR (public packages) | $0 |
| Let's Encrypt (Caddy) | $0 |
| Route53 hosted zone (אם בשימוש) | ~$0.50 |
| **סה"כ** | **~$12–13 / חודש** |

> שדרוגים אופציונליים: Atlas M2 (גיבויים) ~$9/חודש · Lightsail `medium` (4GB) ~$24/חודש.

## Enterprise Showcase (on-demand בלבד)

| רכיב | עלות בזמן ריצה |
|---|---|
| EKS control plane | ~$73 / חודש (קבוע כל עוד האשכול קיים) |
| 3× t3.medium ON_DEMAND nodes | ~$90 / חודש |
| NAT Gateway (single) | ~$32 / חודש + data |
| ALB (staging + monitoring groups) | ~$16–20 כל אחד |
| EBS volumes (Mongo/Prometheus/Grafana/Loki, gp3) | ~$5–10 |
| ECR storage | ~$1 |
| **סה"כ בזמן ריצה** | **~$215–250 / חודש** |
| **כבוי (shutdown-all)** | **~$1–2 / חודש** (ECR+Route53 בלבד) |

### עלות יומית להדגמה
~$8/יום בזמן ריצה. דפוס מומלץ: `startup-all.sh` לפני הדגמה → `shutdown-all.sh` אחרי. הדגמה של יום-יומיים בחודש ≈ $8–16.

## נלווים (כמעט אפס)

| רכיב | עלות |
|---|---|
| Landing — S3 + CloudFront (PriceClass_100) | ~$1–3 / חודש (לפי תעבורה) |
| Leads — Lambda + API GW + DynamoDB (PAY_PER_REQUEST) | ~$0 (pay-per-use, נמוך) |
| ACM certificate | $0 |

## תרחישי עלות מומלצים

| תרחיש | עלות חודשית |
|---|---|
| **רק Cheap Production** (מומלץ ליומיום) | **~$13–16** |
| Cheap + Showcase כבוי (מוכן להרמה) | ~$15–18 |
| Cheap + Showcase 2 ימי הדגמה | ~$30 |
| Cheap + Showcase 24/7 (לא מומלץ) | ~$230–265 |

## טיפים לחיסכון
- להחזיק Showcase **כבוי** כברירת מחדל; להרים רק להדגמות.
- ב-Cheap: GHCR public (אין צורך ב-PAT) + Atlas M0.
- ב-Showcase: `cheap.yaml`/`sabbath.yaml` modes לצמצום replicas; single NAT (כבר מוגדר); spot nodes (שיפור עתידי).
- לסגור `force_delete` ECR ולנקות images ישנים (lifecycle keep-last-10 כבר מוגדר).
