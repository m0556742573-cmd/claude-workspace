// The setup in plain Hebrew, the way the exhibitor reads it: "שיחה ממך, יום אחרי".
import type { CalendarAnchor, NeedPath, Path, PathEnd, Step, Timing } from '@expo/engine';

const ACT: Record<string, string> = { talk: 'שיחה', meet: 'פגישה', prepare: 'הכנה', send: 'הודעה', reserve: 'שריון', check: 'בדיקה', wait: 'המתנה ללקוח' };
export const HOLIDAY: Record<string, string> = { roshHashana: 'ראש השנה', sukkot: 'סוכות', chanukah: 'חנוכה', purim: 'פורים', pesach: 'פסח', lagBaomer: 'ל"ג בעומר', shavuot: 'שבועות' };
const MONTH: Record<string, string> = { tishrei: 'תשרי', cheshvan: 'חשוון', kislev: 'כסלו', tevet: 'טבת', shvat: 'שבט', adar: 'אדר', nisan: 'ניסן', iyyar: 'אייר', sivan: 'סיוון', tamuz: 'תמוז', av: 'אב', elul: 'אלול' };
const WEEKDAY = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function days(n: number): string {
  const a = Math.abs(n);
  if (a === 0) return 'באותו יום';
  if (a === 1) return 'יום';
  if (a === 2) return 'יומיים';
  if (a === 7) return 'שבוע';
  if (a === 14) return 'שבועיים';
  if (a === 30) return 'חודש';
  if (a === 90) return 'שלושה חודשים';
  return `${a} ימים`;
}
function anchor(a: CalendarAnchor): string {
  return 'holiday' in a ? HOLIDAY[a.holiday]! : `${a.day === 1 ? 'ראש חודש ' : `${a.day} ב`}${MONTH[a.month]}`;
}
export function timing(t: Timing): string {
  switch (t.kind) {
    case 'after': return t.days === 0 ? 'מיד' : `${days(t.days)} אחרי`;
    case 'customerDate': return t.days < 0 ? `${days(t.days)} לפני התאריך שלו` : t.days === 0 ? 'ביום שלו' : `${days(t.days)} אחרי התאריך שלו`;
    case 'calendar': return t.days === 0 ? anchor(t.anchor) : t.days < 0 ? `${days(t.days)} לפני ${anchor(t.anchor)}` : t.days === 1 ? `אחרי ${anchor(t.anchor)}` : `${days(t.days)} אחרי ${anchor(t.anchor)}`;
    case 'weekday': return `ביום ${WEEKDAY[t.weekday]}`;
  }
}
export function step(s: Step): string {
  const who = s.who === 'me' ? 'ממך' : 'אוטומטית';
  return `${ACT[s.action] ?? s.action} ${who}, ${timing(s.timing)}${s.message ? ` — "${s.message}"` : ''}`;
}
export function end(e: PathEnd): string {
  if (e.kind === 'list') return 'ואם לא ענה — רשימת תפוצה';
  if (e.kind === 'stop') return 'ואם לא ענה — המעקב נגמר';
  return `ואם לא ענה — ${ACT[e.action] ?? e.action} כל ${days(e.everyDays)}${e.times ? `, ${e.times} פעמים` : ''}`;
}
export function path(p: Path): string[] {
  return p.steps.length ? [...p.steps.map(step), end(p.end)] : [p.end.kind === 'list' ? 'רשימת תפוצה בלבד' : 'בלי מעקב'];
}
export function variantTitle(v: NeedPath['variants'][number]): string {
  if (!v.if) return 'בכל מקרה אחר';
  const c = v.if;
  if ('tapped' in c) return `כשסימנת "${c.tapped}"`;
  return 'במקרה מיוחד';
}
