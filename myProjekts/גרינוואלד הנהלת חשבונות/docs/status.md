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

- נוספה `employee_roles` (ישות 27), `office_employees.role_id` (FK, במקום טקסט חופשי), `client_notes.relevant_role_id` (תוקף לתפקיד), `clients.general_notes` (חופשי, לצד `client_notes`).

## מה לא הושלם / פתוח

**אין שאלות פתוחות ממתינות ליצחק כרגע.**

**איפיון הושלם, קוד SQL עדיין לא נכתב:**
- 7 טבלאות: `contacts`, `contact_channels`, `client_contacts`, `responsibility_areas`, `client_contact_responsibilities`, `employee_roles`, `client_turnover_history`.
- שינויים בטבלאות קיימות שכבר בקוד: `office_employees.role`→`role_id`, `client_notes`+`relevant_role_id`, `clients`+`general_notes` (ו-12 שדות נוספים מהסבב הקודם).

**פערי תשתית ידועים, לא דחופים:**
- פורט 3000 (Easypanel) עדיין חשוף לאינטרנט — מחכה לחלון זמן נוח.
- RLS policies בפועל לא נכתבו — הכל חסום כברירת מחדל דרך anon/authenticated (מכוון, ר' `decisions/0005`).
- ישויות `entity_types`, `reporting_frequencies`, `tags` עדיין שלד מינימלי (לא באיפיון מלא).
- סיסמת ה-Dashboard לא הוחלפה (יצחק ביקש לא לגעת).
- `changed_by` ב-`clients_audit_log` לא ממולא — תלוי ב-Auth שעדיין לא קיים.

## הצעד הבא (כשיאושר)

כתיבת SQL לכל השינויים שכבר אופיינו (7 טבלאות חדשות + 3 טבלאות מעודכנות) — ממתין לאישור יצחק להתחיל.
