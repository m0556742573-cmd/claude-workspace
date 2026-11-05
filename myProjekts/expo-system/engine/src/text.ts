// The text each message carries, and filling it for one visitor. Pure, so the app and the WhatsApp server's planner
// write exactly the same words. The approved texts (round 9, consultant-rounds/messages-approved.json) are passed in;
// the exhibitor's own edit (table message_templates) replaces them. Every other detail in square brackets ([כתובת],
// [שעות]) the exhibitor writes once, and it is filled into every message it appears in (יצחק, 29/10). Whatever is still
// left in square brackets is a hole: a message with a hole is not sent.
import type { Action, AgreedStep, LocalDate, Offer, Order, Path, Setup } from './model.ts';
import { addDays, weekday } from './calendar.ts';
import { fixtures } from '../fixtures/businesses.ts';

export interface Me {
  name: string; business: string; phone: string | null; greeting: 'shalom' | 'kavod'; sensitive: boolean;
  /** Details written once ([כתובת], [שעות], a link to the price list), filled into every message they appear in. */
  fills?: Record<string, string>;
}
/** What the system fills by itself; any other [detail] is the exhibitor's, written once. */
export const AUTO_FIELDS = ['שם', 'שם המציג', 'העסק', 'טלפון'];

/**
 * A detail written once may be a file instead of words (יצחק: every message may go with a file or without, 28/10):
 * its value is "file:<path in storage>#<the file's own name>". Its line comes out of the text, and the file goes with
 * the message: as a document on WhatsApp, attached to the mail, or as a link when it is sent by a tap.
 */
export interface FileRef { path: string; name: string }
export const asFile = (v: string | undefined): FileRef | null => {
  if (!v?.startsWith('file:')) return null;
  const [path, name] = v.slice(5).split('#');
  return path ? { path, name: name ? decodeURIComponent(name) : path.split('/').pop()! } : null;
};
export const fileValue = (f: FileRef) => `file:${f.path}#${encodeURIComponent(f.name)}`;
const DETAIL = /\[([^\]\n]+)\]/g;

/** The files a text carries: the details in it whose value is a file, in the order they appear. */
export function filesIn(body: string, me: Pick<Me, 'fills'>): FileRef[] {
  const out: FileRef[] = [];
  for (const [, key] of body.matchAll(DETAIL)) {
    const f = asFile(me.fills?.[key!]);
    if (f && !out.some((x) => x.path === f.path)) out.push(f);
  }
  return out;
}
export interface Approved { id: number; label: string; text: string }

const SIGN = '[שם המציג], [העסק] · [טלפון]';

