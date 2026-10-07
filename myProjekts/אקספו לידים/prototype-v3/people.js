/* People and search — taken from the first prototype, where it was measured on
 * the real list: Yiddish and Hebrew spellings meet, nicknames resolve, and a
 * variant spelling ranks below a direct hit. Demo names only. */
window.People = (function () {
  'use strict';
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

  const WOMAN_TITLE = /^(מרת|הרבנית)/;
  const PEOPLE = makeDemoPeople();
  const fullName = (p) => (p[1] + ' ' + p[2]).trim();
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

  const INDEX = PEOPLE.map((p) => {
    const words = (norm(p[1]) + ' ' + norm(p[2])).split(' ').filter(Boolean);
    return { words, town: norm(p[5]).split(' ').filter(Boolean), firstLen: norm(p[1]).split(' ').length,
      skelWords: words.map((w) => skel(w)), deepWords: words.map((w) => skel(w, true)) };
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

  /** Scores one index row against the typed words. null when it does not match. */
  function scoreRow(toks, ix) {
    let score = 0;
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
      return null;
    }
    return { score, variant };
  }

  /* Businesses: the same man is a private customer when he wants chairs for his
   * dining room and a business when he wants them for his office. So a business
   * is its own row, carrying the index of the man who stands at the booth for it
   * (`pid`) and, apart from that, whose name it is in (`owner` — often a wife's).
   * Demo names only, made up from the demo people. */
  const BIZ_TRADES = ['מטבחים', 'דפוס', 'תאורה', 'שיפוצים', 'ביטוח', 'הנהלת חשבונות', 'גרפיקה ומיתוג', 'קייטרינג', 'מאפייה', 'אולם אירועים', 'הסעות', 'מחשבים', 'יודאיקה', 'הפקת אירועים', 'צימרים', 'מיזוג אוויר', 'חשמל', 'תיווך נדל"ן', 'מתנות מעוצבות', 'עוגות מעוצבות'];
  const OTHER_OWNER = ['רבקי', 'מלכי', 'שיינדי', 'אסתי', 'חני', 'פריידי'];
  const BIZ_PREFIX = ['', '', 'בית ', 'סטודיו ', 'מרכז '];
  const BIZ_SUFFIX = ['', '', ' בע"מ', ' והבנים', ' אחים'];
  const BUSINESSES = (function () {
    const rnd = mulberry32(90125);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const out = [];
    for (let i = Math.floor(rnd() * 3); i < PEOPLE.length; i += 3 + Math.floor(rnd() * 4)) {
      const p = PEOPLE[i];
      const trade = pick(BIZ_TRADES);
      const elsewhere = rnd() < 0.17;
      out.push({
        pid: i, trade, town: p[5],
        name: (rnd() < 0.55 ? pick(BIZ_PREFIX) + p[2] + pick(BIZ_SUFFIX) : pick(BIZ_PREFIX) + trade + ' ' + p[2]).trim(),
        owner: elsewhere ? pick(OTHER_OWNER) + ' ' + p[2] : '',
      });
    }
    return out;
  })();
  const BIZ_OF = {};
  BUSINESSES.forEach((b, i) => { if (BIZ_OF[b.pid] === undefined) BIZ_OF[b.pid] = i; });
  const BIZ_INDEX = BUSINESSES.map((b) => {
    const words = norm(b.name + ' ' + b.trade).split(' ').filter(Boolean);
    return { words, town: norm(b.town).split(' ').filter(Boolean), firstLen: norm(b.name).split(' ').length,
      skelWords: words.map((w) => skel(w)), deepWords: words.map((w) => skel(w, true)) };
  });

  /** Rows, people and businesses together. A row's key is "p:<person>" or "b:<business>". */
  function search(query, limit, skip) {
    const toks = norm(query).split(' ').filter(Boolean);
    if (!toks.length) return { hits: [], skipped: [] };
    const hits = [];
    for (let i = 0; i < INDEX.length; i++) {
      const r = scoreRow(toks, INDEX[i]);
      if (r) hits.push({ key: 'p:' + i, i, b: null, score: r.score });
    }
    for (let b = 0; b < BIZ_INDEX.length; b++) {
      const r = scoreRow(toks, BIZ_INDEX[b]);
      if (r) hits.push({ key: 'b:' + b, i: BUSINESSES[b].pid, b, score: r.score });
    }
    hits.sort((a, b) => b.score - a.score || rowName(a).length - rowName(b).length);
    const skipped = skip ? hits.filter((h) => skip(h.key)) : [];
    const shown = hits.filter((h) => !skip || !skip(h.key));
    return { hits: shown.slice(0, limit || 6), skipped, total: shown.length };
  }
  function meta(p) {
    const parts = [];
    if (p[3]) parts.push('בן ' + p[3]);
    if (p[4]) parts.push('חתן ' + p[4]);
    return parts.join(' · ');
  }
  /** What a row is called, and the line under it. */
  function rowName(r) { return r.b != null ? BUSINESSES[r.b].name : fullName(PEOPLE[r.i]); }
  function rowMeta(r) {
    if (r.b == null) return meta(PEOPLE[r.i]);
    const b = BUSINESSES[r.b];
    return b.trade + ' · ' + fullName(PEOPLE[b.pid]) + (b.owner ? ' · על שם ' + b.owner : '');
  }
  const row = (key) => { const [k, n] = String(key).split(':'); return k === 'b' ? { key, i: BUSINESSES[+n].pid, b: +n } : { key, i: +n, b: null }; };
  return {
    list: PEOPLE, get: (i) => PEOPLE[i], name: fullName, meta, search, norm,
    biz: (b) => BUSINESSES[b], bizOf: (pid) => (BIZ_OF[pid] === undefined ? null : BIZ_OF[pid]),
    row, rowName, rowMeta, town: (r) => (r.b != null ? BUSINESSES[r.b].town : PEOPLE[r.i][5]),
  };
})();
