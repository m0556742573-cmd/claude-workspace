# 0001 — Self-hosted Supabase על VPS קיים (במקום Supabase Cloud או Docker מקומי)

**Status:** Accepted (2026-08-26)

## Context

הוחלט להעביר את שכבת הנתונים מ-Origami ל-Postgres/Supabase. נבחנו שלוש אפשרויות הרצה: Docker מקומי על מחשב Windows של יצחק, פרויקט מנוהל ב-Supabase Cloud, או self-hosted על שרת קיים. Docker/Supabase CLI לא היו מותקנים על מחשב Windows. יצחק כבר מחזיק Contabo VPS עם Docker/Easypanel שמריץ n8n ו-Chrome service.

## Decision

Self-hosted Supabase (docker-compose רשמי) על ה-VPS הקיים. Supabase Cloud נבדק (Free tier לא מתאים ל-production — נרדם אחרי שבוע חוסר פעילות, אין גיבויים; Pro ~$25/חודש) אבל נדחה לטובת self-hosted שאין לו עלות שכירות נוספת מעבר למה שכבר קיים.

## Consequences

יצחק לוקח על עצמו גיבויים (טופל ב-0004), עדכוני אבטחה, וניטור uptime — לעומת Supabase Cloud שהיו "בחינם" בתוך המחיר. בתמורה: אין תלות בענן חיצוני, שליטה מלאה, ואפס עלות תפעולית נוספת. פינוי משאבים בשרת (הסרת Baserow + אמולטור Android) היה נדרש כדי לפנות מקום.
