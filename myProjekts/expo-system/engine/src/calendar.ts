/* Days as plain dates ("2026-11-16"), with the Hebrew calendar from the platform's own Intl.
 * Everything is computed in UTC on date-only values, so a time zone can never move a day. */

export type ISODate = string;

export type HebMonth =
  | 'Tishri' | 'Heshvan' | 'Kislev' | 'Tevet' | 'Shevat' | 'Adar I' | 'Adar'
  | 'Nisan' | 'Iyar' | 'Sivan' | 'Tamuz' | 'Av' | 'Elul';

const DAY = 86_400_000;

const toUTC = (d: ISODate): Date => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, dd));
};
const fromUTC = (t: Date): ISODate => t.toISOString().slice(0, 10);

export const addDays = (d: ISODate, n: number): ISODate => fromUTC(new Date(toUTC(d).getTime() + n * DAY));

/** 0 = Sunday … 6 = Shabbat. */
export const weekday = (d: ISODate): number => toUTC(d).getUTCDay();

const HEB = new Intl.DateTimeFormat('en-u-ca-hebrew', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });

/** The Hebrew date. In a leap year the second Adar is "Adar" — Purim and the run-up to Pesach live in it. */
export function hebrew(d: ISODate): { year: number; month: HebMonth; day: number } {
  let month = '';
  let day = 0;
  let year = 0;
  for (const p of HEB.formatToParts(toUTC(d))) {
    if (p.type === 'month') month = p.value;
    else if (p.type === 'day') day = Number(p.value);
    else if (p.type === 'year') year = Number(p.value);
  }
  if (month === 'Adar II') month = 'Adar';
  return { year, month: month as HebMonth, day };
}

/** Yom Tov in Israel: Rosh Hashana (2 days), Yom Kippur, the first and last days of Sukkot and of Pesach, Shavuot. */
export function isYomTov(d: ISODate): boolean {
  const h = hebrew(d);
  return (h.month === 'Tishri' && [1, 2, 10, 15, 22].includes(h.day))
    || (h.month === 'Nisan' && (h.day === 15 || h.day === 21))
    || (h.month === 'Sivan' && h.day === 6);
}

export const isRest = (d: ISODate): boolean => weekday(d) === 6 || isYomTov(d);

/** The first day from `d` on that is not Shabbat or Yom Tov — and, when asked, not a Friday either. */
export function nextWorkDay(d: ISODate, avoidFriday: boolean): ISODate {
  let x = d;
  while (isRest(x) || (avoidFriday && weekday(x) === 5)) x = addDays(x, 1);
  return x;
}

/** The first date from `from` on that falls on this Hebrew month and day. */
export function findHebrew(from: ISODate, month: HebMonth, day: number, maxDays = 420): ISODate | null {
  for (let i = 0; i <= maxDays; i++) {
    const x = addDays(from, i);
    const h = hebrew(x);
    if (h.month === month && h.day === day) return x;
  }
  return null;
}

/** The first date strictly after `d` that falls on this weekday. */
export function nextWeekday(d: ISODate, wd: number): ISODate {
  let x = addDays(d, 1);
  while (weekday(x) !== wd) x = addDays(x, 1);
  return x;
}
