import type { HebMonth, ISODate } from './calendar.ts';

/** Who does a step: the exhibitor, a helper of his (secretary, son, wife, technician…), or the system by itself. */
export type Owner = { kind: 'owner' } | { kind: 'helper'; name: string } | { kind: 'system' };

/** What is done. Every word a business uses for a step is one of these underneath. */
export type Action = 'talk' | 'meet' | 'prepare' | 'send' | 'reserve' | 'check' | 'waitCustomer';

/** When a step falls, counted from the previous step (the first one from the day the visitor was recorded). */
export type Timing =
  | { kind: 'afterDays'; days: number }                          // 0 = the same day
  | { kind: 'customerDate'; daysBefore: number }                 // his simcha, his move, his deadline
  | { kind: 'businessDate'; date: ISODate; daysBefore: number }  // a course that opens, an offer that ends
  | { kind: 'hebrewDate'; month: HebMonth; day: number }         // "in Sivan", "after Rosh Chodesh Elul"
  | { kind: 'weekday'; weekday: number }                         // "Wednesday before Shabbat"
  | { kind: 'season'; seasonId: string; daysBefore: number }
  | { kind: 'manual'; note: string };                            // an event the system cannot know: "before the next fire inspection"

/** Buttons on the card, by id. A step or a variant applies only when its condition holds. */
export interface Condition { any?: string[]; all?: string[]; none?: string[] }

export interface Step {
  id: string;
  action: Action;
  label: string;
  timing: Timing;
  owner: Owner;
  /** A sample, a tray, a package: his task, not a message the system sends. */
  physical?: boolean;
  /** A reservation holds this many days, then the date is released. */
  reserveDays?: number;
  /** What we wait for from the customer, e.g. "the clearing-house report". */
  waitFor?: string;
  /** Only for visitors this fits — a free first test only for a business hiring now. */
  when?: Condition;
}

export interface Path {
  steps: Step[];
  /** The same need, other steps by what was tapped: a wedding date known, a customer abroad, broken now. */
  variants?: { when: Condition; steps: Step[] }[];
  /** After the last step with no answer: stop, or keep him on the mailing list. */
  afterLast: 'stop' | 'mailingList';
}

export interface Need { id: string; label: string; relation: 'customer' | 'partner' | 'distributor'; path: Path }

export interface Setup {
  needs: Need[];
  /** When nothing was tapped: one way for a visitor who is a business owner, one for a private visitor. */
  defaults: { business: Path; private: Path };
  /** Calls and meetings not on Friday — a default a business may switch off. */
  avoidFridayForTalk: boolean;
  /** Seasons as he confirmed them: where each one starts on the Hebrew calendar. */
  seasons?: Record<string, { month: HebMonth; day: number }>;
}

export type LeadEventType = 'done' | 'noAnswer' | 'replied' | 'won' | 'lost' | 'optOut';
export interface LeadEvent { at: ISODate; type: LeadEventType; needId?: string }

export interface Lead {
  id: string;
  capturedAt: ISODate;
  /** Every button tapped on the card: needs, timing and profile alike. */
  tapped: string[];
  /** The date he gave: the simcha, the move. */
  eventDate?: ISODate;
  /** Known from the community list. Decides the default way when nothing was tapped. */
  isBusiness?: boolean;
  events: LeadEvent[];
}

export interface Task {
  leadId: string;
  /** More than one when two of his paths reach him on the same day: one touch, several topics. */
  topics: { needId: string; stepId: string; label: string }[];
  action: Action;
  owner: Owner;
  /** null when the date depends on something the system cannot know yet. */
  due: ISODate | null;
  /** Why the date is missing, in his words. */
  waitingOn?: string;
  physical?: boolean;
  reserveUntil?: ISODate;
}

/** Where a lead stands on one of its paths. */
export type PathState =
  | { kind: 'step'; task: Task }
  | { kind: 'ended'; mailingList: boolean }
  | { kind: 'stopped'; why: 'replied' | 'won' | 'lost' | 'optOut' }
  | { kind: 'nothing' };
