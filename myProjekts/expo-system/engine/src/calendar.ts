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

// ---------- dates as the exhibitor and the visitor read them: Hebrew only (יצחק, 5/11: "רק תאריכים עבריים").
// From @hebcal/core, not the browser's Intl, so an old phone and the server write the same words.

/** 7 → ז׳, 16 → ט״ז, 787 → תשפ״ז: a number in Hebrew letters, the way a date or a year is written. */
export function hebNumber(n: number): string {
  let s = '';
  n %= 1000;
  while (n >= 400) { s += 'ת'; n -= 400; }
  if (n >= 100) { s += ' קרש'[Math.floor(n / 100)]; n %= 100; }
  s += n === 15 ? 'טו' : n === 16 ? 'טז'
    : ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'][Math.floor(n / 10)]! + ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'][n % 10]!;
  return s.length > 1 ? `${s.slice(0, -1)}״${s.slice(-1)}` : `${s}׳`;
}

function monthName(month: number, year: number): string {
  if (month === months.ADAR_I) return HDate.isLeapYear(year) ? 'אדר א׳' : 'אדר';
  if (month === months.ADAR_II) return 'אדר ב׳';
  return {
    [months.NISAN]: 'ניסן', [months.IYYAR]: 'אייר', [months.SIVAN]: 'סיון', [months.TAMUZ]: 'תמוז', [months.AV]: 'אב',
    [months.ELUL]: 'אלול', [months.TISHREI]: 'תשרי', [months.CHESHVAN]: 'חשוון', [months.KISLEV]: 'כסלו',
    [months.TEVET]: 'טבת', [months.SHVAT]: 'שבט',
  }[month]!;
}

export interface HebrewDay {
  /** 1–30 */ day: number;
  /** כסלו, אדר ב׳ */ month: string;
  /** 5787 */ year: number;
  /** The civil date of the 1st of this Hebrew month, and how many days the month has. */
  monthStart: LocalDate; monthDays: number;
}
export function hebrewDay(d: LocalDate): HebrewDay {
  const h = new HDate(toDate(d));
  const m = h.getMonth(), y = h.getFullYear();
  return { day: h.getDate(), month: monthName(m, y), year: y, monthStart: fromDate(new HDate(1, m, y).greg()), monthDays: HDate.daysInMonth(m, y) };
}
/** "ו׳ בכסלו", or with the year "ו׳ בכסלו תשפ״ז". */
export function hebrewDate(d: LocalDate, withYear = false): string {
  const h = hebrewDay(d);
  return `${hebNumber(h.day)} ב${h.month}${withYear ? ` ${hebNumber(h.year)}` : ''}`;
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
