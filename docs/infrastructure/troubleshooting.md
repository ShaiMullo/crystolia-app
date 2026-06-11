# Troubleshooting

תקלות נפוצות ופתרונות, מסודרות לפי תשתית.

## כללי / Local

| תסמין | סיבה | פתרון |
|---|---|---|
| Admin/Client: `Module not found: '@/lib/cn'` | `lib/` לא mounted ב-compose | תוקן ב-`docker-compose.local.yml` (נוסף `frontend-admin/lib`). אם חוזר — `make rebuild` |
| `make up` נכשל: `.env not found` | אין `.env` | `cp .env.example .env` ומלא |
| oh-my-zsh "אוכל" תו בהרצת `.command` | prompt אינטראקטיבי | להריץ `make up` ידנית, או `DISABLE_AUTO_UPDATE=true` |
| פורט תפוס (3000/3001/4000) | stack ישן רץ | `make down` ואז `make up` |
| Admin→System מציג "Fallback mode" | Mongo standalone (ללא replica-set) | להשתמש ב-Atlas M0 (replica-set) |

## Cheap Production

| תסמין | סיבה | פתרון |
|---|---|---|
| `admin/api.crystolia.com` לא נטענים | אין Lightsail instance / DNS לא מפנה | ראה ROADMAP שלב 1; `terraform output static_ip` ובדוק A records |
| TLS לא מונפק (Caddy) | DNS לא propagated / rate-limit | לחכות ל-propagation; להפעיל `acme_ca` staging ב-Caddyfile לבדיקה |
| deploy נכשל ב-health-check | backend לא עולה | `ssh` → `docker compose logs backend`; בדוק `MONGO_URI` |
| `docker login ghcr.io` נכשל | packages פרטיים | להגדיר `GHCR_PAT` (read:packages) או להפוך packages לפומביים |
| Backend: לא מתחבר ל-Mongo | Atlas IP allowlist | להוסיף את ה-static IP ל-Atlas Network Access |
| תעודה פגה / אבדה | מחקו את volume `caddy_data` | **לעולם לא למחוק** `caddy_data`; אם נמחק — Caddy ינפיק מחדש (זהירות מ-rate limits) |

## Enterprise Showcase

| תסמין | סיבה | פתרון |
|---|---|---|
| אחרי bring-up: ArgoCD לא מסנכרן | repo secret/labels אבדו | `./fix-argocd.sh` |
| ALB לא נוצר | LB controller לא רץ | `./restart-alb.sh`; בדוק IRSA annotation על ה-SA |
| hostnames ישנים ב-`dns.tf` | ALB DNS משתנה בכל הרמה | לעדכן records (מתועד ב-`startup-all.sh` Phase 5) |
| Mongo conflict / 2 שירותים בשם `mongo` | כפילות Bitnami+manual | להחליט על אחד ולמחוק את השני (ראה STATUS) |
| Production לא עולה | אין ArgoCD Application ל-prod | ליצור Application שמצביע ל-`production/values.yaml` |
| Pods `ImagePullBackOff` | tag לא קיים ב-ECR / `latest` ישן | לבנות+לדחוף, לנעוץ SHA |

## אבחון מהיר

```bash
# Cheap
ssh ubuntu@<IP> 'cd /opt/crystolia && docker compose -f docker-compose.demo.yml ps'
curl -I https://api.crystolia.com/api/health

# Enterprise
kubectl get pods -A
kubectl -n argocd get applications
kubectl -n crystolia logs deploy/crystolia-backend --tail=50
```
