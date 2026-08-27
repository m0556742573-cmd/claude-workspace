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
