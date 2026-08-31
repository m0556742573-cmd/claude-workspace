# אינדקס ישויות — כל טבלאות ה-SQL

טבלה אחת לכל טבלת SQL שאופיינה עד כה (בין אם כבר בקוד או עדיין רק מאופיינת). לפרטי שדות מלאים — לחצו על שם הטבלה.

**29 טבלאות ב-DB החי, כולן עם RLS מופעל.**

| טבלה (אנגלית) | תרגום השם | מה זה ולמה זה משרת | סטטוס |
|---|---|---|---|
| [`clients`](clients.md) | לקוח | הישות המרכזית — כל המידע הבסיסי על לקוח המשרד. כל שאר הישויות מצביעות אליה בסופו של דבר | ✅ בקוד |
| [`client_statuses`](client_statuses.md) | סטטוסי לקוח | lookup לשדה סטטוס (לא enum) — כי לחלק מהסטטוסים יש התנהגות שונה (למשל גבייה ממשיכה/נעצרת) | ✅ בקוד |
| [`client_bank_accounts`](client_bank_accounts.md) | חשבונות בנק | פרטי חשבונות בנק של הלקוח, כולל **ייעוד** — לאיזה חשבון גבייה ולאיזה החזרים | ✅ בקוד |
| [`bank_account_purposes`](bank_account_purposes.md) | ייעוד חשבון בנק | lookup — גבייה/החזרים/כללי. בלעדיו, לקוח עם שני חשבונות הוא כסף שהולך למקום הלא נכון | ✅ בקוד |
| [`client_credentials`](client_credentials.md) | פרטי הזדהות | גישה למערכות בשם הלקוח. **מאחד** את שתי הטבלאות הקודמות. ⚠️ שדה הסיסמה נעול עד להכרעת הצפנה | ✅ בקוד |
| [`credential_types`](credential_types.md) | קטגוריות הזדהות | lookup — מקצועי/פיננסי. מחליף את פיצול הטבלאות | ✅ בקוד |
| [`client_notes`](client_notes.md) | הערות מקצועיות | ידע מצטבר על הלקוח עם תוקף בזמן ותוקף לתפקיד — Bus Factor | ✅ בקוד |
| [`client_tags`](client_tags.md) | קישור לקוח↔תגית | טבלת M2M — לקוח יכול לשאת כמה תגיות | ✅ בקוד |
| [`audit_log`](audit_log.md) | יומן ביקורת (גנרי) | מי שינה מה ומתי — **מעל כל טבלה**, לא רק לקוחות. מחליף את `clients_audit_log` | ✅ בקוד |
| [`entity_types`](entity_types.md) | סוג ישות / ייחוס | עוסק פטור/מורשה/חברה/שותפות/מלכ"ר — מסנן את מנוע החובות, כולל תקרת מחזור | ✅ בקוד |
| [`reporting_frequencies`](reporting_frequencies.md) | תדירות דיווח | חד-חודשי/דו-חודשי/שנתי — קובע מחזור הגשות. נשארת מינימלית במכוון | ✅ בקוד |
| [`office_employees`](office_employees.md) | עובד משרד | תנאי העסקה — היקף משרה, עלות שעה, קיבולת. פרטים אישיים ב-`contacts` | ✅ בקוד |
| [`specializations`](specializations.md) | התמחויות | lookup — בסיס להקצאה חכמה. הומר מעמודת מערך | ✅ בקוד |
| [`employee_specializations`](employee_specializations.md) | קישור עובד↔התמחות | M2M — "מי מתמחה בשכר וזמין השבוע" כ-join ולא כחיפוש במערך | ✅ בקוד |
| [`employee_absences`](employee_absences.md) | היעדרויות עובד | חופשה/מחלה זמנית (לא עזיבה קבועה) — מי מכסה, בהחלטה אנושית לא אוטומטית | ✅ בקוד |
| [`absence_types`](absence_types.md) | סוגי היעדרות | lookup — "מילואים" הוא הדוגמה שהרשימה הסגורה לא הכילה | ✅ בקוד |
| [`employee_roles`](employee_roles.md) | תפקידי עובדים | lookup פתוח לתפקידים במשרד — תבניות/הערות מצביעות לתפקיד, לא לאדם | ✅ בקוד |
| [`tags`](tags.md) | תגיות | סיווג עקבי ורב-ממדי של לקוחות, לפי קטגוריה (FK, לא טקסט) | ✅ בקוד |
| [`tag_categories`](tag_categories.md) | קטגוריות תגית | lookup — כל קטגוריה מפעילה לוגיקה שונה, אז לא טקסט חופשי | ✅ בקוד |
| [`contacts`](contacts.md) | אנשי קשר | בני אדם חוצי-לקוחות — בעלים, רו"ח מבקר, פקיד שומה וכו' | ✅ בקוד |
| [`channels`](channels.md) | ערוצי תקשורת | **טבלה אחת** לכל טלפון/מייל, בבעלות לקוח או איש קשר. תשובה אחת לשאלת ניתוב ה-Omnichannel | ✅ בקוד |
| [`client_official_channels`](client_official_channels.md) | ערוץ רשמי של לקוח | תיוג: איזה ערוץ הוא הרשמי, אחד לכל סוג. לאן נשלחת תכתובת פורמלית | ✅ בקוד |
| [`client_contacts`](client_contacts.md) | קישור לקוח↔איש קשר | מה התפקיד של האדם הזה אצל הלקוח הזה, עם היסטוריה | ✅ בקוד |
| [`client_contact_roles`](client_contact_roles.md) | תפקידי איש קשר | lookup — חתום/אחראי ראשי/רו"ח/פקיד שומה. הומר מ-`CHECK` | ✅ בקוד |
| [`responsibility_areas`](responsibility_areas.md) | תחומי אחריות | lookup פתוח — על מה איש קשר מוסמך לאשר (חומר/גבייה/שכר/אישורים) | ✅ בקוד |
| [`client_contact_responsibilities`](client_contact_responsibilities.md) | קישור קשר↔תחום אחריות | M2M — איזה תחומי אחריות יש לקשר לקוח-איש-קשר ספציפי | ✅ בקוד |
| [`client_turnover_history`](client_turnover_history.md) | היסטוריית מחזור | מחזור מע"מ בפועל/צפוי **לפי שנה** — לא ערך בודד, כדי לשמור מגמה | ✅ בקוד |
| [`periods`](periods.md) | תקופה | ה"קלסר" המשותף שכל ישות תקופתית מצביעה אליו — מפריד "מתי קרה" מ"לאיזו תקופה שייך" | ✅ בקוד |
| [`services`](services.md) | קטלוג שירותים | שירותי המשרד (הנה"ח/שכר/ייעוץ). שלד בלבד — סוג אספקה/תמחור/תעריפים יתווספו בסבב העמקה | ⚪ שלד, בקוד |

**View:** `active_clients` — `select * from clients where deleted_at is null`, עם `security_invoker = true`. נתיב הקריאה המומלץ ללקוחות.

**מקרא סטטוס:** ✅ בקוד = קיימת בפועל ב-DB החי. 📝 מאופיין = איפיון מלא הושלם, עדיין אין קוד SQL. ⚪ שלד = תלות-FK שנוצרה מינימלית, עדיין לא עברה איפיון מלא.

## טבלאות שהוסרו (31/08/2026)

| הוסרה | הוחלפה ב | למה |
|---|---|---|
| `client_contact_channels` | [`channels`](channels.md) | שתי טבלאות ערוצים בלי ייחוד משותף שברו את שיוך ה-Omnichannel — `decisions/0008` |
| `contact_channels` | [`channels`](channels.md) | כנ"ל |
| `client_professional_credentials` | [`client_credentials`](client_credentials.md) | הייתה זהה במבנה לטבלה הפיננסית — זה שדה סוג, לא טבלה |
| `client_financial_credentials` | [`client_credentials`](client_credentials.md) | כנ"ל |
| `clients_audit_log` | [`audit_log`](audit_log.md) | ביקורת רק על לקוחות בעוד ההזדהויות — הרגישות ביותר — לא בוקרו כלל |
