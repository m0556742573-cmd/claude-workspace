# טבלה: `client_bank_accounts` (חשבונות בנק של לקוח)

באוריגמי הייתה קבוצה חוזרת (רגיש) בתוך הלקוח — כאן הופכת לטבלה נפרדת (יחס אחד-לרבים).

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `client_id` | מזהה לקוח | uuid | NOT NULL, FK → `clients.id`, ON DELETE CASCADE | שיוך לקוח |
| `bank_name` | שם הבנק | text | NOT NULL | |
| `branch_number` | מספר סניף | text | nullable | |
| `account_number` | מספר חשבון | text | NOT NULL | **רגיש** — לתשלומים/גבייה |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`clients.md`](clients.md)
