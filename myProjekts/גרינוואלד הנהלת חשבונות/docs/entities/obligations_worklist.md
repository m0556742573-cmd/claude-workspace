# obligations_worklist — רשימת העבודה (VIEW)

> **חריגה מודעת מהכלל "קובץ לכל טבלה"** — זהו VIEW, כמו [`active_clients`](active_clients.md).

## מה זה ולמה זה משרת

**מה שהמשרד פותח בבוקר.** שורה לכל חובה, עם הלקוח, החובה, הרשות, התקופה, המועד, הסטטוס — ומה שבאמת נשאל: **האם זה באיחור, וכמה ימים נשארו.**

## ⚠️ "באיחור" ו"ימים שנותרו" מחושבים, לא מאוחסנים

```sql
(not is_closed and effective_due_date < current_date)  as is_late
```

עמודה סטטית דורשת ריצה לילית שתהפוך אותה, **ומשקרת בין ריצה לריצה** — בעיית ה-`TODAY()` שהמקור הזהיר ממנה, ואותו נימוק שבגללו כל שדות הנוסחה מהגיליון הפכו ל-Views.

## מה מגיע מאיפה

| | המקור |
|---|---|
| מועד, סיבת הזזה, סיבת דריסה | [`regulatory_calendar`](regulatory_calendar.md) — **מצטרף, לא מועתק** |
| שם החובה, סוג פעולה, מספר טופס | [`obligation_templates`](obligation_templates.md) |
| סטטוס ו-`is_closed` | [`obligation_statuses`](obligation_statuses.md) |
| תווית התקופה | [`periods`](periods.md) |

**`is_amendment`** מסומן כדי שדוח מתקן לא ייראה כהגשה כפולה.

## ⚠️ מלכודת הקפאת העמודות

כמו כל ה-Views: **רשימת העמודות מוקפאת ביצירה.** עמודה חדשה באחת מטבלאות הבסיס **לא תופיע כאן מעצמה, ובלי שגיאה.** ר' [`decisions/0005`](../decisions/0005-rls-enabled-no-policies-yet.md).

`security_invoker = true`.

## ר' גם

[`obligations`](obligations.md) · [`regulatory_calendar`](regulatory_calendar.md) · [`client_obligations_current`](client_obligations_current.md)
