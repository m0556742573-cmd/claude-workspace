# employee_specializations — קישור עובד↔התמחות

## מה זה ולמה זה משרת

טבלת M2M טהורה: לעובד יכולות להיות כמה התמחויות, ולהתמחות כמה עובדים. מחליפה את עמודת המערך `office_employees.specializations` ומאפשרת את שאילתת ההקצאה ("מי מתמחה ב-X") כ-join רגיל במקום חיפוש בתוך מערך.

| עמודה (אנגלית) | תרגום השם (עברית) | טיפוס | אילוצים | מה זה משרת |
|---|---|---|---|---|
| `employee_id` | עובד | `uuid` | `not null`, FK → `office_employees(id)`, `on delete cascade`, חלק מ-PK | — |
| `specialization_id` | התמחות | `uuid` | `not null`, FK → `specializations(id)`, `on delete cascade`, חלק מ-PK | — |

**מפתח ראשי מורכב** `(employee_id, specialization_id)` — מונע כפילות, ואין צורך ב-`id` נפרד.

**`cascade` כאן מכוון:** זו טבלת צומת טהורה שאין לה משמעות בלי אחד הצדדים ואין בה מידע עצמאי — בדיוק החריג שהוגדר ב-`decisions/0007`.
