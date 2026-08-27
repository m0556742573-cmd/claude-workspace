# איפיון ישות לקוח — מאוריגמי ל-SQL

מסמך זה מתעד את התרגום המושגי של ישות ה"לקוח" (ותלויותיה הישירות) מלוגיקת אוריגמי (שדות/קבוצות/קבוצות חוזרות) לאיפיון המתאים למערכת SQL יחסית. **אין כאן קוד SQL בפועל** — זהו מסמך איפיון/מילון שדות, המקדים כתיבת migration.

## החלטות מפתח (עם נימוק)

1. **קרדנציאלים (מקצועי/פיננסי) נשארים בשתי טבלאות נפרדות** — לא בגלל מגבלת RLS-ברמת-שורה של אוריגמי (זה נפתר טבעית ב-Postgres), אלא מעיקרון **blast-radius אבטחתי**: הפרדת טבלאות מאפשרת לתת ל-service role עתידי (למשל בוט סנכרון לחשבשבת) גישה רק לטבלה אחת, ברמת מבנה — לא תלוי בנכונות של policy בודד.
2. **טלפון/מייל "ראשיים" כשדות קבועים על הלקוח — בוטלו.** זה היה תוצר של מגבלת אוריגמי (קושי להתאים לפי ערך בתוך קבוצה חוזרת). הועבר לטבלת `client_contact_channels` נפרדת, עם `is_primary` לציון הערוץ הראשי.
3. **`client_status` הוא טבלת lookup, לא enum.** הסיבה: יש סטטוסים עם **התנהגות שונה** (מושהה-חוב ממשיך גבייה, מוקפא-זמנית עוצר גבייה) — זו לא רק תווית, זו לוגיקה עסקית. lookup עם עמודת דגל (`continues_collection`) מאפשר לקוד/Views לבדוק דגל במקום להשוות מחרוזות קשיחות בכל מקום.
4. **נוסף מנגנון audit log** (`clients_audit_log`) — לא "נחמד שיהיה" אלא מענה ישיר למטרה 9 (`overview.md`): תיעוד שמגן מול לקוח, מול ביקורת רשות המסים/ביטוח לאומי, ומול תביעת רשלנות.
5. **כלל גורף: `timestamptz` בכל מקום, לא `timestamp`.** ישראל עם מעברי שעון קיץ/חורף — timestamp נאיבי יוצר באגים אמיתיים.
6. **שאלה פתוחה, לא מוכרעת:** האם `legal_id_number` ו-`signatory_id_number` (לא רק הקרדנציאלים) דורשים הצפנת שדה — הם PII רגיש. מסומן כשאלה, לא הוכרע.

---

## תלויות חיצוניות (ישויות עצמאיות במודל — לא כאן)

טבלת `clients` מצביעה (FK) לישויות עצמאיות שלהן קובץ איפיון משלהן, כרגע ברמת שלד בלבד:

- [`entity_types.md`](entity_types.md) — סוג ישות/ייחוס (ישות 4)
- [`reporting_frequencies.md`](reporting_frequencies.md) — תדירות דיווח (ישות 28)
- [`office_employees.md`](office_employees.md) — עובד משרד (ישות 3)
- [`tags.md`](tags.md) — תגיות לקוח (ישות 31)

## מילון שדות מלא — לקוח ותת-הטבלאות שלו בלבד

הטבלאות הבאות **אינן** ישויות עצמאיות במודל המקורי — הן פירוק מבני של "לקוח" עצמו (קבוצות חוזרות שהפכו לטבלאות, או טבלת lookup פנימית לשדה סטטוס). לכן הן חיות כאן, לא בקובץ נפרד.

### `client_statuses` (lookup פנימי לשדה סטטוס — לא enum, ר' החלטת מפתח 3)

