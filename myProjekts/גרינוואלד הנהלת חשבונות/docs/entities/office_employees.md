# איפיון ישות — עובד משרד (ישות 3 במודל המקורי)

**סטטוס: שלד בסיסי.** נוצר כתלות-FK מ-`clients.responsible_employee_id` ו-`client_notes.created_by` — עדיין לא עבר איפיון מלא ברמת העומק של `client.md`. יורחב כשנגיע לתור שלו.

## מה שכבר ידוע (מהמסמך המקורי)

הצוות. עלות שעה פנימית (רגיש, מוגן הרשאות), תפקיד, התמחויות (הקצאה חכמה, עתידי).

## שדות (שלד)

| עמודה | טיפוס | אילוצים | לוגיקה/מקור | מה זה משרת |
|---|---|---|---|---|
| `id` | uuid | PK | — | מזהה |
| `full_name` | text | NOT NULL | — | תצוגה/זיהוי |
| `role` | text | nullable | חופשי בשלב זה | תפקיד |
| `hourly_cost` | numeric(10,2) | CHECK ≥ 0, nullable | **רגיש** | RLS עתידי יגביל לבעלים/מנהל בלבד |
| `specializations` | text[] | nullable | — | הקצאה חכמה (עתידי) |
| `created_at` / `updated_at` | timestamptz | NOT NULL, DEFAULT now() | — | ביקורת |
