# סטטוס נוכחי

**עדכון אחרון:** 2026-08-28

## מה הושלם

- תשתית שרת מוכנה: VPS נוקה, DNS/Cloudflare, Supabase self-hosted רץ ותקין, נגיש דרך `https://supabase.y-h-m.com` עם HTTPS תקין (נבדק end-to-end).
- אבטחה בסיסית: SSH מוקשח, fail2ban, Postgres/API חסומים מהאינטרנט (מאומת חיצונית).
- גיבויים אוטומטיים ל-R2 פועלים (cron יומי).
- Git repo מאותחל, סדרת קומיטים בוצעה, כולל כל ה-migrations שהורצו.
- מערכת התיעוד (docs/) פעילה, עברה ביקורת שלמות.
- **13 טבלאות ליבה של הלקוח בנויות ורצות בפועל על ה-DB** (`clients` + תת-טבלאות), RLS מופעל עם policies ריקים (חסום כברירת מחדל ל-anon/authenticated).
- שדה כתובת פוצל לשדות מובנים (רחוב/עיר/מיקוד).
- **איפיון (לא קוד) לארכיטקטורת אנשי קשר מלאה** — 5 טבלאות חדשות: `contacts`, `contact_channels`, `client_contacts` (עם `role`), `responsibility_areas` (lookup פתוח), `client_contact_responsibilities`. שדות signatory הוסרו מ-`clients.md` והועברו לשם.
- 12 שדות נוספים אופיינו ונוספו ל-`clients.md` (תיקי רשויות, פרטי עסק, תאריכים).

## מה לא הושלם / פתוח

- **טבלאות אנשי הקשר מאופיינות אבל לא בקוד SQL עדיין** — `clients` בפועל עדיין בלי `client_contacts` וכו'.
- **שאלות פתוחות שממתינות ליצחק:** אילו שדות נוספים ל-`role='primary'` ב-`client_contacts`; מחזור מע"מ/צפוי (עמודה בודדת מול טבלה היסטורית); האם `client_contact_channels` (ברמת עסק) עדיין נחוץ לצד `contact_channels` (ברמת אדם); "הערות כלליות" על לקוח (שדה נפרד או שמספיק `client_notes`).
- **פורט 3000 (Easypanel) עדיין חשוף לאינטרנט** — מחכה לחלון זמן נוח.
- **RLS policies בפועל לא נכתבו** — הכל חסום כברירת מחדל דרך anon/authenticated.
- ישויות התלות (`entity_types`, `reporting_frequencies`, `office_employees`, `tags`) עדיין שלד מינימלי.
- סיסמת ה-Dashboard לא הוחלפה (יצחק ביקש לא לגעת).
- `changed_by` ב-`clients_audit_log` לא ממולא — תלוי ב-Auth שעדיין לא קיים.

## הצעד הבא (כשיאושר)

תלוי בתשובות יצחק לשאלות הפתוחות למעלה. לאחר מכן: כתיבת SQL ל-5 טבלאות אנשי הקשר.
