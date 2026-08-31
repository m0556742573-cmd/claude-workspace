# טבלה: `employee_absences` (היעדרויות עובד)

## מה זה ולמה זה משרת

מעקב **היעדרויות זמניות** (חופשה/מחלה/אחר) — נפרד מ-`is_active` (שמייצג עזיבה קבועה). זה מה שנותן תשובה אמיתית ל"מי פנוי השבוע" (מטרה 5), ומאפשר לזהות מראש חובות/מטלות שעלולות ליפול כי האחראי עליהן נעדר (מטרה 1). לכל היעדרות אפשר לרשום מי מכסה עליה — **לא אוטומטי**, החלטה אנושית של מנהל לכל מקרה לגופו, לא ברירת מחדל קבועה מראש.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `employee_id` | מזהה עובד | uuid | NOT NULL, FK → `office_employees.id`, **ON DELETE RESTRICT** | מי נעדר. שונה מ-CASCADE — ר' `decisions/0007` |
| `start_date` | תאריך התחלה | date | NOT NULL | |
| `end_date` | תאריך סיום | date | nullable, CHECK: `end_date >= start_date` | ריק = היעדרות פתוחה (עוד לא ידוע מתי חוזר) |
| `absence_type_id` | סוג היעדרות | uuid | FK → `absence_types.id`, nullable | **הומר מ-`CHECK` ל-lookup** — "מילואים" הוא דוגמה מיידית לערך שנדרש ולא היה ברשימה הסגורה. ר' `decisions/0006` |
| `covering_employee_id` | מי מכסה | uuid | FK → `office_employees.id`, nullable | **הוכרע: לא אוטומטי** — מנהל ממלא לכל היעדרות בנפרד. ריק = "אין עדיין כיסוי מוחלט" — מידע שימושי בפני עצמו |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`office_employees.md`](office_employees.md)
