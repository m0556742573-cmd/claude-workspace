// The planner (step 2b): which automatic messages are due today, from the same engine and the same texts the app uses.
// It only queues; every message then goes through the sender's limits (limits.ts). A message is planned when:
// the path's next step is the system's own (who = auto) and carries a message; it is due today, not overdue (a message
// days late is left to the exhibitor, not sent out of the blue); the visitor's card has settled at the booth; at least
// one of his destinations can get it (a number with WhatsApp when his WhatsApp is linked, a mail when mail is set on
// the server); and the filled text has no hole left in it. The database queues it to each.
import { EXTRA, addDays, filesIn, fill, holes, isExtra, nextTask, rankOf, offerText, orderCheckText, orderSummary, textOf, type Approved, type Lead, type LocalDate, type ManualStep, type Me, type Offer, type Order, type Setup } from '../engine/src/index.ts';

export interface PlanLead {
  id: string; captured_on: string; taps: string[]; customer_date: string | null; business_owner: boolean; setup_version: number | null;
  name: string | null; settled: boolean;
  /** When he was registered: the trial's fast clock counts from it. */
  captured_at?: string;
  /** How many of his destinations get WhatsApp: his own number and the ones added, that receive and are not known to lack it. */
  targets: number;
  /** How many of his mails receive (his own when his phone gets no WhatsApp or the exhibitor chose always; the ones added). */
  mails: number;
  /** What he chose at the booth: a message, or none now. */
  booth_message: string | null; booth_none: boolean;
  /** What he ordered from the expo offer at the booth (model §14א): its summary goes to him once. */
  booth_order?: Order | null;
  /** The exhibitor's star at the booth (5/11, א2): first in his day after whoever wrote back. */
  starred?: boolean | null;
}

/**
 * Whether any automatic message can reach him (5/11, ב4): a number with WhatsApp when the exhibitor works with it (or
 * it is linked now), or a mail. When none can, the engine makes the path's messages his calls.
 */
export const reachOf = (plan: Pick<Plan, 'me'>, l: Pick<PlanLead, 'targets' | 'mails'>, waNow = false) =>
  ((plan.me.whatsapp || waNow) ? l.targets : 0) + l.mails > 0;
export interface Plan {
  /** whatsapp: his number, or null when he answered that he has none (then the suggested texts say nothing of it). */
  me: Me & { blocked: boolean; whatsapp?: string | null };
  setups: { version: number; active: boolean; data: Setup }[];
  texts: Record<string, string>;
  leads: PlanLead[];
  /** virtual_on: the day a trial step was done on by the fast clock. */
  steps: { lead_id: string; step_id: string; done_on: string; virtual_on?: string | null; outcome: Lead['history'][number]['outcome'] }[];
  manual: { id: string; lead_id: string; action: ManualStep['action']; who: ManualStep['who']; due_on: string; message: string | null }[];
  replies: { lead_id: string; at: string; optout: boolean }[];
  planned: string[];
  /** His expo offer, if he has one (model §14א). */
  offer?: Offer | null;
}
/** files: "path#name" for each file the message carries (a detail written once as a file).
 *  virtual: on the trial's fast clock, the day the step is done on, as the path sees it. */
export interface Due { lead: string; step: string; template: string; body: string; files: string[]; virtual?: string;
  /** A message before a season or a holiday is a mailing-list message, drawn as a newsletter (30/10). */ style: 'letter' | 'newsletter' }

/** The trial's fast clock (יצחק, 29/10): before the fair, a day of the path goes by in this many minutes, counted from each
 *  visitor's registration, so the whole path is seen in one sitting. On it a message a little late still goes. */
export interface Fast { now: number; minutesPerDay: number }

export const israelDay = (at: Date | string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(at));

/** Which channels this booth can send by now: WhatsApp when linked (and not stopped), mail when set on the server. */
export interface Channels { wa: boolean; mail: boolean }

