# גיבוי יומי אוטומטי — הפעלה

**מה זה עושה:** פעם ביום, שולח לגיטהאב את כל מה שכבר נרשם בהיסטוריה. רשת ביטחון למקרה ששיחה נגמרה באמצע או שהמחשב נכבה.

**מה זה לא עושה — במכוון:** לא רושם כלום בהיסטוריה בעצמו. רישום אוטומטי היה הופך 52 רישומים משמעותיים לאלפי רישומים חסרי מובן, וההיסטוריה הייתה קיימת אבל בלתי שמישה. **הרישום נשאר החלטה שלך; רק ההעתקה החוצה הופכת אוטומטית.**

**ומה שחשוב לדעת:** הוא מגבה רק מה שכבר **נרשם**. קובץ שאתה באמצע לערוך ולא נרשם — לא מגובה, והסקריפט יכתוב על כך אזהרה ביומן.

---

## להפעלה — פעם אחת

להעתיק את השורה, להדביק בטרמינל, Enter. **לא דורש הרשאות מנהל.**

```
$a = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Users\user\claude\כלים\daily-backup.ps1"'; $t = New-ScheduledTaskTrigger -Daily -At 18:00; $s = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries; Register-ScheduledTask -TaskName 'claude-workspace-backup' -Action $a -Trigger $t -Settings $s -Description 'Daily push of the claude workspace to GitHub'
```

**מה זה קובע:** רץ כל יום ב-18:00. אם המחשב היה כבוי — רץ בהפעלה הבאה (`StartWhenAvailable`). עובד גם על סוללה.

**לשנות שעה:** להחליף `18:00`.

---

## לבדוק שזה עובד

**להריץ ידנית עכשיו, בלי לחכות ליום:**

```
Start-ScheduledTask -TaskName 'claude-workspace-backup'
```

**ואז לקרוא את היומן:**

```
Get-Content "C:\Users\user\claude\כלים\backup.log" -Tail 5
```

שורה תקינה נראית כך: `2026-09-15 18:00  ok       pushed 3 commit(s)`

---

## לעצור / להסיר

```
Unregister-ScheduledTask -TaskName 'claude-workspace-backup' -Confirm:$false
```

---

## ⚠️ ולמה יש יומן בכלל

**גיבוי שנכשל בשקט גרוע מגיבוי שאין** — כי אתה מאמין שאתה מגובה. היומן הוא איך שכשל נראה.

כדאי להציץ בו פעם בשבוע-שבועיים. אם השורה האחרונה ישנה או אומרת `ERROR` — משהו נשבר.

**זה בדיוק אותו שיקול שרשום ב-`overview.md` של גרינוואלד:** *"אמינות מנוע התזכורות עצמו היא שיקול מפורש — יידרש ניטור על המנגנון עצמו, לא רק על מה שהוא מזכיר."* חל גם כאן.

## אם המשימה מסתיימת בכישלון

**הסימן:** `LastTaskResult` שונה מ-0, או ש-`backup.log` לא גדל.

**הסיבה שכבר נתקלנו בה (15/09):** בלי `-ExecutionPolicy Bypass` בפקודת ההרשמה, ווינדוס מסרב להריץ קובץ סקריפט מתוך משימה מתוזמנת — ונכשל **בשקט**, בלי לכתוב שורה ליומן. הדגל חל על ההרצה הבודדת הזו בלבד; הוא אינו משנה שום הגדרה במחשב.

**לבדוק את הסטטוס:**

```
Get-ScheduledTaskInfo -TaskName 'claude-workspace-backup' | Select-Object LastRunTime, LastTaskResult
```

**וטעות שעשיתי באבחון, ששווה לזכור:** הנחתי שהאשם הוא שם התיקייה בעברית, ורציתי לשנות אותו. **בדקתי לפני** — והרצתי את אותה משימה מנתיב באנגלית. גם הוא נכשל. ההשערה הייתה שגויה, והבדיקה חסכה שינוי מיותר בכל הפרויקט.
