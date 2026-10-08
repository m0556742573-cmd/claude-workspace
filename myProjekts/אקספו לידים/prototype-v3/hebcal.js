/* The Jewish calendar, as the system needs it — no library, the browser's own
 * Hebrew calendar (Intl, calendar "hebrew") does the conversion.
 *
 * What it answers:
 *   - what Hebrew date a day is, written the way the community writes it (כ"ה בתשרי);
 *   - whether a day is Shabbat or Yom Tov, so no task or reminder lands on it;
 *   - when a season begins next, so a lead kept "for the season" comes back on time.
 *
 * Seasons are ranges of Hebrew dates. The defaults are a guess at how the
 * community's year runs, and every one of them is editable in the settings. */
window.HebCal = (function () {
  'use strict';
  const DAY = 864e5;
  const fmt = new Intl.DateTimeFormat('en-u-ca-hebrew', { month: 'long', day: 'numeric' });
  // Month order inside the Hebrew year. In a leap year Adar I comes first and
  // Adar II is "the" Adar — Purim and the run-up to Pesach live in it.
  const ORDER = ['Tishri', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar I', 'Adar', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul'];
  const HE = { Tishri: 'תשרי', Heshvan: 'חשוון', Kislev: 'כסלו', Tevet: 'טבת', Shevat: 'שבט', 'Adar I': 'אדר א׳', Adar: 'אדר', Nisan: 'ניסן', Iyar: 'אייר', Sivan: 'סיוון', Tamuz: 'תמוז', Av: 'אב', Elul: 'אלול' };
  const MONTHS = ORDER.filter((m) => m !== 'Adar I').map((m) => ({ id: m, he: HE[m] }));
  const WEEKDAY = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  const cache = new Map();
  function parts(date) {
    const k = Math.floor(date.getTime() / DAY);
    if (cache.has(k)) return cache.get(k);
    let m = '';
    let d = 0;
    fmt.formatToParts(date).forEach((p) => { if (p.type === 'month') m = p.value; if (p.type === 'day') d = +p.value; });
    if (m === 'Adar II') m = 'Adar';
    const r = { m, d, key: ORDER.indexOf(m) * 100 + d };
    cache.set(k, r);
    return r;
  }

  /** Hebrew numerals for a day of the month: 15 -> ט"ו, 16 -> ט"ז. */
  function gem(n) {
    const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    const tens = ['', 'י', 'כ', 'ל'];
    let s = n === 15 ? 'טו' : n === 16 ? 'טז' : tens[Math.floor(n / 10)] + ones[n % 10];
    return s.length > 1 ? s.slice(0, -1) + '"' + s.slice(-1) : s + "'";
  }
  const heDate = (date) => { const p = parts(date); return gem(p.d) + ' ב' + HE[p.m]; };
  const label = (date) => 'יום ' + WEEKDAY[date.getDay()] + ', ' + heDate(date);

  // Yom Tov in Israel: two days of Rosh Hashana, Yom Kippur, the first and last of
  // Sukkot and of Pesach, Shavuot.
  const YOMTOV = [[0, 1], [0, 2], [0, 10], [0, 15], [0, 22], [7, 15], [7, 21], [9, 6]].map(([m, d]) => m * 100 + d);
  function isRest(date) {
    if (date.getDay() === 6) return true;
    return YOMTOV.includes(parts(date).key);
  }
  const startOf = (date) => { const x = new Date(date); x.setHours(9, 0, 0, 0); return x; };
  /** n days on, moved forward past Shabbat and Yom Tov — and past Friday for `talk`, a call or a meeting. */
  function addDays(from, n, talk) {
    let x = startOf(new Date(from.getTime() + n * DAY));
    while (isRest(x) || (talk && x.getDay() === 5)) x = new Date(x.getTime() + DAY);
    return x;
  }

  const keyOf = (m, d) => ORDER.indexOf(m) * 100 + d;
  function inRange(key, r) {
    const a = keyOf(r.from[0], r.from[1]);
    const b = keyOf(r.to[0], r.to[1]);
    return a <= b ? key >= a && key <= b : key >= a || key <= b;   // a range may wrap past Rosh Hashana
  }
  function inSeason(season, date) {
    if (season.greg) {
      const md = (date.getMonth() + 1) * 100 + date.getDate();
      return season.greg.some(([a, b]) => md >= a && md <= b);
    }
    const k = parts(date).key;
    return season.ranges.some((r) => inRange(k, r));
  }
  /** The first day of the season's next run — today if it is running now. */
  function nextStart(season, from) {
    let x = startOf(from || new Date());
    if (inSeason(season, x)) return { date: x, now: true };
    for (let i = 1; i < 420; i++) {
      x = new Date(x.getTime() + DAY);
      if (inSeason(season, x)) return { date: x, now: false };
    }
    return null;
  }

  const SEASONS = [
    { id: 'elul', name: 'אלול — לפני ראש השנה', ranges: [{ from: ['Elul', 1], to: ['Tishri', 1] }] },
    { id: 'sukkot', name: 'לפני סוכות', ranges: [{ from: ['Tishri', 2], to: ['Tishri', 14] }] },
    { id: 'afterchag', name: 'אחרי החגים', ranges: [{ from: ['Tishri', 23], to: ['Kislev', 1] }] },
    { id: 'weddings', name: 'עונת החתונות', ranges: [{ from: ['Tishri', 23], to: ['Kislev', 24] }, { from: ['Iyar', 19], to: ['Tamuz', 16] }] },
    { id: 'chanukah', name: 'חנוכה', ranges: [{ from: ['Kislev', 1], to: ['Tevet', 2] }] },
    { id: 'purim', name: 'פורים', ranges: [{ from: ['Adar', 1], to: ['Adar', 14] }] },
    { id: 'pesach', name: 'לפני פסח', ranges: [{ from: ['Adar', 15], to: ['Nisan', 14] }] },
    { id: 'summer', name: 'לפני הקיץ', ranges: [{ from: ['Nisan', 23], to: ['Sivan', 29] }] },
    { id: 'bein', name: 'בין הזמנים', ranges: [{ from: ['Nisan', 1], to: ['Nisan', 30] }, { from: ['Av', 9], to: ['Elul', 1] }] },
    { id: 'tax', name: 'סוף שנת המס', greg: [[1115, 1231]] },
  ];

  return { parts, heDate, label, gem, isRest, addDays, inSeason, nextStart, SEASONS, MONTHS, HE, DAY };
})();
