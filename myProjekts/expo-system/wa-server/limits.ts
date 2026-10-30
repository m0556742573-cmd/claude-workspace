// The limits every WhatsApp send goes through, whatever asked for it (יצחק, 28/10: "שאין אפשרות לשליחה לכמות של
// אנשים בבום"). They sit here, in the sender, so no path and no button can get around them, today or later.
// A tap in the app becomes a queued message; the server sends it at a person's pace, in a person's hours.
// The numbers are a first setting, to be tuned after the pilot.

export const LIMITS = {
  /** Sending hours, Israel time. */
  startHour: 9,
  endHour: 20,
  /** Friday and the eve of a Yom Tov: nothing from this hour on. */
  eveEndHour: 13,
  /** Seconds between two sends from the same number, picked at random in this range. */
  gapMinSec: 45,
  gapMaxSec: 120,
  /** Messages to someone who has not written back (first or follow-up), per number per day. The rest wait for tomorrow.
   *  A conversation where he answered is outside this cap and keeps only the gap. */
  firstPerDay: 25,
  /** The same, in the first days after the number was linked. */
  firstPerDayNew: 10,
  newDays: 7,
  /** The day of the fair, Israel time: no daily cap, only a short gap so cards closed together do not leave in one second
   *  (יצחק, 28/10: "כל יום התערוכה אינו צריך הגבלה כי הכל נעשה באמת ידנית"). */
  fairDay: process.env.EXPO_DAY ?? '2026-11-16',
  fairGapMinSec: 8,
  fairGapMaxSec: 20,
  /** "Typing…" before each send, by the length of the text. */
  typingMinMs: 2000,
  typingMaxMs: 7000,
};

// The Yom Tov days in Israel, and their eves, by the Hebrew date (Intl's Hebrew calendar, month names in English).
const YOM_TOV: Record<string, number[]> = { Tishri: [1, 2, 10, 15, 22], Nisan: [15, 21], Sivan: [6] };
const EREV: Record<string, number[]> = { Elul: [29], Tishri: [9, 14, 21], Nisan: [14, 20], Sivan: [5] };

const clock = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', weekday: 'short', hour: 'numeric', hourCycle: 'h23' });
const hebrew = new Intl.DateTimeFormat('en-u-ca-hebrew', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long' });

export function israel(at: Date): { weekday: string; hour: number; hebDay: number; hebMonth: string } {
  const c = Object.fromEntries(clock.formatToParts(at).map((p) => [p.type, p.value]));
  const h = Object.fromEntries(hebrew.formatToParts(at).map((p) => [p.type, p.value]));
  return { weekday: c.weekday!, hour: Number(c.hour), hebDay: Number(h.day), hebMonth: h.month! };
}

/** Shabbat or Yom Tov in Israel at this moment: the morning message waits for the next weekday. */
export function restDay(at: Date): boolean {
  const t = israel(at);
  return t.weekday === 'Sat' || !!YOM_TOV[t.hebMonth]?.includes(t.hebDay);
}

/** May a message go out at this moment? Not at night, not on Shabbat or Yom Tov, not on their eve after midday. */
export function sendingHours(at: Date): boolean {
  const t = israel(at);
  if (t.weekday === 'Sat') return false;
  if (YOM_TOV[t.hebMonth]?.includes(t.hebDay)) return false;
  const eve = t.weekday === 'Fri' || !!EREV[t.hebMonth]?.includes(t.hebDay);
  return t.hour >= LIMITS.startHour && t.hour < (eve ? LIMITS.eveEndHour : LIMITS.endHour);
}

const israelDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' });
export const isFairDay = (at: Date) => israelDate.format(at) === LIMITS.fairDay;

export function gapMs(rand = Math.random, at = new Date()): number {
  const [min, max] = isFairDay(at) ? [LIMITS.fairGapMinSec, LIMITS.fairGapMaxSec] : [LIMITS.gapMinSec, LIMITS.gapMaxSec];
  return Math.round((min + rand() * (max - min)) * 1000);
}

export function typingMs(text: string, rand = Math.random): number {
  const byLength = text.length * 40 + rand() * 1500;
  return Math.round(Math.min(LIMITS.typingMaxMs, Math.max(LIMITS.typingMinMs, byLength)));
}

/** How many first messages this number may still send today. */
export function firstLeft(sentFirstToday: number, linkedAt: number | undefined, now = Date.now()): number {
  if (isFairDay(new Date(now))) return Infinity;
  const young = linkedAt !== undefined && now - linkedAt < LIMITS.newDays * 86_400_000;
  return Math.max(0, (young ? LIMITS.firstPerDayNew : LIMITS.firstPerDay) - sentFirstToday);
}
