// The engine: given an exhibitor's setup and one lead, which path applies and what the next task is.
// It is pure, so the same code runs on the phone (offline) and on the server (the morning list, the sender).
import { addDays, isRestDay, nextOccurrence, weekday } from './calendar.ts';
import { AGREED, BOOTH_STEP, CONFIRM, isExtra, manualId, replyId } from './model.ts';
import type { Action, AgreedStep, Condition, Lead, LocalDate, NeedPath, Path, PathEnd, Setup, Step, Timing, Who } from './model.ts';

/** What the path would do next if he had not answered — the likely next step to offer after a talk. */
export function pathAhead(setup: Setup, lead: Lead): Step | undefined {
  const { path } = choosePath(setup, lead);
  const recorded = new Set(lead.history.map((h) => h.stepId));
  return path.steps.filter((s) => matches(s.onlyIf, lead.taps)).find((s) => !recorded.has(s.id));
}

/** The lead as the path sees it: without the messages sent beside it (EXTRA), which move none of its dates. */
const onPath = (lead: Lead): Lead => (lead.history.some((h) => isExtra(h.stepId)) ? { ...lead, history: lead.history.filter((h) => !isExtra(h.stepId)) } : lead);

export function matches(c: Condition | undefined, taps: string[]): boolean {
  if (!c) return true;
  if ('tapped' in c) return taps.includes(c.tapped);
  if ('all' in c) return c.all.every((x) => matches(x, taps));
  if ('any' in c) return c.any.some((x) => matches(x, taps));
  return !matches(c.not, taps);
}

export interface ChosenPath {
  /** The need button the path belongs to, or 'default' for a visitor nothing was tapped for. */
  source: string;
  path: Path;
}

/**
 * One path per lead: one touch per person. When several needs were tapped, the primary goal's need leads,
 * then the card's order. (Which button leads when several are tapped is still open — the old #7.)
 */
export function choosePath(setup: Setup, lead: Lead): ChosenPath {
  const tapped = setup.needs.filter((n) => lead.taps.includes(n.label));
  const ordered = [...tapped.filter((n) => n.goal === 'primary'), ...tapped.filter((n) => n.goal !== 'primary')];
  for (const need of ordered) {
    const v = pickVariant(need, lead.taps);
    if (v) return { source: need.label, path: v };
  }
  return { source: 'default', path: lead.businessOwner ? setup.defaults.business : setup.defaults.private };
}

function pickVariant(need: NeedPath, taps: string[]): Path | undefined {
  return need.variants.find((v) => matches(v.if, taps))?.path;
}

/** The booth card's consent button in a sensitive business: "send me updates". */
export const CONSENT = 'מסכים לקבל עדכונים';

export type Next =
  | { kind: 'task'; stepId: string; action: Action; who: Who; message?: string; dueOn: LocalDate; late: boolean; reply?: boolean;
      /** When it was due, for a late one (its dueOn moves to today): how late it is (30/10). */ wasDue?: LocalDate;
      /** A message of the path that cannot reach him, turned into a call of his: tell him what it says (5/11, ב4). */ byHand?: boolean;
      /** What was agreed at the booth (5/11, א1): his promise, first in his day; label and part of the day go with it. */ agreed?: boolean; label?: string; part?: AgreedStep['part'];
      /** This message carries the visitor's confirmation of what was agreed (5/11, א1): one message, never two. */ confirm?: boolean }
  /** A step needs the visitor's date and he gave none: the exhibitor is asked to find out when. */
  | { kind: 'askDate'; stepId: string; dueOn: LocalDate }
  /** decide: "לא ענה" on a call of his, and he has not chosen yet what now (5/11). */
  | { kind: 'end'; reason: 'engaged' | 'closed' | 'notRelevant' | 'optOut' | 'list' | 'stop' | 'decide' };

/** "לא ענה › להמשיך במסלול" is recorded under this id: the path goes on from the day he chose it. */
export const goOnId = (stepId: string) => `go:${stepId}`;

/** The action of the step recorded under this id: of the path, of its repeat, or set by hand. */
function actionOf(setup: Setup, lead: Lead, stepId: string): Action | undefined {
  if (stepId.startsWith('m:')) return (lead.manual ?? []).find((x) => manualId(x.id) === stepId)?.action;
  const { path } = choosePath(setup, lead);
  if (stepId.startsWith('repeat:')) return path.end.kind === 'repeat' ? path.end.action : undefined;
  return path.steps.find((x) => x.id === stepId)?.action;
}
/** "missed" (5/11) is what the exhibitor marks when he did not get through; until he chooses what now, he decides.
 *  (The server marks a message it sent as "noAnswer", which only means done: the two never mix.) */
const undecidedOn = (last: { outcome: string }) => last.outcome === 'missed';

