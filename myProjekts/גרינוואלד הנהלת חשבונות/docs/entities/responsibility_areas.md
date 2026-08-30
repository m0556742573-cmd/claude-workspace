# טבלה: `responsibility_areas` (תחומי אחריות — lookup פתוח להרחבה)

## מה זה ולמה זה משרת

מגדירה על אילו תחומים איש קשר **מוסמך לאשר/לענות** עבור לקוח מסוים (למשל: מזכירה שמאשרת שכל החשבוניות של חודש X נשלחו). טבלת lookup נפרדת (לא רשימה קבועה בקוד) — **בכוונה**, כי לא ידוע אם ארבעת התחומים הידועים כרגע (חומר/גבייה/שכר/אישורים, מהמסמך המקורי) הם הרשימה הסופית. אותו דפוס בדיוק כמו `tags` — הוספת תחום חדש היא שורה, לא migration.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `code` | קוד תחום | text | NOT NULL, UNIQUE | `material`/`collection`/`payroll`/`approvals` (רשימת פתיחה — לא סגורה) |
| `name` | שם התחום | text | NOT NULL | תווית עברית |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`client_contact_responsibilities.md`](client_contact_responsibilities.md) · [`client_contacts.md`](client_contacts.md)
