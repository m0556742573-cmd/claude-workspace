// The Jewish calendar the engine needs: rest days (Shabbat and Yom Tov, Israel schedule), and the next
// occurrence of a point in the Jewish year. Dates are local calendar days, 'YYYY-MM-DD'.
import { HDate, months } from '@hebcal/core';
import type { CalendarAnchor, HebrewMonth, LocalDate } from './model.ts';

export function toDate(d: LocalDate): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y!, m! - 1, day!);
}
export function fromDate(d: Date): LocalDate {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(d: LocalDate, n: number): LocalDate {
  const x = toDate(d);
  x.setDate(x.getDate() + n);
  return fromDate(x);
}
export function weekday(d: LocalDate): number {
  return toDate(d).getDay();
}

const MONTH: Record<HebrewMonth, number> = {
  tishrei: months.TISHREI, cheshvan: months.CHESHVAN, kislev: months.KISLEV, tevet: months.TEVET,
  shvat: months.SHVAT, adar: months.ADAR_I, nisan: months.NISAN, iyyar: months.IYYAR,
  sivan: months.SIVAN, tamuz: months.TAMUZ, av: months.AV, elul: months.ELUL,
};

/** Adar in a leap year is Adar II: that is where Purim falls. */
function adarOf(year: number): number {
  return HDate.isLeapYear(year) ? months.ADAR_II : months.ADAR_I;
}

/** The Hebrew [day, month] of an anchor, in a given Hebrew year. */
function anchorDay(a: CalendarAnchor, year: number): [number, number] {
  if ('holiday' in a) {
    switch (a.holiday) {
      case 'roshHashana': return [1, months.TISHREI];
      case 'sukkot': return [15, months.TISHREI];
      case 'chanukah': return [25, months.KISLEV];
      case 'purim': return [14, adarOf(year)];
      case 'pesach': return [15, months.NISAN];
      case 'lagBaomer': return [18, months.IYYAR];
      case 'shavuot': return [6, months.SIVAN];
    }
  }
  const m = a.month === 'adar' ? adarOf(year) : MONTH[a.month];
  return [a.day, m];
}

/** The first date, on or after `from`, that is this point in the Jewish year. */
export function nextOccurrence(a: CalendarAnchor, from: LocalDate): LocalDate {
  const year = new HDate(toDate(from)).getFullYear();
  for (const y of [year, year + 1]) {
    const [day, month] = anchorDay(a, y);
    const d = fromDate(new HDate(day, month, y).greg());
    if (d >= from) return d;
  }
  throw new Error('unreachable');
}

/** Yom Tov days in Israel, as [day, month]. */
const YOM_TOV: [number, number][] = [
  [1, months.TISHREI], [2, months.TISHREI], [10, months.TISHREI], [15, months.TISHREI], [22, months.TISHREI],
  [15, months.NISAN], [21, months.NISAN], [6, months.SIVAN],
];

export function isYomTov(d: LocalDate): boolean {
  const h = new HDate(toDate(d));
  return YOM_TOV.some(([day, month]) => h.getDate() === day && h.getMonth() === month);
}
export function isShabbat(d: LocalDate): boolean {
  return weekday(d) === 6;
}
export function isRestDay(d: LocalDate): boolean {
  return isShabbat(d) || isYomTov(d);
}
