# 3D Store — לוג פרויקט (מה בנינו וחיברנו)

תיעוד לזיכרון עתידי: מה המערכת, איך היא מחוברת, ומה עשינו כדי שתעבוד. **לא מכיל סיסמאות/טוקנים בפועל** (רק שמות המשתנים) — הערכים עצמם קיימים רק בתוך Cloudflare.

## מה זה
חנות אונליין (סטטית) למוצרי הדפסת תלת מימד. גלריה → דף מוצר עם כמות → עגלה (localStorage) → טופס הזמנה → נשמר כ-CSV ב-GitHub + מייל התראה לבעלים. פאנל ניהול מוגן סיסמה להוספת/מחיקת מוצרים.

## הכתובות בפועל
| מה | כתובת |
|---|---|
| האתר (GitHub Pages) | https://amitwort.github.io/3D-Store/ |
| פאנל ניהול | https://amitwort.github.io/3D-Store/admin.html |
| ריפו GitHub | https://github.com/amitwort/3D-Store |
| Cloudflare Worker (ה-API) | https://3d-store-api.amit-wort.workers.dev |

## ארכיטקטורה
```
דפדפן ──fetch (קריאה בלבד)──> GitHub Pages (docs/data/products.json)
דפדפן ──fetch (כתיבה: admin/order)──> Cloudflare Worker ──GitHub Contents API──> ריפו GitHub
                                              └──fetch──> Resend API (מייל לבעלים)
```
- **קריאה** (גלריה, דף מוצר): ישירות מול `docs/data/products.json` הסטטי ב-Pages, בלי Worker.
- **כתיבה** (הוספת/מחיקת מוצר, שליחת הזמנה): רק דרך ה-Worker, שמחזיק את כל הסודות ומבצע את הקומיטים בפועל.
- העגלה עצמה: כולה ב-`localStorage` בדפדפן, אין שרת מעורב.

## 3 השירותים החיצוניים שנרשמנו אליהם
1. **GitHub** — מארח את האתר עצמו (Pages, מקור = `/docs`) + את `orders.csv` (בשורש הריפו, לא ב-`docs/`, כדי שלא יהיה נגיש פומבית דרך האתר).
2. **Cloudflare (Workers, חינמי)** — Worker בשם `3d-store-api`, קוד מודבק ידנית דרך Quick Edit (**לא** מחובר ל-git — כל שינוי בקוד דורש הדבקה ידנית מחדש + Deploy).
3. **Resend (חינמי)** — שולח מיילים מהכתובת `onboarding@resend.dev`. חשוב: זה עובד רק לשליחה לכתובת שנרשמה בפועל בחשבון ה-Resend.

## הסודות (Secrets) שהוגדרו ב-Cloudflare (Worker → Settings → Variables and Secrets)
רק שמות, לא ערכים (הערכים חיים רק שם):
- `GITHUB_TOKEN` — fine-grained PAT, הרשאת Contents Read/write על `3D-Store` בלבד.
- `ADMIN_PASSWORD` — הסיסמה לכניסה ל-`admin.html`.
- `SESSION_SECRET` — מחרוזת אקראית לחתימת טוקן ההתחברות (HMAC).
- `RESEND_API_KEY` — מפתח מ-Resend לשליחת מיילים.

קבועים גלויים (לא סודיים) בראש `worker/worker.js`: `GITHUB_OWNER='amitwort'`, `GITHUB_REPO='3D-Store'`, `GITHUB_BRANCH='main'`, `OWNER_EMAIL='amit.wort@gmail.com'`, `ALLOWED_ORIGIN='https://amitwort.github.io'`.

## מבנה קבצים (מקומי ובריפו)
```
docs/                     ← משודר ע"י GitHub Pages (Settings → Pages → Folder: /docs)
  index.html, product.html, cart.html, admin.html
  css/style.css
  js/config.js            ← מכיל את WORKER_URL
  js/cart.js, gallery.js, product.js, checkout.js, admin.js
  data/products.json       ← "מסד הנתונים" של המוצרים, מעודכן רק ע"י ה-Worker
  images/                  ← תמונות מוצרים + logo.png, מועלות ע"י ה-Worker (חוץ מהלוגו, שהועלה ידנית)
worker/worker.js           ← קוד ה-Worker; **עותק גיבוי בלבד** — לא מחובר אוטומטית ל-Cloudflare
orders.csv                 ← נוצר אוטומטית בשורש הריפו עם ההזמנה הראשונה, פתיח ב-Excel
README.md                  ← מדריך הקמה מלא מהתחלה
```

## מגבלה חשובה לזכור
לסביבת העבודה המקומית (המחשב הזה) **אין git/gh מותקן**, ולי (Claude) **אין הרשאות כתיבה ל-GitHub**. המשמעות: כל שינוי שאני עורך בקבצים המקומיים (ב-`C:\Users\daniel.wortman\3DStoreKids`) **לא מגיע לבד** ל-GitHub או ל-Cloudflare. אחרי כל תיקון קוד צריך באופן ידני:
- קבצי `docs/**` → העתק-הדבק לעורך הקבצים באתר GitHub → Commit.
- `worker/worker.js` → העתק-הדבק ל-Cloudflare Quick Edit → Deploy (הריפו הוא רק גיבוי, לא המקור החי).

## תקלות שנתקלנו בהן ותיקנו בדרך (למקרה שיישנו)
1. **`.hidden` לא הסתיר כלום** — חסר כלל CSS גנרי `.hidden { display:none }` (הייתה רק גרסה ספציפית ל-cart-badge). תוקן.
2. **"שגיאה בטעינת המוצרים"** בביקור ראשון — היה זמני, GitHub Pages עוד היה באמצע בנייה מחדש. נפתר לבד אחרי רענון קשיח.
3. **מוצר נשמר אך לא הופיע בגלריה** — ה-Worker כתב ל-`data/products.json` ו-`images/` **בשורש הריפו**, אבל האתר מוגש רק מ-`docs/`. תוקן: קבועים `PRODUCTS_PATH='docs/data/products.json'` ו-`IMAGES_DIR='docs/images'`.
4. **תמונה לא הוצגה למרות שנשמרה** — בעקבות התיקון הקודם, השדה `image` ב-JSON נשמר בטעות עם prefix `docs/` (נתיב-ריפו), בעוד שהדפדפן צריך נתיב יחסי-לאתר בלי `docs/`. תוקן: `imageRepoPath` (עם docs, ל-GitHub API) מופרד מ-`imageSitePath` (בלי docs, נשמר ב-JSON).

## מה שעדיין אפשר לשפר בעתיד (לא דחוף)
- אין אפשרות "עריכה" למוצר קיים, רק מחיקה + הוספה מחדש.
- אין אימות דומיין ב-Resend — מוגבל לשליחה רק לכתובת שנרשמה שם.
- שינויי קוד דורשים העתק-הדבק ידני (אפשר לפתור בהתקנת git + חיבור לריפו עם הטוקן, אם ירצה בעתיד).
