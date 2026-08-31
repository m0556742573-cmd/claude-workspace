# טבלה: `client_bank_accounts` (חשבונות בנק של לקוח)

## מה זה ולמה זה משרת

מחזיקה את פרטי חשבונות הבנק של הלקוח, לשימוש בתשלומים וגבייה (מטרה 7 — "כסף שלי שיושב אצל אחרים"). מידע רגיש. באוריגמי הייתה קבוצה חוזרת בתוך הלקוח — כאן הופכת לטבלה נפרדת (יחס אחד-לרבים, כי ללקוח יכול להיות יותר מחשבון בנק אחד).

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `client_id` | מזהה לקוח | uuid | NOT NULL, FK → `clients.id`, **ON DELETE RESTRICT** | שיוך לקוח. שונה מ-CASCADE — ר' `decisions/0007` |
| `bank_name` | שם הבנק | text | NOT NULL | |
| `bank_code` | קוד הבנק | text | nullable | הקוד המספרי של הבנק — נדרש להעברות אוטומטיות |
| `branch_number` | מספר סניף | text | nullable | |
| `account_number` | מספר חשבון | text | NOT NULL | **רגיש** — לתשלומים/גבייה |
| `account_holder_name` | שם בעל החשבון | text | nullable | לא תמיד זהה לשם הלקוח (חשבון על שם הבעלים, שותפות) |
| `purpose_id` | ייעוד | uuid | FK → `bank_account_purposes.id`, nullable | **לאיזה שימוש החשבון** — גבייה מול החזרים. בלעדיו, לקוח עם שני חשבונות הוא מצב שבו כסף הולך למקום הלא נכון |
| `notes` | הערות | text | nullable | |
| `is_active` | פעיל? | boolean | NOT NULL, DEFAULT true | חשבון שנסגר נשמר ולא נמחק |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## מקור השדות שנוספו

`bank_code`, `account_holder_name`, `purpose_id` ו-`notes` הופיעו במסמך האיפיון המקורי (גיליון "לקוחות", קבוצת "פרטי חשבון בנק") ולא מומשו בסבב הראשון, כי האיפיון נעשה מהסיכום המזוקק ולא מהגיליון. הושלמו במיגרציה של 31/08/2026.

## ר' גם

[`clients.md`](clients.md) · [`bank_account_purposes.md`](bank_account_purposes.md)
