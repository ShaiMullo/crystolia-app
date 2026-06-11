# Local Development

הרצת כל ה-stack מקומית עם Docker Compose.

## דרישות
- Docker Desktop (עם Compose plugin)
- `make` (אופציונלי — נוחות בלבד)

## הרצה מהירה

```bash
cd crystolia-app
cp .env.example .env        # מלא ערכים מקומיים (JWT_SECRET וכו')
make up                     # = docker compose -f docker-compose.local.yml up -d --build
```

| שירות | URL |
|---|---|
| Frontend Client | http://localhost:3000 |
| Frontend Admin | http://localhost:3001 |
| Backend API | http://localhost:4000 |
| MongoDB | mongodb://localhost:27017/crystolia |

פקודות נוספות (`Makefile`):
```bash
make logs              # עוקב אחרי כל הלוגים
make logs-backend      # backend בלבד
make down              # עצירה
make rebuild           # build נקי
```

## משתמש admin (seed אוטומטי, dev בלבד)
- אימייל: `admin@crystolia.com`
- סיסמה: `Admin123!`
> ה-seed רץ רק כש-`NODE_ENV=development`. ב-production לא נוצר אדמין אוטומטי.

## קבצי Compose

| קובץ | שימוש |
|---|---|
| `docker-compose.local.yml` | פיתוח מלא (hot-reload, mounts) — **ברירת המחדל** |
| `docker-compose.dev.yml` | overrides לפיתוח |
| `docker-compose.yml` | בסיס |
| `docker-compose.demo.yml` | Cheap Production (לא לפיתוח) |

## הערה — באג שתוקן
`docker-compose.local.yml` היה חסר mount של `frontend-admin/lib` (היה רק ל-`frontend-client`). זה גרם ל-Build Error `Module not found: Can't resolve '@/lib/cn'` וקריסת ה-Admin. **תוקן** — נוסף `./frontend-admin/lib:/app/lib:ro`.

## טיפים
- שינוי קוד ב-`app/`, `components/`, `lib/` מתעדכן ב-hot-reload (mounts).
- שינוי `package.json` מצריך `make rebuild`.
- אם פורט תפוס: `make down` ואז `make up`.
- ה-Admin על 3001 (ממופה מ-3000 פנימי) כדי לא להתנגש ב-client.
