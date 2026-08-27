# ארכיטקטורה — מצב נוכחי

## שכבת נתונים

**Postgres/Supabase self-hosted**, על VPS קיים (Contabo, Ubuntu 22.04, 4 ליבות, 7.8GB RAM), לצד n8n ו-Chrome service שכבר רצים שם. הותקן דרך `docker compose` (לא Docker Swarm) ב-`/opt/supabase/docker` על השרת — clone רשמי מ-github.com/supabase/supabase.

הרכיבים הרצים: Postgres, GoTrue (Auth), PostgREST (REST API), Realtime, Storage API, **Envoy** (שער ה-API ברירת המחדל בגרסה הנוכחית — לא Kong), Studio (Dashboard), imgproxy, Edge Functions, Supavisor (pooler).

**נקודה טכנית חשובה:** Envoy הוא קונטיינר יחיד שמגיש גם את ה-API וגם את ה-Studio UI, וינתב **לפי path בלבד** (`domains: '*'`) — לא לפי hostname. משמעות: אין צורך בכמה תתי-דומיינים נפרדים לדשבורד מול ה-API, כי זה אותו origin בכל מקרה. ראה `decisions/0002-*`.

## שכבת רשת/DNS

דומיין `y-h-m.com` (Hostinger), DNS מנוהל דרך **Cloudflare** (proxied — מסתיר IP אמיתי, הגנת DDoS). תת-דומיין יחיד: `supabase.y-h-m.com` → מצביע ל-IP השרת.

**Traefik** (כבר קיים בשרת דרך Easypanel, מנהל Docker Swarm) עושה TLS termination עם Let's Encrypt (אוטומטי, HTTP-01 challenge). ניתוב ל-Supabase דרך **ספק קבצים** של Traefik (`/etc/easypanel/traefik/config/supabase.yml`), לא דרך תוויות Docker — כי Traefik רץ ב-Swarm וקונטיינרי ה-compose של Supabase לא Swarm services.

**הקונטיינר של Envoy מחובר גם לרשת ה-overlay `easypanel`** (בנוסף לרשת ברירת המחדל שלו), כדי ש-Traefik (שרץ בקונטיינר נפרד) יוכל להגיע אליו בשם (`supabase-envoy:8000`) — לא דרך `127.0.0.1` (זה לא עובד בין קונטיינרים נפרדים). ראה `decisions/0002-*`.

## אבטחה

- Postgres (5432), pooler (6543), Envoy (8000) — כולם bound ל-`127.0.0.1` בלבד בשרת, לא נגישים מהאינטרנט. **נבדק ואומת דרך שירות סריקת פורטים חיצוני אמיתי** (לא רק הצהרה).
- SSH: רק מפתחות (מפתח ed25519 ייעודי, `~/.ssh/greenwald_vps` אצל יצחק). Password authentication כבוי לגמרי.
- fail2ban פעיל על SSH.
- ufw פעיל, אבל **לא חוסם קונטיינרים של Docker** (בעיה ידועה) — פורט 3000 (Easypanel עצמו) עדיין חשוף לאינטרנט, מוגן רק בסיסמת הפאנל. תיקון נדחה בכוונה כי דורש לגעת ב-Docker/iptables שמשרתים גם את n8n. ראה `decisions/0003-*`.
- Dashboard של Supabase מוגן בסיסמה (Basic Auth ברמת Envoy).

## גיבויים

`pg_dumpall` דרך cron יומי (03:00) → gzip → העלאה ל-**Cloudflare R2** (bucket `greenwald-db-backups`, מחלקת אחסון Standard כדי להישאר במסגרת החינמית). סקריפט: `/opt/backups/backup-db.sh` על השרת. ראה `decisions/0004-*`.

## מה עוד לא קיים

- אין אף טבלה בסכימה (33 הישויות מ-`overview.md`) — מסד הנתונים ריק ומוכן.
- אין RLS (לא רלוונטי עדיין — אין טבלאות).
- אין אינטגרציית n8n/ToolJet עדיין.
- SMTP לא מוגדר (Auth email flows לא פונקציונליים בשלב זה).
