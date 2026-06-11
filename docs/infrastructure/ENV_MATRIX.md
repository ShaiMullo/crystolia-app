# Environment Variables Matrix

מקור: סריקת `process.env` / `getEnvOrDefault` בקוד מול קבצי `*.env.demo.example`.
✅ = נדרש · ⭕ = אופציונלי (יש default / פיצ'ר כבוי) · — = לא רלוונטי

## איזה env נדרש איפה (Cheap Production)

| Variable | backend | frontend-admin | frontend-client | deploy/demo (compose) | הערה |
|---|:--:|:--:|:--:|:--:|---|
| `NODE_ENV` | ✅ | ✅ | ✅ | — | `production` |
| `PORT` | ⭕ | — | — | — | default 4000 |
| `MONGO_URI` | ✅ | — | — | — | **Atlas SRV** או `mongodb://mongo:27017/...` |
| `JWT_SECRET` | ✅ | ✅ | — | — | **חייב להיות זהה** backend↔admin |
| `FRONTEND_URL` | ✅ | — | — | — | `https://crystolia.com` |
| `ADMIN_FRONTEND_URL` | ✅ | — | — | — | `https://admin.crystolia.com` |
| `CORS_ALLOW_ORIGINS` | ⭕ | — | — | — | default localhost; prod: רשימת דומיינים |
| `COOKIE_DOMAIN` | ⭕ | — | — | — | ריק=host-only; `.crystolia.com` ל-subdomains |
| `BACKEND_URL` | — | ✅ | ✅ | — | `http://backend:4000` (compose DNS) |
| `NEXT_PUBLIC_API_URL` | — | ⭕(build) | ⭕(build) | — | `/api` — נצרב ב-build |
| `ENABLE_SCHEDULER` | ⭕ | — | — | — | `true` בשרת היחיד |
| `IMAGE_PREFIX` | — | — | — | ✅ | `ghcr.io/shaimullo` |
| `IMAGE_TAG` | — | — | — | ✅ | SHA / `demo-latest` |
| `CLIENT_DOMAIN`/`ADMIN_DOMAIN`/`API_DOMAIN` | — | — | — | ✅ | Caddy vhosts |
| `ACME_EMAIL` | — | — | — | ✅ | Let's Encrypt |

## אינטגרציות חיצוניות (כולן ⭕ — אפשר להשאיר ריק ל-MVP)

| Variable | שירות | נדרש מתי |
|---|---|---|
| `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` | Google OAuth | רק אם מפעילים login דרך Google |
| `GREEN_INVOICE_API_ID/SECRET/SANDBOX` | חשבוניות | רק לחיוב אמיתי (sandbox=true כברירת מחדל) |
| `ULTRAMSG_INSTANCE_ID/TOKEN/BASE_URL`, `ADMIN_PHONE_NUMBER` | WhatsApp | רק להתראות WhatsApp |

## משתנים עם default בקוד (לא חובה ב-.env)

`HEADERS_TIMEOUT`, `KEEP_ALIVE_TIMEOUT`, `REQUEST_TIMEOUT`, `JWT_EXPIRES_IN`, `JWT_COOKIE_EXPIRES_IN` — כולם `getEnvOrDefault`, אפשר להתעלם ל-MVP.

## משתנים לבדיקות/seed (לא ל-runtime production)

`SMOKE_BASE_URL`, `SMOKE_ADMIN_EMAIL`, `SMOKE_ADMIN_PASSWORD` — ל-`npm run smoke` (smoke-test.sh).
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `APP_USER_EMAIL`, `APP_USER_PASSWORD` — ל-seed scripts (dev/demo seeding).

## ✅ מסקנת התאמה (env ↔ code)

**אין פערים קריטיים.** כל מה שהקוד דורש כחובה מופיע ב-`*.env.demo.example`. כל מה שחסר ב-example הוא או בעל default או אופציונלי (אינטגרציות/בדיקות). 

**קריטי להרמה:** `MONGO_URI` (Atlas) ו-`JWT_SECRET` (זהה ב-backend+admin). שני אלה חייבים להיות אמיתיים; כל השאר יכול לרוץ על defaults ל-MVP.
