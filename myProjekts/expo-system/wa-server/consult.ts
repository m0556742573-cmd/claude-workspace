// The setup consultant (יצחק, 22/10 and 30/10): an interview that fills a fixed structure until the checklist of a
// polished setup passes (model §15), then a build that turns that structure into a setup the engine runs, made only
// of the building blocks it knows. The exhibitor reviews the result in the step-by-step setup and can change anything
// before it is saved. Claude is reached from this server, with the key kept here; the conversation is saved, so it can
// go on later.
import Anthropic from '@anthropic-ai/sdk';
import type { Action, Condition, Holiday, HebrewMonth, NeedPath, Path, PathEnd, Setup, Step, Timing, Who } from '../engine/src/index.ts';
import { GREETING, RULES } from './consult-rules.ts';

export { GREETING };
const MODEL = 'claude-opus-5-5';

// ---------- the structure the interview fills (the lab's), and its checklist

export interface Draft {
  business: string; anchor: { goal: string; success: string }; goals: { primary: string; secondary: string[] }; capacity: string;
  need: { label: string; goal: string; relation: string; pattern: string; steps: string[]; variants: { for: string; steps: string[] }[] }[];
  when: { label: string; effect: string }[]; who: { label: string; effect: string }[];
  defaults: { business: string; private: string }; seasons: string[];
  offers: { name: string; items: string; until: string }[]; messages: { name: string; purpose: string }[]; open: string[];
}
export const EMPTY: Draft = { business: '', anchor: { goal: '', success: '' }, goals: { primary: '', secondary: [] }, capacity: '', need: [], when: [], who: [], defaults: { business: '', private: '' }, seasons: [], offers: [], messages: [], open: [] };

/** "הקמה מלוטשת" (model §15), item by item. */
export function checks(s: Draft): [string, boolean][] {
  const labels = [...s.need, ...s.when, ...s.who].map((x) => x.label.trim()).filter(Boolean);
  const dup = labels.some((l, i) => labels.indexOf(l) !== i);
  const sends = s.need.some((n) => [...n.steps, ...n.variants.flatMap((v) => v.steps)].some((t) => /לשלוח|מחירון|קטלוג|מיד/.test(t)));
  return [
    ['נשמר עוגן: המטרה בתערוכה ומה תיחשב הצלחה', !!(s.anchor.goal && s.anchor.success)],
    ['נקבעה מטרה ראשית', !!s.goals.primary],
    ['למטרה הראשית יש כפתור צורך עם מסלול', s.need.some((n) => /ראשית/.test(n.goal) && n.steps.length > 0)],
    ["כל כפתור 'מתי' ו'מי הוא' משנה משהו", [...s.when, ...s.who].every((x) => x.effect.trim().length > 0)],
    ['אין שאלה עם כפתור אחד בלבד', [s.need, s.when, s.who].every((a) => a.length !== 1)],
    ['לכל כפתור צורך יש מסלול', s.need.every((n) => n.steps.length > 0)],
    ['לכל צורך נקבע סוג קשר', s.need.every((n) => /לקוח|שותף|מפיץ/.test(n.relation))],
    ['הכרטיס נבנה (שאלה אחת לפחות, או "רק השם" בכוונה)', labels.length > 0 || /רק השם/.test(s.open.join(' ') + ' ' + s.business)],
    ['אין עובדה שמופיעה בשתי שאלות', labels.length > 0 && !dup],
    ['נקבעה קיבולת למעקב', !!s.capacity],
    ['ברירת מחדל לבעל עסק ולפרטי', !!(s.defaults.business && s.defaults.private)],
    ['יש הודעות לכל שליחה', !sends || s.messages.length > 0],
  ];
}

