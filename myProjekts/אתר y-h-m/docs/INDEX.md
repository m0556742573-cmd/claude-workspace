# אינדקס — אתר ומייל ב-y-h-m.com

- [`status.md`](status.md) — איפה אנחנו ומה הצעד הבא. פותחים ראשון.
- [`setup-guide.md`](setup-guide.md) — **המדריך:** רשומות DNS, העלאת האתר, ומייל אישי בדומיין (המלצה + חלופות).
- [`log.md`](log.md) — יומן פעולות.
- `decisions/`:
  - [`0001-site-on-vps-static-nginx-via-traefik-file.md`](decisions/0001-site-on-vps-static-nginx-via-traefik-file.md) — האתר על ה-VPS: nginx סטטי, ניתוב בקובץ Traefik כמו `supabase.yml`. מה נדחה: Easypanel מ-GitHub, WordPress, Cloudflare Pages.
- `site/index.html` — האתר עצמו, קובץ אחד. **כל מה שצריך למלא מסומן בסוגריים מרובעים.**
- `scripts/`:
  - `deploy.sh` — מעלה את `site/` לשרת. `--check` בודק בלבד. כתובת השרת נקראת מ-`scripts/.env.local` או מזה של גרינוואלד, ולא נכנסת לגיט.
- [`../waiting.md`](../waiting.md) — כל מה שמחכה, עם מזהי `W-###`.
