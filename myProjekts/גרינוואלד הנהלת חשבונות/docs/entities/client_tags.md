# טבלה: `client_tags` (קישור רבים-לרבים: לקוח ↔ תגית)

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `client_id` | מזהה לקוח | uuid | NOT NULL, FK → `clients.id`, ON DELETE CASCADE, חלק מ-PK מורכב | צד הלקוח בקשר |
| `tag_id` | מזהה תגית | uuid | NOT NULL, FK → `tags.id`, ON DELETE CASCADE, חלק מ-PK מורכב | צד התגית בקשר |

## ר' גם

[`clients.md`](clients.md) · [`tags.md`](tags.md)
