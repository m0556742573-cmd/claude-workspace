# טבלה: `client_contacts` (קישור לקוח↔איש קשר, עם תפקיד)

## מה זה ולמה זה משרת

הטבלה שעונה על "מה הקשר בין האדם הזה ללקוח הזה" — לא "מי האדם" (זה `contacts`) אלא "מה התפקיד שלו **אצל הלקוח הספציפי הזה**". אותו איש קשר (למשל רו"ח) יכול להופיע כאן כמה פעמים עם תפקידים שונים אצל לקוחות שונים. **שדות ספציפיים-לתפקיד** (למשל לתפקיד "אחראי ראשי") יושבים על השורה הזו, לא על `contacts` — כי הם תכונות של הקשר, לא של האדם עצמו.

**⚠️ פתוח:** אילו שדות נוספים בדיוק נדרשים לתפקיד "אחראי ראשי" (`primary`) — טרם הוגדר. יתווספו לטבלה הזו כשיוחלט.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי — נדרש כי טבלאות אחרות (`client_contact_responsibilities`) מצביעות לשורה הזו, לא רק לזוג לקוח+איש-קשר |
| `client_id` | מזהה לקוח | uuid | NOT NULL, FK → `clients.id`, ON DELETE CASCADE | |
| `contact_id` | מזהה איש קשר | uuid | NOT NULL, FK → `contacts.id`, ON DELETE CASCADE | |
| `role` | תפקיד | text | NOT NULL, ערכים סגורים (`signatory`/`primary`/`auditor`/`tax_assessor`/`bank_rep`/`other`) | מה האדם הזה אצל הלקוח הזה |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |
| — | (אילוץ ייחודיות משולב) | — | UNIQUE(`client_id`,`contact_id`,`role`) | אותו אדם יכול להופיע כמה פעמים אצל אותו לקוח, אבל לא באותו תפקיד פעמיים |

## הערה על `role` מול `responsibility_areas`

`role` הוא **סוג הקשר** (מי הוא בעצם — חתום/רו"ח/פקיד שומה) — קבוצה קטנה ויציבה יחסית. **תחומי אחריות** (מה הוא מוסמך לאשר בפועל) הם עניין אחר לגמרי, עלולים להתרחב — ר' [`responsibility_areas.md`](responsibility_areas.md) ו-[`client_contact_responsibilities.md`](client_contact_responsibilities.md).

## ר' גם

[`clients.md`](clients.md) · [`contacts.md`](contacts.md)
