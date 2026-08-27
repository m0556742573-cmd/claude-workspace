# טבלה: `office_employees` (עובד משרד — ישות 3 במודל המקורי)

**סטטוס: שלד בסיסי.** נוצרה כתלות-FK מ-`clients.responsible_employee_id` ו-`client_notes.created_by` — עדיין לא עברה איפיון מלא ברמת העומק של טבלאות הלקוח. תורחב כשנגיע לתור שלה.

מהמסמך המקורי: הצוות. עלות שעה פנימית (רגיש, מוגן הרשאות), תפקיד, התמחויות (הקצאה חכמה, עתידי).

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `full_name` | שם מלא | text | NOT NULL | תצוגה/זיהוי |
| `role` | תפקיד | text | nullable | חופשי בשלב זה |
| `hourly_cost` | עלות שעה | numeric(10,2) | CHECK ≥ 0, nullable | **רגיש** — RLS עתידי יגביל לבעלים/מנהל בלבד |
| `specializations` | התמחויות | text[] | nullable | הקצאה חכמה (עתידי) |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |
| `updated_at` | תאריך עדכון אחרון | timestamptz | NOT NULL, DEFAULT now() | ביקורת |

## ר' גם

[`clients.md`](clients.md) · [`client_notes.md`](client_notes.md) · [`clients_audit_log.md`](clients_audit_log.md)
