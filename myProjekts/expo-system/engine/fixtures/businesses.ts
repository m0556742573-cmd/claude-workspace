// Fifteen businesses from the 109-business rounds, written as setups the engine runs: the approved setup,
// plus a few additions from the consistency audit (marked in `added`; he has not approved them yet).
import type { Action, CardButton, Condition, NeedPath, Path, Setup, Step, Timing, Who } from '../src/model.ts';

export interface Fixture {
  id: number;
  name: string;
  setup: Setup;
  /** Additions from the consistency audit that are not part of what he approved. */
  added?: string;
}

const after = (days: number): Timing => ({ kind: 'after', days });
const s = (id: string, action: Action, who: Who, timing: Timing, more: Partial<Step> = {}): Step => ({ id, action, who, timing, ...more });
const path = (steps: Step[], end: Path['end'] = { kind: 'list' }): Path => ({ steps, end });
const need = (label: string, goal: NeedPath['goal'], variants: NeedPath['variants'], relation: NeedPath['relation'] = 'customer'): NeedPath => ({ label, goal, relation, variants });
const btn = (label: string, effect: string): CardButton => ({ label, effect });
const tapped = (label: string): Condition => ({ tapped: label });
const list: Path = path([]);
const base = (over: Partial<Setup>): Setup => ({
  business: '', anchor: { goal: '', success: '' }, needs: [], when: [], who: [],
  defaults: { business: list, private: list }, sensitive: false, ...over,
});

const furniture = path([s('invite', 'talk', 'me', after(7), { message: 'הזמנה לערב בחנות, לזוג ולהורים יחד' }), s('again', 'talk', 'me', after(14))]);