const str = (v: unknown, n = 300) => (typeof v === 'string' ? v.slice(0, n) : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
/** What Claude returned, held to the structure and its limits; anything else is dropped. */
export function cleanDraft(x: unknown, prev: Draft): Draft {
  if (!x || typeof x !== 'object') return prev;
  const o = obj(x), a = obj(o.anchor), g = obj(o.goals), d = obj(o.defaults);
  return {
    business: str(o.business), anchor: { goal: str(a.goal), success: str(a.success) },
    goals: { primary: str(g.primary), secondary: arr(g.secondary).map((v) => str(v)).filter(Boolean) },
    capacity: str(o.capacity),
    need: arr(o.need).slice(0, 10).map((n) => { const m = obj(n); return { label: str(m.label), goal: str(m.goal), relation: str(m.relation), pattern: str(m.pattern),
      steps: arr(m.steps).map((v) => str(v)).filter(Boolean).slice(0, 10),
      variants: arr(m.variants).slice(0, 4).map((v) => { const w = obj(v); return { for: str(w.for), steps: arr(w.steps).map((s) => str(s)).filter(Boolean).slice(0, 10) }; }) }; }).filter((n) => n.label),
    when: arr(o.when).slice(0, 10).map((n) => ({ label: str(obj(n).label), effect: str(obj(n).effect) })).filter((n) => n.label),
    who: arr(o.who).slice(0, 10).map((n) => ({ label: str(obj(n).label), effect: str(obj(n).effect) })).filter((n) => n.label),
    defaults: { business: str(d.business), private: str(d.private) },
    seasons: arr(o.seasons).map((v) => str(v)).filter(Boolean).slice(0, 10),
    offers: arr(o.offers).slice(0, 5).map((v) => { const w = obj(v); return { name: str(w.name), items: str(w.items), until: str(w.until) }; }).filter((w) => w.name || w.items),
    messages: arr(o.messages).slice(0, 10).map((v) => { const w = obj(v); return { name: str(w.name), purpose: str(w.purpose) }; }).filter((w) => w.name),
    open: arr(o.open).map((v) => str(v)).filter(Boolean).slice(0, 10),
  };
}

/** A reply that is not clean JSON is read leniently: the object inside it, then without trailing commas; plain text is
 *  still his message. */
function lenient(raw: string): Record<string, unknown> | null {
  const a = raw.indexOf('{'), z = raw.lastIndexOf('}');
  if (a >= 0 && z > a) {
    const body = raw.slice(a, z + 1);
    for (const s of [body, body.replace(/,\s*([}\]])/g, '$1')]) { try { return JSON.parse(s); } catch { /* next */ } }
  }
  return raw.trim() && a < 0 ? { reply: raw.trim() } : null;
}

// ---------- the conversation

export interface Turn { role: 'assistant' | 'user'; text: string; quick?: string[] }
export interface Usage { input: number; output: number; cacheRead: number }

function client(key: string) { return new Anthropic({ apiKey: key, maxRetries: 2, timeout: 180_000 }); }
/** A request, with the server-side fallback: if the model declines on a safety ground, Anthropic runs it again on the
 *  model it picks, inside the same call. Should that be refused as a parameter, the request goes once without it. */
async function ask(key: string, params: Record<string, unknown>): Promise<Anthropic.Message> {
  const c = client(key);
  try {
    return await (c.beta.messages.create as unknown as (p: unknown) => Promise<Anthropic.Message>)({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError && /fallback/i.test(String(e.message))) return c.messages.create(params as unknown as Anthropic.MessageCreateParamsNonStreaming);
    throw e;
  }
}
const textOf = (m: { content: { type: string; text?: string }[] }) => m.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
const usageOf = (m: { usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null } }): Usage =>
  ({ input: m.usage.input_tokens, output: m.usage.output_tokens, cacheRead: m.usage.cache_read_input_tokens ?? 0 });

/** One turn: the rules (kept in Anthropic's cache), the conversation so far, and, beside his last words, the structure as
 *  it stands and what the checklist still misses. Returns his next message, quick replies, and the updated structure. */
