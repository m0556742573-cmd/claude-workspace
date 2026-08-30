# טבלה: `office_employees` (עובד משרד — ישות 3 במודל המקורי)

**סטטוס: איפיון מלא.**

## מה זה ולמה זה משרת

מייצגת את הצוות (העובדים) במשרד. משמשת לשיוך אחריות על לקוחות (מטרה 5 — שקיפות עומס/צוות) ולעוגן ה-RLS העתידי (מי רואה מה). `hourly_cost` (עלות שעה) הוא שדה רגיש שנדרש למדידת רווחיות פר-לקוח (מטרה 6).

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `first_name` | שם פרטי | text | NOT NULL | פוצל משם מלא — עקבי עם `contacts` |
| `last_name` | שם משפחה | text | nullable | |
| `id_number` | תעודת זהות | text | nullable, **text לא integer** (אפסים מובילים) | PII — חלה עליו אותה שאלת הצפנה פתוחה כמו `contacts.id_number` |
| `phone` | טלפון | text | nullable | שדה בודד, לא טבלת ערוצים נפרדת — לעובד יש בד"כ קו אחד, לא כמו לקוח/Omnichannel |
| `email` | מייל | text | nullable | אותה סיבה |
| `role_id` | מזהה תפקיד | uuid | FK → `employee_roles.id`, nullable | ר' `employee_roles.md` — לא טקסט חופשי, כדי שתבניות/הערות יוכלו להצביע לתפקיד בצורה מסודרת |
| `hourly_cost` | עלות שעה | numeric(10,2) | CHECK ≥ 0, nullable | **רגיש** — RLS עתידי יגביל לבעלים/מנהל בלבד |
| `specializations` | התמחויות | text[] | nullable | הקצאה חכמה (עתידי) |
| `hire_date` | תאריך תחילת עבודה | date | nullable | |
| `is_active` | האם פעיל | boolean | NOT NULL, DEFAULT true | עובד שעזב לא נמחק — מסומן לא-פעיל, כדי לשמר היסטוריה (הערות/ביקורת ישנות מצביעות עדיין אליו) |
| `departure_date` | תאריך עזיבה | date | nullable | רלוונטי כש-`is_active`=false |
| `departure_reason` | סיבת עזיבה | text | nullable | אותו דפוס כמו `clients.departure_reason` |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |
| `updated_at` | תאריך עדכון אחרון | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`employee_roles.md`](employee_roles.md) · [`clients.md`](clients.md) · [`client_notes.md`](client_notes.md) · [`clients_audit_log.md`](clients_audit_log.md)