/**
 * The step he did not get through on and has not decided about (5/11), with what a try again would be: a call, or for
 * waiting, waiting again. Null when there is none. The screens use it to offer the choice.
 */
export function undecided(setup: Setup, all: Lead): { stepId: string; retry: Action } | null {
  const lead = onPath(all);
  const last = lead.history[lead.history.length - 1];
  if (!last || !undecidedOn(last)) return null;
  const recorded = new Set(lead.history.map((h) => h.stepId));
  if ((lead.manual ?? []).some((m) => !recorded.has(manualId(m.id)))) return null;
  return { stepId: last.stepId, retry: actionOf(setup, lead, last.stepId) === 'wait' ? 'wait' : 'talk' };
}

/** The next thing to do for this lead, or why there is nothing. `today` is when the question is asked. */
export function nextTask(setup: Setup, all: Lead, today: LocalDate): Next {
  const lead = onPath(all);
  const last = lead.history[lead.history.length - 1];
  // A deal, "not relevant" or "remove me" ends everything, manual steps included.
  if (last && (last.outcome === 'closed' || last.outcome === 'notRelevant' || last.outcome === 'optOut')) return { kind: 'end', reason: last.outcome };
  // "סגרנו כאן" at the booth (5/11, א1): a deal.
  if (lead.agreed && 'deal' in lead.agreed) return { kind: 'end', reason: 'closed' };
  const agreed = lead.agreed && !('deal' in lead.agreed) ? lead.agreed : undefined;

  const recorded = new Set(lead.history.map((h) => h.stepId));
  // He wrote back (model §9): the path stops and the exhibitor answers him first, before anything else.
  // Answering is recorded under reply:<day>, so a later reply opens a new task.
  if (lead.repliedOn && !recorded.has(replyId(lead.repliedOn))) {
    const late = lead.repliedOn < today;
    return { kind: 'task', stepId: replyId(lead.repliedOn), action: 'talk', who: 'me', dueOn: settle(late ? today : lead.repliedOn, 'talk', 'me'), late, reply: true, ...(late ? { wasDue: lead.repliedOn } : {}) };
  }
  // He gave up on him after "לא ענה" (יצחק, 5/11): no more tasks and no more of the path's sends. A mailing list the path
  // ends on keeps him, as it would have at its end anyway. A reply that comes after it still comes first (above).
  if (last && last.outcome === 'gaveUp') return { kind: 'end', reason: endsOnList(setup, lead, choosePath(setup, lead).path.end) ? 'list' : 'stop' };
  // The message he chose at the booth goes out on the day of the visit, before anything else of the path.
  const confirm = !!agreed && confirmDue(setup, lead, recorded);
  if (lead.booth?.message && !recorded.has(BOOTH_STEP)) {
    const late = lead.capturedOn < today;
    return byHand(lead, { kind: 'task', stepId: BOOTH_STEP, action: 'send', who: 'auto', message: lead.booth.message, dueOn: settle(late ? today : lead.capturedOn, 'send', 'auto'), late, ...(late ? { wasDue: lead.capturedOn } : {}), ...(confirm ? { confirm } : {}) });
  }
  if (agreed && !recorded.has(AGREED)) {
    // The path's own message of the visit day still goes first, and carries the confirmation (one message, not two).
    const { path } = choosePath(setup, lead);
    const first = lead.booth ? undefined : path.steps.filter((x) => matches(x.onlyIf, lead.taps)).find((x) => immediate(x) && !recorded.has(x.id) && !agreed.replaces.includes(x.id));
    if (first) {
      const n = schedule(first, lead.capturedOn, lead, today);
      return n.kind === 'task' && confirm ? { ...n, confirm } : n;
    }
    // No message goes that day: the confirmation goes on its own.
    if (confirm) {
      const late = lead.capturedOn < today;
      return { kind: 'task', stepId: CONFIRM, action: 'send', who: 'auto', dueOn: late ? today : lead.capturedOn, late, confirm, ...(late ? { wasDue: lead.capturedOn } : {}) };
    }
    return agreedTask(agreed, today);
  }
  // A step he set by hand comes next: it is what was agreed with the visitor.
  const manual = (lead.manual ?? []).filter((m) => !recorded.has(manualId(m.id))).sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const m = manual[0];
  if (m) {
    const late = m.dueOn < today;
    return { kind: 'task', stepId: manualId(m.id), action: m.action, who: m.who, message: m.message, dueOn: settle(late ? today : m.dueOn, m.action, m.who), late, ...(late ? { wasDue: m.dueOn } : {}) };
  }
  // He called (met, waited) and did not get through, and has not decided yet what now (יצחק, 5/11): no default, so the
  // visitor waits for his decision, seen in the dashboard; nothing is planned for him meanwhile.
  if (last && undecidedOn(last)) return { kind: 'end', reason: 'decide' };
  // He answered and nothing was set by hand: the path's ladder of attempts is over; he is in the exhibitor's hands.
  if (last && last.outcome === 'engaged') return { kind: 'end', reason: 'engaged' };

  const { path } = choosePath(setup, lead);
  // A choice at the booth (a message, or none now) takes the place of the path's own immediate messages.
  const steps = withoutImmediate(path.steps.filter((s) => matches(s.onlyIf, lead.taps)), !!lead.booth).filter((s) => !agreed?.replaces.includes(s.id));
  const done = new Set(lead.history.map((h) => h.stepId));
  const base = last ? last.doneOn : lead.capturedOn;

  const step = steps.find((s) => !done.has(s.id));
  if (step) return schedule(step, base, lead, today);

  const end = path.end;
  if (end.kind === 'list') return { kind: 'end', reason: endsOnList(setup, lead, end) ? 'list' : 'stop' };
  if (end.kind !== 'repeat') return { kind: 'end', reason: end.kind };
  const repeats = lead.history.filter((h) => h.stepId.startsWith('repeat:')).length;
  if (end.times !== undefined && repeats >= end.times) return { kind: 'end', reason: 'stop' };
  const id = `repeat:${repeats + 1}`;
  return schedule({ id, action: end.action, who: end.who, message: end.message, timing: { kind: 'after', days: end.everyDays } }, base, lead, today);
}

