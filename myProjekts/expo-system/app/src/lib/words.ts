// Dates and the engine's answer in the words the exhibitor reads: "שיחה ממך · יום ג׳ 18.11".
import { addDays, type Next } from '@expo/engine';

const DAYS = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת'];
export const ACT: Record<string, string> = { talk: 'שיחה', meet: 'פגישה', prepare: 'להכין', send: 'הודעה', reserve: 'שריון', check: 'בדיקה', wait: 'לחכות ללקוח' };
export const END: Record<string, string> = { list: 'ברשימת התפוצה', stop: 'המעקב נגמר', engaged: 'בטיפול שלך', closed: 'נסגרה עסקה', notRelevant: 'לא רלוונטי', optOut: 'ביקש להסיר' };

/** The day of the fair: until it ends the app opens on the booth, after it on the follow-up. */
export const EXPO_DAY = '2026-11-16';

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const inDays = (n: number) => addDays(today(), n);

export function dayLabel(d: string): string {
  if (d === today()) return 'היום';
  if (d === inDays(1)) return 'מחר';
  if (d === inDays(-1)) return 'אתמול';
  const [y, m, day] = d.split('-').map(Number);
  return `${DAYS[new Date(y!, m! - 1, day!).getDay()]} ${day}.${m}`;
}

export function describe(n: Next): string {
  if (n.kind === 'end') return END[n.reason] ?? n.reason;
  if (n.kind === 'askDate') return `לברר את התאריך שלו · ${dayLabel(n.dueOn)}`;
  const who = n.who === 'me' ? 'ממך' : 'אוטומטית';
  return `${ACT[n.action] ?? n.action} ${who} · ${dayLabel(n.dueOn)}${n.late ? ' (באיחור)' : ''}`;
}

export function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
