# טבלה: `office_employees` (עובד משרד — ישות 3 במודל המקורי)

**סטטוס: איפיון מלא.**

## מה זה ולמה זה משרת

מייצגת את **תנאי ההעסקה** של חבר צוות — לא את פרטיו האישיים (אלה יושבים ב-`contacts`, ר' למטה). חוצה כמה מטרות: שיוך אחריות ועומס (מטרה 5 — Bus Factor), עלות אמיתית מול רווחיות (מטרה 6), תיעוד תנאי העסקה כהגנה משפטית על המשרד (מטרה 9), והמשכיות כשעובד נעדר (מטרה 1 — חובות לא נופלות כי מישהו בחופש).

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `contact_id` | מזהה איש קשר | uuid | **NOT NULL, UNIQUE**, FK → `contacts.id` | **פרטי האדם עצמו (שם, ת.ז., כתובת, ערוצי קשר) יושבים ב-[`contacts`](contacts.md)/[`channels`](channels.md)** — לא כפילות. `NOT NULL UNIQUE` כי היחס הוא אחד-לאחד: `office_employees` היא "תנאי ההעסקה של אדם", ובלי אדם אין לשורה שם להציג |
| `role_id` | מזהה תפקיד | uuid | FK → `employee_roles.id`, nullable | ר' `employee_roles.md` |
| `employment_type` | סוג העסקה | text | nullable, ערכים סגורים (`employee`/`contractor`) | שכיר/עצמאי — משפיע על חישובי עלות וחבות משפטית שונה |
| `employment_percentage` | היקף משרה (%) | numeric(5,2) | CHECK בין 0 ל-100, nullable | תנאי העסקה רשמי, בסיס לחישוב עלות אמיתית |
| `weekly_capacity_hours` | שעות זמינות לשבוע | numeric(5,2) | CHECK ≥ 0, nullable | המספר המעשי לחישובי עומס — בלי זה "עומס" הוא מספר בלי מכנה (מטרה 5) |
| `hourly_cost` | עלות שעה | numeric(10,2) | CHECK ≥ 0, nullable | **רגיש** — ר' "חוב ידוע" למטה |
| `specializations` | ~~התמחויות~~ | — | **הוסר 31/08/2026** | הומר ל-lookup + M2M: [`specializations.md`](specializations.md) ו-[`employee_specializations.md`](employee_specializations.md) |
| `hire_date` | תאריך תחילת עבודה | date | nullable | |
| `is_active` | האם פעיל | boolean | NOT NULL, DEFAULT true | עובד שעזב לא נמחק — מסומן לא-פעיל, כדי לשמר היסטוריה (הערות/ביקורת ישנות מצביעות עדיין אליו). **זו עזיבה קבועה — להיעדרות זמנית ר' `employee_absences.md`** |
| `departure_date` | תאריך עזיבה | date | nullable | רלוונטי כש-`is_active`=false |
| `departure_reason` | סיבת עזיבה | text | nullable | אותו דפוס כמו `clients.departure_reason` |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |
| `updated_at` | תאריך עדכון אחרון | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## הערות

- **פתוח, לא לעכשיו:** חיבור לזהות התחברות (`auth_user_id`) — יתווסף כשתיבנה מערכת ה-Auth בפועל, לא לפני שהצורה שלו ברורה.
- **הוכרע במפורש:** אין `backup_employee_id` קבוע על העובד — מי מחליף מישהו **לא אוטומטי**, זו החלטה אנושית לכל היעדרות בנפרד. ר' `employee_absences.md`.
- **פער ידוע, נדחה בכוונה:** "נוכחות" (כניסה/יציאה יומיומית — ישות 24 במסמך המקורי) **לא** נבנתה. שונה מהותית מ-`employee_absences` (זו מעקב יומיומי בפועל, לא תקופות ידועות מראש). נדחה לקבוצה ו' (כספים), כשייבנה יחד עם "רישום עבודה" (ישות 23) — לפי המסמך המקורי, נוכחות בלי רישום עבודה היא רק חצי מהתמונה (המפגש ביניהם = אחוז ניצולת).

## ר' גם

## ⚠️ חוב ידוע — `hourly_cost` צריך לעבור לטבלה נפרדת

**הפתרון המועדף, לביצוע כשתיבנה מערכת Auth ו-policies:** להוציא את `hourly_cost` (ובהמשך גם נתוני רווחיות וגבייה) לטבלה `office_employee_compensation` נפרדת, ואז policy אחת פשוטה ברמת טבלה.

**למה זה חשוב ולמה לא נעשה עכשיו:** האיפיון קובע ש"עלות שעה, רווחיות וגבייה — בעלים ומנהל משרד בלבד". אבל `hourly_cost` יושבת היום בטבלה שכל שיוך לקוח, כל דוח עומס וכל מסך הקצאה חייבים לקרוא. הרשאות ברמת **עמודה** ב-Postgres (`GRANT ... (column)`) קיימות אבל מסורבלות ולא מתלכדות טוב עם RLS; הפרדה **פיזית** לטבלה הופכת את זה ל-policy אחת. ההפרדה לא בוצעה במיגרציה של 31/08/2026 כדי לא לפצל טבלה לפני שיש בכלל מודל הרשאות — אבל **ככל שנבנה מעליה, כך היא מתייקרת**.

## ר' גם

[`contacts.md`](contacts.md) · [`employee_roles.md`](employee_roles.md) · [`employee_absences.md`](employee_absences.md) · [`specializations.md`](specializations.md) · [`employee_specializations.md`](employee_specializations.md) · [`clients.md`](clients.md) · [`client_notes.md`](client_notes.md) · [`audit_log.md`](audit_log.md)