| עמודה | טיפוס | אילוצים | לוגיקה/מקור | מה זה משרת |
|---|---|---|---|---|
| `id` | uuid | PK | — | מזהה |
| `code` | text | NOT NULL, UNIQUE | `lead`/`onboarding`/`active`/`suspended_debt`/`frozen_temporary`/`retiring`/`departed` | הפניה תוכניתית |
| `name` | text | NOT NULL | תווית עברית | תצוגה |
| `continues_collection` | boolean | NOT NULL, DEFAULT false | `true` רק ל-`suspended_debt` | **דגל התנהגות** — קוד/Views בודקים דגל, לא משווים מחרוזת סטטוס |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | — | ביקורת |

### `clients` (לקוח — הישות המרכזית)

| עמודה | טיפוס | אילוצים | לוגיקה/מקור | מה זה משרת |
|---|---|---|---|---|
| `id` | uuid | PK | — | מזהה |
| `signatory_first_name` | text | nullable | — | מי חתום בפועל |
| `signatory_last_name` | text | nullable | — | " |
| `signatory_id_number` | text | nullable | **PII — text, לא integer (אפסים מובילים)** | זיהוי החותם |
| `entity_type_id` | uuid | NOT NULL, FK → entity_types | — | מסנן מנוע חובות (קבוצה ב', עתידי) |
| `legal_id_number` | text | NOT NULL, UNIQUE, **text לא integer** | ח.פ./ת.ז./עמותה — מזהה יחיד לכל הסוגים | מפתח עסקי, לא רק טכני |
| `legal_name` | text | NOT NULL | — | השם המשפטי המדויק |
| `trade_name` | text | nullable | — | איך הלקוח מוכר בפועל |
| `address` | text | nullable | — | |
| `industry` | text | nullable | — | |
| `vat_reporting_frequency_id` | uuid | FK → reporting_frequencies, nullable | — | תדירות מע"מ |
| `annual_report_frequency_id` | uuid | FK → reporting_frequencies, nullable | **נפרד בכוונה מ-VAT** | חובה נפרדת, לא כפילות |
| `tax_authority_file_number` | text | nullable | אם שונה מ-legal_id_number | |
| `status_id` | uuid | NOT NULL, FK → client_statuses | ברירת מחדל אפליקטיבית: `lead` | ר' החלטת מפתח 3 |
| `responsible_employee_id` | uuid | FK → office_employees, nullable | — | **עוגן RLS עתידי**, לא רק שדה תיאורי |
| `created_at` / `updated_at` | timestamptz | NOT NULL, DEFAULT now() | טריגר על updated_at | ביקורת |

### `client_contact_channels` (חדש — מחליף primary_phone/primary_email)

| עמודה | טיפוס | אילוצים | לוגיקה/מקור | מה זה משרת |
|---|---|---|---|---|
| `id` | uuid | PK | — | מזהה |
| `client_id` | uuid | NOT NULL, FK → clients, ON DELETE CASCADE | — | |
| `channel_type` | text (enum-like, ערכים סגורים: `phone`/`email`) | NOT NULL | ללא צורך בדגלי-התנהגות → מספיק enum פשוט/CHECK, לא lookup (בניגוד ל-status) | סוג הערוץ |
| `value` | text | NOT NULL | **מומלץ UNIQUE per channel_type** — כדי למנוע התאמת Omnichannel דו-משמעית לשני לקוחות | הערך עצמו (מספר/כתובת) |
| `is_primary` | boolean | NOT NULL, DEFAULT false. **Unique partial index**: רק שורה אחת `is_primary=true` per (`client_id`,`channel_type`) | — | ערוץ ברירת מחדל לתצוגה/הודעות יוצאות |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | — | ביקורת |

### `client_bank_accounts` (חשבונות בנק — קבוצה חוזרת → טבלה)

| עמודה | טיפוס | אילוצים | לוגיקה/מקור | מה זה משרת |
|---|---|---|---|---|
| `id` | uuid | PK | — | מזהה |
| `client_id` | uuid | NOT NULL, FK → clients, ON DELETE CASCADE | — | |
| `bank_name` | text | NOT NULL | — | |
| `branch_number` | text | nullable | — | |
| `account_number` | text | NOT NULL | **רגיש** | לתשלומים/גבייה |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | — | ביקורת |

### `client_professional_credentials` (הזדהות מקצועית)

| עמודה | טיפוס | אילוצים | לוגיקה/מקור | מה זה משרת |
|---|---|---|---|---|
| `id` | uuid | PK | — | מזהה |
| `client_id` | uuid | NOT NULL, FK → clients, ON DELETE CASCADE | — | |
| `system_name` | text | NOT NULL | למשל "מערכת מייצגים" | לאיזו מערכת ממשלתית |
| `username` | text | nullable | — | |
| `password_encrypted` | text | nullable | **⚠️ TODO: כרגע placeholder — לא הוכרעה אסטרטגיית הצפנה בפועל (pgsodium / Supabase Vault)** | גישה בשם הלקוח |
| `created_at` / `updated_at` | timestamptz | NOT NULL, DEFAULT now() | — | ביקורת |

### `client_financial_credentials` (הזדהות פיננסית)

זהה מבנית ל-`client_professional_credentials` (`system_name` למשל "חשבשבת") — טבלה נפרדת לחלוטין, ר' החלטת מפתח 1.

### `client_notes` (הערות מקצועיות — Bus Factor)

| עמודה | טיפוס | אילוצים | לוגיקה/מקור | מה זה משרת |
|---|---|---|---|---|
| `id` | uuid | PK | — | מזהה |
| `client_id` | uuid | NOT NULL, FK → clients, ON DELETE CASCADE | — | |
| `content` | text | NOT NULL | — | תוכן ההערה |
| `valid_until` | date | nullable | **date, לא timestamptz** — זה תוקף לוגי-יומי, לא רגע מדויק | מתי ההערה כבר לא רלוונטית |
| `created_by` | uuid | FK → office_employees, nullable | — | מי כתב — קריטי ל-Bus Factor |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() | — | ביקורת |

### `client_tags` (M2M)

| עמודה | טיפוס | אילוצים | לוגיקה/מקור | מה זה משרת |
|---|---|---|---|---|
| `client_id` | uuid | NOT NULL, FK → clients, ON DELETE CASCADE, **חלק מ-PK מורכב** | — | |
| `tag_id` | uuid | NOT NULL, FK → tags, ON DELETE CASCADE, **חלק מ-PK מורכב** | — | |

### `clients_audit_log` (חדש — מענה למטרה 9)

| עמודה | טיפוס | אילוצים | לוגיקה/מקור | מה זה משרת |
|---|---|---|---|---|
| `id` | uuid | PK | — | מזהה |
| `client_id` | uuid | NOT NULL, FK → clients | — | |
| `changed_field` | text | NOT NULL | שם העמודה שהשתנתה | מה שונה |
| `old_value` | text | nullable | ייצוג טקסטואלי (לא type-safe בכוונה — גנרי לכל שדה) | ערך קודם |
| `new_value` | text | nullable | — | ערך חדש |
| `changed_by` | uuid | FK → office_employees, nullable | — | מי שינה |
| `changed_at` | timestamptz | NOT NULL, DEFAULT now() | מוזן ע"י trigger, לא ע"י אפליקציה | מתי שונה — תיעוד מגן משפטי |

---

## מה עדיין לא הוכרע / לא נכלל בכוונה

- הצפנת שדה ל-PII נוסף (`legal_id_number`, `signatory_id_number`) — שאלה פתוחה.
- "פעילות אחרונה" — לא עמודה. יהיה View עתידי, תלוי בטבלאות תקשורת/משימות שעוד לא קיימות.
- RLS בפועל — לא נכתב בשלב זה (מחוץ ל-scope הנוכחי), אבל העמודות (`responsible_employee_id`, `hourly_cost`) כבר ממוקמות נכון לקראתו.
- תמיכה בלקוח-קבלן-משנה — במכוון **לא** בטבלת `clients` — שייכת לרמת ה"עסקה" (קבוצה ב', עתידי).
