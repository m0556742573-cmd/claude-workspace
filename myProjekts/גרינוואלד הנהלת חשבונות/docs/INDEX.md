# אינדקס — פרויקט גרינוואלד

- [`overview.md`](overview.md) — כוכב צפוני, תיחום scope, עשר מטרות-העל עם יעדים מדידים, מודל 33 הישויות (תמצית), מקורות המידע.
- [`architecture.md`](architecture.md) — איך זה בנוי כרגע: Supabase self-hosted, Traefik/DNS, אבטחה, גיבויים. מסמך חי.
- [`status.md`](status.md) — מה הושלם, מה פתוח, מה הצעד הבא. הכי מתעדכן — פותחים ראשון.
- [`log.md`](log.md) — יומן פעולות כרונולוגי.
- [`access.md`](access.md) — מרשם הרשאות/גישות. **local-only, לא בגיט.**
- `entities/` — איפיוני ישויות מפורטים (מושגי + מילון שדות), לקראת migrations:
  - [`client.md`](entities/client.md) — לקוח + תלויות ישירות (12 טבלאות). תרגום מלוגיקת אוריגמי ל-SQL, כולל שינויי עיצוב מכוונים (status כ-lookup לא enum, audit log, ביטול שדות "ראשי" קבועים).
- `decisions/` — Architecture Decision Records:
  - [`0001-self-hosted-supabase-on-existing-vps.md`](decisions/0001-self-hosted-supabase-on-existing-vps.md) — למה self-hosted במקום Supabase Cloud.
  - [`0002-network-isolation-and-routing.md`](decisions/0002-network-isolation-and-routing.md) — למה תת-דומיין יחיד, איך Traefik מגיע ל-Supabase.
  - [`0003-vps-hardening-and-known-gap.md`](decisions/0003-vps-hardening-and-known-gap.md) — הקשחת SSH/fail2ban, ופער ידוע (פורט 3000).
  - [`0004-automated-backups-to-r2.md`](decisions/0004-automated-backups-to-r2.md) — גיבויים אוטומטיים ל-R2.
