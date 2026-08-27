# טבלה: `client_notes` (הערות מקצועיות על לקוח — Bus Factor)

באוריגמי הייתה קבוצה חוזרת עם תוקף — כאן טבלה נפרדת (יחס אחד-לרבים).

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `client_id` | מזהה לקוח | uuid | NOT NULL, FK → `clients.id`, ON DELETE CASCADE | שיוך לקוח |
| `content` | תוכן ההערה | text | NOT NULL | |
| `valid_until` | תוקף עד | date | nullable, **date לא timestamptz** — תוקף לוגי-יומי, לא רגע מדויק | מתי ההערה כבר לא רלוונטית |
| `created_by` | נכתב על ידי | uuid | FK → `office_employees.id`, nullable | מי כתב — קריטי ל-Bus Factor |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`clients.md`](clients.md)
