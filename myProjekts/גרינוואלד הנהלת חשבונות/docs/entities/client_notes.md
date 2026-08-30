# טבלה: `client_notes` (הערות מקצועיות על לקוח — Bus Factor)

## מה זה ולמה זה משרת

שומרת ידע מצטבר על הלקוח שבדרך כלל היה נשאר רק בראש של מי שמטפל בו — ישירות עונה על מטרה 5 (שקיפות צוות / הורדת התלות באדם בודד) ומטרה 9 (תיעוד מגן). הערה יכולה לפוג תוקף (`valid_until`), כי מידע ישן עלול להטעות. באוריגמי הייתה קבוצה חוזרת עם תוקף — כאן טבלה נפרדת (יחס אחד-לרבים, כי מצטברות הרבה הערות לאורך זמן).

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `client_id` | מזהה לקוח | uuid | NOT NULL, FK → `clients.id`, ON DELETE CASCADE | שיוך לקוח |
| `content` | תוכן ההערה | text | NOT NULL | |
| `valid_until` | תוקף עד | date | nullable, **date לא timestamptz** — תוקף לוגי-יומי, לא רגע מדויק | מתי ההערה כבר לא רלוונטית (תוקף בזמן) |
| `relevant_role_id` | תפקיד רלוונטי | uuid | FK → `employee_roles.id`, nullable | תוקף **לתפקיד** — אם מוגדר, ההערה רלוונטית רק לתפקיד הזה (למשל רק למנה"ח); `NULL` = רלוונטי לכולם |
| `created_by` | נכתב על ידי | uuid | FK → `office_employees.id`, nullable | מי כתב — קריטי ל-Bus Factor |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`clients.md`](clients.md) · [`employee_roles.md`](employee_roles.md)