export async function converse(key: string, turns: Turn[], draft: Draft): Promise<{ reply: string; quick: string[]; draft: Draft; usage: Usage }> {
  const gaps = checks(draft).filter(([, ok]) => !ok).map(([t]) => '- ' + t);
  const state = `CURRENT SETUP:\n${JSON.stringify(draft)}\n\nCHECKLIST ITEMS STILL FAILING:\n${gaps.join('\n') || '(none — the setup passes; summarize once, then help with changes)'}`;
  const msgs: Anthropic.MessageParam[] = turns.slice(-30).map((t) => ({ role: t.role, content: t.text }));
  while (msgs.length && msgs[0]!.role === 'assistant') msgs.shift();
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== 'user') throw new Error('no question');
  last.content = [{ type: 'text', text: String(last.content) }, { type: 'text', text: state }];
  const m = await ask(key, {
    model: MODEL, max_tokens: 8000,
    output_config: { effort: 'medium' },
    system: [{ type: 'text', text: RULES, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `(The exhibitor opened the setup. Your greeting was:)\n${GREETING}` }, { role: 'assistant', content: GREETING }, ...msgs],
  });
  if (m.stop_reason === 'refusal') throw new Error('refusal');
  const r = lenient(textOf(m));
  const reply = r && typeof r.reply === 'string' ? r.reply.trim() : '';
  if (!reply) throw new Error('no reply');
  return { reply, quick: arr(r!.quick).map((v) => str(v, 80)).filter(Boolean).slice(0, 4), draft: r!.setup ? cleanDraft(r!.setup, draft) : draft, usage: usageOf(m) };
}

// ---------- the build: from the structure to a setup the engine runs

const ACTIONS: Action[] = ['talk', 'meet', 'prepare', 'send', 'reserve', 'check', 'wait'];
const HOLIDAYS: Holiday[] = ['roshHashana', 'sukkot', 'chanukah', 'purim', 'pesach', 'lagBaomer', 'shavuot'];
const MONTHS: HebrewMonth[] = ['tishrei', 'cheshvan', 'kislev', 'tevet', 'shvat', 'adar', 'nisan', 'iyyar', 'sivan', 'tamuz', 'av', 'elul'];
// No nullable fields (the API allows only a few): an unused field has a fixed empty value — 0, "", "none", or an empty list.
const COND = { type: 'object', additionalProperties: false, required: ['tapped', 'mode', 'negate'],
  properties: { tapped: { type: 'array', items: { type: 'string' } }, mode: { type: 'string', enum: ['any', 'all'] }, negate: { type: 'boolean' } } };
const STEP = { type: 'object', additionalProperties: false, required: ['id', 'action', 'who', 'timing', 'message', 'onlyIf'],
  properties: {
    id: { type: 'string' }, action: { type: 'string', enum: ACTIONS }, who: { type: 'string', enum: ['me', 'auto'] },
    timing: { type: 'object', additionalProperties: false, required: ['kind', 'days', 'holiday', 'month', 'day', 'weekday'],
      properties: { kind: { type: 'string', enum: ['after', 'customerDate', 'calendar', 'weekday'] }, days: { type: 'integer' },
        holiday: { type: 'string', enum: [...HOLIDAYS, 'none'] }, month: { type: 'string', enum: [...MONTHS, 'none'] }, day: { type: 'integer' }, weekday: { type: 'integer' } } },
    message: { type: 'string' }, onlyIf: COND,
  } };
const PATH = { type: 'object', additionalProperties: false, required: ['steps', 'end'],
  properties: { steps: { type: 'array', items: STEP },
    end: { type: 'object', additionalProperties: false, required: ['kind', 'everyDays', 'times', 'action', 'who', 'message'],
      properties: { kind: { type: 'string', enum: ['list', 'stop', 'repeat'] }, everyDays: { type: 'integer' }, times: { type: 'integer' },
        action: { type: 'string', enum: ACTIONS }, who: { type: 'string', enum: ['me', 'auto'] }, message: { type: 'string' } } } } };
