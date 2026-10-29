// The planner (step 2b): which automatic messages are due today, from the same engine and the same texts the app uses.
// It only queues; every message then goes through the sender's limits (limits.ts). A message is planned when:
// the path's next step is the system's own (who = auto) and carries a message; it is due today, not overdue (a message
// days late is left to the exhibitor, not sent out of the blue); the visitor's card has settled at the booth; at least
// one of his destinations can get it (a number with WhatsApp when his WhatsApp is linked, a mail when mail is set on
// the server); and the filled text has no hole left in it. The database queues it to each.
import { fill, holes, nextTask, textOf, type Approved, type Lead, type ManualStep, type Me, type Setup } from '../engine/src/index.ts';

export interface PlanLead {
  id: string; captured_on: string; taps: string[]; customer_date: string | null; business_owner: boolean; setup_version: number | null;
  name: string | null; settled: boolean;
  /** How many of his destinations get WhatsApp: his own number and the ones added, that receive and are not known to lack it. */
  targets: number;
  /** How many of his mails receive (his own when his phone gets no WhatsApp or the exhibitor chose always; the ones added). */
  mails: number;
  /** What he chose at the booth: a message, or none now. */
  booth_message: string | null; booth_none: boolean;
}
export interface Plan {
  me: Me & { blocked: boolean };
  setups: { version: number; active: boolean; data: Setup }[];
  texts: Record<string, string>;
  leads: PlanLead[];
  steps: { lead_id: string; step_id: string; done_on: string; outcome: Lead['history'][number]['outcome'] }[];
  manual: { id: string; lead_id: string; action: ManualStep['action']; who: ManualStep['who']; due_on: string; message: string | null }[];
  replies: { lead_id: string; at: string; optout: boolean }[];
  planned: string[];
}
export interface Due { lead: string; step: string; template: string; body: string }

export const israelDay = (at: Date | string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(at));

/** Which channels this booth can send by now: WhatsApp when linked (and not stopped), mail when set on the server. */
export interface Channels { wa: boolean; mail: boolean }

export function due(plan: Plan, today: string, approved: Approved[], ch: Channels = { wa: true, mail: false }): Due[] {
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
    const lead: Lead = {
      id: l.id, capturedOn: l.captured_on, taps: l.taps, customerDate: l.customer_date ?? undefined, businessOwner: l.business_owner,
      history: plan.steps.filter((s) => s.lead_id === l.id).map((s) => ({ stepId: s.step_id, doneOn: s.done_on, outcome: s.outcome })),
      manual: plan.manual.filter((m) => m.lead_id === l.id).map((m) => ({ id: m.id, action: m.action, who: m.who, dueOn: m.due_on, message: m.message ?? undefined })),
      repliedOn: said.length ? israelDay(said[said.length - 1]!.at) : undefined,
      booth: l.booth_message ? { message: l.booth_message } : l.booth_none ? {} : undefined,
    };
    const n = nextTask(setup, lead, today);
    if (n.kind !== 'task' || n.who !== 'auto' || !n.message || n.late || n.dueOn > today) continue;
    if (planned.has(`${l.id}|${n.stepId}`)) continue;
    const body = fill(textOf(setup, plan.texts, n.message, approved), plan.me, l.name ?? '');
    if (holes(body).length) continue; // a message with a hole never goes out; the app shows what is missing
    out.push({ lead: l.id, step: n.stepId, template: n.message, body });
  }
  return out;
}
