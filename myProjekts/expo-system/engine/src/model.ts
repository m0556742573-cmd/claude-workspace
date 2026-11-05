// The setup an exhibitor builds (with the consultant or by hand), and the lead the booth records.
// Dates are calendar days in Israel, written 'YYYY-MM-DD'; the engine never deals with hours.

export type LocalDate = string;

/** Who does a step: the exhibitor himself, or the system on its own. There are no helpers (decided 25/10). */
export type Who = 'me' | 'auto';

/** לדבר · להיפגש · להכין · לשלוח · לשריין · לבדוק · לחכות ללקוח */
export type Action = 'talk' | 'meet' | 'prepare' | 'send' | 'reserve' | 'check' | 'wait';

export type Holiday = 'roshHashana' | 'sukkot' | 'chanukah' | 'purim' | 'pesach' | 'lagBaomer' | 'shavuot';
export type HebrewMonth =
  | 'tishrei' | 'cheshvan' | 'kislev' | 'tevet' | 'shvat' | 'adar'
  | 'nisan' | 'iyyar' | 'sivan' | 'tamuz' | 'av' | 'elul';

/** A point in the Jewish year: a holiday, or a day of a month ("בסיוון" = 1 Sivan). */
export type CalendarAnchor = { holiday: Holiday } | { month: HebrewMonth; day: number };

export type Timing =
  /** X days after the previous step (or after the expo, for the first step). 0 = the same day. */
  | { kind: 'after'; days: number }
  /** Relative to the visitor's own date (the wedding): -30 = a month before. */
  | { kind: 'customerDate'; days: number }
  /** Relative to the next occurrence of a point in the Jewish year: "אחרי פורים" = purim, +1. */
  | { kind: 'calendar'; anchor: CalendarAnchor; days: number }
  /** The next given weekday after the previous step (3 = Wednesday). */
  | { kind: 'weekday'; weekday: number };

/** A condition on what was tapped at the booth (labels of the card's buttons). */
export type Condition = { tapped: string } | { all: Condition[] } | { any: Condition[] } | { not: Condition };

export interface Step {
  id: string;
  action: Action;
  who: Who;
  timing: Timing;
  /** The message this step sends, or that goes with it (a message id from the setup). */
  message?: string;
  /** A step that costs time or money goes only to visitors who fit (a free check only to an institution). */
  onlyIf?: Condition;
}

/** What happens after the last step of a path, when the visitor never engaged. */
export type PathEnd =
  | { kind: 'list' }
  | { kind: 'stop' }
  /** A long-term check: a renovation decided over a year, a supplier who may disappoint later. */
  | { kind: 'repeat'; everyDays: number; times?: number; action: Action; who: Who; message?: string };

export interface Path {
  steps: Step[];
  end: PathEnd;
}

/** One need button, with the path behind it. The first variant whose condition fits is the one used. */
export interface NeedPath {
  label: string;
  goal: 'primary' | 'secondary';
  relation: 'customer' | 'partner' | 'distributor';
  variants: { if?: Condition; path: Path }[];
}

export interface CardButton {
  label: string;
  /** What tapping it changes; a button that changes nothing does not belong on the card. */
  effect: string;
}

export interface Setup {
  business: string;
  anchor: { goal: string; success: string };
  needs: NeedPath[];
  when: CardButton[];
  who: CardButton[];
  /** For a visitor nothing was tapped for: a business owner (known from the community list) and a private visitor. */
  defaults: { business: Path; private: Path };
  /** A sensitive business: no business name in messages, mailing list only with consent. */
  sensitive: boolean;
  /** Minutes a day he will have for the follow-up in the two weeks after the fair (round 7: half an hour by default). */
  capacity?: number;
  /** The ready template he started from (its id), so its approved texts stay his after he renames, adds or removes a
   *  button (30/10: recognised by the buttons alone, one change emptied every message). */
  template?: number;
}

/** How a step ended. 'engaged' = he answered, came, or moved forward: the ladder of attempts stops.
 *  'gaveUp' = after "לא ענה" the exhibitor chose to stop trying (יצחק, 5/11): it is his decision, by how much the visitor
 *  is worth to him, and nothing else of the path follows. Trying again is a step he sets by hand (a manual step). */
export type Outcome = 'engaged' | 'noAnswer' | 'closed' | 'notRelevant' | 'optOut' | 'gaveUp' | 'missed';
// 'missed' (5/11): he called, met or waited and did not get through, and has not chosen yet what now ("מחכה להחלטה").
// 'noAnswer' keeps its old meaning: done, the path goes on (the server marks every message it sent so).

export interface StepRecord {
  stepId: string;
  doneOn: LocalDate;
  outcome: Outcome;
}

/** A step the exhibitor set by hand, after a talk ("a meeting next week"). It comes before the path. */
export interface ManualStep {
  id: string;
  action: Action;
  who: Who;
  dueOn: LocalDate;
  message?: string;
}

/** The expo offer (יצחק 23/10, model §14א): items at an expo price, until a date (its last day).
 *  send: false keeps it at the booth only; otherwise a visitor who did not order gets it, and a reminder (1/11). */
export interface Offer { name: string; until: LocalDate; items: { id: string; name: string; price: number; expoPrice: number }[]; send?: boolean }
/** What a visitor ordered from the offer at the booth: it makes him a deal, and he gets its summary. */
export interface Order { offer: string; items: { id: string; name: string; qty: number; price: number }[]; total: number }

export interface Lead {
  id: string;
  capturedOn: LocalDate;
  taps: string[];
  /** The visitor's own date, when he gave one (a wedding, an event, a campaign). */
  customerDate?: LocalDate;
  /** From the community list: is the visitor a business owner. */
  businessOwner: boolean;
  history: StepRecord[];
  manual?: ManualStep[];
  /** The day of his latest reply on WhatsApp (model §9): it stops the path until the exhibitor answers him. */
  repliedOn?: LocalDate;
  /** What the exhibitor chose at the booth: a message to send him now, or none now. Either replaces the path's own
   *  immediate message, so he never gets two at once (יצחק, 28/10). */
  booth?: { message?: string };
  /** false when no automatic message can reach him (5/11, ב4): no number with WhatsApp that receives, and no mail. Then a
   *  message of the path becomes a call of the exhibitor's, with what it would have said. Unknown (undefined) = as before. */
  reach?: boolean;
  /** The exhibitor's own star at the booth (5/11, א2): worth his time. No words and no number; it orders his day (ב3). */
  star?: boolean;
}

/** A manual step is recorded in the history under this id, so the path's own steps never collide with it. */
export const manualId = (id: string) => `m:${id}`;
/** The message chosen at the booth is recorded under this id. */
export const BOOTH_STEP = 'booth';
/** Answering a reply is recorded under this id. */
export const replyId = (day: LocalDate) => `reply:${day}`;
/**
 * The messages the system sends beside the path (1/11): the expo offer, its reminder, the check after an order. They are
 * recorded like the path's own steps, so each goes once, but the path does not count them: its timing is unmoved.
 */
export const EXTRA = { offer: 'x:offer', reminder: 'x:offer-reminder', orderCheck: 'x:order-check' } as const;
export const isExtra = (stepId: string) => stepId.startsWith('x:');
