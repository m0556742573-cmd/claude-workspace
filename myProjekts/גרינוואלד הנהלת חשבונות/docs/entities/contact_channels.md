# טבלה: `contact_channels` (אמצעי קשר של איש קשר)

## מה זה ולמה זה משרת

לכל איש קשר יכולים להיות כמה אמצעי תקשורת (טלפון, נייד, מייל) — כל אחד שורה נפרדת, עם סימון מי המועדף. מבנה זהה ל-`client_contact_channels` (ר' שם), רק ברמת האדם במקום ברמת העסק.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `contact_id` | מזהה איש קשר | uuid | NOT NULL, FK → `contacts.id`, ON DELETE CASCADE | שיוך לאיש הקשר |
| `channel_type` | סוג הערוץ | text | NOT NULL, ערכים סגורים (`phone`/`email`) | |
| `value` | הערך (מספר/כתובת) | text | NOT NULL | |
| `is_primary` | האם ערוץ מועדף | boolean | NOT NULL, DEFAULT false, **unique partial index** — רק שורה אחת `true` per (`contact_id`,`channel_type`) | אמצעי ברירת המחדל של האדם הזה |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`contacts.md`](contacts.md)