export const fixtures: Fixture[] = [
  {
    id: 1, name: 'שטריימלך',
    added: 'מסלול ל"חידוש שטריימל", ו"רק בודק מחירים" ששולח מחירון מיד',
    setup: base({
      anchor: { goal: 'אבות שכבר יש להם חתן', success: '15 אבות במדידה, 30 שטריימלך לשיפוץ' },
      needs: [
        need('שטריימל לחתן', 'primary', [
          { if: tapped('עוד אין חתן'), path: list },
          { if: tapped('רק בודק מחירים'), path: path([s('prices', 'send', 'auto', after(0), { message: 'מחירון' })]) },
          { if: tapped('יש חתונה (מתי?)'), path: path([s('call', 'talk', 'me', after(1)), s('again', 'talk', 'me', after(3))]) },
          { path: path([s('invite', 'send', 'auto', after(1), { message: 'הזמנה למדידה, עם שעות החנות' }), s('call', 'talk', 'me', after(7))]) },
        ]),
        need('חידוש שטריימל', 'secondary', [{ path: path([s('call', 'talk', 'me', after(3))]) }]),
      ],
      when: [btn('יש חתונה (מתי?)', 'שיחה למחרת, במקום הזמנה'), btn('עוד אין חתן', 'רשימת תפוצה בלבד'), btn('רק בודק מחירים', 'מחירון מיד')],
      who: [btn('אבא החתן', 'ההזמנה אליו'), btn('סבא או דוד', 'ההזמנה אליו, בשביל האבא')],
    }),
  },
  {
    id: 6, name: 'לימוד כתיבת סת"ם',
    setup: base({
      needs: ['פרטים על הלימוד', 'פרטים על הזמנים', 'פרטים על הפרנסה אחרי'].map((l, i) => need(l, i ? 'secondary' : 'primary', [
        { path: path([s('call', 'talk', 'me', after(1), { message: 'פרטים על הלימוד: זמנים, מחיר, ומה עושים אחרי' }), s('again', 'talk', 'me', after(3))]) },
      ])),
      when: [btn('מוכן להתחיל', 'עדיפות'), btn('מתלבט', 'אותו מסלול')],
      who: [btn('לעצמו', 'הנוסח אליו'), btn('בשביל הבן', 'הנוסח לאבא')],
      defaults: { business: path([s('call', 'talk', 'me', after(1))]), private: path([s('call', 'talk', 'me', after(1))]) },
    }),
  },
  {
    id: 11, name: 'שדכן',
    setup: base({
      sensitive: true,
      when: [btn('מתאים עכשיו', 'עדיפות'), btn('בהמשך', 'אותו מסלול')],
      who: [btn('הורים לבן', 'לשיחה'), btn('הורים לבת', 'לשיחה')],
      defaults: { business: path([s('call', 'talk', 'me', after(2))], { kind: 'stop' }), private: path([s('call', 'talk', 'me', after(2))], { kind: 'stop' }) },
    }),
  },
  {
    id: 19, name: 'דלתות ודלתות אש',
    setup: base({
      needs: ['דלתות אש', 'דלתות כניסה', 'מנעולים'].map((l, i) => need(l, i ? 'secondary' : 'primary', [{ path: path([
        s('visit', 'meet', 'me', after(7), { onlyIf: { all: [tapped('מוסד'), tapped('יש דרישה מכיבוי אש')] } }),
        s('call', 'talk', 'me', after(14)),
        s('inspection', 'talk', 'me', { kind: 'customerDate', days: -14 }, { message: 'תזכורת לפני ביקורת כיבוי אש' }),
      ], { kind: 'stop' }) }])),
      when: [btn('יש דרישה מכיבוי אש', 'ביקור חינם למוסד'), btn('בשיפוץ', 'אותו מסלול'), btn('בהמשך', 'אותו מסלול')],
      who: [btn('מוסד', 'ביקור חינם, אם יש דרישה'), btn('קבלן', 'בלי ביקור חינם'), btn('פרטי', 'בלי ביקור חינם')],
      defaults: { business: path([s('call', 'talk', 'me', after(7))]), private: list },
    }),
  },
  {
    id: 27, name: 'הסעות',
    setup: base({
      needs: [need('הסעות קבועות', 'primary', [{ path: path([
        s('intro', 'talk', 'me', after(2)),
        s('sivan', 'send', 'auto', { kind: 'calendar', anchor: { month: 'sivan', day: 1 }, days: 0 }, { message: 'תזכורת לשנה הבאה' }),
        s('tamuz', 'talk', 'me', { kind: 'calendar', anchor: { month: 'tamuz', day: 1 }, days: 0 }),
      ], { kind: 'stop' }) }]), need('נסיעה חד-פעמית', 'secondary', [{ path: path([s('call', 'talk', 'me', after(2))]) }])],
      when: [btn('לשנה הבאה', 'תזכורת בסיוון'), btn('עכשיו', 'שיחה'), btn('יש תאריך (מתי?)', 'לפי התאריך')],
      who: [btn('מוסד', 'הסעות קבועות'), btn('משפחה', 'נסיעה חד-פעמית')],
      defaults: { business: path([s('call', 'talk', 'me', after(7))]), private: list },
    }),
  },
  {
    id: 33, name: 'מוסך פחחות',
    added: 'נהג שסימן "יש תאונה עכשיו" מקבל שיחה באותו יום',
    setup: base({
      needs: [
        need('תיקון אחרי תאונה', 'primary', [
          { if: tapped('יש תאונה עכשיו'), path: path([s('call', 'talk', 'me', after(0))]) },
          { path: list },
        ]),
        need('שיתוף פעולה', 'secondary', [{ path: path([s('meet', 'meet', 'me', after(14)), s('again', 'meet', 'me', after(30))], { kind: 'stop' }) }], 'partner'),
        need('לשמור את המספר שלי', 'secondary', [{ path: list }]),
      ],
      when: [btn('יש תאונה עכשיו', 'שיחה באותו יום'), btn('למקרה הצורך', 'רשימת תפוצה')],
      who: [btn('נהג', 'תיקון'), btn('סוכן ביטוח', 'שותף'), btn('עסק עם רכבים', 'עוד לא נקבע')],
      defaults: { business: path([s('call', 'talk', 'me', after(7))]), private: list },
    }),
  },
  {
    id: 35, name: 'בנייה ושיפוצים',
    added: 'בדיקה כל שלושה חודשים, ארבע פעמים — מה שאושר בסבב 3 ונעלם',
    setup: base({
      needs: ['הרחבה', 'שיפוץ פנים', 'מרפסת'].map((l, i) => need(l, i ? 'secondary' : 'primary', [
        { if: tapped('יש תוכנית מאדריכל'), path: path([s('call', 'talk', 'me', after(7)), s('visit', 'meet', 'me', after(7))], { kind: 'repeat', everyDays: 90, times: 4, action: 'check', who: 'me' }) },
        { path: path([s('call', 'talk', 'me', after(7))], { kind: 'repeat', everyDays: 90, times: 4, action: 'check', who: 'me' }) },
      ])),
      when: [btn('עוד לפני היתר', 'בדיקה תקופתית'), btn('יש היתר', 'בדיקה תקופתית'), btn('יש תוכנית מאדריכל', 'ביקור בבית'), btn('רק חושבים על זה', 'בדיקה תקופתית')],
      who: [btn('משפחה', 'לקוח'), btn('אדריכל', 'שותף')],
    }),
  },
  {
    id: 41, name: 'חנות ריהוט',
    setup: base({
      needs: ['סלון', 'חדר שינה', 'פינת אוכל', 'נגרות בהזמנה'].map((l, i) => need(l, i ? 'secondary' : 'primary', [{ path: furniture }])),
      when: [btn('אחרי וורט', 'הזמנה לחנות'), btn('חתונה (מתי?)', 'הזמנה לחנות'), btn('רק בודק מחירים', 'מחירון')],
      who: [btn('הורים', 'ההזמנה אליהם'), btn('הזוג', 'ההזמנה אליהם')],
    }),
  },
  {
    id: 46, name: 'קצביה',
    setup: base({
      needs: ['הזמנה שבועית', 'הזמנה לחג'].map((l, i) => need(l, i ? 'secondary' : 'primary', [{ path: path([1, 2, 3].map((n) =>
        s(`wed${n}`, 'send', 'auto', { kind: 'weekday', weekday: 3 }, { message: `הזמנה ראשונה בהנחה (${n} מ-3)` }))) }])),
      when: [btn('עכשיו', 'אותו מסלול'), btn('לפני החג', 'אותו מסלול')],
    }),
  },
  {
    id: 59, name: 'בגדי גברים',
    setup: base({
      needs: [need('הלבשת חתן ומשפחה', 'primary', [{ path: path([
        s('month', 'send', 'auto', { kind: 'customerDate', days: -30 }, { message: 'הזמנה לחנות לפני החתונה' }),
        s('twoWeeks', 'send', 'auto', { kind: 'customerDate', days: -14 }, { message: 'הזמנה לחנות לפני החתונה' }),
      ], { kind: 'stop' }) }]), need('בגדים לחג', 'secondary', [{ path: list }])],
      when: [btn('חתונה (מתי?)', 'לפי התאריך'), btn('לפני החג', 'רשימת תפוצה')],
      who: [btn('אבא', 'ההזמנה אליו'), btn('חתן', 'ההזמנה אליו')],
    }),
  },
  {
    id: 65, name: 'מזגנים',
    setup: base({
      needs: [need('מיזוג למוסד', 'primary', [
        { if: tapped('עכשיו'), path: path([s('visit', 'meet', 'me', after(1))], { kind: 'stop' }) },
        { path: path([
          s('purim', 'talk', 'me', { kind: 'calendar', anchor: { holiday: 'purim' }, days: 1 }),
          s('again', 'talk', 'me', after(14)),
          s('shavuot', 'talk', 'me', { kind: 'calendar', anchor: { holiday: 'shavuot' }, days: -14 }),
        ], { kind: 'stop' }) },
      ]), need('מזגן לבית', 'secondary', [{ path: list }]), need('תחזוקה', 'secondary', [{ path: list }])],
      when: [btn('לקיץ הבא', 'אחרי פורים'), btn('עכשיו', 'ביקור מיד')],
      who: [btn('מוסד', 'מסלול מוסד'), btn('בית כנסת', 'מסלול מוסד'), btn('משפחה', 'רשימת תפוצה')],
      defaults: { business: path([s('call', 'talk', 'me', after(7))]), private: list },
    }),
  },
  {
    id: 82, name: 'הפעלות לתלמודי תורה',
    added: 'תזכורת לפני בין הזמנים — אושרה בסבב 3 ונעלמה',
    setup: base({
      needs: [
        need('ל"ג בעומר', 'primary', [{ path: path([
          s('afterPesach', 'send', 'auto', { kind: 'calendar', anchor: { holiday: 'pesach' }, days: 8 }, { message: 'תזכורת לפני ל"ג בעומר' }),
          s('call', 'talk', 'me', { kind: 'calendar', anchor: { holiday: 'lagBaomer' }, days: -14 }),
        ], { kind: 'stop' }) }]),
        need('בין הזמנים', 'secondary', [{ path: path([
          s('tamuz', 'send', 'auto', { kind: 'calendar', anchor: { month: 'tamuz', day: 1 }, days: 0 }, { message: 'תזכורת לפני בין הזמנים' }),
          s('call', 'talk', 'me', after(14)),
        ], { kind: 'stop' }) }]),
        need('אירוע גיבוש', 'secondary', [{ path: path([s('call', 'talk', 'me', after(7))]) }]),
      ],
      when: [btn('יש תאריך', 'לפי התאריך'), btn('לשנה הבאה', 'תזכורת לפני העונה')],
      who: [btn('תלמוד תורה', 'מוסד'), btn('בית ספר', 'מוסד'), btn('מחנה', 'מוסד')],
      defaults: { business: path([s('call', 'talk', 'me', after(7))]), private: list },
    }),
  },
  {
    id: 86, name: 'צעצועים',
    setup: base({
      needs: [need('מתנות לחנוכה', 'primary', [{ path: path([
        s('week', 'send', 'auto', { kind: 'calendar', anchor: { holiday: 'chanukah' }, days: -7 }, { message: 'מבצע החנוכה' }),
        s('twoDays', 'send', 'auto', { kind: 'calendar', anchor: { holiday: 'chanukah' }, days: -2 }, { message: 'מבצע החנוכה' }),
      ]) }]), need('צעצועים', 'secondary', [{ path: list }])],
      when: [btn('לחנוכה', 'מבצע החנוכה'), btn('בהמשך', 'רשימת תפוצה')],
      who: [btn('הורים', 'הנוסח'), btn('סבים', 'הנוסח')],
    }),
  },
  {
    id: 100, name: 'מכולת',
    setup: base({
      defaults: { business: path([s('order', 'send', 'auto', after(0), { message: 'איך מזמינים' })], { kind: 'stop' }), private: path([s('order', 'send', 'auto', after(0), { message: 'איך מזמינים' })], { kind: 'stop' }) },
    }),
  },
  {
    id: 105, name: 'אולם אירועים',
    setup: base({
      needs: [need('חתונה', 'primary', [{ path: path([s('reserve', 'reserve', 'me', after(0), { message: 'אישור שריון, עם התאריך שבו השריון משתחרר' })], { kind: 'stop' }) }]), need('אירוע', 'secondary', [{ path: path([s('call', 'talk', 'me', after(2))]) }])],
      when: [btn('יש תאריך (מתי?)', 'שריון לשבוע'), btn('רק בודק', 'מחירון')],
      who: [btn('משפחה', 'חתונה'), btn('מוסד', 'אירוע')],
    }),
  },
];
