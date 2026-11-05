// The engine: given an exhibitor's setup and one lead, which path applies and what the next task is.
// It is pure, so the same code runs on the phone (offline) and on the server (the morning list, the sender).
import { addDays, isRestDay, nextOccurrence, weekday } from './calendar.ts';
import { BOOTH_STEP, isExtra, manualId, replyId } from './model.ts';
import type { Action, Condition, Lead, LocalDate, NeedPath, Path, PathEnd, Setup, Step, Timing, Who } from './model.ts';

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
      /** When it was due, for a late one (its dueOn moves to today): how late it is (30/10). */ wasDue?: LocalDate }
  /** A step needs the visitor's date and he gave none: the exhibitor is asked to find out when. */
  | { kind: 'askDate'; stepId: string; dueOn: LocalDate }
  /** decide: "לא ענה" on a call of his, and he has not chosen yet what now (5/11). */
  | { kind: 'end'; reason: 'engaged' | 'closed' | 'notRelevant' | 'optOut' | 'list' | 'stop' | 'decide' };

/** What "noAnswer" means "he did not get through" for, rather than "done": his calls, meetings, and waiting for him. */
const PERSONAL: Action[] = ['talk', 'meet', 'wait'];
/** "לא ענה › להמשיך במסלול" is recorded under this id: the path goes on from the day he chose it. */
export const goOnId = (stepId: string) => `go:${stepId}`;

/** The action of a step of his own, by its id in the history: of the path, of its repeat, or set by hand. */
function personalAction(setup: Setup, lead: Lead, stepId: string): Action | null {
  if (stepId.startsWith('m:')) {
    const m = (lead.manual ?? []).find((x) => manualId(x.id) === stepId);
    return m && m.who === 'me' && PERSONAL.includes(m.action) ? m.action : null;
  }
  const { path } = choosePath(setup, lead);
  if (stepId.startsWith('repeat:')) return path.end.kind === 'repeat' && path.end.who === 'me' && PERSONAL.includes(path.end.action) ? path.end.action : null;
  const s = path.steps.find((x) => x.id === stepId);
  return s && s.who === 'me' && PERSONAL.includes(s.action) ? s.action : null;
}
function undecidedOn(setup: Setup, lead: Lead, last: { stepId: string; outcome: string }): boolean {
  return last.outcome === 'noAnswer' && personalAction(setup, lead, last.stepId) !== null;
}

/**
 * The step he did not get through on and has not decided about (5/11), with what a try again would be: a call, or for
 * waiting, waiting again. Null when there is none. The screens use it to offer the choice.
 */
export function undecided(setup: Setup, all: Lead): { stepId: string; retry: Action } | null {
  const lead = onPath(all);
  const last = lead.history[lead.history.length - 1];
  if (!last || last.outcome !== 'noAnswer') return null;
  const recorded = new Set(lead.history.map((h) => h.stepId));
  if ((lead.manual ?? []).some((m) => !recorded.has(manualId(m.id)))) return null;
  const action = personalAction(setup, lead, last.stepId);
  return action ? { stepId: last.stepId, retry: action === 'wait' ? 'wait' : 'talk' } : null;
}

/** The next thing to do for this lead, or why there is nothing. `today` is when the question is asked. */
export function nextTask(setup: Setup, all: Lead, today: LocalDate): Next {
  const lead = onPath(all);
  const last = lead.history[lead.history.length - 1];
  // A deal, "not relevant" or "remove me" ends everything, manual steps included.
  if (last && (last.outcome === 'closed' || last.outcome === 'notRelevant' || last.outcome === 'optOut')) return { kind: 'end', reason: last.outcome };

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
  if (lead.booth?.message && !recorded.has(BOOTH_STEP)) {
    const late = lead.capturedOn < today;
    return { kind: 'task', stepId: BOOTH_STEP, action: 'send', who: 'auto', message: lead.booth.message, dueOn: settle(late ? today : lead.capturedOn, 'send', 'auto'), late, ...(late ? { wasDue: lead.capturedOn } : {}) };
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
  if (last && undecidedOn(setup, lead, last)) return { kind: 'end', reason: 'decide' };
  // He answered and nothing was set by hand: the path's ladder of attempts is over; he is in the exhibitor's hands.
  if (last && last.outcome === 'engaged') return { kind: 'end', reason: 'engaged' };

  const { path } = choosePath(setup, lead);
  // A choice at the booth (a message, or none now) takes the place of the path's own immediate messages.
  const steps = withoutImmediate(path.steps.filter((s) => matches(s.onlyIf, lead.taps)), !!lead.booth);
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

/** A path that ends on the mailing list; a sensitive business puts on it only whoever said yes at the booth (round 9). */
function endsOnList(setup: Setup, lead: Lead, end: PathEnd): boolean {
  return end.kind === 'list' && !(setup.sensitive && !lead.taps.includes(CONSENT));
}

function schedule(step: Step, base: LocalDate, lead: Lead, today: LocalDate): Next {
  if (step.timing.kind === 'customerDate' && !lead.customerDate) return { kind: 'askDate', stepId: step.id, dueOn: settle(addDays(base, 1), 'check', 'me') };
  const raw = rawDue(step.timing, base, lead);
  const late = raw < today;
  const dueOn = settle(late ? today : raw, step.action, step.who);
  return { kind: 'task', stepId: step.id, action: step.action, who: step.who, message: step.message, dueOn, late, ...(late ? { wasDue: raw } : {}) };
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

/** No tasks or sends on Shabbat and Yom Tov; his calls and meetings not on Friday. */
export function settle(d: LocalDate, action: Action, who: Who): LocalDate {
  const personal = who === 'me' && (action === 'talk' || action === 'meet');
  while (isRestDay(d) || (personal && weekday(d) === 5)) d = addDays(d, 1);
  return d;
}

/** A step the system sends on the day of the visit itself. */
const immediate = (s: Step) => s.who === 'auto' && !!s.message && s.timing.kind === 'after' && s.timing.days === 0;

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
