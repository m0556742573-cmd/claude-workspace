# טבלה: `client_contact_responsibilities` (קישור: קשר לקוח↔איש-קשר ↔ תחום אחריות)

## מה זה ולמה זה משרת

קישור רבים-לרבים בין שורה ב-`client_contacts` (קשר ספציפי בין לקוח לאיש קשר) לבין תחומי האחריות שהוא מוסמך עליהם **בקשר הזה בדיוק**. אותו איש קשר יכול להיות מוסמך על כמה תחומים בו-זמנית (למשל גם "חומר" וגם "אישורים"). זה מה שמאפשר בעתיד ניתוב אוטומטי ("מי לשאול על חומר של לקוח X") ובדיקת סמכות ("האם האדם הזה בכלל מוסמך לאשר את זה").

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `client_contact_id` | מזהה קשר לקוח-איש קשר | uuid | NOT NULL, FK → `client_contacts.id`, ON DELETE CASCADE, חלק מ-PK מורכב | לאיזה קשר ספציפי זה שייך |
| `responsibility_area_id` | מזהה תחום אחריות | uuid | NOT NULL, FK → `responsibility_areas.id`, ON DELETE CASCADE, חלק מ-PK מורכב | על מה הוסמך |

## ר' גם

[`client_contacts.md`](client_contacts.md) · [`responsibility_areas.md`](responsibility_areas.md)
