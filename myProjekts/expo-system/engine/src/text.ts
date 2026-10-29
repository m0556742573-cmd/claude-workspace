// The text each message carries, and filling it for one visitor. Pure, so the app and the WhatsApp server's planner
// write exactly the same words. The approved texts (round 9, consultant-rounds/messages-approved.json) are passed in;
// the exhibitor's own edit (table message_templates) replaces them. Every other detail in square brackets ([כתובת],
// [שעות]) the exhibitor writes once, and it is filled into every message it appears in (יצחק, 29/10). Whatever is still
// left in square brackets is a hole: a message with a hole is not sent.
import type { Path, Setup } from './model.ts';
import { fixtures } from '../fixtures/businesses.ts';

export interface Me {
  name: string; business: string; phone: string | null; greeting: 'shalom' | 'kavod'; sensitive: boolean;
  /** Details written once ([כתובת], [שעות], a link to the price list), filled into every message they appear in. */
  fills?: Record<string, string>;
}
/** What the system fills by itself; any other [detail] is the exhibitor's, written once. */
export const AUTO_FIELDS = ['שם', 'שם המציג', 'העסק', 'טלפון'];
export interface Approved { id: number; label: string; text: string }

const SIGN = '[שם המציג], [העסק] · [טלפון]';

/** The template a setup was started from, recognised by its buttons. */
function fixtureOf(setup: Setup) {
  const key = (s: Setup) => s.needs.map((n) => n.label).join('|');
  return fixtures.find((f) => key(f.setup) === key(setup));
}

/** Every message the setup sends, in path order, with the buttons it goes out after. */
export function messagesOf(setup: Setup): { id: string; after: string[] }[] {
  const out = new Map<string, Set<string>>();
  const add = (p: Path, after: string) => {
    for (const st of p.steps) if (st.message) (out.get(st.message) ?? out.set(st.message, new Set()).get(st.message)!).add(after);
    if (p.end.kind === 'repeat' && p.end.message) (out.get(p.end.message) ?? out.set(p.end.message, new Set()).get(p.end.message)!).add(after);
  };
  for (const n of setup.needs) for (const v of n.variants) add(v.path, n.label);
  add(setup.defaults.business, 'בעל עסק שלא סומן לו כלום');
  add(setup.defaults.private, 'מבקר שלא סומן לו כלום');
  return [...out].map(([id, after]) => ({ id, after: [...after] }));
}

/** The suggested text: the approved one when there is one, otherwise a frame with the message's name as a hole. */
export function draftFor(setup: Setup, id: string, approved: Approved[]): string {
  const f = fixtureOf(setup);
  const mine = f ? approved.filter((a) => a.id === f.id) : [];
  const hit = mine.find((a) => a.label === id) ?? mine.find((a) => id.startsWith(a.label));
  if (hit) return hit.text;
  return `שלום [שם],\n[${id}]\n${SIGN}`;
}

/** The text as the visitor gets it: his name, the exhibitor's signature and greeting. Holes stay as they are. */
export function fill(body: string, me: Me, visitor: string): string {
  let t = body;
  if (me.greeting === 'kavod') t = t.replace(/^שלום \[שם\],?/, 'בס"ד\nלכבוד ר\' [שם],');
  // A sensitive business signs with a name and a phone only.
  if (me.sensitive) t = t.replace(/\[שם המציג\], \[העסק\] · \[טלפון\]/g, '[שם המציג] · [טלפון]');
  t = t.replaceAll('[שם המציג]', me.name).replaceAll('[שם]', visitor);
  if (me.business) t = t.replaceAll('[העסק]', me.business);
  if (me.phone) t = t.replaceAll('[טלפון]', me.phone);
  if (me.fills) t = t.replace(/\[([^\]\n]+)\]/g, (hole, key: string) => me.fills![key]?.trim() || hole);
  return t;
}

/** What is still in square brackets after filling. */
export const holes = (t: string) => [...new Set(t.match(/\[[^\]\n]+\]/g) ?? [])];

/** The details a text asks for, besides what the system fills by itself: each one is written once. */
export const detailsIn = (body: string) => holes(body).map((h) => h.slice(1, -1)).filter((k) => !AUTO_FIELDS.includes(k));

/** The exhibitor's own text for a message, or the suggested one. */
export const textOf = (setup: Setup, texts: Record<string, string> | null, id: string, approved: Approved[]) => texts?.[id] ?? draftFor(setup, id, approved);
