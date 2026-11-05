// The setup without AI (model, section 15): for each need the exhibitor picks a path from a small library of
// path patterns, drawn from the 15 cases of the rounds, and changes the days if he likes. The consultant builds
// the same structure, so both ways make the same kind of setup.
// A message named here has no approved text: it opens in "הודעות" as a frame for him to write.
import type { Action, Holiday, NeedPath, Path, Step, Timing, Who } from '@expo/engine';

const after = (days: number): Timing => ({ kind: 'after', days });
const s = (id: string, action: Action, who: Who, timing: Timing, message?: string): Step => ({ id, action, who, timing, ...(message ? { message } : {}) });
/** A step with its name in plain words, offered at the booth under "מה סיכמנו?" (5/11, א1). */
const L = (step: Step, label: string): Step => ({ ...step, label });

export interface Pattern {
  id: string;
  name: string;
  /** Who it fits, in a few words. */
  fits: string;
  relation: NeedPath['relation'];
  make: (season?: Holiday) => Path;
}

export const PATTERNS: Pattern[] = [
  { id: 'visit', name: 'ביקור או מדידה ← הצעה ← שליחה ← בדיקה', fits: 'נגר, מטבחים, שיפוצים: מה שצריך לראות במקום', relation: 'customer',
    make: () => ({ steps: [L(s('call', 'talk', 'me', after(2)), 'שיחה לתיאום'), L(s('visit', 'meet', 'me', after(4)), 'ביקור או מדידה'), L(s('quote', 'prepare', 'me', after(2)), 'הכנת הצעה'), L(s('sendQuote', 'send', 'me', after(0), 'הצעת מחיר'), 'שליחת ההצעה'), s('check', 'check', 'me', after(4))], end: { kind: 'list' } }) },
  { id: 'material', name: 'חומר מיד ← שיחה', fits: 'מי שהתעניין: קטלוג או מחירון, ואחריו שיחה', relation: 'customer',
    make: () => ({ steps: [s('material', 'send', 'auto', after(0), 'חומר על העסק'), s('call', 'talk', 'me', after(3))], end: { kind: 'list' } }) },
  { id: 'materialDate', name: 'חומר מיד ← בדיקה ← תזכורת לפני התאריך שלו', fits: 'חתונה, אירוע, בר מצווה: יש לו תאריך', relation: 'customer',
    make: () => ({ steps: [s('material', 'send', 'auto', after(0), 'חומר על העסק'), s('check', 'check', 'me', after(7)), s('before', 'send', 'auto', { kind: 'customerDate', days: -30 }, 'תזכורת לפני התאריך שלך')], end: { kind: 'list' } }) },
  { id: 'meeting', name: 'פגישה ← הצעה ← שליחה ← בדיקה', fits: 'שירות לעסקים ולמוסדות', relation: 'customer',
    make: () => ({ steps: [L(s('call', 'talk', 'me', after(2)), 'שיחה לתיאום'), L(s('meet', 'meet', 'me', after(5)), 'פגישה'), L(s('quote', 'prepare', 'me', after(2)), 'הכנת הצעה'), L(s('sendQuote', 'send', 'me', after(0), 'הצעה'), 'שליחת ההצעה'), s('check', 'check', 'me', after(4))], end: { kind: 'list' } }) },
  { id: 'wait', name: 'לחכות ללקוח ← להכין ← פגישה ← בדיקה', fits: 'הלקוח עוד לא מוכן: תוכנית, אישור, תקציב', relation: 'customer',
    make: () => ({ steps: [s('wait', 'wait', 'auto', after(30)), s('call', 'talk', 'me', after(0)), s('prepare', 'prepare', 'me', after(2)), s('meet', 'meet', 'me', after(5)), s('check', 'check', 'me', after(7))], end: { kind: 'list' } }) },
  { id: 'tasting', name: 'חומר ← שיחה ← טעימה או מדידה ← שריון ← בדיקה', fits: 'קייטרינג, אולמות, שמלות: מה שבודקים ושומרים תאריך', relation: 'customer',
    make: () => ({ steps: [s('material', 'send', 'auto', after(0), 'חומר על העסק'), L(s('call', 'talk', 'me', after(2)), 'שיחה לתיאום'), L(s('try', 'meet', 'me', after(5)), 'טעימה או מדידה'), L(s('reserve', 'reserve', 'me', after(0), 'אישור שריון, עם התאריך שבו השריון משתחרר'), 'שריון תאריך'), s('check', 'check', 'me', after(7))], end: { kind: 'list' } }) },
  { id: 'cycle', name: 'הרשמה לתאריך של העסק ← תזכורת לפני ← המחזור הבא', fits: 'חוגים, קורסים, מחזורים: התאריך הוא של העסק', relation: 'customer',
    make: () => ({ steps: [s('register', 'send', 'auto', after(0), 'פרטי המחזור הקרוב והרשמה'), s('remind', 'send', 'auto', after(10), 'תזכורת לפני שהמחזור מתחיל')], end: { kind: 'repeat', everyDays: 90, times: 3, action: 'send', who: 'auto', message: 'המחזור הבא' } }) },
  { id: 'partner', name: 'שותף: פגישת היכרות ← הסכם ← בדיקת הפניות', fits: 'מי שיכול להפנות אליך לקוחות', relation: 'partner',
    make: () => ({ steps: [L(s('call', 'talk', 'me', after(3)), 'שיחת היכרות'), L(s('meet', 'meet', 'me', after(5)), 'פגישת היכרות'), L(s('terms', 'prepare', 'me', after(3)), 'הסכם'), s('referrals', 'check', 'me', after(30))], end: { kind: 'repeat', everyDays: 90, times: 3, action: 'check', who: 'me' } }) },
  { id: 'distributor', name: 'מפיץ: דוגמה פיזית ← מסירה ← בדיקה ← הזמנה ראשונה', fits: 'חנויות ומפיצים שימכרו את המוצר שלך', relation: 'distributor',
    make: () => ({ steps: [L(s('sample', 'prepare', 'me', after(3)), 'הכנת דוגמה'), L(s('deliver', 'meet', 'me', after(3)), 'מסירת הדוגמה'), s('check', 'check', 'me', after(7)), L(s('order', 'talk', 'me', after(7)), 'שיחה על הזמנה ראשונה')], end: { kind: 'list' } }) },
  { id: 'list', name: 'רשימת תפוצה: מיד ← לפני העונה או המבצע', fits: 'מי שלא צריך עכשיו, אבל כדאי שיזכור אותך', relation: 'customer',
    make: (season = 'pesach') => ({ steps: [s('material', 'send', 'auto', after(0), 'חומר על העסק'), s('season', 'send', 'auto', { kind: 'calendar', anchor: { holiday: season }, days: -21 }, 'לפני העונה')], end: { kind: 'list' } }) },
  { id: 'trigger', name: 'יש תאריך שעוד לא ידוע: לברר מתי ← לפני התאריך', fits: 'שמחה בעתיד, מעבר דירה, פתיחת עסק', relation: 'customer',
    make: () => ({ steps: [s('before', 'talk', 'me', { kind: 'customerDate', days: -30 })], end: { kind: 'list' } }) },
];