export function due(plan: Plan, today: string, approved: Approved[], ch: Channels = { wa: true, mail: false }, fast?: Fast): Due[] {
  const wa = ch.wa && !plan.me.blocked;
  if (!wa && !ch.mail) return [];
  const active = plan.setups.find((s) => s.active)?.data;
  if (!active) return [];
  const versions = new Map(plan.setups.map((s) => [s.version, s.data]));
  const planned = new Set(plan.planned);
  const out: Due[] = [];
  for (const l of plan.leads) {
    if (!l.settled || !((wa ? l.targets : 0) + (ch.mail ? l.mails : 0))) continue;
    const replies = plan.replies.filter((r) => r.lead_id === l.id);
    if (replies.some((r) => r.optout)) continue;
    const setup = (l.setup_version !== null && versions.get(l.setup_version)) || active;
    const said = replies.filter((r) => !r.optout);
    const day = fast && l.captured_at
      ? addDays(l.captured_on, Math.max(0, Math.floor((fast.now - Date.parse(l.captured_at)) / (fast.minutesPerDay * 60_000))))
      : today;
    const lead: Lead = {
      id: l.id, capturedOn: l.captured_on, taps: l.taps, customerDate: l.customer_date ?? undefined, businessOwner: l.business_owner,
      history: plan.steps.filter((s) => s.lead_id === l.id).map((s) => ({ stepId: s.step_id, doneOn: (fast && s.virtual_on) || s.done_on, outcome: s.outcome })),
      manual: plan.manual.filter((m) => m.lead_id === l.id).map((m) => ({ id: m.id, action: m.action, who: m.who, dueOn: m.due_on, message: m.message ?? undefined })),
      repliedOn: said.length ? israelDay(said[said.length - 1]!.at) : undefined,
      booth: l.booth_message ? { message: l.booth_message } : l.booth_none ? {} : undefined,
      reach: reachOf(plan, l, ch.wa), star: !!l.starred,
    };
    const beside = (step: string, template: string, text: string): Due | null => {
      const body = fill(text, plan.me, l.name ?? '');
      return holes(body).length ? null : { lead: l.id, step, template, body, files: [], ...(fast ? { virtual: day } : {}), style: 'letter' };
    };
    // An order at the booth: the visitor gets its summary, once; the order closed his path (0040). A week on, a check.
    if (l.booth_order) {
      if (!planned.has(`${l.id}|order`)) {
        const body = fill(orderSummary(l.booth_order), plan.me, l.name ?? '');
        if (!holes(body).length) out.push({ lead: l.id, step: 'order', template: 'סיכום הזמנה', body, files: [], style: 'letter' });
      } else if (orderCheckDue(l, lead, day, (s) => planned.has(`${l.id}|${s}`))) {
        const d = beside(EXTRA.orderCheck, 'בדיקה אחרי הזמנה', orderCheckText());
        if (d) out.push(d);
      }
      continue;
    }
    const n = nextTask(setup, lead, day);
    // The path's message, when one goes today; the offer never goes on the same day as it.
    const goes = n.kind === 'task' && n.who === 'auto' && !!n.message && !(n.late && !fast && (n.wasDue ?? n.dueOn) < addDays(day, -1)) && n.dueOn <= day;
    const offer = offerDue(plan.offer, l, lead, day, goes, (s) => planned.has(`${l.id}|${s}`));
    if (offer) {
      const d = beside(offer.step, offer.step === EXTRA.offer ? 'מבצע התערוכה' : 'תזכורת על המבצע', offerText(plan.offer!, offer.step === EXTRA.reminder));
      if (d) out.push(d);
    }
    // A message a day late still goes (יצחק, 30/10: a visitor registered on the fair's evening, a server down for a day);
    // more than that is left to the exhibitor.
    if (n.kind !== 'task' || n.who !== 'auto' || !n.message || (n.late && !fast && (n.wasDue ?? n.dueOn) < addDays(day, -1)) || n.dueOn > day) continue;
    if (planned.has(`${l.id}|${n.stepId}`)) continue;
    const text = textOf(setup, plan.texts, n.message, approved, plan.me.whatsapp === null);
    const body = fill(text, plan.me, l.name ?? '');
    if (holes(body).length) continue; // a message with a hole never goes out; the app shows what is missing
    const files = filesIn(text, plan.me).map((f) => `${f.path}#${encodeURIComponent(f.name)}`);
    const timed = [...setup.needs.flatMap((x) => x.variants.map((v) => v.path)), setup.defaults.business, setup.defaults.private]
      .flatMap((p) => p.steps).find((s) => s.id === n.stepId)?.timing.kind;
    out.push({ lead: l.id, step: n.stepId, template: n.message, body, files, ...(fast ? { virtual: day } : {}), style: timed === 'calendar' ? 'newsletter' : 'letter' });
  }
  return out;
}

/** One of his tasks in the morning message (the shape mail.ts draws). */
export interface MorningItem { name: string; action: string; message: string | null; late: boolean; due: string }

