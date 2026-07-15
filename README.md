# 3D Store — חנות מוצרי הדפסה תלת מימד

אתר סטטי (GitHub Pages) + "מוח" קטן בענן (Cloudflare Worker, חינמי) שמטפל בהוספת מוצרים ובשליחת הזמנות.
**אין צורך להתקין שום דבר במחשב** — כל השלבים נעשים דרך אתרי GitHub / Cloudflare / Resend בדפדפן.

## מבנה הפרויקט
```
docs/     → הקבצים שיוצגו כאתר (GitHub Pages)
worker/   → קובץ אחד שמדביקים ב-Cloudflare (worker.js)
```

## הוספת הלוגו
בכל עמוד יש `<img src="images/logo.png">` בכותרת. אין לי כלי לשמור את קובץ התמונה ששלחת בצ'אט בתור קובץ בפועל — שמרו אותו בעצמכם (שמירת תמונה) בשם `logo.png` (מומלץ עם רקע שקוף/PNG) לתוך `docs/images/logo.png` לפני ההעלאה ל-GitHub. אם הקובץ לא קיים, הכותרת עדיין תציג את השם "3D Store" בטקסט בלבד.

---

## שלב 1 — יצירת הריפו והעלאת האתר

1. היכנסו ל-GitHub → **New repository** → תנו שם (למשל `3DStoreKids`) → **Public** (כדי ש-Pages יעבוד בחינם) → Create.
2. בעמוד הריפו: **Add file → Upload files** → גררו לתוכו את **כל התוכן** של תיקיית `docs` (את הקבצים *מתוך* `docs`, לא את התיקייה עצמה — כלומר `index.html`, `product.html` וכו' צריכים לשבת בשורש הריפו תחת נתיב `docs/...`). הכי פשוט: גררו את כל תיקיית `docs` כפי שהיא לתוך אזור ההעלאה של GitHub — הוא ישמור את מבנה התיקיות הפנימי.
3. Commit changes.
4. **Settings → Pages** → תחת "Build and deployment": Source = *Deploy from a branch*, Branch = `main`, Folder = **/docs** → Save.
5. אחרי דקה-שתיים האתר יהיה זמין בכתובת שמופיעה שם, לרוב:
   `https://<שם-המשתמש-שלכם>.github.io/3DStoreKids/`
   **שמרו את הכתובת הזו** — תצטרכו אותה בשלב 3.

## שלב 2 — טוקן גישה ל-GitHub (fine-grained PAT)

1. GitHub → לחצו על תמונת הפרופיל → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. תנו שם (למשל `3dstorekids-worker`), Resource owner = החשבון שלכם, Repository access = **Only select repositories** → בחרו את `3DStoreKids`.
3. תחת **Permissions → Repository permissions** → **Contents: Read and write** (זו ההרשאה היחידה הנדרשת).
4. Generate token → **העתיקו את הטוקן מייד** (הוא מוצג פעם אחת בלבד).

## שלב 3 — יצירת ה-Worker ב-Cloudflare (חינמי)

1. הרשמו/התחברו ב-[dash.cloudflare.com](https://dash.cloudflare.com) (חינמי, ללא כרטיס אשראי).
2. בתפריט הצד: **Workers & Pages → Create → Create Worker** → תנו שם (למשל `3dstorekids-api`) → Deploy (עם הקוד ברירת המחדל, נחליף אותו מיד).
3. לאחר היצירה → **Edit code** (Quick Edit).
4. פתחו את הקובץ `worker/worker.js` מהפרויקט שנוצר לכם, ולפני ההדבקה עדכנו בראש הקובץ 5 קבועים:
   - `GITHUB_OWNER` — שם המשתמש שלכם ב-GitHub
   - `GITHUB_REPO` — שם הריפו (למשל `3DStoreKids`)
   - `OWNER_EMAIL` — המייל שאליו יגיעו התראות על הזמנות חדשות
   - `ALLOWED_ORIGIN` — כתובת ה-Pages משלב 1 **בלי סלאש בסוף**, למשל `https://myuser.github.io`
     (שימו לב: רק הדומיין, לא כולל `/3DStoreKids/`)
5. מחקו את הקוד ברירת המחדל בעורך של Cloudflare, הדביקו את כל תוכן `worker.js` המעודכן → **Save and Deploy**.
6. העתיקו את כתובת ה-Worker שמופיעה למעלה (נראית כמו `https://3dstorekids-api.<שם-חשבון>.workers.dev`).

## שלב 4 — הגדרת סודות (Secrets) ל-Worker

ב-Worker שיצרתם → **Settings → Variables and Secrets → Add**. הוסיפו 4 ערכים, כל אחד כ-**Secret** (מוצפן):

| שם המשתנה | ערך |
|---|---|
| `GITHUB_TOKEN` | הטוקן משלב 2 |
| `ADMIN_PASSWORD` | סיסמה לבחירתכם לכניסת בעל החנות |
| `SESSION_SECRET` | מחרוזת אקראית ארוכה לבחירתכם (למשל הדביקו כאן 30 תווים אקראיים) |
| `RESEND_API_KEY` | המפתח משלב 5 |

לאחר ההוספה — Deploy מחדש אם מתבקש.

## שלב 5 — מייל התראה (Resend, חינמי)

1. הרשמו בחינם ב-[resend.com](https://resend.com).
2. **API Keys → Create API Key** → העתיקו את המפתח (מתחיל ב-`re_`) והדביקו אותו כ-`RESEND_API_KEY` בשלב 4.
3. כדי לקבל מיילים בלי לאמת דומיין משלכם: תחת החשבון החינמי אפשר לשלוח מהכתובת `onboarding@resend.dev` (כבר מוגדרת ב-`worker.js`) **רק לכתובת המייל שנרשמתם איתה ל-Resend**. כלומר `OWNER_EMAIL` בקוד ה-Worker חייב להיות אותו מייל שנרשמתם איתו ל-Resend.
   (אם בעתיד תרצו לשלוח מכתובת/דומיין משלכם או לכתובות נוספות — אימות דומיין ב-Resend, בחינם, פותר את זה.)

## שלב 6 — חיבור האתר ל-Worker

1. פתחו את `docs/js/config.js` בריפו ב-GitHub (עריכה ישירה באתר, עפרון קטן למעלה מימין) ועדכנו:
   ```js
   const WORKER_URL = 'https://הכתובת-מהworker-שהעתקתם.workers.dev';
   ```
2. Commit changes ישירות ל-`main`.

## שלב 7 — בדיקה מקצה לקצה

1. גשו ל-`.../admin.html` באתר שלכם → התחברו עם הסיסמה מ-`ADMIN_PASSWORD` → הוסיפו מוצר לדוגמה (שם, מחיר, תמונה).
2. אחרי כדקה (זמן בנייה מחדש של GitHub Pages) — רעננו את `index.html` וודאו שהמוצר מופיע בגלריה.
3. לחצו על המוצר → בחרו כמות → "הוסף לעגלה" → "לסיום ההזמנה".
4. בדף העגלה מלאו שם וטלפון (חובה) ושלחו הזמנה.
5. ודאו: (א) התקבל מייל התראה לכתובת `OWNER_EMAIL`, (ב) בריפו ב-GitHub נוצר/התעדכן קובץ `orders.csv` עם שורה חדשה (ניתן לפתוח אותו ישירות ב-Excel).

---

## הערות
- **היקף**: הממשק תומך בהוספה ומחיקה של מוצרים (לא עריכה) — למחיקה "בטעות" אין שחזור, אבל אפשר תמיד לערוך את `docs/data/products.json` ישירות ב-GitHub כגיבוי.
- **אבטחה**: הסיסמה, טוקן ה-GitHub ומפתח המייל יושבים אך ורק בצד ה-Worker (בענן) ולעולם לא נחשפים בקוד שרץ בדפדפן.
- **עלויות**: GitHub Pages, Cloudflare Workers (עד 100,000 בקשות ביום) ו-Resend (עד 3,000 מיילים בחודש) — כולם בחינם בהיקף שימוש של חנות קטנה.
- כל שינוי עתידי בקוד ה-Worker דורש חזרה על שלב 3.4-3.5 (הדבקה מחדש + Deploy) בדשבורד של Cloudflare.
