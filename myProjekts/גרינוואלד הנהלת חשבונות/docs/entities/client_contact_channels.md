# טבלה: `client_contact_channels` (ערוצי קשר של לקוח)

מחליף שדות "טלפון ראשי"/"מייל ראשי" קבועים על `clients` — היו תוצר של מגבלת אוריגמי (קושי להתאים לפי ערך בתוך קבוצה חוזרת). ב-Postgres אפשר לחפש ישירות מול הטבלה הזו, בלי שדה כפול קבוע.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `client_id` | מזהה לקוח | uuid | NOT NULL, FK → `clients.id`, ON DELETE CASCADE | שיוך לקוח |
| `channel_type` | סוג הערוץ | text | NOT NULL, ערכים סגורים (`phone`/`email`) | אין דגלי-התנהגות נדרשים → מספיק ערכים סגורים, לא לוקאפ נפרד |
| `value` | הערך (מספר/כתובת) | text | NOT NULL, **מומלץ UNIQUE per channel_type** | מונע התאמת Omnichannel דו-משמעית לשני לקוחות |
| `is_primary` | האם ערוץ ראשי | boolean | NOT NULL, DEFAULT false, **unique partial index** — רק שורה אחת `true` per (`client_id`,`channel_type`) | ערוץ ברירת מחדל לתצוגה/הודעות יוצאות |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`clients.md`](clients.md)
