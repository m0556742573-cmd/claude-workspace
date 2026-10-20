# סטטוס — אתר ומייל ב-y-h-m.com

**רמת טעינה: 1** — נטען בכל שיחה. ⚠️ **תקרה: 60 שורות.**

## איפה אנחנו

**נבנה, עוד לא עלה.** האתר (`site/index.html`) וסקריפט ההעלאה (`scripts/deploy.sh`) מוכנים. הסקריפט נבדק מול סביבה מדומה, **לא מול השרת האמיתי.** איך מעלים ולמה ככה: [`setup-guide.md`](setup-guide.md) ו-[`decisions/0001`](decisions/0001-site-on-vps-static-nginx-via-traefik-file.md).

**מייל:** יש המלצה, Cloudflare Email Routing ל-Gmail ושליחה דרך Brevo ([`setup-guide.md`](setup-guide.md), חלק ג'). **עוד לא הוכרע (W-002).**

## הצעד הבא

1. **W-001:** תוכן לאתר: שם העסק, משפט על מה שאתה עושה, שלושה שירותים, טלפון וכתובת מייל. **בינתיים יש באתר סוגריים מרובעים במקום התוכן.**
2. **W-003:** רשומות DNS ב-Cloudflare (חלק א'), ואז `bash scripts/deploy.sh --check` ו-`bash scripts/deploy.sh`. **את הפלט להביא לשיחה.**
3. **W-002:** לבחור דרך למייל, ולהקים לפי חלק ג'.

## מה מחכה

**[`../waiting.md`](../waiting.md)**.

## מה קרה

**[`log.md`](log.md)**.
