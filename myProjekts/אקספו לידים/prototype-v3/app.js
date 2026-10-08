/* Expo leads — demo 3, second shape.
 *
 * Two phases, not three moments:
 *   Setup  — registration; the business and his goal at the fair, in his own
 *            words; connections (mail, SMS, WhatsApp); customization of every
 *            option (button groups and the steps behind each button, warmth
 *            and the booth, seasons on the Jewish calendar, material and the
 *            message); a practice booth. After the fair opens, the same
 *            screens are the advanced settings.
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
  // Sheets, toasts and the menu are added to <body>, outside #app. Without this,
  // inside a Claude viewer (no dir on <html>) they come out left-to-right.
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'he';
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
    { k: ['מאפה', 'מאפים', 'חלה', 'חלות', 'עוגה', 'עוגות', 'לחם', 'מזונות', 'מאפייה', 'מאפיות'], label: 'מאפים', next: 'לשלוח מחירון', trade: 'מאפים', season: 'לפני החגים' },
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

  const AUDIENCE = 'בתים|קבוצות|עסקים|משפחות|ציבור|אולמות|מוסדות|מוסד|בתי כנסת|ישיבות|תלמודי תורה|גנים|זוגות|בחורים|אברכים|חתנים|כלות|אירועים|שמחות|כל מי שצריך|כולם';
  const AUD_RE = new RegExp('\\s*,?\\s*ו?(גם\\s+)?(ל|ב|של\\s+)(' + AUDIENCE + ')\\s*$');
  const INST_RE = /מוסד|בית כנסת|בתי כנסת|ישיב|תלמוד תורה|תלמודי תורה|ת"ת|גבא|קהיל/;
  const FILLER_RE = /^(אני|אנחנו|אנו)?\s*(מוכר|מוכרים|משווק|משווקים|מפיץ|מפיצים|סוכן|יבואן|עוסק ב|עוסקים ב|עושה|עושים|יש לנו|יש לי|מתמחה ב|מתמחים ב)\s+/;
  // A piece that is only an audience ("לאירועים", "ולכל מי שצריך") or a remark ("יש מחירון") is not a product.
  const AUD_ONLY_RE = new RegExp('^(ו?(גם\\s+)?(ל|ב|של\\s+)(' + AUDIENCE + ')(\\s+ו?(ל|ב)?(' + AUDIENCE + '))*|יש\\s.*|מי\\sש.*)$');
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
  const MAIL_DOMAIN = 'yourdomain.co.il';   // placeholder: the system's own sending domain, to be named
  const STEPS = {
    call:     { name: 'להתקשר', days: 2, icon: '📞', label: 'לחזור אליו' },
    send:     { name: 'לשלוח חומר', days: 0, icon: '📎', label: 'לשלוח חומר' },
    quote:    { name: 'הצעת מחיר', days: 2, icon: '🧾', label: 'להכין הצעת מחיר' },
    meet:     { name: 'פגישה או ביקור', days: 3, icon: '🤝', label: 'לתאם פגישה' },
    date:     { name: 'תלוי תאריך', days: 1, icon: '📅', label: 'לבדוק תאריך' },
    register: { name: 'הרשמה', days: 1, icon: '✍️', label: 'לשלוח פרטי הרשמה' },
    regular:  { name: 'לקוח קבוע', days: 7, icon: '🔁', label: 'להציע אספקה קבועה' },
    season:   { name: 'לעונה', days: null, icon: '🗓', label: 'לחזור לפני העונה' },
    none:     { name: 'בלי משימה — קהל', days: null, icon: '·', label: 'קהל' },
  };
  // When two steps fall on the same day, the more committing one comes first.
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
  const normStep = (s) => {
    const t = s && STEPS[s.type] ? s.type : 'call';
    return { type: t, label: (s && s.label) || STEPS[t].label, days: s && s.days != null ? s.days : STEPS[t].days, mat: (s && s.mat) || '' };
  };
  // "Send material — at once" is not a task. It happens the moment the button is tapped.
  const immediate = (s) => s.type === 'send' && s.days === 0;

  /* Groups of buttons: what separates one customer from another. A carpenter
   * separates by product, a distributor of bakeries by who is asking and how
   * much. These four are suggestions; a business deletes any of them and adds
   * its own. */
  const STD = {
    what: { title: 'במה התעניין', hint: 'מוצרים או שירותים', multi: true },
    who:  { title: 'סוג פונה', hint: 'מי ניגש אליך' },
    size: { title: 'סדר גודל', hint: 'כמה הוא יכול לקנות' },
    when: { title: 'מתי', hint: 'עכשיו, לשמחה, לעונה' },
  };
  const WEIGHT = ['רגיל', 'טוב', 'חשוב', 'חשוב מאוד'];
  const SEASON_WORDS = {
    'אחרי החגים': ['afterchag'], 'לפני הקיץ': ['summer'], 'עונת החתונות': ['weddings'], 'לפני פסח וראש השנה': ['pesach', 'elul'],
    'לפני החגים': ['pesach', 'elul', 'sukkot'], 'בין הזמנים': ['bein'], 'אלול': ['elul'], 'סוף שנת המס': ['tax'], 'לפני סוכות': ['sukkot'],
    'אלול–תשרי': ['elul', 'sukkot'], 'חנוכה': ['chanukah'], 'לפני פסח וסוכות': ['pesach', 'sukkot'],
  };

  /** The word-list reader: products only, plus kinds of visitor when he works with institutions. */
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
      what.push({ label: key, steps: entry ? [{ type: typeOfNext(entry.next), label: entry.next }] : [], weight: 1, unsure: !!unsure });
      if (entry && entry.trade) trades[entry.trade] = (trades[entry.trade] || 0) + 1;
      if (entry && entry.season) (SEASON_WORDS[entry.season] || []).forEach((s) => seasons.add(s));
    };
    let institutions = INST_RE.test(text);
    const pieces = String(text || '').split(/[,،;\n:.]+|\sוגם\s/).map((s) => s.trim()).filter(Boolean);
    for (const raw of pieces) {
      const whole = dropAudience(raw.replace(/^גם\s+/, '').replace(FILLER_RE, ''));
      for (const part of splitAnd(whole)) {
        const piece = /^ו/.test(part) && !findEntries(part).length ? part.slice(1) : part;
        if (!piece || /^(ועוד|וכו|ועוד הרבה|הכל|הכול)$/.test(piece) || AUD_ONLY_RE.test(piece)) continue;
        const hits = findEntries(piece);
        if (hits.some((h) => h.inst)) institutions = true;
        if (hits.length === 1) add(piece.length <= 26 ? piece : hits[0].label, hits[0]);
        else if (hits.length > 1) hits.forEach((h) => add(h.label, h));
        else {
          // An unknown short phrase may be a product; a longer one, or one that describes how he works, is not a button.
          unclear.push(piece);
          if (piece.split(/\s+/).length <= 2 && !/מדיד|הצעת מחיר|טעימ|עונה|מגיע|אחרי|מקבל|שולח|עובד/.test(piece)) add(piece, null, true);
        }
      }
    }
    const who = institutions ? [
      { label: 'פרטי', steps: [], weight: 0 },
      { label: 'מוסד', steps: [{ type: 'meet', label: 'לקבוע פגישה' }], weight: 3 },
      { label: 'גבאי או קבוצה', steps: [{ type: 'call', label: 'להציע לקבוצה' }], weight: 2 },
    ] : [];
    const trade = Object.keys(trades).sort((a, b) => trades[b] - trades[a])[0] || '';
    return { trade, axes: { what, who }, seasons: Array.from(seasons), unclear, dropped, defSteps: null, goalNote: '', by: 'words' };
  }

  // ------------------------------------------------------------------
  // The Claude reader — used whenever the page runs inside a Claude viewer.
  // ------------------------------------------------------------------
  let ai = null;
  const SEASON_IDS = H.SEASONS.map((s) => s.id);
  const PROMPT = (text, goal) => `You help an exhibitor at a Hasidic community business fair in Israel set up a lead-capture tablet.
About his business, in his words (Hebrew):
"""${text.slice(0, 2500)}"""
His goal at the fair:
"""${(goal || 'not given').slice(0, 800)}"""

While talking to a visitor he taps buttons on the tablet. Decide which of these four groups really separate one customer from another FOR THIS BUSINESS AND THIS GOAL — the ones where a different answer means he does something different next. Use one or two groups, three at most:
- "what": products or services. Only if the difference changes what he does next. Products handled the same way are ONE button, or no group at all.
- "who": the kind of visitor (e.g. פרטי, בעל שמחה, מוסד, גבאי או קבוצה, עסק, בעל קייטרינג, חנות).
- "size": the size of the order (e.g. יחידה, משפחה, אירוע, מוסד, אספקה קבועה).
- "when": timing (e.g. עכשיו, לשמחה בתאריך, לעונה).

Each button: {"label": 1-3 Hebrew words, "weight": 0-3 how valuable this visitor is to him GIVEN HIS GOAL, "steps": one or two steps}.
Each step: {"step": one of "call","send","quote","meet","date","register","regular","season","none", "stepLabel": what HE does, 2-4 Hebrew words in his trade's language, "days": after how many days (0 = at once)}.
Step meanings: call = phone him back; send = send material (days 0 = sent from the booth at once); quote = prepare a price quote; meet = meeting, visit, tasting, measuring, demo; date = depends on a date (an event); register = sign up; regular = recurring supply, repeat customer; season = come back before his busy season; none = no task.
Two steps are welcome where they fit, e.g. send the price list at once AND call after three days.

Read community Hebrew correctly: "מזונות" = pastries and cakes (the mezonot blessing), not food or catering. "משווק", "סוכן", "מפיץ", "יבואן" = he sells goods made by others; he does not produce or cook them. "בוטיק" = small premium makers. Audiences and occasions (לבתים, לעסקים, למוסדות, לאירועים, לשמחות, "לכל מי שצריך") are visitors, never products. Never add a product or service he did not say.

Reply with ONLY one JSON object, all strings in Hebrew:
{"trade":"his trade with his role, 1-4 words","goal":"his goal in one short line","axes":{"what":[],"who":[],"size":[],"when":[]},"defaultSteps":[{"step":"call","stepLabel":"...","days":3}],"seasons":[],"unclear":[]}
- Leave a group as [] when it does not matter for him. At most 6 buttons per group.
- defaultSteps: what he does with a visitor he tagged nothing for.
- seasons: his busy periods, only if clearly so, ids from: ${SEASON_IDS.join(', ')}.
- unclear: parts of his text you could not understand.`;

  // A product whose main word is not in his text was invented: keep it, but marked "?".
  const saidIt = (name, text) => {
    const w = fin(name.split(/\s+/)[0] || '');
    const t = fin(text);
    return !w || t.includes(w) || (w.length > 3 && t.includes(w.slice(0, -2)));
  };
  const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  function cleanSteps(list) {
    return (Array.isArray(list) ? list : []).slice(0, 3).map((s) => {
      const type = s && STEPS[s.step] ? s.step : typeOfNext(s && s.stepLabel);
      const d = s && Number.isFinite(+s.days) && s.days !== null && s.days !== '' ? Math.max(0, Math.min(60, Math.round(+s.days))) : STEPS[type].days;
      return { type, label: str(s && s.stepLabel, 30) || STEPS[type].label, days: d };
    });
  }
  function cleanAI(r, text) {
    if (!r || typeof r !== 'object' || !r.axes || typeof r.axes !== 'object') throw { code: 'invalid_json' };
    const axes = {};
    Object.keys(STD).forEach((ax) => {
      const list = Array.isArray(r.axes[ax]) ? r.axes[ax] : [];
      axes[ax] = list.slice(0, 8).map((b) => {
        const label = str(b && b.label, 30);
        const steps = cleanSteps(b && b.steps ? b.steps : [{ step: b && b.step, stepLabel: b && b.stepLabel }]);
        const weight = Math.max(0, Math.min(3, Math.round(+(b && b.weight)) || 0));
        return { label, steps, weight, unsure: ax === 'what' && !saidIt(label, text) };
      }).filter((b) => b.label);
    });
    if (!Object.keys(axes).some((ax) => axes[ax].length)) throw { code: 'invalid_json' };
    const def = cleanSteps(r.defaultSteps || (r.defaultStep ? [r.defaultStep] : []));
    return {
      trade: str(r.trade, 40), goalNote: str(r.goal, 80), axes,
      seasons: Array.isArray(r.seasons) ? r.seasons.filter((s) => SEASON_IDS.includes(s)) : [],
      unclear: Array.isArray(r.unclear) ? r.unclear.map((u) => str(u, 40)).filter(Boolean) : [],
      dropped: [], defSteps: def.length ? def : null, by: 'ai',
    };
  }

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  const KEY = 'expo-demo3d';
  const DEVKEY = 'expo-demo3-tablet';        // owner or worker belongs to THIS tablet, not to the business
  const GRADES = {
    classic: { name: 'הקלאסי', words: ['חם', 'פושר', 'קר'] },
    serious: { name: 'לפי רצינות', words: ['רציני', 'אולי', 'סתם'] },
    time:    { name: 'לפי זמן', words: ['עכשיו', 'בהמשך', 'לא כרגע'] },
    plain:   { name: 'במילים פשוטות', words: ['מעניין מאוד', 'מעניין', 'רק עבר'] },
  };
  const EXAMPLES = {
    'נגר': 'נגרייה: מטבחים, ארונות קיר ודלתות פנים, לבתים ולמוסדות. מגיעים למדידה, ואחרי זה הצעת מחיר.',
    'מאפים': 'משווק לחמים ומזונות של מאפיות בוטיק, לאירועים, לעסקים ולכל מי שצריך. יש מחירון, ומי שלוקח באופן קבוע מקבל משלוח.',
    'הפעלות': 'הפעלות חוויתיות וטיולים לקבוצות ולמוסדות. העונה החזקה בבין הזמנים.',
    'דפוס': 'דפוס: הזמנות לחתונות, חוברות ושילוט לעסקים. שולחים דוגמאות והצעת מחיר.',
  };
  const GOALS = ['להכיר לקוחות חדשים', 'לסגור אספקה קבועה למוסדות', 'למכור במקום', 'לבנות רשימת תפוצה', 'לקבוע פגישות'];
  function fresh() {
    return {
      phase: 'setup', step: 'account', sub: 'buttons', view: 'booth', shift: 0,
      account: { name: '', email: '', phone: '' },
      biz: {
        name: '', said: '', goal: '', goalNote: '', parsedFrom: null, by: null, trade: '', unclear: [], dropped: [],
        removed: [], removedGroups: [], groups: [], buttons: [], bseq: 1,
        defSteps: [{ type: 'call', label: 'לחזור אליו', days: 3 }], defByHand: false,
        seasons: [], seasonsByHand: false, seasonDefs: JSON.parse(JSON.stringify(H.SEASONS)), remindWeeks: 3,
        grades: 'classic', derive: true, idleSec: 12, hideVisited: true,
        materials: [], channels: { email: true, sms: false, wa: false, waApi: false },
        mail: { replyTo: '', prefix: '' }, smsName: '',
        sendWhen: 'now', template: 'שלום {שם}, תודה שעברת בדוכן של {עסק}. מצורף {חומר}. נשמח לעמוד לשירותך.',
        devices: 1,
      },
      leads: [], seq: 1, nseq: 1, ai: { dash: null, crm: null },
    };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
  let DEV;
  try { DEV = JSON.parse(localStorage.getItem(DEVKEY)) || { role: 'owner' }; } catch (e) { DEV = { role: 'owner' }; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(DEVKEY, JSON.stringify(DEV)); } catch (e) { /* private window, or full */ } };
  const words = () => GRADES[S.biz.grades].words;
  const worker = () => DEV.role === 'worker';
  const ownerOnly = (what) => toast('🔒 ' + what + ' — רק בטאבלט של הבעלים');
  // The demo can step forward in time, so the CRM can be seen on the days after the fair.
  const now = () => Date.now() + S.shift * H.DAY;

  const btnById = (id) => S.biz.buttons.find((b) => b.id === id);
  const groupById = (id) => S.biz.groups.find((g) => g.id === id);
  const groupButtons = (gid) => S.biz.buttons.filter((b) => b.axis === gid);
  const liveGroups = () => S.biz.groups.filter((g) => groupButtons(g.id).length);
  const tagged = (l) => l.tags.map(btnById).filter(Boolean);
  const leadById = (id) => S.leads.find((l) => l.id === id);
  const practice = () => S.phase !== 'live';
  const leadsNow = () => S.leads.filter((l) => !!l.practice === practice());
  const replyTo = () => S.biz.mail.replyTo || S.account.email;
  const stepsOf = (b) => (b && b.steps && b.steps.length ? b.steps : S.biz.defSteps).map(normStep);

  const aiReady = (a) => { ai = a; if ($('#say-actions')) renderSayActions(); else if (S.phase === 'live' && S.view !== 'booth') render(); };
  /* Two ways to reach the AI, one interface (`ai.json(prompt)`):
   *   inside a Claude viewer — the `sample` capability;
   *   on Cloudflare — our own worker (_worker.js), which holds the API key.
   * Anywhere else (the local server) neither answers, and the word list is all there is. */
  const CODEKEY = 'expo-demo3-ai-code';
  const aiCode = () => { try { return localStorage.getItem(CODEKEY) || ''; } catch (e) { return ''; } };
  const serverAI = {
    async json(prompt) {
      let r;
      try {
        r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json', 'x-access-code': aiCode() }, body: JSON.stringify({ prompt }) });
      } catch (e) { throw { code: 'not_configured' }; }   // no server answers here: the AI is simply not connected
      const data = await r.json().catch(() => ({}));
      if (r.status === 404) throw { code: 'not_configured' };
      if (!r.ok) throw { code: data.code || 'upstream' };
      // The model answers in text; take the JSON object out of it, fences and all.
      const t = String(data.text || '');
      const a = t.indexOf('{');
      const z = t.lastIndexOf('}');
      try { return JSON.parse(t.slice(a, z + 1)); } catch (e) { throw { code: 'invalid_json' }; }
    },
  };
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('sample').then((s) => { if (s) aiReady(s); }).catch(() => {});
  } else if (location.protocol !== 'file:') {
    fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"ping":1}' })
      .then((r) => (r.ok ? r.json() : null)).then((p) => { if (p && p.configured) aiReady(serverAI); }).catch(() => {});
  }
  function sheetCode() {
    sheet(`<h2>קוד גישה לבינה המלאכותית</h2>
      <p class="muted">כדי שרק מי שקיבל ממך את הקישור ישתמש בבינה המלאכותית. פעם אחת בכל מכשיר.</p>
      <input id="ai-code" class="text-input ltr" autocomplete="off">
      <div class="actions"><button class="btn primary" data-act="ai-code-save">שמירה</button><button class="btn ghost" data-act="sheet-close">ביטול</button></div>`);
    if (FINE) setTimeout(() => $('#ai-code') && $('#ai-code').focus(), 30);
  }

  /* Voice notes live in IndexedDB — a minute of audio is too big for localStorage. */
  const AudioDB = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('expo-demo3-audio', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('a');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const tx = (mode, fn) => open().then((db) => new Promise((res, rej) => {
      const t = db.transaction('a', mode);
      const q = fn(t.objectStore('a'));
      t.oncomplete = () => res(q && q.result);
      t.onerror = () => rej(t.error);
    }));
    return { put: (k, v) => tx('readwrite', (s) => s.put(v, k)), get: (k) => tx('readonly', (s) => s.get(k)) };
  })();

  // ------------------------------------------------------------------
  // What follows from what is known: warmth, the steps, their dates.
  // ------------------------------------------------------------------
  /** Warmth from what was tapped: valuable buttons, material asked for, a second visit. */
  function autoWarm(l) {
    const bs = tagged(l);
    const asked = l.sent.length || (l.queue || []).length;
    if (!bs.length && !asked && l.visits < 2 && !l.roleOf) return null;
    const score = bs.reduce((a, b) => a + (b.weight || 0), 0) + (asked ? 1 : 0) + (l.visits > 1 ? 2 : 0) + (l.roleOf ? 1 : 0);
    return score >= 3 ? 0 : 1;
  }
  function effWarm(l) {
    if (l.warmBy === 'hand') return l.warmth;
    return S.biz.derive ? autoWarm(l) : l.warmth;
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
  const seasonDue = () => {
    const s = seasonStart();
    if (!s) return null;
    const back = s.date.getTime() - S.biz.remindWeeks * 7 * H.DAY;
    return back > now() ? H.addDays(new Date(back), 0) : H.addDays(new Date(now()), 1);
  };
  /** The steps the buttons give this lead, each with a key so it can be done or moved. */
  function derived(l) {
    const bs = tagged(l);
    const src = bs.length ? bs.map((b) => [b.id, stepsOf(b)]) : [['def', stepsOf(null)]];
    const seen = new Set();
    const out = [];
    src.forEach(([id, ss]) => ss.forEach((s, i) => {
      const sig = s.type + '|' + s.label;
      if (seen.has(sig)) return;
      seen.add(sig);
      out.push(Object.assign({}, s, { key: id + ':' + i }));
    }));
    return out;
  }
  // Friday is short and busy before Shabbat: a call or a meeting moves to Sunday. Messages and preparation still may land on it.
  const talk = (t) => t === 'call' || t === 'meet';
  function dueOf(l, s) {
    if (l.moved[s.key]) return new Date(l.moved[s.key]);
    if (s.dueAt) return new Date(s.dueAt);
    if (s.type === 'season') return seasonDue() || H.addDays(new Date(l.at), 3);
    let days = s.days == null ? 2 : s.days;
    if (effWarm(l) === 0) days = Math.min(days, 1);
    return H.addDays(new Date(l.at), Math.max(1, days), talk(s.type));
  }
  /** Everything still to do for this lead, soonest first. Empty: the lead is audience. */
  function tasks(l) {
    if (l.lost || l.audience) return [];
    const w = effWarm(l);
    let list = w === 2 ? [] : derived(l);
    const saidNone = list.some((s) => s.type === 'none');
    list = list.filter((s) => s.type !== 'none' && !immediate(s));
    // Buttons that only send at once still leave someone to follow up with.
    if (!list.length && w !== 2 && !saidNone && tagged(l).length) list = stepsOf(null).map((s, i) => Object.assign({}, s, { key: 'def:' + i })).filter((s) => s.type !== 'none' && !immediate(s));
    const season = seasonStart();
    return list.concat(l.manual).filter((s) => !l.done.includes(s.key))
      .map((s) => Object.assign({}, s, { due: dueOf(l, s), season: s.type === 'season' && season ? season.name : undefined }))
      .sort((a, b) => a.due - b.due || PRI.indexOf(a.type) - PRI.indexOf(b.type));
  }
  function plan(l) {
    return tasks(l)[0] || { type: 'none', label: l.won ? 'לקוח' : l.lost ? 'לא רלוונטי' : 'קהל', due: null };
  }
  const dayNo = (t) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / H.DAY);
  function dueText(d) {
    if (!d) return '';
    const diff = dayNo(d.getTime()) - dayNo(now());
    const rel = diff < 0 ? 'באיחור · ' : diff === 0 ? 'היום · ' : diff === 1 ? 'מחר · ' : '';
    return rel + H.label(d) + ' (' + d.getDate() + '/' + (d.getMonth() + 1) + ')';
  }
  const daysWord = (s) => (s.type === 'none' ? 'בלי משימה' : s.type === 'season' ? 'לפני העונה' : s.days === 0 ? 'מיד' : s.days === 1 ? 'תוך יום' : 'תוך ' + s.days + ' ימים');
  const stepText = (s) => STEPS[s.type].icon + ' ' + s.label + (s.mat ? ' (' + s.mat + ')' : '') + ' · ' + daysWord(s);
  const stepsText = (ss) => ss.map(stepText).join('  +  ');
  const planHTML = (p) => `${STEPS[p.type].icon} <b>${esc(p.label)}</b>${p.due ? ' · ' + esc(dueText(p.due)) : ''}${p.season ? ' · לקראת ' + esc(p.season) : ''}`;
  const log = (l, t) => l.log.push({ at: now(), t });
  const addManual = (l, s, dueAt) => { l.manual.push({ key: 'm' + (S.nseq++), type: s.type, label: s.label, days: s.days, mat: s.mat || '', dueAt }); };
  function dueFor(s) {
    if (s.type === 'season') { const d = seasonDue(); return d ? d.getTime() : H.addDays(new Date(now()), 3).getTime(); }
    return H.addDays(new Date(now()), Math.max(1, s.days || 0), talk(s.type)).getTime();
  }

  // ------------------------------------------------------------------
  // Shell
  // ------------------------------------------------------------------
  const SETUP = [['account', 'הרשמה'], ['biz', 'העסק והמטרה'], ['connect', 'חיבורים'], ['custom', 'התאמה אישית'], ['try', 'ניסיון']];
  const SUBS = [['buttons', 'הכפתורים'], ['booth', 'החום והדוכן'], ['seasons', 'עונות'], ['materials', 'חומרים ונוסח'], ['crm', 'שלבים, צוות ובוקר']];
  const LIVE = [['booth', 'הדוכן'], ['dash', 'דשבורד'], ['crm', 'המעקב שלי']];
  function render() {
    renderTop();
    const m = $('#main');
    if (S.phase !== 'live') {
      ({ account: viewAccount, biz: viewBiz, connect: viewConnect, custom: viewCustom, try: viewTry }[S.step] || viewAccount)(m);
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
        `<button class="moment" data-step="${k}" aria-current="${S.step === k}" ${S.phase === 'setup' && k !== 'account' && !accountOk() ? 'disabled title="קודם הרשמה"' : ''}>${S.phase === 'setup' ? `<span class="n">${n + 1}</span>` : ''}${t}</button>`).join('');
    $('#top').innerHTML = `<div class="top-in">
      <div class="brand">${esc(S.biz.name || 'הדוכן שלי')}${S.phase === 'settings' ? ' <span class="faint">· הגדרות</span>' : S.phase === 'setup' ? ' <span class="faint">· הקמה</span>' : ''}</div>
      <nav class="moments" aria-label="ניווט">${nav}</nav>
      ${S.phase === 'settings' ? '<button class="btn" data-act="settings-done">חזרה לדוכן</button>' : ''}
      ${worker() ? '<span class="lock">🔒 טאבלט עובד</span>' : ''}
      <button class="icon-btn" data-act="menu" aria-label="תפריט">⋯</button>
    </div>`;
  }

  // ------------------------------------------------------------------
  // Setup 1 — registration
  // ------------------------------------------------------------------
  let accErrors = {};
  function viewAccount(m) {
    const a = S.account;
    const err = (k) => (accErrors[k] ? `<div class="err" id="err-${k}">${esc(accErrors[k])}</div>` : '');
    const inv = (k) => (accErrors[k] ? ` aria-invalid="true" aria-describedby="err-${k}"` : '');
    m.innerHTML = `<section class="card narrow">
      <h1>ברוך הבא</h1>
      <p class="muted">נרשמים פעם אחת. אחר כך — כמה מילים על העסק, והמערכת מתאימה את עצמה אליך.</p>
      <label class="label" for="acc-name">שם מלא <small class="req">חובה</small></label>
      <input id="acc-name" class="text-input${accErrors.name ? ' bad' : ''}" data-acc="name" value="${esc(a.name)}" autocomplete="name"${inv('name')}>${err('name')}
      <label class="label" for="acc-email">אימייל <small class="req">חובה</small> <small>לכאן יגיעו תשובות של לקוחות, אם לא תבחר אחרת</small></label>
      <input id="acc-email" class="text-input ltr${accErrors.email ? ' bad' : ''}" type="email" data-acc="email" value="${esc(a.email)}" autocomplete="email" placeholder="name@example.com"${inv('email')}>${err('email')}
      <label class="label" for="acc-phone">טלפון</label><input id="acc-phone" class="text-input ltr" type="tel" data-acc="phone" value="${esc(a.phone)}" autocomplete="tel">
      <label class="label" for="acc-biz">שם העסק</label><input id="acc-biz" class="text-input" data-bizname value="${esc(S.biz.name)}" placeholder="למשל: נגריית הדר" autocomplete="organization">
      <p class="honest">בדוגמית הפרטים נשמרים רק בדפדפן הזה. אין חשבון אמיתי.</p>
    </section>`;
  }
  /** Errors beside the fields, focus on the first: a toast that vanishes is no place for them. */
  function checkAccount() {
    accErrors = {};
    if (!S.account.name) accErrors.name = 'מה השם שלך?';
    if (!emailOk(S.account.email)) accErrors.email = 'צריך אימייל תקין, כמו name@example.com — לשם יגיעו התשובות.';
    return !Object.keys(accErrors).length;
  }
  const accountOk = () => !!S.account.name && emailOk(S.account.email);
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
  let exPending = null;
  function useExample(k) { const t = EXAMPLES[k]; if (!t || !$('#say')) return; $('#say').value = t; S.biz.by = null; understandWords(t); }

  // ------------------------------------------------------------------
  // Setup 2 — the business and the goal, in his words
  // ------------------------------------------------------------------
  function viewBiz(m) {
    m.innerHTML = `<div class="onb">
      <section class="card">
        <h1>ספר לי על העסק שלך</h1>
        <p class="muted">כמה שיותר פרטים — מכל מילה נגזר משהו:</p>
        <ul class="prompts"><li>מה אתה מוכר, ולמי</li><li>איך עובדים איתך: מחירון, מדידה, טעימה, הזמנה לאירוע</li><li>מה ההזמנה הטיפוסית, ומי הלקוח הכי שווה</li><li>מתי העונה החזקה</li></ul>
        <textarea id="say" class="say" placeholder="למשל: משווק לחמים ומזונות של מאפיות בוטיק, לאירועים, למוסדות ולכל מי שצריך. יש מחירון, ומי שלוקח קבוע מקבל משלוח.">${esc(S.biz.said)}</textarea>
        <div class="examples"><span class="faint">דוגמה:</span>
          ${Object.keys(EXAMPLES).map((k) => `<button class="chip" data-ex="${esc(k)}">${esc(k)}</button>`).join('')}</div>
        <h2 style="margin-top:22px">מה המטרה שלך באקספו?</h2>
        <p class="muted">${ai ? 'לפי זה נקבע מי הכי חשוב לך, ומה עושים אחרי.' : 'נשמר. כאן, בלי בינה מלאכותית, המטרה לא משנה את הכפתורים — בתוך קלוד או כשהבינה המלאכותית מחוברת, היא כן.'}</p>
        <textarea id="goal" class="say small" placeholder="למשל: לסגור אספקה קבועה עם מוסדות וקייטרינגים">${esc(S.biz.goal)}</textarea>
        <div class="examples">${GOALS.map((g) => `<button class="chip" data-goal="${esc(g)}" aria-pressed="${S.biz.goal.split(',').map((x) => x.trim()).includes(g)}">${esc(g)}</button>`).join('')}</div>
        <div id="say-actions"></div>
      </section>
      <section class="card" id="preview"></section>
    </div>`;
    const say = $('#say');
    let t;
    say.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => understandWords(say.value), 220); });
    $('#goal').addEventListener('input', (e) => { S.biz.goal = e.target.value; save(); renderSayActions(); });
    renderSayActions();
    renderPreview();
    if (!S.biz.said && FINE) setTimeout(() => say.focus(), 40);
  }
  function renderSayActions() {
    const box = $('#say-actions');
    if (!box) return;
    const stale = S.biz.by === 'ai' && ((($('#say') && $('#say').value) !== S.biz.parsedFrom) || S.biz.goal !== S.biz.goalFrom);
    box.innerHTML = ai
      ? `<div class="actions"><button class="btn primary big" data-act="ai-read" id="ai-btn">✨ תבין אותי</button>
          <span class="faint" id="ai-note">${stale ? 'שינית משהו — לחץ שוב כדי שאקרא מחדש' : S.biz.by === 'ai' ? 'הובן ע"י בינה מלאכותית' : 'עד שתלחץ — טיוטה מהירה לפי מילים'}</span></div>`
      : `<p class="honest">כאן הטקסט נקרא לפי רשימת מילים, שמזהה בערך רבע מהעסקים, ואת המטרה היא לא קוראת. בתוך קלוד, או כשהבינה המלאכותית מחוברת בשרת — היא קוראת את שניהם.</p>`;
  }
  /** Merge a fresh reading into what is there, keeping every hand edit, every removal, and the ids leads are tagged with. */
  function applyReading(r, text) {
    const b = S.biz;
    const old = b.buttons;
    const hand = old.filter((x) => x.byHand);
    const removed = new Set(b.removed);
    const read = [];
    Object.keys(r.axes).forEach((ax) => {
      if (b.removedGroups.includes(ax)) return;
      (r.axes[ax] || []).forEach((x) => {
        if (removed.has(ax + ':' + x.label) || hand.some((h) => h.axis === ax && h.label === x.label)) return;
        const same = old.find((o) => o.axis === ax && o.label === x.label);
        read.push({ id: same ? same.id : 'k' + (b.bseq++), axis: ax, label: x.label, steps: x.steps, weight: x.weight, unsure: x.unsure });
      });
    });
    b.buttons = hand.concat(read);
    // A suggested group appears when it has buttons, and goes when a new reading leaves it empty.
    b.groups = b.groups.filter((g) => g.byHand || groupButtons(g.id).length);
    Object.keys(STD).forEach((ax) => { if (groupButtons(ax).length && !groupById(ax)) b.groups.push(Object.assign({ id: ax }, STD[ax])); });
    const order = Object.keys(STD);
    b.groups.sort((x, y) => (order.indexOf(x.id) + 1 || 99) - (order.indexOf(y.id) + 1 || 99));
    const ids = new Set(b.buttons.map((x) => x.id));
    S.leads.forEach((l) => { l.tags = l.tags.filter((id) => ids.has(id)); });
    if (r.trade || r.by === 'ai') b.trade = r.trade;
    if (r.by === 'ai') b.goalNote = r.goalNote;
    if (!b.seasonsByHand) b.seasons = r.seasons;
    if (r.defSteps && !b.defByHand) b.defSteps = r.defSteps;
    b.unclear = r.unclear; b.dropped = r.dropped; b.by = r.by;
    b.said = text; b.parsedFrom = text; b.goalFrom = b.goal;
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
      applyReading(cleanAI(await ai.json(PROMPT(text, S.biz.goal), { modelTier: 'quick' }), text), text);
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
    } else if (code === 'need_code') sheetCode();
    else if (code === 'not_configured') { ai = null; toast('הבינה המלאכותית לא מחוברת כאן.'); render(); }
    else if (code === 'rate_limited') toast('יותר מדי בקשות. אפשר לנסות שוב בעוד רגע.');
    else toast('לא הצלחתי עכשיו. אפשר לנסות שוב.');
  }
  function renderPreview() {
    const box = $('#preview');
    if (!box) return;
    const b = S.biz;
    const gs = liveGroups();
    const seasons = b.seasons.map((id) => (b.seasonDefs.find((s) => s.id === id) || {}).name).filter(Boolean);
    box.innerHTML = `<h2>מה הבנתי</h2>
      ${gs.length ? `<ul class="understood">
        ${b.trade ? `<li>התחום: <b>${esc(b.trade)}</b></li>` : ''}
        ${b.goalNote ? `<li>המטרה: <b>${esc(b.goalNote)}</b></li>` : ''}
        ${gs.map((g) => `<li>${esc(g.title)}: ${groupButtons(g.id).map((x) => `<b>${esc(x.label)}</b>${x.unsure ? ' <span class="q">?</span>' : ''}`).join(' · ')}</li>`).join('')}
        <li>מי שלא סומן לו כלום: <b>${esc(stepsText(stepsOf(null)))}</b></li>
        ${seasons.length ? `<li>העונה החזקה: <b>${esc(seasons.join(' · '))}</b></li>` : ''}
        ${b.unclear.length ? `<li class="warn-li">לא זיהיתי בוודאות: <b>${esc(b.unclear.join(' · '))}</b> — השארתי במילים שלך</li>` : ''}
      </ul>
      <p class="faint" style="margin-top:12px">${b.by === 'ai' ? 'נקרא ע"י בינה מלאכותית.' : 'נקרא לפי רשימת מילים.'} הכל ניתן לשינוי ב"התאמה אישית".</p>`
      : '<div class="empty">תתחיל לכתוב, ומה שהבנתי יופיע כאן.</div>'}`;
  }

  // ------------------------------------------------------------------
  // Setup 3 — connections: mail, SMS, WhatsApp
  // ------------------------------------------------------------------
  const CHANNELS = [
    { k: 'email', ic: '📧', name: 'מייל' },
    { k: 'sms', ic: '💬', name: 'SMS' },
    { k: 'wa', ic: '🟢', name: 'וואטסאפ (לא רשמי)' },
    { k: 'waApi', ic: '✅', name: 'וואטסאפ עסקי רשמי' },
  ];
  const toggle = (k, on, name) => `<button class="toggle" data-toggle="${k}" aria-pressed="${!!on}" aria-label="${esc(name || 'הפעלה')}"></button>`;
  function viewConnect(m) {
    const b = S.biz;
    const prefix = b.mail.prefix || 'info';
    m.innerHTML = `<h1>חיבורים</h1>
      <p class="muted">איך החומר והתשובות יוצאים למבקר. כל ערוץ פעיל יוצא <b>במקביל</b>, לא במקום השני.</p>
      <div class="stack" style="margin-top:14px">
        <section class="card"><div class="toggle-row"><div><h2>📧 מייל</h2><p class="muted">לכל מבקר יש מייל ברשימת המארגנים. יוצא מהמערכת, בשם העסק שלך.</p></div>${toggle('ch:email', b.channels.email, 'מייל')}</div>
          ${b.channels.email ? `<div class="label">הכתובת שממנה זה יוצא</div>
          <div class="mail-from ltr"><input class="text-input" data-mail="prefix" value="${esc(b.mail.prefix)}" placeholder="info" autocomplete="off" spellcheck="false"><span>@${MAIL_DOMAIN}</span></div>
          <div class="label">לאן יגיעו תשובות <small>ברירת המחדל: המייל שנרשמת איתו</small></div>
          <input class="text-input ltr" type="email" data-mail="replyTo" value="${esc(b.mail.replyTo)}" placeholder="${esc(S.account.email || 'name@example.com')}">
          <p class="faint" id="mail-prev" style="margin-top:8px">${esc(mailPreview(prefix))}</p>` : ''}</section>
        <section class="card"><div class="toggle-row"><div><h2>💬 SMS</h2><p class="muted">למי שיש לו מכשיר נוסף. לא צריך את המספר שלך.</p></div>${toggle('ch:sms', b.channels.sms, 'SMS')}</div>
          ${b.channels.sms ? `<div class="label">שם השולח <small>עד 11 אותיות באנגלית או ספרות</small></div>
          <input class="text-input ltr" data-smsname value="${esc(b.smsName)}" maxlength="11" placeholder="Hadar" autocomplete="off">` : ''}</section>
        <section class="card"><div class="toggle-row"><div><h2>🟢 וואטסאפ (לא רשמי)</h2><p class="muted">מהמספר שלך, בקצב שלא נחסם. בלי אחריות.</p></div>
          ${b.channels.wa ? '<button class="btn" data-act="disconnect" data-ch="wa">מחובר · לנתק</button>' : '<button class="btn primary" data-act="connect" data-ch="wa">לחבר</button>'}</div></section>
        <section class="card"><div class="toggle-row"><div><h2>✅ וואטסאפ עסקי רשמי</h2><p class="muted">רק אם כבר יש לך חשבון רשמי. מתחברים אליו, לא פותחים חדש.</p></div>
          ${b.channels.waApi ? '<button class="btn" data-act="disconnect" data-ch="waApi">מחובר · לנתק</button>' : '<button class="btn primary" data-act="connect" data-ch="waApi">לחבר</button>'}</div></section>
        <section class="card"><h2>מתי זה יוצא</h2>
          <div class="chips" style="margin-top:8px"><button class="chip" data-sendwhen="now" aria-pressed="${b.sendWhen === 'now'}">מיד, בדוכן</button>
            <button class="chip" data-sendwhen="evening" aria-pressed="${b.sendWhen === 'evening'}">בערב, הכל ביחד</button></div></section>
      </div>
      ${Object.values(b.channels).some(Boolean) ? "" : `<p class="warn-box" style="margin-top:14px">⚠️ אין אף ערוץ פעיל. בלי ערוץ, חומר לא יישלח מהדוכן — רק יסומן "ממתין".</p>`}
      <p class="honest">בדוגמית שום דבר לא נשלח באמת, והחיבורים מדומים.</p>`;
  }
  const mailPreview = (prefix) => `${S.biz.name || 'העסק'} <${prefix}@${MAIL_DOMAIN}>  ·  תשובות אל: ${replyTo() || '—'}`;
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
  // Setup 4 — customization: every option, editable
  // ------------------------------------------------------------------
  function viewCustom(m) {
    m.innerHTML = `<nav class="subtabs" aria-label="התאמה אישית">${SUBS.map(([k, t]) => `<button class="chip" data-sub="${k}" aria-pressed="${S.sub === k}">${t}</button>`).join('')}</nav><div id="subview"></div>`;
    ({ buttons: viewButtons, booth: viewBoothSettings, seasons: viewSeasons, materials: viewMaterials, crm: viewCrmSettings }[S.sub] || viewButtons)($('#subview'));
  }

  // ---- buttons, in groups ----
  function viewButtons(m) {
    const missing = Object.keys(STD).filter((ax) => !groupById(ax));
    m.innerHTML = `<h1>הכפתורים בדוכן</h1>
      <p class="muted">מה שמבדיל אצלך בין פונה לפונה. מאחורי כל כפתור יש צעד אחד או יותר, והמערכת פועלת לפיהם: שולחת, מזכירה, וחוזרת לפני העונה.</p>
      <div class="axes">${S.biz.groups.map(groupCard).join('') || '<div class="empty">עוד אין קבוצות כפתורים.</div>'}</div>
      <section class="card" style="margin-top:14px"><h2>קבוצה חדשה</h2>
        <div class="add-row"><input class="text-input" id="new-group" placeholder="שם הקבוצה — למשל: איך שמע עלינו" autocomplete="off"><button class="btn" data-act="add-group">הוספה</button></div>
        ${missing.length ? `<div class="chips" style="margin-top:10px">${missing.map((ax) => `<button class="chip add" data-addstd="${ax}">+ ${esc(STD[ax].title)}</button>`).join('')}</div>` : ''}</section>
      <div class="label">מי שלא סומן לו כלום</div>
      <button class="prod-row" data-act="edit-def"><span class="pn">ברירת המחדל</span><span class="pnext">${esc(stepsText(stepsOf(null)))}</span></button>`;
  }
  function groupCard(g) {
    return `<section class="card axis"><button class="group-title" data-editgroup="${g.id}"><h2>${esc(g.title)} <small>${esc(g.hint || '')}${g.multi ? ' · אפשר כמה' : ''}</small></h2><span class="faint">עריכה</span></button>
      <div class="prod-list">${groupButtons(g.id).map((x) => `<button class="prod-row" data-editbtn="${x.id}">
        <span class="pn">${esc(x.label)}${x.unsure ? ' <span class="q">?</span>' : ''}${x.weight >= 2 ? ` <span class="wt">${esc(WEIGHT[x.weight])}</span>` : ''}</span>
        <span class="pnext">${esc(stepsText(stepsOf(x)))}</span></button>`).join('')}</div>
      <div class="add-row"><input class="text-input" data-newbtn="${g.id}" placeholder="+ כפתור חדש" autocomplete="off"><button class="btn" data-addbtn="${g.id}">הוספה</button></div></section>`;
  }
  function addButton(gid) {
    const inp = document.querySelector(`[data-newbtn="${gid}"]`);
    const v = inp && inp.value.trim();
    if (!v) return;
    if (groupButtons(gid).some((x) => x.label === v)) return toast('כבר יש');
    const hit = gid === 'what' ? findEntries(v)[0] : null;
    S.biz.buttons.push({ id: 'k' + (S.biz.bseq++), axis: gid, label: v, steps: hit ? [{ type: typeOfNext(hit.next), label: hit.next }] : [], weight: gid === 'what' ? 1 : 0, byHand: true });
    S.biz.removed = S.biz.removed.filter((r) => r !== gid + ':' + v);
    save(); render();
    const again = document.querySelector(`[data-newbtn="${gid}"]`);
    if (again) again.focus();
  }
  function sheetGroup(id) {
    const g = groupById(id);
    if (!g) return;
    sheet(`<h2>${esc(g.title)}</h2>
      <div class="label">שם הקבוצה</div><input id="eg-title" class="text-input" value="${esc(g.title)}" autocomplete="off">
      <div class="label">הסבר קצר <small>רשות</small></div><input id="eg-hint" class="text-input" value="${esc(g.hint || '')}" autocomplete="off">
      <div class="label">כמה אפשר לסמן</div>
      <div class="chips"><button class="chip" data-egmulti="0" aria-pressed="${!g.multi}">רק אחד</button><button class="chip" data-egmulti="1" aria-pressed="${!!g.multi}">כמה</button></div>
      <div class="actions"><button class="btn primary" data-act="save-group" data-id="${id}">שמירה</button>
        <button class="btn ghost danger" data-act="del-group" data-id="${id}">למחוק את הקבוצה</button></div>`);
  }

  /* Editing a button's steps happens on a draft, so stepping into one step and
   * back does not lose the name or the weight typed a moment ago. */
  let D = null;
  function sheetSteps(ctx) {
    if (ctx) {
      const x = ctx.kind === 'btn' ? btnById(ctx.id) : null;
      D = { kind: ctx.kind, id: ctx.id, label: x ? x.label : '', weight: x ? x.weight || 0 : 0, value: x ? x.value || '' : '', steps: (x ? stepsOf(x) : stepsOf(null)).map((s) => Object.assign({}, s)) };
    }
    const isBtn = D.kind === 'btn';
    sheet(`<h2>${isBtn ? esc(D.label) : 'מי שלא סומן לו כלום'}</h2>
      ${isBtn ? `<div class="label">שם הכפתור</div><input id="eb-name" class="text-input" value="${esc(D.label)}" autocomplete="off">` : ''}
      <div class="label">מה עושים אחר כך <small>אפשר כמה צעדים</small></div>
      <div class="step-list">${D.steps.map((s, i) => `<div class="step-line"><button class="prod-row" data-editstep="${i}"><span class="pn">${esc(stepText(s))}</span></button>
        <button class="btn ghost danger" data-delstep="${i}" aria-label="להסיר צעד">✕</button></div>`).join('') || '<div class="faint">אין צעד — מי שיסומן כאן ייכנס לקהל.</div>'}</div>
      <button class="chip add" data-act="add-step" style="margin-top:8px">+ צעד נוסף</button>
      ${isBtn ? `<div class="label">כמה פונה כזה שווה לך <small>מחמם את הליד לבד</small></div>
        <div class="chips">${WEIGHT.map((w, k) => `<button class="chip" data-esweight="${k}" aria-pressed="${D.weight === k}">${esc(w)}</button>`).join('')}</div>
        <label class="label" for="eb-value">שווי עסקה ממוצע ₪ <small>רשות — כך ה-CRM מעריך את שווי הצינור</small></label>
        <input id="eb-value" class="text-input" type="number" min="0" step="100" value="${esc(D.value)}" placeholder="למשל 2500">` : ''}
      <div class="actions"><button class="btn primary" data-act="save-steps">שמירה</button><button class="btn ghost" data-act="steps-cancel">ביטול</button>
        ${isBtn ? `<button class="btn ghost danger far" data-act="del-btn" data-id="${D.id}">להסיר את הכפתור</button>` : ""}</div>`);
    $("#scrim .sheet").dataset.guard = "1";
  }
  const keepDraft = () => {
    if (D && $('#eb-name')) D.label = $('#eb-name').value.trim() || D.label;
    if (D && $('#eb-value')) D.value = $('#eb-value').value === '' ? '' : +$('#eb-value').value;
  };

  /* One editor for a single step: a button's, the default's, or a lead's own. */
  let ES = null;
  function sheetStep(o) {
    ES = { type: o.step.type, days: o.step.days, mat: o.step.mat || '', ctx: o.ctx };
    sheet(`<h2>${esc(o.title)}</h2>
      <div class="label">סוג הצעד <small>לפי זה המערכת פועלת</small></div>
      <div class="step-grid">${Object.entries(STEPS).map(([k, v]) => `<button class="opt" data-steptype="${k}" aria-pressed="${ES.type === k}">${v.icon} ${esc(v.name)}</button>`).join('')}</div>
      <div class="label">איך אתה קורא לזה <small>המילים שלך</small></div>
      <input id="es-label" class="text-input" value="${esc(o.step.label)}" autocomplete="off">
      <div id="es-extra"></div>
      <div class="actions"><button class="btn primary" data-act="save-step">אישור</button><button class="btn ghost" data-act="step-back">חזרה</button></div>`);
    renderStepExtra();
    $("#scrim .sheet").dataset.guard = "1";
  }
  function renderStepExtra() {
    const box = $('#es-extra');
    if (!box) return;
    const mats = S.biz.materials;
    const days = ES.type === 'none' || ES.type === 'season'
      ? `<p class="faint" style="margin-top:10px">${ES.type === 'season' ? 'יחזור אליך ' + S.biz.remindWeeks + ' שבועות לפני העונה שלך.' : 'לא נכנס לרשימת המשימות. נשמר בקהל.'}</p>`
      : `<div class="label">מתי</div><div class="chips">${[0, 1, 2, 3, 5, 7, 14, 30].map((d) =>
        `<button class="chip" data-esdays="${d}" aria-pressed="${ES.days === d}">${d === 0 ? 'מיד' : d === 1 ? 'תוך יום' : d + ' ימים'}</button>`).join('')}</div>
        ${ES.type === 'send' && ES.days === 0 ? '<p class="faint" style="margin-top:6px">יישלח ברגע שנוגעים בכפתור בדוכן. בכרטיס לא יופיע כפתור "שלח חומר".</p>' : ''}`;
    const mat = ES.type !== 'send' ? '' : `<div class="label">מה לשלוח</div>
      <div class="chips">${mats.map((x) => `<button class="chip" data-esmat="${esc(x.name)}" aria-pressed="${ES.mat === x.name}">📎 ${esc(x.name)}</button>`).join('')}
        <button class="chip" data-esmat="" aria-pressed="${!ES.mat}">${mats.length === 1 ? 'החומר היחיד' : 'לבחור בזמן השליחה'}</button></div>
      ${mats.length ? '' : '<p class="faint" style="margin-top:6px">עוד אין חומרים. מוסיפים ב"חומרים ונוסח".</p>'}`;
    box.innerHTML = days + mat;
  }
  const readStep = () => normStep({ type: ES.type, label: ($('#es-label') && $('#es-label').value.trim()) || STEPS[ES.type].label, days: ES.days == null ? STEPS[ES.type].days : ES.days, mat: ES.mat });

  // ---- warmth and the booth ----
  function viewBoothSettings(m) {
    const b = S.biz;
    m.innerHTML = `<h1>החום והדוכן</h1>
      <div class="stack" style="margin-top:14px">
        <section class="card"><h2>איך לקרוא לדרגות</h2><p class="muted">רק השמות משתנים. מה שסומן הכי חם נשאר הכי חם.</p>
          <div class="opts grid2">${Object.entries(GRADES).map(([k, g]) => `<button class="opt" data-grades="${k}" aria-pressed="${b.grades === k}">${esc(g.words.join(' · '))}<small>${esc(g.name)}</small></button>`).join('')}</div></section>
        <section class="card"><div class="toggle-row"><div><h2>המערכת מציעה חום לבד</h2>
          <p class="muted">לפי מה שכבר סימנת: פונה ששווה לך הרבה (●●●), ביקש חומר, חזר לדוכן פעם שנייה. נגיעה אחת משנה, ומה שבחרת ביד נשאר.</p></div>${toggle('derive', b.derive, 'חום מוצע')}</div></section>
        <section class="card"><h2>כמה זמן הכרטיס נשאר פתוח</h2><p class="muted">בלי נגיעה, הכרטיס נסגר לבד וחוזר לחיפוש. מה שסומן — נשמר.</p>
          <div class="chips">${[8, 12, 15, 20, 30].map((s) => `<button class="chip" data-idle="${s}" aria-pressed="${b.idleSec === s}">${s} שניות</button>`).join('')}</div></section>
        <section class="card"><div class="toggle-row"><div><h2>מי שכבר ביקר לא מופיע שוב בחיפוש</h2>
          <p class="muted">העסק שלו, או העסק של אשתו, מופיע כשורה נפרדת. מי שחוזר לדוכן — מסמנים מהשורה "ביקרו כבר", וזה מחמם אותו.</p></div>${toggle('hideVisited', b.hideVisited, 'להסתיר מי שביקר')}</div></section>
      </div>`;
  }

  // ---- seasons, on the Jewish calendar ----
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
          return `<div class="season-row">${toggle('season:' + s.id, b.seasons.includes(s.id), s.name)}
            <button class="link" data-editseason="${s.id}"><b>${esc(s.name)}</b><span class="rng">${esc(rangeText(s))}</span>
              <span class="nx">${n ? (n.now ? 'עכשיו' : 'הבאה: ' + esc(H.label(n.date))) : ''}</span></button></div>`;
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

  // ---- material and the message ----
  function viewMaterials(m) {
    const b = S.biz;
    m.innerHTML = `<h1>חומרים ונוסח</h1>
      <div class="stack" style="margin-top:14px">
        <section class="card"><h2>מה אפשר לשלוח</h2><p class="muted">כל כפתור יכול לשלוח חומר אחר — בוחרים בצעד "לשלוח חומר" של הכפתור.</p>
          <div class="prod-list">${b.materials.map((x, i) => `<div class="prod-row"><span class="pn">📎 ${esc(x.name)}</span><span class="pnext">${esc(x.file)} <button class="btn ghost danger" data-act="del-mat" data-i="${i}">הסרה</button></span></div>`).join('') || '<div class="faint">עוד אין חומר. אפשר גם להוסיף בדוכן, בשליחה הראשונה.</div>'}</div>
          <div class="add-row"><input id="mat-name" class="text-input" placeholder="שם — קטלוג, מחירון, תמונות עבודות" autocomplete="off">
            <label class="btn" for="mat-file">📷 קובץ</label></div><input id="mat-file" type="file" accept="image/*,application/pdf" hidden></section>
        <section class="card"><h2>נוסח ההודעה</h2><p class="muted">{שם} · {עסק} · {חומר} מתמלאים לבד.</p>
          <textarea id="tpl" class="say small">${esc(b.template)}</textarea>
          <p class="faint" id="tpl-prev">${esc(fillTpl('משה כהן', 'קטלוג'))}</p></section>
      </div>`;
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

  // ------------------------------------------------------------------
  // Setup 5 — a practice booth
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
  let lastClosed = null;   // { id, at } — the card that just closed, one tap away for a minute
  let micState = navigator.mediaDevices && window.MediaRecorder ? null : "none";   // "none" once we know there is no microphone
  const IDLE = () => S.biz.idleSec * 1000;
  const leadByKey = (key) => leadsNow().find((l) => l.key === key);

  function viewBooth(m) {
    m.innerHTML = `<input id="q" class="search" type="search" placeholder="שם המשפחה, ועוד אותיות עד שהשם עולה" aria-label="חיפוש מבקר" autocomplete="off" autocapitalize="off">
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
    // The card that just closed stays one tap away for a minute — reopening it records nothing.
    const last = lastClosed && Date.now() - lastClosed.at < 60000 ? leadById(lastClosed.id) : null;
    const lastBar = last ? `<div class="last-bar"><span>האחרון: <b>${esc(People.rowName(last))}</b> · ${esc(People.town(last))}</span><button class="btn" data-reopen="${last.id}">לפתוח</button></div>` : '';
    if (!People.norm(query)) {
      slot.innerHTML = lastBar + '<div class="empty">סיימתם לדבר? שם המשפחה, ועוד אותיות עד שהשם עולה — ונגיעה בשם.<br>כל השאר רשות.</div>';
      return;
    }
    const { hits, skipped, total } = People.search(query, 6, S.biz.hideVisited ? (k) => !!leadByKey(k) : null);
    const rows = hits.map((h) => {
      const been = !S.biz.hideVisited && leadByKey(h.key);
      return `<button class="result" data-pick="${h.key}"><span><span class="nm">${esc(People.rowName(h))}</span>${h.b != null ? '<span class="badge biz">עסק</span>' : ''}<span class="city">${esc(People.town(h))}</span>
        <span class="mt">${esc(People.rowMeta(h))}</span></span>${been ? '<span class="badge">ביקר כבר</span>' : ''}</button>`;
    }).join('');
    // Above the results, with the town and the family line: two men of the same name must not be confused.
    // Opening one records nothing; "came back" is its own button, and only after half an hour.
    const again = skipped.length ? `<div class="again"><div class="label" style="margin:0">ביקרו כבר</div>${skipped.slice(0, 3).map((h) => {
      const l = leadByKey(h.key);
      const can = l && now() - (l.lastAt || l.at) > 30 * 60000;
      return `<div class="again-row"><button class="result small" data-reopen="${l.id}"><span><span class="nm">${esc(People.rowName(h))}</span> <span class="city">${esc(People.town(h))}</span><span class="mt">${esc(People.rowMeta(h))}</span></span><span class="badge">לפתוח</span></button>
        ${can ? `<button class="btn" data-again="${h.key}">↺ חזר שוב</button>` : ''}</div>`;
    }).join('')}</div>` : '';
    const more = total > hits.length ? `<div class="more">ועוד ${total - hits.length} — להוסיף אות משם המשפחה</div>` : '';
    slot.innerHTML = lastBar + again + (rows ? `<div class="results">${rows}</div>` : '<div class="empty">לא נמצא ברשימה.</div>') + more;
  }
  const newLead = (key, r) => ({ id: S.seq++, key, i: r.i, b: r.b, at: now(), lastAt: now(), created: Date.now(), visits: 1, warmth: null, warmBy: null, tags: [],
    eventDate: '', roleOf: '', sent: [], queue: [], pendingMat: false, practice: practice(), log: [], done: [], moved: {}, manual: [], noAnswer: 0, audience: false, notes: [],
    stage: 'new', value: null, owner: S.biz.team ? S.biz.team[0] : 'אני', contact: { phone: '', email: '' }, files: [], ruled: {}, by: worker() ? 'עובד' : 'בעלים' });
  function pick(key) {
    let l = leadByKey(key);
    if (!l) {
      l = newLead(key, People.row(key));
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
    l.visits++; l.lastAt = now();
    log(l, 'חזר לדוכן');
    save();
    toast('↺ ' + People.rowName(l) + ' חזר — סומן');
    openLead(l);
  }
  function openLead(l) {
    if (openId && openId !== l.id) flushSends(leadById(openId));
    openId = l.id;
    lastClosed = null;
    if ($('#q')) $('#q').value = '';
    renderLead();
    updateFoot();
  }
  /** The card closes: what it queued goes out now, and it stays reopenable for a minute. */
  function closeLead() {
    if (!openId) return;
    const l = leadById(openId);
    flushSends(l);
    if (l && !l.capRun && !l.practice) { l.capRun = true; runRules('captured', l); save(); }   // the "lead captured" automations run once, when the card closes
    lastClosed = { id: openId, at: Date.now() };
    openId = null;
    stopIdle();
  }
  /** One lead editor, used at the booth and in a sheet from the dashboard or the CRM. */
  function leadBody(l, inSheet) {
    const w = effWarm(l);
    const auto = l.warmBy !== 'hand' && S.biz.derive && w != null;
    const bs = tagged(l);
    const datey = bs.some((b) => stepsOf(b).some((s) => s.type === 'date'));
    const roley = bs.some((b) => b.axis === 'who' && b.weight >= 2);
    const autoSent = bs.some((b) => stepsOf(b).some(immediate));
    const ts = tasks(l);
    const queued = (l.queue || []).map((q) => q.mat);
    const sendBtn = autoSent
      ? `<span class="sent-note">📎 ${queued.length ? 'יישלח בסגירה: ' + esc(queued.join(', ')) : l.sent.length ? 'נשלח: ' + esc(l.sent.join(', ')) : l.pendingMat ? 'ממתין לחומר' : 'יישלח'}</span>`
      : `<button class="btn" data-act="send" data-lid="${l.id}">${esc(l.sent.length ? '📎 נשלח: ' + l.sent.join(', ') : l.pendingMat ? '📎 ממתין לחומר' : '📎 שלח חומר')}</button>`;
    const last = l.notes[l.notes.length - 1];
    return `
      <div class="lead-head"><div><span class="nm">${esc(People.rowName(l))}</span>${l.b != null ? '<span class="badge biz">עסק</span>' : ''} <span class="muted">${esc(People.town(l))}</span>
        <div class="faint">${esc(People.rowMeta(l))}${l.visits > 1 ? ' · ביקר ' + l.visits + ' פעמים' : ''}${l.demo ? ' · מדומה' : ''}</div></div>
        <div class="head-acts"><button class="btn primary" data-act="close-lead">✓ סיום</button></div></div>
      <div class="warmth">${words().map((t, k) => `<button class="warm-btn w${k}${auto && w === k ? ' auto' : ''}" data-warm="${k}" data-lid="${l.id}" aria-pressed="${w === k}">${esc(t)}</button>`).join('')}</div>
      ${auto ? '<div class="hint">הוצע לפי מה שסימנת. נגיעה משנה.</div>' : ''}
      ${liveGroups().map((g) => `<div class="label">${esc(g.title)} <small>רשות</small></div>
        <div class="chips">${groupButtons(g.id).map((b) => `<button class="chip" data-tag="${b.id}" data-lid="${l.id}" aria-pressed="${l.tags.includes(b.id)}">${esc(b.label)}</button>`).join('')}</div>`).join('')}
      ${datey ? `<div class="label">מתי השמחה? <small>רשות</small></div><input type="date" class="text-input" data-eventdate="${l.id}" value="${esc(l.eventDate)}">` : ''}
      ${roley ? `<div class="label">של מי? <small>רשות — המוסד, בית הכנסת או הקבוצה</small></div><input class="text-input" data-roleof="${l.id}" value="${esc(l.roleOf)}" placeholder="למשל: קבוצת שערי חסד" autocomplete="off">` : ''}
      <button class="next-line" data-act="tasks" data-lid="${l.id}"><span class="faint">הלאה:</span> ${planHTML(plan(l))}${ts.length > 1 ? ` <span class="faint">· ועוד ${ts.length - 1}</span>` : ''}</button>
      ${last ? `<div class="note-peek">📝 ${last.audio ? '🎙️ ' : ''}${esc((last.text || last.tr || 'הקלטה').slice(0, 80))}${l.notes.length > 1 ? ` <span class="faint">(${l.notes.length} הערות)</span>` : ''}</div>` : ''}
      <div class="actions">${sendBtn}
        <button class="btn" data-act="note" data-lid="${l.id}">📝 הערה</button>
        <button class="btn" data-act="note-rec" data-lid="${l.id}" ${micState === 'none' ? 'disabled title="אין מיקרופון במכשיר הזה"' : ''}>🎙️ ${micState === 'none' ? 'אין מיקרופון' : 'הקלטה'}</button>
        ${!inSheet && Date.now() - l.created < 6000 && l.visits === 1
          ? `<button class="btn ghost danger far" data-act="undo-lead" data-lid="${l.id}">לא לשמור</button>`
          : `<button class="btn ghost danger far" data-act="del-lead" data-lid="${l.id}">מחיקה</button>`}</div>`;
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
    if (sh && +sh.dataset.lead === l.id && sh.dataset.tags) return sheetTags(l);
    if (sh && +sh.dataset.lead === l.id && !sh.dataset.tasks && !sh.dataset.note && !sh.dataset.guard) { sh.innerHTML = leadBody(l, true); return; }
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
      closeLead();
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
  // One message goes out on one channel: WhatsApp first, then mail, then SMS — never the same text three times.
  const CH_ORDER = ['wa', 'waApi', 'email', 'sms'];
  const bestChannel = (keys) => { const k = CH_ORDER.find((c) => S.biz.channels[c] && (!keys || keys.includes(c))); return k ? CHANNELS.find((c) => c.k === k).name : ''; };
  let byRule = false;   // set while an automation acts: what it sends is logged as the system's, not the owner's
  function doSend(l, name) {
    if (l.sent.includes(name)) return;
    const ch = bestChannel();
    if (!ch) { l.pendingMat = true; if (!byRule) toast('אין ערוץ שליחה פעיל. מפעילים ב"חיבורים".'); return; }
    l.sent.push(name); l.pendingMat = false;
    log(l, `${byRule ? '⚙️ ' : ''}📎 ${name} — ${S.biz.sendWhen === 'now' ? 'נשלח' : 'יישלח בערב'} ב${ch}${byRule ? ' (אוטומטי)' : ''}`);
    if (!byRule) toast(`📎 ${name} ${S.biz.sendWhen === 'now' ? 'נשלח' : 'יישלח בערב'} ל${People.rowName(l)} · ${ch}`);
  }
  /* A button whose step is "send at once" queues its own material, and the queue goes
   * out when the card closes. Until then, untapping the button takes it back — a
   * message that has left cannot be. */
  function autoSend(l, b) {
    stepsOf(b).filter(immediate).forEach((s) => {
      const mats = S.biz.materials;
      const name = s.mat && mats.some((x) => x.name === s.mat) ? s.mat : mats.length === 1 ? mats[0].name : '';
      if (name) { if (!l.sent.includes(name)) l.queue = (l.queue || []).filter((q) => q.mat !== name).concat({ btn: b.id, mat: name }); }
      else if (!l.pendingMat) { l.pendingMat = true; log(l, '📎 ממתין לחומר'); toast('📎 ' + (mats.length ? 'יש כמה חומרים — לבחור בצעד של הכפתור' : 'עוד אין חומר — סומן "ממתין לחומר"')); }
    });
  }
  const unqueue = (l, b) => { l.queue = (l.queue || []).filter((q) => q.btn !== b.id); };
  function flushSends(l) {
    if (!l || !(l.queue || []).length) return;
    const q = l.queue;
    l.queue = [];
    q.forEach((x) => doSend(l, x.mat));
    save();
  }
  window.addEventListener('pagehide', () => { if (openId) flushSends(leadById(openId)); });
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

  // ---- notes, typed or spoken ----
  let rec = null;   // { mr, chunks, blob, sr, tr, lid }
  function sheetNote(l, startNow) {
    sheet(`<h2>הערה על ${esc(People.rowName(l))}</h2>
      <textarea id="note-text" class="say small" placeholder="מה חשוב לזכור עליו"></textarea>
      <div class="actions">${micState === 'none'
        ? '<span class="faint">אין מיקרופון במכשיר הזה — אפשר רק לכתוב.</span>'
        : `<button class="btn" data-act="rec" data-lid="${l.id}" id="rec-btn">🎙️ להקליט</button><span class="faint" id="rec-state"></span>`}</div>
      <div class="tr-box" id="tr-box" hidden></div>
      <div class="actions"><button class="btn primary" data-act="note-save" data-lid="${l.id}">שמירה</button><button class="btn ghost" data-act="note-cancel">ביטול</button></div>
      ${notesList(l)}`, l.id);
    $('#scrim .sheet').dataset.note = '1';
    if (startNow) startRec(l); else if (FINE) setTimeout(() => $('#note-text') && $('#note-text').focus(), 30);
  }
  const notesList = (l) => (l.notes.length ? `<div class="label">הערות קודמות</div><ul class="log">${l.notes.slice().reverse().map((n) =>
    `<li><span class="when">${esc(H.heDate(new Date(n.at)))} ${new Date(n.at).toTimeString().slice(0, 5)}</span>${n.audio ? `<button class="btn ghost" data-play="${n.id}">▶ השמעה</button> ` : ''}${esc(n.text || '')}${n.tr ? `<div class="faint">תמלול: ${esc(n.tr)}</div>` : ''}</li>`).join('')}</ul>` : '');
  async function startRec(l) {
    const noMic = () => {
      micState = 'none';
      const btn = $('#rec-btn');
      if (btn) btn.outerHTML = '<span class="faint">אין גישה למיקרופון כאן — אפשר רק לכתוב. בטאבלט, בדפדפן רגיל, זה עובד.</span>';
      if ($('#rec-state')) $('#rec-state').textContent = '';
      if ($('#note-text')) $('#note-text').focus();
    };
    if (!navigator.mediaDevices || !window.MediaRecorder) return noMic();
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return noMic(); }
    const mr = new MediaRecorder(stream);
    rec = { mr, chunks: [], blob: null, sr: null, tr: '', lid: l.id };
    mr.ondataavailable = (e) => { if (e.data.size) rec.chunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (!rec) return;
      rec.blob = new Blob(rec.chunks, { type: mr.mimeType || 'audio/webm' });
      if ($('#rec-state')) $('#rec-state').textContent = '✓ הוקלט' + (rec.tr ? ' ותומלל' : '') + '. שומרים?';
    };
    mr.start();
    // Transcription by the browser's own speech service, where it exists. A demo
    // stand-in: production would transcribe on our own server.
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      try {
        const sr = new SR();
        sr.lang = 'he-IL'; sr.continuous = true; sr.interimResults = true;
        sr.onresult = (e) => {
          let fin = ''; let part = '';
          for (let i = 0; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript + ' ') : (part += e.results[i][0].transcript));
          rec.tr = fin.trim();
          const box = $('#tr-box');
          if (box) { box.hidden = false; box.textContent = 'תמלול: ' + (fin + part).trim(); }
        };
        sr.start();
        rec.sr = sr;
      } catch (e) { /* no transcription — the recording still stands */ }
    }
    const btn = $('#rec-btn');
    if (btn) { btn.textContent = '⏹ לעצור'; btn.dataset.act = 'rec-stop'; }
    if ($('#rec-state')) $('#rec-state').textContent = '● מקליט…';
  }
  function stopRec() {
    if (!rec) return;
    if (rec.sr) try { rec.sr.stop(); } catch (e) { /* already stopped */ }
    if (rec.mr.state !== 'inactive') rec.mr.stop();
    const btn = $('#rec-btn');
    if (btn) { btn.textContent = '🎙️ להקליט שוב'; btn.dataset.act = 'rec'; }
  }
  function saveNote(l) {
    const text = ($('#note-text') && $('#note-text').value.trim()) || '';
    if (rec && rec.mr.state !== 'inactive') { stopRec(); return setTimeout(() => saveNote(l), 300); }
    const blob = rec && rec.lid === l.id ? rec.blob : null;
    if (!text && !blob) return toast('אין מה לשמור');
    const n = { id: 'n' + (S.nseq++), at: now(), text, audio: !!blob, tr: blob ? rec.tr : '' };
    l.notes.push(n);
    log(l, '📝 ' + (blob ? 'הקלטה' + (text ? ' + ' : '') : '') + (text || '').slice(0, 40));
    if (blob) AudioDB.put(n.id, blob).catch(() => toast('ההקלטה לא נשמרה במכשיר הזה'));
    rec = null;
    save(); closeSheet(); refreshLead(l);
    toast('📝 נשמר');
  }
  async function playNote(id) {
    try {
      const blob = await AudioDB.get(id);
      if (!blob) return toast('ההקלטה לא נמצאת במכשיר הזה');
      const a = new Audio(URL.createObjectURL(blob));
      a.play();
    } catch (e) { toast('לא הצלחתי להשמיע'); }
  }

  // ---- the lead's steps ----
  let tasksRet = null;
  function sheetTasks(l, ret, title) {
    tasksRet = ret || null;
    const ts = tasks(l);
    sheet(`<h2>${esc(title || 'מה הלאה עם ' + People.rowName(l) + '?')}</h2>
      ${ts.length ? `<div class="step-list">${ts.map((t, i) => `<div class="task-line${i === 0 ? ' first' : ''}"><span>${planHTML(t)}</span>
        <span class="task-acts">${t.type === 'send' ? `<button class="btn" data-tasksend="${esc(t.key)}" data-lid="${l.id}">📎 לשלוח</button>` : ''}
          <button class="btn" data-taskdone="${esc(t.key)}" data-lid="${l.id}">✓ בוצע</button>
          <button class="btn ghost" data-taskedit="${esc(t.key)}" data-lid="${l.id}">שינוי</button></span></div>`).join('')}</div>`
        : '<p class="muted">אין צעדים פתוחים. הוא ב' + (l.won ? 'לקוחות' : 'קהל') + '.</p>'}
      <div class="actions"><button class="btn" data-act="task-add" data-lid="${l.id}">+ צעד נוסף</button>
        ${ts.length ? `<button class="btn ghost" data-act="task-audience" data-lid="${l.id}">בלי צעדים — לקהל</button>` : ''}
        <button class="btn primary" data-act="tasks-close" data-lid="${l.id}">סיום</button></div>`, l.id);
    $('#scrim .sheet').dataset.tasks = '1';
  }
  /** After a step is done, changed or added: back to the lead's page if that is where it started, else the steps sheet. */
  function afterTask(l) {
    if (tasksRet === 'page' || (!$('#scrim') && S.view === 'crm' && S.crmLead === l.id)) { tasksRet = null; closeSheet(false); return render(); }
    sheetTasks(l, tasksRet);
  }
  function backFromTasks(l) {
    closeSheet(false);
    if (tasksRet === 'crm') return sheetCRM(l);
    if ($('#slot') && openId === l.id) { renderLead(); return startIdle(); }
    render();
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
      const hand = Math.random() < 0.4;
      const l = Object.assign(newLead(key, People.row(key)), { at: now() - rnd(8 * 3600000), created: 0, visits: Math.random() < 0.08 ? 2 : 1,
        warmth: hand ? rnd(3) : null, warmBy: hand ? 'hand' : null, pendingMat: Math.random() < 0.1, demo: true });
      liveGroups().forEach((g) => { if (Math.random() < 0.55) { const bs = groupButtons(g.id); l.tags.push(bs[rnd(bs.length)].id); } });
      if (tagged(l).some((b) => b.axis === 'who' && b.weight >= 2) && Math.random() < 0.7) l.roleOf = groups[rnd(groups.length)];
      if (Math.random() < 0.15) l.notes.push({ id: 'n' + (S.nseq++), at: l.at, text: ['ביקש לחזור אחרי החגים', 'מתעניין בכמות גדולה', 'מכיר אותנו מהשכונה'][rnd(3)], audio: false, tr: '' });
      log(l, 'ביקר בדוכן');
      S.leads.push(l);
    }
    save();
  }
  function dashAsks(L) {
    const out = [];
    const isEmpty = (l) => effWarm(l) == null && !l.tags.length;
    // A row filled in stays where it is until the screen is left: the next row must not slide under the finger.
    const rows = L.filter((l) => isEmpty(l) || filled.has(l.id));
    const left = rows.filter(isEmpty).length;
    if (rows.length) out.push({ fill: true, q: left ? `${left} בלי שום סימון. להשלים עכשיו, כל עוד זוכרים? בערך דקה.` : '✓ הכל מסומן.', leads: rows });
    const waiting = L.filter((l) => l.pendingMat);
    if (waiting.length) out.push({ mat: true, q: `${waiting.length} מחכים לחומר${S.biz.materials.length ? '' : ', ועוד אין חומר'}.` });
    return out;
  }
  /** "מחר בבוקר" when the next tasks are tomorrow; after a Thursday they are on Sunday, and the title says so. */
  function nextDayTitle(L) {
    const l = openTasks(L)[0];
    const t = l && plan(l);
    if (!t || !t.due || dayNo(t.due.getTime()) - dayNo(now()) <= 1) return 'מחר בבוקר';
    return 'הבא בתור: ' + H.label(t.due);
  }
  function viewDash(m) {
    const L = leadsNow();
    const demo = L.filter((l) => l.demo).length;
    const ws = [0, 1, 2, null].map((k) => L.filter((l) => effWarm(l) === k).length);
    const asks = dashAsks(L);
    m.innerHTML = `<h1>היום בדוכן: ${L.length - demo} אנשים${demo ? ` <span class="faint">(ועוד ${demo} מדומים)</span>` : ''}</h1>
      ${L.length < 8 ? `<div class="ask-card" style="margin-top:12px"><div class="q">כדי לראות איך נראה יום אמיתי, אפשר להוסיף 20 מבקרים מדומים.</div>
        <div class="actions"><button class="btn" data-act="seed">להוסיף מבקרים מדומים</button></div></div>` : ''}
      <div class="stats">${words().map((t, k) => `<div class="stat static"><span class="n">${ws[k]}</span><span class="t">${esc(t)}</span></div>`).join('')}
        <div class="stat static"><span class="n">${ws[3]}</span><span class="t">בלי חום</span></div></div>
      <h2 style="margin-top:22px">מה כדאי להשלים</h2>
      <div class="ask" style="margin-top:10px">${asks.map(dashCard).join('') || '<div class="empty">הכל מסומן.</div>'}</div>
      ${insightsBox('dash', 'מה רואים בתיוג של היום')}
      <h2 style="margin-top:26px">${nextDayTitle(L)}</h2>
      ${crmRows(openTasks(L).slice(0, 5)) || '<div class="empty">אין משימות.</div>'}
      <div class="actions"><button class="btn" data-view="crm">לרשימה המלאה במעקב ←</button></div>`;
  }
  let fillOpen = false;
  const filled = new Set();   // rows filled in on this visit to the dashboard — they keep their place
  function dashCard(a) {
    let body = '';
    if (a.fill) body = fillOpen ? fillList(a.leads) : '<div class="actions"><button class="btn primary" data-act="fill-open">להשלים</button></div>';
    else if (a.mat) body = `<div class="actions"><button class="btn primary" data-act="mat-evening">${S.biz.materials.length ? 'לשלוח להם' : 'להוסיף חומר'}</button></div>`;
    return `<div class="ask-card"><div class="q">${esc(a.q)}</div>${body}</div>`;
  }
  function fillList(leads) {
    if (!leads.length) return '<div class="faint" style="margin-top:6px">✓ הכל מסומן.</div>';
    const g = liveGroups()[0];
    return `<div style="margin-top:8px">${leads.map((l) => {
      const w = effWarm(l);
      const note = l.notes[0] && (l.notes[0].text || l.notes[0].tr);
      const memo = [new Date(l.at).toTimeString().slice(0, 5), People.rowMeta(l), note ? '📝 ' + note.slice(0, 40) : ''].filter(Boolean).join(' · ');
      return `<div class="tag-row${filled.has(l.id) ? ' filled' : ''}"><button class="link" data-openlead="${l.id}">${filled.has(l.id) ? '✓ ' : ''}<b>${esc(People.rowName(l))}</b> <span class="muted">${esc(People.town(l))}</span>${l.demo ? ' <span class="faint">· מדומה</span>' : ''}<span class="memo">${esc(memo)}</span></button>
        <span class="mini-w">${words().map((t, k) => `<button class="warm-btn w${k}" data-warm="${k}" data-lid="${l.id}" aria-pressed="${w === k}">${esc(t)}</button>`).join('')}</span>
        ${g ? `<span class="chips mini-tags">${groupButtons(g.id).map((x) => `<button class="chip" data-tag="${x.id}" data-lid="${l.id}" aria-pressed="${l.tags.includes(x.id)}">${esc(x.label)}</button>`).join('')}</span>` : ''}</div>`;
    }).join('')}</div>
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
      const late = L.filter((l) => { const p = plan(l); return p.due && dayNo(p.due.getTime()) < t0; });
      if (late.length) out.push({ text: `${late.length} באיחור. להעביר את כולם למחר?`, leadIds: late.map((l) => l.id), action: { kind: 'shift' } });
      const held = L.filter((l) => plan(l).type === 'season');
      if (held.length) { const p = plan(held[0]); out.push({ text: `${held.length} שמורים ל${p.season || 'עונה'}. יחזרו אליך ב${H.label(p.due)}.`, leadIds: held.map((l) => l.id), action: null }); }
      const twice = L.filter((l) => l.noAnswer >= 2 && !l.sent.length && tasks(l).length);
      if (twice.length) out.push({ text: `${twice.length} לא ענו פעמיים. לשלוח להם חומר במקום עוד שיחה?`, leadIds: twice.map((l) => l.id), action: { kind: 'step', type: 'send' } });
      const groups = {};   // one institution, several people: one approach for all of them
      L.forEach((l) => { if (l.roleOf && tasks(l).length) (groups[l.roleOf] = groups[l.roleOf] || []).push(l); });
      Object.keys(groups).filter((g) => groups[g].length >= 2).forEach((g) => out.push({ text: `${groups[g].length} אנשים מ${g}. כדאי לדבר איתם כאחד.`, leadIds: groups[g].map((l) => l.id), action: null }));
    }
    return out;
  }
  function insightsBox(scope, title) {
    const fixed = fixedInsights(scope);
    const got = S.ai[scope];
    if (!fixed.length && !got && !ai) return '';   // nothing to show and no one to ask: no empty box
    const card = (x, i, src) => `<div class="insight ${src}"><div class="q">${esc(x.text)}</div>
      ${x.leadIds && x.leadIds.length ? `<div class="faint">${x.leadIds.map(leadById).filter(Boolean).slice(0, 6).map((l) => `<button class="link" data-openlead="${l.id}">${esc(People.rowName(l))}</button>`).join(' · ')}${x.leadIds.length > 6 ? ' ועוד ' + (x.leadIds.length - 6) : ''}</div>` : ''}
      ${x.action ? (x.done ? '<div class="faint">✓ בוצע</div>' : `<div class="actions"><button class="btn primary" data-insight="${src}:${i}" data-scope="${scope}">${esc(actionText(x.action))}</button></div>`) : ''}</div>`;
    return `<h2 style="margin-top:26px">✨ ${esc(title)}</h2>
      <div class="ask" style="margin-top:10px">${fixed.map((x, i) => card(x, i, 'fixed')).join('')}
        ${got ? got.items.map((x, i) => card(x, i, 'ai')).join('') || '<div class="faint">לא נמצא משהו מיוחד.</div>' : ''}
        ${ai ? `<div class="actions"><button class="btn" data-act="ai-insights" data-scope="${scope}" id="ins-${scope}">${got ? 'לבדוק שוב' : 'לבקש מהבינה המלאכותית לעבור על הכל'}</button></div>`
          : '<p class="honest">כאן רק התובנות הקבועות. כשהבינה המלאכותית מחוברת — גם היא עוברת על הלידים.</p>'}
        ${!fixed.length && !got && !ai ? '<div class="faint">אין כרגע.</div>' : ''}</div>`;
  }
  const actionText = (a) => (a.kind === 'shift' ? 'להעביר למחר' : a.kind === 'warm' ? 'לסמן ' + words()[a.value] : 'להוסיף צעד: ' + STEPS[a.type].name);
  function applyInsight(scope, ref) {
    const [src, i] = ref.split(':');
    const x = src === 'fixed' ? fixedInsights(scope)[+i] : S.ai[scope] && S.ai[scope].items[+i];
    if (!x || !x.action) return;
    const tomorrow = H.addDays(new Date(now()), 1).getTime();
    x.leadIds.map(leadById).filter(Boolean).forEach((l) => {
      const a = x.action;
      if (a.kind === 'warm') { l.warmth = a.value; l.warmBy = 'hand'; }
      else if (a.kind === 'shift') tasks(l).filter((t) => dayNo(t.due.getTime()) < dayNo(now())).forEach((t) => { l.moved[t.key] = tomorrow; });
      else if (a.type === 'none') l.audience = true;
      else { const s = normStep({ type: a.type }); addManual(l, s, dueFor(s)); }
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
      dueInDays: p.due ? dayNo(p.due.getTime()) - dayNo(now()) : null, openSteps: tasks(l).length, noAnswer: l.noAnswer || 0,
      notes: l.notes.map((n) => n.text || n.tr).filter(Boolean).slice(-2), won: !!l.won, lost: !!l.lost };
  }
  async function aiInsights(scope) {
    const L = leadsNow().slice(-80).map(leadFacts);
    const btn = $('#ins-' + scope);
    if (btn) { btn.disabled = true; btn.textContent = 'עובר על הלידים…'; }
    const focus = scope === 'dash'
      ? 'Look only at TODAY\'S TAGGING at the booth: visitors left without tags, tags that suggest a different warmth or next step, several people from the same institution, group or family, repeat visits, notes that say more than the tags. Do not talk about calls or sales follow-up.'
      : 'Look at the SALES FOLLOW-UP: who to call first and why, overdue or neglected leads, institutions and groups worth one approach, what is held for a season, leads that should get another step. Do not talk about tagging at the booth.';
    const prompt = `You assist an exhibitor (${S.biz.trade || 'a business'}) at a Hasidic community business fair in Israel.
His goal at the fair: ${S.biz.goalNote || S.biz.goal || 'not given'}.
His buttons: ${S.biz.buttons.map((b) => b.label + ' → ' + stepsOf(b).map((s) => STEPS[s.type].name).join(' + ')).join('; ')}.
His leads (JSON): ${JSON.stringify(L)}
${focus}
Give at most 4 short, concrete observations in Hebrew, each about specific leads, judged against his goal. Skip anything obvious or already handled.
Reply with ONLY JSON: {"insights":[{"text":"one Hebrew sentence","leadIds":[ids],"action":null | {"kind":"warm","value":0|1|2} | {"kind":"step","type":"call|send|quote|meet|date|register|regular|season|none"}}]}
warm value: 0 = ${words()[0]}, 1 = ${words()[1]}, 2 = ${words()[2]}. A step action ADDS that step to those leads.`;
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
  // CRM — the part a business owner opens every day after the fair.
  //   סקירה    numbers, the 14 days, the morning message
  //   משימות   who to talk to today
  //   צינור    stages, dragged across
  //   טבלה     every column, filters, saved views, bulk actions, Excel
  //   פילוח    any dimension against any measure
  //   אוטומציות rules the owner writes: when X, do Y
  //   הודעות   templates, and sending to a group
  // ------------------------------------------------------------------
  const DEF_STAGES = [
    { id: 'new', name: 'ליד חדש' }, { id: 'contact', name: 'בקשר' }, { id: 'quote', name: 'הצעה נשלחה' },
    { id: 'nego', name: 'במשא ומתן' }, { id: 'won', name: 'נסגר', kind: 'won' }, { id: 'lost', name: 'לא רלוונטי', kind: 'lost' },
  ];
  const DEF_TEMPLATES = [
    { id: 't1', name: 'תודה על הביקור', ch: 'any', text: 'שלום {שם}, תודה שעברת בדוכן של {עסק} בתערוכה. נשמח לעמוד לשירותך.' },
    { id: 't2', name: 'כמו שדיברנו', ch: 'any', text: 'שלום {שם}, כמו שדיברנו — מצורף {חומר}. לכל שאלה אני כאן.' },
    { id: 't3', name: 'תזכורת לפגישה', ch: 'wa', text: 'שלום {שם}, מזכיר את הפגישה שקבענו. מחכים לך!' },
    { id: 't4', name: 'לפני העונה', ch: 'any', text: 'שלום {שם}, העונה מתקרבת — זה הזמן להזמין. נשמח לשמוע ממך.' },
  ];
  // Rules that send something to the visitor start switched off: the owner turns them on knowingly.
  const DEF_RULES = [
    { id: 'r1', on: false, trigger: 'noanswer', arg: 2, cond: {}, action: { kind: 'send', mat: '' }, fired: 0 },
    { id: 'r2', on: true, trigger: 'captured', arg: null, cond: { warm: 0 }, action: { kind: 'step', type: 'meet', days: 1 }, fired: 0 },
    { id: 'r3', on: true, trigger: 'idle', arg: 7, cond: {}, action: { kind: 'step', type: 'call', days: 1 }, fired: 0 },
    { id: 'r4', on: false, trigger: 'won', arg: null, cond: {}, action: { kind: 'message', tpl: 't1' }, fired: 0 },
  ];
  const clone = (x) => JSON.parse(JSON.stringify(x));
  /** Older saved states lack the CRM's fields; fill them in rather than throw the data away. */
  function upgrade() {
    const b = S.biz;
    if (!b.stages) b.stages = clone(DEF_STAGES);
    if (!b.team) b.team = ['אני'];
    if (!b.templates) b.templates = clone(DEF_TEMPLATES);
    if (!b.rules) b.rules = clone(DEF_RULES);
    if (!b.digest) b.digest = { on: true, ch: 'wa', hour: '08:00' };
    if (!b.digestNotes) b.digestNotes = [];
    if (!b.views) b.views = [];
    if (!b.rulesV2) {   // after the reviews: sending rules off unless the owner turns them on, and one ready view
      b.rulesV2 = true;
      b.rules.forEach((r) => { if ((r.action.kind === 'send' || r.action.kind === 'message') && !r.fired) r.on = false; });
      if (!b.views.some((v) => v.builtin)) b.views.unshift({ name: 'חמים בלי מענה', builtin: true, tb: { f: { warm: '0', answer: 'none' }, sort: { col: 'at', dir: 1 }, cols: ['name', 'town', 'stage', 'last', 'next', 'due', 'phone'] } });
    }
    if (!S.crmTab) S.crmTab = 'overview';
    if (!S.tb) S.tb = { f: {}, sort: { col: 'due', dir: 1 }, cols: ['name', 'town', 'stage', 'warm', 'value', 'last', 'next', 'due', 'owner'] };
    if (!S.tb.v2) { S.tb.v2 = true; if (!S.tb.cols.includes('last')) S.tb.cols.splice(Math.max(0, S.tb.cols.indexOf('next')), 0, 'last'); }
    if (S.mine === undefined) S.mine = true;
    S.leads.forEach(upgradeLead);
  }
  function upgradeLead(l) {
    if (!l.stage) l.stage = l.won ? 'won' : l.lost ? 'lost' : 'new';
    if (l.value === undefined) l.value = null;
    if (!l.owner) l.owner = S.biz.team[0];
    if (!l.contact) l.contact = { phone: '', email: '' };
    if (!l.files) l.files = [];
    if (!l.ruled) l.ruled = {};
    if (!l.ruleHits) l.ruleHits = {};
    if (!l.queue) l.queue = [];
    if (!l.by) l.by = 'בעלים';
  }
  const stageById = (id) => S.biz.stages.find((s) => s.id === id) || S.biz.stages[0];
  const stageOf = (kind) => S.biz.stages.find((s) => s.kind === kind);
  const nis = (v) => (Math.round(v || 0)).toLocaleString('he-IL') + ' ₪';
  const dateShort = (t) => { if (!t) return '—'; const d = new Date(t); return d.getDate() + '/' + (d.getMonth() + 1); };
  /** What the lead is worth: typed in, or the average the owner set on the most valuable button tapped. Never guessed. */
  const estValue = (l) => Math.max(0, ...tagged(l).map((b) => +b.value || 0));
  const typedValue = (l) => l.value != null && l.value !== '';
  const leadValue = (l) => (typedValue(l) ? +l.value : estValue(l));
  const isOpenLead = (l) => !l.won && !l.lost;
  const many = (n, one, few) => (n === 1 ? one : n + ' ' + few);   // "פעם אחת" / "3 פעמים"

  /* Contact, counted honestly. A person reached the visitor when the owner spoke with
   * him, or sent him something by hand. A "no answer" is an attempt, not contact, and
   * what an automation sent is the system's doing — neither may make a lead look handled. */
  const isAuto = (t) => /^⚙️/.test(t);
  const isTalk = (t) => /^📞 דיברנו/.test(t);
  const isNoAnswer = (t) => /^📞 לא ענה/.test(t);
  const isHumanSend = (t) => /^(💬|📎)/.test(t) && !/ממתין/.test(t);
  const touched = (l) => l.log.filter((e) => isTalk(e.t) || isHumanSend(e.t));
  const tries = (l) => l.log.filter((e) => isNoAnswer(e.t));
  /** none · tried (no answer yet) · sent (material or a message, not spoken) · talked */
  function answerState(l) {
    if (l.log.some((e) => isTalk(e.t))) return 'talked';
    if (l.log.some((e) => isHumanSend(e.t))) return 'sent';
    if (tries(l).length) return 'tried';
    return 'none';
  }
  const ANSWER = { none: 'עוד לא', tried: 'ניסינו ולא ענה', sent: 'קיבל חומר או הודעה', talked: 'דיברנו' };
  const reached = (l) => ['sent', 'talked'].includes(answerState(l));

  function setStage(l, id, why) {
    if (l.stage === id) return;
    const st = stageById(id);
    l.stage = st.id;
    const wasWon = l.won;
    l.won = st.kind === 'won';
    l.lost = st.kind === 'lost';
    log(l, '➜ ' + st.name + (why ? ' · ' + why : ''));
    if (l.won && !wasWon) {
      tasks(l).forEach((t) => l.done.push(t.key));
      const regular = tagged(l).some((b) => stepsOf(b).some((s) => s.type === 'regular')) || S.biz.buttons.some((b) => stepsOf(b).some((s) => s.type === 'regular'));
      if (regular) addManual(l, { type: 'regular', label: 'לבדוק אם צריך עוד', days: 28 }, H.addDays(new Date(now()), 28).getTime());
      runRules('won', l);
    }
    runRules('stage', l, st.id);
  }

  // ---- automations ----
  const TRIGGERS = { captured: 'ליד נקלט בדוכן', noanswer: 'לא ענה', idle: 'עוברים ימים בלי מגע', stage: 'ליד עובר לשלב', won: 'נסגרה עסקה' };
  const ACTIONS = { step: 'להוסיף צעד', send: 'לשלוח חומר', message: 'לשלוח הודעה', stage: 'להעביר לשלב', warm: 'לסמן חום', notify: 'להוסיף להודעת הבוקר' };
  const sendsOut = (r) => r.action.kind === 'send' || r.action.kind === 'message';
  const tplById = (id) => S.biz.templates.find((t) => t.id === id);
  function ruleText(r) {
    const a = r.action;
    const when = r.trigger === 'noanswer' ? `לא ענה ${many(r.arg, 'פעם אחת', 'פעמים')}` : r.trigger === 'idle' ? `עוברים ${r.arg} ימים בלי מגע` : r.trigger === 'stage' ? `ליד עובר ל"${stageById(r.arg).name}"` : r.trigger === 'captured' ? 'ליד נקלט בדוכן' : 'נסגרה עסקה';
    const c = r.cond || {};
    const conds = [c.warm != null ? words()[c.warm] : '', c.btn && btnById(c.btn) ? 'סימן "' + btnById(c.btn).label + '"' : '', c.biz === true ? 'עסק' : c.biz === false ? 'פרטי' : '', c.minValue ? 'שווה ' + nis(c.minValue) + '+' : ''].filter(Boolean);
    const days = (n) => (n <= 0 ? 'היום' : n === 1 ? 'תוך יום' : `תוך ${n} ימים`);
    const then = a.kind === 'step' ? `${STEPS[a.type].name} ${days(a.days || 1)}` : a.kind === 'send' ? 'לשלוח ' + (a.mat || 'את החומר') : a.kind === 'message' ? 'לשלוח "' + ((tplById(a.tpl) || {}).name || 'הודעה') + '"' : a.kind === 'stage' ? 'להעביר ל"' + stageById(a.stage).name + '"' : a.kind === 'warm' ? 'לסמן ' + words()[a.value || 0] : 'להוסיף להודעת הבוקר';
    return { when: 'כש' + when + (conds.length ? ' · רק אם: ' + conds.join(', ') : ''), then };
  }
  function condOk(r, l) {
    const c = r.cond || {};
    if (c.warm != null && effWarm(l) !== c.warm) return false;
    if (c.btn && !l.tags.includes(c.btn)) return false;
    if (c.biz != null && (l.b != null) !== c.biz) return false;
    if (c.minValue && leadValue(l) < c.minValue) return false;
    return true;
  }
  const matching = (trigger, l, arg) => (S.biz.rules || []).filter((r) => r.on && r.trigger === trigger && (r.trigger !== 'noanswer' && r.trigger !== 'stage' || r.arg === arg) && condOk(r, l));
  let ruleDepth = 0;
  let holdSends = false;   // "move it, but don't send this time"
  function runRules(trigger, l, arg) {
    if (ruleDepth > 1 || !S.biz.rules) return;   // a rule may set off one more, never a chain
    ruleDepth++;
    matching(trigger, l, arg).forEach((r) => applyRule(r, l));
    ruleDepth--;
  }
  function applyRule(r, l) {
    const a = r.action;
    if (holdSends && sendsOut(r)) return;
    r.fired = (r.fired || 0) + 1;
    l.ruleHits = l.ruleHits || {};
    l.ruleHits[r.id] = (l.ruleHits[r.id] || 0) + 1;
    byRule = true;
    if (!sendsOut(r)) log(l, '⚙️ אוטומציה: ' + ruleText(r).then);
    if (a.kind === 'step') { const s = normStep({ type: a.type, days: a.days || 1 }); addManual(l, s, dueFor(s)); }
    else if (a.kind === 'send') { const name = a.mat || (S.biz.materials[0] || {}).name; if (name && !l.optOut) doSend(l, name); else if (!name) l.pendingMat = true; }
    else if (a.kind === 'message') { if (!l.optOut) sendTemplate(l, a.tpl, true); }
    else if (a.kind === 'stage') setStage(l, a.stage, 'אוטומציה');
    else if (a.kind === 'warm') { l.warmth = a.value || 0; l.warmBy = 'hand'; }
    else if (a.kind === 'notify') S.biz.digestNotes.push({ at: now(), text: People.rowName(l) + ' — ' + ruleText(r).when.replace(/^כש/, '') });
    byRule = false;
  }
  /** "N days without contact" counts from the last real contact or attempt, and is checked whenever the CRM opens, once per quiet spell. */
  function runIdle() {
    const rules = (S.biz.rules || []).filter((r) => r.on && r.trigger === 'idle');
    if (!rules.length) return;
    leadsNow().filter((l) => isOpenLead(l) && !l.audience).forEach((l) => {
      const last = Math.max(l.at, ...touched(l).map((e) => e.at), ...tries(l).map((e) => e.at));
      const quiet = dayNo(now()) - dayNo(last);
      rules.forEach((r) => {
        const k = r.id + ':' + dayNo(last);
        if (quiet >= r.arg && !l.ruled[k] && condOk(r, l)) { l.ruled[k] = true; applyRule(r, l); }
      });
    });
  }

  // ---- messages ----
  const CH_NAMES = { any: 'הערוץ הזמין הראשון', email: 'מייל', sms: 'SMS', wa: 'וואטסאפ' };
  const CH_KEYS = { any: null, email: ['email'], sms: ['sms'], wa: ['wa', 'waApi'] };
  /** The one channel this template goes out on — or '' when none is connected. */
  const channelFor = (t) => bestChannel(CH_KEYS[t.ch] || null);
  const OPT_OUT = 'להסרה מרשימת התפוצה השיבו "הסר".';
  /** A template filled in for one lead. Messages to a group carry the opt-out line the law asks for. */
  const fillFor = (t, l, toGroup) => t.text.replace(/\{שם\}/g, People.rowName(l)).replace(/\{עסק\}/g, S.biz.name || 'העסק').replace(/\{חומר\}/g, (S.biz.materials[0] || {}).name || 'החומר') + (toGroup ? '\n' + OPT_OUT : '');
  function sendTemplate(l, tid, quiet, toGroup) {
    const t = tplById(tid);
    if (!t || l.optOut) return false;
    const ch = channelFor(t);
    if (!ch) { if (!quiet) toast('אין ערוץ פעיל להודעה הזו. מפעילים ב"חיבורים".'); return false; }
    log(l, `${byRule ? '⚙️ ' : ''}💬 "${t.name}" נשלח ב${ch}${byRule ? ' (אוטומטי)' : toGroup ? ' (לקבוצה)' : ''}`);
    if (!quiet) toast(`💬 "${t.name}" נשלח ל${People.rowName(l)} · ${ch}`);
    return true;
  }

  // ---- Excel ----
  let downloads = null;
  if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then((d) => { downloads = d; }).catch(() => {});
  let xlsxP = null;
  const loadXLSX = () => xlsxP || (xlsxP = new Promise((res, rej) => {
    if (window.XLSX) return res(window.XLSX);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => res(window.XLSX);
    s.onerror = () => { xlsxP = null; rej(new Error('load')); };
    document.head.appendChild(s);
  }));
  async function saveFile(filename, blob) {
    if (downloads) {
      try { await downloads.save({ filename, data: blob }); return true; } catch (e) { if (e && e.code === 'declined') return false; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return true;
  }
  /** sheets: [{ name, rows: [[header…], [cell…]…] }] — one workbook, right-to-left. */
  async function exportXlsx(filename, sheets) {
    toast('מכין קובץ אקסל…');
    try {
      const X = await loadXLSX();
      const wb = X.utils.book_new();
      sheets.forEach((sh) => {
        const ws = X.utils.aoa_to_sheet(sh.rows);
        ws['!cols'] = sh.rows[0].map((_, i) => ({ wch: Math.min(45, Math.max(8, ...sh.rows.map((r) => String(r[i] == null ? '' : r[i]).length + 2))) }));
        X.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
      });
      wb.Workbook = { Views: [{ RTL: true }] };
      const buf = X.write(wb, { bookType: 'xlsx', type: 'array' });
      if (await saveFile(filename, new Blob([buf]))) toast('✓ ' + filename);
    } catch (e) { toast('לא הצלחתי ליצור את קובץ האקסל כאן.'); }
  }
  const stamp = () => { const d = new Date(now()); return d.getDate() + '-' + (d.getMonth() + 1); };

  // ---- shared pieces ----
  let crmFilter = null;      // the tasks tab: null = today, or everything open when nothing is due today
  let crmQuery = '';
  let rowOpen = null;        // the task row whose "how did it go?" is open in place
  const me = () => S.biz.team[0];
  const mineOnly = () => S.mine && S.biz.team.length > 1;
  function openTasks(L) {
    const score = (l) => { const p = plan(l); return (p.due ? p.due.getTime() : 9e15) - (effWarm(l) === 0 ? H.DAY / 2 : 0); };
    return L.filter((l) => tasks(l).length && plan(l).type !== 'season').sort((a, b) => score(a) - score(b));
  }
  function barChart(rows, fmt) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return `<div class="bars">${rows.map((r) => `<div class="bar-row${r.thin ? ' thin' : ''}" title="${esc(r.label)}: ${esc((fmt || String)(r.value))}">
      <span class="bl">${esc(r.label)}</span><span class="bt"><span class="bf${r.cls ? ' ' + r.cls : ''}" style="width:${(r.value / max * 100).toFixed(1)}%"></span></span><span class="bv">${esc((fmt || String)(r.value))}${r.sub ? ' <span class="faint">' + esc(r.sub) + '</span>' : ''}</span></div>`).join('')}</div>`;
  }
  const CRM_NAME = 'המעקב שלי';
  const CRM_TABS = [['overview', 'סקירה'], ['tasks', 'משימות'], ['pipeline', 'צינור'], ['table', 'טבלה'], ['segments', 'פילוח'], ['auto', 'אוטומציות'], ['messages', 'הודעות']];
  // Each view's ⚙️ goes straight to the settings of what it shows.
  const VIEW_SETTINGS = { overview: ['crm', 'הודעת הבוקר והשלבים'], tasks: ['buttons', 'הכפתורים והצעדים'], pipeline: ['crm', 'שלבי הצינור'], table: ['cols', 'העמודות'], segments: ['buttons', 'הכפתורים'], auto: ['auto', 'הכללים'], messages: ['materials', 'החומרים והנוסח'] };
  function viewCRM(m) {
    runIdle();
    const L = leadsNow();
    const rec = S.crmLead && leadById(S.crmLead);
    const vs = VIEW_SETTINGS[S.crmTab];
    m.innerHTML = `<div class="crm-head"><h1>${CRM_NAME}</h1>
        <span class="date-now">היום: ${esc(H.label(new Date(now())))} <button class="btn ghost" data-act="next-day">⏩ יום הבא (הדגמה)</button>${S.shift ? '<button class="btn ghost" data-act="today">לחזור להיום</button>' : ''}</span></div>
      <nav class="crm-tabs" aria-label="${CRM_NAME}">${CRM_TABS.map(([k, t]) => `<button class="ctab" data-crmtab="${k}" aria-current="${!rec && S.crmTab === k}">${t}</button>`).join('')}
        ${!rec && vs && vs[0] !== 'auto' ? `<button class="ctab gear" data-act="view-settings" title="הגדרות: ${esc(vs[1])}" aria-label="הגדרות: ${esc(vs[1])}">⚙️</button>` : ''}</nav>
      ${!rec ? askBox() : ''}
      ${!rec && L.length < 8 ? `<div class="ask-card" style="margin-top:12px"><div class="q">כדי לראות את המעקב בפעולה — אפשר להוסיף 20 לידים מדומים, עם שבועיים של מעקב אחרי התערוכה.</div>
        <div class="actions"><button class="btn primary" data-act="seed-progress">להוסיף נתוני דמה</button></div></div>` : ''}
      <div id="crm-body"></div>`;
    if (rec) return recordPage($('#crm-body'), rec);
    ({ overview: crmOverview, tasks: crmTasks, pipeline: crmPipeline, table: crmTable, segments: crmSegments, auto: crmAuto, messages: crmMessages }[S.crmTab] || crmOverview)($('#crm-body'), L);
  }

  // ---- contact, as the screens say it ----
  function lastTouch(l) {
    const t = touched(l);
    const e = t[t.length - 1];
    return e ? { at: e.at, kind: isTalk(e.t) ? 'דיברנו' : /^📎/.test(e.t) ? 'חומר' : 'הודעה' } : null;
  }
  function agoText(at) {
    if (!at) return 'עוד לא';
    const d = dayNo(now()) - dayNo(at);
    return d <= 0 ? 'היום' : d === 1 ? 'אתמול' : 'לפני ' + d + ' ימים';
  }
  /** "דיברנו · לפני 3 ימים" / "לא ענה ×2 · לפני 7 ימים" / "עוד לא" — one line for every list. */
  function contactLine(l) {
    const lt = lastTouch(l);
    const tr = tries(l);
    if (lt) return lt.kind + ' · ' + agoText(lt.at) + (tr.length && tr[tr.length - 1].at > lt.at ? ` · אחר כך לא ענה${tr.length > 1 ? ' ×' + tr.length : ''}` : '');
    if (tr.length) return `לא ענה${tr.length > 1 ? ' ×' + tr.length : ''} · ${agoText(tr[tr.length - 1].at)}`;
    return 'עוד לא היה מגע';
  }

  // ---- ask the data, in plain words ----
  let ASK = null;   // { q, busy, answer, ids }
  function askBox() {
    if (!ai) return `<div class="askbox off"><span>✨ אפשר לשאול את הנתונים בשפה חופשית — בתוך קלוד, או כשהבינה המלאכותית מחוברת.</span></div>`;
    return `<form class="askbox" data-askform><input id="ask-q" class="text-input" placeholder="✨ לשאול את הנתונים: כמה מוסדות חמים עוד לא קיבלו מענה?" aria-label="שאלה על הנתונים" value="${esc(ASK ? ASK.q : '')}" autocomplete="off">
      <button class="btn primary" data-act="ask" ${ASK && ASK.busy ? 'disabled' : ''}>${ASK && ASK.busy ? 'חושב…' : 'לשאול'}</button></form>
      ${ASK && ASK.answer ? `<div class="ask-answer"><div>${esc(ASK.answer)}</div>
        ${ASK.ids.length ? `<div class="faint" style="margin-top:6px">${ASK.ids.map(leadById).filter(Boolean).slice(0, 8).map((l) => `<button class="link" data-crmlead="${l.id}">${esc(People.rowName(l))}</button>`).join(' · ')}${ASK.ids.length > 8 ? ' ועוד ' + (ASK.ids.length - 8) : ''}</div>
          <div class="actions"><button class="btn" data-act="ask-table">להציג את ${ASK.ids.length} בטבלה</button><button class="btn ghost" data-act="ask-clear">סגירה</button></div>` : '<div class="actions"><button class="btn ghost" data-act="ask-clear">סגירה</button></div>'}</div>` : ''}`;
  }
  async function askData(q) {
    if (!ai || !q) return;
    ASK = { q, busy: true, answer: '', ids: [] };
    render();
    // The question first and the counts ready-made: a long list must never push the question out of the window.
    const L = leadsNow();
    const facts = L.slice(-100).map((l) => ({ id: l.id, name: People.rowName(l), town: People.town(l), business: l.b != null, stage: stageById(l.stage).name, warmth: effWarm(l) == null ? null : words()[effWarm(l)],
      contact: ANSWER[answerState(l)], tags: tagged(l).map((b) => b.label), of: l.roleOf || undefined, value: leadValue(l) || undefined, owner: l.owner, next: tasks(l).length ? plan(l).label : null }));
    const count = (f) => { const o = {}; L.forEach((l) => { const k = f(l); o[k] = (o[k] || 0) + 1; }); return o; };
    const prompt = `Question from a business owner about his leads (answer in Hebrew): """${q.slice(0, 300)}"""
Answer from the data below only. Count exactly; never guess. If the data cannot answer, say so plainly.
Reply with ONLY JSON: {"answer":"one to three short Hebrew sentences","leadIds":[ids of the leads the answer is about, if any]}

Context: he exhibited at a Hasidic community business fair. Today: ${H.label(new Date(now()))}. Trade: ${S.biz.trade || 'unknown'}. Goal: ${S.biz.goalNote || S.biz.goal || 'not given'}.
Totals over all ${L.length} leads — by stage: ${JSON.stringify(count((l) => stageById(l.stage).name))}; by warmth: ${JSON.stringify(count((l) => (effWarm(l) == null ? 'none' : words()[effWarm(l)])))}; by contact: ${JSON.stringify(count((l) => ANSWER[answerState(l)]))}.
Leads${L.length > 100 ? ' (the latest 100)' : ''} (JSON): ${JSON.stringify(facts)}`;
    try {
      const r = await ai.json(prompt, { modelTier: 'default' });
      const ids = new Set(L.map((l) => l.id));
      ASK = { q, busy: false, answer: str(r && r.answer, 600) || 'לא התקבלה תשובה.', ids: (Array.isArray(r && r.leadIds) ? r.leadIds : []).filter((id) => ids.has(id)) };
    } catch (e) { ASK = null; aiFailed(e); }
    render();
  }

  // ---- סקירה ----
  function crmOverview(box, L) {
    const real = L.filter((l) => !l.practice);
    const open = real.filter(isOpenLead);
    const won = real.filter((l) => l.won);
    const t0 = dayNo(now());
    const dueToday = openTasks(real).filter((l) => plan(l).due && dayNo(plan(l).due.getTime()) <= t0);
    const late = dueToday.filter((l) => dayNo(plan(l).due.getTime()) < t0).length;
    const hot = real.filter((l) => effWarm(l) === 0);
    const fast = hot.filter((l) => touched(l).some((e) => e.at - l.at <= 2 * H.DAY));
    const first = real.length ? Math.min(...real.map((l) => l.at)) : now();
    const day = dayNo(now()) - dayNo(first) + 1;   // the fair itself is day 1
    const st = { talked: 0, sent: 0, tried: 0, none: 0 };
    real.forEach((l) => { st[answerState(l)]++; });
    const typed = open.filter(typedValue).reduce((a, l) => a + +l.value, 0);
    const est = open.filter((l) => !typedValue(l)).reduce((a, l) => a + estValue(l), 0);
    const kpi = (n, t, sub, cls, act) => `<${act ? `button data-act="${act}"` : 'div'} class="kpi${cls ? ' ' + cls : ''}"><span class="n">${n}</span><span class="t">${esc(t)}</span>${sub ? `<span class="s">${esc(sub)}</span>` : ''}</${act ? 'button' : 'div'}>`;
    const stages = S.biz.stages.map((s) => ({ label: s.name, value: real.filter((l) => l.stage === s.id).length, sub: nis(real.filter((l) => l.stage === s.id).reduce((a, l) => a + leadValue(l), 0)), cls: s.kind === 'won' ? 'good' : s.kind === 'lost' ? 'muted' : '' }));
    const btnRows = S.biz.buttons.map((b) => { const ls = real.filter((l) => l.tags.includes(b.id)); return { label: b.label, value: ls.length, sub: ls.filter((l) => l.won).length ? ls.filter((l) => l.won).length + ' נסגרו' : '' }; }).filter((r) => r.value).sort((a, b) => b.value - a.value).slice(0, 8);
    const firstName = (S.account.name || '').split(' ')[0];
    const todayNames = dueToday.slice(0, 3).map((l) => People.rowName(l) + ' — ' + plan(l).label);
    const notes = S.biz.digestNotes.slice(-3);
    box.innerHTML = `
      <div class="kpis">
        ${kpi(dueToday.length, 'לטיפול היום', late ? (late === 1 ? 'אחד באיחור' : late + ' באיחור') : 'לפתוח את הרשימה ←', late ? 'bad' : '', 'go-today')}
        ${kpi(hot.length ? fast.length + '/' + hot.length : '—', 'חמים שקיבלו מענה תוך 48 שעות', hot.length ? 'המדד שהכי משפיע על סגירה' : '')}
        ${kpi(typed + est ? nis(typed + est) : '—', 'שווי בצינור', typed + est ? `${nis(typed)} מוקלד · ${nis(est)} מוערך` : 'עוד לא הוזן שווי — אפשר לכל ליד, או ממוצע לכל כפתור')}
        ${kpi(won.length, 'עסקאות שנסגרו', won.length ? nis(won.reduce((a, l) => a + leadValue(l), 0)) : '', 'good')}
      </div>
      ${dueToday.length ? `<div class="actions"><button class="btn primary big" data-act="go-today">להתחיל: ${dueToday.length} לטיפול ←</button></div>` : ''}
      <section class="card" style="margin-top:14px"><h2>14 הימים שאחרי התערוכה</h2>
        <div class="days14" aria-label="יום ${Math.min(day, 14)} מתוך 14">${Array.from({ length: 14 }, (_, i) => `<span class="${i < day - 1 ? 'past' : i === day - 1 ? 'now' : ''}"></span>`).join('')}</div>
        <p style="margin:8px 0 0">${day > 14 ? 'עברו 14 הימים.' : `יום ${day} מתוך 14.`} מ-${real.length} לידים מהתערוכה:
          <b>${st.talked}</b> דיברתם, <b>${st.sent}</b> קיבלו חומר או הודעה, <b>${st.tried}</b> ${st.tried === 1 ? 'לא ענה' : 'לא ענו'}, ו-<b>${st.none}</b> ${st.none === 1 ? 'עוד לא קיבל' : 'עוד לא קיבלו'} שום מענה.
          נסגרו <b>${won.length}</b> עסקאות${won.length ? ` (${nis(won.reduce((a, l) => a + leadValue(l), 0))})` : ''}.</p>
        ${st.none + st.tried ? `<div class="actions"><button class="btn" data-act="view-noanswer">לראות את ${st.none + st.tried} שעוד לא קיבלו מענה</button></div>` : ''}</section>
      <div class="two-col">
        <section class="card"><h2>הצינור לפי שלבים</h2>${barChart(stages)}</section>
        <section class="card"><h2>הכפתורים שהביאו לידים</h2>${btnRows.length ? barChart(btnRows) : '<div class="empty">עוד אין סימונים.</div>'}</section>
      </div>
      <section class="card digest-card" style="margin-top:14px"><h2>הודעת הבוקר שלך</h2>
        ${S.biz.digest.on ? `<div class="bubble"><b>בוקר טוב${firstName ? ' ' + esc(firstName) : ''}!</b><br>היום, ${esc(H.label(new Date(now())))}:<br>
          ${dueToday.length ? `📞 ${dueToday.length} לטיפול${late ? `, מהם ${late} באיחור` : ''}<br>${todayNames.map((t) => '• ' + esc(t)).join('<br>')}${dueToday.length > 3 ? '<br>• ועוד ' + (dueToday.length - 3) : ''}` : '✓ אין משימות להיום.'}<br>
          ${notes.length ? notes.map((n) => '🔔 ' + esc(n.text)).join('<br>') + '<br>' : ''}${typed + est ? '💰 בצינור: ' + nis(typed + est) : ''}</div>
          <p class="faint">נשלח אליך כל בוקר ב-${esc(S.biz.digest.hour)} ב${esc(CH_NAMES[S.biz.digest.ch] || 'וואטסאפ')}, מהמספר של מערכת הדוכן. בדוגמית — תצוגה בלבד. <button class="link" data-act="crm-settings">שינוי</button></p>`
          : '<p class="muted">כבוי. <button class="link" data-act="crm-settings">להפעיל</button></p>'}</section>
      ${insightsBox('crm', 'מה כדאי לעשות')}`;
  }

  // ---- משימות ----
  function crmTasks(box, L0) {
    const L = mineOnly() ? L0.filter((l) => l.owner === me()) : L0;
    const t0 = dayNo(now());
    const due = (l) => { const p = plan(l); return p.due ? dayNo(p.due.getTime()) - t0 : null; };
    const groups = {
      today: openTasks(L).filter((l) => due(l) <= 0),
      week: openTasks(L).filter((l) => due(l) > 0 && due(l) <= 7),
      all: openTasks(L),
      season: L.filter((l) => plan(l).type === 'season'),
      audience: L.filter((l) => !l.won && !tasks(l).length),
      won: L.filter((l) => l.won),
    };
    const f = crmFilter || (groups.today.length ? 'today' : 'all');
    const q = People.norm(crmQuery);
    const hay = (l) => People.norm(People.rowName(l) + ' ' + People.town(l) + ' ' + tagged(l).map((b) => b.label).join(' ') + ' ' + l.roleOf + ' ' + l.notes.map((n) => n.text).join(' '));
    const list = q ? L0.filter((l) => hay(l).includes(q)) : groups[f];
    const tab = (k, t, minor) => (minor && !groups[k].length ? '' : `<button class="tab${minor ? ' minor' : ''}" data-filter="${k}" aria-pressed="${!q && f === k}">${t} <span class="n">${groups[k].length}</span></button>`);
    let body;
    if (!list.length) body = `<div class="empty">${q ? 'לא נמצא אף ליד.' : 'אין כאן אף אחד.'}</div>`;
    else if (!q && f === 'today') {
      const late = list.filter((l) => due(l) < 0);
      const now0 = list.filter((l) => due(l) >= 0);
      body = (late.length ? `<div class="group-head bad">באיחור · ${late.length}</div>${crmRows(late, true)}` : '') + (now0.length ? `<div class="group-head">היום · ${now0.length}</div>${crmRows(now0, true)}` : '');
    } else if (!q && f === 'all') {
      body = [0, 1, null, 2].map((w) => { const part = list.filter((l) => effWarm(l) === w); return part.length ? `<div class="group-head">${w == null ? 'בלי חום' : esc(words()[w])} · ${part.length}</div>${crmRows(part, true)}` : ''; }).join('');
    } else body = crmRows(list, true);
    box.innerHTML = `<div class="tasks-bar"><nav class="tabs" aria-label="סינון">${tab('today', 'היום')}${tab('week', 'בהמשך השבוע')}${tab('all', 'כל הצעדים')}</nav>
        ${S.biz.team.length > 1 ? `<div class="chips"><button class="chip" data-mine="1" aria-pressed="${mineOnly()}">שלי</button><button class="chip" data-mine="0" aria-pressed="${!mineOnly()}">של כולם</button></div>` : ''}</div>
      <div class="more-tabs">${tab('season', 'לעונה', true)}${tab('audience', 'קהל ולא רלוונטי', true)}${tab('won', 'נסגרו', true)}</div>
      <input id="crm-q" class="text-input" placeholder="חיפוש בכל הלידים — שם, עיר, כפתור, מוסד או הערה" aria-label="חיפוש בלידים" value="${esc(crmQuery)}" autocomplete="off">
      ${q ? `<div class="faint" style="margin-top:6px">מחפש בכל הלידים · <button class="link" data-act="crm-clear">ניקוי</button></div>` : ''}
      <div style="margin-top:10px">${body}</div>`;
    $('#crm-q').addEventListener('input', (e) => { crmQuery = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#crm-q'); n.focus(); n.setSelectionRange(pos, pos); });
  }
  /** Two lines a lead: who, and what is next with the last contact. With `withCall`, a 📞 that records the call in place. */
  function crmRows(list, withCall) {
    if (!list.length) return '';
    return `<div class="rows">${list.map((l) => {
      const p = plan(l);
      const w = effWarm(l);
      const more = tasks(l).length - 1;
      const v = leadValue(l);
      const late = p.due && dayNo(p.due.getTime()) < dayNo(now());
      return `<div class="row${rowOpen === l.id ? ' open' : ''}">
        <button class="row-main" data-crmlead="${l.id}"><span><span class="nm">${esc(People.rowName(l))}</span>${l.b != null ? '<span class="badge biz">עסק</span>' : ''} <span class="muted">${esc(People.town(l))}</span> <span class="state">${w == null ? 'בלי חום' : esc(words()[w])}</span> <span class="state">${esc(stageById(l.stage).name)}</span>${v ? ` <span class="money">${nis(v)}</span>` : ''}${l.demo ? ' <span class="faint">· מדומה</span>' : ''}</span>
          <span class="due${late ? ' late' : ''}">${late ? 'באיחור · ' : ''}${planHTML(p)}${more > 0 ? ` <span class="faint">· ועוד ${more}</span>` : ''}</span>
          <span class="why">${esc(contactLine(l))}${l.contact.phone ? ` · <bdi dir="ltr">${esc(l.contact.phone)}</bdi>` : ''}</span></button>
        ${withCall && isOpenLead(l) ? `<button class="row-call" data-rowcall="${l.id}" aria-label="להתקשר ל${esc(People.rowName(l))}" aria-expanded="${rowOpen === l.id}">📞</button>` : ''}
        ${rowOpen === l.id ? `<div class="row-out"><span class="faint">${l.contact.phone ? `<bdi dir="ltr">${esc(l.contact.phone)}</bdi> · ` : ''}איך היה?</span>
          <button class="chip" data-rowout="talk" data-lid="${l.id}">דיברנו — מה הלאה</button><button class="chip" data-rowout="noans" data-lid="${l.id}">לא ענה</button>
          <button class="chip" data-rowout="won" data-lid="${l.id}">🎉 נסגרה עסקה</button><button class="chip" data-rowout="lost" data-lid="${l.id}">לא רלוונטי</button></div>` : ''}
      </div>`;
    }).join('')}</div>`;
  }

  // ---- צינור ----
  function crmPipeline(box, L) {
    const work = S.biz.stages.filter((s) => s.kind !== 'lost');
    const lost = stageOf('lost');
    const card = (l) => { const w = effWarm(l); const p = plan(l); const late = p.due && dayNo(p.due.getTime()) < dayNo(now()); return `<div class="pcard" draggable="true" data-plid="${l.id}">
      <button class="pname" data-crmlead="${l.id}">${esc(People.rowName(l))}</button>
      <div class="faint">${w == null ? 'בלי חום' : `<b class="warm-word w${w}">${esc(words()[w])}</b>`} · ${esc(People.town(l))}${leadValue(l) ? ' · <b class="money">' + nis(leadValue(l)) + '</b>' + (typedValue(l) ? '' : ' <span class="faint">מוערך</span>') : ''}</div>
      ${p.due ? `<div class="pnext${late ? ' late' : ''}">${late ? 'באיחור · ' : ''}${STEPS[p.type].icon} ${esc(p.label)} · ${esc(dateShort(p.due.getTime()))}</div>` : ''}
      <button class="pmove" data-pmove="${l.id}" aria-label="להעביר את ${esc(People.rowName(l))} לשלב אחר">⇄</button></div>`; };
    const byDue = (a, b) => ((plan(a).due || { getTime: () => 9e15 }).getTime() - (plan(b).due || { getTime: () => 9e15 }).getTime());
    box.innerHTML = `<p class="muted"><span class="fine-only">גוררים כרטיס לשלב אחר, או </span>נוגעים ב-⇄ כדי להעביר. נגיעה בשם פותחת את הליד.</p>
      <div class="pipe">${work.map((s) => {
        const ls = L.filter((l) => l.stage === s.id).sort(byDue);
        const sum = ls.reduce((a, l) => a + leadValue(l), 0);
        const partEst = ls.some((l) => !typedValue(l) && estValue(l));
        return `<section class="pcol${s.kind ? ' ' + s.kind : ''}" data-pcol="${s.id}"><header><b>${esc(s.name)}</b> <span class="faint">${ls.length}${sum ? ' · ' + nis(sum) + (partEst ? ' · חלקו מוערך' : '') : ''}</span></header>
          <div class="pcards">${ls.map(card).join('') || '<div class="pempty">—</div>'}</div></section>`;
      }).join('')}</div>
      ${lost ? `<div class="pcol lost-zone" data-pcol="${lost.id}"><b>${esc(lost.name)}</b> <span class="faint">${L.filter((l) => l.stage === lost.id).length} · לגרור לכאן, או ⇄</span></div>` : ''}`;
    box.querySelectorAll('.pcard').forEach((c) => c.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', c.dataset.plid); c.classList.add('dragging'); }));
    box.querySelectorAll('.pcol').forEach((col) => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', () => col.classList.remove('over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        const l = leadById(+e.dataTransfer.getData('text/plain'));
        if (l && l.stage !== col.dataset.pcol) moveLead(l, col.dataset.pcol);
        else render();
      });
    });
  }
  /** What a stage change would send to the visitor — shown before it happens, never after. */
  const sendsOnStage = (l, id) => {
    const st = stageById(id);
    return matching('stage', l, id).concat(st.kind === 'won' ? matching('won', l) : []).filter(sendsOut).filter(() => !l.optOut);
  };
  function moveLead(l, id) {
    const sends = sendsOnStage(l, id);
    if (sends.length) return sheetMoveConfirm(l, id, sends);
    undoable(People.rowName(l) + ' ➜ ' + stageById(id).name, () => setStage(l, id));
    render();
  }
  function sheetMove(l) {
    sheet(`<h2>להעביר את ${esc(People.rowName(l))}</h2>
      <div class="opts">${S.biz.stages.map((s) => { const sends = sendsOnStage(l, s.id); return `<button class="opt" data-pstage="${s.id}" data-lid="${l.id}" aria-pressed="${l.stage === s.id}">${esc(s.name)}${sends.length ? `<small>⚠️ יישלח ללקוח: ${esc(sends.map((r) => ruleText(r).then).join(', '))}</small>` : ''}</button>`; }).join('')}</div>`);
  }
  function sheetMoveConfirm(l, id, sends) {
    sheet(`<h2>${esc(People.rowName(l))} ➜ ${esc(stageById(id).name)}</h2>
      <p class="muted">המעבר הזה שולח ללקוח, לפי הכללים שלך:</p>
      ${sends.map((r) => `<div class="bubble">${esc(r.action.kind === 'message' && tplById(r.action.tpl) ? fillFor(tplById(r.action.tpl), l) : ruleText(r).then)}</div>`).join('')}
      <p class="faint">הודעה שיצאה אי אפשר להחזיר.</p>
      <div class="actions"><button class="btn primary" data-act="move-send" data-lid="${l.id}" data-v="${id}">להעביר ולשלוח</button>
        <button class="btn" data-act="move-hold" data-lid="${l.id}" data-v="${id}">להעביר בלי לשלוח</button><button class="btn ghost" data-act="sheet-close">ביטול</button></div>`);
  }
  function sheetCols() {
    sheet(`<h2>עמודות בטבלה</h2><div class="opts grid2">${COLS.map((c) => `<button class="opt" data-tbcol="${c.id}" aria-pressed="${S.tb.cols.includes(c.id)}">${esc(c.t)}</button>`).join('')}</div>
      <div class="actions"><button class="btn primary" data-act="sheet-close">סיום</button></div>`);
  }

  // ---- טבלה ----
  const COLS = [
    { id: 'name', t: 'שם', v: (l) => People.rowName(l) },
    { id: 'town', t: 'עיר', v: (l) => People.town(l) },
    { id: 'kind', t: 'סוג', v: (l) => (l.b != null ? 'עסק' : 'פרטי') },
    { id: 'stage', t: 'שלב', v: (l) => stageById(l.stage).name, s: (l) => S.biz.stages.findIndex((x) => x.id === l.stage) },
    { id: 'warm', t: 'חום', v: (l) => (effWarm(l) == null ? '' : words()[effWarm(l)]), s: (l) => (effWarm(l) == null ? 9 : effWarm(l)) },
    { id: 'value', t: 'שווי', v: (l) => leadValue(l), f: (v) => (v ? nis(v) : '—'), num: true },
    { id: 'answer', t: 'מענה', v: (l) => ANSWER[answerState(l)], s: (l) => ['none', 'tried', 'sent', 'talked'].indexOf(answerState(l)) },
    { id: 'last', t: 'מגע אחרון', v: (l) => contactLine(l), s: (l) => (lastTouch(l) ? lastTouch(l).at : 0) },
    { id: 'tags', t: 'כפתורים', v: (l) => tagged(l).map((b) => b.label).join(', ') },
    { id: 'next', t: 'צעד הבא', v: (l) => (tasks(l).length ? plan(l).label : '') },
    { id: 'due', t: 'מתי', v: (l) => (plan(l).due ? plan(l).due.getTime() : null), f: dateShort, num: true },
    { id: 'owner', t: 'אחראי', v: (l) => l.owner },
    { id: 'by', t: 'נקלט ע"י', v: (l) => l.by },
    { id: 'visits', t: 'ביקורים', v: (l) => l.visits, num: true },
    { id: 'phone', t: 'טלפון', v: (l) => l.contact.phone, ltr: true },
    { id: 'email', t: 'מייל', v: (l) => l.contact.email, ltr: true },
    { id: 'notes', t: 'הערות', v: (l) => l.notes.map((n) => n.text || n.tr).filter(Boolean).join(' | ') },
    { id: 'at', t: 'ביקר', v: (l) => l.at, f: dateShort, num: true },
  ];
  const colById = (id) => COLS.find((c) => c.id === id);
  const FILTERS = {
    warm: { t: 'חום', opts: () => words().map((w, k) => [String(k), w]).concat([['none', 'בלי חום']]), ok: (l, v) => (v === 'none' ? effWarm(l) == null : effWarm(l) === +v) },
    answer: { t: 'מענה', opts: () => [['none', 'עוד לא'], ['tried', 'ניסינו ולא ענה'], ['sent', 'קיבל חומר או הודעה'], ['talked', 'דיברנו'], ['notyet', 'עוד לא דיברנו']], ok: (l, v) => (v === 'notyet' ? answerState(l) !== 'talked' : v === 'none' ? ['none', 'tried'].includes(answerState(l)) : answerState(l) === v) },
    stage: { t: 'שלב', opts: () => S.biz.stages.map((s) => [s.id, s.name]), ok: (l, v) => l.stage === v },
    btn: { t: 'כפתור', more: true, opts: () => [['nobtn', 'בלי כפתור']].concat(S.biz.buttons.map((b) => [b.id, b.label])), ok: (l, v) => (v === 'nobtn' ? !l.tags.length : l.tags.includes(v)) },
    kind: { t: 'סוג', more: true, opts: () => [['biz', 'עסק'], ['private', 'פרטי']], ok: (l, v) => (v === 'biz') === (l.b != null) },
    owner: { t: 'אחראי', more: true, opts: () => S.biz.team.map((n) => [n, n]), ok: (l, v) => l.owner === v },
    town: { t: 'עיר', more: true, opts: () => Array.from(new Set(leadsNow().map((l) => People.town(l)))).sort().map((t) => [t, t]), ok: (l, v) => People.town(l) === v },
  };
  let tbQuery = '';
  let tbPage = 0;
  const tbSel = new Set();
  let tbIds = null;    // the leads an answer to a question, or a rule, pointed at — a filter of its own
  let tbIdsWhy = '';
  let tbEdit = null;   // "lid:col" — the one cell open for editing
  /** A cell becomes a control only when tapped: scrolling a tablet must never change data. */
  function inlineCell(col, l) {
    if (!['stage', 'owner', 'warm', 'value'].includes(col)) return '';
    const open = tbEdit === l.id + ':' + col;
    const shown = col === 'stage' ? stageById(l.stage).name : col === 'owner' ? l.owner : col === 'warm' ? (effWarm(l) == null ? '—' : words()[effWarm(l)]) : leadValue(l) ? nis(leadValue(l)) + (typedValue(l) ? '' : ' (מוערך)') : '—';
    if (!open) return `<button class="cell-btn" data-ietap="${col}" data-lid="${l.id}" aria-label="לשנות ${esc(colById(col).t)}">${esc(shown)}</button>`;
    const opt = (pairs, cur) => pairs.map(([v, t]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('');
    if (col === 'stage') return `<select data-ie="stage" data-lid="${l.id}" aria-label="שלב">${opt(S.biz.stages.map((s) => [s.id, s.name]), l.stage)}</select>`;
    if (col === 'owner') return `<select data-ie="owner" data-lid="${l.id}" aria-label="אחראי">${opt(S.biz.team.map((t) => [t, t]), l.owner)}</select>`;
    if (col === 'warm') { const w = effWarm(l); return `<select data-ie="warm" data-lid="${l.id}" aria-label="חום">${opt([['', '—']].concat(words().map((x, k) => [k, x])), w == null ? '' : w)}</select>`; }
    return `<input data-ie="value" data-lid="${l.id}" type="number" min="0" step="100" value="${typedValue(l) ? esc(l.value) : ''}" placeholder="${estValue(l) || ''}" aria-label="שווי בשקלים">`;
  }
  function tableRows(L) {
    const f = S.tb.f;
    const q = People.norm(tbQuery);
    let rows = L.filter((l) => Object.keys(f).every((k) => !f[k] || !FILTERS[k] || FILTERS[k].ok(l, f[k])))
      .filter((l) => !tbIds || tbIds.has(l.id))
      .filter((l) => !q || People.norm(COLS.map((c) => c.v(l)).join(' ')).includes(q));
    const c = colById(S.tb.sort.col) || COLS[0];
    const key = c.s || c.v;
    rows = rows.slice().sort((a, b) => {
      const x = key(a); const y = key(b);
      const ex = x == null || x === '';
      const ey = y == null || y === '';
      if (ex || ey) return ex === ey ? 0 : (ex ? -1 : 1) * S.tb.sort.dir;   // empty values sort with the direction, not always last
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'he')) * S.tb.sort.dir;
    });
    return rows;
  }
  const narrow = () => window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  function crmTable(box, L) {
    const rows = tableRows(L);
    const per = 25;
    const pages = Math.max(1, Math.ceil(rows.length / per));
    tbPage = Math.min(tbPage, pages - 1);
    const shown = rows.slice(tbPage * per, tbPage * per + per);
    // On a tablet the default columns are the ones that decide who to call; chosen columns are kept as chosen.
    const ids = narrow() && !S.tb.custom ? ['name', 'stage', 'last', 'next', 'due'] : S.tb.cols;
    const cols = ids.map(colById).filter(Boolean);
    const active = Object.keys(S.tb.f).filter((k) => S.tb.f[k] && FILTERS[k]);
    const allSel = shown.length && shown.every((l) => tbSel.has(l.id));
    const sel = (k, F) => `<label class="tb-filter"><span class="faint">${F.t}</span><select data-tbf="${k}" aria-label="${F.t}"><option value="">הכל</option>${F.opts().map(([v, t]) => `<option value="${esc(v)}" ${S.tb.f[k] === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    const main = Object.entries(FILTERS).filter(([, F]) => !F.more);
    const more = Object.entries(FILTERS).filter(([, F]) => F.more);
    box.innerHTML = `
      <div class="tb-bar">
        <input id="tb-q" class="text-input tb-q" placeholder="חיפוש בטבלה" aria-label="חיפוש בטבלה" value="${esc(tbQuery)}" autocomplete="off">
        ${main.map(([k, F]) => sel(k, F)).join('')}
        <details class="more-filters"${more.some(([k]) => S.tb.f[k]) ? ' open' : ''}><summary>עוד סינונים</summary><div class="tb-bar">${more.map(([k, F]) => sel(k, F)).join('')}</div></details>
      </div>
      <div class="tb-state">
        <span><b>${rows.length}</b> לידים${tbIds ? ` · <button class="chip small" data-act="ask-unfilter">${esc(tbIdsWhy || 'מתוך התשובה לשאלה')} ✕</button>` : ''}${active.length ? ' · מסונן לפי: ' + active.map((k) => `<button class="chip small" data-tbclear="${k}">${esc(FILTERS[k].t)}: ${esc((FILTERS[k].opts().find(([v]) => v === S.tb.f[k]) || [, S.tb.f[k]])[1])} ✕</button>`).join(' ') + ' <button class="link" data-tbclear="all">ניקוי הכל</button>' : ''}</span>
        <span class="tb-tools">${S.biz.views.map((v, i) => `<button class="chip small" data-tbview="${i}">${v.builtin ? '⭐ ' : ''}${esc(v.name)}</button>`).join('')}
          <button class="btn" data-act="tb-saveview">💾 לשמור תצוגה</button><button class="btn" data-act="tb-cols">עמודות</button>
          <button class="btn" data-act="tb-dense" aria-pressed="${!!S.tb.dense}">צפיפות: ${S.tb.dense ? 'דחוסה ✓' : 'רגילה'}</button><button class="btn" data-act="tb-export">⬇ אקסל</button></span>
      </div>
      <div class="tb-wrap"><table class="tb${S.tb.dense ? ' dense' : ''}">
        <thead><tr><th class="ck"><label class="ck-hit"><input type="checkbox" data-tbselall aria-label="לבחור את כל העמוד" ${allSel ? 'checked' : ''}></label></th>${cols.map((c) => `<th class="${c.num ? 'num' : ''}${c.id === 'name' ? ' stick' : ''}"><button class="th" data-tbsort="${c.id}">${esc(c.t)}${S.tb.sort.col === c.id ? (S.tb.sort.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}</tr></thead>
        <tbody>${shown.map((l) => `<tr${tbSel.has(l.id) ? ' class="sel"' : ''}><td class="ck"><label class="ck-hit"><input type="checkbox" data-tbsel="${l.id}" aria-label="לבחור את ${esc(People.rowName(l))}" ${tbSel.has(l.id) ? 'checked' : ''}></label></td>${cols.map((c) => {
          const v = c.v(l);
          const txt = c.f ? c.f(v) : v == null || v === '' ? '—' : String(v);
          if (c.id === 'name') return `<td class="stick"><button class="link" data-crmlead="${l.id}"><b>${esc(txt)}</b></button>${l.demo ? ' <span class="faint">מדומה</span>' : ''}</td>`;
          const ie = inlineCell(c.id, l);   // a tap opens it; nothing changes by scrolling past
          return ie ? `<td class="ie">${ie}</td>` : `<td class="${c.num ? 'num' : ''}"${c.ltr ? ' dir="ltr"' : ''}>${esc(txt)}</td>`;
        }).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length + 1}"><div class="empty">אין לידים שעונים על הסינון. <button class="link" data-tbclear="all">ניקוי סינון</button></div></td></tr>`}</tbody>
      </table></div>
      ${pages > 1 ? `<div class="pager"><button class="btn" data-tbpage="${tbPage - 1}" ${tbPage ? '' : 'disabled'}>הקודם</button><span>עמוד ${tbPage + 1} מתוך ${pages}</span><button class="btn" data-tbpage="${tbPage + 1}" ${tbPage < pages - 1 ? '' : 'disabled'}>הבא</button></div>` : ''}
      ${tbSel.size ? `<div class="bulk"><b>${tbSel.size} נבחרו</b>
        <button class="btn primary-inv" data-bulk="message">💬 הודעה</button><button class="btn" data-bulk="stage">להעביר שלב</button><button class="btn" data-bulk="warm">לסמן חום</button><button class="btn" data-bulk="owner">לשייך</button>
        <button class="btn" data-bulk="step">להוסיף צעד</button><button class="btn" data-bulk="export">⬇ אקסל</button>
        <button class="btn ghost" data-bulk="clear">ביטול הבחירה</button></div>` : ''}`;
    $('#tb-q').addEventListener('input', (e) => { tbQuery = e.target.value; tbPage = 0; const pos = e.target.selectionStart; render(); const n = $('#tb-q'); n.focus(); n.setSelectionRange(pos, pos); });
    const open = box.querySelector('.ie select, .ie input');
    if (open) open.focus();
  }
  function exportLeads(list, name) {
    const rows = [COLS.map((c) => c.t)].concat(list.map((l) => COLS.map((c) => { const v = c.v(l); return c.id === 'due' || c.id === 'at' ? (v ? new Date(v).toLocaleDateString('he-IL') : '') : v == null ? '' : v; })));
    exportXlsx(name + '-' + stamp() + '.xlsx', [{ name: 'לידים', rows }]);
  }
  function sheetBulk(kind) {
    const n = tbSel.size;
    const opts = kind === 'stage' ? S.biz.stages.map((s) => [s.id, s.name]) : kind === 'warm' ? words().map((w, k) => [String(k), w]) : kind === 'owner' ? S.biz.team.map((t) => [t, t])
      : kind === 'step' ? Object.keys(STEPS).filter((k) => k !== 'none' && k !== 'season').map((k) => [k, STEPS[k].icon + ' ' + STEPS[k].name]) : S.biz.templates.map((t) => [t.id, '💬 ' + t.name]);
    const title = { stage: 'להעביר שלב', warm: 'לסמן חום', owner: 'לשייך ל', step: 'להוסיף צעד', message: 'איזו הודעה לשלוח' }[kind];
    sheet(`<h2>${title} — ${n} לידים</h2><div class="opts">${opts.map(([v, t]) => `<button class="opt" data-bulkdo="${kind}" data-v="${esc(v)}">${esc(t)}</button>`).join('')}</div>
      <div class="actions"><button class="btn ghost" data-act="sheet-close">ביטול</button></div>`);
  }
  function doBulk(kind, v) {
    const list = Array.from(tbSel).map(leadById).filter(Boolean);
    if (kind === 'message') return sheetSendConfirm(list, v);   // a message always passes through the confirmation
    closeSheet(false);
    undoable(`✓ ${list.length} לידים עודכנו`, () => list.forEach((l) => {
      if (kind === 'stage') { holdSends = true; setStage(l, v, 'בפעולה על כמה'); holdSends = false; }
      if (kind === 'warm') { l.warmth = +v; l.warmBy = 'hand'; }
      if (kind === 'owner') { l.owner = v; log(l, 'שויך ל' + v); }
      if (kind === 'step') { const s = normStep({ type: v }); addManual(l, s, dueFor(s)); log(l, 'הלאה: ' + s.label); }
    }));
    render();
  }

  /* Sending to a group: who gets it, who is left out and why, the text and the
   * channel — all before anything leaves. A message that went out cannot come back. */
  let SC = null;   // { ids, tid, withClosed }
  function sendAudience(list, tid, withClosed) {
    const month = now() - 30 * H.DAY;
    const t = tplById(tid);
    const out = [];
    const keep = [];
    list.forEach((l) => {
      const why = l.optOut ? 'ביקש להסיר' : !withClosed && l.won ? 'עסקה נסגרה' : !withClosed && l.lost ? 'לא רלוונטי'
        : t && l.log.some((e) => e.at > month && e.t.includes('"' + t.name + '"')) ? 'קיבל את ההודעה הזו החודש' : '';
      (why ? out : keep).push({ l, why });
    });
    return { keep: keep.map((x) => x.l), out };
  }
  function sheetSendConfirm(list, tid, withClosed) {
    SC = { ids: list.map((l) => l.id), tid, withClosed: !!withClosed };
    const t = tplById(tid);
    if (!t) return;
    const { keep, out } = sendAudience(list, tid, withClosed);
    const ch = channelFor(t);
    const reasons = {};
    out.forEach((x) => { reasons[x.why] = (reasons[x.why] || 0) + 1; });
    sheet(`<h2>לשלוח "${esc(t.name)}" ל-${keep.length}${ch ? ' ב' + esc(ch) : ''}?</h2>
      ${keep.length ? `<div class="bubble">${esc(fillFor(t, keep[0], true)).replace(/\n/g, '<br>')}</div><p class="faint">כך זה ייראה אצל ${esc(People.rowName(keep[0]))}. כל אחד מקבל את השם שלו.</p>` : ''}
      <p>${keep.length ? 'יקבלו: ' + esc(keep.slice(0, 8).map((l) => People.rowName(l)).join(', ')) + (keep.length > 8 ? ` ועוד ${keep.length - 8}` : '') : 'אף אחד לא יקבל.'}</p>
      ${out.length ? `<p class="muted">הוצאו ${out.length}: ${esc(Object.entries(reasons).map(([w, n]) => n + ' — ' + w).join(' · '))}</p>` : ''}
      <label class="check-line"><input type="checkbox" data-scclosed ${SC.withClosed ? 'checked' : ''}> לשלוח גם למי שעסקה איתו נסגרה, ולמי שסומן לא רלוונטי</label>
      ${!ch ? '<p class="warn-box">אין ערוץ פעיל להודעה הזו. מפעילים ב"חיבורים".</p>' : ''}
      <div class="actions"><button class="btn primary" data-act="send-confirm" ${keep.length && ch ? '' : 'disabled'}>לשלוח ל-${keep.length}</button><button class="btn ghost" data-act="sheet-close">ביטול</button></div>`);
  }
  function sendConfirmed() {
    const list = SC.ids.map(leadById).filter(Boolean);
    const { keep } = sendAudience(list, SC.tid, SC.withClosed);
    let n = 0;
    keep.forEach((l) => { if (sendTemplate(l, SC.tid, true, true)) n++; });
    SC = null; tbSel.clear();
    save(); closeSheet(false); render();
    toast(`💬 נשלח ל-${n}. הודעה שיצאה אי אפשר להחזיר.`);
  }

  // ---- פילוח ----
  let PV = { dim: null, metric: 'conv' };
  function dims() {
    const d = {};
    liveGroups().forEach((g) => {
      d['g:' + g.id] = { t: 'כפתורים: ' + g.title, of: (l) => { const bs = tagged(l).filter((b) => b.axis === g.id); return bs.length ? bs.map((b) => b.label) : ['לא סומן']; },
        filter: 'btn', key: (l) => { const bs = tagged(l).filter((b) => b.axis === g.id); return bs.length ? bs.map((b) => b.id) : ['nobtn']; } };
    });
    Object.assign(d, {
      warm: { t: 'חום', of: (l) => [effWarm(l) == null ? 'בלי חום' : words()[effWarm(l)]], filter: 'warm', key: (l) => [effWarm(l) == null ? 'none' : String(effWarm(l))] },
      answer: { t: 'מענה', of: (l) => [ANSWER[answerState(l)]], filter: 'answer', key: (l) => [answerState(l)] },
      kind: { t: 'עסק או פרטי', of: (l) => [l.b != null ? 'עסק' : 'פרטי'], filter: 'kind', key: (l) => [l.b != null ? 'biz' : 'private'] },
      town: { t: 'עיר', of: (l) => [People.town(l)], filter: 'town', key: (l) => [People.town(l)] },
      owner: { t: 'אחראי', of: (l) => [l.owner], filter: 'owner', key: (l) => [l.owner] },
      by: { t: 'מי קלט בדוכן', of: (l) => [l.by] },
      hour: { t: 'שעת הביקור', of: (l) => [String(new Date(l.at).getHours()).padStart(2, '0') + ':00'] },
      stage: { t: 'שלב', of: (l) => [stageById(l.stage).name], filter: 'stage', key: (l) => [l.stage], ordered: true },
    });
    return d;
  }
  const METRICS = { count: 'מספר לידים', value: 'שווי', won: 'עסקאות שנסגרו', conv: 'אחוז סגירה', reached: 'קיבלו מענה' };
  const MIN_N = 10;   // below this, a percentage says more about chance than about the business
  function pivot(L) {
    const D = dims()[PV.dim];
    const map = new Map();
    L.forEach((l) => {
      const labels = D.of(l);
      const keys = D.key ? D.key(l) : labels;
      labels.forEach((lab, i) => {
        if (!map.has(lab)) map.set(lab, { label: lab, key: keys[i], ls: [] });
        map.get(lab).ls.push(l);
      });
    });
    const rows = Array.from(map.values()).map((r) => {
      const won = r.ls.filter((l) => l.won).length;
      return { label: r.label, key: r.key, count: r.ls.length, value: r.ls.reduce((a, l) => a + leadValue(l), 0), won, conv: r.ls.length ? Math.round(won / r.ls.length * 100) : 0, reached: r.ls.filter(reached).length };
    });
    if (D.ordered) return rows.sort((a, b) => S.biz.stages.findIndex((s) => s.name === a.label) - S.biz.stages.findIndex((s) => s.name === b.label));
    return rows.sort((a, b) => (b.count >= MIN_N) - (a.count >= MIN_N) || b[PV.metric] - a[PV.metric]);
  }
  function crmSegments(box, L) {
    const D = dims();
    if (!PV.dim || !D[PV.dim]) PV.dim = Object.keys(D)[0];
    const isStage = PV.dim === 'stage';
    if (isStage && (PV.metric === 'conv' || PV.metric === 'won')) PV.metric = 'count';   // "closing rate by stage" carries no information
    const rows = pivot(L);
    const pct = (r) => (r.count >= MIN_N ? r.conv + '%' : '—');
    const fmt = PV.metric === 'value' ? nis : String;
    const chartRows = rows.map((r) => ({ label: r.label, value: PV.metric === 'conv' ? (r.count >= MIN_N ? r.conv : 0) : r[PV.metric], sub: PV.metric === 'conv' ? (r.count >= MIN_N ? `(${r.won} מתוך ${r.count})` : `מעט מדי לידים (${r.count})`) : '', thin: r.count < MIN_N }));
    const canShow = !!D[PV.dim].filter;
    box.innerHTML = `<div class="tb-bar">
        <label class="tb-filter"><span class="faint">לפלח לפי</span><select data-pv="dim">${Object.entries(D).map(([k, d]) => `<option value="${k}" ${PV.dim === k ? 'selected' : ''}>${esc(d.t)}</option>`).join('')}</select></label>
        <label class="tb-filter"><span class="faint">למדוד</span><select data-pv="metric">${Object.entries(METRICS).map(([k, t]) => `<option value="${k}" ${PV.metric === k ? 'selected' : ''} ${isStage && (k === 'conv' || k === 'won') ? 'disabled' : ''}>${t}</option>`).join('')}</select></label>
        <button class="btn" data-act="pv-export">⬇ אקסל</button></div>
      <p class="faint">אחוז סגירה מוצג רק מ-${MIN_N} לידים ומעלה, ותמיד עם המספרים עצמם.</p>
      <div class="two-col">
        <section class="card"><h2>${esc(METRICS[PV.metric])} לפי ${esc(D[PV.dim].t)}</h2>${rows.length ? barChart(chartRows, PV.metric === 'conv' ? (v) => v + '%' : fmt) : '<div class="empty">אין נתונים.</div>'}</section>
        <section class="card"><div class="tb-wrap"><table class="tb pv">
          <thead><tr><th>${esc(D[PV.dim].t)}</th>${Object.entries(METRICS).map(([k, t]) => `<th class="num${k === PV.metric ? ' hl' : ''}">${t}</th>`).join('')}${canShow ? '<th></th>' : ''}</tr></thead>
          <tbody>${rows.map((r) => `<tr class="${r.count < MIN_N ? 'thin' : ''}"><td><b>${esc(r.label)}</b></td><td class="num${PV.metric === 'count' ? ' hl' : ''}">${r.count}</td><td class="num${PV.metric === 'value' ? ' hl' : ''}">${nis(r.value)}</td><td class="num${PV.metric === 'won' ? ' hl' : ''}">${r.won}</td><td class="num${PV.metric === 'conv' ? ' hl' : ''}">${pct(r)}</td><td class="num${PV.metric === 'reached' ? ' hl' : ''}">${r.reached}</td>
            ${canShow ? `<td><button class="link" data-pvshow="${esc(D[PV.dim].filter)}" data-v="${esc(r.key)}">לטבלה ←</button></td>` : ''}</tr>`).join('')}</tbody>
        </table></div></section>
      </div>`;
  }

  // ---- אוטומציות ----
  function crmAuto(box) {
    const group = (title, list, hint) => (list.length ? `<h2 class="rules-head">${title}</h2><p class="faint">${hint}</p><div class="rules">${list.map((r) => { const t = ruleText(r); return `<div class="rule${r.on ? '' : ' off'}">${toggle('rule:' + r.id, r.on, 'הפעלת הכלל')}
        <button class="rule-body" data-ruleedit="${r.id}"><span class="when">${esc(t.when)}</span><span class="then">⚙️ ${esc(t.then)}${sendsOut(r) ? ' <span class="out-tag">יוצא ללקוח</span>' : ''}</span></button>
        ${r.fired ? `<button class="link" data-rulehits="${r.id}">הופעל ${many(r.fired, 'פעם אחת', 'פעמים')} ←</button>` : '<span class="faint">עוד לא הופעל</span>'}</div>`; }).join('')}</div>` : '');
    const out = S.biz.rules.filter(sendsOut);
    const inside = S.biz.rules.filter((r) => !sendsOut(r));
    box.innerHTML = `<p class="muted">כללים שאתה כותב: כשקורה משהו — המערכת עושה משהו, לבד. כל מה שהיא עשתה נרשם בהיסטוריה של הליד עם ⚙️.</p>
      ${group('שולח ללקוח', out, 'מה שהכללים האלה שולחים יוצא בשמך. אין להם "ביטול".')}
      ${group('רק אצלי', inside, 'משימות, שלבים ותזכורות — לא יוצא מהמערכת.')}
      <div class="actions"><button class="btn primary" data-act="rule-add">+ כלל חדש</button></div>`;
  }
  let RD = null;
  function sheetRule(id) {
    const r = id ? S.biz.rules.find((x) => x.id === id) : null;
    RD = r ? clone(r) : { id: 'r' + Date.now(), on: true, trigger: 'noanswer', arg: 2, cond: {}, action: { kind: 'step', type: 'call', days: 1 }, fired: 0, isNew: true };
    renderRule();
  }
  /* The rule reads as a sentence, and each part of the sentence is its own menu. */
  function renderRule() {
    const r = RD;
    const sel = (k, opts, v, label) => `<select class="inline-sel" data-rd="${k}" aria-label="${esc(label)}">${opts.map(([o, t]) => `<option value="${esc(o)}" ${String(v) === String(o) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    const a = r.action;
    const arg = r.trigger === 'noanswer' ? sel('arg', [[1, 'פעם אחת'], [2, 'פעמיים'], [3, '3 פעמים']], r.arg, 'כמה פעמים')
      : r.trigger === 'idle' ? sel('arg', [[3, '3 ימים'], [5, '5 ימים'], [7, 'שבוע'], [14, 'שבועיים'], [30, 'חודש']], r.arg, 'כמה ימים')
      : r.trigger === 'stage' ? sel('arg', S.biz.stages.map((s) => [s.id, s.name]), r.arg, 'לאיזה שלב') : '';
    const act = a.kind === 'step' ? `${sel('a.type', Object.keys(STEPS).filter((k) => k !== 'none' && k !== 'season').map((k) => [k, STEPS[k].name]), a.type, 'איזה צעד')} ${sel('a.days', [[0, 'היום'], [1, 'תוך יום'], [2, 'תוך יומיים'], [3, 'תוך 3 ימים'], [7, 'תוך שבוע']], a.days || 1, 'מתי')}`
      : a.kind === 'send' ? sel('a.mat', [['', 'את החומר הראשון']].concat(S.biz.materials.map((x) => [x.name, x.name])), a.mat || '', 'איזה חומר')
      : a.kind === 'message' ? sel('a.tpl', S.biz.templates.map((t) => [t.id, t.name]), a.tpl, 'איזו הודעה')
      : a.kind === 'stage' ? sel('a.stage', S.biz.stages.map((s) => [s.id, s.name]), a.stage || 'contact', 'לאיזה שלב')
      : a.kind === 'warm' ? sel('a.value', words().map((w, k) => [k, w]), a.value || 0, 'איזה חום') : '';
    const c = r.cond || {};
    const tpl = a.kind === 'message' && tplById(a.tpl);
    sheet(`<h2>${r.isNew ? 'כלל חדש' : 'עריכת כלל'}</h2>
      <div class="rule-sentence">כש ${sel('trigger', Object.entries(TRIGGERS), r.trigger, 'מתי')} ${arg}<br>
        אז ${sel('a.kind', Object.entries(ACTIONS), a.kind, 'מה לעשות')} ${act}</div>
      ${tpl ? `<div class="bubble">${esc(tpl.text)}</div>` : ''}
      ${sendsOut(r) ? '<p class="out-tag">יוצא ללקוח, בשמך</p>' : ''}
      <div class="label">רק אם <small>רשות</small></div>
      <div class="rule-conds">
        <label><span class="faint">חום</span>${sel('c.warm', [['', 'כל חום']].concat(words().map((w, k) => [k, w])), c.warm == null ? '' : c.warm, 'חום')}</label>
        <label><span class="faint">כפתור</span>${sel('c.btn', [['', 'כל כפתור']].concat(S.biz.buttons.map((b) => [b.id, b.label])), c.btn || '', 'כפתור')}</label>
        <label><span class="faint">עסק או פרטי</span>${sel('c.biz', [['', 'שניהם'], ['1', 'רק עסק'], ['0', 'רק פרטי']], c.biz == null ? '' : c.biz ? '1' : '0', 'עסק או פרטי')}</label>
        <label><span class="faint">שווי מינימלי ₪</span><input class="text-input" type="number" min="0" step="100" data-rd="c.minValue" value="${c.minValue || ''}"></label></div>
      <div class="actions"><button class="btn primary" data-act="rule-save">שמירה</button><button class="btn ghost" data-act="sheet-close">ביטול</button>
        ${r.isNew ? '' : `<button class="btn ghost danger far" data-act="rule-del">למחוק</button>`}</div>`);
    $('#scrim .sheet').dataset.guard = '1';
  }
  function readRuleField(k, v) {
    const r = RD;
    const num = (x) => (x === '' ? null : +x);
    if (k === 'trigger') { r.trigger = v; r.arg = v === 'noanswer' ? 2 : v === 'idle' ? 7 : v === 'stage' ? 'contact' : null; return renderRule(); }
    if (k === 'arg') r.arg = r.trigger === 'stage' ? v : +v;
    if (k === 'c.warm') r.cond.warm = num(v);
    if (k === 'c.btn') r.cond.btn = v || null;
    if (k === 'c.biz') r.cond.biz = v === '' ? null : v === '1';
    if (k === 'c.minValue') r.cond.minValue = num(v);
    if (k === 'a.kind') { r.action = { kind: v, type: 'call', days: 1, mat: '', tpl: (S.biz.templates[0] || {}).id, stage: 'contact', value: 0 }; return renderRule(); }
    if (k === 'a.type') r.action.type = v;
    if (k === 'a.days') r.action.days = +v;
    if (k === 'a.mat') r.action.mat = v;
    if (k === 'a.tpl') { r.action.tpl = v; return renderRule(); }
    if (k === 'a.stage') r.action.stage = v;
    if (k === 'a.value') r.action.value = +v;
  }

  // ---- הודעות ----
  let msgFilter = 'all';
  let grp = { stage: '', warm: '', btn: '', answer: '', tpl: '' };
  const grpList = () => leadsNow().filter((l) => (!grp.stage || l.stage === grp.stage) && (grp.warm === '' || effWarm(l) === +grp.warm) && (!grp.btn || l.tags.includes(grp.btn)) && (!grp.answer || FILTERS.answer.ok(l, grp.answer)));
  function crmMessages(box, L) {
    const sent = [];
    L.forEach((l) => l.log.forEach((e) => { if (/^(⚙️ )?💬/.test(e.t)) sent.push({ l, e, auto: isAuto(e.t) }); }));
    sent.sort((a, b) => b.e.at - a.e.at);
    const shown = sent.filter((x) => msgFilter === 'all' || (msgFilter === 'auto') === x.auto);
    if (!grp.tpl && S.biz.templates[0]) grp.tpl = S.biz.templates[0].id;
    const aud = grpList();
    const { keep } = sendAudience(aud, grp.tpl, false);
    const sel = (k, opts, label) => `<select class="text-input" data-grp="${k}" aria-label="${label}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${String(grp[k]) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    const sample = leadsNow()[0];
    box.innerHTML = `<div class="two-col">
      <section class="card"><h2>תבניות</h2>
        <div class="prod-list">${S.biz.templates.map((t) => `<button class="prod-row" data-tpledit="${t.id}"><span class="pn">💬 ${esc(t.name)} <span class="faint">· ${esc(CH_NAMES[t.ch])}</span></span><span class="pnext">${esc((sample ? fillFor(t, sample) : t.text).slice(0, 90))}</span></button>`).join('')}</div>
        <div class="actions"><button class="btn" data-act="tpl-add">+ תבנית חדשה</button></div></section>
      <section class="card"><h2>שליחה לקבוצה</h2>
        <div class="rule-conds">
          <label><span class="faint">שלב</span>${sel('stage', [['', 'כל השלבים']].concat(S.biz.stages.map((s) => [s.id, s.name])), 'שלב')}</label>
          <label><span class="faint">חום</span>${sel('warm', [['', 'כל חום']].concat(words().map((w, k) => [k, w])), 'חום')}</label>
          <label><span class="faint">מענה</span>${sel('answer', [['', 'כולם']].concat(FILTERS.answer.opts()), 'מענה')}</label>
          <label><span class="faint">כפתור</span>${sel('btn', [['', 'כל כפתור']].concat(S.biz.buttons.map((b) => [b.id, b.label])), 'כפתור')}</label></div>
        <label class="label">מה</label>${sel('tpl', S.biz.templates.map((t) => [t.id, t.name]), 'תבנית')}
        <p class="faint" style="margin-top:8px">יישלח ל-<b>${keep.length}</b>${aud.length - keep.length ? ` (${aud.length - keep.length} הוצאו — סגורים, לא רלוונטיים, ביקשו הסרה, או קיבלו אותה החודש)` : ''}: ${esc(keep.slice(0, 5).map((l) => People.rowName(l)).join(', '))}${keep.length > 5 ? ' ועוד ' + (keep.length - 5) : ''}</p>
        <div class="actions"><button class="btn primary" data-act="grp-send" ${keep.length ? '' : 'disabled'}>לראות ולשלוח…</button></div></section>
    </div>
    <section class="card" style="margin-top:14px"><h2>נשלחו לאחרונה</h2>
      <div class="chips tl-filter">${[['all', 'הכל'], ['manual', 'ידני'], ['auto', '⚙️ אוטומטי']].map(([k, t]) => `<button class="chip small" data-msgf="${k}" aria-pressed="${msgFilter === k}">${t}</button>`).join('')}</div>
      ${shown.length ? `<ul class="log">${shown.slice(0, 15).map(({ l, e }) => `<li><span class="when">${esc(H.heDate(new Date(e.at)))} ${new Date(e.at).toTimeString().slice(0, 5)}</span><button class="link" data-crmlead="${l.id}">${esc(People.rowName(l))}</button> · ${esc(e.t.replace(/^(⚙️ )?💬\s*/, isAuto(e.t) ? '⚙️ ' : ''))}</li>`).join('')}</ul>` : '<div class="empty">עוד לא נשלחו הודעות.</div>'}</section>`;
  }
  function sheetTemplate(id) {
    const t = id ? tplById(id) : { id: '', name: '', ch: 'any', text: 'שלום {שם}, ' };
    sheet(`<h2>${id ? 'עריכת תבנית' : 'תבנית חדשה'}</h2>
      <label class="label" for="tp-name">שם</label><input id="tp-name" class="text-input" value="${esc(t.name)}" autocomplete="off">
      <div class="label">ערוץ</div><div class="chips">${Object.entries(CH_NAMES).map(([k, n]) => `<button class="chip" data-tpch="${k}" aria-pressed="${t.ch === k}">${esc(n)}</button>`).join('')}</div>
      <label class="label" for="tp-text">נוסח</label>
      <div class="chips">${[['{שם}', '+ שם'], ['{עסק}', '+ העסק שלך'], ['{חומר}', '+ חומר']].map(([v, l]) => `<button class="chip small" data-tplvar="${v}">${l}</button>`).join('')}</div>
      <textarea id="tp-text" class="say small">${esc(t.text)}</textarea>
      <p class="faint">בשליחה לקבוצה נוספת לבד השורה: "${esc(OPT_OUT)}"</p>
      <div class="actions"><button class="btn primary" data-act="tpl-save" data-id="${esc(t.id)}">שמירה</button><button class="btn ghost" data-act="sheet-close">ביטול</button>
        ${id ? `<button class="btn ghost danger far" data-act="tpl-del" data-id="${esc(id)}">למחוק</button>` : ''}</div>`);
    $('#scrim .sheet').dataset.guard = '1';
  }
  function sheetLeadMsg(l) {
    sheet(`<h2>הודעה ל${esc(People.rowName(l))}</h2>
      ${l.optOut ? '<p class="warn-box">ביקש להסיר את עצמו מרשימת התפוצה. אפשר לשלוח רק תשובה אישית, לא מהתבניות.</p>' : `<div class="opts">${S.biz.templates.map((t) => `<button class="opt" data-sendtpl="${t.id}" data-lid="${l.id}">💬 ${esc(t.name)} <span class="faint">· ${esc(channelFor(t) || 'אין ערוץ פעיל')}</span><small>${esc(fillFor(t, l))}</small></button>`).join('')}</div>`}
      <div class="actions"><button class="btn ghost" data-act="back-crm" data-lid="${l.id}">חזרה</button></div>`, l.id);
    $('#scrim .sheet').dataset.tasks = '1';
  }

  /* The lead's own page — the screen a business owner opens most, so it is a page
   * and not a pop-up. On top: who, the few facts that matter, and what to do.
   * Then the next steps first, the details beside them, and one timeline of every
   * channel with the automations' own entries folded away. */
  let callOpen = false;
  let tlFilter = 'all';
  let tlAuto = false;
  const TL_KINDS = { all: 'הכל', calls: '📞 שיחות', msgs: '💬 הודעות וחומר', notes: '📝 הערות', stages: '➜ שלבים' };
  const tlKind = (t) => (isAuto(t) ? 'auto' : /^📞/.test(t) ? 'calls' : /^(💬|📎)/.test(t) ? 'msgs' : /^📝/.test(t) ? 'notes' : /^➜/.test(t) ? 'stages' : 'other');
  function recordPage(box, l) {
    const ts = tasks(l);
    const w = effWarm(l);
    const est = estValue(l);
    const lt = lastTouch(l);
    const tr = tries(l);
    const autos = l.log.filter((e) => isAuto(e.t)).length;
    const entries = l.log.slice().reverse().filter((e) => {
      const k = tlKind(e.t);
      if (k === 'auto') return tlAuto && tlFilter === 'all';
      return tlFilter === 'all' || k === tlFilter;
    });
    const audio = l.notes.filter((n) => n.audio);
    box.innerHTML = `<div class="rec">
      <div class="rec-top">
        <div class="rec-bar"><button class="btn ghost" data-act="record-back">→ חזרה ל${esc((CRM_TABS.find(([k]) => k === S.crmTab) || ['', CRM_NAME])[1])}</button>
          <button class="btn ghost" data-act="rec-menu" data-lid="${l.id}" aria-label="פעולות נוספות">⋯</button></div>
        <div class="rec-title"><h1>${esc(People.rowName(l))}${l.b != null ? ' <span class="badge biz">עסק</span>' : ''}${l.optOut ? ' <span class="badge">ביקש הסרה</span>' : ''}</h1>
          <div class="muted">${esc(People.town(l))} · ${esc(People.rowMeta(l))}${l.demo ? ' · מדומה' : ''}</div></div>
        <div class="rec-keys">
          <button class="key" data-pmove="${l.id}" aria-label="לשנות שלב"><span class="faint">שלב</span><b>${esc(stageById(l.stage).name)} ⇄</b></button>
          <span class="key"><span class="faint">שווי</span><b class="money">${leadValue(l) ? nis(leadValue(l)) : '—'}</b>${!typedValue(l) && est ? '<span class="faint">מוערך</span>' : ''}</span>
          <span class="key"><span class="faint">חום</span><b>${w == null ? 'בלי' : esc(words()[w])}</b></span>
          <span class="key"><span class="faint">מגע אחרון</span><b>${lt ? esc(lt.kind + ' · ' + agoText(lt.at)) : 'עוד לא'}</b>${tr.length ? `<span class="faint">ניסיון אחרון: לא ענה${tr.length > 1 ? ' ×' + tr.length : ''} · ${esc(agoText(tr[tr.length - 1].at))}</span>` : ''}</span>
          <span class="key"><span class="faint">אחראי</span><b>${esc(l.owner)}</b></span>
        </div>
        <div class="actions rec-acts"><button class="btn primary" data-act="call" data-lid="${l.id}">📞 להתקשר</button>
          <button class="btn" data-act="lead-msg" data-lid="${l.id}">💬 הודעה</button>
          <button class="btn" data-act="send" data-lid="${l.id}">📎 חומר</button>
          <button class="btn" data-act="note" data-lid="${l.id}">📝 הערה</button>
          <button class="btn" data-act="edit-tags" data-lid="${l.id}">✎ כפתורים וחום</button></div>
        ${callOpen ? `<div class="mini"><div class="label" style="margin-top:0">${l.contact.phone ? `חייגו: <bdi dir="ltr" class="phone">${esc(l.contact.phone)}</bdi> · ` : ''}איך היה?</div><div class="chips">
          <button class="chip" data-outcome="talk" data-lid="${l.id}">דיברנו — מה הלאה</button>
          <button class="chip" data-outcome="noans" data-lid="${l.id}">לא ענה</button>
          <button class="chip" data-outcome="won" data-lid="${l.id}">🎉 נסגרה עסקה</button>
          <button class="chip" data-outcome="lost" data-lid="${l.id}">לא רלוונטי</button></div>
          <div class="faint" style="margin-top:6px">מתקשרים מהטלפון שלכם, ומסמנים כאן איך היה.</div></div>` : ''}
      </div>
      <div class="rec-grid">
        <div class="rec-main">
          <section class="card"><h2>הלאה</h2>
            ${ts.length ? `<div class="step-list">${ts.map((t, i) => `<div class="task-line${i === 0 ? ' first' : ''}"><span>${planHTML(t)}</span>
              <span class="task-acts">${t.type === 'send' ? `<button class="btn" data-tasksend="${esc(t.key)}" data-lid="${l.id}">📎 לשלוח</button>` : ''}
                <button class="btn" data-taskdone="${esc(t.key)}" data-lid="${l.id}">✓ בוצע</button>
                <button class="btn ghost" data-taskedit="${esc(t.key)}" data-lid="${l.id}">שינוי</button></span></div>`).join('')}</div>`
              : `<p class="muted">אין צעדים פתוחים${l.won ? ' — לקוח.' : '.'}</p>`}
            <div class="actions"><button class="btn" data-act="task-add" data-lid="${l.id}">+ צעד</button></div></section>
          ${audio.length ? `<section class="card"><h2>הקלטות</h2><ul class="log">${audio.map((n) => `<li><span class="when">${esc(H.heDate(new Date(n.at)))}</span><button class="btn ghost" data-play="${n.id}">▶ השמעה</button> ${esc(n.text || '')}${n.tr ? `<div class="faint">תמלול: ${esc(n.tr)}</div>` : ''}</li>`).join('')}</ul></section>` : ''}
          <section class="card"><h2>ציר זמן</h2>
            <div class="chips tl-filter">${Object.entries(TL_KINDS).map(([k, t]) => `<button class="chip" data-tl="${k}" aria-pressed="${tlFilter === k}">${t}</button>`).join('')}</div>
            <ul class="log timeline">${entries.map((e) => `<li class="tl-${tlKind(e.t)}"><span class="when">${esc(H.heDate(new Date(e.at)))} ${new Date(e.at).toTimeString().slice(0, 5)}</span>${esc(e.t)}</li>`).join('') || '<li class="faint">אין כאן כלום.</li>'}</ul>
            ${autos && tlFilter === 'all' ? `<button class="link" data-act="tl-auto">${tlAuto ? 'להסתיר' : 'להציג'} ${autos} פעולות אוטומציה ⚙️</button>` : ''}</section>
        </div>
        <details class="card rec-fields"${narrow() ? '' : ' open'}>
          <summary><h2>פרטים</h2>${l.contact.phone ? ` <bdi dir="ltr" class="faint">${esc(l.contact.phone)}</bdi>` : ''}</summary>
          <label><span class="faint">שווי ₪</span><input class="text-input" type="number" min="0" step="100" data-lf="value" data-lid="${l.id}" value="${typedValue(l) ? esc(l.value) : ''}" placeholder="${est ? 'מוערך ' + est : 'לא ידוע'}"></label>
          <label><span class="faint">אחראי</span><select class="text-input" data-lowner="${l.id}">${S.biz.team.map((t) => `<option ${l.owner === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
          <label><span class="faint">טלפון</span><input class="text-input ltr" type="tel" data-lf="phone" data-lid="${l.id}" value="${esc(l.contact.phone)}" placeholder="מרשימת המארגנים"></label>
          ${l.contact.phone && !l.demo ? `<a class="phone" href="tel:${esc(l.contact.phone)}" dir="ltr">📞 ${esc(l.contact.phone)}</a>` : ''}
          <label><span class="faint">מייל</span><input class="text-input ltr" type="email" data-lf="email" data-lid="${l.id}" value="${esc(l.contact.email)}" placeholder="מרשימת המארגנים"></label>
          <div class="field-row"><span class="faint">כפתורים</span><span>${tagged(l).map((b) => esc(b.label)).join(' · ') || '—'}</span></div>
          ${l.roleOf ? `<div class="field-row"><span class="faint">של מי</span><span>${esc(l.roleOf)}</span></div>` : ''}
          <div class="field-row"><span class="faint">ביקר בדוכן</span><span>${esc(H.heDate(new Date(l.at)))}${l.visits > 1 ? ' · ' + l.visits + ' פעמים' : ''} · נקלט ע"י ${esc(l.by)}</span></div>
          <div class="field-row"><span class="faint">קבצים</span><span>${l.files.map((f) => '📄 ' + esc(f.name)).join(' · ') || '—'}</span></div>
          <button class="btn" data-act="pick-file" data-lid="${l.id}">📄 לצרף קובץ</button><input id="lead-file" type="file" hidden data-lfile="${l.id}">
        </details>
      </div></div>`;
  }
  /** Open a lead's page. Inside the CRM it is a page; the name stays for the callers that used to open a sheet. */
  function sheetCRM(l) {
    closeSheet(false);
    callOpen = false;
    S.crmLead = l.id;
    if (S.phase !== 'live' || S.view !== 'crm') { S.phase = 'live'; S.view = 'crm'; }
    save(); render(); window.scrollTo(0, 0);
  }
  /** Only warmth and the buttons — the whole booth card has no place on the lead's page. */
  function sheetTags(l) {
    const w = effWarm(l);
    sheet(`<h2>${esc(People.rowName(l))} — כפתורים וחום</h2>
      <div class="warmth">${words().map((t, k) => `<button class="warm-btn w${k}" data-warm="${k}" data-lid="${l.id}" aria-pressed="${w === k}">${esc(t)}</button>`).join('')}</div>
      ${liveGroups().map((g) => `<div class="label">${esc(g.title)}</div><div class="chips">${groupButtons(g.id).map((b) => `<button class="chip" data-tag="${b.id}" data-lid="${l.id}" aria-pressed="${l.tags.includes(b.id)}">${esc(b.label)}</button>`).join('')}</div>`).join('')}
      <div class="actions"><button class="btn primary" data-act="back-crm" data-lid="${l.id}">סיום</button></div>`, l.id);
    $('#scrim .sheet').dataset.tags = '1';
  }
  function sheetRecMenu(l) {
    sheet(`<h2>${esc(People.rowName(l))}</h2>
      <div class="opts"><button class="opt" data-act="opt-out" data-lid="${l.id}">${l.optOut ? 'להחזיר לרשימת התפוצה' : 'ביקש להסיר — לא לשלוח לו הודעות'}<small>${l.optOut ? 'יחזור לקבל הודעות מהתבניות' : 'לא ייכלל בשליחה לקבוצה ובאוטומציות'}</small></button>
        <button class="opt danger" data-act="del-lead" data-lid="${l.id}">מחיקת הליד<small>נמחק מכל הרשימות</small></button></div>
      <div class="actions"><button class="btn ghost" data-act="sheet-close">סגירה</button></div>`);
  }

  /* After "we talked": one sheet — what was said, a step and a day. Nothing is
   * marked done until a step is chosen, and choosing one closes the old calls. */
  let TK = null;
  function sheetTalk(l, stay) {
    const seen = new Set();
    const opts = derived(l).filter((s) => s.type !== 'none' && !immediate(s))
      .concat([normStep({ type: 'call' }), normStep({ type: 'meet' }), normStep({ type: 'quote' }), normStep({ type: 'send', days: 1 })])
      .filter((s) => { if (seen.has(s.type)) return false; seen.add(s.type); return true; }).slice(0, 5);
    TK = { lid: l.id, opts, i: null, days: null, date: '', stay: !!stay };
    const today = new Date(now());
    const toSunday = ((7 - today.getDay()) % 7) || 7;
    sheet(`<h2>דיברנו עם ${esc(People.rowName(l))}. מה הלאה?</h2>
      <label class="label" for="tk-note">מה נאמר? <small>רשות</small></label><textarea id="tk-note" class="say small" placeholder="למשל: רוצה הצעה ל-300 איש, לפני פסח"></textarea>
      <div class="label">הצעד הבא</div>
      <div class="chips">${opts.map((s, i) => `<button class="chip" data-tkstep="${i}" aria-pressed="false">${STEPS[s.type].icon} ${esc(s.label)}</button>`).join('')}</div>
      <div class="label">מתי</div>
      <div class="chips">${[[1, 'מחר'], [toSunday, 'יום ראשון'], [7, 'בעוד שבוע']].map(([d, t]) => `<button class="chip" data-tkdays="${d}" aria-pressed="false">${t}</button>`).join('')}
        <label class="chip date-chip">תאריך… <input type="date" id="tk-date" aria-label="תאריך"></label></div>
      <div class="actions"><button class="btn primary" data-act="tk-save" id="tk-save" disabled>שמירה</button><button class="btn ghost" data-act="tk-back">חזרה</button></div>
      <div class="opts"><button class="opt" data-act="tk-won">🎉 בעצם נסגרה עסקה</button><button class="opt" data-act="tk-none">בלי המשך — להעביר לקהל</button></div>`, l.id);
    $('#scrim .sheet').dataset.guard = '1';
    $('#tk-date').addEventListener('change', (e) => { TK.date = e.target.value; TK.days = null; document.querySelectorAll('[data-tkdays]').forEach((x) => x.setAttribute('aria-pressed', 'false')); tkReady(); });
  }
  const tkReady = () => { const b = $('#tk-save'); if (b) b.disabled = TK.i == null; };
  function tkSave() {
    const l = leadById(TK.lid);
    if (!l || TK.i == null) return;
    const s = TK.opts[TK.i];
    const note = ($('#tk-note') && $('#tk-note').value.trim()) || '';
    // The call that was due is done, and so is every other "call him" — he has just been called.
    tasks(l).filter((t, i) => i === 0 || t.type === 'call').forEach((t) => l.done.push(t.key));
    const dueAt = TK.date ? H.addDays(new Date(TK.date + 'T09:00'), 0).getTime() : H.addDays(new Date(now()), TK.days || Math.max(1, s.days || 1), talk(s.type)).getTime();
    addManual(l, s, dueAt);
    if (note) l.notes.push({ id: 'n' + (S.nseq++), at: now(), text: note, audio: false, tr: '' });
    log(l, '📞 דיברנו — הלאה: ' + s.label + ' · ' + H.heDate(new Date(dueAt)) + (note ? ' · ' + note.slice(0, 60) : ''));
    if (l.stage === 'new') setStage(l, 'contact');
    if (s.type === 'quote' && ['new', 'contact'].includes(l.stage) && S.biz.stages.some((x) => x.id === 'quote')) setStage(l, 'quote');
    const stay = TK.stay;
    TK = null; rowOpen = null;
    save();
    if (stay) { closeSheet(false); render(); } else { render(); sheetCRM(l); }
    toast('✓ ' + s.label + ' · ' + dueText(new Date(dueAt)));
  }
  /** A call's outcome. With `stay`, from a row in the tasks list: the list stays, and the next row is ready. */
  function outcome(l, kind, stay) {
    const today = new Date(now());
    const cur = tasks(l)[0];
    callOpen = false;
    if (kind === 'talk') return sheetTalk(l, stay);
    rowOpen = null;
    if (kind === 'lost') {
      closeSheet(false);
      undoable('סומן "לא רלוונטי" · ' + People.rowName(l), () => setStage(l, (stageOf('lost') || {}).id || 'lost'));
      return render();
    }
    if (kind === 'noans') {
      l.noAnswer = (l.noAnswer || 0) + 1;
      if (l.noAnswer >= 3) { l.audience = true; log(l, '📞 לא ענה — פעם שלישית, עבר לקהל'); }
      else { if (cur) l.moved[cur.key] = H.addDays(today, 1, true).getTime(); log(l, "📞 לא ענה — ננסה ביום העבודה הבא"); }
      runRules('noanswer', l, l.noAnswer);
      if (stay) toast('📞 ' + People.rowName(l) + ' — לא ענה, ננסה מחר');
    }
    if (kind === 'won') {
      const sends = sendsOnStage(l, (stageOf('won') || {}).id);
      if (sends.length) { save(); return sheetMoveConfirm(l, (stageOf('won') || {}).id, sends); }
      setStage(l, (stageOf('won') || {}).id || 'won', 'אחרי שיחה');
      if (stay) toast('🎉 ' + People.rowName(l) + ' — נסגרה עסקה');
    }
    save();
    if (stay) return render();
    if (S.view === 'crm') render();
    sheetCRM(l);
  }

  // ---- demo: two weeks after the fair ----
  function seedProgress() {
    if (S.biz.team.length < 2) S.biz.team.push('יוסי');
    if (!S.biz.buttons.some((b) => b.value)) S.biz.buttons.forEach((b, i) => { b.value = [1500, 4000, 800, 12000, 2500, 6000][i % 6]; });
    const before = S.leads.length;
    seedDay();
    const rnd = (n) => Math.floor(Math.random() * n);
    const back = 9 * H.DAY;
    S.leads.slice(before).forEach((l) => {
      l.at -= back; l.log.forEach((e) => { e.at -= back; }); l.notes.forEach((n) => { n.at -= back; });
      upgradeLead(l);
      l.owner = S.biz.team[rnd(S.biz.team.length)];
      l.by = Math.random() < 0.7 ? 'בעלים' : 'עובד';
      l.contact = { phone: '050-000-' + String(1000 + rnd(9000)), email: 'demo' + l.id + '@example.com' };
      if (Math.random() < 0.3) l.value = [800, 1500, 2500, 4000, 7500, 12000, 20000][rnd(7)];
      const ev = (d, t) => l.log.push({ at: l.at + d * H.DAY + rnd(6) * 3600000, t });
      const r = Math.random();
      if (r < 0.75) ev(1, (Math.random() < 0.5 ? '📞 דיברנו' : '📎 מחירון — נשלח במייל'));
      if (r < 0.15) { l.stage = 'won'; l.won = true; ev(4, '➜ הצעה נשלחה'); ev(6, '➜ נסגר · אחרי שיחה'); l.done.push(...tasks(l).map((t) => t.key)); }
      else if (r < 0.25) { l.stage = 'lost'; l.lost = true; ev(3, '➜ לא רלוונטי'); }
      else if (r < 0.45) { l.stage = 'quote'; ev(3, '➜ הצעה נשלחה'); }
      else if (r < 0.55) { l.stage = 'nego'; ev(3, '➜ הצעה נשלחה'); ev(5, '➜ במשא ומתן'); }
      else if (r < 0.75) { l.stage = 'contact'; ev(2, '➜ בקשר'); }
      else if (Math.random() < 0.5) { l.noAnswer = 1 + rnd(2); for (let k = 0; k < l.noAnswer; k++) ev(2 + k, '📞 לא ענה — ננסה מחר'); }
      if (!l.won && !l.lost && r < 0.75) {
        tasks(l).forEach((t) => l.done.push(t.key));   // someone who was spoken to has one step ahead, not the old ones
        addManual(l, normStep({ type: ['call', 'meet', 'quote'][rnd(3)] }), H.addDays(new Date(now()), rnd(7) - 2).getTime());
      }
      l.log.sort((a, b) => a.at - b.at);
    });
    save();
  }

  // ---- settings: stages, team, morning message ----
  function viewCrmSettings(m) {
    const b = S.biz;
    m.innerHTML = `<h1>שלבים, צוות ובוקר</h1>
      <div class="stack" style="margin-top:14px">
        <section class="card"><h2>שלבי הצינור</h2><p class="muted">השמות שלך. "נסגר" ו"לא רלוונטי" קבועים בסוף.</p>
          <div class="step-list">${b.stages.map((s, i) => `<div class="stage-line"><input class="text-input" data-stname="${s.id}" value="${esc(s.name)}" aria-label="שם השלב">
            ${s.kind ? `<span class="faint">${s.kind === 'won' ? 'סגירה' : 'אבוד'}</span>` : `<button class="btn ghost" data-stmove="${i}:-1" aria-label="למעלה" ${i ? '' : 'disabled'}>▲</button><button class="btn ghost" data-stmove="${i}:1" aria-label="למטה" ${b.stages[i + 1] && !b.stages[i + 1].kind ? '' : 'disabled'}>▼</button><button class="btn ghost danger" data-stdel="${s.id}" aria-label="למחוק">✕</button>`}</div>`).join('')}</div>
          <div class="add-row"><input id="new-stage" class="text-input" placeholder="+ שלב חדש" autocomplete="off"><button class="btn" data-act="stage-add">הוספה</button></div></section>
        <section class="card"><h2>הצוות</h2><p class="muted">למי אפשר לשייך ליד. הראשון הוא אתה.</p>
          <div class="chips">${b.team.map((t, i) => `<span class="chip static">${esc(t)}${i ? ` <button class="link" data-teamdel="${i}" aria-label="להסיר">✕</button>` : ''}</span>`).join('')}</div>
          <div class="add-row"><input id="new-member" class="text-input" placeholder="+ שם" autocomplete="off"><button class="btn" data-act="team-add">הוספה</button></div></section>
        <section class="card"><div class="toggle-row"><div><h2>הודעת בוקר</h2><p class="muted">כל בוקר: מה לטיפול היום, ומה בצינור. נשלחת אליך מהמספר של מערכת הדוכן.</p></div>${toggle('digest', b.digest.on, 'הודעת בוקר')}</div>
          ${b.digest.on ? `<div class="label">לאן</div><div class="chips">${['wa', 'email', 'sms'].map((k) => `<button class="chip" data-digestch="${k}" aria-pressed="${b.digest.ch === k}">${CH_NAMES[k]}</button>`).join('')}</div>
          <div class="label">באיזו שעה</div><div class="chips">${['07:00', '08:00', '09:00', '10:00'].map((h) => `<button class="chip" data-digesth="${h}" aria-pressed="${b.digest.hour === h}">${h}</button>`).join('')}</div>` : ''}</section>
      </div>`;
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
    s.addEventListener('click', (e) => {
      if (e.target !== s) return;
      const sh = $('.sheet', s);
      // A sheet holding unsaved work is closed only by its own buttons. A note is kept, not thrown away.
      if (sh.dataset.guard) return toast('לשמור או לבטל — בכפתורים שבחלון');
      if (sh.dataset.note) {
        const l = leadById(+sh.dataset.lead);
        const typed = $('#note-text') && $('#note-text').value.trim();
        if (l && (typed || (rec && rec.lid === l.id && (rec.blob || rec.mr.state !== 'inactive')))) return saveNote(l);
      }
      closeSheet();
      if (S.phase === 'live' && S.view !== 'booth') render();
    });
    document.body.appendChild(s);
  }
  /** restart: give the booth panel its countdown back. Opening one sheet over another does not. */
  function closeSheet(restart) {
    if (rec) { stopRec(); rec = null; }
    const s = $('#scrim');
    const sh = s && $('.sheet', s);
    // A lead edited in a sheet (dashboard, CRM) sends what it queued when the sheet closes — unless its booth card is still open.
    if (sh && sh.dataset.lead && +sh.dataset.lead !== openId) flushSends(leadById(+sh.dataset.lead));
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
      <div class="join-mock"><div class="qr" aria-hidden="true"></div><div class="faint">הקישור יופיע כאן</div>
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
  let undoFn = null;
  /** A toast. With `undo`, it carries a "ביטול" button and stays six seconds — the way back from a one-tap action. */
  function toast(text, undo) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    undoFn = undo || null;
    t.innerHTML = `<span>${esc(text)}</span>${undo ? '<button class="toast-undo" data-act="toast-undo">ביטול</button>' : ''}`;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.remove(); undoFn = null; }, undo ? 6000 : 3200);
  }
  /** Run a change that a toast can take back: snapshot, change, offer undo. */
  function undoable(text, change) {
    const before = JSON.stringify(S);
    change();
    save();
    toast(text, () => { S = JSON.parse(before); save(); closeSheet(false); render(); toast('בוטל'); });
  }

  // ------------------------------------------------------------------
  // Typing, and clicks
  // ------------------------------------------------------------------
  document.addEventListener('input', (e) => {
    const d = e.target.dataset || {};
    if (d.roleof) { const l = leadById(+d.roleof); if (l) { l.roleOf = e.target.value.trim(); save(); } }
    if (d.eventdate) { const l = leadById(+d.eventdate); if (l) { l.eventDate = e.target.value; save(); } }
    if (d.acc) { S.account[d.acc] = e.target.value.trim(); save(); }
    if (d.bizname !== undefined) { S.biz.name = e.target.value.trim(); save(); renderTop(); }
    if (d.smsname !== undefined) { e.target.value = e.target.value.replace(/[^A-Za-z0-9 ]/g, ''); S.biz.smsName = e.target.value; save(); }
    if (d.mail) {
      if (d.mail === 'prefix') e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
      S.biz.mail[d.mail] = e.target.value.trim(); save();
      if ($('#mail-prev')) $('#mail-prev').textContent = mailPreview(S.biz.mail.prefix || 'info');
    }
    if (d.lf) {   // a field on the lead's CRM card, saved as typed
      const l = leadById(+d.lid);
      if (!l) return;
      if (d.lf === 'value') l.value = e.target.value === '' ? null : Math.max(0, +e.target.value);
      else l.contact[d.lf] = e.target.value.trim();
      save();
    }
    if (d.stname) { const s = S.biz.stages.find((x) => x.id === d.stname); if (s) { s.name = e.target.value.trim() || s.name; save(); } }
    if (d.rd === 'c.minValue') readRuleField(d.rd, e.target.value);
  });
  /* Selects, checkboxes and files report on "change". */
  document.addEventListener('change', (e) => {
    const t = e.target;
    const d = t.dataset || {};
    if (d.tbf) { S.tb.f[d.tbf] = t.value; tbPage = 0; tbSel.clear(); save(); return render(); }
    if (d.pv) { PV[d.pv] = t.value; return render(); }
    if (d.rd && d.rd !== 'c.minValue') return readRuleField(d.rd, t.value);
    if (d.lstage) { const l = leadById(+d.lstage); if (l) { setStage(l, t.value, 'ידני'); save(); render(); sheetCRM(l); } return; }
    if (d.lowner) { const l = leadById(+d.lowner); if (l) { l.owner = t.value; log(l, 'שויך ל' + t.value); save(); render(); } return; }
    if (d.ie) {   // a cell edited in the table — every change can be taken back
      const l = leadById(+d.lid);
      if (!l) return;
      tbEdit = null;
      if (d.ie === 'stage') { if (t.value !== l.stage) moveLead(l, t.value); else render(); return; }
      undoable('✓ ' + People.rowName(l) + ' עודכן', () => {
        if (d.ie === 'owner') { l.owner = t.value; log(l, 'שויך ל' + t.value); }
        if (d.ie === 'warm') { if (t.value === '') { l.warmBy = null; l.warmth = null; } else { l.warmth = +t.value; l.warmBy = 'hand'; } }
        if (d.ie === 'value') l.value = t.value === '' ? null : Math.max(0, +t.value);
      });
      return render();
    }
    if (d.grp) { grp[d.grp] = t.value; return render(); }
    if (d.scclosed !== undefined) { const list = SC.ids.map(leadById).filter(Boolean); return sheetSendConfirm(list, SC.tid, t.checked); }
    if (d.tbsel) { const id = +d.tbsel; if (t.checked) tbSel.add(id); else tbSel.delete(id); return render(); }
    if (d.tbselall !== undefined) {
      const rows = tableRows(leadsNow()).slice(tbPage * 25, tbPage * 25 + 25);
      rows.forEach((l) => (t.checked ? tbSel.add(l.id) : tbSel.delete(l.id)));
      return render();
    }
    if (d.lfile) {
      const l = leadById(+d.lfile);
      const f = t.files && t.files[0];
      if (l && f) { l.files.push({ name: f.name, at: now() }); log(l, '📄 צורף קובץ: ' + f.name); save(); refreshLead(l); toast('📄 ' + f.name + ' צורף'); }
    }
  });
  document.addEventListener('focusin', (e) => { if (e.target.closest && e.target.closest('.lead input')) stopIdle(); });
  document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('.lead input') && openId) setTimeout(startIdle, 0); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {   // Escape closes a sheet — unless it holds unsaved work, which has its own buttons
      const sh = document.querySelector('#scrim .sheet');
      if (sh && !sh.dataset.guard) { closeSheet(); if (S.phase === 'live' && S.view !== 'booth') render(); }
      return;
    }
    if (e.key !== 'Enter' || !e.target.dataset) return;
    if (e.target.dataset.newbtn) addButton(e.target.dataset.newbtn);
    if (e.target.id === 'new-group') addGroup();
  });
  function addGroup(std) {
    if (std) {
      S.biz.groups.push(Object.assign({ id: std, byHand: true }, STD[std]));
      S.biz.removedGroups = S.biz.removedGroups.filter((g) => g !== std);
    } else {
      const v = $('#new-group') && $('#new-group').value.trim();
      if (!v) return;
      S.biz.groups.push({ id: 'g' + (S.biz.bseq++), title: v, hint: '', multi: false, byHand: true });
    }
    save(); render();
  }

  document.addEventListener('submit', (e) => e.preventDefault());   // the ask box is a form only so Enter works
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) { const mn = $('#menu'); if (mn && !e.target.closest('#menu')) { mn.remove(); if (openId && $('#slot')) startIdle(); } return; }
    const d = b.dataset;
    if (!b.closest('#menu') && d.act !== 'menu') { const mn = $('#menu'); if (mn) mn.remove(); }
    if (openId && b.closest('.lead')) startIdle();
    const L = d.lid ? leadById(+d.lid) : null;

    if (d.view) { S.view = d.view; closeLead(); closeSheet(false); fillOpen = false; filled.clear(); save(); render(); return window.scrollTo(0, 0); }
    if (d.step) { S.step = d.step; openId = null; stopIdle(); save(); render(); return window.scrollTo(0, 0); }
    if (d.sub) { S.sub = d.sub; save(); return render(); }

    // ---- CRM ----
    if (d.crmtab) { S.crmTab = d.crmtab; S.crmLead = null; tbSel.clear(); save(); render(); return window.scrollTo(0, 0); }
    if (d.tl) { tlFilter = d.tl; return render(); }
    if (d.ietap) { tbEdit = d.lid + ':' + d.ietap; return render(); }
    if (d.rowcall) { rowOpen = rowOpen === +d.rowcall ? null : +d.rowcall; return render(); }
    if (d.rowout) { if (L) outcome(L, d.rowout, true); return; }
    if (d.mine !== undefined) { S.mine = d.mine === '1'; save(); return render(); }
    if (d.msgf) { msgFilter = d.msgf; return render(); }
    if (d.rulehits) {
      const r = S.biz.rules.find((x) => x.id === d.rulehits);
      tbIds = new Set(leadsNow().filter((l) => l.ruleHits && l.ruleHits[d.rulehits]).map((l) => l.id));
      tbIdsWhy = 'הכלל: ' + (r ? ruleText(r).then : '');
      S.tb.f = {}; tbQuery = ''; tbPage = 0; S.crmTab = 'table'; save(); render(); return window.scrollTo(0, 0);
    }
    if (d.tplvar) {
      const ta = $('#tp-text');
      if (!ta) return;
      const at = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
      ta.value = ta.value.slice(0, at) + d.tplvar + ta.value.slice(ta.selectionEnd == null ? at : ta.selectionEnd);
      ta.focus(); ta.setSelectionRange(at + d.tplvar.length, at + d.tplvar.length);
      return;
    }
    if (d.pmove) { const l = leadById(+d.pmove); if (l) sheetMove(l); return; }
    if (d.pstage) { if (L) { closeSheet(false); if (L.stage !== d.pstage) moveLead(L, d.pstage); } return; }
    if (d.tbsort) { const s = S.tb.sort; if (s.col === d.tbsort) s.dir = -s.dir; else { s.col = d.tbsort; s.dir = 1; } save(); return render(); }
    if (d.tbpage !== undefined) { tbPage = +d.tbpage; render(); return window.scrollTo(0, 0); }
    if (d.tbclear) { if (d.tbclear === 'all') { S.tb.f = {}; tbQuery = ''; } else S.tb.f[d.tbclear] = ''; tbPage = 0; save(); return render(); }
    if (d.tbview !== undefined) { const v = S.biz.views[+d.tbview]; if (v) { S.tb = clone(v.tb); tbPage = 0; save(); render(); toast('תצוגה: ' + v.name); } return; }
    if (d.tbcol) { const c = S.tb.cols; S.tb.custom = true; S.tb.cols = c.includes(d.tbcol) ? c.filter((x) => x !== d.tbcol) : COLS.map((x) => x.id).filter((x) => c.includes(x) || x === d.tbcol); save(); render(); return sheetCols(); }
    if (d.bulk) {
      if (d.bulk === 'clear') { tbSel.clear(); return render(); }
      if (d.bulk === 'export') return exportLeads(Array.from(tbSel).map(leadById).filter(Boolean), 'לידים-נבחרים');
      return sheetBulk(d.bulk);
    }
    if (d.bulkdo) return doBulk(d.bulkdo, d.v);
    if (d.pvshow) { S.tb.f = { [d.pvshow]: d.v }; S.crmTab = 'table'; tbPage = 0; save(); render(); return window.scrollTo(0, 0); }
    if (d.ruleedit) return sheetRule(d.ruleedit);
    if (d.tpledit) return sheetTemplate(d.tpledit);
    if (d.tpch) { document.querySelectorAll('[data-tpch]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return; }
    if (d.sendtpl) { if (L && sendTemplate(L, d.sendtpl)) { save(); render(); sheetCRM(L); } return; }
    if (d.stmove) {
      const [i, dir] = d.stmove.split(':').map(Number);
      const st = S.biz.stages;
      [st[i], st[i + dir]] = [st[i + dir], st[i]];
      save(); return render();
    }
    if (d.stdel) {
      const s = stageById(d.stdel);
      const n = S.leads.filter((l) => l.stage === s.id).length;
      undoable(`השלב "${s.name}" הוסר${n ? ` — ${n} לידים עברו ל"${S.biz.stages[0].id === s.id ? S.biz.stages[1].name : S.biz.stages[0].name}"` : ''}`, () => {
        S.biz.stages = S.biz.stages.filter((x) => x.id !== s.id);
        S.leads.forEach((l) => { if (l.stage === s.id) l.stage = S.biz.stages[0].id; });
      });
      return render();
    }
    if (d.teamdel !== undefined) { const name = S.biz.team[+d.teamdel]; undoable(name + ' הוסר מהצוות', () => { S.biz.team.splice(+d.teamdel, 1); S.leads.forEach((l) => { if (l.owner === name) l.owner = S.biz.team[0]; }); }); return render(); }
    if (d.digestch) { S.biz.digest.ch = d.digestch; save(); return render(); }
    if (d.digesth) { S.biz.digest.hour = d.digesth; save(); return render(); }

    if (d.ex) {
      const say = $('#say');
      if (say.value.trim() && say.value.trim() !== EXAMPLES[d.ex]) { exPending = d.ex; return sheetConfirm('להחליף את מה שכתבת?', 'הטקסט שכתבת על העסק יוחלף בדוגמה.', 'ex-yes'); }
      return useExample(d.ex);
    }
    if (d.goal) {   // a goal chip toggles: tapped once it is in the text, tapped again it is out
      const g = $('#goal');
      const parts = g.value.split(',').map((x) => x.trim()).filter(Boolean);
      const next = parts.includes(d.goal) ? parts.filter((x) => x !== d.goal) : parts.concat(d.goal);
      g.value = next.join(', '); S.biz.goal = g.value; save();
      b.setAttribute('aria-pressed', next.includes(d.goal));
      return renderSayActions();
    }
    if (d.addstd) return addGroup(d.addstd);
    if (d.editgroup) return sheetGroup(d.editgroup);
    if (d.egmulti !== undefined) { document.querySelectorAll('[data-egmulti]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return; }
    if (d.addbtn) return addButton(d.addbtn);
    if (d.editbtn) return sheetSteps({ kind: 'btn', id: d.editbtn });
    if (d.editstep !== undefined) { keepDraft(); const i = +d.editstep; return sheetStep({ title: 'צעד ' + (i + 1), step: D.steps[i], ctx: { kind: 'draft', i } }); }
    if (d.delstep !== undefined) { keepDraft(); D.steps.splice(+d.delstep, 1); return sheetSteps(); }
    if (d.steptype) {
      const was = STEPS[ES.type].label;
      ES.type = d.steptype;
      ES.days = STEPS[ES.type].days;
      const inp = $('#es-label');
      if (inp && (!inp.value.trim() || inp.value.trim() === was)) inp.value = STEPS[ES.type].label;
      document.querySelectorAll('[data-steptype]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.steptype === ES.type));
      return renderStepExtra();
    }
    if (d.esdays !== undefined) { ES.days = +d.esdays; return renderStepExtra(); }
    if (d.esmat !== undefined) { ES.mat = d.esmat; return renderStepExtra(); }
    if (d.esweight !== undefined) { D.weight = +d.esweight; document.querySelectorAll('[data-esweight]').forEach((x) => x.setAttribute('aria-pressed', +x.dataset.esweight === D.weight)); return; }
    if (d.toggle) {
      const k = d.toggle;
      if (k.startsWith('season:')) { const id = k.slice(7); const s = S.biz.seasons; S.biz.seasons = s.includes(id) ? s.filter((x) => x !== id) : s.concat(id); S.biz.seasonsByHand = true; }
      else if (k.startsWith('ch:')) { const c = k.slice(3); S.biz.channels[c] = !S.biz.channels[c]; }
      else if (k.startsWith('rule:')) { const r = S.biz.rules.find((x) => x.id === k.slice(5)); if (r) r.on = !r.on; }
      else if (k === 'digest') S.biz.digest.on = !S.biz.digest.on;
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
    if (d.reopen) { const l = leadById(+d.reopen); if (l) openLead(l); return; }
    if (d.tkstep !== undefined) { TK.i = +d.tkstep; document.querySelectorAll('[data-tkstep]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return tkReady(); }
    if (d.tkdays) { TK.days = +d.tkdays; TK.date = ''; if ($('#tk-date')) $('#tk-date').value = ''; document.querySelectorAll('[data-tkdays]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return tkReady(); }
    if (d.warm !== undefined) {
      const l = L || leadById(openId);
      if (!l) return;
      if (b.closest('.tag-row')) {   // filling in on the dashboard: the row stays, and the tap can be taken back
        filled.add(l.id);
        undoable(People.rowName(l) + ' · ' + words()[+d.warm], () => { l.warmth = +d.warm; l.warmBy = 'hand'; });
        return render();
      }
      l.warmth = +d.warm; l.warmBy = 'hand'; save(); refreshLead(l);   // sets, never toggles: a double tap must not undo it
      return;
    }
    if (d.tag) {
      const l = L || leadById(openId);
      const t = btnById(d.tag);
      if (!l || !t) return;
      if (b.closest('.tag-row')) filled.add(l.id);
      if (l.tags.includes(t.id)) { l.tags = l.tags.filter((x) => x !== t.id); unqueue(l, t); }
      else {
        const g = groupById(t.axis);
        if (!g || !g.multi) {
          l.tags.map(btnById).filter((o) => o && o.axis === t.axis).forEach((o) => unqueue(l, o));
          l.tags = l.tags.filter((x) => { const o = btnById(x); return !o || o.axis !== t.axis; });
        }
        l.tags.push(t.id);
        autoSend(l, t);
      }
      save(); refreshLead(l);
      return;
    }
    if (d.sendmat) { if (L) { doSend(L, d.sendmat); save(); sheetMaterials(L); refreshLead(L); } return; }
    if (d.openlead) { const l = leadById(+d.openlead); if (l) sheet(leadBody(l, true), l.id); return; }
    if (d.crmlead) { const l = leadById(+d.crmlead); if (l) sheetCRM(l); return; }
    if (d.outcome) { if (L) outcome(L, d.outcome); return; }
    if (d.play) return playNote(d.play);
    if (d.taskdone) {
      if (!L) return;
      const t = tasks(L).find((x) => x.key === d.taskdone);
      undoable('✓ ' + (t ? t.label : 'צעד') + ' — בוצע', () => {
        L.done.push(d.taskdone);
        log(L, '✓ ' + (t ? t.label : 'צעד') + ' — בוצע');
        if (t && t.type === 'quote' && ['new', 'contact'].includes(L.stage) && S.biz.stages.some((s) => s.id === 'quote')) setStage(L, 'quote', 'הצעה הוכנה');
      });
      const l2 = leadById(L.id);   // after undoable the state object is the same, but stay safe
      return afterTask(l2 || L);
    }
    if (d.tasksend) {
      if (!L) return;
      const t = tasks(L).find((x) => x.key === d.tasksend);
      const name = t && t.mat ? t.mat : S.biz.materials.length === 1 ? S.biz.materials[0].name : '';
      if (!name) return sheetMaterials(L);
      doSend(L, name); L.done.push(d.tasksend); save(); return afterTask(L);
    }
    if (d.taskedit) {
      if (!L) return;
      if (!$('#scrim')) tasksRet = 'page';   // editing from the lead's page: come back to the page, not to a sheet
      const t = tasks(L).find((x) => x.key === d.taskedit);
      if (!t) return;
      const days = Math.max(0, dayNo(t.due.getTime()) - dayNo(now()));
      return sheetStep({ title: 'שינוי: ' + t.label, step: Object.assign({}, t, { days }), ctx: { kind: 'task', lid: L.id, key: t.key } });
    }
    if (d.filter) { crmFilter = d.filter; crmQuery = ''; return render(); }
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
      case 'ai-code-save': { const v = ($('#ai-code') && $('#ai-code').value.trim()) || ''; try { localStorage.setItem(CODEKEY, v); } catch (er) { /* private window */ } closeSheet(false); return toast('נשמר. לחץ שוב על הכפתור.'); }
      case 'setup-next': {
        if (S.step === 'account') {
          if (!checkAccount()) { render(); const first = $('[aria-invalid="true"]'); if (first) first.focus(); return; }
        }
        if (S.step === 'biz' && !S.biz.buttons.length) { const say = $('#say'); if (say && say.value.trim()) applyReading(parseWords(say.value), say.value); }
        const i = SETUP.findIndex(([k]) => k === S.step);
        S.step = SETUP[i + 1][0]; save(); render(); return window.scrollTo(0, 0);
      }
      case 'go-live': {
        const n = S.leads.filter((l) => l.practice).length;
        return sheetConfirm('להתחיל את יום התערוכה?', n ? `${n} לידים של ניסיון יימחקו, וההגדרות נשארות.` : 'ההגדרות נשארות, ואפשר לשנות אותן מהתפריט ⋯.', 'go-live-yes');
      }
      case 'settings':
        if (worker()) return ownerOnly('ההגדרות');
        S.phase = 'settings'; S.step = 'custom'; openId = null; stopIdle(); save(); return render();
      case 'settings-done': S.phase = 'live'; save(); return render();
      case 'add-group': return addGroup();
      case 'save-group': {
        const g = groupById(d.id);
        if (!g) return;
        g.title = ($('#eg-title') && $('#eg-title').value.trim()) || g.title;
        g.hint = ($('#eg-hint') && $('#eg-hint').value.trim()) || '';
        const m = document.querySelector('[data-egmulti][aria-pressed="true"]');
        g.multi = !!m && m.dataset.egmulti === '1';
        g.byHand = true;
        save(); closeSheet(false); return render();
      }
      case 'del-group': return sheetConfirm('למחוק את הקבוצה?', 'הכפתורים שבה יימחקו, והסימונים שלהם יירדו מהלידים.', 'del-group-yes', `data-id="${d.id}"`);
      case 'del-group-yes': {
        const id = d.id;
        const gone = new Set(groupButtons(id).map((x) => x.id));
        groupButtons(id).forEach((x) => S.biz.removed.push(id + ':' + x.label));
        S.biz.buttons = S.biz.buttons.filter((x) => x.axis !== id);
        S.biz.groups = S.biz.groups.filter((g) => g.id !== id);
        if (STD[id]) S.biz.removedGroups.push(id);
        S.leads.forEach((l) => { l.tags = l.tags.filter((t) => !gone.has(t)); });
        save(); closeSheet(false); return render();
      }
      case 'edit-def': return sheetSteps({ kind: 'def' });
      case 'add-step': keepDraft(); D.steps.push(normStep({ type: 'call' })); return sheetStep({ title: 'צעד ' + D.steps.length, step: D.steps[D.steps.length - 1], ctx: { kind: 'draft', i: D.steps.length - 1, isNew: true } });
      case 'steps-cancel': D = null; closeSheet(false); return render();
      case 'save-steps': {
        keepDraft();
        if (D.kind === 'def') { S.biz.defSteps = D.steps; S.biz.defByHand = true; }
        else { const x = btnById(D.id); if (x) { x.label = D.label; x.steps = D.steps; x.weight = D.weight; x.value = D.value; x.byHand = true; x.unsure = false; } }
        D = null; save(); closeSheet(false); return render();
      }
      case 'save-step': {
        const s = readStep();
        const c = ES.ctx;
        if (c.kind === 'draft') { D.steps[c.i] = s; return sheetSteps(); }
        const l = leadById(c.lid);
        if (!l) return;
        if (c.key && !c.key.startsWith('m')) l.done.push(c.key);             // a step from a button: replaced by the lead's own
        if (c.key && c.key.startsWith('m')) l.manual = l.manual.filter((x) => x.key !== c.key);
        if (immediate(s)) { const name = s.mat || (S.biz.materials.length === 1 ? S.biz.materials[0].name : ''); if (name) doSend(l, name); else { save(); return sheetMaterials(l); } }
        else if (s.type === 'none') l.audience = true;
        else addManual(l, s, s.type === 'season' ? dueFor(s) : H.addDays(new Date(now()), Math.max(1, s.days || 0)).getTime());
        log(l, 'הלאה: ' + s.label);
        save();
        return afterTask(l);
      }
      case 'step-back': {
        const c = ES && ES.ctx;
        if (c && c.kind === 'draft') { if (c.isNew) D.steps.splice(c.i, 1); return sheetSteps(); }
        if (c && c.lid) return afterTask(leadById(c.lid));
        closeSheet(false); return render();
      }
      case 'del-btn': {
        const x = btnById(d.id);
        if (!x) return;
        D = null; closeSheet(false);
        undoable('הכפתור "' + x.label + '" הוסר', () => {
          S.biz.buttons = S.biz.buttons.filter((y) => y.id !== x.id);
          S.biz.removed.push(x.axis + ':' + x.label);
          S.leads.forEach((l) => { l.tags = l.tags.filter((id) => id !== x.id); });
        });
        return render();
      }
      case 'tasks': { if (L) sheetTasks(L, d.ret || (S.view === 'crm' && S.phase === 'live' ? 'crm' : null)); return; }
      case 'tasks-close': { if (L) backFromTasks(L); return; }
      case 'task-add': { if (L && !$('#scrim')) tasksRet = 'page'; if (L) sheetStep({ title: 'צעד חדש ל' + People.rowName(L), step: normStep({ type: 'call' }), ctx: { kind: 'task', lid: L.id, key: null } }); return; }
      case 'task-audience': { if (L) { L.audience = true; log(L, 'הועבר לקהל'); save(); backFromTasks(L); } return; }
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
      case 'del-mat': {
        const x = S.biz.materials[+d.i];
        if (!x) return;
        const using = S.biz.buttons.filter((y) => stepsOf(y).some((s) => s.mat === x.name)).length;
        undoable(`${x.name} הוסר${using ? ` — שימו לב: ${using} כפתורים שלחו אותו, ועכשיו ישאלו מה לשלוח` : ''}`, () => { S.biz.materials.splice(+d.i, 1); });
        return render();
      }
      case 'close-lead':
        if ($('#scrim')) { closeSheet(false); if (S.phase === 'live' && S.view !== 'booth') render(); return; }
        closeLead(); renderResults(''); if ($('#q') && FINE) $('#q').focus(); return;
      case 'undo-lead': {
        const l = L;
        if (!l) return;
        openId = null; stopIdle();
        undoable('לא נשמר · ' + People.rowName(l), () => { S.leads = S.leads.filter((x) => x.id !== l.id); });
        renderResults(''); updateFoot();
        return;
      }
      case 'toast-undo': { const f = undoFn; undoFn = null; if (f) f(); return; }
      case 'seed-progress': seedProgress(); return render();
      case 'record-back': S.crmLead = null; callOpen = false; save(); render(); return window.scrollTo(0, 0);
      case 'tl-auto': tlAuto = !tlAuto; return render();
      case 'tb-dense': S.tb.dense = !S.tb.dense; save(); return render();
      case 'ask': { e.preventDefault(); const q = $('#ask-q') && $('#ask-q').value.trim(); if (q) askData(q); return; }
      case 'ask-clear': ASK = null; return render();
      case 'ask-table': tbIds = new Set(ASK.ids); tbIdsWhy = 'מתוך התשובה לשאלה'; S.tb.f = {}; tbQuery = ''; tbPage = 0; S.crmTab = 'table'; S.crmLead = null; save(); render(); return window.scrollTo(0, 0);
      case 'ask-unfilter': tbIds = null; tbIdsWhy = ''; return render();
      case 'view-settings': {
        const vs = VIEW_SETTINGS[S.crmTab];
        if (!vs) return;
        if (vs[0] === 'cols') return sheetCols();
        if (worker()) return ownerOnly('ההגדרות');
        S.phase = 'settings'; S.step = 'custom'; S.sub = vs[0]; save(); render(); return window.scrollTo(0, 0);
      }
      case 'crm-settings': if (worker()) return ownerOnly('ההגדרות'); S.phase = 'settings'; S.step = 'custom'; S.sub = 'crm'; save(); return render();
      case 'tb-export': return exportLeads(tableRows(leadsNow()), 'לידים');
      case 'tb-cols': return sheetCols();
      case 'tb-saveview': return sheet(`<h2>לשמור את התצוגה</h2><p class="muted">הסינון, המיון והעמודות של עכשיו — בנגיעה אחת מעכשיו.</p>
        <label class="label" for="view-name">שם</label><input id="view-name" class="text-input" placeholder="למשל: מוסדות חמים" autocomplete="off">
        <div class="actions"><button class="btn primary" data-act="tb-saveview-yes">שמירה</button><button class="btn ghost" data-act="sheet-close">ביטול</button></div>`);
      case 'tb-saveview-yes': {
        const name = ($('#view-name') && $('#view-name').value.trim()) || 'תצוגה ' + (S.biz.views.length + 1);
        S.biz.views.push({ name, tb: clone(S.tb) });
        save(); closeSheet(false); render(); return toast('✓ נשמרה: ' + name);
      }
      case 'pv-export': {
        const rows = pivot(leadsNow());
        const D = dims()[PV.dim];
        return exportXlsx('פילוח-' + stamp() + '.xlsx', [{ name: 'פילוח', rows: [[D.t].concat(Object.values(METRICS))].concat(rows.map((r) => [r.label, r.count, Math.round(r.value), r.won, r.conv / 100, r.reached])) }]);
      }
      case 'rule-add': return sheetRule(null);
      case 'rule-save': {
        const r = RD;
        delete r.isNew;
        const i = S.biz.rules.findIndex((x) => x.id === r.id);
        if (i >= 0) S.biz.rules[i] = r; else S.biz.rules.push(r);
        RD = null; save(); closeSheet(false); render(); return toast('✓ הכלל נשמר');
      }
      case 'rule-del': { const id = RD.id; RD = null; closeSheet(false); undoable('הכלל נמחק', () => { S.biz.rules = S.biz.rules.filter((x) => x.id !== id); }); return render(); }
      case 'tpl-add': return sheetTemplate(null);
      case 'tpl-save': {
        const name = ($('#tp-name') && $('#tp-name').value.trim()) || 'תבנית';
        const text = ($('#tp-text') && $('#tp-text').value.trim()) || '';
        const ch = (document.querySelector('[data-tpch][aria-pressed="true"]') || {}).dataset;
        const t = d.id ? S.biz.templates.find((x) => x.id === d.id) : null;
        if (t) Object.assign(t, { name, text, ch: ch ? ch.tpch : t.ch });
        else S.biz.templates.push({ id: 't' + Date.now(), name, text, ch: ch ? ch.tpch : 'any' });
        save(); closeSheet(false); return render();
      }
      case 'tpl-del': { const id = d.id; closeSheet(false); undoable('התבנית נמחקה', () => { S.biz.templates = S.biz.templates.filter((x) => x.id !== id); }); return render(); }
      case 'grp-send': return sheetSendConfirm(grpList(), grp.tpl);
      case 'send-confirm': return sendConfirmed();
      case 'go-today': S.crmTab = 'tasks'; crmFilter = 'today'; crmQuery = ''; save(); render(); return window.scrollTo(0, 0);
      case 'view-noanswer': S.tb.f = { answer: 'none' }; tbIds = null; tbQuery = ''; tbPage = 0; S.crmTab = 'table'; save(); render(); return window.scrollTo(0, 0);
      case 'move-send': case 'move-hold': {
        if (!L) return;
        closeSheet(false);
        holdSends = d.act === 'move-hold';
        setStage(L, d.v, holdSends ? 'בלי לשלוח' : '');
        holdSends = false;
        save(); render();
        return toast(People.rowName(L) + ' ➜ ' + stageById(d.v).name + (d.act === 'move-send' ? ' · נשלח' : ' · בלי לשלוח'));
      }
      case 'rec-menu': { if (L) sheetRecMenu(L); return; }
      case 'opt-out': { if (!L) return; L.optOut = !L.optOut; log(L, L.optOut ? '🚫 ביקש להסיר מרשימת התפוצה' : 'חזר לרשימת התפוצה'); save(); closeSheet(false); render(); return toast(L.optOut ? 'לא יקבל יותר הודעות מהתבניות' : 'חזר לרשימת התפוצה'); }
      case 'pick-file': { const f = $('#lead-file'); if (f) f.click(); return; }
      case 'lead-msg': { if (L) sheetLeadMsg(L); return; }
      case 'back-crm': { if (L) sheetCRM(L); return; }
      case 'stage-add': {
        const v = $('#new-stage') && $('#new-stage').value.trim();
        if (!v) return;
        const at = S.biz.stages.findIndex((s) => s.kind);
        S.biz.stages.splice(at < 0 ? S.biz.stages.length : at, 0, { id: 's' + Date.now(), name: v });
        save(); return render();
      }
      case 'team-add': { const v = $('#new-member') && $('#new-member').value.trim(); if (v && !S.biz.team.includes(v)) { S.biz.team.push(v); save(); render(); } return; }
      case 'ex-yes': closeSheet(false); return useExample(exPending);
      case 'crm-clear': crmQuery = ''; return render();
      case 'tk-save': return tkSave();
      case 'tk-back': { const l = TK && leadById(TK.lid); TK = null; return l ? sheetCRM(l) : closeSheet(false); }
      case 'tk-won': { const l = TK && leadById(TK.lid); TK = null; if (l) outcome(l, 'won'); return; }
      case 'tk-none': {
        const l = TK && leadById(TK.lid);
        TK = null;
        if (!l) return;
        closeSheet(false);
        undoable('הועבר לקהל · ' + People.rowName(l), () => { l.audience = true; log(l, '📞 דיברנו — בלי המשך, לקהל'); });
        return render();
      }
      case 'go-live-yes':
        S.leads = S.leads.filter((l) => !l.practice);
        S.phase = 'live'; S.view = 'booth'; openId = null; stopIdle(); closeSheet(false); save(); render();
        return toast('יום התערוכה. בהצלחה!');
      case 'send-all': {
        const name = d.mat;
        const waiting = leadsNow().filter((l) => l.pendingMat);
        waiting.forEach((l) => doSend(l, name));
        save(); closeSheet(false); render();
        return toast(`📎 ${name} נשלח ל-${waiting.length}`);
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
        return sheet(`<h2>לשלוח ל-${waiting.length} שמחכים לחומר</h2>
          <div class="label">מה לשלוח</div>
          <div class="opts">${S.biz.materials.map((x) => `<button class="opt" data-act="send-all" data-mat="${esc(x.name)}">📎 ${esc(x.name)} — לשלוח ל-${waiting.length}<small>${esc(fillTpl('…', x.name))}</small></button>`).join('')}</div>
          <p class="faint" style="margin-top:8px">יוצא ב${esc(channelsOn().join(' + ') || '— אין ערוץ פעיל')}. מקבלים: ${esc(waiting.map((l) => People.rowName(l)).join(', '))}</p>
          <div class="actions"><button class="btn ghost" data-act="sheet-close">ביטול</button></div>`);
      }
      case 'note': { const l = L || leadById(openId); if (l) sheetNote(l, false); return; }
      case 'note-rec': { const l = L || leadById(openId); if (l) sheetNote(l, true); return; }
      case 'rec': { if (L) startRec(L); return; }
      case 'rec-stop': return stopRec();
      case 'note-save': { if (L) saveNote(L); return; }
      case 'note-cancel': closeSheet(); return;
      case 'fill-open': fillOpen = true; return render();
      case 'call': { callOpen = true; return render(); }
      case 'edit-tags': { if (L) sheetTags(L); return; }
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
      case 'reset-yes': S = fresh(); upgrade(); openId = null; D = null; stopIdle(); closeSheet(false); save(); return render();
    }
  });

  // Test hooks: the readers and the planner, checkable from the console.
  window.Demo3 = { parse: parseWords, clean: cleanAI, useServerAI: () => aiReady(serverAI), plan: (id) => plan(leadById(id)), tasks: (id) => tasks(leadById(id)), state: () => S };
  upgrade();
  render();
})();
