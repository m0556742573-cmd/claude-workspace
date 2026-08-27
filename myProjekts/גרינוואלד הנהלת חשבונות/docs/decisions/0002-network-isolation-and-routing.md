# 0002 — בידוד רשת: פורטים ל-localhost בלבד + ניתוב Traefik דרך רשת פנימית משותפת

**Status:** Accepted (2026-08-26)

## Context

שרת ה-VPS מריץ כבר Traefik (דרך Easypanel, Docker Swarm) שמטפל ב-HTTPS/פורטים 80-443 עבור שירותים אחרים. Supabase self-hosted רץ כ-`docker compose` רגיל (לא Swarm). היה צריך להחליט איך לחשוף את Envoy (שער ה-API/Studio של Supabase) לאינטרנט בצורה מאובטחת.

תת-החלטה: כמה תתי-דומיינים להקצות. גילוי: Envoy מנתב **לפי path בלבד** (`domains: '*'`), לא לפי hostname — אז `studio.` ו-`api.` היו מציגים בדיוק אותו תוכן. הוחלט על תת-דומיין יחיד: `supabase.y-h-m.com`.

תקלה שהתגלתה: קשירת הפורט של Envoy ל-`127.0.0.1` (למניעת חשיפה לאינטרנט) חסמה גם את Traefik מלהגיע אליו — כי Traefik רץ בקונטיינר נפרד, ו-`127.0.0.1` מנקודת המבט שלו הוא הלופבק *של עצמו*, לא של המארח. תוצאה: 502 Bad Gateway.

## Decision

1. כל הפורטים של Supabase (Postgres 5432, pooler 6543, Envoy 8000) נקשרים ל-`127.0.0.1` בלבד ברמת המארח — לא נגישים מהאינטרנט כלל.
2. קונטיינר ה-Envoy מחובר גם לרשת ה-overlay `easypanel` (בנוסף לרשת ברירת המחדל של ה-compose stack), כדי ש-Traefik יוכל להגיע אליו לפי שם קונטיינר (`http://supabase-envoy:8000`) על הרשת הפנימית המשותפת — לא דרך IP/פורט של המארח בכלל.
3. קובץ ניתוב סטטי ב-Traefik (file provider, `/etc/easypanel/traefik/config/supabase.yml`) מגדיר את הראוטר ל-`supabase.y-h-m.com` — לא תוויות Docker (כי Traefik ב-Swarm mode data provider, וה-compose stack לא Swarm).

## Consequences

אין אף פורט של Supabase נגיש ישירות מהאינטרנט — כל התעבורה עוברת דרך Traefik עם TLS. נבדק ואומת מבחוץ עם שירות סריקת פורטים אמיתי (לא רק הנחה). אם Envoy יוחלף אי פעם ב-Kong (override קיים ב-repo הרשמי), צריך לעדכן את שם הקונטיינר בקובץ הניתוב של Traefik.