const BUTTON = { type: 'object', additionalProperties: false, required: ['label', 'effect'], properties: { label: { type: 'string' }, effect: { type: 'string' } } };
const SCHEMA = { type: 'object', additionalProperties: false,
  required: ['business', 'anchor', 'sensitive', 'capacity', 'needs', 'when', 'who', 'defaults', 'messages'],
  properties: {
    business: { type: 'string' },
    anchor: { type: 'object', additionalProperties: false, required: ['goal', 'success'], properties: { goal: { type: 'string' }, success: { type: 'string' } } },
    sensitive: { type: 'boolean' }, capacity: { type: 'integer' },
    needs: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['label', 'goal', 'relation', 'variants'],
      properties: { label: { type: 'string' }, goal: { type: 'string', enum: ['primary', 'secondary'] }, relation: { type: 'string', enum: ['customer', 'partner', 'distributor'] },
        variants: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['if', 'path'], properties: { if: COND, path: PATH } } } } } },
    when: { type: 'array', items: BUTTON }, who: { type: 'array', items: BUTTON },
    defaults: { type: 'object', additionalProperties: false, required: ['business', 'private'], properties: { business: PATH, private: PATH } },
    messages: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'text'], properties: { id: { type: 'string' }, text: { type: 'string' } } } },
  } };

const BUILD = `You turn an exhibitor's agreed setup (a structure in Hebrew words, from his conversation with the setup consultant) into the exact setup the system runs. Use ONLY these building blocks; never add a button, step, message, product or promise that is not in what he agreed.

- needs: one per "מה הוא צריך" button, same label. goal: primary for the one marked ראשית, else secondary. relation: לקוח→customer, שותף→partner, מפיץ→distributor.
  variants: the path for the usual case LAST with if=null; a variant "for" a profile or a tap comes before it with if={tapped:[labels of card buttons], mode:"any"|"all", negate:false}; the usual case has if={tapped:[], mode:"any", negate:false}. Labels in conditions must be exact labels of this card.
- A path is a chain of steps. action: talk (a call or a talk), meet (meeting, visit, measuring, tasting, demo), prepare (a quote, a drawing, a sample, a menu), send (a message; who=auto when the system sends it, who=me when he sends something physical), reserve (hold a date), check (check in again), wait (wait for the customer). who: me = the exhibitor himself, auto = the system on its own (only for messages it sends).
- timing: after = days after the previous step (the first step: days after the expo, 16/11; 0 = the same day); customerDate = days relative to the visitor's own date (negative = before); calendar = relative to a point of the Jewish year, holiday or month+day, days negative before; weekday = the next given weekday after the previous step (0 Sunday … 6 Saturday). Unused timing fields: days 0, holiday "none", month "none", day 0, weekday 0.
- A step that only some visitors get (it costs time or money) has onlyIf with the buttons that qualify them; every other step has onlyIf={tapped:[], mode:"any", negate:false}. A step that sends no message has message "".
- end: list (to the mailing list), stop, or repeat (a long-term check: everyDays, times, action, who, message). For list and stop: everyDays 0, times 0, action "check", who "me", message "".
- Every step that sends a message names it in "message", by a short Hebrew id (e.g. "תודה שביקרת", "מחירון"), and that id appears once in "messages" with its text.
- Message texts, in his voice: start "שלום [שם]," and end with "[שם המציג], [העסק] · [טלפון]" (a sensitive business: "[שם המציג] · [טלפון]", never the business name). Every price, date, address, hour or promise he did not give stays a placeholder in square brackets ([מחיר], [כתובת], [שעות], [מחירון]). Short, warm, the register of the Haredi business community; follow the writing rules he agreed (no loaded words on a shared home phone, a repeated message different each time).
- defaults: the path for a business owner nothing was tapped for, and for a private visitor (often just end=list with no steps).
- capacity: minutes a day for follow-up (half an hour = 30). sensitive: true for a business where being seen as its customer is sensitive (a matchmaker, therapy, learning difficulties).
- step ids: short, unique within the setup (latin letters and digits).`;

/** The structure, built into a setup and its message texts. The shape is given as a JSON Schema in the instructions (as a
 *  strict output format it is too large for the API), and checked here: a result the engine cannot run is sent back once
 *  with what is wrong in it. */