/**
 * The agreed step as his task (5/11, א1). On the day agreed, a Friday too (the visitor was told so); never on Shabbat or
 * Yom Tov, which the booth does not offer. "He gets back to me by …": the day after, a check whether he did.
 */
function agreedTask(a: AgreedStep, today: LocalDate): Next {
  let on = a.who === 'him' ? addDays(a.on, 1) : a.on;
  while (isRestDay(on)) on = addDays(on, 1);
  const late = on < today;
  const action: Action = a.who === 'him' ? 'wait' : a.action;
  return { kind: 'task', stepId: AGREED, action, who: 'me', dueOn: late ? today : on, late, agreed: true, ...(a.label ? { label: a.label } : {}), ...(a.part ? { part: a.part } : {}), ...(late ? { wasDue: on } : {}) };
}

/**
 * Whether the visitor still gets a confirmation of what was agreed (5/11, א1): a business that sends nothing sends none of
 * it; nor to a visitor no message reaches (he was standing in front of the exhibitor); and only once, by itself or inside
 * the first message of the visit day.
 */
function confirmDue(setup: Setup, lead: Lead, recorded: Set<string>): boolean {
  if (lead.reach === false || recorded.has(CONFIRM) || recorded.has(BOOTH_STEP)) return false;
  const paths = [...setup.needs.flatMap((n) => n.variants.map((v) => v.path)), setup.defaults.business, setup.defaults.private];
  if (!paths.some((p) => p.steps.some((x) => x.message) || (p.end.kind === 'repeat' && p.end.message))) return false;
  const { path } = choosePath(setup, lead);
  return !path.steps.some((x) => immediate(x) && recorded.has(x.id));
}

/**
 * What a tap on a day at the booth takes the place of (5/11, א1): the path's step of his own of the same kind, and the
 * steps before it, except a message of the visit day (it goes, with the confirmation). Nothing when the path has no such
 * step: the agreed step then just comes first.
 */
export function replacesFor(setup: Setup, lead: Lead, action: Action): string[] {
  const { path } = choosePath(setup, lead);
  const done = new Set(lead.history.map((h) => h.stepId));
  const steps = path.steps.filter((x) => matches(x.onlyIf, lead.taps) && !done.has(x.id));
  const at = steps.findIndex((x) => x.who === 'me' && x.action === action);
  return at < 0 ? [] : steps.slice(0, at + 1).filter((x) => !immediate(x)).map((x) => x.id);
}

/** What the path offers as the step to agree on at the booth: its first step of his own, in its words when it has some. */
export function agreeable(setup: Setup, lead: Lead): { action: Action; label?: string } | undefined {
  const { path } = choosePath(setup, lead);
  const s = path.steps.filter((x) => matches(x.onlyIf, lead.taps)).find((x) => x.who === 'me' && x.action !== 'wait' && x.action !== 'check');
  return s ? { action: s.action, ...(s.label ? { label: s.label } : {}) } : undefined;
}

/** A path that ends on the mailing list; a sensitive business puts on it only whoever said yes at the booth (round 9). */
function endsOnList(setup: Setup, lead: Lead, end: PathEnd): boolean {
  return end.kind === 'list' && !(setup.sensitive && !lead.taps.includes(CONSENT));
}

