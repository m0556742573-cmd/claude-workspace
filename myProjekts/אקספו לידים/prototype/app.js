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
    const lasts = ['כהן', 'לוי', 'ווייס', 'גרינפלד', 'פרידמן', 'שוורץ', 'רוזנברג', 'קליין', 'הורוביץ', 'רובינשטיין', 'גולדשטיין', 'פרלמן', 'לנדאו', 'הלברשטאם', 'טייטלבוים', 'שפירא', 'רבינוביץ', 'ברגר', 'אייזנבך', 'גליק', 'הירש', 'קאופמן', 'לרנר', 'מרגליות', 'נויבירט', 'פולק', 'קרויס', 'רוט', 'שטרן', 'זילבר', 'טננבוים', 'ליכטנשטיין', 'מנדלבוים', 'פישר', 'קנר', 'רייך', 'שלזינגר', 'ביננפלד', 'גוטליב', 'דייטש', 'הופמן', 'ויזל', 'זוסמן', 'חיון', 'יאקאב', 'כץ', 'לעבוביץ', 'מושקוביץ', 'נוסבוים', 'סגל', 'עקשטיין', 'פאלק', 'צוקר', 'קעסלער', 'רענד', 'שיינבערגער', 'תאומים', 'ברייער', 'גרוס', 'דאנציגער', 'הערש', 'וועבער', 'זאנענפעלד', 'טויב', 'יונגרייז', 'לאנדא', 'מילער', 'נאכמאן', 'סאמעט', 'פריינד', 'קליינמאן', 'רוזנטל', 'שווימער', 'אונגר', 'בלוי', 'גלאנץ', 'דרוק', 'האס', 'ווידער', 'זייף', 'טירנויער', 'יעגער', 'לעווי', 'מאשקאוויטש', 'נייהויז', 'ספרא', 'פעלדמאן', 'קאהן', 'ראזענבוים', 'שפיץ'];
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

  // Guard: a real row must have the stripped shape and no contact data in any cell.
  const CONTACT_RE = /0\d{1,2}-?\d{7}|[\w.+-]+@[\w-]+\.[\w.]+/;
  function validRow(r) {
    return Array.isArray(r) && r.length <= 7 && !r.some((c) => CONTACT_RE.test(String(c)));
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
  // Loose form: also ignores vav and yud, which are written inconsistently.
  const loose = (s) => s.replace(/[וי]/g, '');

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
    return { words, town, firstLen: norm(p[1]).split(' ').length, looseWords: words.map(loose), woman: isWoman(p) };
  });

  function tokenMatches(tok, words, looseWords) {
    for (let w = 0; w < words.length; w++) {
      if (words[w].startsWith(tok)) return { w, exact: words[w] === tok, how: 'prefix' };
    }
    const alias = ALIASES[tok];
    if (alias) {
      const a = norm(alias);
      for (let w = 0; w < words.length; w++) if (words[w] === a) return { w, exact: true, how: 'alias' };
    }
    if (tok.length >= 3) {
      const lt = loose(tok);
      for (let w = 0; w < looseWords.length; w++) if (lt && looseWords[w].startsWith(lt)) return { w, exact: false, how: 'loose' };
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
      for (let t = 0; t < toks.length; t++) {
        const m = tokenMatches(toks[t], ix.words, ix.looseWords);
        if (m) {
          score += m.exact ? 3 : 2;
          if (m.how === 'loose') score -= 1;
          if (t === 0 && m.w === 0) score += 2;              // first typed word hits the first name
          if (t > 0 && m.w >= ix.firstLen) score += 1;       // later word hits the surname
          continue;
        }
        if (t > 0 && ix.town.some((w) => w.startsWith(toks[t]))) { score += 1; continue; } // "משה כהן בני"
        ok = false; break;
      }
      if (ok) hits.push({ i, score });
    }
    hits.sort((a, b) => b.score - a.score || fullName(person(a.i)).length - fullName(person(b.i)).length);
    return { hits: hits.slice(0, limit), total: hits.length };
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
  const SUGGESTED_OFFERINGS = {
    quote: ['מטבחים', 'ארונות קיר', 'ריהוט למוסדות', 'חדרי ילדים', 'ספריות', 'דלתות'],
    buy: ['מבצע תערוכה', 'מוצר חדש', 'קטלוג'],
    meeting: ['ייעוץ', 'בדיקה', 'הצעה'],
    date: ['אירוע', 'טיול', 'השכרה'],
    register: ['קורס קרוב', 'מנוי', 'מידע'],
    general: ['מידע כללי'],
  };
  const WHEN_OPTIONS = ['עכשיו', 'עד 3 חודשים', 'בהמשך'];
  const WARMTH = { hot: 'חם', warm: 'פושר', cold: 'קר' };

  const STORE_KEY = 'expo-proto-v1-' + (REAL ? 'real' : 'demo');
  let S;

  function freshState() {
    return {
      stage: 'setup',
      business: { name: 'נגריית הדר', template: 'quote', offerings: SUGGESTED_OFFERINGS.quote.slice(0, 5), catalog: null, keepAudience: true, setupDone: false },
      leads: [],
      seq: 1,
      boothEnteredAt: null,
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { S = JSON.parse(raw); relinkPeople(); return; }
    } catch (e) { /* storage unavailable: run in memory */ }
    S = freshState();
  }
  /** Leads point at a row by position. If the list was re-exported in another order,
   *  find each person again by the name saved with the lead, rather than show someone else. */
  function relinkPeople() {
    S.leads.forEach((l) => {
      if (l.pid == null || !l.snap) return;
      if (person(l.pid) && fullName(person(l.pid)) + '|' + person(l.pid)[5] === l.snap) return;
      const k = PEOPLE.findIndex((p) => fullName(p) + '|' + p[5] === l.snap);
      if (k >= 0) l.pid = k;
      else { const [name, town] = l.snap.split('|'); l.custom = { first: name, last: '', town }; l.pid = null; }
    });
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* in memory only */ }
  }

  /** The simulated "now" for each stage of the time machine. */
  function nowFor(stage) {
    if (stage === 'booth') {
      const entered = S.boothEnteredAt || Date.now();
      return new Date(EXPO_DAY.getTime() + Math.min(Date.now() - entered, 10 * 3600000));
    }
    if (stage === 'evening') return new Date(EXPO_DAY.getFullYear(), EXPO_DAY.getMonth(), EXPO_DAY.getDate(), 21, 0);
    if (stage === 'today') return daysFrom(EXPO_DAY, 1, 9);
    if (stage === 'day14') return daysFrom(EXPO_DAY, 14, 18);
    return new Date(EXPO_DAY.getTime() - 7 * DAY);
  }
  const NOW = () => nowFor(S.stage);

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
    if (l.pid != null) l.snap = fullName(person(l.pid)) + '|' + person(l.pid)[5];
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

  const OVERRIDES = [
    { label: 'להתקשר מחר', days: 1 },
    { label: 'להתקשר בעוד שבוע', days: 7 },
    { label: 'לקהל, בלי משימה', audience: true },
  ];

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
    if (l.warmth === 'hot') r.push('חם');
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
  function rank(l) {
    return (l.warmth === 'hot' ? 100 : 0) + (l.ask ? 20 : 0) + (l.when === 'עכשיו' ? 15 : 0) + (l.visits.length > 1 ? 10 : 0) + l.interests.length;
  }

  // ------------------------------------------------------------------
  // 6. Views
  // ------------------------------------------------------------------

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const main = () => $('#main');

  // ---------------- Setup ----------------
  function viewSetup() {
    const b = S.business;
    const offers = SUGGESTED_OFFERINGS[b.template] || [];
    const allOffers = Array.from(new Set(offers.concat(b.offerings)));
    main().innerHTML = `
      <div class="setup">
        <div>
          <h1>הכנה לתערוכה</h1>
          <p class="lead-text">שלושה צעדים, אף אחד מהם לא חובה. מה שתגדיר כאן הופך לכפתורים בדוכן, כדי שביום עצמו לא תצטרך להקליד.</p>
        </div>
        <label class="step">
          <span class="field-label">שם העסק</span>
          <input id="biz-name" class="text-input" value="${esc(b.name)}" autocomplete="off">
        </label>
        <section class="step" aria-labelledby="s1">
          <div class="step-head"><span class="step-no">1</span><h2 id="s1">איך אתה בדרך כלל סוגר עסקה?</h2></div>
          <div class="templates">
            ${Object.entries(TEMPLATES).map(([k, t]) => `
              <button class="tpl" data-tpl="${k}" aria-pressed="${b.template === k}">
                <b>${esc(t.name)}</b><small>${esc(t.example)}</small>
                <small>${t.ask ? 'שואל גם: ' + esc(t.ask.label) : 'בלי שאלה נוספת'}</small>
              </button>`).join('')}
          </div>
        </section>
        <section class="step" aria-labelledby="s2">
          <div class="step-head"><span class="step-no">2</span><h2 id="s2">מה אתה מציע?</h2><span class="optional">3–6 כפתורים</span></div>
          <div class="chips">
            ${allOffers.map((o) => `<button class="chip" data-offer="${esc(o)}" aria-pressed="${b.offerings.includes(o)}">${esc(o)}</button>`).join('')}
          </div>
          <div class="inline">
            <input id="new-offer" class="text-input" placeholder="להוסיף משהו משלך" autocomplete="off">
            <button class="btn" data-act="add-offer">הוספה</button>
          </div>
        </section>
        <section class="step" aria-labelledby="s3">
          <div class="step-head"><span class="step-no">3</span><h2 id="s3">חומר לשליחה, וקהל</h2><span class="optional">רשות</span></div>
          <div class="inline">
            <label class="btn" for="catalog">${b.catalog ? '📎 ' + esc(b.catalog) : 'להעלות קטלוג או מחירון'}</label>
            <input id="catalog" type="file" hidden>
            <span class="optional">${b.catalog ? 'בדוכן יופיע כפתור "שלח חומר"' : 'אם תעלה, בדוכן יופיע כפתור "שלח חומר"'}</span>
          </div>
          <label class="check"><input id="keep-aud" type="checkbox" ${b.keepAudience ? 'checked' : ''}> לשמור גם "קהל": מי שהתעניין בלי צורך עכשיו, כדי לפנות אליו בעונה</label>
        </section>
        <div class="setup-actions">
          <button class="btn primary big" data-act="setup-done">מוכן, ליום התערוכה</button>
          <button class="btn ghost" data-act="setup-skip">לדלג, תבנית כללית</button>
        </div>
      </div>`;
    $('#biz-name').addEventListener('input', (e) => { b.name = e.target.value; save(); renderTopbar(); });
    $('#catalog').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) { b.catalog = f.name; save(); viewSetup(); } });
    $('#keep-aud').addEventListener('change', (e) => { b.keepAudience = e.target.checked; save(); });
    $('#new-offer').addEventListener('keydown', (e) => { if (e.key === 'Enter') addOffer(); });
  }
  function addOffer() {
    const v = $('#new-offer').value.trim();
    if (!v) return;
    if (!S.business.offerings.includes(v) && S.business.offerings.length < 8) S.business.offerings.push(v);
    save(); viewSetup();
  }

  // ---------------- Booth ----------------
  let openLeadId = null;
  let moreOpen = false;
  let idleTimer = null;
  let lastAction = null;
  const IDLE_MS = 5000;
  const NOTE_IDLE_MS = 15000;

  function viewBooth() {
    if (!S.boothEnteredAt) { S.boothEnteredAt = Date.now(); save(); }
    const waiting = S.leads.filter((l) => !l.touched && l.status === 'open');
    main().innerHTML = `
      <div class="booth">
        <div class="search-wrap">
          <input id="q" class="search" type="search" placeholder="שם של מי שעומד מולך…" autocomplete="off" aria-label="חיפוש מבקר">
          <div class="search-actions">
            <button class="icon-btn" data-act="new-person" title="מי שלא ברשימה">+ חדש</button>
            <button class="icon-btn" data-act="sim-dial" title="מדמה מבקר שמחייג לדוכן">📞 חיוג</button>
          </div>
        </div>
        ${waiting.length ? `
          <div class="waiting" role="status">
            <span class="waiting-label">חייגו לדוכן, ממתינים לתיוג:</span>
            ${waiting.map((l) => `<button class="r-chip" data-open="${l.id}">${esc(leadName(l))} <span class="num" style="color:var(--faint)">${hhmm(new Date(l.createdAt))}</span></button>`).join('')}
          </div>` : ''}
        <div id="slot"></div>
      </div>`;
    const q = $('#q');
    q.addEventListener('input', () => { openLeadId = null; stopIdle(); renderResults(q.value); });
    renderRecent();
    if (openLeadId && leadById(openLeadId)) renderPanel(); else { renderResults(''); q.focus(); }
  }

  function renderResults(query) {
    const slot = $('#slot');
    if (!slot) return;
    if (!norm(query)) {
      const total = S.leads.filter((l) => dayStart(new Date(l.createdAt)).getTime() === dayStart(EXPO_DAY).getTime()).length;
      slot.innerHTML = `<div class="empty-hint">שתיים-שלוש אותיות מהשם מספיקות.<br>${total ? `<span class="num">${total}</span> אנשים נקלטו היום.` : ''}</div>`;
      return;
    }
    const { hits, total } = search(query, 8);
    if (!hits.length) {
      slot.innerHTML = `<div class="empty-hint">לא נמצא ברשימה. <button class="btn" data-act="new-person" style="margin-inline-start:8px">להוסיף כחדש</button></div>`;
      return;
    }
    slot.innerHTML = `<div class="results">${hits.map(({ i }) => {
      const p = person(i);
      const existing = S.leads.find((l) => l.pid === i);
      return `<button class="result" data-pick="${i}">
        <span>
          <span class="person-main"><span class="person-title">${esc(p[0])}</span><span class="person-name">${esc(fullName(p))}</span><span class="person-city">${esc(p[5])}</span></span>
          <span class="person-meta">${esc(metaLine(p))}</span>
        </span>
        ${existing ? `<span class="badge again">ביקר כבר</span>` : ''}
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
    moreOpen = !!(l && (l.ask || l.when || l.note));
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
          <div class="ring running" id="ring" style="--ring-ms:${IDLE_MS}ms" title="חוזר לחיפוש אחרי 5 שניות בלי נגיעה">
            <svg width="44" height="44" viewBox="0 0 44 44"><circle class="track" cx="22" cy="22" r="18"/><circle class="bar" cx="22" cy="22" r="18"/></svg>
            <span>5</span>
          </div>
        </div>
        <div class="warmth" role="group" aria-label="כמה חם">
          ${Object.entries(WARMTH).map(([k, v]) => `<button class="w-btn ${k}" data-warm="${k}" aria-pressed="${l.warmth === k}">${k === 'hot' ? '🔥 ' : ''}${v}</button>`).join('')}
        </div>
        ${S.business.offerings.length ? `
          <div><div class="field-label">מה עניין אותו</div>
          <div class="chips">${S.business.offerings.map((o) => `<button class="chip" data-int="${esc(o)}" aria-pressed="${l.interests.includes(o)}">${esc(o)}</button>`).join('')}</div></div>` : ''}
        <div class="inline">
          <button class="more-toggle" data-act="more" aria-expanded="${moreOpen}">${moreOpen ? '− פחות' : '+ עוד: ' + [t.ask ? t.ask.label : null, 'מתי', 'הערה'].filter(Boolean).join(' · ')}</button>
          ${S.business.catalog ? `<button class="chip" data-act="send" aria-pressed="${l.sendMaterial}">📎 ${l.sendMaterial ? 'החומר יישלח' : 'שלח חומר'}</button>` : ''}
        </div>
        ${moreOpen ? `
          <div class="more">
            ${t.ask ? `<div><div class="field-label">${esc(t.ask.label)}</div><div class="chips">${t.ask.options.map((o) => `<button class="chip" data-ask="${esc(o)}" aria-pressed="${l.ask === o}">${esc(o)}</button>`).join('')}</div></div>` : ''}
            <div><div class="field-label">מתי זה רלוונטי</div><div class="chips">${WHEN_OPTIONS.map((o) => `<button class="chip" data-when="${esc(o)}" aria-pressed="${l.when === o}">${esc(o)}</button>`).join('')}</div></div>
            <div><label class="field-label" for="note">הערה</label><textarea id="note" placeholder="למשל: חידוש כל הריהוט במוסד, רוצה שאבוא למדוד">${esc(l.note)}</textarea></div>
          </div>` : ''}
        <div class="next-line">
          <span>הלאה: <b>${esc(nx.label)}</b>${nx.due ? ' · ' + esc(relDay(new Date(nx.due), NOW())) : ''}${l.next ? '' : ' <span class="optional">(הצעה)</span>'}</span>
          <button class="next-btn" data-act="next-cycle">לשנות</button>
        </div>
      </section>`;
    const note = $('#note');
    if (note) {
      // While writing, the clock waits longer, but never forever: 15 seconds after the last keystroke.
      note.addEventListener('focus', () => pauseIdle(NOTE_IDLE_MS));
      note.addEventListener('input', () => { l.note = note.value; save(); pauseIdle(NOTE_IDLE_MS); });
      note.addEventListener('blur', () => startIdle());
    }
    startIdle();
  }

  function startIdle() {
    stopIdle();
    const ring = $('#ring');
    if (ring) { ring.classList.remove('running', 'paused'); void ring.offsetWidth; ring.classList.add('running'); }
    idleTimer = setTimeout(closePanel, IDLE_MS);
  }
  function pauseIdle(ms) {
    stopIdle();
    const ring = $('#ring');
    if (ring) { ring.classList.remove('running'); void ring.offsetWidth; ring.classList.add('running', 'paused'); }
    if (ms) idleTimer = setTimeout(closePanel, ms);
  }
  function stopIdle() { if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; } }

  function closePanel() {
    stopIdle();
    const l = leadById(openLeadId);
    openLeadId = null;
    if (S.stage !== 'booth') return;
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
    if (S.stage !== 'booth') { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'recent'; bar.className = 'recent'; document.body.appendChild(bar); }
    const recent = S.leads.slice().sort((a, b) => b.visits[b.visits.length - 1] - a.visits[a.visits.length - 1]).slice(0, 10);
    bar.innerHTML = `<div class="recent-inner"><span class="recent-label">אחרונים</span>${recent.length ? recent.map((l) => `
      <button class="r-chip" data-open="${l.id}"><span class="w-dot ${l.warmth || ''}"></span>${esc(leadName(l))}${l.visits.length > 1 ? ' ↺' : ''}</button>`).join('') : '<span class="optional">עוד אין. מי שייקלט יופיע כאן.</span>'}</div>`;
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
    if (!openLeadId) viewBooth(); else { renderRecent(); }
  }

  // ---------------- Evening ----------------
  function viewEvening() {
    const todo = S.leads.filter((l) => l.status === 'open' && !l.warmth);
    if (!todo.length) {
      main().innerHTML = `<div class="stack"><div class="card done">
        <h2>הכול מתויג</h2>
        <p class="lead-text" style="margin-inline:auto">${S.leads.length ? `<span class="num">${S.leads.length}</span> אנשים נקלטו היום, וכולם קיבלו חום. מחר בבוקר תראה את השיחות של היום.` : 'עוד לא נקלט אף אחד. אפשר לחזור לדוכן, או לטעון יום לדוגמה מהתפריט.'}</p>
        <div class="inline" style="justify-content:center"><button class="btn primary" data-stage="today">למחר בבוקר</button></div>
      </div></div>`;
      return;
    }
    const l = todo[0];
    main().innerHTML = `<div class="stack">
      <div><h1>חמש דקות של ערב</h1><p class="lead-text">מי שלא הספקת לתייג בדוכן. נגיעה אחת לכל אחד, כל עוד אתה זוכר.</p></div>
      <div class="card">
        <div class="card-count num">${todo.length === 1 ? 'האחרון' : 'נשארו ' + todo.length}</div>
        <div><div class="person-main"><span class="person-name">${esc(leadName(l))}</span><span class="person-city">${esc(leadTown(l))}</span></div>
          <div class="person-meta">${esc(leadMeta(l))}</div></div>
        <div class="optional">היה בדוכן ב-<span class="num">${hhmm(new Date(l.createdAt))}</span> · ${l.source === 'dial' ? 'חייג' : 'נקלט בחיפוש'}${l.interests.length ? ' · התעניין ב' + esc(l.interests.join(', ')) : ''}</div>
        <div class="warmth">${Object.entries(WARMTH).map(([k, v]) => `<button class="w-btn ${k}" data-eve="${k}" data-id="${l.id}">${k === 'hot' ? '🔥 ' : ''}${v}</button>`).join('')}</div>
        <button class="btn ghost" data-eve="skip" data-id="${l.id}">לא זוכר, לדלג</button>
      </div></div>`;
  }

  // ---------------- Today ----------------
  let todayTab = 'todo';
  let callStep = null; // id of lead whose outcome is being asked

  function viewToday() {
    const now = NOW();
    const calls = todaysCalls(now);
    const openTasks = S.leads.filter((l) => l.status === 'open' && nextOf(l).kind === 'task');
    const audience = S.leads.filter((l) => (l.status === 'audience' || (l.status === 'open' && nextOf(l).kind === 'audience')));
    const untagged = S.leads.filter((l) => l.status === 'open' && !l.warmth).length;
    let card;
    if (!calls.length) {
      card = `<div class="card done"><h2>אין שיחות להיום</h2><p class="lead-text" style="margin-inline:auto">${S.leads.length ? 'מה שצריך לקרות קרה, והשאר מתוזמן לימים הבאים.' : 'עוד אין לידים. אפשר לטעון יום לדוגמה מהתפריט.'}</p></div>`;
    } else {
      const l = calls[0];
      const asking = callStep === l.id;
      card = `<div class="card">
        <div class="card-count num">שיחה 1 מתוך ${calls.length} להיום</div>
        <div><div class="person-main"><span class="person-name">${esc(leadName(l))}</span><span class="person-city">${esc(leadTown(l))}</span></div>
          <div class="person-meta">${esc(leadMeta(l))}</div></div>
        <div class="why">למה עכשיו: ${esc(whyNow(l, now))}</div>
        ${l.note ? `<div>"${esc(l.note)}"</div>` : ''}
        <div class="optional">הלאה: ${esc(nextOf(l).label)}${l.calls.length ? ' · ניסיונות קודמים: ' + l.calls.length : ''}${l.pid != null ? '' : l.custom && l.custom.phone ? ' · ' + esc(l.custom.phone) : ''}</div>
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
      <div class="section-head"><div><h1>השיחות של היום</h1><p class="lead-text">כרטיס אחד בכל פעם. אחרי כל שיחה, נגיעה אחת, והמערכת מתזמנת את ההמשך.</p></div></div>
      ${untagged ? `<div class="waiting"><span class="waiting-label">${untagged} עוד לא מתויגים מאתמול.</span><button class="btn" data-stage="evening">לתייג עכשיו</button></div>` : ''}
      ${card}
    </div>
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" data-tab="todo" aria-selected="${todayTab === 'todo'}">לטיפול <span class="num">(${openTasks.length})</span></button>
      <button class="tab" role="tab" data-tab="aud" aria-selected="${todayTab === 'aud'}">קהל <span class="num">(${audience.length})</span></button>
    </div>
    <div class="rows">${(todayTab === 'todo' ? openTasks.sort((a, b) => (nextOf(a).due || 0) - (nextOf(b).due || 0)) : audience).map((l) => {
      const nx = nextOf(l);
      return `<div class="row"><span><span class="w-dot ${l.warmth || ''}" style="display:inline-block;margin-inline-end:8px"></span><span class="person-name">${esc(leadName(l))}</span> <span class="row-side">${esc(leadTown(l))}</span></span>
        <span class="row-side">${todayTab === 'todo' ? esc(nx.label) + (nx.due ? ' · ' + esc(relDay(new Date(nx.due), now)) : '') : esc(l.interests.join(', ') || 'כללי')}</span></div>`;
    }).join('') || '<div class="empty-hint">ריק.</div>'}</div>`;
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
      <div class="section-head"><div><h1>שבועיים אחרי התערוכה</h1><p class="lead-text">מה יצא מהדוכן. המספרים שלך בלבד, בלי השוואה לאף אחד.</p></div>
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
    for (let n = 0; n < 36; n++) {
      let i;
      do { i = Math.floor(rnd() * PEOPLE.length); } while (used.has(i) || isWoman(person(i)));
      used.add(i);
      const at = t0 + Math.floor(rnd() * 9.5 * 3600000);
      const r = rnd();
      const kind = r < 0.5 ? 'friend' : r < 0.62 ? 'untagged' : r < 0.85 ? 'warm' : 'hot';
      const l = newLead({ pid: i, createdAt: at, visits: [at], source: rnd() < 0.3 ? 'dial' : 'search', touched: true });
      if (kind === 'friend') l.warmth = 'cold';
      if (kind === 'warm') { l.warmth = 'warm'; l.interests = offers.length ? [offers[Math.floor(rnd() * offers.length)]] : []; }
      if (kind === 'hot') {
        l.warmth = 'hot';
        l.interests = offers.length ? [offers[Math.floor(rnd() * offers.length)]] : [];
        if (askOpts.length) l.ask = askOpts[Math.floor(rnd() * askOpts.length)];
        l.when = WHEN_OPTIONS[Math.floor(rnd() * 2)];
        if (rnd() < 0.5) l.note = ['רוצה שאבוא למדוד', 'לחזור אחרי החגים', 'מחפש משהו מיוחד, לשלוח דוגמאות', 'מוסד, להכין הצעה מסודרת'][Math.floor(rnd() * 4)];
        if (rnd() < 0.35) l.visits.push(at + 2 * 3600000);
      }
    }
    S.business.setupDone = true;
    save(); render();
    toast('נטען יום לדוגמה: 36 אנשים, בשעות 10:00–19:30');
  }

  // ------------------------------------------------------------------
  // 7. Shell: time machine, menu, toast, modal
  // ------------------------------------------------------------------

  const STAGES = [
    { id: 'setup', label: 'הכנה' },
    { id: 'booth', label: 'יום התערוכה' },
    { id: 'evening', label: 'ערב' },
    { id: 'today', label: 'למחרת' },
    { id: 'day14', label: 'יום 14' },
  ];

  function renderTopbar() {
    const now = NOW();
    $('#topbar').innerHTML = `<div class="topbar-inner">
      <div class="brand"><span class="brand-name">${esc(S.business.name || 'העסק שלי')}</span>
        <span class="brand-sub">${esc(tpl().name)} · <span class="pill ${REAL ? 'real' : ''}">${REAL ? 'רשימה אמיתית · ' + PEOPLE.length.toLocaleString('he-IL') : 'נתוני הדגמה'}</span></span></div>
      <nav class="stages" aria-label="מכונת זמן">
        ${STAGES.map((s, n) => `<button class="stage" data-stage="${s.id}" ${S.stage === s.id ? 'aria-current="step"' : ''}><span class="dot num">${n + 1}</span><span class="label">${s.label}</span></button>`).join('')}
      </nav>
      <div class="clock"><span class="clock-date" id="clock-date">${esc(hebDate(now))}</span><span class="clock-time num" id="clock-time">${S.stage === 'setup' ? 'שבוע לפני' : hhmm(now)}</span></div>
      <button class="icon-btn" data-act="menu" aria-haspopup="true" aria-label="כלי הדגמה">⋯</button>
    </div>`;
  }

  function toggleMenu() {
    const existing = $('#menu');
    if (existing) { existing.remove(); return; }
    const m = document.createElement('div');
    m.id = 'menu'; m.className = 'menu';
    m.innerHTML = `
      <button data-act="demo-day">טעינת יום תערוכה לדוגמה (36 אנשים)</button>
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
    if (restart !== false && openLeadId && S.stage === 'booth') startIdle();
  }

  function confirmReset() {
    modal(`<h2>להתחיל מחדש?</h2><p class="lead-text">כל הלידים וההגדרות בדוגמית יימחקו מהמכשיר הזה.</p>
      <div class="inline"><button class="btn primary" data-act="reset-yes">כן, מחדש</button><button class="btn ghost" data-act="close-modal">ביטול</button></div>`);
  }

  function setStage(id) {
    stopIdle();
    openLeadId = null; callStep = null;
    S.stage = id;
    save(); render();
    window.scrollTo(0, 0);
  }

  function render() {
    renderTopbar();
    ({ setup: viewSetup, booth: viewBooth, evening: viewEvening, today: viewToday, day14: viewDay14 }[S.stage] || viewSetup)();
    if (S.stage !== 'booth') renderRecent();
  }

  // One delegated handler for every button in the app.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, label[for]');
    if (!b) { const m = $('#menu'); if (m && !e.target.closest('#menu')) m.remove(); return; }
    const d = b.dataset;
    if (!b.closest('#menu') && d.act !== 'menu') { const m = $('#menu'); if (m) m.remove(); }

    // Any touch inside the open panel restarts the five-second clock.
    if (openLeadId && b.closest('.panel')) startIdle();

    if (d.stage) return setStage(d.stage);
    if (d.tpl) { S.business.template = d.tpl; S.business.offerings = SUGGESTED_OFFERINGS[d.tpl].slice(0, 5); save(); return viewSetup(); }
    if (d.offer) { const o = S.business.offerings; const k = o.indexOf(d.offer); if (k >= 0) o.splice(k, 1); else if (o.length < 8) o.push(d.offer); save(); return viewSetup(); }
    if (d.pick) return pickPerson(parseInt(d.pick, 10));
    if (d.open) return openLead(parseInt(d.open, 10));

    const l = openLeadId ? leadById(openLeadId) : null;
    // A warmth tap refreshes the machine's proposal, never a next step the person chose.
    if (d.warm && l) { l.warmth = l.warmth === d.warm ? null : d.warm; if (!l.next || l.next.by !== 'person') l.next = null; save(); return renderPanel(); }
    if (d.int && l) { const k = l.interests.indexOf(d.int); if (k >= 0) l.interests.splice(k, 1); else l.interests.push(d.int); save(); return renderPanel(); }
    if (d.ask && l) { l.ask = l.ask === d.ask ? null : d.ask; save(); return renderPanel(); }
    if (d.when && l) { l.when = l.when === d.when ? null : d.when; save(); return renderPanel(); }

    if (d.eve) {
      const x = leadById(parseInt(d.id, 10));
      if (x && d.eve === 'skip') { x.warmth = 'cold'; x.skipped = true; }
      else if (x) x.warmth = d.eve;
      save(); return viewEvening();
    }
    if (d.out) { const x = leadById(callStep); if (x) recordOutcome(x, d.out); callStep = null; save(); return viewToday(); }
    if (d.tab) { todayTab = d.tab; return viewToday(); }

    switch (d.act) {
      case 'more': moreOpen = !moreOpen; return renderPanel();
      case 'send': if (l) { l.sendMaterial = !l.sendMaterial; save(); renderPanel(); if (l.sendMaterial) toast('📎 ' + S.business.catalog + ' מסומן לשליחה ל' + leadName(l) + '. בדוגמית לא נשלח באמת.'); } return;
      case 'next-cycle': {
        if (!l) return;
        const cur = l.next ? OVERRIDES.findIndex((o) => o.label === l.next.label) : -1;
        const o = OVERRIDES[cur + 1];
        if (!o) l.next = null;
        else if (o.audience) l.next = { label: o.label, due: null, kind: 'audience', by: 'person' };
        else l.next = { label: o.label, due: daysFrom(NOW(), o.days, 10).getTime(), kind: 'task', by: 'person' };
        save(); return renderPanel();
      }
      case 'new-person': return newPersonModal();
      case 'np-save': return saveNewPerson();
      case 'close-modal': return closeModal();
      case 'sim-dial': return simulateDial();
      case 'add-offer': return addOffer();
      case 'setup-done': S.business.setupDone = true; return setStage('booth');
      case 'setup-skip': S.business.template = 'general'; S.business.offerings = []; S.business.setupDone = false; return setStage('booth');
      case 'call': callStep = parseInt(d.id, 10); return viewToday();
      case 'call-cancel': callStep = null; return viewToday();
      case 'sim-two-weeks': $('#menu') && $('#menu').remove(); simulateTwoWeeks(); return setStage('day14');
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
      case 'reset-yes': S = freshState(); save(); closeModal(false); lastAction = null; return setStage('setup');
    }
  });

  // Typing anywhere on the booth screen goes to the search box.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); const m = $('#menu'); if (m) m.remove(); if (openLeadId) closePanel(); return; }
    if (S.stage !== 'booth' || $('#scrim')) return;
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
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'he');
  try { const th = localStorage.getItem('expo-proto-theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { /* ignore */ }
  load();
  render();
  // Keep the booth clock moving while the screen is open.
  // Only the clock text changes, so an open menu is never redrawn away.
  setInterval(() => {
    if (S.stage !== 'booth') return;
    const t = $('#clock-time'); if (t) t.textContent = hhmm(NOW());
  }, 30000);
})();
