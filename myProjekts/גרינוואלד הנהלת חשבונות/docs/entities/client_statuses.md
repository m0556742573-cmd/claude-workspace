# טבלה: `client_statuses` (סטטוסי לקוח — lookup פנימי, לא enum)

## מה זה ולמה זה משרת

טבלת ייחוס שמגדירה את מחזור החיים של לקוח (ליד → בהקמה → פעיל → ...) — משמשת כמקור אמת יחיד לסטטוס, ומאפשרת לצרף **התנהגות עסקית** לכל סטטוס, לא רק תווית לתצוגה. לא ישות עצמאית במודל המקורי — lookup פנימי לשדה סטטוס של `clients`. נבחרה טבלה במקום Postgres enum כי לחלק מהסטטוסים יש **התנהגות שונה**: מושהה-בגין-חוב ממשיך גבייה, מוקפא-זמנית עוצר גבייה. `continues_collection` מאפשר לקוד/Views לבדוק דגל במקום להשוות מחרוזות קשיחות בכל מקום.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `code` | קוד סטטוס | text | NOT NULL, UNIQUE | `lead`/`onboarding`/`active`/`suspended_debt`/`frozen_temporary`/`retiring`/`departed` — הפניה תוכניתית יציבה |
| `name` | שם הסטטוס | text | NOT NULL | תווית עברית לתצוגה |
| `continues_collection` | האם גבייה ממשיכה | boolean | NOT NULL, DEFAULT false | `true` רק ל-`suspended_debt` — **דגל התנהגות עסקית**, לא רק תיאור |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`clients.md`](clients.md) — הטבלה שמצביעה לכאן דרך `status_id`.