function schedule(step: Step, base: LocalDate, lead: Lead, today: LocalDate): Next {
  if (step.timing.kind === 'customerDate' && !lead.customerDate) return { kind: 'askDate', stepId: step.id, dueOn: settle(addDays(base, 1), 'check', 'me') };
  const raw = rawDue(step.timing, base, lead);
  const late = raw < today;
  const dueOn = settle(late ? today : raw, step.action, step.who);
  return byHand(lead, { kind: 'task', stepId: step.id, action: step.action, who: step.who, message: step.message, dueOn, late, ...(late ? { wasDue: raw } : {}) });
}

/**
 * A message the system would send, to a visitor no message can reach (5/11, ב4): it becomes a call of the exhibitor's,
 * with what it says, on its day (a call not on Friday). Until now the server skipped him in silence and his path stopped.
 */
function byHand(lead: Lead, n: Extract<Next, { kind: 'task' }>): Next {
  if (lead.reach !== false || n.who !== 'auto') return n;
  const dueOn = settle(n.dueOn, 'talk', 'me');
  return { ...n, action: 'talk', who: 'me', dueOn, byHand: true };
}

function rawDue(t: Timing, base: LocalDate, lead: Lead): LocalDate {
  switch (t.kind) {
    case 'after': return addDays(base, t.days);
    case 'customerDate': return addDays(lead.customerDate!, t.days);
    // The occurrence whose day with the offset is still ahead (30/10): "21 days before Chanukah", counted from a fair 19
    // days before it, is next year's, not a date already behind.
    case 'calendar': return addDays(nextOccurrence(t.anchor, addDays(base, -t.days)), t.days);
    case 'weekday': {
      let d = addDays(base, 1);
      while (weekday(d) !== t.weekday) d = addDays(d, 1);
      return d;
    }
  }
}

// ---------- his day (5/11, ב3): who comes first, and how much fits in the time he has

/** Minutes a task of his takes, as the setup's time calculator counts them (patterns.ts). */
export const MINUTES: Record<Action, number> = { talk: 5, meet: 30, prepare: 15, send: 2, reserve: 5, check: 5, wait: 0 };

/**
 * Who comes first in his day, lower first (5/11, ב3, his "כן להכל"): whoever wrote back; whoever he starred at the booth;
 * whose own date is within two months; whoever tapped a need of the primary goal; then everyone else. Within each, the
 * earlier due first. Model §11 had the late first and the replies third: this puts the replies first.
 */
export function rankOf(setup: Setup, lead: Lead, next: Next, today: LocalDate): number {
  // What he promised at the booth comes first with the replies (5/11, א1).
  if (next.kind === 'task' && (next.reply || next.agreed)) return 0;
  if (lead.star) return 1;
  if (lead.customerDate && lead.customerDate >= today && lead.customerDate <= addDays(today, 60)) return 2;
  const { source } = choosePath(setup, lead);
  if (setup.needs.some((n) => n.label === source && n.goal === 'primary')) return 3;
  return 4;
}

/** Of his tasks for today, in order, the ones that fit in his minutes a day (the first always does), and the rest. */
export function fitDay<T>(ordered: T[], minutes: (t: T) => number, capacity: number): { fits: T[]; over: T[] } {
  let used = 0;
  const fits: T[] = [];
  let i = 0;
  for (; i < ordered.length; i++) {
    const m = minutes(ordered[i]!);
    if (fits.length && used + m > capacity) break;
    fits.push(ordered[i]!);
    used += m;
  }
  return { fits, over: ordered.slice(i) };
}

/** No tasks or sends on Shabbat and Yom Tov; his calls and meetings not on Friday. */
export function settle(d: LocalDate, action: Action, who: Who): LocalDate {
  const personal = who === 'me' && (action === 'talk' || action === 'meet');
  while (isRestDay(d) || (personal && weekday(d) === 5)) d = addDays(d, 1);
  return d;
}

/** A step the system sends on the day of the visit itself. */
export const immediate = (s: Step) => s.who === 'auto' && !!s.message && s.timing.kind === 'after' && s.timing.days === 0;

/** The path's first steps that go out at once, dropped when the exhibitor chose at the booth instead. */
function withoutImmediate(steps: Step[], chosen: boolean): Step[] {
  if (!chosen) return steps;
  let i = 0;
  while (i < steps.length && immediate(steps[i]!)) i++;
  return steps.slice(i);
}

/** What the path would send this visitor at once, as tapped so far: the booth card shows it. */
export function immediateMessage(setup: Setup, lead: Lead): string | undefined {
  const { path } = choosePath(setup, lead);
  const first = path.steps.filter((s) => matches(s.onlyIf, lead.taps))[0];
  return first && immediate(first) ? first.message : undefined;
}
