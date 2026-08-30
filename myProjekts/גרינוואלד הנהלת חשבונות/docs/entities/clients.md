# טבלה: `clients` (לקוח — הישות המרכזית)

## מה זה ולמה זה משרת

הישות המרכזית של כל המערכת — מחזיקה את כל המידע הבסיסי על לקוח המשרד (מי חתום, פרטי הישות המשפטית, פרטי עסק, תדירויות דיווח מול הרשויות, סטטוס וסיווג). כל שאר 29 הישויות במודל (משימות, הגשות, חיובים, תקשורת וכו') מצביעות בסופו של דבר ללקוח — זו נקודת העיגון שממנה "נפתחת תמונת הלקוח" (מטרה 4 ב-`overview.md`). מידע רגיש (חשבונות בנק, קרדנציאלים) הוצא במכוון לטבלאות נפרדות — ר' הקבצים הקשורים.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי |
| `entity_type_id` | מזהה סוג הישות | uuid | NOT NULL, FK → `entity_types.id` | מסנן מנוע חובות (קבוצה ב', עתידי) |
| `legal_id_number` | מספר מזהה משפטי (ח.פ./ת.ז./עמותה) | text | NOT NULL, UNIQUE, **text לא integer** | מפתח עסקי — מזהה יחיד לכל סוגי הישות |
| `legal_name` | שם משפטי רשמי | text | NOT NULL | השם המדויק מול הרשויות |
| `trade_name` | שם מסחרי (מותג) | text | nullable | איך הלקוח מוכר בפועל (יכול להיות שונה מהרשמי) |
| `website` | אתר אינטרנט | text | nullable | |
| `business_description` | תיאור פעילות העסק | text | nullable | טקסט חופשי, שונה מ-`industry` (שהוא קטגוריה) |
| `industry` | תחום עיסוק / ענף | text | nullable | |
| `sub_industry` | תת-תחום | text | nullable | |
| `business_established_date` | תאריך פתיחת עסק | date | nullable | |
| `economic_classification_code` | קוד סיווג כלכלי | text | nullable | |
| `street_address` | רחוב ומספר | text | nullable | כתובת (לא מפוצל הלאה — כתובות ישראליות לא תמיד "רחוב+מספר" נקי, יש מושבים/קיבוצים) |
| `city` | עיר | text | nullable | מאפשר סינון/שאילתה לפי עיר |
| `postal_code` | מיקוד | text | nullable, **text לא integer** (אפסים מובילים) | לדואר רשמי |
| `vat_reporting_frequency_id` | מזהה תדירות דיווח מע"מ | uuid | FK → `reporting_frequencies.id`, nullable | תדירות מע"מ |
| `annual_report_frequency_id` | מזהה תדירות דוח שנתי | uuid | FK → `reporting_frequencies.id`, nullable | **נפרד בכוונה מ-VAT** — חובה נפרדת, לא כפילות |
| `tax_authority_file_number` | מספר תיק ברשות המסים | text | nullable | אם שונה מ-`legal_id_number` |
| `income_tax_file_number` | תיק מס הכנסה | text | nullable | |
| `deductions_file_number` | תיק ניכויים | text | nullable | |
| `social_security_file_number` | מספר תיק ביטוח לאומי | text | nullable | |
| `vat_station` | תחנת מע"מ | text | nullable | איזה משרד אזורי |
| `tax_officer` | פקיד שומה | text | nullable | שם/מספר לשכה לעיון מהיר. **אדם ספציפי בפקיד שומה** מתועד דרך `client_contacts` (role=`tax_assessor`), לא כאן |
| `status_id` | מזהה סטטוס לקוח | uuid | NOT NULL, FK → `client_statuses.id` | ר' `client_statuses.md` — ברירת מחדל אפליקטיבית: `lead` |
| `responsible_employee_id` | מזהה עובד אחראי | uuid | FK → `office_employees.id`, nullable | **עוגן RLS עתידי**, לא רק שדה תיאורי |
| `engagement_start_date` | תאריך תחילת התקשרות | date | nullable | |
| `departure_reason` | סיבת עזיבה | text | nullable | רלוונטי כש-`status`=`departed` |
| `general_notes` | הערות כלליות | text | nullable | מידע הקשר חופשי, **בלי** תוקף בזמן/תפקיד — לא תחליף ל-`client_notes` (שם ההערות המתועדות עם תוקף) |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |
| `updated_at` | תאריך עדכון אחרון | timestamptz | NOT NULL, DEFAULT now(), טריגר | ביקורת |

## הערות

- **החותם עבר ל-`contacts`.** במקום שדות `signatory_*` קבועים כאן, "מי חתום" מתועד כשורה ב-`client_contacts` עם `role='signatory'`. אותו דבר לאיש הקשר הראשי (`role='primary'`) — ר' `client_contacts.md`.
- כלל גורף: `timestamptz` תמיד, לא `timestamp` — ישראל עם מעברי שעון קיץ/חורף, timestamp נאיבי יוצר באגים אמיתיים.
- שאלה פתוחה, לא מוכרעת: האם `legal_id_number` (וכן `contacts.id_number`) דורשים הצפנת שדה (PII רגיש) — לא רק הקרדנציאלים.
- "פעילות אחרונה" — **לא** עמודה כאן. יהיה View עתידי, תלוי בטבלאות תקשורת/משימות שעוד לא קיימות.
- תמיכה בלקוח-קבלן-משנה — במכוון **לא** כאן — שייכת לרמת ה"עסקה" (קבוצה ב', עתידי).
- **הוכרע:** גם `general_notes` (שדה חופשי, ללא תוקף) וגם `client_notes` (מתועד, עם תוקף בזמן ותפקיד) — לא תחליפים, שני צרכים שונים.
- **הוכרע:** `client_contact_channels` (ברמת העסק) **נשאר** לצד `contact_channels` (ברמת אדם) — ערוץ מוסדי (`info@`) שונה מהותית מערוץ אישי, גם אם אותו אדם עונה בשניהם.
- **הוכרע:** מחזור מע"מ/צפוי **לא** כאן — הועבר לטבלה נפרדת ([`client_turnover_history.md`](client_turnover_history.md)) כדי לשמור היסטוריה לפי שנה, לא רק ערך אחרון.

## ר' גם

[`entity_types.md`](entity_types.md) · [`reporting_frequencies.md`](reporting_frequencies.md) · [`client_statuses.md`](client_statuses.md) · [`office_employees.md`](office_employees.md) · [`client_contacts.md`](client_contacts.md)
