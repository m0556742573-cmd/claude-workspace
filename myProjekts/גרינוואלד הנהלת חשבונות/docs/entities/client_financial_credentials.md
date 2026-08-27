# טבלה: `client_financial_credentials` (הזדהות פיננסית של לקוח)

מבנה זהה ל-`client_professional_credentials`, טבלה נפרדת בכוונה (עיקרון blast-radius אבטחתי — ר' שם לנימוק המלא).

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `client_id` | מזהה לקוח | uuid | NOT NULL, FK → `clients.id`, ON DELETE CASCADE | שיוך לקוח |
| `system_name` | שם המערכת | text | NOT NULL | למשל "חשבשבת" |
| `username` | שם משתמש | text | nullable | |
| `password_encrypted` | סיסמה (מוצפנת) | text | nullable | **⚠️ TODO: placeholder בלבד — לא הוכרעה אסטרטגיית הצפנה** |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |
| `updated_at` | תאריך עדכון אחרון | timestamptz | NOT NULL, DEFAULT now(), טריגר | ביקורת |

## ר' גם

[`client_professional_credentials.md`](client_professional_credentials.md) · [`clients.md`](clients.md)