/** The template a setup was started from: the one it names, or, for a setup saved before it named one, by its buttons. */
function fixtureOf(setup: Setup) {
  if (setup.template !== undefined) return fixtures.find((f) => f.id === setup.template);
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

/**
 * An exhibitor without WhatsApp sees no word of it anywhere (יצחק, 31/10): a suggested text that offers WhatsApp as
 * one way among others loses it, and one that offers only WhatsApp offers the mail.
 */
export function withoutWa(text: string): string {
  return text.replace(/\s*או בוואטסאפ[^,.\n]*/g, '').replaceAll('בוואטסאפ', 'במייל');
}

/** The suggested text: the approved one when there is one, otherwise a frame with the message's name as a hole. */
export function draftFor(setup: Setup, id: string, approved: Approved[], noWa = false): string {
  const f = fixtureOf(setup);
  const mine = f ? approved.filter((a) => a.id === f.id) : [];
  const hit = mine.find((a) => a.label === id) ?? mine.find((a) => id.startsWith(a.label));
  if (hit) return noWa ? withoutWa(hit.text) : hit.text;
  return `שלום [שם],\n[${id}]\n${SIGN}`;
}

const money = (n: number) => `${Math.round(n * 100) / 100} ₪`;
/** The summary a visitor gets of what he ordered at the booth (model §14א): the items, the expo prices, the total. */
export function orderSummary(order: Order): string {
  const lines = order.items.filter((i) => i.qty > 0).map((i) => `• ${i.qty} × ${i.name} · ${money(i.qty * i.price)}`);
  return [`שלום [שם],`, `תודה על ההזמנה בתערוכה${order.offer ? `, במבצע "${order.offer}"` : ''}:`, ...lines, `סה"כ: ${money(order.total)}`, SIGN].join('\n');
}

const dayMonth = (d: LocalDate) => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}`;
/**
 * The expo offer to a visitor who did not order at the booth (model §14א; my choice 1/11, not yet his): the items at
 * their expo price, until when, and how to order. The reminder goes the day before it ends.
 */
export function offerText(offer: Offer, reminder: boolean): string {
  const what = offer.name ? `המבצע "${offer.name}"` : 'המבצע';
  const lines = offer.items.map((i) => `• ${i.name} · ${money(i.expoPrice)}${i.price > i.expoPrice ? ` במקום ${money(i.price)}` : ''}`);
  const head = reminder ? `להזכיר, ${what} מהתערוכה בתוקף רק עד מחר:` : `${what} מהתערוכה בתוקף עד ${dayMonth(offer.until)}:`;
  return ['שלום [שם],', head, ...lines, 'להזמנה אפשר לענות להודעה הזו.', SIGN].join('\n');
}

/** A week after an order at the booth (my choice 1/11, not yet his): did it arrive, and is all well. */
export function orderCheckText(): string {
  return ['שלום [שם],', 'רציתי לוודא שההזמנה מהתערוכה הגיעה, ושהכל בסדר. אם משהו חסר או לא מסתדר, אפשר לענות כאן.', SIGN].join('\n');
}

// ---------- the visitor's confirmation of what was agreed at the booth (5/11, א1; my wording, a default he can see)

const WEEKDAY = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const PART: Record<NonNullable<AgreedStep['part']>, string> = { morning: 'בבוקר', noon: 'בצהריים', evening: 'בערב' };
/** What was agreed, as a noun, when the path has no words of its own for it. */
export const AGREED_NOUN: Record<Action, string> = { talk: 'שיחה', meet: 'פגישה', prepare: 'הכנה', send: 'שליחה', reserve: 'שריון', check: 'בדיקה', wait: 'המתנה' };
/** A day as the visitor reads it, from the day the message goes: היום, מחר, יום רביעי; a week or more ahead, with its date. */
export function dayWords(on: LocalDate, from: LocalDate): string {
  if (on === from) return 'היום';
  if (on === addDays(from, 1)) return 'מחר';
  const far = on > addDays(from, 6);
  return `יום ${WEEKDAY[weekday(on)]}${far ? `, ${Number(on.slice(8, 10))}/${Number(on.slice(5, 7))}` : ''}`;
}
/**
 * The confirmation line: "כמו שסיכמנו: מדידה בבית ביום רביעי בערב." A sensitive business says only when, never what;
 * "he gets back to me": that he waits to hear by then.
 */
export function agreedLine(a: AgreedStep, sensitive: boolean, from: LocalDate): string {
  const day = dayWords(a.on, from);
  const at = `${day === 'היום' || day === 'מחר' ? day : `ב${day}`}${a.part ? ` ${PART[a.part]}` : ''}`;
  if (a.who === 'him') return `כמו שסיכמנו, אחכה לשמוע ממך עד ${day}.`;
  if (sensitive) return `כמו שסיכמנו, נהיה בקשר ${at}.`;
  return `כמו שסיכמנו: ${a.label ?? AGREED_NOUN[a.action]} ${at}.`;
}
/** The line inside the first message of the visit day, right after its greeting: one message, never two. */
export function withAgreed(body: string, line: string): string {
  const [first, ...rest] = body.split('\n');
  return /^(שלום|בס"ד|לכבוד)/.test(first ?? '') ? [first, line, ...rest].join('\n') : [line, body].join('\n');
}
/** The confirmation on its own, when no message goes on the visit day. */
export function confirmText(line: string): string {
  return ['שלום [שם],', line, SIGN].join('\n');
}

/** The template id of the message beside "לא ענה" (יצחק, 5/11), in the outbox. */
export const TRIED = 'x:tried';
/**
 * What the exhibitor can send after a call he did not get through (my wording, 5/11, a suggestion of mine he accepted
 * with the rest): it leaves the visitor a way back. It does not say "reply here", since a reply is not always read.
 */
export function triedText(): string {
  return ['שלום [שם],', 'ניסיתי להשיג אותך. כשיהיה נוח, אשמח לדבר.', SIGN].join('\n');
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
  if (me.fills) {
    // A file's line comes out (it goes with the message); a line left with only a bullet goes too.
    t = t.split('\n').flatMap((line) => {
      if (!line.match(DETAIL)?.some((h) => asFile(me.fills![h.slice(1, -1)]))) return [line];
      const rest = line.replace(DETAIL, (h, key: string) => (asFile(me.fills![key]) ? '' : h)).trim();
      return /^[•\-–:\s]*$/.test(rest) ? [] : [rest];
    }).join('\n');
    t = t.replace(DETAIL, (hole, key: string) => me.fills![key]?.trim() || hole);
  }
  return t;
}

/** What is still in square brackets after filling. */
export const holes = (t: string) => [...new Set(t.match(/\[[^\]\n]+\]/g) ?? [])];

/** The details a text asks for, besides what the system fills by itself: each one is written once. */
export const detailsIn = (body: string) => holes(body).map((h) => h.slice(1, -1)).filter((k) => !AUTO_FIELDS.includes(k));

/** The exhibitor's own text for a message, or the suggested one. */
export const textOf = (setup: Setup, texts: Record<string, string> | null, id: string, approved: Approved[], noWa = false) =>
  texts?.[id] ?? draftFor(setup, id, approved, noWa);
