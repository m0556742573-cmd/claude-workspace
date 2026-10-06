/* Expo leads — demo 3, second shape.
 *
 * Two phases, not three moments:
 *   Setup  — the business in his own words; the buttons and the step behind
 *            each; warmth and the booth; seasons on the Jewish calendar;
 *            material and the channels it goes out on; a practice booth.
 *            After the fair opens, the same screens are the advanced settings.
 *   Live   — the booth, the booth's dashboard (today's tagging), and the CRM.
 *
 * The idea that holds it together: every business speaks in its own words,
 * but behind every word is one of a fixed set of step kinds the system knows
 * how to act on. Claude or the word list may name a step in the trade's
 * language; neither may invent a kind. Warmth, the next step and its date are
 * worked out from what was tapped, and every one of them can be overridden.
 *
 * Reading the business: inside a Claude viewer, Claude (the `sample`
 * capability). Anywhere else, a word list measured on 200 real community
 * businesses — it understood about a quarter, which is why it is only the
 * fallback and why every button stays editable by hand.
 */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const FINE = window.matchMedia && window.matchMedia('(pointer: fine)').matches; // a mouse, not a finger

  // ------------------------------------------------------------------
  // The word list — the fallback reader.
  // Each entry: the words that give it away, the button it becomes, what the
  // exhibitor usually does next (in plain words), the trade, the busy season.
  // ------------------------------------------------------------------
  const DICT = [
    { k: ['מטבח', 'מיטבח'], label: 'מטבחים', next: 'לתאם מדידה', trade: 'נגרות ומטבחים' },
    { k: ['ארון', 'ארונות קיר'], label: 'ארונות', next: 'לתאם מדידה', trade: 'נגרות ומטבחים' },
    { k: ['ארונות קודש', 'ארון קודש', 'בימה', 'בימות'], label: 'ריהוט לבית כנסת', next: 'לתאם פגישה', trade: 'נגרות ומטבחים', inst: true },
    { k: ['דלת'], label: 'דלתות', next: 'לשלוח הצעת מחיר', trade: 'נגרות ומטבחים' },
    { k: ['ספריות', 'ספרייה'], label: 'ספריות', next: 'לתאם מדידה', trade: 'נגרות ומטבחים' },
    { k: ['חדרי ילדים', 'חדר ילדים'], label: 'חדרי ילדים', next: 'לתאם מדידה', trade: 'נגרות ומטבחים' },
    { k: ['נגר', 'נגריה', 'נגרייה', 'נגרות'], label: 'נגרות', next: 'לתאם מדידה', trade: 'נגרות ומטבחים' },
    { k: ['ריהוט', 'רהיט'], label: 'ריהוט', next: 'לשלוח הצעת מחיר', trade: 'ריהוט' },
    { k: ['וילון'], label: 'וילונות', next: 'לתאם מדידה', trade: 'עיצוב הבית' },
    { k: ['גופי תאורה', 'תאורה', 'לדים'], label: 'תאורה', next: 'לשלוח הצעת מחיר', trade: 'תאורה' },
    { k: ['שיפוץ'], label: 'שיפוצים', next: 'לתאם ביקור', trade: 'שיפוצים ובנייה', season: 'אחרי החגים' },
    { k: ['מיזוג', 'מזגן'], label: 'מיזוג אוויר', next: 'לשלוח הצעת מחיר', trade: 'מיזוג אוויר', season: 'לפני הקיץ' },
    { k: ['מצלמות אבטחה', 'מצלמות', 'אינטרקום', 'אזעקה', 'אבטחה'], label: 'מערכות אבטחה', next: 'לתאם ביקור', trade: 'אבטחה ותקשורת' },
    { k: ['מוצרי חשמל', 'מקרר', 'מכונת כביסה'], label: 'מוצרי חשמל', next: 'להתקשר עם הצעה', trade: 'מוצרי חשמל' },
    { k: ['חשמלאי', 'חשמל'], label: 'עבודות חשמל', next: 'לתאם ביקור', trade: 'בעלי מקצוע' },
    { k: ['אינסטלציה', 'אינסטלטור'], label: 'אינסטלציה', next: 'לתאם ביקור', trade: 'בעלי מקצוע' },
    { k: ['דפוס', 'הדפסה'], label: 'דפוס', next: 'לשלוח הצעת מחיר', trade: 'דפוס וגרפיקה', season: 'עונת החתונות' },
    { k: ['הזמנות'], label: 'הזמנות לשמחות', next: 'לשלוח דוגמאות', trade: 'דפוס וגרפיקה', season: 'עונת החתונות' },
    { k: ['חוברת', 'חוברות'], label: 'חוברות', next: 'לשלוח הצעת מחיר', trade: 'דפוס וגרפיקה' },
    { k: ['שילוט', 'שלט'], label: 'שילוט', next: 'לשלוח הצעת מחיר', trade: 'דפוס וגרפיקה' },
    { k: ['עיצוב גרפי', 'גרפיקה', 'לוגו', 'מיתוג'], label: 'מיתוג ועיצוב', next: 'לקבוע פגישה', trade: 'דפוס וגרפיקה' },
    { k: ['דג'], label: 'דגים', next: 'להתקשר עם מבצע', trade: 'מזון', season: 'לפני פסח וראש השנה' },
    { k: ['בשר', 'עוף', 'עופות'], label: 'בשר ועופות', next: 'להתקשר עם מבצע', trade: 'מזון', season: 'לפני החגים' },
    { k: ['מאפה', 'מאפים', 'חלה', 'חלות', 'עוגה', 'עוגות'], label: 'מאפים', next: 'להתקשר עם מבצע', trade: 'מזון', season: 'לפני החגים' },
    { k: ['משלוח'], label: 'משלוחים', next: 'להציע משלוח קבוע', trade: 'מזון' },
    { k: ['קייטרינג'], label: 'קייטרינג', next: 'לבדוק תאריך', trade: 'אירועים', season: 'עונת החתונות' },
    { k: ['אולם'], label: 'אולם אירועים', next: 'לבדוק תאריך', trade: 'אירועים', season: 'עונת החתונות' },
    { k: ['צילום', 'צלם'], label: 'צילום', next: 'לבדוק תאריך', trade: 'אירועים', season: 'עונת החתונות' },
    { k: ['תזמורת', 'זמר', 'אורגן'], label: 'מוזיקה לשמחות', next: 'לבדוק תאריך', trade: 'אירועים', season: 'עונת החתונות' },
    { k: ['טיול'], label: 'טיולים', next: 'לבדוק תאריך', trade: 'נופש והפעלות', season: 'בין הזמנים' },
    { k: ['צימר'], label: 'צימרים', next: 'לבדוק תאריך', trade: 'נופש והפעלות', season: 'בין הזמנים' },
    { k: ['הפעלה', 'הפעלות', 'חוויה', 'חוויתי'], label: 'הפעלות', next: 'לבדוק תאריך', trade: 'נופש והפעלות', season: 'בין הזמנים' },
    { k: ['הסעות', 'הסעה', 'אוטובוס'], label: 'הסעות', next: 'לבדוק תאריך', trade: 'תחבורה', season: 'בין הזמנים' },
    { k: ['השכרת רכב', 'רכב להשכרה'], label: 'השכרת רכב', next: 'לבדוק תאריך', trade: 'תחבורה', season: 'בין הזמנים' },
    { k: ['שיעורי נהיגה', 'נהיגה'], label: 'שיעורי נהיגה', next: 'לקבוע שיעור ראשון', trade: 'הדרכה' },
    { k: ['קורס', 'הכשרה', 'סדנה', 'סדנאות'], label: 'קורסים', next: 'לשלוח פרטי הרשמה', trade: 'הדרכה', season: 'אלול' },
    { k: ['ביטוח'], label: 'ביטוח', next: 'לקבוע פגישה', trade: 'פיננסים' },
    { k: ['משכנתא', 'משכנתאות'], label: 'משכנתאות', next: 'לקבוע פגישה', trade: 'פיננסים' },
    { k: ['הנהלת חשבונות', 'רואה חשבון', 'ראיית חשבון'], label: 'הנהלת חשבונות', next: 'לקבוע פגישה', trade: 'פיננסים', season: 'סוף שנת המס' },
    { k: ['ייעוץ עסקי', 'ליווי עסקי'], label: 'ייעוץ עסקי', next: 'לקבוע פגישה', trade: 'ייעוץ' },
    { k: ['אתר', 'בניית אתרים', 'אפליקציה', 'אפליקציות', 'אוטומציה'], label: 'אתרים ואוטומציה', next: 'לקבוע פגישה', trade: 'דיגיטל' },
    { k: ['תיקון מחשבים', 'תיקון סלולר', 'מעבדה'], label: 'תיקונים', next: 'להזמין לתיקון', trade: 'מחשבים וסלולר' },
    { k: ['מחשב'], label: 'מחשבים', next: 'לשלוח הצעת מחיר', trade: 'מחשבים וסלולר' },
    { k: ['טלפון', 'סלולר', 'פלאפון'], label: 'טלפונים', next: 'להתקשר עם הצעה', trade: 'מחשבים וסלולר' },
    { k: ['בדיקת מזוזות', 'בדיקת תפילין'], label: 'בדיקת סת"ם', next: 'לתאם בדיקה', trade: 'תשמישי קדושה', season: 'אלול' },
    { k: ['ספרי תורה', 'סת"ם', 'ספרי קודש'], label: 'ספרי קודש', next: 'להתקשר עם הצעה', trade: 'תשמישי קדושה' },
    { k: ['אתרוג', 'לולב', 'ארבעת המינים'], label: 'ארבעת המינים', next: 'לשמור הזמנה', trade: 'תשמישי קדושה', season: 'לפני סוכות' },
    { k: ['יודאיקה', 'תשמישי קדושה', 'מזוזה', 'מזוזות', 'תפילין', 'כלי כסף'], label: 'יודאיקה', next: 'להתקשר עם הצעה', trade: 'תשמישי קדושה', season: 'אלול–תשרי' },
    { k: ['שטריימל'], label: 'שטריימלים', next: 'לתאם מדידה', trade: 'ביגוד', season: 'עונת החתונות' },
    { k: ['כובע'], label: 'כובעים', next: 'להתקשר עם הצעה', trade: 'ביגוד' },
    { k: ['בגד', 'בגדי', 'חליפה', 'מעיל'], label: 'ביגוד', next: 'להתקשר עם הצעה', trade: 'ביגוד', season: 'לפני פסח וסוכות' },
    { k: ['מתנה', 'מתנות'], label: 'מתנות', next: 'להתקשר עם הצעה', trade: 'מתנות', season: 'חנוכה' },
    { k: ['משחק', 'צעצוע'], label: 'משחקים', next: 'להתקשר עם הצעה', trade: 'משחקים', season: 'חנוכה' },
    { k: ['ציוד מטבח', 'סכין', 'סכו"ם'], label: 'ציוד למטבח', next: 'לשלוח הצעת מחיר', trade: 'ציוד למוסדות' },
    { k: ['אדריכל', 'אדריכלות', 'עיצוב פנים'], label: 'אדריכלות ועיצוב', next: 'לקבוע פגישה', trade: 'אדריכלות' },
    { k: ['נדל"ן', 'נדלן', 'תיווך', 'דירות'], label: 'נדל"ן', next: 'לקבוע פגישה', trade: 'נדל"ן' },
  ];

  /* Matching by whole words, not by substrings: "ילדים" holds "לדים" and
   * "מצלמות" holds "צלם" — substring matching turned kindergartens into
   * lighting. A keyword matches a word that equals it, optionally with a
   * one-letter Hebrew prefix (ו ה ב ל and their pairs) and a plural or
   * construct ending. Final letters are made regular on both sides. */
  const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  const fin = (s) => s.replace(/[ךםןףץ]/g, (c) => FIN[c]);
  // Words are compared with final letters made regular, so the endings must be too ('ים' -> 'ימ').
  const PREFIX = ['', 'ו', 'ה', 'ב', 'ל', 'וה', 'וב', 'ול', 'של', 'שה', 'שב'].map(fin);
  const SUFFIX = ['', 'ים', 'ות', 'ה', 'י', 'ית', 'יות', 'יה', 'ייה'].map(fin);
  const wordsOf = (s) => fin(String(s)).replace(/[^א-תa-zA-Z0-9"׳״']+/g, ' ').trim().split(' ').filter(Boolean);
  const KEYS = [];
  DICT.forEach((d, di) => d.k.forEach((k) => KEYS.push({ di, w: wordsOf(k) })));
  KEYS.sort((a, b) => b.w.length - a.w.length || b.w.join('').length - a.w.join('').length);
  const wordIs = (word, key, first, last) => PREFIX.some((p) => (first || !p) && SUFFIX.some((s) => (last || !s) && word === p + key + s));

  /** Every dictionary entry found in the text, longest phrase first; a word used by one match is not used again. */
  function findEntries(text) {
    const ws = wordsOf(text);
    const used = new Array(ws.length).fill(false);
    const hits = [];
    for (const key of KEYS) {
      const n = key.w.length;
      for (let i = 0; i + n <= ws.length; i++) {
        let ok = true;
        for (let j = 0; j < n && ok; j++) ok = !used[i + j] && wordIs(ws[i + j], key.w[j], j === 0, j === n - 1);
        if (!ok) continue;
        for (let j = 0; j < n; j++) used[i + j] = true;
        if (!hits.some((h) => h.di === key.di)) hits.push({ di: key.di, at: i });
      }
    }
    return hits.sort((a, b) => a.at - b.at).map((h) => DICT[h.di]);
  }

  const AUDIENCE = 'בתים|קבוצות|עסקים|משפחות|ציבור|אולמות|מוסדות|מוסד|בתי כנסת|ישיבות|תלמודי תורה|גנים|זוגות|בחורים|אברכים|חתנים|כלות';
  const AUD_RE = new RegExp('\\s*,?\\s*ו?(גם\\s+)?(ל|ב|של\\s+)(' + AUDIENCE + ')\\s*$');
  const INST_RE = /מוסד|בית כנסת|בתי כנסת|ישיב|תלמוד תורה|תלמודי תורה|ת"ת|גבא|קהיל/;
  const FILLER_RE = /^(אני|אנחנו|אנו)?\s*(מוכר|מוכרים|עוסק ב|עוסקים ב|עושה|עושים|יש לנו|יש לי|מתמחה ב|מתמחים ב)\s+/;
  const PRICE_RE = /\s*(מ-?|ב-?|החל מ-?)?\s*\d[\d,.]*\s*(ש"ח|₪|שקל|שקלים)?/g;

  function dropAudience(s) {
    let out = s;
    let prev;
    do { prev = out; out = out.replace(AUD_RE, '').trim(); } while (out !== prev);
    return out;
  }
  /** Does this text begin with a known word? Used to split "X ו-Y" only where Y is a product. */
  function opensKey(s) {
    const first = wordsOf(s)[0] || '';
    return KEYS.some((k) => wordIs(first, k.w[0], true, k.w.length === 1));
  }
  function splitAnd(piece) {
    const parts = [];
    const re = /\sו(?=\S)/g;
    let last = 0;
    let m;
    while ((m = re.exec(piece))) {
      if (opensKey(piece.slice(m.index + 2))) { parts.push(piece.slice(last, m.index)); last = m.index + 2; }
    }
    parts.push(piece.slice(last));
    return parts.map((s) => s.trim()).filter(Boolean);
  }

  // ------------------------------------------------------------------
  // The kinds of next step. The exhibitor names each in his own words; the
  // kind is what the system acts on — which list a lead lands on, and when.
  // Neither the word list nor Claude may invent a kind: they choose one.
  // ------------------------------------------------------------------
  const H = window.HebCal;
  const STEPS = {
    call:     { name: 'להתקשר', days: 2, icon: '📞', label: 'לחזור אליו' },
    send:     { name: 'לשלוח חומר', days: 1, icon: '📎', label: 'לשלוח חומר' },
    quote:    { name: 'הצעת מחיר', days: 2, icon: '🧾', label: 'להכין הצעת מחיר' },
    meet:     { name: 'פגישה או ביקור', days: 3, icon: '🤝', label: 'לתאם פגישה' },
    date:     { name: 'תלוי תאריך', days: 1, icon: '📅', label: 'לבדוק תאריך' },
    register: { name: 'הרשמה', days: 1, icon: '✍️', label: 'לשלוח פרטי הרשמה' },
    regular:  { name: 'לקוח קבוע', days: 7, icon: '🔁', label: 'להציע אספקה קבועה' },
    season:   { name: 'לעונה', days: null, icon: '🗓', label: 'לחזור לפני העונה' },
    none:     { name: 'בלי משימה — קהל', days: null, icon: '·', label: 'קהל' },
  };
  // When a visitor carries several buttons, the most committing step wins.
  const PRI = ['meet', 'quote', 'date', 'register', 'regular', 'send', 'call', 'season', 'none'];
  function typeOfNext(s) {
    s = String(s || '');
    if (/הצעת מחיר|להכין הצעה|לשלוח הצעה/.test(s)) return 'quote';
    if (/הרשמ|שיעור ראשון/.test(s)) return 'register';
    if (/תאריך/.test(s)) return 'date';
    if (/קבוע/.test(s)) return 'regular';
    if (/לשלוח|מחירון|דוגמאות|קטלוג/.test(s)) return 'send';
    if (/מדיד|ביקור|פגיש|לתאם|בדיק|טעימ|הדגמ|תיקון/.test(s)) return 'meet';
    if (/לפני ה|לעונה/.test(s)) return 'season';
    return 'call';
  }
  /* What separates one customer from another. A carpenter separates by product,
   * a distributor of bakeries by who is buying and how much. Each business gets
   * the one or two that matter to it, never all four. */
  const AXES = {
    what: { title: 'במה התעניין', hint: 'מוצרים או שירותים', multi: true },
    who:  { title: 'מי הוא בשבילך', hint: 'סוג הלקוח' },
    size: { title: 'סדר גודל', hint: 'כמה הוא יכול לקנות' },
    when: { title: 'מתי', hint: 'עכשיו, לשמחה, לעונה' },
  };
  const WEIGHT = ['רגיל', 'טוב', 'חשוב', 'חשוב מאוד'];
  const SEASON_WORDS = {
    'אחרי החגים': ['afterchag'], 'לפני הקיץ': ['summer'], 'עונת החתונות': ['weddings'], 'לפני פסח וראש השנה': ['pesach', 'elul'],
    'לפני החגים': ['pesach', 'elul', 'sukkot'], 'בין הזמנים': ['bein'], 'אלול': ['elul'], 'סוף שנת המס': ['tax'], 'לפני סוכות': ['sukkot'],
    'אלול–תשרי': ['elul', 'sukkot'], 'חנוכה': ['chanukah'], 'לפני פסח וסוכות': ['pesach', 'sukkot'],
  };

  /** The word-list reader: products only, plus customer types when he works with institutions. */
  function parseWords(text) {
    const what = [];
    const unclear = [];
    const dropped = [];
    const trades = {};
    const seasons = new Set();
    const add = (name, entry, unsure) => {
      const key = name.replace(PRICE_RE, ' ').replace(/\s+/g, ' ').trim();
      if (!key || what.some((p) => p.label === key)) return;
      if (what.length >= 8) { dropped.push(key); return; }
      what.push({ label: key, step: entry ? { type: typeOfNext(entry.next), label: entry.next } : null, weight: 1, unsure: !!unsure });
      if (entry && entry.trade) trades[entry.trade] = (trades[entry.trade] || 0) + 1;
      if (entry && entry.season) (SEASON_WORDS[entry.season] || []).forEach((s) => seasons.add(s));
    };
    let institutions = INST_RE.test(text);
    const pieces = String(text || '').split(/[,،;\n:]+|\sוגם\s/).map((s) => s.trim()).filter(Boolean);
    for (const raw of pieces) {
      const whole = dropAudience(raw.replace(/^גם\s+/, '').replace(FILLER_RE, ''));
      for (const part of splitAnd(whole)) {
        const piece = /^ו/.test(part) && !findEntries(part).length ? part.slice(1) : part;
        if (!piece || /^(ועוד|וכו|ועוד הרבה|הכל|הכול)$/.test(piece)) continue;
        const hits = findEntries(piece);
        if (hits.some((h) => h.inst)) institutions = true;
        if (hits.length === 1) add(piece.length <= 26 ? piece : hits[0].label, hits[0]);
        else if (hits.length > 1) hits.forEach((h) => add(h.label, h));
        else { unclear.push(piece); add(piece, null, true); }
      }
    }
    const who = institutions ? [
      { label: 'פרטי', step: null, weight: 0 },
      { label: 'מוסד', step: { type: 'meet', label: 'לקבוע פגישה' }, weight: 3 },
      { label: 'גבאי או קבוצה', step: { type: 'call', label: 'להציע לקבוצה' }, weight: 2 },
    ] : [];
    const trade = Object.keys(trades).sort((a, b) => trades[b] - trades[a])[0] || '';
    return { trade, axes: { what, who }, seasons: Array.from(seasons), unclear, dropped, defStep: null, by: 'words' };
  }

  // ------------------------------------------------------------------
  // The Claude reader — used whenever the page runs inside a Claude viewer.
  // ------------------------------------------------------------------
  let ai = null;
  const SEASON_IDS = H.SEASONS.map((s) => s.id);
  const PROMPT = (text) => `You help an exhibitor at a Hasidic community business fair in Israel set up a lead-capture tablet.
He described his business in Hebrew:
"""${text.slice(0, 1500)}"""

While talking to a visitor he taps buttons on the tablet. Decide which of these four axes really separate one customer from another FOR THIS BUSINESS — the ones where a different answer means he does something different next. Use one or two axes, three at most:
- "what": products or services. Only if the difference changes what he does next. Products that are handled the same way are ONE button or no axis at all.
- "who": the kind of customer (e.g. פרטי, בעל שמחה, מוסד, גבאי או קבוצה, עסק, בעל קייטרינג, חנות).
- "size": the size of the order (e.g. יחידה, משפחה, אירוע, מוסד, אספקה קבועה).
- "when": timing (e.g. עכשיו, לשמחה בתאריך, לעונה).

Each button: {"label": 1-3 Hebrew words, "step": one of "call","send","quote","meet","date","register","regular","season","none", "stepLabel": what HE does next, 2-4 Hebrew words in his trade's language, "weight": 0-3, how valuable this customer is to him}.
Step meanings: call = phone him back; send = send material (price list, catalogue); quote = prepare a price quote; meet = meeting, visit, tasting, measuring, demo; date = depends on a date (an event); register = sign up; regular = a recurring supply, a repeat customer; season = come back before his busy season; none = no task.

Read community Hebrew correctly: "מזונות" = pastries and cakes (the mezonot blessing), not food or catering. "משווק", "סוכן", "מפיץ", "יבואן" = he sells goods made by others; he does not produce or cook them. "בוטיק" = small premium makers. Audiences and occasions (לבתים, לעסקים, למוסדות, לאירועים, לשמחות, "לכל מי שצריך") are customers, never products. Never add a product or service he did not say.

Reply with ONLY one JSON object, all strings in Hebrew:
{"trade":"his trade with his role, 1-4 words","axes":{"what":[],"who":[],"size":[],"when":[]},"defaultStep":{"step":"call","stepLabel":"..."},"seasons":[],"unclear":[]}
- Leave an axis as [] when it does not matter for him. At most 6 buttons per axis.
- defaultStep: what he does with a visitor he tagged nothing for.
- seasons: his busy periods, only if clearly so, ids from: ${SEASON_IDS.join(', ')}.
- unclear: parts of his text you could not understand.`;

  // A product whose main word is not in his text was invented: keep it, but marked "?".
  const saidIt = (name, text) => {
    const w = fin(name.split(/\s+/)[0] || '');
    const t = fin(text);
    return !w || t.includes(w) || (w.length > 3 && t.includes(w.slice(0, -2)));
  };
  const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

  function cleanAI(r, text) {
    if (!r || typeof r !== 'object' || !r.axes || typeof r.axes !== 'object') throw { code: 'invalid_json' };
    const axes = {};
    Object.keys(AXES).forEach((ax) => {
      const list = Array.isArray(r.axes[ax]) ? r.axes[ax] : [];
      axes[ax] = list.slice(0, 8).map((b) => {
        const label = str(b && b.label, 30);
        const type = b && STEPS[b.step] ? b.step : typeOfNext(b && b.stepLabel);
        const weight = Math.max(0, Math.min(3, Math.round(+(b && b.weight)) || 0));
        return { label, step: { type, label: str(b && b.stepLabel, 30) || STEPS[type].label }, weight, unsure: ax === 'what' && !saidIt(label, text) };
      }).filter((b) => b.label);
    });
    if (!Object.keys(axes).some((ax) => axes[ax].length)) throw { code: 'invalid_json' };
    const d = r.defaultStep;
    const dt = d && STEPS[d.step] ? d.step : null;
    return {
      trade: str(r.trade, 40), axes,
      seasons: Array.isArray(r.seasons) ? r.seasons.filter((s) => SEASON_IDS.includes(s)) : [],
      unclear: Array.isArray(r.unclear) ? r.unclear.map((u) => str(u, 40)).filter(Boolean) : [],
      dropped: [], defStep: dt ? { type: dt, label: str(d.stepLabel, 30) || STEPS[dt].label } : null, by: 'ai',
    };
  }

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  const KEY = 'expo-demo3c';
  const DEVKEY = 'expo-demo3-tablet';        // owner or worker belongs to THIS tablet, not to the business
  const GRADES = {
    classic: { name: 'הקלאסי', words: ['חם', 'פושר', 'קר'] },
    serious: { name: 'לפי רצינות', words: ['רציני', 'אולי', 'סתם'] },
    time:    { name: 'לפי זמן', words: ['עכשיו', 'בהמשך', 'לא כרגע'] },
    plain:   { name: 'במילים פשוטות', words: ['מעניין מאוד', 'מעניין', 'רק עבר'] },
  };
  const EXAMPLES = {
    'נגר': 'נגרייה: מטבחים, ארונות קיר ודלתות פנים, לבתים ולמוסדות',
    'מאפים': 'משווק לחמים ומזונות של מאפיות בוטיק, לאירועים, לעסקים ולכל מי שצריך',
    'הפעלות': 'הפעלות חוויתיות וטיולים לקבוצות ולמוסדות',
    'דפוס': 'דפוס: הזמנות לחתונות, חוברות ושילוט לעסקים',
  };
  function fresh() {
    return {
      phase: 'setup', step: 'biz', view: 'booth', shift: 0,
      biz: {
        name: '', said: '', parsedFrom: null, by: null, trade: '', unclear: [], dropped: [], removed: [],
        buttons: [], bseq: 1, defStep: { type: 'call', label: 'לחזור אליו', days: 3 }, defByHand: false,
        seasons: [], seasonsByHand: false, seasonDefs: JSON.parse(JSON.stringify(H.SEASONS)), remindWeeks: 3,
        grades: 'classic', derive: true, idleSec: 12, hideVisited: true,
        materials: [], channels: { email: true, sms: false, wa: false, waApi: false },
        sendWhen: 'now', template: 'שלום {שם}, תודה שעברת בדוכן של {עסק}. מצורף {חומר}. נשמח לעמוד לשירותך.',
        devices: 1,
      },
      leads: [], seq: 1, ai: { dash: null, crm: null },
    };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
  let DEV;
  try { DEV = JSON.parse(localStorage.getItem(DEVKEY)) || { role: 'owner' }; } catch (e) { DEV = { role: 'owner' }; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(DEVKEY, JSON.stringify(DEV)); } catch (e) { /* private window */ } };
  const words = () => GRADES[S.biz.grades].words;
  const worker = () => DEV.role === 'worker';
  const ownerOnly = (what) => toast('🔒 ' + what + ' — רק בטאבלט של הבעלים');
  // The demo can step forward in time, so the CRM can be seen on the days after the fair.
  const now = () => Date.now() + S.shift * H.DAY;

  const btnById = (id) => S.biz.buttons.find((b) => b.id === id);
  const axisButtons = (ax) => S.biz.buttons.filter((b) => b.axis === ax);
  const usedAxes = () => Object.keys(AXES).filter((ax) => axisButtons(ax).length);
  const tagged = (l) => l.tags.map(btnById).filter(Boolean);
  const leadById = (id) => S.leads.find((l) => l.id === id);
  const practice = () => S.phase !== 'live';
  const leadsNow = () => S.leads.filter((l) => !!l.practice === practice());

  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('sample').then((s) => { if (!s) return; ai = s; if ($('#say-actions')) renderSayActions(); else if (S.phase === 'live' && S.view !== 'booth') render(); }).catch(() => {});
  }

  // ------------------------------------------------------------------
  // What follows from what is known: warmth, the next step, its date.
  // ------------------------------------------------------------------
  /** Warmth from what was tapped: valuable buttons, material asked for, a second visit. */
  function autoWarm(l) {
    const bs = tagged(l);
    if (!bs.length && !l.sent.length && l.visits < 2 && !l.roleOf) return null;
    const score = bs.reduce((a, b) => a + (b.weight || 0), 0) + (l.sent.length ? 1 : 0) + (l.visits > 1 ? 2 : 0) + (l.roleOf ? 1 : 0);
    return score >= 3 ? 0 : 1;
  }
  function effWarm(l) {
    if (l.warmBy === 'hand') return l.warmth;
    return S.biz.derive ? autoWarm(l) : l.warmth;
  }
  function stepOf(b) {
    const s = (b && b.step) || S.biz.defStep;
    return { type: s.type, label: s.label || STEPS[s.type].label, days: s.days != null ? s.days : STEPS[s.type].days };
  }
  function seasonStart() {
    let best = null;
    S.biz.seasons.forEach((id) => {
      const d = S.biz.seasonDefs.find((s) => s.id === id);
      const n = d && H.nextStart(d, new Date(now()));
      if (n && (!best || n.date < best.date)) best = { date: n.date, now: n.now, name: d.name };
    });
    return best;
  }
  /** The lead's next step and its date. Set by hand or by a call's outcome, or worked out. */
  function plan(l) {
    if (l.next) return { type: l.next.type, label: l.next.label, due: l.next.dueAt ? new Date(l.next.dueAt) : null, season: l.next.season };
    const w = effWarm(l);
    if (w === 2) return { type: 'none', label: 'קהל', due: null };
    const bs = tagged(l);
    const steps = (bs.length ? bs : [null]).map(stepOf).sort((a, b) => PRI.indexOf(a.type) - PRI.indexOf(b.type));
    const st = steps[0];
    if (st.type === 'none') return { type: 'none', label: st.label, due: null };
    const at = new Date(l.at);
    if (st.type === 'season') {
      const s = seasonStart();
      if (!s) return { type: 'call', label: st.label, due: H.addDays(at, 3) };
      const back = new Date(s.date.getTime() - S.biz.remindWeeks * 7 * H.DAY);
      return { type: 'season', label: st.label, season: s.name, due: back.getTime() > now() ? H.addDays(back, 0) : H.addDays(new Date(now()), 1) };
    }
    let days = st.days == null ? 2 : st.days;
    if (w === 0) days = Math.min(days, 1);
    return { type: st.type, label: st.label, due: H.addDays(at, Math.max(1, days)) };
  }
  const dayNo = (t) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / H.DAY);
  function dueText(d) {
    if (!d) return '';
    const diff = dayNo(d.getTime()) - dayNo(now());
    const rel = diff < 0 ? 'באיחור · ' : diff === 0 ? 'היום · ' : diff === 1 ? 'מחר · ' : '';
    return rel + H.label(d) + ' (' + d.getDate() + '/' + (d.getMonth() + 1) + ')';
  }
  const daysWord = (s) => (s.type === 'none' ? 'בלי משימה' : s.type === 'season' ? 'לפני העונה' : s.days === 0 ? 'מיד' : s.days === 1 ? 'תוך יום' : 'תוך ' + s.days + ' ימים');
  const stepText = (s) => STEPS[s.type].icon + ' ' + s.label + ' · ' + daysWord(s);
  const planHTML = (p) => `${STEPS[p.type].icon} <b>${esc(p.label)}</b>${p.due ? ' · ' + esc(dueText(p.due)) : ''}${p.season ? ' · לקראת ' + esc(p.season) : ''}`;
  const log = (l, t) => l.log.push({ at: now(), t });

  // ------------------------------------------------------------------
  // Shell
  // ------------------------------------------------------------------
  const SETUP = [['biz', 'העסק'], ['buttons', 'הכפתורים'], ['booth', 'החום והדוכן'], ['seasons', 'עונות'], ['send', 'חומרים ושליחה'], ['try', 'ניסיון']];
  const LIVE = [['booth', 'הדוכן'], ['dash', 'דשבורד'], ['crm', 'CRM']];
  function render() {
    renderTop();
    const m = $('#main');
    if (S.phase !== 'live') {
      ({ biz: viewBiz, buttons: viewButtons, booth: viewBoothSettings, seasons: viewSeasons, send: viewSend, try: viewTry }[S.step] || viewBiz)(m);
      if (S.phase === 'setup' && S.step !== 'try') {
        const i = SETUP.findIndex(([k]) => k === S.step);
        m.insertAdjacentHTML('beforeend', `<div class="next-bar"><button class="btn primary big" data-act="setup-next">הבא: ${esc(SETUP[i + 1][1])} ←</button></div>`);
      }
      return;
    }
    ({ booth: viewBooth, dash: viewDash, crm: viewCRM }[S.view] || viewBooth)(m);
  }
  function renderTop() {
    const nav = S.phase === 'live'
      ? LIVE.map(([k, t]) => `<button class="moment" data-view="${k}" aria-current="${S.view === k}">${t}</button>`).join('')
      : SETUP.filter(([k]) => S.phase === 'setup' || k !== 'try').map(([k, t], n) =>
        `<button class="moment" data-step="${k}" aria-current="${S.step === k}">${S.phase === 'setup' ? `<span class="n">${n + 1}</span>` : ''}${t}</button>`).join('');
    $('#top').innerHTML = `<div class="top-in">
      <div class="brand">${esc(S.biz.name || 'הדוכן שלי')}${S.phase === 'settings' ? ' <span class="faint">· הגדרות</span>' : S.phase === 'setup' ? ' <span class="faint">· הקמה</span>' : ''}</div>
      <nav class="moments" aria-label="ניווט">${nav}</nav>
      ${S.phase === 'settings' ? '<button class="btn" data-act="settings-done">חזרה לדוכן</button>' : ''}
      ${worker() ? '<span class="lock">🔒 טאבלט עובד</span>' : ''}
      <button class="icon-btn" data-act="menu" aria-label="תפריט">⋯</button>
    </div>`;
  }

  // ------------------------------------------------------------------
  // Setup 1 — the business, in his words
  // ------------------------------------------------------------------
  function viewBiz(m) {
    m.innerHTML = `<div class="onb">
      <section class="card">
        <h1>ספר על העסק</h1>
        <p class="muted">מה אתה מוכר, ולמי — כמו שהיית אומר ללקוח. מזה נבנים הכפתורים בדוכן. כל דבר אפשר לשנות אחר כך.</p>
        <textarea id="say" class="say" placeholder="למשל: משווק לחמים ומזונות של מאפיות בוטיק, לאירועים, למוסדות ולכל מי שצריך">${esc(S.biz.said)}</textarea>
        <div id="say-actions"></div>
        <div class="examples"><span class="faint">דוגמה:</span>
          ${Object.keys(EXAMPLES).map((k) => `<button class="chip" data-ex="${esc(k)}">${esc(k)}</button>`).join('')}</div>
        <div class="label">שם העסק <small>רשות</small></div>
        <input id="bizname" class="text-input" value="${esc(S.biz.name)}" placeholder="למשל: נגריית הדר" autocomplete="off">
      </section>
      <section class="card" id="preview"></section>
    </div>`;
    const say = $('#say');
    let t;
    say.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => understandWords(say.value), 220); });
    $('#bizname').addEventListener('input', (e) => { S.biz.name = e.target.value.trim(); save(); renderTop(); });
    renderSayActions();
    renderPreview();
    if (!S.biz.said && FINE) setTimeout(() => say.focus(), 40);
  }
  function renderSayActions() {
    const box = $('#say-actions');
    if (!box) return;
    const stale = S.biz.by === 'ai' && $('#say') && $('#say').value !== S.biz.parsedFrom;
    box.innerHTML = ai
      ? `<div class="actions"><button class="btn primary" data-act="ai-read" id="ai-btn">✨ תבין אותי</button>
          <span class="faint" id="ai-note">${stale ? 'שינית את הטקסט — לחץ שוב כדי שאקרא מחדש' : S.biz.by === 'ai' ? 'הובן ע"י בינה מלאכותית' : 'עד שתלחץ — טיוטה מהירה לפי מילים'}</span></div>`
      : `<p class="honest">כאן הטקסט נקרא לפי רשימת מילים, שמזהה בערך רבע מהעסקים. מה שלא זוהה נשאר במילים שלך, ובשלב הבא מתקנים. בתוך קלוד — בינה מלאכותית קוראת את הטקסט.</p>`;
  }
  /** Merge a fresh reading into what is there, keeping every hand edit, every removal, and the ids leads are tagged with. */
  function applyReading(r, text) {
    const b = S.biz;
    const old = b.buttons;
    const hand = old.filter((x) => x.byHand);
    const removed = new Set(b.removed);
    const read = [];
    Object.keys(r.axes).forEach((ax) => (r.axes[ax] || []).forEach((x) => {
      if (removed.has(ax + ':' + x.label) || hand.some((h) => h.axis === ax && h.label === x.label)) return;
      const same = old.find((o) => o.axis === ax && o.label === x.label);
      read.push({ id: same ? same.id : 'k' + (b.bseq++), axis: ax, label: x.label, step: x.step, weight: x.weight, unsure: x.unsure });
    }));
    b.buttons = hand.concat(read);
    const ids = new Set(b.buttons.map((x) => x.id));
    S.leads.forEach((l) => { l.tags = l.tags.filter((id) => ids.has(id)); });
    if (r.trade || r.by === 'ai') b.trade = r.trade;
    if (!b.seasonsByHand) b.seasons = r.seasons;
    if (r.defStep && !b.defByHand) b.defStep = { type: r.defStep.type, label: r.defStep.label, days: STEPS[r.defStep.type].days == null ? 3 : STEPS[r.defStep.type].days };
    b.unclear = r.unclear; b.dropped = r.dropped; b.by = r.by;
    b.said = text; b.parsedFrom = text;
    save();
    renderPreview();
    renderSayActions();
  }
  function understandWords(text) {
    S.biz.said = text;
    if (S.biz.by === 'ai') { save(); return renderSayActions(); }   // never let the word list overwrite Claude's reading
    applyReading(parseWords(text), text);
  }
  async function understandAI() {
    const text = ($('#say') && $('#say').value.trim()) || '';
    if (!text) return toast('ספר קודם על העסק');
    const btn = $('#ai-btn');
    const note = $('#ai-note');
    if (btn) btn.disabled = true;
    if (note) note.textContent = 'קורא…';
    try {
      applyReading(cleanAI(await ai.json(PROMPT(text), { modelTier: 'quick' }), text), text);
    } catch (e) {
      aiFailed(e);
      renderSayActions();
    } finally {
      if ($('#ai-btn')) $('#ai-btn').disabled = false;
    }
  }
  function aiFailed(e) {
    const code = e && e.code;
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) {
      ai = null; toast('הבינה המלאכותית לא זמינה כאן.'); render();
    } else if (code === 'rate_limited') toast('יותר מדי בקשות. אפשר לנסות שוב בעוד רגע.');
    else toast('לא הצלחתי עכשיו. אפשר לנסות שוב.');
  }
  function renderPreview() {
    const box = $('#preview');
    if (!box) return;
    const b = S.biz;
    const axes = usedAxes();
    const seasons = b.seasons.map((id) => (b.seasonDefs.find((s) => s.id === id) || {}).name).filter(Boolean);
    box.innerHTML = `<h2>מה הבנתי</h2>
      ${axes.length ? `<ul class="understood">
        ${b.trade ? `<li>התחום: <b>${esc(b.trade)}</b></li>` : ''}
        ${axes.map((ax) => `<li>${esc(AXES[ax].title)}: ${axisButtons(ax).map((x) => `<b>${esc(x.label)}</b>${x.unsure ? ' <span class="q">?</span>' : ''}`).join(' · ')}</li>`).join('')}
        <li>מי שלא סומן לו כלום: <b>${esc(stepText(stepOf(null)))}</b></li>
        ${seasons.length ? `<li>העונה החזקה: <b>${esc(seasons.join(' · '))}</b></li>` : ''}
        ${b.unclear.length ? `<li class="warn-li">לא זיהיתי בוודאות: <b>${esc(b.unclear.join(' · '))}</b> — השארתי במילים שלך</li>` : ''}
      </ul>
      <p class="faint" style="margin-top:12px">${b.by === 'ai' ? 'נקרא ע"י בינה מלאכותית.' : 'נקרא לפי רשימת מילים.'} בשלב הבא — לתקן, להוסיף ולקבוע מה עושים אחרי כל כפתור.</p>`
      : '<div class="empty">תתחיל לכתוב, ומה שהבנתי יופיע כאן.</div>'}`;
  }

  // ------------------------------------------------------------------
  // Setup 2 — the buttons, and the step behind each
  // ------------------------------------------------------------------
  let openAxes = [];
  function viewButtons(m) {
    const shown = Object.keys(AXES).filter((ax) => axisButtons(ax).length || openAxes.includes(ax));
    const unused = Object.keys(AXES).filter((ax) => !shown.includes(ax));
    m.innerHTML = `<h1>הכפתורים בדוכן</h1>
      <p class="muted">מה שמבדיל אצלך בין לקוח ללקוח. מאחורי כל כפתור יש צעד הבא, והמערכת פועלת לפיו: מתי להזכיר לך, מה לשלוח, ומתי לחזור לפני העונה.</p>
      <div class="axes">${shown.map(axisCard).join('') || '<div class="empty">עוד אין כפתורים. אפשר להוסיף שורה למטה.</div>'}</div>
      ${unused.length ? `<div class="label">להוסיף שורת כפתורים</div><div class="chips">${unused.map((ax) => `<button class="chip add" data-addaxis="${ax}">+ ${esc(AXES[ax].title)}</button>`).join('')}</div>` : ''}
      <div class="label">מי שלא סומן לו כלום</div>
      <button class="prod-row" data-act="edit-def"><span class="pn">ברירת המחדל</span><span class="pnext">${esc(stepText(stepOf(null)))}</span></button>`;
  }
  function axisCard(ax) {
    return `<section class="card axis"><h2>${esc(AXES[ax].title)} <small>${esc(AXES[ax].hint)}</small></h2>
      <div class="prod-list">${axisButtons(ax).map((x) => `<button class="prod-row" data-editbtn="${x.id}">
        <span class="pn">${esc(x.label)}${x.unsure ? ' <span class="q">?</span>' : ''}${x.weight >= 2 ? ` <span class="wt" title="${esc(WEIGHT[x.weight])}">${'●'.repeat(x.weight)}</span>` : ''}</span>
        <span class="pnext">${esc(stepText(stepOf(x)))}</span></button>`).join('')}</div>
      <div class="add-row"><input class="text-input" data-newbtn="${ax}" placeholder="+ כפתור חדש" autocomplete="off"><button class="btn" data-addbtn="${ax}">הוספה</button></div></section>`;
  }
  function addButton(ax) {
    const inp = document.querySelector(`[data-newbtn="${ax}"]`);
    const v = inp && inp.value.trim();
    if (!v) return;
    if (axisButtons(ax).some((x) => x.label === v)) return toast('כבר יש');
    const hit = ax === 'what' ? findEntries(v)[0] : null;
    S.biz.buttons.push({ id: 'k' + (S.biz.bseq++), axis: ax, label: v, step: hit ? { type: typeOfNext(hit.next), label: hit.next } : null, weight: ax === 'what' ? 1 : 0, byHand: true });
    S.biz.removed = S.biz.removed.filter((r) => r !== ax + ':' + v);
    save(); render();
    const again = document.querySelector(`[data-newbtn="${ax}"]`);
    if (again) again.focus();
  }

  /* One editor for every step: a button's, the default, and a single lead's. */
  let ES = null;
  function sheetStep(o) {
    ES = { type: o.step.type, days: o.step.days, weight: o.weight, act: o.act, id: o.id };
    sheet(`<h2>${esc(o.title)}</h2>
      ${o.top || ''}
      <div class="label">מה עושים אחר כך <small>לפי זה המערכת פועלת</small></div>
      <div class="step-grid">${Object.entries(STEPS).map(([k, v]) => `<button class="opt" data-steptype="${k}" aria-pressed="${ES.type === k}">${v.icon} ${esc(v.name)}</button>`).join('')}</div>
      <div class="label">איך אתה קורא לזה <small>המילים שלך</small></div>
      <input id="es-label" class="text-input" value="${esc(o.step.label)}" autocomplete="off">
      <div id="es-days-box"></div>
      ${o.weight != null ? `<div class="label">כמה לקוח כזה שווה לך <small>מחמם את הליד לבד</small></div>
        <div class="chips">${WEIGHT.map((w, k) => `<button class="chip" data-esweight="${k}" aria-pressed="${ES.weight === k}">${esc(w)}</button>`).join('')}</div>` : ''}
      <div class="actions"><button class="btn primary" data-act="${o.act}">שמירה</button>${o.del || ''}</div>`);
    renderDays();
  }
  function renderDays() {
    const box = $('#es-days-box');
    if (!box) return;
    box.innerHTML = ES.type === 'none' || ES.type === 'season'
      ? `<p class="faint" style="margin-top:10px">${ES.type === 'season' ? 'יחזור אליך ' + S.biz.remindWeeks + ' שבועות לפני העונה שלך.' : 'לא נכנס לרשימת המשימות. נשמר בקהל.'}</p>`
      : `<div class="label">תוך כמה ימים</div><div class="chips">${[0, 1, 2, 3, 5, 7, 14, 30].map((d) =>
        `<button class="chip" data-esdays="${d}" aria-pressed="${ES.days === d}">${d === 0 ? 'מיד' : d === 1 ? 'יום' : d + ' ימים'}</button>`).join('')}</div>`;
  }
  const readStep = () => ({ type: ES.type, label: ($('#es-label') && $('#es-label').value.trim()) || STEPS[ES.type].label, days: ES.days == null ? STEPS[ES.type].days : ES.days });
  function sheetButton(id) {
    const x = btnById(id);
    if (!x) return;
    sheetStep({ title: x.label, step: stepOf(x), weight: x.weight || 0, act: 'save-btn', id,
      top: `<div class="label">שם הכפתור</div><input id="eb-name" class="text-input" value="${esc(x.label)}" autocomplete="off">`,
      del: `<button class="btn ghost danger" data-act="del-btn" data-id="${id}">להסיר את הכפתור</button>` });
  }

  // ------------------------------------------------------------------
  // Setup 3 — warmth and the booth
  // ------------------------------------------------------------------
  const toggle = (k, on) => `<button class="toggle" data-toggle="${k}" aria-pressed="${!!on}" aria-label="הפעלה"></button>`;
  function viewBoothSettings(m) {
    const b = S.biz;
    m.innerHTML = `<h1>החום והדוכן</h1>
      <div class="stack" style="margin-top:14px">
        <section class="card"><h2>איך לקרוא לדרגות</h2><p class="muted">רק השמות משתנים. מה שסומן הכי חם נשאר הכי חם.</p>
          <div class="opts grid2">${Object.entries(GRADES).map(([k, g]) => `<button class="opt" data-grades="${k}" aria-pressed="${b.grades === k}">${esc(g.words.join(' · '))}<small>${esc(g.name)}</small></button>`).join('')}</div></section>
        <section class="card"><div class="toggle-row"><div><h2>המערכת מציעה חום לבד</h2>
          <p class="muted">לפי מה שכבר סימנת: כפתור חשוב (●●), סדר גודל גדול, ביקש חומר, חזר לדוכן פעם שנייה. נגיעה אחת משנה, ומה שבחרת ביד נשאר.</p></div>${toggle('derive', b.derive)}</div></section>
        <section class="card"><h2>כמה זמן הכרטיס נשאר פתוח</h2><p class="muted">בלי נגיעה, הכרטיס נסגר לבד וחוזר לחיפוש. מה שסומן — נשמר.</p>
          <div class="chips">${[8, 12, 15, 20, 30].map((s) => `<button class="chip" data-idle="${s}" aria-pressed="${b.idleSec === s}">${s} שניות</button>`).join('')}</div></section>
        <section class="card"><div class="toggle-row"><div><h2>מי שכבר ביקר לא מופיע שוב בחיפוש</h2>
          <p class="muted">העסק שלו, או העסק של אשתו, מופיע כשורה נפרדת. מי שחוזר לדוכן — מסמנים מהשורה "ביקרו כבר", וזה מחמם אותו.</p></div>${toggle('hideVisited', b.hideVisited)}</div></section>
      </div>`;
  }

  // ------------------------------------------------------------------
  // Setup 4 — seasons, on the Jewish calendar
  // ------------------------------------------------------------------
  const rangeText = (s) => (s.greg
    ? s.greg.map(([a, b]) => `${a % 100}/${Math.floor(a / 100)}–${b % 100}/${Math.floor(b / 100)}`).join(', ')
    : s.ranges.map((r) => `${H.gem(r.from[1])} ב${H.HE[r.from[0]]} – ${H.gem(r.to[1])} ב${H.HE[r.to[0]]}`).join(' · '));
  function viewSeasons(m) {
    const b = S.biz;
    const today = new Date(now());
    m.innerHTML = `<h1>העונות שלך</h1>
      <p class="muted">לפי הלוח העברי. ליד שנשמר "לעונה" חוזר אליך לפני שהיא מתחילה. אין משימות ותזכורות בשבת ובחג.</p>
      <p class="honest">את גבולות העונות קבעתי לפי הערכה. תקן לפי מה שנכון אצלך — נגיעה בשם.</p>
      <section class="card" style="margin-top:12px">
        ${b.seasonDefs.map((s) => {
          const n = H.nextStart(s, today);
          return `<div class="season-row">${toggle('season:' + s.id, b.seasons.includes(s.id))}
            <button class="link" data-editseason="${s.id}"><b>${esc(s.name)}</b><span class="rng">${esc(rangeText(s))}</span></button>
            <span class="nx">${n ? (n.now ? 'עכשיו' : esc(H.label(n.date))) : ''}</span></div>`;
        }).join('')}
        <div class="actions"><button class="btn" data-act="add-season">+ עונה משלך</button></div>
      </section>
      <section class="card" style="margin-top:14px"><h2>כמה זמן לפני להזכיר</h2>
        <div class="chips" style="margin-top:8px">${[1, 2, 3, 4, 6].map((w) => `<button class="chip" data-remind="${w}" aria-pressed="${b.remindWeeks === w}">${w === 1 ? 'שבוע' : w + ' שבועות'}</button>`).join('')}</div></section>`;
  }
  function sheetSeason(id) {
    const s = S.biz.seasonDefs.find((x) => x.id === id);
    if (!s) return;
    const monthSel = (k, v) => `<select class="text-input" data-sr="${k}">${H.MONTHS.map((mo) => `<option value="${mo.id}" ${mo.id === v ? 'selected' : ''}>${esc(mo.he)}</option>`).join('')}</select>`;
    const dayIn = (k, v) => `<input type="number" min="1" max="30" class="text-input" data-sr="${k}" value="${v}">`;
    sheet(`<h2>${esc(s.name)}</h2>
      <div class="label">שם</div><input id="ss-name" class="text-input" value="${esc(s.name)}" autocomplete="off">
      ${s.greg ? `<p class="faint" style="margin-top:10px">לפי הלוח הלועזי: ${esc(rangeText(s))}</p>` : s.ranges.map((r, i) => `
        <div class="label">${s.ranges.length > 1 ? 'טווח ' + (i + 1) : 'מתי'}</div>
        <div class="range-in"><span>מ-</span>${dayIn(i + ':fd', r.from[1])}${monthSel(i + ':fm', r.from[0])}<span>עד</span>${dayIn(i + ':td', r.to[1])}${monthSel(i + ':tm', r.to[0])}</div>`).join('')}
      <div class="actions"><button class="btn primary" data-act="save-season" data-id="${id}">שמירה</button>
        ${/^c/.test(id) ? `<button class="btn ghost danger" data-act="del-season" data-id="${id}">להסיר</button>` : ''}</div>`);
  }

  // ------------------------------------------------------------------
  // Setup 5 — material, and the channels it goes out on
  // ------------------------------------------------------------------
  const CHANNELS = [
    { k: 'email', ic: '📧', name: 'מייל', d: 'לכל מבקר יש מייל ברשימת המארגנים. יוצא מכתובת המערכת, בשם העסק שלך.' },
    { k: 'sms', ic: '💬', name: 'SMS', d: 'למי שיש לו מכשיר נוסף. לא צריך את המספר שלך.' },
    { k: 'wa', ic: '🟢', name: 'וואטסאפ (לא רשמי)', d: 'מהמספר שלך, בקצב שלא נחסם. בלי אחריות.', connect: true },
    { k: 'waApi', ic: '✅', name: 'וואטסאפ עסקי רשמי', d: 'רק אם כבר יש לך חשבון רשמי. מתחברים אליו, לא פותחים חדש.', connect: true },
  ];
  function viewSend(m) {
    const b = S.biz;
    m.innerHTML = `<h1>חומרים ושליחה</h1>
      <div class="stack" style="margin-top:14px">
        <section class="card"><h2>מה אפשר לשלוח</h2><p class="muted">בדוכן: נגיעה אחת, והחומר יוצא למבקר.</p>
          <div class="prod-list">${b.materials.map((x, i) => `<div class="prod-row"><span class="pn">📎 ${esc(x.name)}</span><span class="pnext">${esc(x.file)} <button class="btn ghost danger" data-act="del-mat" data-i="${i}">הסרה</button></span></div>`).join('') || '<div class="faint">עוד אין חומר. אפשר גם להוסיף בדוכן, בשליחה הראשונה.</div>'}</div>
          <div class="add-row"><input id="mat-name" class="text-input" placeholder="שם — קטלוג, מחירון, תמונות עבודות" autocomplete="off">
            <label class="btn" for="mat-file">📷 קובץ</label></div><input id="mat-file" type="file" accept="image/*,application/pdf" hidden></section>
        <section class="card"><h2>איך זה יוצא למבקר</h2><p class="muted">כל ערוץ פעיל יוצא <b>במקביל</b>, לא במקום השני.</p>
          ${CHANNELS.map((c) => `<div class="chan"><span class="ic">${c.ic}</span><span><b>${esc(c.name)}</b><span class="d">${esc(c.d)}</span></span>
            ${c.connect ? (b.channels[c.k] ? `<button class="btn" data-act="disconnect" data-ch="${c.k}">מחובר · לנתק</button>` : `<button class="btn primary" data-act="connect" data-ch="${c.k}">לחבר</button>`) : toggle('ch:' + c.k, b.channels[c.k])}</div>`).join('')}</section>
        <section class="card"><h2>מתי זה יוצא</h2>
          <div class="chips" style="margin-top:8px"><button class="chip" data-sendwhen="now" aria-pressed="${b.sendWhen === 'now'}">מיד, בדוכן</button>
            <button class="chip" data-sendwhen="evening" aria-pressed="${b.sendWhen === 'evening'}">בערב, הכל ביחד</button></div></section>
        <section class="card"><h2>נוסח ההודעה</h2><p class="muted">{שם} · {עסק} · {חומר} מתמלאים לבד.</p>
          <textarea id="tpl" class="say small">${esc(b.template)}</textarea>
          <p class="faint" id="tpl-prev">${esc(fillTpl('משה כהן', 'קטלוג'))}</p></section>
      </div>
      <p class="honest">בדוגמית שום דבר לא נשלח באמת.</p>`;
    $('#tpl').addEventListener('input', (e) => { S.biz.template = e.target.value; save(); $('#tpl-prev').textContent = fillTpl('משה כהן', 'קטלוג'); });
    bindMatFile(null);
  }
  const fillTpl = (name, mat) => S.biz.template.replace(/\{שם\}/g, name).replace(/\{עסק\}/g, S.biz.name || 'העסק').replace(/\{חומר\}/g, mat);
  function bindMatFile(l) {
    const f = $('#mat-file');
    if (!f) return;
    f.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const name = (($('#mat-name') && $('#mat-name').value.trim()) || 'קטלוג').slice(0, 30);
      if (S.biz.materials.some((x) => x.name === name)) return toast('כבר יש חומר בשם הזה');
      S.biz.materials.push({ name, file: file.name });
      if (l) doSend(l, name);
      save();
      if (l) { sheetMaterials(l); refreshLead(l); } else render();
      toast(name + ' נשמר');
    });
  }
  function sheetConnect(k) {
    if (k === 'wa') {
      sheet(`<h2>וואטסאפ לא רשמי</h2>
        <p class="warn-box">⚠️ <b>אין אחריות.</b> החיבור עובד דרך המספר שלך, בקצב איטי שמיועד לא להיחסם — אבל וואטסאפ יכולה לחסום כל מספר, בכל זמן, וזה באחריותך בלבד.</p>
        <div class="join-mock"><div class="qr" aria-hidden="true"></div><div class="faint">בוואטסאפ בטלפון שלך: מכשירים מקושרים ← קישור מכשיר ← לסרוק</div></div>
        <div class="opts"><button class="opt" data-act="connect-yes" data-ch="wa">הבנתי, וסרקתי<small>בדוגמית — מדומה</small></button><button class="opt" data-act="sheet-close">ביטול</button></div>`);
    } else {
      sheet(`<h2>וואטסאפ עסקי רשמי</h2>
        <p class="muted">רק למי שכבר יש לו חשבון. נכנסים עם החשבון הקיים ומאשרים למערכת לשלוח בשמו. אפשר להמשיך להשתמש בוואטסאפ בטלפון במקביל.</p>
        <div class="opts"><button class="opt" data-act="connect-yes" data-ch="waApi">יש לי חשבון — להתחבר<small>בדוגמית — מדומה</small></button><button class="opt" data-act="sheet-close">אין לי — לא עכשיו</button></div>`);
    }
  }

  // ------------------------------------------------------------------
  // Setup 6 — a practice booth
  // ------------------------------------------------------------------
  function viewTry(m) {
    m.innerHTML = `<div class="practice-banner"><span><b>דוכן לניסיון.</b> מה שתקלוט כאן יימחק כשתתחיל את יום התערוכה.</span>
      <button class="btn primary" data-act="go-live">סיימתי — ליום התערוכה ←</button></div><div id="boothwrap"></div>`;
    viewBooth($('#boothwrap'));
  }

  // ------------------------------------------------------------------
  // The booth
  // ------------------------------------------------------------------
  let openId = null;
  let idleTimer = null;
  const IDLE = () => S.biz.idleSec * 1000;
  const leadByKey = (key) => leadsNow().find((l) => l.key === key);

  function viewBooth(m) {
    m.innerHTML = `<input id="q" class="search" type="search" placeholder="שתיים-שלוש אותיות מהשם, או שם העסק" autocomplete="off" autocapitalize="off">
      <div id="slot"></div><p class="foot" id="foot"></p>`;
    const q = $('#q');
    q.addEventListener('input', () => { openId = null; stopIdle(); renderResults(q.value); });
    if (openId && leadById(openId)) renderLead(); else { openId = null; renderResults(''); }
    updateFoot();
    if (FINE) setTimeout(() => q.focus(), 30);
  }
  function updateFoot() {
    const f = $('#foot');
    if (!f) return;
    const L = leadsNow();
    const demo = L.filter((l) => l.demo).length;
    f.textContent = (practice() ? 'ניסיון · ' : '') + (L.length - demo) + ' נקלטו' + (demo ? ' (ועוד ' + demo + ' מדומים)' : '');
  }
  function renderResults(query) {
    const slot = $('#slot');
    if (!slot) return;
    if (!People.norm(query)) {
      slot.innerHTML = '<div class="empty">מישהו ניגש? שתיים-שלוש אותיות מהשם, ונגיעה בשם.<br>כל השאר רשות.</div>';
      return;
    }
    const { hits, skipped } = People.search(query, 6, S.biz.hideVisited ? (k) => !!leadByKey(k) : null);
    const rows = hits.map((h) => {
      const been = !S.biz.hideVisited && leadByKey(h.key);
      return `<button class="result" data-pick="${h.key}"><span><span class="nm">${esc(People.rowName(h))}</span>${h.b != null ? '<span class="badge biz">עסק</span>' : ''}<span class="city">${esc(People.town(h))}</span>
        <span class="mt">${esc(People.rowMeta(h))}</span></span>${been ? '<span class="badge">ביקר כבר</span>' : ''}</button>`;
    }).join('');
    const again = skipped.length ? `<div class="again"><span class="faint">ביקרו כבר:</span>${skipped.slice(0, 3).map((h) =>
      `<button class="chip" data-again="${h.key}">${esc(People.rowName(h))} — חזר</button>`).join('')}</div>` : '';
    slot.innerHTML = (rows ? `<div class="results">${rows}</div>` : '<div class="empty">לא נמצא ברשימה.</div>') + again;
  }
  function pick(key) {
    let l = leadByKey(key);
    if (!l) {
      const r = People.row(key);
      l = { id: S.seq++, key, i: r.i, b: r.b, at: now(), created: Date.now(), visits: 1, warmth: null, warmBy: null, tags: [],
        eventDate: '', roleOf: '', sent: [], pendingMat: false, practice: practice(), log: [], next: null, noAnswer: 0 };
      log(l, 'ביקר בדוכן');
      S.leads.push(l);
      toast('✓ נשמר: ' + People.rowName(l));
    }
    save();
    openLead(l);
  }
  function cameBack(key) {
    const l = leadByKey(key);
    if (!l) return;
    l.visits++; l.created = Date.now();
    log(l, 'חזר לדוכן');
    save();
    toast('↺ ' + People.rowName(l) + ' חזר — סומן');
    openLead(l);
  }
  function openLead(l) {
    openId = l.id;
    if ($('#q')) $('#q').value = '';
    renderLead();
    updateFoot();
  }

  /** One lead editor, used at the booth and in a sheet from the dashboard or the CRM. */
  function leadBody(l, inSheet) {
    const w = effWarm(l);
    const auto = l.warmBy !== 'hand' && S.biz.derive && w != null;
    const bs = tagged(l);
    const datey = bs.some((b) => stepOf(b).type === 'date');
    const roley = bs.some((b) => b.axis === 'who' && b.weight >= 2);
    const sent = l.sent.length ? '📎 נשלח: ' + l.sent.join(', ') : l.pendingMat ? '📎 ממתין לחומר' : '📎 שלח חומר';
    return `
      <div class="lead-head"><div><span class="nm">${esc(People.rowName(l))}</span>${l.b != null ? '<span class="badge biz">עסק</span>' : ''} <span class="muted">${esc(People.town(l))}</span>
        <div class="faint">${esc(People.rowMeta(l))}${l.visits > 1 ? ' · ביקר ' + l.visits + ' פעמים' : ''}${l.demo ? ' · מדומה' : ''}</div></div>
        <div class="head-acts">${!inSheet && Date.now() - l.created < 6000 && l.visits === 1 ? `<button class="btn ghost" data-act="undo-lead" data-lid="${l.id}">ביטול</button>` : ''}
          <button class="btn primary" data-act="close-lead">✓ סיום</button></div></div>
      <div class="warmth">${words().map((t, k) => `<button class="warm-btn w${k}${auto && w === k ? ' auto' : ''}" data-warm="${k}" data-lid="${l.id}" aria-pressed="${w === k}">${esc(t)}</button>`).join('')}</div>
      ${auto ? '<div class="hint">הוצע לפי מה שסימנת. נגיעה משנה.</div>' : ''}
      ${usedAxes().map((ax) => `<div class="label">${esc(AXES[ax].title)} <small>רשות</small></div>
        <div class="chips">${axisButtons(ax).map((b) => `<button class="chip" data-tag="${b.id}" data-lid="${l.id}" aria-pressed="${l.tags.includes(b.id)}">${esc(b.label)}</button>`).join('')}</div>`).join('')}
      ${datey ? `<div class="label">מתי השמחה? <small>רשות</small></div><input type="date" class="text-input" data-eventdate="${l.id}" value="${esc(l.eventDate)}">` : ''}
      ${roley ? `<div class="label">של מי? <small>רשות — המוסד, בית הכנסת או הקבוצה</small></div><input class="text-input" data-roleof="${l.id}" value="${esc(l.roleOf)}" placeholder="למשל: קבוצת שערי חסד" autocomplete="off">` : ''}
      <button class="next-line" data-act="next-edit" data-lid="${l.id}"><span class="faint">הלאה:</span> ${planHTML(plan(l))}</button>
      <div class="actions"><button class="btn" data-act="send" data-lid="${l.id}">${esc(sent)}</button>
        <button class="btn ghost danger" data-act="del-lead" data-lid="${l.id}">מחיקה</button></div>`;
  }
  function renderLead() {
    const l = leadById(openId);
    const slot = $('#slot');
    if (!l || !slot) return;
    slot.innerHTML = `<div class="lead"><div class="timer" id="timer"></div>${leadBody(l, false)}</div>`;
    startIdle();
  }
  /** Redraw wherever this lead is being edited. */
  function refreshLead(l) {
    const sh = $('#scrim .sheet[data-lead]');
    if (sh && +sh.dataset.lead === l.id) { sh.innerHTML = sh.dataset.crm ? crmBody(l) : leadBody(l, true); return; }
    if ($('#slot') && openId === l.id) renderLead();
    else if (S.phase === 'live' && S.view !== 'booth') render();
  }
  function startIdle() {
    stopIdle();
    if ($('#scrim') || $('#menu')) return;          // never count down behind a sheet or the menu
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest('.lead input')) return; // nor while typing
    const bar = $('#timer');
    if (bar) bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: IDLE(), easing: 'linear', fill: 'forwards' });
    idleTimer = setTimeout(() => {
      if ($('#scrim') || $('#menu')) return;
      openId = null;
      const q = $('#q');
      renderResults(q ? q.value : '');
      if (q && FINE) q.focus();
    }, IDLE());
  }
  function stopIdle() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    const bar = $('#timer');
    if (bar && bar.getAnimations) bar.getAnimations().forEach((a) => a.cancel());
  }

  // ---- sending ----
  const channelsOn = () => CHANNELS.filter((c) => S.biz.channels[c.k]).map((c) => c.name);
  function doSend(l, name) {
    if (l.sent.includes(name)) return;
    const ch = channelsOn();
    if (!ch.length) { l.pendingMat = true; toast('אין ערוץ שליחה פעיל. מפעילים ב"חומרים ושליחה".'); return; }
    l.sent.push(name); l.pendingMat = false;
    log(l, `📎 ${name} — ${S.biz.sendWhen === 'now' ? 'נשלח' : 'יישלח בערב'} ב${ch.join(' + ')}`);
    toast(`📎 ${name} ${S.biz.sendWhen === 'now' ? 'נשלח' : 'יישלח בערב'} ל${People.rowName(l)} · ${ch.join(' + ')}`);
  }
  function sheetMaterials(l) {
    const mats = S.biz.materials;
    sheet(`<h2>מה לשלוח${l ? ' ל' + esc(People.rowName(l)) : ''}?</h2>
      ${mats.length ? `<div class="opts">${mats.map((x) => `<button class="opt" data-sendmat="${esc(x.name)}" data-lid="${l ? l.id : ''}" aria-pressed="${l ? l.sent.includes(x.name) : false}">📎 ${esc(x.name)}<small>${esc(x.file)}</small></button>`).join('')}</div>` : '<p class="muted">עוד אין חומר לשליחה.</p>'}
      ${worker() ? '' : `<div class="label">${mats.length ? 'להוסיף חומר' : 'להוסיף עכשיו'}</div>
        <input id="mat-name" class="text-input" value="${mats.length ? '' : 'קטלוג'}" placeholder="שם — קטלוג, מחירון, תמונות עבודות" autocomplete="off">
        <div class="opts"><label class="opt" for="mat-file">📷 לצלם או לבחור קובץ<small>תמונה או PDF</small></label></div>
        <input id="mat-file" type="file" accept="image/*,application/pdf" hidden>`}
      ${!mats.length && l ? `<div class="opts"><button class="opt" data-act="mat-later" data-lid="${l.id}">לא עכשיו<small>יסומן "ממתין לחומר", ויופיע בדשבורד</small></button></div>` : ''}
      <div class="actions"><button class="btn" data-act="sheet-close">סיום</button></div>`);
    bindMatFile(l);
  }

  // ------------------------------------------------------------------
  // The booth's dashboard — today's tagging: what is missing, what it shows
  // ------------------------------------------------------------------
  function seedDay() {
    const rnd = (n) => Math.floor(Math.random() * n);
    const taken = new Set(leadsNow().map((l) => l.key));
    const groups = ['קבוצת שערי חסד', 'ת"ת אור החיים', 'ביהכ"נ אהבת שלום', 'ישיבת בית אהרן'];
    for (let n = 0; n < 20; n++) {
      let key;
      do { key = Math.random() < 0.2 ? 'b:' + rnd(1200) : 'p:' + rnd(People.list.length); } while (taken.has(key) || (key[0] === 'b' && !People.biz(+key.slice(2))));
      taken.add(key);
      const r = People.row(key);
      const tags = [];
      usedAxes().forEach((ax) => { if (Math.random() < 0.55) { const bs = axisButtons(ax); tags.push(bs[rnd(bs.length)].id); } });
      const hand = Math.random() < 0.4;
      const l = { id: S.seq++, key, i: r.i, b: r.b, at: now() - rnd(8 * 3600000), created: 0, visits: Math.random() < 0.08 ? 2 : 1,
        warmth: hand ? rnd(3) : null, warmBy: hand ? 'hand' : null, tags, eventDate: '', roleOf: '', sent: [], pendingMat: Math.random() < 0.1,
        practice: practice(), demo: true, log: [], next: null, noAnswer: 0 };
      if (tagged(l).some((b) => b.axis === 'who' && b.weight >= 2) && Math.random() < 0.7) l.roleOf = groups[rnd(groups.length)];
      log(l, 'ביקר בדוכן');
      S.leads.push(l);
    }
    save();
  }
  function dashAsks(L) {
    const out = [];
    const empty = L.filter((l) => effWarm(l) == null && !l.tags.length);
    if (empty.length) out.push({ fill: true, q: `${empty.length} בלי שום סימון. להשלים עכשיו, כל עוד זוכרים? בערך דקה.`, leads: empty });
    const waiting = L.filter((l) => l.pendingMat);
    if (waiting.length) out.push({ mat: true, q: `${waiting.length} מחכים לחומר${S.biz.materials.length ? '' : ', ועוד אין חומר'}.` });
    S.biz.buttons.map((b) => [b, L.filter((l) => l.tags.includes(b.id)).length]).filter(([b, n]) => n >= 3 && !["none", "season"].includes(stepOf(b).type))
      .sort((a, b) => b[1] - a[1]).slice(0, 2)   // the two busiest buttons; more is noise
      .forEach(([b, n]) => { const s = stepOf(b); out.push({ days: b.id, q: `${n} סימנו "${b.label}". ${s.label} — עד מתי?`, cur: s.days }); });
    const groups = {};
    L.forEach((l) => { if (l.roleOf) (groups[l.roleOf] = groups[l.roleOf] || []).push(l); });
    Object.keys(groups).filter((g) => groups[g].length >= 2).forEach((g) => out.push({ info: true, q: `${groups[g].length} אנשים מ${g}. כדאי לדבר איתם כאחד.`, leads: groups[g] }));
    return out;
  }
  function viewDash(m) {
    const L = leadsNow();
    const demo = L.filter((l) => l.demo).length;
    const ws = [0, 1, 2, null].map((k) => L.filter((l) => effWarm(l) === k).length);
    const asks = dashAsks(L);
    const top = S.biz.buttons.map((b) => [b, L.filter((l) => l.tags.includes(b.id)).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).slice(0, 6);
    m.innerHTML = `<h1>היום בדוכן: ${L.length - demo} אנשים${demo ? ` <span class="faint">(ועוד ${demo} מדומים)</span>` : ''}</h1>
      ${L.length < 8 ? `<div class="ask-card" style="margin-top:12px"><div class="q">כדי לראות איך נראה יום אמיתי, אפשר להוסיף 20 מבקרים מדומים.</div>
        <div class="actions"><button class="btn" data-act="seed">להוסיף מבקרים מדומים</button></div></div>` : ''}
      <div class="stats">${words().map((t, k) => `<div class="stat"><span class="n">${ws[k]}</span><span class="t">${esc(t)}</span></div>`).join('')}
        <div class="stat"><span class="n">${ws[3]}</span><span class="t">בלי חום</span></div></div>
      ${top.length ? `<div class="faint">הכי הרבה סימנו: ${top.map(([b, n]) => esc(b.label) + ' (' + n + ')').join(' · ')}</div>` : ''}
      <h2 style="margin-top:22px">מה כדאי להשלים</h2>
      <div class="ask" style="margin-top:10px">${asks.map(dashCard).join('') || '<div class="empty">הכל מסומן.</div>'}</div>
      ${insightsBox('dash', 'מה רואים בתיוג של היום')}
      <h2 style="margin-top:26px">מחר בבוקר</h2>
      ${crmRows(openTasks(L).slice(0, 5)) || '<div class="empty">אין משימות.</div>'}
      <div class="actions"><button class="btn" data-view="crm">לרשימה המלאה ב-CRM ←</button></div>`;
  }
  let fillOpen = false;
  function dashCard(a) {
    let body = '';
    if (a.fill) body = fillOpen ? fillList(a.leads) : '<div class="actions"><button class="btn primary" data-act="fill-open">להשלים</button></div>';
    else if (a.mat) body = `<div class="actions"><button class="btn primary" data-act="mat-evening">${S.biz.materials.length ? 'לשלוח להם' : 'להוסיף חומר'}</button></div>`;
    else if (a.days) body = `<div class="chips" style="margin-top:8px">${[[1, 'עד מחר'], [3, 'תוך 3 ימים'], [7, 'השבוע']].map(([d, t]) =>
      `<button class="chip" data-btndays="${a.days}" data-d="${d}" aria-pressed="${a.cur === d}">${t}</button>`).join('')}</div>`;
    else if (a.info) body = `<div class="faint" style="margin-top:6px">${a.leads.map((l) => `<button class="link" data-openlead="${l.id}">${esc(People.rowName(l))}</button>`).join(' · ')}</div>`;
    return `<div class="ask-card"><div class="q">${esc(a.q)}</div>${body}</div>`;
  }
  function fillList(leads) {
    if (!leads.length) return '<div class="faint" style="margin-top:6px">✓ הכל מסומן.</div>';
    return `<div style="margin-top:8px">${leads.map((l) => `<div class="tag-row"><button class="link" data-openlead="${l.id}"><b>${esc(People.rowName(l))}</b> <span class="muted">${esc(People.town(l))}</span>${l.demo ? ' <span class="faint">· מדומה</span>' : ''}</button>
      <span class="mini-w">${words().map((w, k) => `<button class="warm-btn w${k}" data-warm="${k}" data-lid="${l.id}" aria-pressed="false">${esc(w)}</button>`).join('')}</span></div>`).join('')}</div>
      <div class="faint" style="margin-top:6px">נגיעה בשם פותחת את הכרטיס המלא.</div>`;
  }

  // ------------------------------------------------------------------
  // Insights — fixed rules always, Claude on request. Both may only propose
  // actions the system knows how to carry out.
  // ------------------------------------------------------------------
  function fixedInsights(scope) {
    const L = leadsNow();
    const out = [];
    if (scope === 'crm') {
      const t0 = dayNo(now());
      const late = L.filter((l) => { const p = plan(l); return p.due && p.type !== 'none' && dayNo(p.due.getTime()) < t0; });
      if (late.length) out.push({ text: `${late.length} באיחור. להעביר את כולם למחר?`, leadIds: late.map((l) => l.id), action: { kind: 'shift' } });
      const held = L.filter((l) => plan(l).type === 'season');
      if (held.length) { const p = plan(held[0]); out.push({ text: `${held.length} שמורים ל${p.season || 'עונה'}. יחזרו אליך ב${H.label(p.due)}.`, leadIds: held.map((l) => l.id), action: null }); }
      const twice = L.filter((l) => l.noAnswer >= 2 && !l.sent.length && plan(l).type !== 'none');
      if (twice.length) out.push({ text: `${twice.length} לא ענו פעמיים. לשלוח להם חומר במקום עוד שיחה?`, leadIds: twice.map((l) => l.id), action: { kind: 'step', type: 'send' } });
    }
    return out;
  }
  function insightsBox(scope, title) {
    const fixed = fixedInsights(scope);
    const got = S.ai[scope];
    const card = (x, i, src) => `<div class="insight ${src}"><div class="q">${esc(x.text)}</div>
      ${x.leadIds && x.leadIds.length ? `<div class="faint">${x.leadIds.map(leadById).filter(Boolean).slice(0, 6).map((l) => `<button class="link" data-openlead="${l.id}">${esc(People.rowName(l))}</button>`).join(' · ')}${x.leadIds.length > 6 ? ' ועוד ' + (x.leadIds.length - 6) : ''}</div>` : ''}
      ${x.action ? (x.done ? '<div class="faint">✓ בוצע</div>' : `<div class="actions"><button class="btn primary" data-insight="${src}:${i}" data-scope="${scope}">${esc(actionText(x.action))}</button></div>`) : ''}</div>`;
    return `<h2 style="margin-top:26px">✨ ${esc(title)}</h2>
      <div class="ask" style="margin-top:10px">${fixed.map((x, i) => card(x, i, 'fixed')).join('')}
        ${got ? got.items.map((x, i) => card(x, i, 'ai')).join('') || '<div class="faint">לא נמצא משהו מיוחד.</div>' : ''}
        ${ai ? `<div class="actions"><button class="btn" data-act="ai-insights" data-scope="${scope}" id="ins-${scope}">${got ? 'לבדוק שוב' : 'לבקש מהבינה המלאכותית לעבור על הכל'}</button></div>`
          : '<p class="honest">כאן רק התובנות הקבועות. בתוך קלוד — גם בינה מלאכותית שעוברת על הלידים.</p>'}
        ${!fixed.length && !got && !ai ? '<div class="faint">אין כרגע.</div>' : ''}</div>`;
  }
  const actionText = (a) => (a.kind === 'shift' ? 'להעביר למחר' : a.kind === 'warm' ? 'לסמן ' + words()[a.value] : 'לשנות ל: ' + STEPS[a.type].name);
  function applyInsight(scope, ref) {
    const [src, i] = ref.split(':');
    const x = src === 'fixed' ? fixedInsights(scope)[+i] : S.ai[scope] && S.ai[scope].items[+i];
    if (!x || !x.action) return;
    const tomorrow = H.addDays(new Date(now()), 1).getTime();
    x.leadIds.map(leadById).filter(Boolean).forEach((l) => {
      const a = x.action;
      if (a.kind === 'warm') { l.warmth = a.value; l.warmBy = 'hand'; }
      else if (a.kind === 'shift') { const p = plan(l); l.next = { type: p.type, label: p.label, dueAt: tomorrow }; }
      else { l.next = { type: a.type, label: STEPS[a.type].label, dueAt: a.type === 'none' ? null : H.addDays(new Date(now()), Math.max(1, STEPS[a.type].days || 1)).getTime() }; }
      log(l, 'לפי תובנה: ' + actionText(a));
    });
    x.done = true;
    save(); render();
    toast('✓ ' + actionText(x.action));
  }
  function leadFacts(l) {
    const p = plan(l);
    return { id: l.id, name: People.rowName(l), business: l.b != null, town: People.town(l), warmth: effWarm(l) == null ? null : words()[effWarm(l)],
      tags: tagged(l).map((b) => b.label), of: l.roleOf || undefined, visits: l.visits, sent: l.sent, next: p.label, nextKind: p.type,
      dueInDays: p.due ? dayNo(p.due.getTime()) - dayNo(now()) : null, noAnswer: l.noAnswer || 0, won: !!l.won, lost: !!l.lost };
  }
  async function aiInsights(scope) {
    const L = leadsNow().slice(-80).map(leadFacts);
    const btn = $('#ins-' + scope);
    if (btn) { btn.disabled = true; btn.textContent = 'עובר על הלידים…'; }
    const focus = scope === 'dash'
      ? 'Look only at TODAY\'S TAGGING at the booth: visitors left without tags, tags that suggest a different warmth or next step, several people from the same institution, group or family, repeat visits. Do not talk about calls or sales follow-up.'
      : 'Look at the SALES FOLLOW-UP: who to call first and why, overdue or neglected leads, institutions and groups worth one approach, what is held for a season, leads that should change their next step. Do not talk about tagging at the booth.';
    const prompt = `You assist an exhibitor (${S.biz.trade || 'a business'}) at a Hasidic community business fair in Israel.
His buttons: ${S.biz.buttons.map((b) => b.label + ' → ' + STEPS[stepOf(b).type].name).join('; ')}.
His leads (JSON): ${JSON.stringify(L)}
${focus}
Give at most 4 short, concrete observations in Hebrew, each about specific leads. Skip anything obvious or already handled.
Reply with ONLY JSON: {"insights":[{"text":"one Hebrew sentence","leadIds":[ids],"action":null | {"kind":"warm","value":0|1|2} | {"kind":"step","type":"call|send|quote|meet|date|register|regular|season|none"}}]}
warm value: 0 = ${words()[0]}, 1 = ${words()[1]}, 2 = ${words()[2]}.`;
    try {
      const r = await ai.json(prompt, { modelTier: 'quick' });
      const ids = new Set(leadsNow().map((l) => l.id));
      const items = (r && Array.isArray(r.insights) ? r.insights : []).slice(0, 4).map((x) => {
        let action = null;
        const a = x && x.action;
        if (a && a.kind === 'warm' && [0, 1, 2].includes(a.value)) action = { kind: 'warm', value: a.value };
        if (a && a.kind === 'step' && STEPS[a.type]) action = { kind: 'step', type: a.type };
        return { text: str(x && x.text, 220), leadIds: (Array.isArray(x && x.leadIds) ? x.leadIds : []).filter((id) => ids.has(id)), action };
      }).filter((x) => x.text);
      S.ai[scope] = { at: now(), items };
      save(); render();
    } catch (e) {
      aiFailed(e);
      if ($('#ins-' + scope)) { $('#ins-' + scope).disabled = false; $('#ins-' + scope).textContent = 'לנסות שוב'; }
    }
  }

  // ------------------------------------------------------------------
  // CRM — every lead, by what is due
  // ------------------------------------------------------------------
  let crmFilter = null;      // null: today, or everything open when nothing is due today
  let crmQuery = '';
  const isOpen = (l) => !l.lost && plan(l).type !== 'none';
  function openTasks(L) {
    const score = (l) => { const p = plan(l); return (p.due ? p.due.getTime() : 9e15) - (effWarm(l) === 0 ? H.DAY / 2 : 0); };
    return L.filter((l) => isOpen(l) && plan(l).type !== 'season').sort((a, b) => score(a) - score(b));
  }
  function viewCRM(m) {
    const L = leadsNow();
    const t0 = dayNo(now());
    const due = (l) => { const p = plan(l); return p.due ? dayNo(p.due.getTime()) - t0 : null; };
    const groups = {
      today: openTasks(L).filter((l) => due(l) <= 0),
      week: openTasks(L).filter((l) => due(l) > 0 && due(l) <= 7),
      all: openTasks(L),
      season: L.filter((l) => !l.lost && plan(l).type === 'season'),
      audience: L.filter((l) => !l.lost && plan(l).type === 'none'),
      won: L.filter((l) => l.won),
    };
    const late = groups.today.filter((l) => due(l) < 0).length;
    const f = crmFilter || (groups.today.length ? 'today' : 'all');
    const names = { today: 'היום', week: 'השבוע', all: 'כל הפתוחים', season: 'לעונה', audience: 'קהל', won: 'נסגרו' };
    const q = People.norm(crmQuery);
    const list = groups[f].filter((l) => !q || People.norm(People.rowName(l) + ' ' + tagged(l).map((b) => b.label).join(' ') + ' ' + l.roleOf).includes(q));
    m.innerHTML = `<div class="crm-head"><h1>CRM</h1>
        <span class="date-now">היום: ${esc(H.label(new Date(now())))} <button class="btn ghost" data-act="next-day">⏩ יום הבא (הדגמה)</button>${S.shift ? '<button class="btn ghost" data-act="today">לחזור להיום</button>' : ''}</span></div>
      <div class="stats">${Object.keys(names).map((k) => `<button class="stat${k === 'today' && late ? ' bad' : ''}" data-filter="${k}" aria-pressed="${f === k}"><span class="n">${groups[k].length}</span><span class="t">${names[k]}${k === 'today' && late ? ' · ' + late + ' באיחור' : ''}</span></button>`).join('')}</div>
      <input id="crm-q" class="text-input" placeholder="חיפוש לפי שם, כפתור או מוסד" value="${esc(crmQuery)}" autocomplete="off">
      <div style="margin-top:10px">${crmRows(list) || `<div class="empty">אין כאן אף אחד${L.length ? '' : ' — עוד לא נקלטו לידים'}.</div>`}</div>
      ${insightsBox('crm', 'מה כדאי לעשות')}`;
    $('#crm-q').addEventListener('input', (e) => { crmQuery = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#crm-q'); n.focus(); n.setSelectionRange(pos, pos); });
  }
  function crmRows(list) {
    if (!list.length) return '';
    return `<div class="rows">${list.map((l) => {
      const p = plan(l);
      const w = effWarm(l);
      const why = [w != null ? words()[w] : 'בלי חום'].concat(tagged(l).map((b) => b.label), l.roleOf ? [l.roleOf] : [], l.visits > 1 ? ['חזר לדוכן'] : [], l.noAnswer ? ['לא ענה ×' + l.noAnswer] : [], l.won ? ['🎉 נסגר'] : []).join(' · ');
      return `<button class="row" data-crmlead="${l.id}"><span><span class="dot w${w == null ? '' : w}"></span><span class="nm">${esc(People.rowName(l))}</span>${l.b != null ? '<span class="badge biz">עסק</span>' : ''} <span class="muted">${esc(People.town(l))}</span>${l.demo ? ' <span class="faint">· מדומה</span>' : ''}</span>
        <span class="due">${planHTML(p)}</span><span class="why">${esc(why)}</span></button>`;
    }).join('')}</div>`;
  }
  let callOpen = false;
  function crmBody(l) {
    const p = plan(l);
    return `<div class="lead-head"><div><span class="nm">${esc(People.rowName(l))}</span>${l.b != null ? '<span class="badge biz">עסק</span>' : ''} <span class="muted">${esc(People.town(l))}</span>
        <div class="faint">${esc(People.rowMeta(l))}</div></div><button class="btn" data-act="sheet-close">סגירה</button></div>
      <button class="next-line" data-act="next-edit" data-lid="${l.id}"><span class="faint">הלאה:</span> ${planHTML(p)}</button>
      <div class="actions"><button class="btn primary" data-act="call" data-lid="${l.id}">📞 להתקשר עכשיו</button>
        <button class="btn" data-act="send" data-lid="${l.id}">📎 לשלוח חומר</button>
        <button class="btn" data-act="edit-tags" data-lid="${l.id}">✎ תיוג</button></div>
      ${callOpen ? `<div class="mini"><div class="label" style="margin-top:0">איך היה?</div><div class="chips">
        <button class="chip" data-outcome="talk" data-lid="${l.id}">דיברנו — מה הלאה</button>
        <button class="chip" data-outcome="noans" data-lid="${l.id}">לא ענה</button>
        <button class="chip" data-outcome="won" data-lid="${l.id}">🎉 נסגרה עסקה</button>
        <button class="chip" data-outcome="lost" data-lid="${l.id}">לא רלוונטי</button></div>
        <div class="faint" style="margin-top:6px">במערכת האמיתית — החיוג יוצא מכאן, והתוצאה נשאלת כשהשיחה נגמרת.</div></div>` : ''}
      <div class="label">מה היה עד עכשיו</div>
      <ul class="log">${l.log.slice().reverse().map((e) => `<li><span class="when">${esc(H.heDate(new Date(e.at)))} ${new Date(e.at).toTimeString().slice(0, 5)}</span>${esc(e.t)}</li>`).join('')}</ul>`;
  }
  function sheetCRM(l) { callOpen = false; sheet(crmBody(l), l.id, true); }
  function outcome(l, kind) {
    const today = new Date(now());
    callOpen = false;
    if (kind === 'talk') {
      log(l, '📞 דיברנו');
      save();
      return sheetNext(l);
    }
    if (kind === 'noans') {
      l.noAnswer = (l.noAnswer || 0) + 1;
      if (l.noAnswer >= 3) { l.next = { type: 'none', label: 'לא ענה 3 פעמים', dueAt: null }; log(l, '📞 לא ענה — פעם שלישית, עבר לקהל'); }
      else { l.next = { type: 'call', label: 'לנסות שוב', dueAt: H.addDays(today, 1).getTime() }; log(l, '📞 לא ענה — ננסה מחר'); }
    }
    if (kind === 'won') {
      l.won = true;
      const regular = tagged(l).some((b) => stepOf(b).type === 'regular') || S.biz.buttons.some((b) => stepOf(b).type === 'regular');
      l.next = regular ? { type: 'regular', label: 'לבדוק אם צריך עוד', dueAt: H.addDays(today, 28).getTime() } : { type: 'none', label: 'לקוח', dueAt: null };
      log(l, '🎉 נסגרה עסקה' + (regular ? ' — בדיקה חוזרת בעוד 4 שבועות' : ''));
    }
    if (kind === 'lost') { l.lost = true; l.next = { type: 'none', label: 'לא רלוונטי', dueAt: null }; log(l, 'לא רלוונטי'); }
    save(); refreshLead(l); if (S.view === 'crm') { const sh = $('#scrim .sheet'); if (sh) sh.innerHTML = crmBody(l); render(); }
  }
  function sheetNext(l) {
    const p = plan(l);
    const days = p.due ? Math.max(0, dayNo(p.due.getTime()) - dayNo(now())) : STEPS[p.type].days;
    sheetStep({ title: 'מה הלאה עם ' + People.rowName(l) + '?', step: { type: p.type, label: p.label, days }, act: 'save-next', id: l.id });
  }

  // ------------------------------------------------------------------
  // Sheet, menu, toast
  // ------------------------------------------------------------------
  function sheet(html, leadId, crm) {
    closeSheet(false);
    stopIdle();
    const s = document.createElement('div');
    s.className = 'scrim'; s.id = 'scrim';
    s.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"${leadId ? ` data-lead="${leadId}"` : ''}${crm ? ' data-crm="1"' : ''}>${html}</div>`;
    s.addEventListener('click', (e) => { if (e.target === s) { closeSheet(); if (S.phase === 'live' && S.view !== 'booth') render(); } });
    document.body.appendChild(s);
  }
  /** restart: give the booth panel its countdown back. Opening one sheet over another does not. */
  function closeSheet(restart) {
    const s = $('#scrim');
    if (s) s.remove();
    if (restart !== false && openId && $('#slot')) startIdle();
  }
  function sheetConfirm(title, text, act, extra) {
    sheet(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
      <div class="opts"><button class="opt danger" data-act="${act}" ${extra || ''}>כן</button><button class="opt" data-act="sheet-close">ביטול</button></div>`);
  }
  function sheetDevices() {
    sheet(`<h2>חיבור עוד טאבלט</h2>
      <p class="muted">בטאבלט השני פותחים את הקישור או סורקים, ובוחרים מי משתמש בו. שני הטאבלטים רואים את אותם לידים.</p>
      <div class="join-mock"><div class="qr" aria-hidden="true"></div><div class="faint">doochan.app/j/4821</div>
        <button class="btn" data-act="join" style="margin-top:10px">לדמות חיבור של טאבלט</button></div>
      <div class="label">הטאבלט הזה</div>
      <div class="opts"><button class="opt" data-devrole="owner" aria-pressed="${!worker()}">בעלים<small>רואה הכל, משנה הגדרות</small></button>
        <button class="opt" data-devrole="worker" aria-pressed="${worker()}">עובד<small>קולט, מתייג ושולח — בלי הגדרות ובלי איפוס</small></button></div>
      <p class="faint" style="margin-top:10px">מחוברים: ${S.biz.devices} ${S.biz.devices === 1 ? 'טאבלט' : 'טאבלטים'}. בדוגמית זה מדומה, ואין סנכרון.</p>`);
  }
  function toggleMenu() {
    const old = $('#menu');
    if (old) { old.remove(); if (openId && $('#slot')) startIdle(); return; }
    stopIdle();
    const m = document.createElement('div');
    m.className = 'menu'; m.id = 'menu';
    m.innerHTML = [
      S.phase === 'live' ? '<button data-act="settings">הגדרות מתקדמות והתאמה אישית</button>' : '',
      '<button data-act="devices">חיבור עוד טאבלט</button>',
      '<button data-act="reset">איפוס מערכת</button>',
    ].join('');
    $('.top-in').appendChild(m);
  }
  let toastT;
  function toast(text) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text;
    clearTimeout(toastT);
    toastT = setTimeout(() => t.remove(), 2800);
  }

  // ------------------------------------------------------------------
  // Typing, and clicks
  // ------------------------------------------------------------------
  document.addEventListener('input', (e) => {
    const d = e.target.dataset || {};
    if (d.roleof) { const l = leadById(+d.roleof); if (l) { l.roleOf = e.target.value.trim(); save(); } }
    if (d.eventdate) { const l = leadById(+d.eventdate); if (l) { l.eventDate = e.target.value; save(); } }
  });
  document.addEventListener('focusin', (e) => { if (e.target.closest && e.target.closest('.lead input')) stopIdle(); });
  document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('.lead input') && openId) setTimeout(startIdle, 0); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.newbtn) addButton(e.target.dataset.newbtn);
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) { const mn = $('#menu'); if (mn && !e.target.closest('#menu')) { mn.remove(); if (openId && $('#slot')) startIdle(); } return; }
    const d = b.dataset;
    if (!b.closest('#menu') && d.act !== 'menu') { const mn = $('#menu'); if (mn) mn.remove(); }
    if (openId && b.closest('.lead')) startIdle();
    const L = d.lid ? leadById(+d.lid) : null;

    if (d.view) { S.view = d.view; openId = null; stopIdle(); closeSheet(false); fillOpen = false; save(); render(); return window.scrollTo(0, 0); }
    if (d.step) { S.step = d.step; openId = null; stopIdle(); save(); render(); return window.scrollTo(0, 0); }
    if (d.ex) { const t = EXAMPLES[d.ex]; $('#say').value = t; S.biz.by = null; understandWords(t); return; }
    if (d.addaxis) { openAxes.push(d.addaxis); return render(); }
    if (d.addbtn) return addButton(d.addbtn);
    if (d.editbtn) return sheetButton(d.editbtn);
    if (d.steptype) {
      const was = STEPS[ES.type].label;
      ES.type = d.steptype;
      if (ES.days == null || STEPS[ES.type].days == null) ES.days = STEPS[ES.type].days;
      const inp = $('#es-label');
      if (inp && (!inp.value.trim() || inp.value.trim() === was)) inp.value = STEPS[ES.type].label;
      document.querySelectorAll('[data-steptype]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.steptype === ES.type));
      return renderDays();
    }
    if (d.esdays !== undefined) { ES.days = +d.esdays; return renderDays(); }
    if (d.esweight !== undefined) { ES.weight = +d.esweight; document.querySelectorAll('[data-esweight]').forEach((x) => x.setAttribute('aria-pressed', +x.dataset.esweight === ES.weight)); return; }
    if (d.toggle) {
      const k = d.toggle;
      if (k.startsWith('season:')) { const id = k.slice(7); const s = S.biz.seasons; S.biz.seasons = s.includes(id) ? s.filter((x) => x !== id) : s.concat(id); S.biz.seasonsByHand = true; }
      else if (k.startsWith('ch:')) { const c = k.slice(3); S.biz.channels[c] = !S.biz.channels[c]; }
      else S.biz[k] = !S.biz[k];
      save(); return render();
    }
    if (d.idle) { S.biz.idleSec = +d.idle; save(); return render(); }
    if (d.remind) { S.biz.remindWeeks = +d.remind; save(); return render(); }
    if (d.sendwhen) { S.biz.sendWhen = d.sendwhen; save(); return render(); }
    if (d.editseason) return sheetSeason(d.editseason);
    if (d.grades) { S.biz.grades = d.grades; save(); return render(); }
    if (d.pick) return pick(d.pick);
    if (d.again) return cameBack(d.again);
    if (d.warm !== undefined) {
      const l = L || leadById(openId);
      if (l) { l.warmth = +d.warm; l.warmBy = 'hand'; save(); refreshLead(l); }   // sets, never toggles: a double tap must not undo it
      return;
    }
    if (d.tag) {
      const l = L || leadById(openId);
      const t = btnById(d.tag);
      if (!l || !t) return;
      if (l.tags.includes(t.id)) l.tags = l.tags.filter((x) => x !== t.id);
      else {
        if (!AXES[t.axis].multi) l.tags = l.tags.filter((x) => { const o = btnById(x); return !o || o.axis !== t.axis; });
        l.tags.push(t.id);
        if (stepOf(t).type === 'send' && S.biz.materials.length === 1) doSend(l, S.biz.materials[0].name);   // a "send" button sends
      }
      save(); refreshLead(l);
      return;
    }
    if (d.sendmat) { if (L) { doSend(L, d.sendmat); save(); sheetMaterials(L); refreshLead(L); } return; }
    if (d.openlead) { const l = leadById(+d.openlead); if (l) sheet(leadBody(l, true), l.id); return; }
    if (d.crmlead) { const l = leadById(+d.crmlead); if (l) sheetCRM(l); return; }
    if (d.outcome) { if (L) outcome(L, d.outcome); return; }
    if (d.btndays) { const t = btnById(d.btndays); if (t) { t.step = Object.assign(stepOf(t), { days: +d.d }); save(); render(); } return; }
    if (d.filter) { crmFilter = d.filter; return render(); }
    if (d.insight) return applyInsight(d.scope, d.insight);
    if (d.devrole) {
      if (d.devrole === 'owner' && worker()) toast('בגרסה האמיתית — רק עם קוד של הבעלים');
      DEV.role = d.devrole; if (worker() && S.phase === 'settings') S.phase = 'live';
      save(); closeSheet(false); render(); return;
    }

    switch (d.act) {
      case 'menu': return toggleMenu();
      case 'ai-read': return understandAI();
      case 'ai-insights': return aiInsights(d.scope);
      case 'setup-next': {
        if (S.step === 'biz' && !S.biz.buttons.length) { const say = $('#say'); if (say && say.value.trim()) applyReading(parseWords(say.value), say.value); }
        const i = SETUP.findIndex(([k]) => k === S.step);
        S.step = SETUP[i + 1][0]; save(); render(); return window.scrollTo(0, 0);
      }
      case 'go-live':
        S.leads = S.leads.filter((l) => !l.practice);
        S.phase = 'live'; S.view = 'booth'; openId = null; stopIdle(); save(); render();
        return toast('יום התערוכה. בהצלחה!');
      case 'settings':
        if (worker()) return ownerOnly('ההגדרות');
        S.phase = 'settings'; S.step = 'biz'; openId = null; stopIdle(); save(); return render();
      case 'settings-done': S.phase = 'live'; save(); return render();
      case 'edit-def':
        return sheetStep({ title: 'מי שלא סומן לו כלום', step: stepOf(null), act: 'save-def' });
      case 'save-def': S.biz.defStep = readStep(); S.biz.defByHand = true; save(); closeSheet(false); return render();
      case 'save-btn': {
        const x = btnById(ES.id);
        if (!x) return;
        x.label = ($('#eb-name') && $('#eb-name').value.trim()) || x.label;
        x.step = readStep(); x.weight = ES.weight; x.byHand = true; x.unsure = false;
        save(); closeSheet(false); return render();
      }
      case 'del-btn': {
        const x = btnById(d.id);
        if (!x) return;
        S.biz.buttons = S.biz.buttons.filter((y) => y.id !== x.id);
        S.biz.removed.push(x.axis + ':' + x.label);
        S.leads.forEach((l) => { l.tags = l.tags.filter((id) => id !== x.id); });
        save(); closeSheet(false); return render();
      }
      case 'next-edit': { const l = L; return l && sheetNext(l); }
      case 'save-next': {
        const l = leadById(ES.id);
        if (!l) return;
        const s = readStep();
        let dueAt = null;
        if (s.type === 'season') { const st = seasonStart(); dueAt = st ? Math.max(st.date.getTime() - S.biz.remindWeeks * 7 * H.DAY, H.addDays(new Date(now()), 1).getTime()) : null; }
        else if (s.type !== 'none') dueAt = H.addDays(new Date(now()), Math.max(s.days === 0 ? 0 : 1, s.days || 0)).getTime();
        l.next = { type: s.type, label: s.label, dueAt, season: s.type === 'season' && seasonStart() ? seasonStart().name : undefined };
        log(l, 'הלאה: ' + s.label);
        save(); closeSheet(false);
        if (S.phase === 'live' && S.view === 'crm') { render(); return sheetCRM(l); }
        if ($('#slot') && openId === l.id) return renderLead();
        return render();
      }
      case 'add-season': {
        const id = 'c' + Date.now();
        S.biz.seasonDefs.push({ id, name: 'עונה משלי', ranges: [{ from: ['Heshvan', 1], to: ['Heshvan', 29] }] });
        S.biz.seasons.push(id); S.biz.seasonsByHand = true;
        save(); render(); return sheetSeason(id);
      }
      case 'save-season': {
        const s = S.biz.seasonDefs.find((x) => x.id === d.id);
        if (!s) return;
        s.name = ($('#ss-name') && $('#ss-name').value.trim()) || s.name;
        if (s.ranges) s.ranges.forEach((r, i) => {
          const v = (k) => { const el = document.querySelector(`[data-sr="${i}:${k}"]`); return el ? el.value : null; };
          const day = (x, dflt) => Math.max(1, Math.min(30, +x || dflt));
          r.from = [v('fm') || r.from[0], day(v('fd'), r.from[1])];
          r.to = [v('tm') || r.to[0], day(v('td'), r.to[1])];
        });
        save(); closeSheet(false); return render();
      }
      case 'del-season':
        S.biz.seasonDefs = S.biz.seasonDefs.filter((x) => x.id !== d.id);
        S.biz.seasons = S.biz.seasons.filter((x) => x !== d.id);
        save(); closeSheet(false); return render();
      case 'connect': return sheetConnect(d.ch);
      case 'connect-yes': S.biz.channels[d.ch] = true; save(); closeSheet(false); render(); return toast('מחובר (בדוגמית — מדומה)');
      case 'disconnect': S.biz.channels[d.ch] = false; save(); return render();
      case 'del-mat': S.biz.materials.splice(+d.i, 1); save(); return render();
      case 'close-lead':
        if ($('#scrim')) { closeSheet(false); if (S.phase === 'live' && S.view !== 'booth') render(); return; }
        openId = null; stopIdle(); renderResults(''); if ($('#q') && FINE) $('#q').focus(); return;
      case 'undo-lead': {
        const l = L;
        if (!l) return;
        S.leads = S.leads.filter((x) => x.id !== l.id);
        openId = null; stopIdle(); save(); renderResults(''); updateFoot();
        return toast('בוטל — לא נשמר');
      }
      case 'send': {
        const l = L || leadById(openId);
        if (!l) return;
        if (!S.biz.materials.length && worker()) { l.pendingMat = true; save(); refreshLead(l); return toast('סומן "ממתין לחומר".'); }
        if (S.biz.materials.length === 1 && !l.sent.length) { doSend(l, S.biz.materials[0].name); save(); return refreshLead(l); }
        return sheetMaterials(l);
      }
      case 'mat-later': { if (L) { L.pendingMat = true; save(); closeSheet(); refreshLead(L); } return toast('סומן "ממתין לחומר". יופיע בדשבורד.'); }
      case 'mat-evening': {
        if (!S.biz.materials.length) return sheetMaterials(null);
        const waiting = leadsNow().filter((l) => l.pendingMat);
        waiting.forEach((l) => doSend(l, S.biz.materials[0].name));
        save(); return render();
      }
      case 'fill-open': fillOpen = true; return render();
      case 'call': { callOpen = true; const sh = $('#scrim .sheet'); if (sh && L) sh.innerHTML = crmBody(L); return; }
      case 'edit-tags': { if (L) sheet(leadBody(L, true), L.id); return; }
      case 'del-lead': { const l = L || leadById(openId); return l && sheetConfirm('למחוק את ' + People.rowName(l) + '?', 'הליד יימחק מהרשימה.', 'del-lead-yes', `data-lid="${l.id}"`); }
      case 'del-lead-yes': {
        const id = +d.lid;
        S.leads = S.leads.filter((x) => x.id !== id);
        if (openId === id) openId = null;
        save(); closeSheet(false); render(); return toast('הליד נמחק');
      }
      case 'sheet-close':
        closeSheet();
        if (S.phase === 'live' && S.view !== 'booth') render();
        return;
      case 'seed': seedDay(); return render();
      case 'next-day': S.shift += 1; save(); return render();
      case 'today': S.shift = 0; save(); return render();
      case 'devices': return sheetDevices();
      case 'join': S.biz.devices += 1; save(); return sheetDevices();
      case 'reset':
        if (worker()) return ownerOnly('איפוס');
        return sheetConfirm('איפוס מערכת?', 'כל הלידים, הכפתורים וההגדרות יימחקו, וחוזרים להקמה.', 'reset-yes');
      case 'reset-yes': S = fresh(); openId = null; openAxes = []; stopIdle(); closeSheet(false); save(); return render();
    }
  });

  // Test hooks: the readers and the planner, checkable from the console.
  window.Demo3 = { parse: parseWords, clean: cleanAI, plan: (id) => plan(leadById(id)), state: () => S };
  render();
})();
