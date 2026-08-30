# טבלה: `entity_types` (סוג ישות / ייחוס — ישות 4 במודל המקורי)

**סטטוס: איפיון מלא.**

## מה זה ולמה זה משרת

טבלת ייחוס לסוג הישות המשפטית של הלקוח — עוסק פטור/מורשה, חברה, שותפות, מלכ"ר. משמשת לסינון מנוע החובות הרגולטוריות בהמשך (קבוצה ב') — סוג הישות קובע אילו חובות דיווח בכלל רלוונטיות ללקוח. לא מגדירה ברירות מחדל **לחובות עצמן** — אבל כן מחזיקה עובדות אמיתיות על הסוג, כמו תקרת מחזור.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `code` | קוד סוג הישות | text | NOT NULL, UNIQUE | `exempt_dealer`/`licensed_dealer`/`company`/`partnership`/`nonprofit` — הפניה תוכניתית יציבה |
| `name` | שם סוג הישות | text | NOT NULL | תווית עברית לתצוגה |
| `turnover_threshold` | תקרת מחזור | numeric(12,2) | nullable | רלוונטי בעיקר ל"עוסק פטור" — התקרה החוקית. מאפשר להשוות מול `client_turnover_history.actual_turnover` ולזהות לקוח שמתקרב/חצה סף (מטרה 8 — "עוסק שחצה סף וכדאי לו להתאגד") |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |
| `updated_at` | תאריך עדכון אחרון | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`clients.md`](clients.md) · [`client_turnover_history.md`](client_turnover_history.md)
