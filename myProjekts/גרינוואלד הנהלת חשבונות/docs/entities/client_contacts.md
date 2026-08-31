# טבלה: `client_contacts` (קישור לקוח↔איש קשר, עם תפקיד)

## מה זה ולמה זה משרת

הטבלה שעונה על "מה הקשר בין האדם הזה ללקוח הזה" — לא "מי האדם" (זה `contacts`) אלא "מה התפקיד שלו **אצל הלקוח הספציפי הזה**". אותו איש קשר (למשל רו"ח) יכול להופיע כאן כמה פעמים עם תפקידים שונים אצל לקוחות שונים. **שדות ספציפיים-לתפקיד** (למשל לתפקיד "אחראי ראשי") יושבים על השורה הזו, לא על `contacts` — כי הם תכונות של הקשר, לא של האדם עצמו.

**הוכרע:** שדות נוספים על הקשר עצמו (לא רק לתפקיד `primary` — לכל תפקיד, למשל גם רו"ח יכול להתחלף) — כדי לשמר **היסטוריה** של מי היה אחראי על מה ומתי, לא רק את המצב הנוכחי.

## שדות

| עמודה (אנגלית) | תרגום השם | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `id` | מזהה | uuid | PK | מזהה ייחודי — נדרש כי טבלאות אחרות (`client_contact_responsibilities`) מצביעות לשורה הזו, לא רק לזוג לקוח+איש-קשר |
| `client_id` | מזהה לקוח | uuid | NOT NULL, FK → `clients.id`, **ON DELETE RESTRICT** | שונה מ-CASCADE — ר' `decisions/0007` |
| `contact_id` | מזהה איש קשר | uuid | NOT NULL, FK → `contacts.id`, **ON DELETE RESTRICT** | שונה מ-CASCADE — ר' `decisions/0007` |
| `role_id` | תפקיד | uuid | NOT NULL, FK → `client_contact_roles.id` | מה האדם הזה אצל הלקוח הזה. **הומר מ-`CHECK` טקסטואלי ל-lookup** — ר' `decisions/0006` |
| `position_at_business` | תפקיד בעסק | text | nullable | למשל "מנכ"ל"/"בעלים" — הקשר של האדם בתוך העסק של הלקוח |
| `responsible_since` | תאריך תחילת הקשר | date | nullable | מתי הקשר הזה (בתפקיד הזה) התחיל |
| `ended_at` | תאריך סיום הקשר | date | nullable | מתי נגמר — **לא מוחקים שורה**, מסמנים סיום כדי לשמר היסטוריה |
| `is_active` | האם פעיל כרגע | boolean | NOT NULL, DEFAULT true | דגל מהיר ל"מי האחראי הראשי *עכשיו*" בלי לחשב מתאריכים |
| `created_at` | תאריך יצירה | timestamptz | NOT NULL, DEFAULT now() | ביקורת |
| — | (אינדקס ייחודי חלקי) | — | UNIQUE(`client_id`,`role_id`) **WHERE `is_active`** | רק אדם *פעיל* אחד לכל תפקיד אצל לקוח נתון — לא חוסם היסטוריה של אנשים שהיו בתפקיד בעבר |
| — | (אילוץ תקינות) | — | CHECK: `ended_at >= responsible_since` | קשר שנגמר לפני שהתחיל לא ייכנס |

## הערה על `role_id` מול `responsibility_areas`

`role_id` הוא **סוג הקשר** (מי הוא בעצם — חתום/רו"ח/פקיד שומה). **תחומי אחריות** (מה הוא מוסמך לאשר בפועל) הם עניין אחר לגמרי — ר' [`responsibility_areas.md`](responsibility_areas.md) ו-[`client_contact_responsibilities.md`](client_contact_responsibilities.md).

בסבב הראשון `role` היה `CHECK` קשיח בעוד `responsibility_areas` כבר הייתה טבלה — אי-עקביות מקרית שתוקנה. שניהם lookup היום.

## ר' גם

[`clients.md`](clients.md) · [`contacts.md`](contacts.md) · [`client_contact_roles.md`](client_contact_roles.md)