export async function build(key: string, draft: Draft, turns: Turn[]): Promise<{ setup: Setup; texts: Record<string, string>; usage: Usage }> {
  const said = turns.filter((t) => t.role === 'user').map((t) => '- ' + t.text).join('\n').slice(-6000);
  const attempt = async (extra: string) => {
    const m = await ask(key, {
      model: MODEL, max_tokens: 32000,
      output_config: { effort: 'medium' },
      system: `${BUILD}

REPLY with ONLY one JSON object, no Markdown and no text around it, in exactly this shape (JSON Schema):
${JSON.stringify(SCHEMA)}`,
      messages: [{ role: 'user', content: `THE AGREED SETUP:\n${JSON.stringify(draft)}\n\nWHAT HE SAID IN THE CONVERSATION (his words, for the details):\n${said}${extra}` }],
    });
    if (m.stop_reason === 'refusal') throw new Error('refusal');
    const raw = lenient(textOf(m));
    if (!raw || !('needs' in raw)) throw new Error('build: no setup in the reply');
    return { raw, usage: usageOf(m) };
  };
  let { raw, usage } = await attempt('');
  let made = toSetup(raw);
  if (made.problems.length) {
    const again = await attempt(`\n\nYOUR PREVIOUS RESULT HAD THESE PROBLEMS; fix them:\n${made.problems.map((p) => '- ' + p).join('\n')}`);
    usage = { input: usage.input + again.usage.input, output: usage.output + again.usage.output, cacheRead: usage.cacheRead + again.usage.cacheRead };
    made = toSetup(again.raw);
  }
  return { setup: made.setup, texts: made.texts, usage };
}

