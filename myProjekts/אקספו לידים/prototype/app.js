/* Expo leads prototype.
 *
 * One file, no build step, no server. Sections, in order:
 *   1. Hebrew calendar and time      5. Next-step rules
 *   2. People: real or demo          6. Views (setup, booth, evening, today, day 14)
 *   3. Search                        7. Shell: time machine, menu, toast
 *   4. State                         8. Boot
 *
 * People data comes from window.EXPO_PEOPLE when a stripped list was loaded
 * before this script (local use only, see decisions/0007). Otherwise a demo
 * list is generated in memory. Each person is
 *   [title, first, last, father, fatherInLaw, town, country].
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // 1. Hebrew calendar and time
  // ------------------------------------------------------------------

  const EXPO_DAY = new Date(2026, 10, 17, 10, 0); // Tuesday. Placeholder until W-007 gives the real date.
  const DAY = 86400000;

  const GEM_UNITS = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const GEM_TENS = ['', 'י', 'כ', 'ל'];
  function gematria(n) {
    if (n === 15) return 'ט״ו';
    if (n === 16) return 'ט״ז';
    const s = GEM_TENS[Math.floor(n / 10)] + GEM_UNITS[n % 10];
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
  let hebMonthFmt = null;
  let hebDayFmt = null;
  try {
    hebMonthFmt = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { month: 'long' });
    hebDayFmt = new Intl.DateTimeFormat('en-US-u-ca-hebrew', { day: 'numeric' });
  } catch (e) { /* older browsers: fall back to Gregorian */ }

  function hebDate(d) {
    const wd = d.getDay() === 6 ? 'שבת' : 'יום ' + WEEKDAYS[d.getDay()];
    if (!hebMonthFmt) return wd + ', ' + d.toLocaleDateString('he-IL');
    const day = parseInt(hebDayFmt.format(d), 10);
    return wd + ', ' + gematria(day) + ' ' + hebMonthFmt.format(d);
  }
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  function relDay(due, now) {
    const diff = Math.round((dayStart(due) - dayStart(now)) / DAY);
    if (diff <= 0) return 'היום';
    if (diff === 1) return 'מחר';
    if (diff < 7) return 'יום ' + WEEKDAYS[due.getDay()];
    return hebDate(due);
  }

  /** Move a due date off Shabbat. Reminders never fall on Shabbat. */
  function offShabbat(d) {
    if (d.getDay() === 6) return new Date(d.getTime() + DAY);
    if (d.getDay() === 5 && d.getHours() >= 13) return new Date(d.getTime() + 2 * DAY);
    return d;
  }
  function daysFrom(now, days, hour) {
    const d = dayStart(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour || 10, 0, 0, 0);
    return offShabbat(d);
  }

  // ------------------------------------------------------------------
  // 2. People: real or demo
  // ------------------------------------------------------------------

  const REAL = Array.isArray(window.EXPO_PEOPLE) && window.EXPO_PEOPLE.length > 0;

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function makeDemoPeople() {
    const rnd = mulberry32(5787);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    // Weighted towards the common names, so duplicates occur about as often as in a real list.
    const firsts = ['משה', 'משה', 'יעקב', 'יעקב', 'אברהם', 'יצחק', 'יוסף', 'יוסף', 'דוד', 'חיים', 'חיים', 'ישראל', 'שמואל', 'אהרן', 'מרדכי', 'שלמה', 'מנחם', 'אליעזר', 'יהודה', 'נפתלי', 'שמעון', 'בנימין', 'יחזקאל', 'פנחס', 'אלימלך', 'זאב', 'צבי', 'אריה', 'מאיר', 'נחום', 'יהושע', 'ברוך', 'גדליה', 'עזריאל', 'שלום', 'יואל', 'מנשה', 'אליהו', 'יחיאל', 'חנוך', 'זלמן', 'שבתי', 'יששכר', 'ראובן', 'לוי', 'שרגא', 'עמרם', 'חזקיהו', 'משה יוסף', 'יעקב יצחק', 'חיים מאיר', 'אברהם יהושע', 'שמואל דוד', 'מנחם מענדל'];
    // Every pair is one family name written both ways, Hebrew and Yiddish, so the
    // cross-spelling search can be shown on demo data and not only on the real list.
    const PAIRS = [['ברגר', 'בערגער'], ['מילר', 'מיללער'], ['שוורץ', 'שווארץ'], ['וייס', 'ווייס'],
      ['כץ', 'קאץ'], ['לבוביץ', 'לעבאוויטש'], ['פרידמן', 'פריעדמאן'], ['גרוס', 'גראס'],
      ['שטרן', 'שטערן'], ['הירש', 'הערש'], ['גליק', 'גליק'], ['רוט', 'ראטה']];
    const lasts = [].concat.apply([], PAIRS).concat(['כהן', 'לוי', 'גרינפלד', 'רוזנברג', 'קליין', 'הורוביץ', 'רובינשטיין', 'גולדשטיין', 'פרלמן', 'לנדאו', 'הלברשטאם', 'טייטלבוים', 'שפירא', 'רבינוביץ', 'ברגר', 'אייזנבך', 'גליק', 'הירש', 'קאופמן', 'לרנר', 'מרגליות', 'נויבירט', 'פולק', 'קרויס', 'רוט', 'שטרן', 'זילבר', 'טננבוים', 'ליכטנשטיין', 'מנדלבוים', 'פישר', 'קנר', 'רייך', 'שלזינגר', 'ביננפלד', 'גוטליב', 'דייטש', 'הופמן', 'ויזל', 'זוסמן', 'חיון', 'יאקאב', 'כץ', 'לעבוביץ', 'מושקוביץ', 'נוסבוים', 'סגל', 'עקשטיין', 'פאלק', 'צוקר', 'קעסלער', 'רענד', 'שיינבערגער', 'תאומים', 'ברייער', 'גרוס', 'דאנציגער', 'הערש', 'וועבער', 'זאנענפעלד', 'טויב', 'יונגרייז', 'לאנדא', 'מילער', 'נאכמאן', 'סאמעט', 'פריינד', 'קליינמאן', 'רוזנטל', 'שווימער', 'אונגר', 'בלוי', 'גלאנץ', 'דרוק', 'האס', 'ווידער', 'זייף', 'טירנויער', 'יעגער', 'לעווי', 'מאשקאוויטש', 'נייהויז', 'ספרא', 'פעלדמאן', 'קאהן', 'ראזענבוים', 'שפיץ']);
    const towns = ['בני ברק', 'בני ברק', 'בני ברק', 'ירושלים', 'ירושלים', 'ירושלים', 'בית שמש', 'בית שמש', 'ביתר עילית', 'מודיעין עילית', 'אלעד', 'אשדוד', 'בני ברק', 'חיפה', 'צפת', 'טבריה', 'קרית גת', 'ערד', 'נתניה', 'חריש'];
    const out = [];
    for (let i = 0; i < 6000; i++) {
      const first = pick(firsts);
      const last = pick(lasts);
      const father = "ר' " + pick(firsts);
      const inLaw = "ר' " + pick(firsts) + ' ' + pick(lasts);
      const title = rnd() < 0.93 ? 'הר"ר' : pick(['הרב', 'הרה"ג']);
      out.push([title, first, last, father, inLaw, pick(towns), 'ישראל']);
    }
    return out;
  }

  /* Guard: a real row must have the stripped shape and carry no way to contact
   * anyone. Phone numbers are written every which way — 054-123-4567, 054 1234567,
   * +972-54-… — so the digits are pulled out first and judged on their own. */
  const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
  function hasContact(cell) {
    const s = String(cell);
    if (EMAIL_RE.test(s)) return true;
    return /(^|\D)(0\d{8,9}|972\d{8,9})(\D|$)/.test(s.replace(/[\s()+.\-]/g, ''));
  }
  function validRow(r) {
    return Array.isArray(r) && r.length === 7 && !r.some(hasContact);
  }
  const PEOPLE = REAL ? window.EXPO_PEOPLE.filter(validRow) : makeDemoPeople();
  if (REAL && PEOPLE.length !== window.EXPO_PEOPLE.length) {
    console.warn((window.EXPO_PEOPLE.length - PEOPLE.length) + ' rows dropped: wrong shape or contact data');
  }
  const person = (i) => PEOPLE[i];
  const fullName = (p) => (p[1] + ' ' + p[2]).trim();

  // ------------------------------------------------------------------
  // 3. Search
  //    Understands full and defective spelling, final letters, gershayim,
  //    and a few common nicknames. Ranks first-name hits highest.
  // ------------------------------------------------------------------

  const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  function norm(s) {
    return String(s || '')
      .replace(/[֑-ׇ]/g, '')          // niqqud and cantillation
      .replace(/["'״׳`.,\-־]/g, '')              // gershayim, geresh, punctuation
      .replace(/[ךםןףץ]/g, (c) => FINALS[c])
      .replace(/\s+/g, ' ').trim().toLowerCase();
  }
  /* Sound skeleton: Yiddish and Hebrew spellings of the same name reach the same key.
   *
   * Yiddish written in Hebrew letters carries its vowels as letters (ע, א), doubles
   * consonants (מיללער), and writes /v/ as וו and /tsh/ as טש. Hebrew spelling drops
   * all of that. Stripping the vowel letters and collapsing doubles brings the two
   * together: בערגער and ברגר both become ברגר, מיללער and מילר become מילר.
   *
   * Two depths, because one size over- or under-matches:
   *   skel(w)       keeps vav and yud   — precise:  שווארץ = שוורץ
   *   skel(w, true) drops them too      — broad:    לעבאוויטש = לבוביץ
   */
  function skel(w, deep) {
    let s = w
      .replace(/וו/g, 'ו').replace(/יי/g, 'י')   // doubled letters carry one sound
      .replace(/דזש/g, 'ז').replace(/טש/g, 'צ')  // Yiddish digraphs
      .replace(/[אהע]/g, '');                    // vowel letters: בערגער -> ברגר
    if (deep) s = s.replace(/[וי]/g, '');
    s = s.replace(/ת/g, 'ט').replace(/ק/g, 'כ').replace(/ש/g, 'ס'); // same sound, either letter
    return s.replace(/(.)\1+/g, '$1');           // מיללער -> מילר, לבבצ -> לבצ
  }

  const ALIASES = {
    'יודא': 'יהודה', 'יהודה': 'יודא', 'ליבוש': 'אריה', 'לייבוש': 'אריה', 'שמולי': 'שמואל', 'שמעלקא': 'שמואל',
    'יענקי': 'יעקב', 'יאנקי': 'יעקב', 'מוטי': 'מרדכי', 'שרולי': 'ישראל', 'איצי': 'יצחק', 'אייזיק': 'יצחק',
    'הערש': 'צבי', 'הירש': 'צבי', 'וואלף': 'זאב', 'בערל': 'דב', 'לייב': 'אריה', 'מענדי': 'מנחם', 'פינני': 'פנחס',
  };

  // The expo is for men only, so women's entries never come up in the booth search.
  const isWoman = (p) => /^(מרת|הרבנית)/.test(String(p[0]).trim());

  const INDEX = PEOPLE.map((p) => {
    const words = (norm(p[1]) + ' ' + norm(p[2])).split(' ').filter(Boolean);
    const town = norm(p[5]).split(' ').filter(Boolean);
    return {
      words, town, firstLen: norm(p[1]).split(' ').length, woman: isWoman(p),
      skelWords: words.map((w) => skel(w)), deepWords: words.map((w) => skel(w, true)),
    };
  });

  function tokenMatches(tok, ix) {
    const words = ix.words;
    for (let w = 0; w < words.length; w++) {
      if (words[w].startsWith(tok)) return { w, exact: words[w] === tok, how: 'prefix' };
    }
    const alias = ALIASES[tok];
    if (alias) {
      const a = norm(alias);
      for (let w = 0; w < words.length; w++) if (words[w] === a) return { w, exact: true, how: 'alias' };
    }
    // Spelling variants, Yiddish against Hebrew. Short keys must match whole, or
    // everything matches everything.
    const sk = skel(tok);
    if (sk.length >= 2) {
      for (let w = 0; w < ix.skelWords.length; w++) {
        const c = ix.skelWords[w];
        if (sk.length >= 3 ? c.startsWith(sk) : c === sk) return { w, exact: c === sk, how: 'skel' };
      }
    }
    const dp = skel(tok, true);
    if (dp.length >= 3) {
      for (let w = 0; w < ix.deepWords.length; w++) {
        const c = ix.deepWords[w];
        if (c.startsWith(dp)) return { w, exact: c === dp, how: 'deep' };
      }
    }
    return null;
  }

  function search(query, limit) {
    const toks = norm(query).split(' ').filter(Boolean);
    if (!toks.length) return { hits: [], total: 0 };
    const hits = [];
    for (let i = 0; i < INDEX.length; i++) {
      const ix = INDEX[i];
      if (ix.woman) continue;
      let score = 0;
      let ok = true;
      let variant = false;
      for (let t = 0; t < toks.length; t++) {
        const m = tokenMatches(toks[t], ix);
        if (m) {
          score += m.exact ? 3 : 2;
          if (m.how === 'skel') { score -= 1; variant = true; } // a spelling variant ranks below a direct hit
          if (m.how === 'deep') { score -= 2; variant = true; }
          if (t === 0 && m.w === 0) score += 2;              // first typed word hits the first name
          if (t > 0 && m.w >= ix.firstLen) score += 1;       // later word hits the surname
          continue;
        }
        if (t > 0 && ix.town.some((w) => w.startsWith(toks[t]))) { score += 1; continue; } // "משה כהן בני"
        ok = false; break;
      }
      if (ok) hits.push({ i, score, variant });
    }
    hits.sort((a, b) => b.score - a.score || fullName(person(a.i)).length - fullName(person(b.i)).length);
    // Names spelled the other way must stay visible, or a common surname fills the
    // whole list and the exhibitor never sees that the other spelling exists.
    const plain = hits.filter((h) => !h.variant);
    const other = hits.filter((h) => h.variant);
    const shown = other.length && plain.length > limit - 2
      ? plain.slice(0, limit - 2).concat(other.slice(0, 2))
      : hits.slice(0, limit);
    return { hits: shown, total: hits.length };
  }

  // ------------------------------------------------------------------
  // 4. State
  // ------------------------------------------------------------------

  const TEMPLATES = {
    buy: { name: 'קנייה', example: 'דגים, בגדים, יודאיקה', ask: null, hot: 'להתקשר ולהציע' },
    quote: { name: 'הצעת מחיר', example: 'נגרים, דפוס, תאורה', ask: { label: 'היקף', options: ['פריט אחד', 'חדר', 'דירה שלמה', 'מוסד שלם'] }, hot: 'להכין הצעת מחיר' },
    meeting: { name: 'פגישה', example: 'ביטוח, עורכי דין', ask: { label: 'נושא', options: ['ייעוץ ראשוני', 'בדיקת מצב קיים', 'הצעה מסודרת'] }, hot: 'לקבוע פגישה' },
    date: { name: 'תאריך', example: 'טיולים, השכרת רכב, אירועים', ask: { label: 'מתי האירוע', options: ['החודש', 'בחורף', 'בין הזמנים', 'לא ידוע'] }, hot: 'לתאם תאריך' },
    register: { name: 'הרשמה', example: 'קורסים, מנויים', ask: { label: 'מסלול', options: ['הקרוב', 'הבא', 'רק מידע'] }, hot: 'לשלוח פרטי הרשמה' },
    general: { name: 'כללי', example: 'כל עסק אחר', ask: null, hot: 'להתקשר' },
  };
  /* The trade library. This is what turns setting up from writing into approving:
   * the exhibitor picks his trade and everything below is already filled in, in
   * the words that trade actually uses. Drawn from the thirty businesses that
   * exhibited last time. Sizes are s / m / l — enough to rank a lead by what it
   * is worth, without anyone having to write down prices.
   *
   * ⚠️ Written by Claude and not yet checked by Yitzhak, who knows these
   * businesses. Expect the names and the sizes to be corrected.
   */
  const TRADES = [
    { id: 'carpentry', name: 'נגרייה', template: 'quote', days: 1,
      offers: [['מטבחים', 'l'], ['ארונות קיר', 'l'], ['ריהוט למוסדות', 'l'], ['חדרי ילדים', 'm'], ['ספריות', 'm'], ['דלתות', 's']] },
    { id: 'furniture', name: 'רהיטים וסלונים', template: 'buy', days: 2,
      offers: [['סלונים', 'l'], ['פינות אוכל', 'm'], ['מזרנים ומיטות', 'm'], ['ריהוט משרדי', 'm'], ['מבצע התערוכה', 's']] },
    { id: 'print', name: 'דפוס וגרפיקה', template: 'quote', days: 1,
      offers: [['הזמנות לאירוע', 'm'], ['חוברות וספרים', 'l'], ['שילוט ובאנרים', 'm'], ['כרטיסי ביקור', 's'], ['הדפסה למוסדות', 'l']] },
    { id: 'events', name: 'הפקת אירועים', template: 'date', days: 1,
      offers: [['חתונה', 'l'], ['בר מצווה', 'l'], ['אירוע למוסד', 'l'], ['שבת חתן', 'm'], ['ציוד והשכרה', 's']] },
    { id: 'food', name: 'מזון וקייטרינג', template: 'date', days: 1,
      offers: [['אירוע גדול', 'l'], ['שבת ואירוח', 'm'], ['הזמנה קבועה למוסד', 'l'], ['מגשי אירוח', 'm'], ['קמעונאי', 's']] },
    { id: 'clothing', name: 'ביגוד והלבשה', template: 'buy', days: 3,
      offers: [['חליפות', 'm'], ['בגדי ילדים', 's'], ['הזמנה מיוחדת', 'm'], ['מבצע התערוכה', 's']] },
    { id: 'judaica', name: 'יודאיקה ותשמישי קדושה', template: 'buy', days: 3,
      offers: [['תפילין', 'l'], ['ספרי תורה ומגילות', 'l'], ['כלי כסף', 'm'], ['מתנה לאירוע', 'm'], ['תשמישי קדושה', 's']] },
    { id: 'insurance', name: 'ביטוח ופיננסים', template: 'meeting', days: 1,
      offers: [['ביטוח בריאות', 'l'], ['ביטוח לעסק', 'l'], ['פנסיה וחיסכון', 'l'], ['ביטוח רכב ודירה', 'm'], ['בדיקת תיק קיים', 'm']] },
    { id: 'legal', name: 'עורכי דין וייעוץ', template: 'meeting', days: 1,
      offers: [['ייעוץ ראשוני', 'm'], ['נדל"ן וחוזים', 'l'], ['ליווי למוסד', 'l'], ['ירושות וצוואות', 'm']] },
    { id: 'health', name: 'בריאות וטיפולים', template: 'date', days: 2,
      offers: [['טיפול בודד', 's'], ['סדרת טיפולים', 'm'], ['מנוי חודשי', 'm'], ['טיפול בבית', 'm']] },
    { id: 'courses', name: 'קורסים והכשרות', template: 'register', days: 1,
      offers: [['המחזור הקרוב', 'm'], ['המחזור הבא', 'm'], ['קורס למוסד', 'l'], ['רק לקבל מידע', 's']] },
    { id: 'trips', name: 'טיולים והסעות', template: 'date', days: 1,
      offers: [['טיול לקבוצה', 'l'], ['הסעה לאירוע', 'm'], ['בין הזמנים', 'l'], ['טיול משפחתי', 'm']] },
    { id: 'home', name: 'שיפוץ ותחזוקה לבית', template: 'quote', days: 1,
      offers: [['מזגנים', 'm'], ['חשמל ותאורה', 'm'], ['צבע ושיפוץ', 'l'], ['עבודה למוסד', 'l'], ['תיקון קטן', 's']] },
    { id: 'auto', name: 'רכב ותחבורה', template: 'date', days: 2,
      offers: [['טיפול וסדרה', 'm'], ['השכרה ליום', 's'], ['השכרה לאירוע', 'm'], ['בדיקה לפני קנייה', 's']] },
    { id: 'supply', name: 'אספקה וסיטונאות', template: 'quote', days: 1,
      offers: [['הזמנה קבועה', 'l'], ['ציוד למוסד', 'l'], ['הזמנה חד-פעמית', 'm'], ['דוגמאות', 's']] },
    { id: 'general', name: 'אחר', template: 'general', days: 2,
      offers: [['מידע כללי', 'm'], ['מבצע התערוכה', 's']] },
  ];
  const tradeById = (id) => TRADES.find((t) => t.id === id) || TRADES[TRADES.length - 1];

  const SIZES = { s: 'קטן', m: 'בינוני', l: 'גדול' };
  const SIZE_RANK = { s: 1, m: 3, l: 6 };

  /* ---- שכבת ערוץ (decision 0008) -----------------------------------------
   * Everything that sends goes through send(). Behind it sit engines that are
   * chosen per business, so one exhibitor can run the official API, another the
   * unofficial link, and a third nothing at all — on the same system. The point
   * is that swapping an engine is a setting, not a rewrite: if WhatsApp changes
   * the rules, or if the unofficial route turns out to be a mistake, one entry
   * in this table moves and no screen notices.
   *   needs.server — cannot run on a static page; needs a process that stays up.
   *   warn         — the exhibitor signs before it can be turned on.
   *   file         — can carry the catalog itself rather than a link to it. */
  const CHANNELS = {
    whatsapp: {
      name: 'וואטסאפ', icon: '💬',
      engines: {
        off:  { name: 'כבוי', note: 'לא מוצע בדוכן' },
        link: { name: 'פותח לי את וואטסאפ', note: 'אני לוחץ שלח. בלי קובץ מצורף.', file: false },
        gray: {
          name: 'חיבור ישיר למספר שלי', note: 'נשלח לבד, עם הקטלוג מצורף.',
          file: true, needs: { server: true }, warn: true,
        },
        api:  {
          name: 'API רשמי', note: 'למי שכבר יש חשבון. בלי סיכון חסימה.',
          file: true, needs: { server: true },
          fields: [
            ['phoneId', 'מזהה המספר', 'לא מספר הטלפון — מזהה מלוח הבקרה'],
            ['wabaId', 'מזהה החשבון העסקי', ''],
            ['token', 'מפתח גישה קבוע', 'של "משתמש מערכת". המפתח הראשוני מת תוך חודשיים'],
          ],
        },
      },
    },
    email: {
      name: 'מייל', icon: '✉️',
      engines: {
        off:    { name: 'כבוי', note: '' },
        mailto: { name: 'פותח לי את תוכנת המייל', note: 'בלי קובץ מצורף.', file: false },
        system: {
          name: 'המערכת שולחת בשמי', note: 'קטלוג מצורף, והתשובה חוזרת לתיבה שלי.',
          file: true, needs: { server: true },
          fields: [['reply', 'הכתובת שאליה יחזרו', 'זה כל מה שנדרש ממך']],
        },
      },
    },
    // Checked 30/09/2026: a kosher line cannot receive SMS at all. That is most
    // of the visitors here, so this channel stays off by default and says why.
    sms: {
      name: 'SMS', icon: '📱', warnNote: '⚠️ טלפון כשר אינו מקבל SMS. רלוונטי רק למבקר עם מכשיר פתוח.',
      engines: {
        off:     { name: 'כבוי', note: '' },
        gateway: {
          name: 'המערכת שולחת', note: 'לא דרך המספר שלך. חשבון אחד משרת את כולם.',
          file: false, needs: { server: true },
        },
      },
    },
  };
  const ENGINE_DEFAULT = { whatsapp: 'link', email: 'mailto', sms: 'off' };

  function channelConf(kind) {
    const c = S.business.channels || {};
    return c[kind] || (c[kind] = { engine: ENGINE_DEFAULT[kind] });
  }
  function engineOf(kind) {
    const conf = channelConf(kind);
    return CHANNELS[kind].engines[conf.engine] || CHANNELS[kind].engines.off;
  }
  /** Which channels the exhibitor could actually reach this lead through. */
  function liveChannels() {
    return Object.keys(CHANNELS).filter((k) => channelConf(k).engine !== 'off');
  }

  /** The one place anything is sent from. The prototype has no server, so it
   *  reports what would happen rather than pretending it happened. */
  function send(lead, kind) {
    const conf = channelConf(kind);
    const eng = engineOf(kind);
    const ch = CHANNELS[kind];
    if (conf.engine === 'off') return { ok: false, why: ch.name + ' כבוי בהגדרות' };
    if (eng.warn && !conf.signed) return { ok: false, why: 'החיבור טרם אושר בהגדרות' };
    const what = S.business.catalog
      ? (eng.file ? 'הקטלוג יישלח כקובץ' : 'יישלח קישור לקטלוג')
      : 'תישלח ההודעה בלבד';
    if (eng.needs && eng.needs.server) {
      return { ok: true, real: false, text: ch.icon + ' ' + ch.name + ': ' + what + ' ל' + leadName(lead) + '. ⚠️ דורש שרת — בדוגמית לא נשלח.' };
    }
    return { ok: true, real: false, text: ch.icon + ' ' + eng.name + ' — ' + what + ' ל' + leadName(lead) + '. בדוגמית לא נשלח באמת.' };
  }

  const SUGGESTED_OFFERINGS = {
    quote: ['מטבחים', 'ארונות קיר', 'ריהוט למוסדות', 'חדרי ילדים', 'ספריות', 'דלתות'],
    buy: ['מבצע התערוכה', 'מוצרים חדשים', 'הזמנה מיוחדת', 'מתנות לאירוע'],
    meeting: ['ייעוץ ראשוני', 'בדיקת מצב קיים', 'טיפול בתיק קיים'],
    date: ['אירוע משפחתי', 'טיול לקבוצה', 'השכרה ליום', 'בין הזמנים'],
    register: ['המחזור הקרוב', 'המחזור הבא', 'מנוי שנתי', 'רק לקבל מידע'],
    general: ['מידע כללי', 'מבצע התערוכה'],
  };
  const WHEN_OPTIONS = ['עכשיו', 'עד 3 חודשים', 'בהמשך'];
  const WARMTH_DEFAULT = { hot: 'חם', warm: 'פושר', cold: 'קר' };
  /** The grades carry the exhibitor's own words when he has renamed them. */
  const warmthName = (k) => (S && S.business && S.business.warmthNames && S.business.warmthNames[k]) || WARMTH_DEFAULT[k];
  const WARMTH = new Proxy({}, {
    get: (_, k) => warmthName(k),
    ownKeys: () => Object.keys(WARMTH_DEFAULT),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });

  const STORE_KEY = 'expo-proto-v1-' + (REAL ? 'real' : 'demo');
  let S;

  /* Two separate things, which version 1 confused into one "stage":
   *   screen — where the exhibitor is: the booth, his visitors, or the CRM.
   *   day    — which day the demo is pretending it is. A demo control, not a screen. */
  function freshState() {
    return {
      screen: 'booth',
      day: 'expo',
      welcomed: false,
      business: {
        name: '', trade: '', template: 'general', offerings: [],
        warmthNames: null, catalog: null, catalogMessage: 'שלום, מצורף החומר שביקשת. אשמח לעמוד לרשותך.',
        channels: { whatsapp: { engine: 'link' }, email: { engine: 'mailto' }, sms: { engine: 'off' } },
        keepAudience: true, season: '', devices: [], registered: false,
      },
      leads: [],
      seq: 1,
      boothEnteredAt: null,
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { S = JSON.parse(raw); migrate(); relinkPeople(); return; }
    } catch (e) { /* storage unavailable: run in memory */ }
    S = freshState();
  }
  /** Version 1 stored one "stage". Split it, so saved demos still open. */
  function migrate() {
    // Two jobs, and only the first one is once-only. Filling in missing fields
    // must run on every load: a state saved by any earlier version can be missing
    // something a newer screen reads, and then that screen dies silently.
    if (!S.screen) {
      const map = {
        setup: ['settings', 'expo'], booth: ['booth', 'expo'], evening: ['leads', 'evening'],
        today: ['crm', 'after'], day14: ['crm', 'day14'],
      };
      const [screen, day] = map[S.stage] || ['booth', 'expo'];
      S.screen = screen;
      S.day = day;
      if (S.stage === 'day14') crmTab = 'summary';
      S.welcomed = true;
      delete S.stage;
    }
    if (!S.day) S.day = 'expo';
    if (!S.business) S.business = freshState().business;
    // Offerings used to be plain strings and now carry a size.
    const b = S.business || {};
    if (b.offerings && b.offerings.length && typeof b.offerings[0] === 'string') {
      b.offerings = b.offerings.map((name) => ({ name, size: 'm' }));
    }
    b.offerings = b.offerings || [];
    // Channels used to be on/off flags and now carry an engine and its settings.
    b.channels = b.channels || {};
    Object.keys(CHANNELS).forEach((k) => {
      const v = b.channels[k];
      if (v === undefined) b.channels[k] = { engine: ENGINE_DEFAULT[k] };
      else if (typeof v === 'boolean') b.channels[k] = { engine: v ? ENGINE_DEFAULT[k] : 'off' };
      else if (!CHANNELS[k].engines[v.engine]) v.engine = ENGINE_DEFAULT[k];
    });
    b.devices = b.devices || [];
    b.trade = b.trade || '';
    b.template = b.template || 'general';
    b.catalogMessage = b.catalogMessage || 'שלום, מצורף החומר שביקשת. אשמח לעמוד לרשותך.';
    if (b.registered === undefined) b.registered = !!b.name;
    // A lead saved by an older version may be missing fields that later screens
    // read without checking. Fill them in rather than throw and lose the lot.
    (S.leads || []).forEach((l) => {
      l.calls = l.calls || [];
      l.visits = l.visits && l.visits.length ? l.visits : [l.createdAt || Date.now()];
      l.interests = l.interests || [];
      l.status = l.status || 'open';
    });
  }
  /** Leads point at a row by position. If the list was re-exported in another order,
   *  find each person again by the name saved with the lead, rather than show someone else. */
  function relinkPeople() {
    S.leads.forEach((l) => {
      if (l.pid == null || !l.snap) return;
      if (person(l.pid) && snapOf(person(l.pid)) === l.snap) return;
      const k = PEOPLE.findIndex((p) => snapOf(p) === l.snap);
      if (k >= 0) { l.pid = k; return; }
      // Nobody matches any more: keep the lead as a hand-written one, and keep
      // anything the exhibitor typed himself, above all the phone.
      const [name, town] = l.snap.split('|');
      l.custom = Object.assign({ first: name, last: '', town: town || '' }, l.custom || {});
      l.pid = null;
    });
  }
  /** Name and town alone repeat often in this community. The father and the
   *  father-in-law are what make a person unique, so they belong in the key. */
  const snapOf = (p) => [fullName(p), p[5], p[3], p[4]].join('|');
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* in memory only */ }
  }

  /** The simulated "now" for each demo day. */
  function nowFor(stage) {
    if (stage === 'expo') {
      // The expo day restarts at 10:00 every time the booth is opened, so the hours
      // stay believable instead of everyone arriving at the same minute.
      const entered = S.boothEnteredAt || Date.now();
      const elapsed = Date.now() - entered;
      return new Date(EXPO_DAY.getTime() + (elapsed > 10 * 3600000 ? 0 : elapsed));
    }
    if (stage === 'evening') return new Date(EXPO_DAY.getFullYear(), EXPO_DAY.getMonth(), EXPO_DAY.getDate(), 21, 0);
    if (stage === 'after') return daysFrom(EXPO_DAY, 1, 9);
    if (stage === 'day14') return daysFrom(EXPO_DAY, 14, 18);
    return new Date(EXPO_DAY.getTime() - 7 * DAY);
  }
  const NOW = () => nowFor(S.day);

  const DAYS = [
    { id: 'expo', label: 'יום התערוכה' },
    { id: 'evening', label: 'הערב שאחריו' },
    { id: 'after', label: 'למחרת בבוקר' },
    { id: 'day14', label: 'שבועיים אחרי' },
  ];

  const tpl = () => TEMPLATES[S.business.template] || TEMPLATES.general;
  const leadById = (id) => S.leads.find((l) => l.id === id);
  const leadName = (l) => l.pid != null ? fullName(person(l.pid)) : (l.custom.first + ' ' + l.custom.last).trim();
  const leadTown = (l) => l.pid != null ? person(l.pid)[5] : (l.custom.town || '');
  const leadMeta = (l) => l.pid != null ? metaLine(person(l.pid)) : 'נוסף ידנית';

  function metaLine(p) {
    const parts = [];
    if (p[3]) parts.push((p[3].startsWith('אשת') ? '' : 'בן ') + p[3]);
    if (p[4]) parts.push('חתן ' + p[4]);
    return parts.join(' · ');
  }

  function newLead(fields) {
    const l = Object.assign({
      id: S.seq++, pid: null, custom: null, createdAt: NOW().getTime(), source: 'search',
      warmth: null, interests: [], ask: null, when: null, note: '', sendMaterial: false,
      visits: [NOW().getTime()], next: null, calls: [], status: 'open', tagger: 'טאבלט הדוכן',
    }, fields);
    if (l.pid != null) l.snap = snapOf(person(l.pid));
    S.leads.push(l);
    return l;
  }

  /** A new visit counts only if the last one was a while ago: a double tap or a re-search is not a return. */
  const REVISIT_GAP = 15 * 60000;
  function addVisit(l) {
    const now = NOW().getTime();
    if (now - l.visits[l.visits.length - 1] < REVISIT_GAP) return false;
    l.visits.push(now);
    return true;
  }

  // ------------------------------------------------------------------
  // 5. Next-step rules
  //    The machine proposes; a person's choice always wins (principle 7).
  // ------------------------------------------------------------------

  function suggestNext(l, now) {
    if (l.status === 'won') return { label: 'נסגרה עסקה', due: null, kind: 'done' };
    if (l.status === 'lost') return { label: 'לא רלוונטי', due: null, kind: 'done' };
    if (l.status === 'audience') return { label: 'בקהל', due: null, kind: 'audience' };
    if (!l.warmth) return { label: 'לתייג בערב', due: null, kind: 'tag' };
    if (l.warmth === 'cold') return S.business.keepAudience ? { label: 'לקהל, בלי משימה', due: null, kind: 'audience' } : { label: 'בלי משימה', due: null, kind: 'done' };
    const created = new Date(l.createdAt);
    if (l.warmth === 'hot') return { label: tpl().hot, due: daysFrom(created, 1, 10).getTime(), kind: 'task' };
    return { label: 'להתקשר', due: daysFrom(created, 3, 10).getTime(), kind: 'task' };
  }
  const nextOf = (l) => l.next || suggestNext(l, NOW());

  /* The next step is chosen from buttons, not cycled through. "לפי המערכת" is the
   * machine's own proposal; anything else is the person's word and outranks it. */
  const NEXT_OPTIONS = [
    { key: 'auto', label: 'לפי המערכת' },
    { key: 'today', label: 'היום', days: 0 },
    { key: 'tomorrow', label: 'מחר', days: 1 },
    { key: 'week', label: 'בעוד שבוע', days: 7 },
    { key: 'audience', label: 'לקהל, בלי משימה', audience: true },
  ];
  const isCurrentNext = (l, o) => (o.key === 'auto' ? !l.next : !!l.next && l.next.key === o.key);

  /** After a call: record it and schedule what comes next. */
  function recordOutcome(l, outcome, at) {
    const now = at || NOW();
    l.calls.push({ at: now.getTime(), outcome });
    if (outcome === 'won') { l.status = 'won'; l.next = { label: 'נסגרה עסקה', due: null, kind: 'done' }; }
    else if (outcome === 'lost') { l.status = 'lost'; l.next = { label: 'לא רלוונטי', due: null, kind: 'done' }; }
    else if (outcome === 'meeting') { l.next = { label: 'פגישה', due: daysFrom(now, 2, 18).getTime(), kind: 'task', by: 'machine' }; }
    else if (outcome === 'quote') { l.next = { label: 'לבדוק מה עם ההצעה', due: daysFrom(now, 3, 10).getTime(), kind: 'task', by: 'machine' }; }
    else if (outcome === 'noanswer') {
      const tries = l.calls.filter((c) => c.outcome === 'noanswer').length;
      if (tries >= 3) { l.status = 'audience'; l.next = { label: 'לא ענה 3 פעמים, עבר לקהל', due: null, kind: 'audience' }; }
      else l.next = { label: 'לנסות שוב (' + (tries + 1) + ')', due: daysFrom(now, 1, 11).getTime(), kind: 'task', by: 'machine' };
    }
  }

  function whyNow(l, now) {
    const r = [];
    if (l.warmth === 'hot') r.push(warmthName('hot'));
    if (leadSize(l) >= SIZE_RANK.l) r.push('עסקה גדולה');
    if (l.ask) r.push(tpl().ask ? tpl().ask.label + ': ' + l.ask : l.ask);
    if (l.interests.length) r.push('התעניין ב' + l.interests.join(', '));
    if (l.visits.length > 1) r.push('חזר לדוכן ' + l.visits.length + ' פעמים');
    if (l.when === 'עכשיו') r.push('צריך עכשיו');
    const days = Math.floor((dayStart(now) - dayStart(new Date(l.createdAt))) / DAY);
    if (days >= 2) r.push('מחכה ' + days + ' ימים');
    else if (days === 1) r.push('מאתמול');
    return r.join(' · ');
  }

  function todaysCalls(now) {
    const end = dayStart(now).getTime() + DAY;
    return S.leads
      .filter((l) => l.status === 'open' && nextOf(l).kind === 'task' && nextOf(l).due && nextOf(l).due < end)
      .sort((a, b) => rank(b) - rank(a) || a.createdAt - b.createdAt)
      .slice(0, 8);
  }
  /** What each lead is worth, from the sizes set once at home: this is what the
   *  sizes buy — a kitchen outranks a bookshelf without anyone marking it. */
  function leadSize(l) {
    let best = 0;
    l.interests.forEach((name) => {
      const o = S.business.offerings.find((x) => x.name === name);
      if (o) best = Math.max(best, SIZE_RANK[o.size] || 0);
    });
    return best;
  }
  function rank(l) {
    return (l.warmth === 'hot' ? 100 : 0) + leadSize(l) * 6 + (l.ask ? 20 : 0)
      + (l.when === 'עכשיו' ? 15 : 0) + (l.visits.length > 1 ? 10 : 0) + l.interests.length;
  }

  // ------------------------------------------------------------------
  // 6. Views
  // ------------------------------------------------------------------

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const main = () => $('#main');

  // ---------------- Setup ----------------
  /* Settings, in three layers. Layer one is a question, layer two is an approval
   * of what the trade library already filled in, and layer three is folded away.
   * Same abilities on the tablet and on the computer — only the presentation
   * differs — because an exhibitor may well register at the last minute, on the
   * tablet, standing at his booth. */
  let advOpen = '';   // which advanced section is open

  function viewSetup() {
    const b = S.business;
    if (!b.registered) return viewRegister();
    const t = tradeById(b.trade);
    main().innerHTML = `
      <div class="setup">
        <div class="section-head"><div>
          <h1>הגדרות העסק</h1>
          <p class="lead-text">הכול כבר ממולא לפי התחום שבחרת. לעבור, לתקן מה שלא מדויק, וזהו.</p>
        </div><button class="btn" data-act="setup-done">✓ שמור, חזרה לדוכן</button></div>

        <section class="step">
          <div class="step-head"><h2>העסק</h2></div>
          <div class="field-row">
            <label class="field"><span class="field-label">שם העסק</span>
              <input id="biz-name" class="text-input" value="${esc(b.name)}" autocomplete="off"></label>
            <label class="field"><span class="field-label">תחום</span>
              <select id="biz-trade" class="text-input">
                ${TRADES.map((x) => `<option value="${x.id}" ${b.trade === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
              </select></label>
          </div>
          <p class="optional">שינוי התחום מציע מחדש את התבנית והמוצרים. מה שערכת ידנית לא יידרס בלי אישור.</p>
        </section>

        <section class="step">
          <div class="step-head"><h2>איך אתה סוגר עסקה</h2>
            <span class="optional">קובע מה נשאל בדוכן ותוך כמה זמן להזכיר</span></div>
          <div class="templates">
            ${Object.entries(TEMPLATES).map(([k, tp]) => `
              <button class="tpl" data-tpl="${k}" aria-pressed="${b.template === k}">
                <b>${esc(tp.name)}</b><small>${esc(tp.example)}</small>
                <small>${tp.ask ? 'שואל גם: ' + esc(tp.ask.label) : 'בלי שאלה נוספת'}</small>
              </button>`).join('')}
          </div>
        </section>

        <section class="step">
          <div class="step-head"><h2>מה אתה מציע</h2>
            <span class="optional">אלה הכפתורים שתיגע בהם בדוכן</span></div>
          <div class="offer-list">
            ${b.offerings.length ? b.offerings.map((o, i) => `
              <div class="offer-row">
                <input class="text-input" data-offname="${i}" value="${esc(o.name)}" aria-label="שם המוצר">
                <div class="chips sizes">
                  ${Object.entries(SIZES).map(([k, lbl]) => `<button class="chip small" data-offsize="${i}" data-size="${k}" aria-pressed="${o.size === k}">${lbl}</button>`).join('')}
                </div>
                <button class="icon-btn" data-offdel="${i}" aria-label="להסיר">✕</button>
              </div>`).join('')
              : '<p class="empty-hint">אין עדיין מוצרים. אפשר להוסיף, או לבחור תחום ולקבל הצעה.</p>'}
          </div>
          <div class="inline">
            <input id="new-offer" class="text-input" placeholder="להוסיף משהו משלך" autocomplete="off">
            <button class="btn" data-act="add-offer">הוספה</button>
            ${t.offers.length ? `<button class="btn ghost" data-act="reset-offers">להחזיר את ההצעה של ${esc(t.name)}</button>` : ''}
          </div>
          <p class="optional"><b>הגודל קובע מי חשוב יותר.</b> מטבח גדול עולה מעל ספרייה קטנה בלי שתסמן כלום.</p>
        </section>

        <h2 class="adv-title">הגדרות מתקדמות</h2>
        <p class="lead-text">שום דבר כאן אינו חובה. ליד כל אחת כתוב מה היא קונה.</p>
        <div class="adv">
          ${advSection('grades', 'שמות הדרגות', '"חם / פושר / קר" לא מתאים לכל עסק. אצלך אולי "רציני / אולי / רק עבר".', `
            <div class="field-row">
              ${['hot', 'warm', 'cold'].map((k) => `<label class="field"><span class="field-label">${esc(WARMTH_DEFAULT[k])}</span>
                <input class="text-input" data-grade="${k}" value="${esc(warmthName(k))}" autocomplete="off"></label>`).join('')}
            </div>
            <button class="btn ghost" data-act="grades-reset">להחזיר לברירת המחדל</button>`)}

          ${advSection('devices', 'המכשירים שלי', 'כמה טאבלטים על אותו דוכן, כולם רואים את אותם לידים.', `
            <p class="pair-code">קוד חיבור: <b class="num">${pairCode()}</b></p>
            <p class="optional">בטאבלט חדש מקלידים את הקוד פעם אחת, ונותנים למכשיר שם.</p>
            <div class="rows">${(b.devices.length ? b.devices : [{ name: 'המכשיר הזה', here: true }]).map((dv) => `
              <div class="row"><span>${esc(dv.name)}${dv.here ? ' <span class="badge">כאן</span>' : ''}</span>
                <span class="row-side">${dv.here ? 'מחובר' : 'לא מחובר'}</span></div>`).join('')}</div>
            <div class="inline"><input id="dev-name" class="text-input" placeholder="שם למכשיר הזה, למשל: טאבלט ימין">
              <button class="btn" data-act="name-device">שמירה</button></div>
            <p class="optional">⚠️ בדוגמית אין סנכרון אמיתי בין מכשירים. זה דורש שרת.</p>`)}

          ${advSection('material', 'חומר לשליחה', 'כשמבקר מבקש קטלוג, שולחים בנגיעה במקום להעתיק מספר.', `
            <div class="inline">
              <label class="btn" for="catalog">${b.catalog ? '📎 ' + esc(b.catalog) : 'להעלות קטלוג או מחירון'}</label>
              <input id="catalog" type="file" hidden>
              ${b.catalog ? '<button class="btn ghost" data-act="catalog-clear">להסיר</button>' : ''}
            </div>
            <label class="field"><span class="field-label">המשפט שנשלח איתו</span>
              <textarea id="cat-msg">${esc(b.catalogMessage)}</textarea></label>
            <p class="optional">נשלח רק למי שביקש ממך, ורק כשתיגע. המערכת לא פונה לאף אחד מעצמה.
              <b>באיזה ערוץ — ב"ערוצי שליחה" למטה.</b></p>`)}

          ${advSection('channels', 'ערוצי שליחה', 'איך החומר יוצא: פותח לך את האפליקציה, או נשלח לבד.',
            Object.keys(CHANNELS).map(channelCard).join(''))}

          ${advSection('audience', 'קהל ועונה', 'מי שהתעניין בלי צורך עכשיו נשמר, והמערכת תזכיר לך בעונה שלך.', `
            <label class="check"><input id="keep-aud" type="checkbox" ${b.keepAudience ? 'checked' : ''}>
              לשמור גם את מי שאינו לקוח עכשיו</label>
            <label class="field"><span class="field-label">מתי העונה החזקה שלך</span>
              <input id="season" class="text-input" value="${esc(b.season)}" placeholder="למשל: לפני פסח, בין הזמנים, עונת החתונות"></label>`)}
        </div>
      </div>`;
    bindSetup();
  }

  /** One channel, and the engines it can run on. Same shape for all three, so a
   *  new engine is a row in CHANNELS and nothing here changes. */
  function channelCard(kind) {
    const ch = CHANNELS[kind];
    const conf = channelConf(kind);
    const eng = engineOf(kind);
    const fields = (eng.fields || []).map(([key, label, hint]) => `
      <label class="field"><span class="field-label">${esc(label)}</span>
        <input class="text-input" data-cfield="${kind}" data-key="${key}"
               value="${esc(conf[key] || '')}" autocomplete="off">
        ${hint ? `<small class="optional">${esc(hint)}</small>` : ''}</label>`).join('');
    return `<div class="chan-card">
      <div class="chan-head"><b>${ch.icon} ${esc(ch.name)}</b>
        ${ch.warnNote ? `<small class="chan-warn">${esc(ch.warnNote)}</small>` : ''}</div>
      <div class="chan-engines">
        ${Object.entries(ch.engines).map(([k, e]) => `
          <button class="chan-opt" data-engine="${kind}" data-eng="${k}" aria-pressed="${conf.engine === k}">
            <b>${esc(e.name)}${e.warn ? ' ⚠️' : ''}</b>
            ${e.note ? `<small>${esc(e.note)}</small>` : ''}
            ${e.needs && e.needs.server ? '<small class="needs">דורש שרת</small>' : ''}
          </button>`).join('')}
      </div>
      ${fields ? `<div class="chan-fields">${fields}</div>` : ''}
      ${eng.warn ? (conf.signed
        ? `<p class="signed">✓ האזהרה אושרה על ידי ${esc(conf.signed)}. <button class="btn ghost small" data-act="unsign" data-kind="${kind}">לבטל את החיבור</button></p>`
        : `<p class="warn-line">⚠️ החיבור הזה לא יפעל עד שתקרא ותאשר.
             <button class="btn" data-act="sign" data-kind="${kind}">לקרוא ולאשר</button></p>`) : ''}
    </div>`;
  }

  /** Not a formality. On the day a number is blocked, this is what shows the
   *  exhibitor was told first — and in a community this small, that matters more
   *  than the feature does. */
  function signModal(kind) {
    modal(`<h2>חיבור ${esc(CHANNELS[kind].name)} — חשוב לקרוא</h2>
      <div class="warn-box">
        <p>החיבור הזה <b>אינו דרך הממשק הרשמי</b> של ${esc(CHANNELS[kind].name)}.</p>
        <p><b>ייתכן שהמספר שלך ייחסם, זמנית או לצמיתות</b>, וייתכן שתאבד גישה לוואטסאפ העסקי שלך.</p>
        <p>המערכת שולחת רק למי שביקש ממך, ורק בנגיעה שלך, ואינה שולחת לרשימות.
           זה מקטין מאוד את הסיכון — <b>אך אינו מבטל אותו.</b></p>
        <p><b>האחריות על המספר היא שלך בלבד.</b></p>
      </div>
      <label class="field"><span class="field-label">השם שלי, כאישור שקראתי</span>
        <input id="sign-name" class="text-input" value="${esc(S.business.name || '')}" autocomplete="off"></label>
      <div class="inline">
        <button class="btn primary" data-act="sign-yes" data-kind="${kind}">קראתי, הבנתי, ואני מאשר</button>
        <button class="btn ghost" data-act="close-modal">לא עכשיו</button></div>`);
  }

  function advSection(id, title, buys, body) {
    const open = advOpen === id;
    return `<section class="adv-card ${open ? 'open' : ''}">
      <button class="adv-head" data-adv="${id}" aria-expanded="${open}">
        <span><b>${esc(title)}</b><small>${esc(buys)}</small></span><span class="adv-mark">${open ? '−' : '+'}</span>
      </button>
      ${open ? `<div class="adv-body">${body}</div>` : ''}
    </section>`;
  }

  /** A stable-looking code for the demo, derived from the business name. */
  function pairCode() {
    const s = (S.business.name || 'expo');
    let n = 0;
    for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
    return String(100000 + (n % 900000));
  }

  function viewRegister() {
    main().innerHTML = `
      <div class="welcome">
        <div class="welcome-card">
          <div class="welcome-kicker">הרשמה</div>
          <h1>שתי שאלות, וסיימנו</h1>
          <p class="lead-text">לפי התחום נמלא לך מראש את התבנית ואת המוצרים. תוכל לתקן הכול אחר כך.</p>
          <label class="field"><span class="field-label">שם העסק</span>
            <input id="reg-name" class="text-input" placeholder="למשל: נגריית הדר" autocomplete="off"></label>
          <div>
            <span class="field-label">התחום</span>
            <div class="trade-grid">
              ${TRADES.map((t) => `<button class="tpl" data-regtrade="${t.id}">${esc(t.name)}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    setTimeout(() => $('#reg-name') && $('#reg-name').focus(), 30);
  }

  /** Applying a trade fills in what has not been touched by hand. */
  function applyTrade(id, force) {
    const t = tradeById(id);
    const b = S.business;
    b.trade = id;
    if (force || !b.offerings.length) {
      b.template = t.template;
      b.offerings = t.offers.map(([name, size]) => ({ name, size }));
    }
    save();
  }

  function bindSetup() {
    const b = S.business;
    const on = (sel, ev, fn) => { const el = $(sel); if (el) el.addEventListener(ev, fn); };
    on('#biz-name', 'input', (e) => { b.name = e.target.value; save(); renderTopbar(); });
    on('#biz-trade', 'change', (e) => { applyTrade(e.target.value, true); viewSetup(); });
    on('#catalog', 'change', (e) => { const f = e.target.files[0]; if (f) { b.catalog = f.name; save(); viewSetup(); } });
    on('#cat-msg', 'input', (e) => { b.catalogMessage = e.target.value; save(); });
    on('#keep-aud', 'change', (e) => { b.keepAudience = e.target.checked; save(); });
    on('#season', 'input', (e) => { b.season = e.target.value; save(); });
    on('#new-offer', 'keydown', (e) => { if (e.key === 'Enter') addOffer(); });
    document.querySelectorAll('[data-offname]').forEach((el) => {
      el.addEventListener('input', () => {
        const o = b.offerings[parseInt(el.dataset.offname, 10)];
        if (o) { o.name = el.value; save(); }
      });
    });
    document.querySelectorAll('[data-cfield]').forEach((el) => {
      el.addEventListener('input', () => { channelConf(el.dataset.cfield)[el.dataset.key] = el.value.trim(); save(); });
    });
    document.querySelectorAll('[data-grade]').forEach((el) => {
      el.addEventListener('input', () => {
        b.warmthNames = b.warmthNames || {};
        b.warmthNames[el.dataset.grade] = el.value.trim() || WARMTH_DEFAULT[el.dataset.grade];
        save();
      });
    });
  }

  function addOffer() {
    const el = $('#new-offer');
    const v = el ? el.value.trim() : '';
    if (!v) return;
    if (!S.business.offerings.some((o) => o.name === v) && S.business.offerings.length < 8) {
      S.business.offerings.push({ name: v, size: 'm' });
    }
    save(); viewSetup();
  }

  // ---------------- Booth ----------------
  let openLeadId = null;
  let moreOpenId = null;  // which lead has its extra fields open
  let eveId = null;       // the lead being worked on in the evening
  let idleTimer = null;
  let countTimer = null;
  let lastAction = null;
  let lastQuery = '';   // what was typed, so a wrong tap can go straight back to it
  /* How long the panel waits before going back to search. The lead is saved the
   * moment the name is tapped, so this is only about the screen, never the data.
   * The wait follows what the exhibitor is doing: done means gone, busy means wait. */
  const IDLE_DONE = 5000;    // the name was tapped and nothing else: he is finished
  const IDLE_BUSY = 8000;    // warmth or an interest was tapped: he may add more
  const IDLE_DEEP = 15000;   // the extra fields are open: this is a lead worth detail
  const NOTE_IDLE_MS = 25000; // a note is being written, counted from the last keystroke
  function idleMs() {
    const l = leadById(openLeadId);
    if (moreOpenId && moreOpenId === openLeadId) return IDLE_DEEP;
    if (l && (l.warmth || l.interests.length || l.sendMaterial)) return IDLE_BUSY;
    return IDLE_DONE;
  }

  function viewBooth() {
    if (!S.boothEnteredAt) { S.boothEnteredAt = Date.now(); save(); }
    const waiting = S.leads.filter((l) => !l.touched && l.status === 'open');
    main().innerHTML = `
      <div class="booth">
        <div class="search-wrap">
          <input id="q" class="search" type="search" placeholder="שם של מי שעומד מולך…" autocomplete="off" aria-label="חיפוש מבקר">
          <div class="search-actions">
            <button class="icon-btn" data-act="new-person" title="מי שלא ברשימה">+ חדש</button>
          </div>
        </div>
        ${waiting.length ? `
          <div class="waiting" role="status">
            <span class="waiting-label">חייגו לדוכן, ממתינים לתיוג:</span><span class="optional">(בדוגמית: מהתפריט ⋯)</span>
            ${waiting.map((l) => `<button class="r-chip" data-open="${l.id}">${esc(leadName(l))} <span class="num" style="color:var(--faint)">${hhmm(new Date(l.createdAt))}</span></button>`).join('')}
          </div>` : ''}
        <div id="slot"></div>
      </div>`;
    const q = $('#q');
    q.value = lastQuery;
    q.addEventListener('input', () => {
      lastQuery = q.value; openLeadId = null; stopIdle();
      renderResults(q.value);
      renderRecent();   // the strip steps aside while results are on screen
    });
    renderRecent();
    if (openLeadId && leadById(openLeadId)) renderPanel();
    else { renderResults(lastQuery); q.focus(); }
    renderNav();
  }

  /** Wrong name tapped: undo it and go straight back to the same search. */
  function wrongPerson() {
    stopIdle();
    const l = leadById(openLeadId);
    const act = lastAction && l && lastAction.id === l.id ? lastAction : null;
    openLeadId = null;
    lastAction = null;
    if (act && act.type === 'create') S.leads = S.leads.filter((x) => x.id !== act.id);
    else if (l) { if (l.visits.length > 1) l.visits.pop(); l.touched = false; }
    save();
    viewBooth();
    const q = $('#q');
    if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }

  function renderResults(query) {
    const slot = $('#slot');
    if (!slot) return;
    if (!norm(query)) {
      const total = S.leads.filter((l) => dayStart(new Date(l.createdAt)).getTime() === dayStart(EXPO_DAY).getTime()).length;
      slot.innerHTML = `<div class="empty-hint">שתיים-שלוש אותיות מהשם מספיקות.<br>${total ? `<span class="num">${total}</span> אנשים נקלטו היום.` : ''}</div>`;
      return;
    }
    // Six fit above the bottom bar on a tablet without scrolling. A result that
    // needs a scroll to reach is a result the thumb misses.
    const { hits, total } = search(query, 6);
    if (!hits.length) {
      slot.innerHTML = `<div class="empty-hint">לא נמצא ברשימה. <button class="btn" data-act="new-person" style="margin-inline-start:8px">להוסיף כחדש</button></div>`;
      return;
    }
    slot.innerHTML = `<div class="results">${hits.map(({ i, variant }) => {
      const p = person(i);
      const existing = S.leads.find((l) => l.pid === i);
      return `<button class="result" data-pick="${i}">
        <span>
          <span class="person-main"><span class="person-title">${esc(p[0])}</span><span class="person-name">${esc(fullName(p))}</span><span class="person-city">${esc(p[5])}</span></span>
          <span class="person-meta">${esc(metaLine(p))}</span>
        </span>
        <span class="badges">
          ${variant ? `<span class="badge spell">כתיב אחר</span>` : ''}
          ${existing ? `<span class="badge again">ביקר כבר</span>` : ''}
        </span>
      </button>`;
    }).join('')}${total > hits.length ? `<div class="results-more">ועוד ${total - hits.length}. להקליד עוד אות או את העיר.</div>` : ''}</div>`;
  }

  function pickPerson(i) {
    const t = $('#toast'); if (t) t.remove();   // an old toast must not undo this new pick
    let l = S.leads.find((x) => x.pid === i);
    if (l) {
      addVisit(l);
      lastAction = null;                        // only a brand-new capture can be undone
    } else {
      l = newLead({ pid: i, source: 'search' });
      lastAction = { type: 'create', id: l.id };
    }
    l.touched = true;
    save();
    openLead(l.id, true);
  }

  /** keepAction: the caller has just set lastAction for this lead. Reopening from a chip never offers undo. */
  function openLead(id, keepAction) {
    if (!keepAction) lastAction = null;
    openLeadId = id;
    const l = leadById(id);
    // Leads that already carry detail open with the extra fields showing.
    moreOpenId = l && (l.ask || l.when || l.note) ? l.id : null;
    if (l && !l.touched) { l.touched = true; save(); }
    viewBooth();
  }

  function renderPanel() {
    const l = leadById(openLeadId);
    const slot = $('#slot');
    if (!l || !slot) return;
    const t = tpl();
    const nx = nextOf(l);
    const again = l.visits.length > 1;
    slot.innerHTML = `
      <section class="panel" aria-label="פרטי המבקר">
        <div class="panel-head">
          <div>
            <div class="person-main"><span class="person-name">${esc(leadName(l))}</span><span class="person-city">${esc(leadTown(l))}</span>
              ${again ? `<span class="badge again">ביקור ${l.visits.length}, קודם ב-${hhmm(new Date(l.visits[l.visits.length - 2]))}</span>` : ''}</div>
            <div class="person-meta">${esc(leadMeta(l))}</div>
            <div class="saved-note">✓ נשמר. כל השאר רשות</div>
          </div>
          <div class="panel-timer">
            <button class="btn cancel" data-act="wrong">✕ ביטול</button>
            <button class="btn ghost" data-act="close-now">✓ סיום</button>
            <div class="ring running" id="ring" style="--ring-ms:${idleMs()}ms" title="חוזר לחיפוש לבד. כל נגיעה מאריכה">
              <svg width="44" height="44" viewBox="0 0 44 44"><circle class="track" cx="22" cy="22" r="18"/><circle class="bar" cx="22" cy="22" r="18"/></svg>
              <span id="ring-n">${Math.round(idleMs() / 1000)}</span>
            </div>
          </div>
        </div>
        ${editFields(l)}
      </section>`;
    const note = $('[data-note]');
    if (note) {
      // While writing, the clock waits longer, but never forever: from the last keystroke.
      note.addEventListener('focus', () => pauseIdle(NOTE_IDLE_MS));
      note.addEventListener('blur', () => startIdle());
    }
    startIdle();
  }

  /** The same fields wherever a lead is edited: the booth, the evening, the day after.
   *  Every control carries its lead id, so no screen needs its own copy of the logic. */
  function editFields(l) {
    const t = tpl();
    const open = moreOpenId === l.id;
    return `
      <div class="warmth" role="group" aria-label="כמה חם">
        ${Object.entries(WARMTH).map(([k, v]) => `<button class="w-btn ${k}" data-warm="${k}" data-id="${l.id}" aria-pressed="${l.warmth === k}">${k === 'hot' ? '🔥 ' : ''}${v}</button>`).join('')}
      </div>
      ${S.business.offerings.length ? `
        <div><div class="field-label">מה עניין אותו</div>
        <div class="chips">${S.business.offerings.map((o) => `<button class="chip" data-int="${esc(o.name)}" data-id="${l.id}" aria-pressed="${l.interests.includes(o.name)}">${esc(o.name)}</button>`).join('')}</div></div>` : ''}
      <div class="inline">
        <button class="more-toggle" data-act="more" data-id="${l.id}" aria-expanded="${open}">${open ? '− פחות' : '+ עוד: ' + [t.ask ? t.ask.label : null, 'מתי', 'הערה'].filter(Boolean).join(' · ')}</button>
        ${S.business.catalog ? `<button class="chip" data-act="send" data-id="${l.id}" aria-pressed="${l.sendMaterial}">📎 ${l.sendMaterial ? 'החומר יישלח' : 'שלח חומר'}</button>` : ''}
      </div>
      ${open ? `
        <div class="more">
          ${t.ask ? `<div><div class="field-label">${esc(t.ask.label)}</div><div class="chips">${t.ask.options.map((o) => `<button class="chip" data-ask="${esc(o)}" data-id="${l.id}" aria-pressed="${l.ask === o}">${esc(o)}</button>`).join('')}</div></div>` : ''}
          <div><div class="field-label">מתי זה רלוונטי</div><div class="chips">${WHEN_OPTIONS.map((o) => `<button class="chip" data-when="${esc(o)}" data-id="${l.id}" aria-pressed="${l.when === o}">${esc(o)}</button>`).join('')}</div></div>
          <div><label class="field-label" for="note-${l.id}">הערה</label><textarea id="note-${l.id}" data-note="${l.id}" placeholder="למשל: חידוש כל הריהוט במוסד, רוצה שאבוא למדוד">${esc(l.note)}</textarea></div>
        </div>` : ''}
      ${nextBlock(l)}
      ${leadActions(l)}
      ${leadHistory(l)}`;
  }

  const leadPhone = (l) => (l.custom && l.custom.phone) || '';

  /** What can be done with a lead right now: call, write, or remove it. */
  function leadActions(l) {
    const phone = leadPhone(l);
    // Only a number that really looks Israeli becomes an international one. A
    // mistyped number must not open a chat with a stranger somewhere else.
    const digits = phone.replace(/\D/g, '');
    const intl = /^0\d{8,9}$/.test(digits) ? '972' + digits.slice(1)
      : /^972\d{8,9}$/.test(digits) ? digits : '';
    // The number itself is shown as text and can always be copied. The dialling
    // links are a convenience: inside a demo page the browser often refuses them,
    // and a button that quietly does nothing is worse than no button.
    return `
      <div class="lead-actions">
        ${phone ? `<span class="phone-line num">${esc(phone)}</span>
          <button class="btn" data-act="copy-phone" data-id="${l.id}">העתקה</button>
          <a class="btn primary" href="tel:${esc(phone)}">📞 חיוג</a>
          ${intl ? `<a class="btn" href="https://wa.me/${esc(intl)}" target="_blank" rel="noopener">וואטסאפ</a>` : ''}`
          : `<span class="optional">אין טלפון${l.pid != null ? ', וברשימת המארגנים אין מספרים' : ''}.</span>
          <button class="btn" data-act="add-phone" data-id="${l.id}">להוסיף טלפון</button>`}
        <button class="btn ghost danger" data-act="del-lead" data-id="${l.id}">מחיקה</button>
      </div>`;
  }

  /** What already happened with this lead, newest last. */
  function leadHistory(l) {
    const rows = [];
    l.visits.forEach((v, i) => rows.push({ at: v, what: i === 0 ? 'הגיע לדוכן' : 'חזר לדוכן' }));
    (l.calls || []).forEach((c) => rows.push({ at: c.at, what: OUTCOME_LABEL[c.outcome] || 'שיחה' }));
    if (!rows.length) return '';
    rows.sort((a, b) => a.at - b.at);
    return `<details class="history"><summary>מה היה עד עכשיו (${rows.length})</summary>
      <ul>${rows.map((r) => `<li><span class="num">${esc(hebDate(new Date(r.at)).split(', ')[1] || '')} ${hhmm(new Date(r.at))}</span> · ${esc(r.what)}</li>`).join('')}</ul></details>`;
  }
  const OUTCOME_LABEL = {
    meeting: 'נקבעה פגישה', quote: 'נשלחה הצעה', won: 'נסגרה עסקה', noanswer: 'לא ענה', lost: 'לא רלוונטי',
  };

  /** The next step, as buttons, on every screen where a lead is open. */
  function nextBlock(l) {
    const nx = nextOf(l);
    return `
      <div class="next-block">
        <div class="field-label">הצעד הבא</div>
        <div class="chips">${NEXT_OPTIONS.map((o) => `<button class="chip" data-next="${o.key}" data-id="${l.id}" aria-pressed="${isCurrentNext(l, o)}">${esc(o.label)}</button>`).join('')}</div>
        <div class="next-line"><span>${esc(nx.label)}${nx.due ? ' · ' + esc(relDay(new Date(nx.due), NOW())) : ''}${l.next ? '' : ' <span class="optional">(הצעה של המערכת)</span>'}</span></div>
      </div>`;
  }

  /** Redraw whichever screen is showing, after a field was edited. On the day-after
   *  screen the edited lead is pinned, so it cannot slip out from under the finger
   *  when the change reorders the list. */
  const isTopCall = (l) => { const c = todaysCalls(NOW()); return !!c.length && c[0].id === l.id; };

  function rerender(l) {
    if (S.screen === 'booth' && openLeadId) return renderPanel();
    // Pin only a lead opened from the list, never the card already on screen:
    // pinning that one would drop its place in today's queue mid-edit.
    if (S.screen === 'crm' && l && focusLead == null && callStep == null && !isTopCall(l)) focusLead = l.id;
    return render();
  }

  function startIdle(ms) {
    stopIdle();
    const total = ms || idleMs();
    const ring = $('#ring');
    if (ring) {
      ring.style.setProperty('--ring-ms', total + 'ms');
      ring.classList.remove('running', 'soon'); void ring.offsetWidth; ring.classList.add('running');
    }
    const until = Date.now() + total;
    countTick(until);
    countTimer = setInterval(() => countTick(until), 250);
    idleTimer = setTimeout(closePanel, total);
  }
  /** The number in the ring is the honest one: it counts the seconds that are actually left. */
  function countTick(until) {
    const n = $('#ring-n');
    if (!n) return;
    const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    n.textContent = left;
    const ring = $('#ring');
    if (ring) ring.classList.toggle('soon', left <= 4);
  }
  const pauseIdle = (ms) => startIdle(ms);
  function stopIdle() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    if (countTimer) { clearInterval(countTimer); countTimer = null; }
  }

  function closePanel() {
    stopIdle();
    const l = leadById(openLeadId);
    openLeadId = null;
    if (S.screen !== 'booth') return;
    // Saved and done, so the box is cleared and the next name can be typed straight
    // away. The typed text is kept only when the pick is taken back ("לא זה").
    lastQuery = '';
    viewBooth();
    if (l) {
      // The toast carries its own action, so a later pick can never be undone by an earlier toast.
      const act = lastAction && lastAction.id === l.id && lastAction.type === 'create' ? lastAction : null;
      lastAction = null;
      toast('✓ נשמר: ' + leadName(l) + (l.warmth ? ' · ' + WARMTH[l.warmth] : ''), act ? 'ביטול' : null, act ? () => undo(act) : null);
    }
  }

  function undo(act) {
    if (!act || act.type !== 'create') return;
    S.leads = S.leads.filter((x) => x.id !== act.id);
    if (openLeadId === act.id) { openLeadId = null; stopIdle(); }
    save(); render();
    toast('בוטל');
  }

  function renderRecent() {
    let bar = $('#recent');
    // The strip is for the quiet moments. While a search is on screen or a
    // visitor is open, it would sit over the results and swallow the tap.
    if (S.screen !== 'booth' || lastQuery || openLeadId) { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'recent'; bar.className = 'recent'; document.body.appendChild(bar); }
    const recent = S.leads.slice().sort((a, b) => b.visits[b.visits.length - 1] - a.visits[a.visits.length - 1]).slice(0, 10);
    bar.innerHTML = `<div class="recent-inner"><span class="recent-label">אחרונים</span>${recent.length ? recent.map((l) => `
      <button class="r-chip" data-open="${l.id}"><span class="w-dot ${l.warmth || ''}"></span>${esc(leadName(l))}${l.visits.length > 1 ? ' ↺' : ''}</button>`).join('')
      + `<button class="r-chip" data-screen="leads">כל מי שהיה אצלי ←</button>` : '<span class="optional">עוד אין. מי שייקלט יופיע כאן.</span>'}</div>`;
  }

  function newPersonModal() {
    stopIdle();
    const q = $('#q') ? $('#q').value.trim().split(/\s+/) : [];
    modal(`
      <h2>מבקר שלא ברשימה</h2>
      <label><span class="field-label">שם פרטי</span><input id="np-first" class="text-input" value="${esc(q[0] || '')}" autocomplete="off"></label>
      <label><span class="field-label">שם משפחה</span><input id="np-last" class="text-input" value="${esc(q.slice(1).join(' '))}" autocomplete="off"></label>
      <label><span class="field-label">עיר <span class="optional">רשות</span></span><input id="np-town" class="text-input" autocomplete="off"></label>
      <label><span class="field-label">טלפון <span class="optional">כדי לחזור אליו. בדוגמית נשמר רק במכשיר הזה</span></span><input id="np-phone" class="text-input num" inputmode="tel" autocomplete="off"></label>
      <div class="inline"><button class="btn primary" data-act="np-save">שמירה</button><button class="btn ghost" data-act="close-modal">ביטול</button></div>`);
    setTimeout(() => $('#np-first') && $('#np-first').focus(), 30);
  }
  function saveNewPerson() {
    const first = $('#np-first').value.trim();
    const last = $('#np-last').value.trim();
    if (!first && !last) { $('#np-first').focus(); return; }
    const l = newLead({ source: 'new', custom: { first, last, town: $('#np-town').value.trim(), phone: $('#np-phone').value.trim() } });
    l.touched = true;
    lastAction = { type: 'create', id: l.id };
    save(); closeModal(false); openLead(l.id, true);
  }

  function simulateDial() {
    let i;
    for (let tries = 0; tries < 50; tries++) {
      i = Math.floor(Math.random() * PEOPLE.length);
      if (!isWoman(person(i))) break;
    }
    const existing = S.leads.find((l) => l.pid === i);
    if (existing) { addVisit(existing); existing.touched = false; }
    else newLead({ pid: i, source: 'dial' });
    save();
    toast('📞 ' + fullName(person(i)) + ' חייג לדוכן. מחכה לתיוג, מתי שנוח.');
    // The dial is reachable from every screen, so it must not paint the booth
    // over the one that is open.
    if (S.screen !== 'booth') return renderNav();
    if (!openLeadId) viewBooth(); else renderRecent();
  }

  // ---------------- Evening ----------------
  /* "מי היה אצלי" — not only for the evening. This is where every visitor who came
   * to the booth can be found at any time, opened and changed. */
  let leadsFilter = 'todo';
  let leadsQuery = '';
  let leadsWarmth = '';     // '' = all, or hot / warm / cold
  let leadsSort = 'time';   // 'time' = newest first, 'warm' = most promising first
  let eveAutoOpen = true;   // false after the card is closed, so it does not reopen by itself

  /** Searching my own visitors, by name or by phone. */
  function matchLead(l, q) {
    if (!q) return true;
    const digits = q.replace(/\D/g, '');
    if (digits.length >= 3) {
      const phone = (l.custom && l.custom.phone || '').replace(/\D/g, '');
      return phone.includes(digits);
    }
    const hay = norm(leadName(l) + ' ' + leadTown(l) + ' ' + l.interests.join(' ') + ' ' + (l.note || ''));
    const nq = norm(q);
    return hay.includes(nq) || skel(hay).includes(skel(nq));
  }

  function viewEvening() {
    const q = leadsQuery.trim();
    const all = S.leads.slice().sort((a, b) => b.createdAt - a.createdAt).filter((l) => matchLead(l, q));
    const todo = S.leads.filter((l) => l.status === 'open' && !l.warmth).filter((l) => matchLead(l, q));
    if (leadsFilter === 'todo' && !todo.length && !q) leadsFilter = 'all';
    let list = leadsFilter === 'todo' ? todo : all;
    if (leadsWarmth) list = list.filter((l) => l.warmth === leadsWarmth);
    if (leadsSort === 'warm') list = list.slice().sort((a, b) => rank(b) - rank(a));
    const l = (eveId && leadById(eveId)) || (leadsFilter === 'todo' && eveAutoOpen ? todo[0] : null);
    eveId = l ? l.id : null;
    const left = todo.filter((x) => !l || x.id !== l.id).length;

    main().innerHTML = `<div class="stack">
      <div class="section-head"><div><h1>מי היה אצלי</h1>
        <p class="lead-text">כל מי שנקלט בדוכן. אפשר לפתוח כל אחד, לתייג, להוסיף פרטים ולשנות את הצעד הבא, מתי שרוצים.</p></div></div>
      ${S.leads.length ? `<div class="tabs" role="tablist">
        <button class="tab" role="tab" data-lfilter="todo" aria-selected="${leadsFilter === 'todo'}">ממתינים לתיוג <span class="num">(${todo.length})</span></button>
        <button class="tab" role="tab" data-lfilter="all" aria-selected="${leadsFilter === 'all'}">כולם <span class="num">(${all.length})</span></button>
      </div>
      <div class="filters">
        <input id="lq" class="text-input" type="search" placeholder="חיפוש בשם, בעיר, בהערה או בטלפון" value="${esc(leadsQuery)}" aria-label="חיפוש בלידים שלי">
        <div class="chips">
          ${['', 'hot', 'warm', 'cold'].map((w) => `<button class="chip small" data-lwarm="${w}" aria-pressed="${leadsWarmth === w}">${w ? WARMTH[w] : 'הכול'}</button>`).join('')}
          <span class="filters-sep"></span>
          <button class="chip small" data-lsort="${leadsSort === 'time' ? 'warm' : 'time'}">${leadsSort === 'time' ? '↕ לפי שעה' : '↕ לפי חשיבות'}</button>
          <button class="chip small" data-act="export">⇩ ייצוא</button>
        </div>
      </div>` : ''}
      ${l ? `<div class="card">
        <div class="card-count num">${leadsFilter === 'todo' ? (left ? 'נשארו עוד ' + left + ' לתייג' : 'האחרון לתיוג') : 'פתוח לעריכה'}
          <button class="next-btn" data-eve="close">✕ לסגור</button></div>
        <div><div class="person-main"><span class="person-name">${esc(leadName(l))}</span><span class="person-city">${esc(leadTown(l))}</span></div>
          <div class="person-meta">${esc(leadMeta(l))}</div></div>
        <div class="optional">היה בדוכן ב-<span class="num">${hhmm(new Date(l.createdAt))}</span> · ${l.source === 'dial' ? 'חייג' : l.source === 'new' ? 'נוסף ידנית' : 'נקלט בחיפוש'}${l.visits.length > 1 ? ' · חזר ' + l.visits.length + ' פעמים' : ''}</div>
        ${editFields(l)}
        ${leadsFilter === 'todo' ? `<div class="inline">
          <button class="btn primary big" data-eve="next" data-id="${l.id}">${l.warmth ? 'הבא ←' : 'לדלג, לא זוכר'}</button>
          ${l.warmth ? `<button class="btn ghost" data-eve="skip" data-id="${l.id}">לדלג</button>` : ''}
        </div>` : ''}
      </div>` : ''}
      ${!all.length ? `<div class="empty-hint">עוד לא נקלט אף אחד.<br>מי שתקלוט בדוכן יופיע כאן, ויישאר פתוח לעריכה בכל זמן.</div>` : ''}
    </div>
    ${list.length ? `<div class="rows-head optional">${leadsFilter === 'todo' ? 'מי שעוד לא קיבל חום.' : 'הכי אחרון למעלה. נגיעה בשם פותחת אותו לעריכה.'}</div>
    <div class="rows">${list.map((x) => `<button class="row" data-eveopen="${x.id}" ${eveId === x.id ? 'aria-current="true"' : ''}>
      <span><span class="w-dot ${x.warmth || ''}" style="display:inline-block;margin-inline-end:8px"></span><span class="person-name">${esc(leadName(x))}</span> <span class="row-side">${esc(leadTown(x))}</span></span>
      <span class="row-side num">${hhmm(new Date(x.createdAt))}${x.warmth ? ' · ' + WARMTH[x.warmth] : ' · לא תויג'}</span></button>`).join('')}</div>`
      : S.leads.length ? '<div class="empty-hint">אף אחד לא תואם את החיפוש או הסינון.</div>' : ''}`;
    const lq = $('#lq');
    if (lq) {
      lq.addEventListener('input', () => {
        leadsQuery = lq.value;
        const at = lq.selectionStart;
        viewEvening();
        const again = $('#lq');
        if (again) { again.focus(); again.setSelectionRange(at, at); }
      });
    }
    renderNav();
  }

  // ---------------- Today ----------------
  let todayTab = 'todo';
  let crmTab = 'todo';   // 'todo' = the calls, 'summary' = what came of them
  let callStep = null;   // id of the lead whose outcome is being asked
  let focusLead = null;  // a lead tapped in the list takes over the card

  /** The CRM is one screen with two views, not two screens. */
  function viewCrm() {
    (crmTab === 'summary' ? viewDay14 : viewToday)();
    const head = document.createElement('div');
    head.className = 'crm-tabs';
    head.innerHTML = `
      <button class="seg" data-crmtab="todo" aria-pressed="${crmTab === 'todo'}">שיחות לטיפול</button>
      <button class="seg" data-crmtab="summary" aria-pressed="${crmTab === 'summary'}">מה יצא מזה</button>`;
    main().prepend(head);
    renderNav();
  }

  function viewToday() {
    const now = NOW();
    const calls = todaysCalls(now);
    const openTasks = S.leads.filter((l) => l.status === 'open' && nextOf(l).kind === 'task');
    const audience = S.leads.filter((l) => (l.status === 'audience' || (l.status === 'open' && nextOf(l).kind === 'audience')));
    const untagged = S.leads.filter((l) => l.status === 'open' && !l.warmth).length;
    // A name tapped in the list below takes over the card, so any lead can be called out of order.
    const picked = focusLead ? leadById(focusLead) : null;
    let card;
    if (!calls.length && !picked) {
      // During the expo itself there is nothing to call yet, and saying "nothing to
      // do" would read as a failure rather than as the plain truth.
      const duringExpo = S.day === 'expo' || S.day === 'evening';
      card = `<div class="card done">
        <h2>${S.leads.length ? (duringExpo ? 'השיחות מתחילות מחר' : 'אין שיחות להיום') : 'עוד אין לידים'}</h2>
        <p class="lead-text" style="margin-inline:auto">${!S.leads.length
          ? 'מה שתקלוט בדוכן יופיע כאן למחרת, מסודר לפי מי שדחוף להתקשר אליו.'
          : duringExpo
            ? 'עכשיו אתה בתערוכה. מחר בבוקר תמצא כאן את מי שצריך שיחה, לפי הסדר. הרשימה שלמטה כבר מוכנה.'
            : 'מה שצריך לקרות קרה, והשאר מתוזמן לימים הבאים. אפשר לגעת בכל שם ברשימה שלמטה ולהתקשר אליו עכשיו.'}</p>
      </div>`;
    } else {
      const l = picked || calls[0];
      const asking = callStep === l.id;
      const pos = calls.findIndex((c) => c.id === l.id);
      card = `<div class="card">
        <div class="card-count num">${picked ? 'נבחר מהרשימה' : 'שיחה ' + (pos + 1) + ' מתוך ' + calls.length + ' להיום'}
          ${picked ? '<button class="next-btn" data-act="unfocus">חזרה לסדר של היום</button>' : ''}</div>
        <div><div class="person-main"><span class="person-name">${esc(leadName(l))}</span><span class="person-city">${esc(leadTown(l))}</span></div>
          <div class="person-meta">${esc(leadMeta(l))}</div></div>
        <div class="why">למה עכשיו: ${esc(whyNow(l, now))}</div>
        ${editFields(l)}
        ${l.calls.length || (l.custom && l.custom.phone) ? `<div class="optional">${l.calls.length ? 'ניסיונות קודמים: ' + l.calls.length : ''}${l.custom && l.custom.phone ? ' · ' + esc(l.custom.phone) : ''}</div>` : ''}
        ${asking ? `
          <div class="field-label">איך הלך?</div>
          <div class="outcomes">
            <button class="btn" data-out="meeting">נקבעה פגישה</button>
            <button class="btn" data-out="quote">לשלוח הצעה</button>
            <button class="btn" data-out="won">נסגרה עסקה 🎉</button>
            <button class="btn" data-out="noanswer">לא ענה</button>
            <button class="btn ghost" data-out="lost">לא רלוונטי</button>
            <button class="btn ghost" data-act="call-cancel">עוד לא התקשרתי</button>
          </div>` : `<button class="btn primary big" data-act="call" data-id="${l.id}">📞 התקשרתי</button>`}
      </div>`;
    }
    main().innerHTML = `<div class="stack">
      <div class="section-head"><div><h1>לטיפול</h1><p class="lead-text">ניהול הלידים אחרי התערוכה. כרטיס אחד בכל פעם, ואחרי כל שיחה נגיעה אחת שמתזמנת את ההמשך.</p></div></div>
      ${untagged ? `<div class="waiting"><span class="waiting-label">${untagged} עוד לא תויגו.</span><button class="btn" data-screen="leads" data-filter="todo">לתייג עכשיו</button></div>` : ''}
      ${card}
    </div>
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" data-tab="todo" aria-selected="${todayTab === 'todo'}">לטיפול <span class="num">(${openTasks.length})</span></button>
      <button class="tab" role="tab" data-tab="aud" aria-selected="${todayTab === 'aud'}">קהל <span class="num">(${audience.length})</span></button>
    </div>
    <div class="rows-head optional">${todayTab === 'todo' ? 'לפי תאריך הצעד הבא, הדחוף קודם. לגעת בשם כדי להתקשר אליו עכשיו.' : 'מי שהתעניין בלי צורך עכשיו. לגעת בשם כדי לפתוח אותו.'}</div>
    <div class="rows">${(todayTab === 'todo' ? openTasks.sort((a, b) => (nextOf(a).due || 0) - (nextOf(b).due || 0)) : audience).map((l) => {
      const nx = nextOf(l);
      return `<button class="row" data-lead="${l.id}" ${focusLead === l.id ? 'aria-current="true"' : ''}><span><span class="w-dot ${l.warmth || ''}" style="display:inline-block;margin-inline-end:8px"></span><span class="person-name">${esc(leadName(l))}</span> <span class="row-side">${esc(leadTown(l))}</span></span>
        <span class="row-side">${todayTab === 'todo' ? esc(nx.label) + (nx.due ? ' · ' + esc(relDay(new Date(nx.due), now)) : '') : esc(l.interests.join(', ') || 'כללי')}</span></button>`;
    }).join('') || (todayTab === 'todo' ? '<div class="empty-hint">אין כרגע מה לטפל. מה שצריך שיחה יופיע כאן ביומו.</div>' : '<div class="empty-hint">הקהל מתמלא ממי שהתעניין בלי צורך מיידי.</div>')}</div>`;
  }

  // ---------------- Day 14 ----------------
  function viewDay14() {
    const leads = S.leads;
    const hot = leads.filter((l) => l.warmth === 'hot');
    const fast = hot.filter((l) => l.calls.length && l.calls[0].at - l.createdAt <= 2 * DAY);
    const meetings = leads.filter((l) => l.calls.some((c) => c.outcome === 'meeting')).length;
    const quotes = leads.filter((l) => l.calls.some((c) => c.outcome === 'quote')).length;
    const won = leads.filter((l) => l.status === 'won').length;
    const open = leads.filter((l) => l.status === 'open' && nextOf(l).kind === 'task');
    const audience = leads.filter((l) => l.status === 'audience' || (l.status === 'open' && nextOf(l).kind === 'audience'));
    const byInterest = {};
    audience.forEach((l) => (l.interests.length ? l.interests : ['כללי']).forEach((i) => { byInterest[i] = (byInterest[i] || 0) + 1; }));
    const anyCalls = leads.some((l) => l.calls.length);
    main().innerHTML = `<div class="summary">
      <div class="section-head"><div><h1>סיכום שבועיים</h1><p class="lead-text">מה יצא מהדוכן. המספרים שלך בלבד, בלי השוואה לאף אחד.</p></div>
        ${!anyCalls && leads.length ? '<button class="btn" data-act="sim-two-weeks">הדמיית שבועיים של מעקב</button>' : ''}</div>
      <div class="headline"><div class="headline-big">${hot.length ? `חזרת ל-<em class="num">${fast.length}</em> מתוך <span class="num">${hot.length}</span> הלידים החמים תוך 48 שעות.` : 'עוד אין לידים חמים.'}</div>
        <p class="lead-text">מהירות החזרה היא הגורם שמשפיע הכי הרבה על סגירת עסקה.</p></div>
      <div class="stats">
        <div class="stat"><div class="stat-n">${leads.length}</div><div class="stat-l">נקלטו בדוכן</div></div>
        <div class="stat"><div class="stat-n">${hot.length}</div><div class="stat-l">חמים</div></div>
        <div class="stat"><div class="stat-n">${meetings}</div><div class="stat-l">פגישות</div></div>
        <div class="stat"><div class="stat-n">${quotes}</div><div class="stat-l">הצעות מחיר</div></div>
        <div class="stat"><div class="stat-n" style="color:var(--good)">${won}</div><div class="stat-l">עסקאות</div></div>
      </div>
      <div class="two-col">
        <div class="box"><h2>עוד פתוח</h2>${open.length ? open.slice(0, 6).map((l) => `<div class="row"><span class="person-name">${esc(leadName(l))}</span><span class="row-side">${esc(nextOf(l).label)}</span></div>`).join('') : '<div class="optional">אין. הכול טופל.</div>'}</div>
        <div class="box"><h2>הקהל שלך: <span class="num">${audience.length}</span> אנשים</h2>
          <div class="optional">מי שהתעניין בלי צורך עכשיו. המערכת תזכיר לך לפנות אליהם בעונה, ואתה מחליט אם ואיך.</div>
          <div class="chips">${Object.entries(byInterest).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="chip">${esc(k)} · <span class="num">${n}</span></span>`).join('') || '<span class="optional">ריק.</span>'}</div></div>
      </div>
    </div>`;
  }

  function simulateTwoWeeks() {
    const rnd = mulberry32(99);
    S.leads.forEach((l) => {
      if (l.status !== 'open') return;
      const start = new Date(l.createdAt);
      if (!l.warmth) { l.warmth = rnd() < 0.7 ? 'cold' : 'warm'; }
      // Follow the plan the lead already has, including anything the person chose.
      const nx = nextOf(l);
      if (nx.kind !== 'task' || !nx.due) return;
      // Most hot calls happen on time; some slip by two days, which is what the speed measure is for.
      const slip = l.warmth === 'hot' && rnd() < 0.2 ? 2 * DAY : 0;
      const at = new Date(Math.max(nx.due, start.getTime()) + slip);
      const r = rnd();
      const outcome = l.warmth === 'hot' ? (r < 0.35 ? 'meeting' : r < 0.6 ? 'quote' : r < 0.75 ? 'won' : 'noanswer') : (r < 0.2 ? 'quote' : r < 0.3 ? 'won' : r < 0.6 ? 'noanswer' : 'lost');
      recordOutcome(l, outcome, at);
      if (outcome === 'quote' && rnd() < 0.4) recordOutcome(l, 'won', daysFrom(at, 4, 12));
    });
    save(); render();
  }

  // ---------------- Demo day ----------------
  function loadDemoDay() {
    const rnd = mulberry32(Date.now() & 0xffff);
    const used = new Set(S.leads.map((l) => l.pid));
    const t0 = EXPO_DAY.getTime();
    const offers = S.business.offerings;
    const askOpts = tpl().ask ? tpl().ask.options : [];
    // Draw from a pool built once, so a short list cannot spin here forever.
    const pool = [];
    for (let k = 0; k < PEOPLE.length; k++) if (!used.has(k) && !isWoman(person(k))) pool.push(k);
    const wanted = Math.min(36, pool.length);
    for (let n = 0; n < wanted; n++) {
      const pick = Math.floor(rnd() * pool.length);
      const i = pool[pick];
      pool.splice(pick, 1);
      used.add(i);
      const at = t0 + Math.floor(rnd() * 9.5 * 3600000);
      const r = rnd();
      const kind = r < 0.5 ? 'friend' : r < 0.62 ? 'untagged' : r < 0.85 ? 'warm' : 'hot';
      const l = newLead({ pid: i, createdAt: at, visits: [at], source: rnd() < 0.3 ? 'dial' : 'search', touched: true });
      if (kind === 'friend') l.warmth = 'cold';
      if (kind === 'warm') { l.warmth = 'warm'; l.interests = offers.length ? [offers[Math.floor(rnd() * offers.length)].name] : []; }
      if (kind === 'hot') {
        l.warmth = 'hot';
        l.interests = offers.length ? [offers[Math.floor(rnd() * offers.length)].name] : [];
        if (askOpts.length) l.ask = askOpts[Math.floor(rnd() * askOpts.length)];
        l.when = WHEN_OPTIONS[Math.floor(rnd() * 2)];
        if (rnd() < 0.5) l.note = ['רוצה שאבוא למדוד', 'לחזור אחרי החגים', 'מחפש משהו מיוחד, לשלוח דוגמאות', 'מוסד, להכין הצעה מסודרת'][Math.floor(rnd() * 4)];
        if (rnd() < 0.35) l.visits.push(at + 2 * 3600000);
      }
    }
    save(); render();
    toast('נטען יום לדוגמה: 36 אנשים, בשעות 10:00–19:30');
  }

  // ------------------------------------------------------------------
  // 7. Shell: time machine, menu, toast, modal
  // ------------------------------------------------------------------

  // 'evening', 'today' and 'day14' keep their old ids so saved state still loads.
  /* Three screens, the way the exhibitor thinks about his work. Settings is a
   * button, not a screen in the journey, and the demo day lives in the demo menu. */
  const SCREENS = [
    { id: 'booth', label: 'הדוכן', icon: '🔍' },
    { id: 'leads', label: 'מי היה אצלי', icon: '👥' },
    { id: 'crm', label: 'מעקב', icon: '📞' },
  ];

  function screenTitle() {
    if (S.screen === 'settings') return 'הגדרות העסק';
    const s = SCREENS.find((x) => x.id === S.screen);
    return s ? s.label : '';
  }

  function renderTopbar() {
    const now = NOW();
    const dayLabel = (DAYS.find((d) => d.id === S.day) || DAYS[0]).label;
    $('#topbar').innerHTML = `<div class="topbar-inner">
      <div class="brand">
        <span class="brand-name">${esc(S.business.name || 'העסק שלי')}</span>
        <span class="brand-sub">${esc(screenTitle())}</span>
      </div>
      <div class="clock">
        <span class="clock-date" id="clock-date">${esc(dayLabel)} · ${esc(hebDate(now))}</span>
        <span class="clock-time num" id="clock-time">${hhmm(now)}</span>
      </div>
      <div class="top-actions">
        <button class="icon-btn" data-act="settings" aria-label="הגדרות העסק" title="הגדרות העסק">⚙</button>
        <button class="icon-btn" data-act="menu" aria-haspopup="true" aria-label="כלי הדגמה" title="כלי הדגמה">⋯</button>
      </div>
    </div>`;
  }

  function renderNav() {
    let nav = $('#nav');
    if (!nav) { nav = document.createElement('nav'); nav.id = 'nav'; nav.className = 'nav'; document.body.appendChild(nav); }
    nav.setAttribute('aria-label', 'מסכי המערכת');
    const counts = {
      leads: S.leads.filter((l) => l.status === 'open' && !l.warmth).length,
      crm: todaysCalls(NOW()).length,
    };
    nav.innerHTML = `<div class="nav-inner">${SCREENS.map((s) => `
      <button class="nav-btn" data-screen="${s.id}" ${S.screen === s.id ? 'aria-current="page"' : ''}>
        <span class="nav-icon" aria-hidden="true">${s.icon}</span>
        <span class="nav-label">${esc(s.label)}</span>
        ${counts[s.id] ? `<span class="nav-badge num">${counts[s.id]}</span>` : ''}
      </button>`).join('')}</div>`;
  }

  function toggleMenu() {
    stopIdle();   // the panel must not close behind an open menu
    const existing = $('#menu');
    if (existing) { existing.remove(); return; }
    const m = document.createElement('div');
    m.id = 'menu'; m.className = 'menu';
    m.innerHTML = `
      <div class="menu-head">כלי הדגמה</div>
      <div class="menu-head sub">איזה יום מציגים</div>
      ${DAYS.map((d) => `<button data-day="${d.id}" ${S.day === d.id ? 'class="on"' : ''}>${S.day === d.id ? '● ' : '○ '}${esc(d.label)}</button>`).join('')}
      <hr>
      <button data-act="sim-dial">📞 מבקר מחייג לדוכן</button>
      <button data-act="demo-day">טעינת יום תערוכה מלא (36 אנשים)</button>
      <button data-act="sim-two-weeks">הדמיית שבועיים של מעקב</button>
      <hr>
      <button data-act="theme">מצב בהיר / כהה</button>
      <button data-act="reset">התחלה מחדש</button>`;
    $('#topbar').appendChild(m);
  }

  let toastTimer = null;
  function toast(text, actionLabel, action) {
    let t = $('#toast');
    if (t) t.remove();
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = `<span>${esc(text)}</span>${actionLabel ? `<button>${esc(actionLabel)}</button>` : ''}`;
    if (actionLabel) t.querySelector('button').addEventListener('click', () => { t.remove(); action(); });
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 6000);
  }

  function modal(html) {
    closeModal(false);
    const s = document.createElement('div');
    s.id = 'scrim'; s.className = 'scrim';
    s.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    s.addEventListener('click', (e) => { if (e.target === s) closeModal(); });
    document.body.appendChild(s);
  }
  /** restart: a closed window hands the five-second clock back to the open panel. */
  function closeModal(restart) {
    const s = $('#scrim'); if (!s) return;
    s.remove();
    if (restart !== false && openLeadId && S.screen === 'booth') startIdle();
  }

  function confirmDelete(id) {
    const l = leadById(id);
    if (!l) return;
    stopIdle();
    modal(`<h2>למחוק את ${esc(leadName(l))}?</h2>
      <p class="lead-text">כל מה שנרשם עליו יימחק. אי אפשר להחזיר.</p>
      <div class="inline"><button class="btn primary danger" data-act="del-yes" data-id="${id}">כן, למחוק</button>
      <button class="btn ghost" data-act="close-modal">ביטול</button></div>`);
  }

  function phoneModal(id) {
    const l = leadById(id);
    if (!l) return;
    stopIdle();
    modal(`<h2>טלפון של ${esc(leadName(l))}</h2>
      <p class="lead-text">נשמר במכשיר הזה בלבד, כדי שאפשר יהיה לחזור אליו.</p>
      <input id="ph-val" class="text-input num" inputmode="tel" value="${esc(leadPhone(l))}" autocomplete="off">
      <div class="inline"><button class="btn primary" data-act="save-phone" data-id="${id}">שמירה</button>
      <button class="btn ghost" data-act="close-modal">ביטול</button></div>`);
    setTimeout(() => $('#ph-val') && $('#ph-val').focus(), 30);
  }

  /** Export is how the exhibitor knows the list is his: plain text he can paste anywhere. */
  function exportModal() {
    stopIdle();
    const rows = S.leads.slice().sort((a, b) => rank(b) - rank(a));
    if (!rows.length) return toast('אין עדיין לידים לייצא');
    const head = 'שם\tעיר\tחום\tמה עניין אותו\tצעד הבא\tהערה';
    const body = rows.map((l) => [
      leadName(l), leadTown(l), l.warmth ? WARMTH[l.warmth] : '', l.interests.join(', '),
      nextOf(l).label, (l.note || '').replace(/\s+/g, ' '),
    ].join('\t')).join('\n');
    modal(`<h2>ייצוא ${rows.length} לידים</h2>
      <p class="lead-text">מסודר לפי חשיבות. להעתיק, ולהדביק באקסל או בוואטסאפ.</p>
      <textarea id="exp-text" rows="8" readonly>${esc(head + '\n' + body)}</textarea>
      <div class="inline"><button class="btn primary" data-act="copy-export">העתקה</button>
      <button class="btn ghost" data-act="close-modal">סגירה</button></div>`);
  }

  function copyText(text, okMsg) {
    if (!text) return;
    const done = () => toast(okMsg);
    try {
      navigator.clipboard.writeText(text).then(done, () => selectFallback());
    } catch (e) { selectFallback(); }
    function selectFallback() {
      const ta = $('#exp-text');
      if (ta) { ta.focus(); ta.select(); toast('סמן והעתק ידנית'); }
      else toast(text);
    }
  }

  function confirmReset() {
    stopIdle();
    modal(`<h2>להתחיל מחדש?</h2><p class="lead-text">כל הלידים וההגדרות בדוגמית יימחקו מהמכשיר הזה.</p>
      <div class="inline"><button class="btn primary" data-act="reset-yes">כן, מחדש</button><button class="btn ghost" data-act="close-modal">ביטול</button></div>`);
  }

  /** Everything the views keep between renders. One place, so nothing is forgotten. */
  function resetViewState() {
    stopIdle();
    openLeadId = null; callStep = null; focusLead = null; eveId = null; moreOpenId = null;
    lastAction = null; lastQuery = '';
    leadsQuery = ''; leadsWarmth = ''; leadsSort = 'time'; leadsFilter = 'todo';
    todayTab = 'todo'; eveAutoOpen = true;
  }

  function setScreen(id, filter) {
    stopIdle();
    openLeadId = null; callStep = null; focusLead = null; eveId = null; moreOpenId = null;
    lastQuery = '';
    eveAutoOpen = true;
    if (filter) leadsFilter = filter;
    // The booth exists only on the expo day, so opening it says so and restarts
    // the clock at 10:00. The other screens work on whichever day is showing.
    if (id === 'booth' && (S.screen !== 'booth' || S.day !== 'expo')) {
      S.day = 'expo';
      S.boothEnteredAt = Date.now();
    }
    S.screen = id;
    save(); render();
    window.scrollTo(0, 0);
  }

  /** Changing the demo day is a demo control. It keeps the screen, unless that
   *  screen cannot exist on the chosen day: there is no booth two weeks later. */
  function setDay(id) {
    stopIdle();
    openLeadId = null; callStep = null; focusLead = null; eveId = null;
    moreOpenId = null; lastQuery = ''; eveAutoOpen = true;
    S.day = id;
    if (id === 'expo') S.boothEnteredAt = Date.now();
    else if (S.screen === 'booth') S.screen = 'leads';
    save(); render();
  }

  function render() {
    if (!S.welcomed) return viewWelcome();
    // Nothing works before the business has a name and a trade, so that comes
    // first — and it is two questions, not a form.
    if (!S.business.registered) {
      $('#topbar').innerHTML = '';
      const n = $('#nav'); if (n) n.remove();
      const r = $('#recent'); if (r) r.remove();
      return viewRegister();
    }
    renderTopbar();
    ({ settings: viewSetup, booth: viewBooth, leads: viewEvening, crm: viewCrm }[S.screen] || viewBooth)();

    if (S.screen !== 'booth') renderRecent();
  }

  /** One screen the exhibitor sees once: what this is, and what to do first. */
  function viewWelcome() {
    $('#topbar').innerHTML = '';
    const nav = $('#nav'); if (nav) nav.remove();
    const rec = $('#recent'); if (rec) rec.remove();
    main().innerHTML = `
      <div class="welcome">
        <div class="welcome-card">
          <div class="welcome-kicker">הדגמה</div>
          <h1>הדוכן שלך, בלי לרשום כלום ביד</h1>
          <p class="lead-text">מישהו ניגש לדוכן. אתה מקליד שתי אותיות מהשם שלו, נוגע בשם, וזהו — הוא נשמר.
            כל השאר רשות: כמה הוא מעניין, מה חיפש, ומתי לחזור אליו.</p>
          <ol class="welcome-steps">
            <li><b>הדוכן</b> — מוצאים מבקר ומתייגים בנגיעה</li>
            <li><b>מי היה אצלי</b> — כל מי שנקלט, פתוח לעריכה בכל זמן</li>
            <li><b>מעקב</b> — למחרת: למי להתקשר, ומה יצא מזה</li>
          </ol>
          <p class="optional">בהדגמה הזו אתה בעל נגרייה. השמות והנתונים מומצאים.</p>
          <button class="btn primary big" data-act="welcome-done">להתחיל</button>
        </div>
      </div>`;
  }

  // One delegated handler for every button in the app.
  document.addEventListener('click', (e) => {
    // Any touch inside the open panel keeps it open — a link, a disclosure or
    // plain text as much as a button. Reading the history is not being idle.
    if (openLeadId && e.target.closest && e.target.closest('.panel')) startIdle();

    const b = e.target.closest('button, label[for]');
    if (!b) { const m = $('#menu'); if (m && !e.target.closest('#menu')) m.remove(); return; }
    const d = b.dataset;
    if (!b.closest('#menu') && d.act !== 'menu') { const m = $('#menu'); if (m) m.remove(); }

    if (d.screen) return setScreen(d.screen, d.filter);
    if (d.day) { $("#menu") && $("#menu").remove(); return setDay(d.day); }
    if (d.tpl) { S.business.template = d.tpl; save(); return viewSetup(); }
    if (d.regtrade) { S.business.trade = d.regtrade; S.business.name = ($('#reg-name') && $('#reg-name').value.trim()) || S.business.name || tradeById(d.regtrade).name; S.business.registered = true; applyTrade(d.regtrade, true); return setScreen('settings'); }
    if (d.adv !== undefined) { advOpen = advOpen === d.adv ? '' : d.adv; return viewSetup(); }
    if (d.offsize) { const o = S.business.offerings[parseInt(d.offsize, 10)]; if (o) { o.size = d.size; save(); } return viewSetup(); }
    if (d.offdel) { S.business.offerings.splice(parseInt(d.offdel, 10), 1); save(); return viewSetup(); }
    if (d.engine) {
      const conf = channelConf(d.engine);
      const eng = CHANNELS[d.engine].engines[d.eng];
      conf.engine = d.eng;
      save();
      // Turning on an engine that carries risk goes straight to the warning,
      // rather than leaving a setting that looks on and quietly is not.
      if (eng.warn && !conf.signed) { viewSetup(); return signModal(d.engine); }
      return viewSetup();
    }
    if (d.pick) return pickPerson(parseInt(d.pick, 10));
    if (d.open) return openLead(parseInt(d.open, 10));

    // Field edits work on every screen: the id on the control says which lead.
    const l = d.id ? leadById(parseInt(d.id, 10)) : (openLeadId ? leadById(openLeadId) : null);
    // A warmth tap refreshes the machine's proposal, never a next step the person chose.
    if (d.warm && l) { l.warmth = l.warmth === d.warm ? null : d.warm; if (!l.next || l.next.by !== 'person') l.next = null; save(); return rerender(l); }
    if (d.int && l) { const k = l.interests.indexOf(d.int); if (k >= 0) l.interests.splice(k, 1); else l.interests.push(d.int); save(); return rerender(l); }
    if (d.ask && l) { l.ask = l.ask === d.ask ? null : d.ask; save(); return rerender(l); }
    if (d.when && l) { l.when = l.when === d.when ? null : d.when; save(); return rerender(l); }
    if (d.next && l) {
      const o = NEXT_OPTIONS.find((x) => x.key === d.next);
      if (!o) return;
      if (o.key === 'auto') l.next = null;
      else if (o.audience) l.next = { key: o.key, label: o.label, due: null, kind: 'audience', by: 'person' };
      else l.next = { key: o.key, label: 'להתקשר ' + o.label, due: daysFrom(NOW(), o.days, 10).getTime(), kind: 'task', by: 'person' };
      if (l.status === 'audience' && o.key !== 'audience') l.status = 'open';
      save(); return rerender(l);
    }

    if (d.eve) {
      const x = leadById(parseInt(d.id, 10));
      if (d.eve === 'close') { eveId = null; moreOpenId = null; eveAutoOpen = false; return viewEvening(); }
      if (x && d.eve === 'skip') { x.warmth = 'cold'; x.skipped = true; }
      else if (x && d.eve === 'next' && !x.warmth) { x.warmth = 'cold'; x.skipped = true; }
      eveId = null; eveAutoOpen = true;   // move on to the next untagged visitor
      moreOpenId = null;
      save(); return viewEvening();
    }
    if (d.out) { const x = leadById(callStep); if (x) recordOutcome(x, d.out); callStep = null; focusLead = null; save(); return render(); }
    if (d.tab) { todayTab = d.tab; return viewCrm(); }
    if (d.crmtab) { crmTab = d.crmtab; focusLead = null; callStep = null; return render(); }
    if (d.lfilter) { leadsFilter = d.lfilter; eveId = null; eveAutoOpen = true; return viewEvening(); }
    if (d.lwarm !== undefined) { leadsWarmth = d.lwarm; return viewEvening(); }
    if (d.lsort) { leadsSort = d.lsort; return viewEvening(); }
    if (d.eveopen) { eveId = parseInt(d.eveopen, 10); moreOpenId = null; eveAutoOpen = true; viewEvening(); return window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (d.lead) { focusLead = parseInt(d.lead, 10); callStep = null; render(); return window.scrollTo({ top: 0, behavior: 'smooth' }); }

    switch (d.act) {
      case 'more': { const id = d.id ? parseInt(d.id, 10) : openLeadId; moreOpenId = moreOpenId === id ? null : id; return rerender(leadById(id)); }
      case 'send': if (l) {
        l.sendMaterial = !l.sendMaterial;
        save(); rerender(l);
        if (!l.sendMaterial) return;
        // Every send in the system goes through send(), including this one.
        const live = liveChannels();
        if (!live.length) return toast('סומן. ⚠️ אין ערוץ פעיל — ר\' "ערוצי שליחה" בהגדרות', 'להגדרות', () => setScreen('settings'));
        const r = send(l, live[0]);
        return toast(r.ok ? r.text : 'סומן, אך לא יישלח: ' + r.why);
      } return;
      case 'sign': return signModal(d.kind);
      case 'sign-yes': {
        const v = ($('#sign-name') && $('#sign-name').value.trim()) || '';
        if (!v) return toast('צריך לחתום בשם');
        const conf = channelConf(d.kind);
        conf.signed = v;
        conf.signedAt = Date.now();
        save(); closeModal(false); viewSetup();
        return toast('החיבור אושר. ⚠️ האחריות על המספר היא שלך');
      }
      case 'unsign': {
        const conf = channelConf(d.kind);
        conf.signed = null; conf.signedAt = null; conf.engine = ENGINE_DEFAULT[d.kind];
        save(); return viewSetup();
      }
      case 'settings': return setScreen(S.screen === 'settings' ? 'booth' : 'settings');
      case 'del-lead': return confirmDelete(parseInt(d.id, 10));
      case 'del-yes': {
        const id = parseInt(d.id, 10);
        S.leads = S.leads.filter((x) => x.id !== id);
        if (openLeadId === id) { openLeadId = null; stopIdle(); }
        if (eveId === id) eveId = null;
        if (focusLead === id) focusLead = null;
        save(); closeModal(false); render(); return toast('הליד נמחק');
      }
      case 'add-phone': return phoneModal(parseInt(d.id, 10));
      case 'save-phone': {
        const x = leadById(parseInt(d.id, 10));
        const v = $('#ph-val').value.trim();
        if (x) { x.custom = Object.assign({ first: '', last: '', town: '' }, x.custom, { phone: v }); save(); }
        closeModal(false); return rerender(x);
      }
      case 'copy-phone': {
        const x = leadById(parseInt(d.id, 10));
        return copyText(leadPhone(x), 'המספר הועתק');
      }
      case 'export': return exportModal();
      case 'copy-export': return copyText($('#exp-text').value, 'הרשימה הועתקה. אפשר להדביק בוואטסאפ או באקסל');
      case 'welcome-done': S.welcomed = true; S.boothEnteredAt = Date.now(); save(); return render();
      case 'new-person': return newPersonModal();
      case 'np-save': return saveNewPerson();
      case 'close-modal': return closeModal();
      case 'close-now': return closePanel();
      case 'wrong': return wrongPerson();
      case 'sim-dial': $('#menu') && $('#menu').remove(); return simulateDial();
      case 'add-offer': return addOffer();
      case 'setup-done': return setScreen('booth');
      case 'reset-offers': applyTrade(S.business.trade, true); return viewSetup();
      case 'grades-reset': S.business.warmthNames = null; save(); return viewSetup();
      case 'catalog-clear': S.business.catalog = null; save(); return viewSetup();
      case 'name-device': { const v = $('#dev-name') && $('#dev-name').value.trim(); if (v) { S.business.devices = [{ name: v, here: true }].concat(S.business.devices.filter((x) => !x.here)); save(); } return viewSetup(); }
      case 'call': callStep = parseInt(d.id, 10); return render();
      case 'call-cancel': callStep = null; return render();
      case 'unfocus': focusLead = null; return render();
      case 'sim-two-weeks': $('#menu') && $('#menu').remove(); simulateTwoWeeks(); S.day = 'day14'; crmTab = 'summary'; return setScreen('crm');
      case 'demo-day': $('#menu') && $('#menu').remove(); return loadDemoDay();
      case 'menu': return toggleMenu();
      case 'theme': {
        const r = document.documentElement;
        const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
        r.dataset.theme = dark ? 'light' : 'dark';
        try { localStorage.setItem('expo-proto-theme', r.dataset.theme); } catch (err) { /* ignore */ }
        return $('#menu') && $('#menu').remove();
      }
      case 'reset': $('#menu') && $('#menu').remove(); return confirmReset();
      case 'reset-yes': resetViewState(); S = freshState(); crmTab = 'todo'; save(); closeModal(false); return render();
    }
  });

  // Typing anywhere on the booth screen goes to the search box.
  // The note saves as it is typed, on whichever screen it is being written.
  document.addEventListener('input', (e) => {
    const ta = e.target.closest('[data-note]');
    if (!ta) return;
    const l = leadById(parseInt(ta.dataset.note, 10));
    if (!l) return;
    l.note = ta.value;
    save();
    if (S.screen === 'booth' && openLeadId === l.id) pauseIdle(NOTE_IDLE_MS);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); const m = $('#menu'); if (m) m.remove(); if (openLeadId) closePanel(); return; }
    if (S.screen !== 'booth' || $('#scrim')) return;
    const q = $('#q');
    if (!q || document.activeElement === q || e.target.closest('input, textarea')) return;
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (openLeadId) closePanel();
      const q2 = $('#q');
      q2.focus();
    }
  });

  // ------------------------------------------------------------------
  // 8. Boot
  // ------------------------------------------------------------------
  /* A button that throws leaves the screen exactly as it was, which looks to the
   * user like a button that does nothing. Say so instead: the same bug then
   * takes seconds to find instead of a screen recording. */
  window.addEventListener('error', (e) => {
    try { toast('תקלה: ' + (e.message || 'שגיאה'), 'רענון', () => location.reload()); } catch (x) { /* nothing else to try */ }
  });

  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'he');
  try { const th = localStorage.getItem('expo-proto-theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { /* ignore */ }
  load();
  render();
  // Keep the booth clock moving while the screen is open.
  // Only the clock text changes, so an open menu is never redrawn away.
  setInterval(() => {
    if (S.screen !== 'booth') return;
    const t = $('#clock-time'); if (t) t.textContent = hhmm(NOW());
  }, 30000);
})();
