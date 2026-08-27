# טבלה: `clients_audit_log` (יומן ביקורת שינויים בלקוח)

לא הייתה קיימת באוריגמי (נסמכו על Audit Log מובנה כללי). נוספה כאן במכוון — מענה ישיר למטרה 9 ב-`overview.md` ("תיעוד שמגן"): מול לקוח, מול ביקורת רשות המסים/ביטוח לאומי, ומול תביעת רשלנות.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `client_id` | מזהה לקוח | uuid | NOT NULL, FK → `clients.id` | לאיזה לקוח שייך השינוי |
| `changed_field` | שם השדה שהשתנה | text | NOT NULL | מה שונה |
| `old_value` | ערך קודם | text | nullable, ייצוג טקסטואלי גנרי (לא type-safe בכוונה) | מה היה לפני |
| `new_value` | ערך חדש | text | nullable | מה הפך להיות |
| `changed_by` | שונה על ידי | uuid | FK → `office_employees.id`, nullable | מי ביצע את השינוי |
| `changed_at` | תאריך השינוי | timestamptz | NOT NULL, DEFAULT now(), **מוזן ע"י trigger, לא ע"י אפליקציה** | מתי שונה — תיעוד מגן משפטי |

## ר' גם

[`clients.md`](clients.md)
