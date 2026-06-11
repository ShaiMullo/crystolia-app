# Stage 1 — MongoDB Atlas (M0) Setup

מטרה: DB מנוהל חינמי (replica-set → טרנזקציות עובדות) שאליו השרת `crystolia-prod` (98.88.160.166) יתחבר.
כל מה שמסומן 🔴 **ACTION REQUIRED BY SHAI** מבוצע ידנית בקונסולת Atlas. אני לא נוגע ב-Atlas.

---

## 1. הקמת ה-Cluster — צעד-צעד (בקונסולה)

🔴 **ACTION REQUIRED BY SHAI** — היכנס ל-https://cloud.mongodb.com (צור חשבון אם אין).

1. **Create / Project**: צור Project בשם `Crystolia` (Organization קיים בסדר).
2. **Build a Database** → בחר **M0** (Free, Shared).
3. **Provider + Region**:
   - Provider: **AWS**
   - Region: **N. Virginia (us-east-1)** — אותו אזור כמו השרת ⇒ latency מינימלי.
4. **Cluster Name**: `crystolia` (או השאר `Cluster0` — לא משנה לפונקציונליות).
5. **Create Deployment**. ההקמה לוקחת ~1-3 דקות.

---

## 2. Database User

🔴 **ACTION REQUIRED BY SHAI** — בקונסולה: **Security → Database Access → Add New Database User**

- Authentication Method: **Password**
- Username: `crystolia_app`
- Password: לחץ **Autogenerate Secure Password** → **שמור אותו** (תצטרך אותו ל-URI).
- Database User Privileges: **Read and write to any database**
  (או מצומצם: **Specific Privileges** → `readWrite` על database `crystolia`).
- Add User.

> אם הסיסמה מכילה תווים מיוחדים (`@ : / ? # [ ] %`) — צריך URL-encode אותם ב-URI. הכי פשוט: Autogenerate נותן סיסמה בטוחה; אם יש בה תו מיוחד, החלף ל-alphanumeric בלבד.

---

## 3. Network Access

🔴 **ACTION REQUIRED BY SHAI** — **Security → Network Access → Add IP Address**

הוסף 2 רשומות:
| IP | תפקיד | הערה |
|---|---|---|
| `98.88.160.166/32` | **השרת crystolia-prod** | חובה — דרכו ה-backend מתחבר |
| `<YOUR_PUBLIC_IP>/32` | ה-IP שלך (זמני, לבדיקות) | אופציונלי — להסיר אחרי שמסיימים לבדוק |

> אל תשתמש ב-`0.0.0.0/0` (פתוח לעולם) — לא מאובטח. רק שני ה-/32 האלה.
> אם ה-IP שלך משתנה (דינמי) ותרצה לבדוק מהמחשב — תעדכן בהתאם.

---

## 4. Connection String (URI)

🔴 **ACTION REQUIRED BY SHAI** — **Database → Connect → Drivers → Node.js**

תקבל משהו כזה:
```
mongodb+srv://crystolia_app:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

### פורמט מדויק ל-MONGO_URI (template — בלי סיסמה אמיתית)
הוסף את שם ה-database `crystolia` **אחרי הסלאש** (לפני ה-`?`):
```
mongodb+srv://crystolia_app:<URL_ENCODED_PASSWORD>@cluster0.xxxxx.mongodb.net/crystolia?retryWrites=true&w=majority&appName=Cluster0
```

החלקים:
| חלק | ערך |
|---|---|
| user | `crystolia_app` |
| password | הסיסמה שיצרת (URL-encoded אם יש תווים מיוחדים) |
| host | `cluster0.xxxxx.mongodb.net` (מה-Atlas שלך) |
| **database** | `/crystolia` ← **חשוב להוסיף** |
| options | `?retryWrites=true&w=majority` |

---

## 5. עדכון קבצי env

### `backend/.env.demo` (היחיד שצריך MONGO_URI)
החלף את השורה:
```
MONGO_URI=CHANGE_ME__ATLAS_SRV_CONNECTION_STRING
```
ב-URI האמיתי. תוכל לעשות זאת ידנית בעורך, או:
```bash
# מתוך crystolia-app/  (החלף את המחרוזת כולה במרכאות בודדות):
# (מרכאות בודדות חשובות כדי שה-shell לא יפרש & ו-?)
cd backend
# פתח בעורך:  open -e .env.demo     # או nano .env.demo
```

> ⚠️ `deploy/demo/.env.demo` **לא צריך** MONGO_URI — הוא רק images+domains. ה-MONGO_URI חי רק ב-`backend/.env.demo`.

> תזכורת: `backend/.env.demo` כבר git-ignored — לא ייכנס ל-git.

---

## 6. בדיקת חיבור (בלי deploy מלא)

הכנתי **`test-mongo.command`** — הוא:
1. מעתיק את `backend/.env.demo` לשרת (`/opt/crystolia/backend/.env.demo`)
2. מריץ container זמני (`mongo:7`) על השרת שמבצע `ping` ל-Atlas דרך ה-`MONGO_URI`
3. מדפיס רק את תוצאת ה-ping — **לא חושף את ה-URI/סיסמה**
4. בודק גם DNS resolution ל-Atlas

זה connection-test בלבד (one-off container), **לא** הרצת האפליקציה.

---

## 7. בדיקות אחרי Atlas (checklist)

- [ ] Cluster M0 פעיל (Status: green)
- [ ] Database user `crystolia_app` קיים עם readWrite
- [ ] Network Access כולל `98.88.160.166/32`
- [ ] `backend/.env.demo` → `MONGO_URI` מלא עם `/crystolia` בשם ה-DB
- [ ] `test-mongo.command` עבר: ping = `{ ok: 1 }`
- [ ] השרת מצליח לפתור DNS ל-`*.mongodb.net`
- [ ] credentials תקינים (אין auth error)
- [ ] database name = `crystolia`

כשכל אלה ✅ → **GO ל-Stage 2 (GitHub secrets) / Stage 5 (DNS) / Stage 6 (deploy)**.

---

## מה אסור בשלב הזה
deploy מלא · DNS · workflow · שינוי GitHub secrets · terraform apply · מחיקת resources.

## הצעד הבא שלך
1. בצע 1–4 בקונסולת Atlas (🔴).
2. הדבק את ה-`MONGO_URI` ל-`backend/.env.demo`.
3. תגיד לי — ואריץ את `test-mongo.command` (אחרי אישורך), ואחזיר דוח חיבור.
