# טבלה: `client_professional_credentials` (הזדהות מקצועית של לקוח)

נשארת טבלה נפרדת מ-`client_financial_credentials` (לא מוזגות) — לא בגלל מגבלת RLS-ברמת-שורה של אוריגמי (זה נפתר טבעית ב-Postgres), אלא מעיקרון **blast-radius אבטחתי**: הפרדת טבלאות מאפשרת לתת ל-service role עתידי גישה רק לטבלה אחת, ברמת מבנה — לא תלוי בנכונות של policy בודד.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `client_id` | מזהה לקוח | uuid | NOT NULL, FK → `clients.id`, ON DELETE CASCADE | שיוך לקוח |
| `system_name` | שם המערכת | text | NOT NULL | למשל "מערכת מייצגים" — לאיזו מערכת ממשלתית |
| `username` | שם משתמש | text | nullable | |
| `password_encrypted` | סיסמה (מוצפנת) | text | nullable | **⚠️ TODO: placeholder בלבד — לא הוכרעה אסטרטגיית הצפנה (pgsodium / Supabase Vault)** |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |
| `updated_at` | תאריך עדכון אחרון | timestamptz | NOT NULL, DEFAULT now(), טריגר | ביקורת |

## ר' גם

[`client_financial_credentials.md`](client_financial_credentials.md) — מבנה זהה, סיבת ההפרדה. [`clients.md`](clients.md)
