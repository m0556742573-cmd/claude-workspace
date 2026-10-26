// The engine: given an exhibitor's setup and one lead, which path applies and what the next task is.
// It is pure, so the same code runs on the phone (offline) and on the server (the morning list, the sender).
import { addDays, isRestDay, nextOccurrence, weekday } from './calendar.ts';
import type { Action, Condition, Lead, LocalDate, NeedPath, Path, Setup, Step, Timing, Who } from './model.ts';

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

export type Next =
  | { kind: 'task'; stepId: string; action: Action; who: Who; message?: string; dueOn: LocalDate; late: boolean }
  /** A step needs the visitor's date and he gave none: the exhibitor is asked to find out when. */
  | { kind: 'askDate'; stepId: string; dueOn: LocalDate }
  | { kind: 'end'; reason: 'engaged' | 'closed' | 'notRelevant' | 'optOut' | 'list' | 'stop' };

/** The next thing to do for this lead, or why there is nothing. `today` is when the question is asked. */
export function nextTask(setup: Setup, lead: Lead, today: LocalDate): Next {
  const last = lead.history[lead.history.length - 1];
  if (last && last.outcome !== 'noAnswer') return { kind: 'end', reason: last.outcome };

  const { path } = choosePath(setup, lead);
  const steps = path.steps.filter((s) => matches(s.onlyIf, lead.taps));
  const done = new Set(lead.history.map((h) => h.stepId));
  const base = last ? last.doneOn : lead.capturedOn;

  const step = steps.find((s) => !done.has(s.id));
  if (step) return schedule(step, base, lead, today);

  const end = path.end;
  if (end.kind !== 'repeat') return { kind: 'end', reason: end.kind };
  const repeats = lead.history.filter((h) => h.stepId.startsWith('repeat:')).length;
  if (end.times !== undefined && repeats >= end.times) return { kind: 'end', reason: 'stop' };
  const id = `repeat:${repeats + 1}`;
  return schedule({ id, action: end.action, who: end.who, message: end.message, timing: { kind: 'after', days: end.everyDays } }, base, lead, today);
}

function schedule(step: Step, base: LocalDate, lead: Lead, today: LocalDate): Next {
  if (step.timing.kind === 'customerDate' && !lead.customerDate) return { kind: 'askDate', stepId: step.id, dueOn: settle(addDays(base, 1), 'check', 'me') };
  const raw = rawDue(step.timing, base, lead);
  const late = raw < today;
  const dueOn = settle(late ? today : raw, step.action, step.who);
  return { kind: 'task', stepId: step.id, action: step.action, who: step.who, message: step.message, dueOn, late };
}

function rawDue(t: Timing, base: LocalDate, lead: Lead): LocalDate {
  switch (t.kind) {
    case 'after': return addDays(base, t.days);
    case 'customerDate': return addDays(lead.customerDate!, t.days);
    case 'calendar': return addDays(nextOccurrence(t.anchor, base), t.days);
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