type Raw = Record<string, unknown>;
/** The schema's flat shapes into the engine's, with what would not run listed. */
export function toSetup(r: Raw): { setup: Setup; texts: Record<string, string>; problems: string[] } {
  const problems: string[] = [];
  const texts: Record<string, string> = {};
  for (const m of arr(r.messages)) { const o = obj(m); const id = str(o.id, 60).trim(); if (id) texts[id] = str(o.text, 2000); }
  const when = arr(r.when).map((b) => ({ label: str(obj(b).label, 60).trim(), effect: str(obj(b).effect, 200) })).filter((b) => b.label);
  const who = arr(r.who).map((b) => ({ label: str(obj(b).label, 60).trim(), effect: str(obj(b).effect, 200) })).filter((b) => b.label);
  const needLabels = arr(r.needs).map((n) => str(obj(n).label, 60).trim());
  const labels = new Set([...needLabels, ...when.map((b) => b.label), ...who.map((b) => b.label)]);
  const ids = new Set<string>();
  const cond = (c: unknown): Condition | undefined => {
    if (!c) return undefined;
    const o = obj(c);
    const tapped = arr(o.tapped).map((t) => str(t, 60)).filter(Boolean);
    for (const t of tapped) if (!labels.has(t)) problems.push(`a condition names "${t}", which is not a button of the card`);
    if (!tapped.length) return undefined;
    const parts: Condition[] = tapped.map((t) => ({ tapped: t }));
    const c1: Condition = parts.length === 1 ? parts[0]! : o.mode === 'all' ? { all: parts } : { any: parts };
    return o.negate === true ? { not: c1 } : c1;
  };
  const timing = (t: unknown): Timing => {
    const o = obj(t);
    const days = Number.isInteger(o.days) ? Math.max(-730, Math.min(730, o.days as number)) : 0;
    if (o.kind === 'customerDate') return { kind: 'customerDate', days };
    if (o.kind === 'weekday') return { kind: 'weekday', weekday: Number.isInteger(o.weekday) ? Math.max(0, Math.min(6, o.weekday as number)) : 0 };
    if (o.kind === 'calendar') {
      if (HOLIDAYS.includes(o.holiday as Holiday)) return { kind: 'calendar', anchor: { holiday: o.holiday as Holiday }, days };
      if (MONTHS.includes(o.month as HebrewMonth)) return { kind: 'calendar', anchor: { month: o.month as HebrewMonth, day: Number.isInteger(o.day) ? Math.max(1, Math.min(30, o.day as number)) : 1 }, days };
      problems.push('a calendar step names neither a holiday nor a month');
      return { kind: 'after', days: 0 };
    }
    return { kind: 'after', days: Math.max(0, days) };
  };
  const message = (m: unknown) => {
    const id = str(m, 60).trim();
    if (!id) return undefined;
    if (!(id in texts)) problems.push(`the message "${id}" has no text`);
    return id;
  };
  const path = (p: unknown): Path => {
    const o = obj(p);
    const steps: Step[] = arr(o.steps).slice(0, 12).map((s) => {
      const x = obj(s);
      let id = str(x.id, 40).replace(/[^A-Za-z0-9_-]/g, '') || 's';
      while (ids.has(id)) id += '_';
      ids.add(id);
      const action = (ACTIONS.includes(x.action as Action) ? x.action : 'talk') as Action;
      const step: Step = { id, action, who: (x.who === 'auto' ? 'auto' : 'me') as Who, timing: timing(x.timing) };
      const msg = message(x.message); if (msg) step.message = msg;
      const only = cond(x.onlyIf); if (only) step.onlyIf = only;
      if (step.who === 'auto' && step.action !== 'send') problems.push(`step ${id}: only a message is sent by the system on its own`);
      return step;
    });
    const e = obj(o.end);
    const end: PathEnd = e.kind === 'stop' ? { kind: 'stop' }
      : e.kind === 'repeat' ? { kind: 'repeat', everyDays: Number.isInteger(e.everyDays) && (e.everyDays as number) > 0 ? Math.max(7, e.everyDays as number) : 90, ...(Number.isInteger(e.times) && (e.times as number) > 0 ? { times: e.times as number } : {}),
          action: (ACTIONS.includes(e.action as Action) ? e.action : 'check') as Action, who: (e.who === 'auto' ? 'auto' : 'me') as Who, ...(message(e.message) ? { message: message(e.message)! } : {}) }
      : { kind: 'list' };
    return { steps, end };
  };
  const needs: NeedPath[] = arr(r.needs).map((n) => {
    const o = obj(n);
    const variants = arr(o.variants).slice(0, 6).map((v) => { const w = obj(v); const c = cond(w.if); return { ...(c ? { if: c } : {}), path: path(w.path) }; });
    const label = str(o.label, 60).trim();
    if (!variants.length) problems.push(`"${label}" has no path`);
    if (variants.length && variants[variants.length - 1]!.if) variants.push({ path: { steps: [], end: { kind: 'list' } } });
    return { label, goal: (o.goal === 'primary' ? 'primary' : 'secondary') as NeedPath['goal'], relation: (['customer', 'partner', 'distributor'].includes(o.relation as string) ? o.relation : 'customer') as NeedPath['relation'], variants };
  }).filter((n) => n.label);
  if (needs.length && !needs.some((n) => n.goal === 'primary')) { problems.push('no need is primary'); needs[0]!.goal = 'primary'; }
  if (needs.filter((n) => n.goal === 'primary').length > 1) { problems.push('more than one need is primary'); needs.forEach((n, i) => { if (i > 0) n.goal = 'secondary'; }); }
  const all = [...needs.map((n) => n.label), ...when.map((b) => b.label), ...who.map((b) => b.label)];
  if (all.some((l, i) => all.indexOf(l) !== i)) problems.push('a label appears twice on the card');
  const a = obj(r.anchor), d = obj(r.defaults);
  const setup: Setup = {
    business: str(r.business, 120), anchor: { goal: str(a.goal), success: str(a.success) }, needs, when, who,
    defaults: { business: path(d.business), private: path(d.private) },
    sensitive: r.sensitive === true, capacity: Number.isInteger(r.capacity) ? Math.max(0, Math.min(600, r.capacity as number)) : 30,
  };
  return { setup, texts, problems };
}
