# טבלה: `clients` (לקוח — הישות המרכזית)

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `signatory_first_name` | שם פרטי של החותם | text | nullable | מי חתום בפועל מטעם הלקוח |
| `signatory_last_name` | שם משפחה של החותם | text | nullable | " |
| `signatory_id_number` | מספר תעודת זהות של החותם | text | nullable, **text לא integer** (אפסים מובילים) | זיהוי החותם — PII רגיש |
| `entity_type_id` | מזהה סוג הישות | uuid | NOT NULL, FK → `entity_types.id` | מסנן מנוע חובות (קבוצה ב', עתידי) |
| `legal_id_number` | מספר מזהה משפטי (ח.פ./ת.ז./עמותה) | text | NOT NULL, UNIQUE, **text לא integer** | מפתח עסקי — מזהה יחיד לכל סוגי הישות |
| `legal_name` | שם משפטי רשמי | text | NOT NULL | השם המדויק מול הרשויות |
| `trade_name` | שם מסחרי | text | nullable | איך הלקוח מוכר בפועל (יכול להיות שונה מהרשמי) |
| `address` | כתובת | text | nullable | |
| `industry` | תחום עיסוק / ענף | text | nullable | |
| `vat_reporting_frequency_id` | מזהה תדירות דיווח מע"מ | uuid | FK → `reporting_frequencies.id`, nullable | תדירות מע"מ |
| `annual_report_frequency_id` | מזהה תדירות דוח שנתי | uuid | FK → `reporting_frequencies.id`, nullable | **נפרד בכוונה מ-VAT** — חובה נפרדת, לא כפילות |
| `tax_authority_file_number` | מספר תיק ברשות המסים | text | nullable | אם שונה מ-`legal_id_number` |
| `status_id` | מזהה סטטוס לקוח | uuid | NOT NULL, FK → `client_statuses.id` | ר' `client_statuses.md` — ברירת מחדל אפליקטיבית: `lead` |
| `responsible_employee_id` | מזהה עובד אחראי | uuid | FK → `office_employees.id`, nullable | **עוגן RLS עתידי**, לא רק שדה תיאורי |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |
| `updated_at` | תאריך עדכון אחרון | timestamptz | NOT NULL, DEFAULT now(), טריגר | ביקורת |

## הערות

- כלל גורף: `timestamptz` תמיד, לא `timestamp` — ישראל עם מעברי שעון קיץ/חורף, timestamp נאיבי יוצר באגים אמיתיים.
- שאלה פתוחה, לא מוכרעת: האם `legal_id_number` ו-`signatory_id_number` דורשים הצפנת שדה (PII רגיש) — לא רק הקרדנציאלים.
- "פעילות אחרונה" — **לא** עמודה כאן. יהיה View עתידי, תלוי בטבלאות תקשורת/משימות שעוד לא קיימות.
- תמיכה בלקוח-קבלן-משנה — במכוון **לא** כאן — שייכת לרמת ה"עסקה" (קבוצה ב', עתידי).

## ר' גם

[`client.md`](client.md) — רציונל עיצוב מלא של כל משפחת טבלאות הלקוח.
