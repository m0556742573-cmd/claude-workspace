# סטטוס נוכחי

**עדכון אחרון:** 2026-08-28

## מה הושלם

- תשתית שרת מוכנה: VPS נוקה, DNS/Cloudflare, Supabase self-hosted רץ ותקין, נגיש דרך `https://supabase.y-h-m.com` עם HTTPS תקין (נבדק end-to-end).
- אבטחה בסיסית: SSH מוקשח, fail2ban, Postgres/API חסומים מהאינטרנט (מאומת חיצונית).
- גיבויים אוטומטיים ל-R2 פועלים (cron יומי).
- Git repo מאותחל, סדרת קומיטים בוצעה, כולל כל ה-migrations שהורצו.
- מערכת התיעוד (docs/) פעילה, עברה ביקורת שלמות.
- **21 טבלאות בפועל על ה-DB החי**, כולן עם RLS מופעל (בלי policies עדיין — חסום כברירת מחדל ל-anon/authenticated):
  - 13 טבלאות ליבה של הלקוח (`clients` + תת-טבלאות).
  - 7 טבלאות ארכיטקטורת אנשי קשר: `contacts`, `contact_channels`, `client_contacts`, `responsibility_areas`, `client_contact_responsibilities`, `employee_roles`, `client_turnover_history`.
  - `employee_absences` (היעדרויות זמניות של עובד, כיסוי בהחלטה אנושית).
- `clients`: כתובת מובנית (רחוב/עיר/מיקוד), שדות signatory הוסרו (עברו ל-`contacts`), נוספו ~13 שדות (תיקי רשויות, פרטי עסק, תאריכים, הערות כלליות).
- `office_employees.role` הוחלף ב-`role_id` (FK ל-`employee_roles`). `client_notes` קיבלה `relevant_role_id`.
- **תובנה תפעולית חדשה:** הרצת migration דרך SSH/psql **לא** מפעילה RLS אוטומטית (בניגוד ל-Studio UI) — תוקן, ותועד ב-`decisions/0005` כדי לא לחזור על הטעות.
- **ארכיטקטורת אנשי הקשר מלאה וסגורה** — `client_contacts` קיבל שדות היסטוריה (תפקיד בעסק, תחילה/סיום, פעיל) לכל תפקיד, לא רק אחראי ראשי.
- **`office_employees` מלא וסגור** — מוזג עם `contacts` (בלי כפילות פרטים אישיים), תנאי העסקה אמיתיים, `employee_absences` להיעדרויות זמניות.

## מה לא הושלם / פתוח

**אין שאלות פתוחות ממתינות ליצחק כרגע.**

**פערי תשתית ידועים, לא דחופים:**
- פורט 3000 (Easypanel) עדיין חשוף לאינטרנט — מחכה לחלון זמן נוח.
- RLS policies בפועל לא נכתבו — הכל חסום כברירת מחדל דרך anon/authenticated (מכוון, ר' `decisions/0005`).
- ישויות `entity_types`, `reporting_frequencies`, `tags` עדיין שלד מינימלי (לא באיפיון מלא) — האחרונות שנשארו מקבוצה א'.
- **פתוח, לא לעכשיו:** `office_employees.auth_user_id` — יתווסף רק כשתיבנה מערכת Auth בפועל.
- סיסמת ה-Dashboard לא הוחלפה (יצחק ביקש לא לגעת).
- `changed_by` ב-`clients_audit_log` לא ממולא — תלוי ב-Auth שעדיין לא קיים.
- הצפנת PII (`legal_id_number`, `contacts.id_number`) — שאלה כללית פתוחה, לא חוסמת.

## הצעד הבא (כשיאושר)

לא הוסכם. אפשרויות: (א) איפיון מלא לישות "איש קשר" הבא בתור (`entity_types`/`reporting_frequencies`/`tags` עדיין שלד), (ב) מעבר לישות הבאה בקבוצת הליבה (עסקה/שירותים — קבוצה ב'), או (ג) כתיבת RLS policies אמיתיים.
