# absence_types — סוגי היעדרות

## מה זה ולמה זה משרת

lookup לסוג ההיעדרות הזמנית של עובד: חופשה, מחלה, מילואים, וכל סוג שהמשרד ירצה להוסיף.

**למה הומר מ-`CHECK` ל-lookup:** קודם `employee_absences.absence_type` היה `CHECK` על שלושה ערכים (`vacation`/`sick`/`other`). "מילואים" הוא דוגמה מיידית לערך שיידרש בהקשר הישראלי ואינו קיים ברשימה, ותחת `CHECK` הוספתו הייתה מיגרציה. לפי `decisions/0006` — רשימה שגדלה מצרכי המשרד היא lookup.

| עמודה (אנגלית) | תרגום השם (עברית) | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | `uuid` | PK, ברירת מחדל `gen_random_uuid()` | — |
| `code` | קוד | `text` | `not null`, `unique` | מזהה יציב |
| `name` | שם | `text` | `not null` | תצוגה |
| `created_at` | נוצר ב | `timestamptz` | `not null`, ברירת מחדל `now()` | — |

**קשור:** [`employee_absences`](employee_absences.md).