export const patternOf = (id: string) => PATTERNS.find((p) => p.id === id);

/** A need built from a pattern: one path for everyone who tapped it. */
export function needFrom(label: string, p: Pattern, goal: NeedPath['goal'], season?: Holiday): NeedPath {
  return { label, goal, relation: p.relation, variants: [{ path: p.make(season) }] };
}

/** Which pattern a path was made from, when it was (same actions in the same order). */
export function recognise(path: Path): Pattern | undefined {
  const key = (x: Path) => x.steps.map((st) => `${st.action}:${st.who}:${st.timing.kind}`).join('|') + '|' + x.end.kind;
  return PATTERNS.find((p) => key(p.make()) === key(path));
}

/**
 * About how many minutes of his own work one visitor brings in the first two weeks: a call 5, a meeting 30, preparing 15.
 * Not every visitor reaches every step, so each step after the first counts a little less (0.6 of the one before).
 */
const MINUTES: Record<Action, number> = { talk: 5, meet: 30, prepare: 15, send: 2, reserve: 5, check: 5, wait: 0 };
export function minutesIn14(path: Path): number {
  let day = 0, total = 0, reach = 1;
  for (const st of path.steps) {
    if (st.timing.kind !== 'after') break;
    day += st.timing.days;
    if (day > 14) break;
    if (st.who === 'me') total += MINUTES[st.action] * reach;
    reach *= 0.6;
  }
  return total;
}
