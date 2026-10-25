import { addDays, findHebrew, nextWeekday, nextWorkDay, type ISODate } from './calendar.ts';
import type { Condition, Lead, Need, Path, PathState, Setup, Step, Task, Timing } from './model.ts';

const DEFAULT_ID = '_default';

export function holds(c: Condition | undefined, tapped: string[]): boolean {
  if (!c) return true;
  const has = (id: string) => tapped.includes(id);
  return (!c.any || c.any.some(has)) && (!c.all || c.all.every(has)) && (!c.none || !c.none.some(has));
}

/** The steps this visitor gets on this path: a variant that fits him, else the plain steps — less the ones not meant for him. */
export function stepsFor(path: Path, tapped: string[]): Step[] {
  const variant = (path.variants || []).find((v) => holds(v.when, tapped));
  return (variant ? variant.steps : path.steps).filter((s) => holds(s.when, tapped));
}

/** The paths a lead is on: every need tapped, or the default way when none was. */
export function pathsOf(setup: Setup, lead: Lead): { needId: string; path: Path }[] {
  const tappedNeeds = setup.needs.filter((n: Need) => lead.tapped.includes(n.id));
  if (tappedNeeds.length) return tappedNeeds.map((n) => ({ needId: n.id, path: n.path }));
  return [{ needId: DEFAULT_ID, path: lead.isBusiness ? setup.defaults.business : setup.defaults.private }];
}

function resolve(t: Timing, anchor: ISODate, lead: Lead, setup: Setup): { date: ISODate | null; waitingOn?: string } {
  const notBefore = (d: ISODate) => (d < anchor ? anchor : d);
  switch (t.kind) {
    case 'afterDays': return { date: addDays(anchor, t.days) };
    case 'customerDate':
      return lead.eventDate ? { date: notBefore(addDays(lead.eventDate, -t.daysBefore)) } : { date: null, waitingOn: 'התאריך שלו' };
    case 'businessDate': return { date: notBefore(addDays(t.date, -t.daysBefore)) };
    case 'hebrewDate': return { date: findHebrew(addDays(anchor, 1), t.month, t.day) };
    case 'weekday': return { date: nextWeekday(anchor, t.weekday) };
    case 'season': {
      const s = setup.seasons && setup.seasons[t.seasonId];
      if (!s) return { date: null, waitingOn: 'העונה לא הוגדרה' };
      const start = findHebrew(addDays(anchor, 1), s.month, s.day);
      return { date: start ? notBefore(addDays(start, -t.daysBefore)) : null };
    }
    case 'manual': return { date: null, waitingOn: t.note };
  }
}

/** Shabbat and Yom Tov for everything; Friday too for a call or a meeting, unless the business switched that off. */
function onCalendar(d: ISODate, step: Step, setup: Setup): ISODate {
  const talk = step.action === 'talk' || step.action === 'meet';
  return nextWorkDay(d, talk && setup.avoidFridayForTalk);
}

const STOPS = ['replied', 'won', 'lost', 'optOut'] as const;

/** Where the lead stands on one path: the step that is due, or why there is none. */
export function stateOn(setup: Setup, lead: Lead, needId: string, path: Path): PathState {
  const stop = lead.events.find((e) => (STOPS as readonly string[]).includes(e.type) && (!e.needId || e.needId === needId));
  if (stop) return { kind: 'stopped', why: stop.type as PathState extends { why: infer W } ? W : never };
  const steps = stepsFor(path, lead.tapped);
  if (!steps.length) return { kind: 'nothing' };
  // A step that was done, or that brought no answer, moves the lead to the next one — "no answer" IS what the next step is for.
  const progress = lead.events.filter((e) => (e.type === 'done' || e.type === 'noAnswer') && e.needId === needId);
  if (progress.length >= steps.length) return { kind: 'ended', mailingList: path.afterLast === 'mailingList' };
  const step = steps[progress.length];
  const anchor = progress.length ? progress[progress.length - 1].at : lead.capturedAt;
  const { date, waitingOn } = resolve(step.timing, anchor, lead, setup);
  const task: Task = {
    leadId: lead.id,
    topics: [{ needId, stepId: step.id, label: step.label }],
    action: step.action,
    owner: step.owner,
    due: date ? onCalendar(date, step, setup) : null,
    ...(waitingOn ? { waitingOn } : {}),
    ...(step.physical ? { physical: true } : {}),
    ...(step.reserveDays != null && date ? { reserveUntil: addDays(onCalendar(date, step, setup), step.reserveDays) } : {}),
  };
  return { kind: 'step', task };
}

const sameOwner = (a: Task['owner'], b: Task['owner']) =>
  a.kind === b.kind && (a.kind !== 'helper' || (b.kind === 'helper' && a.name === b.name));

/** Everything due for this lead. Two calls to the same man on the same day by the same person are one call with two topics. */
export function tasksFor(setup: Setup, lead: Lead): Task[] {
  const out: Task[] = [];
  for (const { needId, path } of pathsOf(setup, lead)) {
    const st = stateOn(setup, lead, needId, path);
    if (st.kind !== 'step') continue;
    const t = st.task;
    const twin = t.action === 'talk' && t.due
      ? out.find((o) => o.action === 'talk' && o.due === t.due && sameOwner(o.owner, t.owner))
      : undefined;
    if (twin) twin.topics.push(...t.topics);
    else out.push(t);
  }
  return out;
}
