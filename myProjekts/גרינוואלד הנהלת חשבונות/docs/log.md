# יומן פעולות

## 2026-08-26

- קריאת מסמכי האפיון (md, xlsx) והשיחה המשותפת מ-claude.ai — הבנת מודל 33 הישויות וההחלטות הארכיטקטוניות.
- הוקם git repo ב-`C:\Users\user\claude` (קומיט ראשון: `.gitignore`).
- הוסר Baserow (+DB+Redis) ואמולטור Android מה-VPS — פינוי ~3GB RAM (ר' `decisions/0001`).
- נוצר מפתח SSH ייעודי (`~/.ssh/greenwald_vps`) עם גישת root לשרת, בשליטת יצחק (מוסף/מוסר מ-`authorized_keys` לפי הצורך).
- דומיין `y-h-m.com` (Hostinger) הועבר ל-Cloudflare (nameservers), רשומת A `supabase` → IP השרת.
- Supabase self-hosted הותקן והורם דרך docker-compose רשמי ב-`/opt/supabase/docker` (ר' `decisions/0001`).
- אותרה ותוקנה בעיית ניתוב Traefik↔Envoy (502 Bad Gateway) — עבר לניתוב פנימי דרך רשת Docker משותפת (ר' `decisions/0002`).
- אומת end-to-end: `https://supabase.y-h-m.com` עובד עם HTTPS תקין.
- הוקשח SSH (מפתחות בלבד), הותקנו ufw ו-fail2ban. פורט 3000 (Easypanel) נשאר חשוף במכוון (ר' `decisions/0003`).
- הוקם bucket R2 (`greenwald-db-backups`) וטוקן API מוגבל, נבנה סקריפט גיבוי יומי (`pg_dumpall` → gzip → R2), מתוזמן ב-cron (ר' `decisions/0004`).
- הוקמה מערכת התיעוד הזו (`docs/`).
- `overview.md` הועשר עם התוכן המלא ממסמך "מטרות CRM" (Google Docs): כוכב צפוני, תיחום scope מפורש, עשר המטרות עם יעדים מדידים, ושלוש הבהרות (מטרות = עדשה חוצה-שלבים לא שיוך לשלב; אין פורטל לקוח בשלב זה; אמינות מנוע התזכורות כשיקול מפורש).
- נכתב איפיון מפורט לישות לקוח (`docs/entities/client.md`) — תרגום מלוגיקת אוריגמי ל-SQL, לא קוד. כולל 3 שינויי עיצוב מכוונים (client_status כטבלת lookup עם דגל התנהגות במקום enum; audit log חדש כמענה למטרה 9; ביטול שדות טלפון/מייל "ראשיים" קבועים לטובת טבלת ערוצי-קשר). **עדיין אין קוד SQL בפועל.**
- פוצל: ארבע ישויות התלות (`entity_types`, `reporting_frequencies`, `office_employees`, `tags`) הוצאו מ-`client.md` לקבצים נפרדים משלהן (כשלד מינימלי) — כל ישות במקום שלה, גם אם עדיין לא באיפיון מלא.
- **תיקון מבנה נוסף** לפי בקשה מפורשת: `client.md` נמחק לגמרי (לא היה אמור להיות "מסמך-על"). **כל טבלת SQL קיבלה קובץ נפרד משלה** (9 טבלאות: clients, client_statuses, client_contact_channels, client_bank_accounts, client_professional_credentials, client_financial_credentials, client_notes, client_tags, clients_audit_log) — בלי היררכיה, כל קובץ שווה-מעמד. גם נוספה **עמודת תרגום-שם** (עברית) לכל שדה בכל הקבצים, כולל ארבעת השלדים הקיימים — לא רק הסבר תפקיד.
- נוספה לכל 13 קבצי הישויות פסקת פתיחה אחידה "מה זה ולמה זה משרת" — תיאור ראשי של הטבלה, לא רק מילון שדות.
- נכתב קוד SQL מלא (13 טבלאות) לישות הלקוח, לפי מה שכבר תועד — `supabase-selfhost/migrations/20260828000000_client_entity.sql`. כולל טריגר `log_client_changes` שמזין אוטומטית את `clients_audit_log`.
- **המיגרציה הורצה בהצלחה על ה-DB החי** (דרך SQL Editor ב-Studio, לא SSH — יצחק העדיף כך). נבחר "Run and enable RLS" — ר' `decisions/0005`. כל 13 הטבלאות קיימות בפועל עכשיו.
- נוסף `docs/entities/INDEX.md` — אינדקס ייעודי לתיקיית entities/, טבלה עם תרגום+הסבר+סטטוס לכל 20 הטבלאות. `docs/INDEX.md` הראשי עודכן להפנות אליו במקום לשכפל את הרשימה. `CLAUDE.md` עודכן בהתאם (כלל קבוע).
- **כל 7 הטבלאות החדשות + 3 העדכונים (ארכיטקטורת אנשי קשר, מחזור, תפקידים) הורצו בהצלחה על ה-DB החי** (`20260828020000_contacts_architecture.sql`, דרך SSH). התגלתה ותוקנה בעיה: הרצה דרך SSH לא מפעילה RLS אוטומטית (בניגוד ל-Studio UI) — 7 הטבלאות נוצרו רגע בלי RLS, תוקן ידנית מיד, וקובץ ה-migration עודכן להבא. פירוט מלא ב-`decisions/0005` (תוספת).
- מחזור מע"מ/צפוי: יצחק בחר טבלה היסטורית (לא עמודה בודדת) — נוספה `client_turnover_history` (שורה לכל לקוח+שנה, `actual_turnover`+`expected_turnover`).
- נוספה `employee_roles` (ישות 27 מהמודל המקורי, נפספסה קודם) — lookup פתוח, `office_employees.role` (טקסט חופשי) הוחלף ב-`role_id` (FK). `client_notes` קיבלה `relevant_role_id` (תוקף לתפקיד, בנוסף לתוקף בזמן). `clients` קיבלה `general_notes` (חופשי, בלי תוקף) — לצד `client_notes`, לא תחליף.
- כתובת (רחוב/עיר/מיקוד) נוספה גם ל-`contacts` — תכונה של האדם, לא של הקשר לתפקיד. `client_contact_channels` **נשאר** לצד `contact_channels` — ערוץ מוסדי (עסק) שונה במהות מערוץ אישי (אדם), גם אם אותו אדם עונה בשניהם בפועל.
- **תוקנה טעות ארכיטקטונית:** שדות "חותם" (`signatory_*`) שישבו ישירות על `clients` הועברו לארכיטקטורת אנשי קשר מלאה — 5 טבלאות חדשות מאופיינות: `contacts` (ישות 2 מהמודל המקורי, סוף-סוף נבנתה), `contact_channels`, `client_contacts` (קישור עם `role`), `responsibility_areas` (lookup פתוח, כמו `tags`), `client_contact_responsibilities`. שדות ספציפיים-לתפקיד (כמו "אחראי ראשי") יושבים על `client_contacts`, לא על `contacts` ולא על `clients`. **עדיין לא נכתב קוד SQL לזה — רק איפיון.**
- `clients.md` עודכן: הוסרו שדות signatory, נוספו 12 שדות חדשים (תיק מס הכנסה/ניכויים/ביטוח לאומי, תחנת מע"מ, פקיד שומה, אתר, תיאור עסק, תת-תחום, תאריך פתיחה, קוד סיווג, תאריך תחילת התקשרות, סיבת עזיבה) לפי בקשה מפורטת. שדות "וותק"/"הערה בתוקף" נדחו במכוון — נגזרים, לא עמודות.
- שדה `address` פוצל לשדות מובנים (`street_address`, `city`, `postal_code`) לפי בקשה — `20260828010000_client_structured_address.sql`, הורץ בהצלחה על ה-DB החי דרך SSH. `clients.md` עודכן בהתאם.
- **ביקורת שלמות תיעוד** (לקראת מבחן: העברת התיקייה לשיחת Claude Code חדשה, ללא הזיכרון הפנימי שלי). נמצאו ותוקנו 3 פערים: (1) כלל "סגנון עבודה" (יועץ, מסביר, לא מנחש) הועבר מהזיכרון הפנימי אל `CLAUDE.md` — עכשיו נוסע עם התיקייה. (2) שני מסמכי המקור הועתקו בפועל לתוך `docs/source-materials/` (לא רק הפניה ל-Downloads חיצוני). (3) קישורי ה-URL המקוריים (Google Docs, claude.ai) נוספו בטקסט ב-`overview.md`. גם נוסף כלל ל-`CLAUDE.md` לגבי מבנה קבצי entities (טבלה נפרדת לכל SQL table, 5 עמודות קבועות) כדי שיישמר עקבי בהמשך.
