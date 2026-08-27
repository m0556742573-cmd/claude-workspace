# טבלה: `entity_types` (סוג ישות / ייחוס — ישות 4 במודל המקורי)

**סטטוס: שלד מינימלי בלבד.** נוצרה כתלות-FK מ-`clients.entity_type_id` — עדיין לא עברה איפיון מלא משל עצמה. תורחב כשנגיע לתור שלה.

מהמסמך המקורי: עוסק פטור/מורשה, חברה, שותפות, מלכ"ר. מסננת את מנוע החובות בהמשך (קבוצה ב') — לא מגדירה ברירות מחדל.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `code` | קוד סוג הישות | text | NOT NULL, UNIQUE | `exempt_dealer`/`licensed_dealer`/`company`/`partnership`/`nonprofit` — הפניה תוכניתית יציבה |
| `name` | שם סוג הישות | text | NOT NULL | תווית עברית לתצוגה |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |
| `updated_at` | תאריך עדכון אחרון | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`clients.md`](clients.md)