/**
 * The morning message's list (5/11, the bug in ב1): his own tasks due today or late, from the engine on what the server
 * holds now, the same way the app computes them. Until now it read the tasks table, which only the app writes: after an
 * automatic send, the call that came next never reached the morning message. And how many visitors wait for his decision
 * (5/11): no answer and nothing chosen yet, or a talk with no next step.
 */
export function morningOf(plan: Plan, today: LocalDate): { tasks: MorningItem[]; waiting: number } {
  const active = plan.setups.find((s) => s.active)?.data;
  if (!active) return { tasks: [], waiting: 0 };
  const versions = new Map(plan.setups.map((s) => [s.version, s.data]));
  const ranked: { rank: number; item: MorningItem }[] = [];
  let waiting = 0;
  for (const l of plan.leads) {
    const replies = plan.replies.filter((r) => r.lead_id === l.id);
    if (replies.some((r) => r.optout)) continue;
    const said = replies.filter((r) => !r.optout);
    const setup = (l.setup_version !== null && versions.get(l.setup_version)) || active;
    const lead: Lead = {
      id: l.id, capturedOn: l.captured_on, taps: l.taps, customerDate: l.customer_date ?? undefined, businessOwner: l.business_owner,
      history: plan.steps.filter((s) => s.lead_id === l.id).map((s) => ({ stepId: s.step_id, doneOn: s.done_on, outcome: s.outcome })),
      manual: plan.manual.filter((m) => m.lead_id === l.id).map((m) => ({ id: m.id, action: m.action, who: m.who, dueOn: m.due_on, message: m.message ?? undefined })),
      repliedOn: said.length ? israelDay(said[said.length - 1]!.at) : undefined,
      booth: l.booth_message ? { message: l.booth_message } : l.booth_none ? {} : undefined,
      reach: reachOf(plan, l), star: !!l.starred,
    };
    const n = nextTask(setup, lead, today);
    if (n.kind === 'task' && n.who === 'me' && n.dueOn <= today) {
      ranked.push({ rank: rankOf(setup, lead, n, today), item: { name: l.name ?? '', action: n.reply ? 'talk' : n.action, message: n.message ?? null, late: n.late, due: n.wasDue ?? n.dueOn } });
    } else if (n.kind === 'end' && (n.reason === 'decide' || n.reason === 'engaged')) waiting++;
  }
  // In the order of his day, as the app shows it (5/11, ב3): rank, then the earlier due, then the name.
  ranked.sort((a, b) => a.rank - b.rank || a.item.due.localeCompare(b.item.due) || a.item.name.localeCompare(b.item.name, 'he'));
  return { tasks: ranked.map((r) => r.item), waiting };
}

/** A message already went to him that day (by the path or beside it): one a day is enough. */
const gotToday = (lead: Lead, day: LocalDate) => lead.history.some((h) => h.doneOn === day && h.outcome === 'noAnswer');

/**
 * The expo offer to a visitor who did not order (model §14א; my choice 1/11, not yet his): from the day after his visit,
 * on a day the path sends him nothing, while it lasts; and a reminder on its last day but one, two days or more after
 * it. Not after he wrote back, talked, closed, or was marked not relevant; not when the exhibitor keeps it at the booth.
 */
export function offerDue(o: Offer | null | undefined, l: PlanLead, lead: Lead, day: LocalDate, pathGoes: boolean, planned: (step: string) => boolean): { step: string } | null {
  if (!o || o.send === false || !o.items.length || lead.repliedOn || pathGoes || gotToday(lead, day)) return null;
  const last = lead.history.filter((h) => !isExtra(h.stepId)).at(-1);
  if (last && last.outcome !== 'noAnswer') return null;
  if (!planned(EXTRA.offer)) return day >= addDays(l.captured_on, 1) && day <= o.until ? { step: EXTRA.offer } : null;
  const sent = lead.history.find((h) => h.stepId === EXTRA.offer);
  return sent && sent.doneOn < addDays(day, -1) && day === addDays(o.until, -1) && !planned(EXTRA.reminder) ? { step: EXTRA.reminder } : null;
}

/** A week after the order, up to three days late, once; not if he wrote back since the order, nor on a day he got another. */
export function orderCheckDue(l: PlanLead, lead: Lead, day: LocalDate, planned: (step: string) => boolean): boolean {
  const ordered = lead.history.find((h) => h.stepId === 'order')?.doneOn ?? l.captured_on;
  const on = addDays(ordered, 7);
  return !planned(EXTRA.orderCheck) && day >= on && day <= addDays(on, 3) && !(lead.repliedOn && lead.repliedOn >= ordered) && !gotToday(lead, day);
}
