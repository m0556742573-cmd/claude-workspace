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

  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('sample').then((s) => { if (!s) return; ai = s; if ($('#say-actions')) renderSayActions(); else if (S.phase === 'live' && S.view !== 'booth') render(); }).catch(() => {});
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
    if (!bs.length && !l.sent.length && l.visits < 2 && !l.roleOf) return null;
    const score = bs.reduce((a, b) => a + (b.weight || 0), 0) + (l.sent.length ? 1 : 0) + (l.visits > 1 ? 2 : 0) + (l.roleOf ? 1 : 0);
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
  function dueOf(l, s) {
    if (l.moved[s.key]) return new Date(l.moved[s.key]);
    if (s.dueAt) return new Date(s.dueAt);
    if (s.type === 'season') return seasonDue() || H.addDays(new Date(l.at), 3);
    let days = s.days == null ? 2 : s.days;
    if (effWarm(l) === 0) days = Math.min(days, 1);
    return H.addDays(new Date(l.at), Math.max(1, days));
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
    return H.addDays(new Date(now()), Math.max(1, s.days || 0)).getTime();
  }

  // ------------------------------------------------------------------
  // Shell
  // ------------------------------------------------------------------
  const SETUP = [['account', 'הרשמה'], ['biz', 'העסק והמטרה'], ['connect', 'חיבורים'], ['custom', 'התאמה אישית'], ['try', 'ניסיון']];
  const SUBS = [['buttons', 'הכפתורים'], ['booth', 'החום והדוכן'], ['seasons', 'עונות'], ['materials', 'חומרים ונוסח']];
  const LIVE = [['booth', 'הדוכן'], ['dash', 'דשבורד'], ['crm', 'CRM']];
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
  // Setup 1 — registration
  // ------------------------------------------------------------------
  function viewAccount(m) {
    const a = S.account;
    m.innerHTML = `<section class="card narrow">
      <h1>ברוך הבא</h1>
      <p class="muted">נרשמים פעם אחת. אחר כך — כמה מילים על העסק, והמערכת מתאימה את עצמה אליך.</p>
      <div class="label">שם מלא</div><input class="text-input" data-acc="name" value="${esc(a.name)}" autocomplete="name">
      <div class="label">אימייל <small>לכאן יגיעו תשובות של לקוחות, אם לא תבחר אחרת</small></div>
      <input class="text-input ltr" type="email" data-acc="email" value="${esc(a.email)}" autocomplete="email" placeholder="name@example.com">
      <div class="label">טלפון <small>רשות</small></div><input class="text-input ltr" type="tel" data-acc="phone" value="${esc(a.phone)}" autocomplete="tel">
      <div class="label">שם העסק</div><input class="text-input" data-bizname value="${esc(S.biz.name)}" placeholder="למשל: נגריית הדר" autocomplete="organization">
      <p class="honest">בדוגמית הפרטים נשמרים רק בדפדפן הזה. אין חשבון אמיתי.</p>
    </section>`;
  }
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

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
        <p class="muted">לפי זה נקבע מי הכי חשוב לך, ומה עושים אחרי.</p>
        <textarea id="goal" class="say small" placeholder="למשל: לסגור אספקה קבועה עם מוסדות וקייטרינגים">${esc(S.biz.goal)}</textarea>
        <div class="examples">${GOALS.map((g) => `<button class="chip" data-goal="${esc(g)}">${esc(g)}</button>`).join('')}</div>
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
      : `<p class="honest">כאן הטקסט נקרא לפי רשימת מילים, שמזהה בערך רבע מהעסקים, ואת המטרה היא לא קוראת. בתוך קלוד — בינה מלאכותית קוראת את שניהם.</p>`;
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
    } else if (code === 'rate_limited') toast('יותר מדי בקשות. אפשר לנסות שוב בעוד רגע.');
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
  const toggle = (k, on) => `<button class="toggle" data-toggle="${k}" aria-pressed="${!!on}" aria-label="הפעלה"></button>`;
  function viewConnect(m) {
    const b = S.biz;
    const prefix = b.mail.prefix || 'info';
    m.innerHTML = `<h1>חיבורים</h1>
      <p class="muted">איך החומר והתשובות יוצאים למבקר. כל ערוץ פעיל יוצא <b>במקביל</b>, לא במקום השני.</p>
      <div class="stack" style="margin-top:14px">
        <section class="card"><div class="toggle-row"><div><h2>📧 מייל</h2><p class="muted">לכל מבקר יש מייל ברשימת המארגנים. יוצא מהמערכת, בשם העסק שלך.</p></div>${toggle('ch:email', b.channels.email)}</div>
          ${b.channels.email ? `<div class="label">הכתובת שממנה זה יוצא</div>
          <div class="mail-from ltr"><input class="text-input" data-mail="prefix" value="${esc(b.mail.prefix)}" placeholder="info" autocomplete="off" spellcheck="false"><span>@${MAIL_DOMAIN}</span></div>
          <div class="label">לאן יגיעו תשובות <small>ברירת המחדל: המייל שנרשמת איתו</small></div>
          <input class="text-input ltr" type="email" data-mail="replyTo" value="${esc(b.mail.replyTo)}" placeholder="${esc(S.account.email || 'name@example.com')}">
          <p class="faint" id="mail-prev" style="margin-top:8px">${esc(mailPreview(prefix))}</p>` : ''}</section>
        <section class="card"><div class="toggle-row"><div><h2>💬 SMS</h2><p class="muted">למי שיש לו מכשיר נוסף. לא צריך את המספר שלך.</p></div>${toggle('ch:sms', b.channels.sms)}</div>
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
    ({ buttons: viewButtons, booth: viewBoothSettings, seasons: viewSeasons, materials: viewMaterials }[S.sub] || viewButtons)($('#subview'));
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
        <span class="pn">${esc(x.label)}${x.unsure ? ' <span class="q">?</span>' : ''}${x.weight >= 2 ? ` <span class="wt" title="${esc(WEIGHT[x.weight])}">${'●'.repeat(x.weight)}</span>` : ''}</span>
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
      D = { kind: ctx.kind, id: ctx.id, label: x ? x.label : '', weight: x ? x.weight || 0 : 0, steps: (x ? stepsOf(x) : stepsOf(null)).map((s) => Object.assign({}, s)) };
    }
    const isBtn = D.kind === 'btn';
    sheet(`<h2>${isBtn ? esc(D.label) : 'מי שלא סומן לו כלום'}</h2>
      ${isBtn ? `<div class="label">שם הכפתור</div><input id="eb-name" class="text-input" value="${esc(D.label)}" autocomplete="off">` : ''}
      <div class="label">מה עושים אחר כך <small>אפשר כמה צעדים</small></div>
      <div class="step-list">${D.steps.map((s, i) => `<div class="step-line"><button class="prod-row" data-editstep="${i}"><span class="pn">${esc(stepText(s))}</span></button>
        <button class="btn ghost danger" data-delstep="${i}" aria-label="להסיר צעד">✕</button></div>`).join('') || '<div class="faint">אין צעד — מי שיסומן כאן ייכנס לקהל.</div>'}</div>
      <button class="chip add" data-act="add-step" style="margin-top:8px">+ צעד נוסף</button>
      ${isBtn ? `<div class="label">כמה פונה כזה שווה לך <small>מחמם את הליד לבד</small></div>
        <div class="chips">${WEIGHT.map((w, k) => `<button class="chip" data-esweight="${k}" aria-pressed="${D.weight === k}">${esc(w)}</button>`).join('')}</div>` : ''}
      <div class="actions"><button class="btn primary" data-act="save-steps">שמירה</button>
        ${isBtn ? `<button class="btn ghost danger" data-act="del-btn" data-id="${D.id}">להסיר את הכפתור</button>` : ''}</div>`);
  }
  const keepDraft = () => { if (D && $('#eb-name')) D.label = $('#eb-name').value.trim() || D.label; };

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
          <p class="muted">לפי מה שכבר סימנת: פונה ששווה לך הרבה (●●●), ביקש חומר, חזר לדוכן פעם שנייה. נגיעה אחת משנה, ומה שבחרת ביד נשאר.</p></div>${toggle('derive', b.derive)}</div></section>
        <section class="card"><h2>כמה זמן הכרטיס נשאר פתוח</h2><p class="muted">בלי נגיעה, הכרטיס נסגר לבד וחוזר לחיפוש. מה שסומן — נשמר.</p>
          <div class="chips">${[8, 12, 15, 20, 30].map((s) => `<button class="chip" data-idle="${s}" aria-pressed="${b.idleSec === s}">${s} שניות</button>`).join('')}</div></section>
        <section class="card"><div class="toggle-row"><div><h2>מי שכבר ביקר לא מופיע שוב בחיפוש</h2>
          <p class="muted">העסק שלו, או העסק של אשתו, מופיע כשורה נפרדת. מי שחוזר לדוכן — מסמנים מהשורה "ביקרו כבר", וזה מחמם אותו.</p></div>${toggle('hideVisited', b.hideVisited)}</div></section>
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
          return `<div class="season-row">${toggle('season:' + s.id, b.seasons.includes(s.id))}
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
  const newLead = (key, r) => ({ id: S.seq++, key, i: r.i, b: r.b, at: now(), created: Date.now(), visits: 1, warmth: null, warmBy: null, tags: [],
    eventDate: '', roleOf: '', sent: [], pendingMat: false, practice: practice(), log: [], done: [], moved: {}, manual: [], noAnswer: 0, audience: false, notes: [] });
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
    const datey = bs.some((b) => stepsOf(b).some((s) => s.type === 'date'));
    const roley = bs.some((b) => b.axis === 'who' && b.weight >= 2);
    const autoSent = bs.some((b) => stepsOf(b).some(immediate));
    const ts = tasks(l);
    const sendBtn = autoSent
      ? `<span class="sent-note">📎 ${l.sent.length ? 'נשלח: ' + esc(l.sent.join(', ')) : l.pendingMat ? 'ממתין לחומר' : 'יישלח'}</span>`
      : `<button class="btn" data-act="send" data-lid="${l.id}">${esc(l.sent.length ? '📎 נשלח: ' + l.sent.join(', ') : l.pendingMat ? '📎 ממתין לחומר' : '📎 שלח חומר')}</button>`;
    const last = l.notes[l.notes.length - 1];
    return `
      <div class="lead-head"><div><span class="nm">${esc(People.rowName(l))}</span>${l.b != null ? '<span class="badge biz">עסק</span>' : ''} <span class="muted">${esc(People.town(l))}</span>
        <div class="faint">${esc(People.rowMeta(l))}${l.visits > 1 ? ' · ביקר ' + l.visits + ' פעמים' : ''}${l.demo ? ' · מדומה' : ''}</div></div>
        <div class="head-acts">${!inSheet && Date.now() - l.created < 6000 && l.visits === 1 ? `<button class="btn ghost" data-act="undo-lead" data-lid="${l.id}">ביטול</button>` : ''}
          <button class="btn primary" data-act="close-lead">✓ סיום</button></div></div>
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
        <button class="btn" data-act="note-rec" data-lid="${l.id}">🎙️ הקלטה</button>
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
    if (sh && +sh.dataset.lead === l.id && !sh.dataset.tasks && !sh.dataset.note) { sh.innerHTML = sh.dataset.crm ? crmBody(l) : leadBody(l, true); return; }
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
    if (!ch.length) { l.pendingMat = true; toast('אין ערוץ שליחה פעיל. מפעילים ב"חיבורים".'); return; }
    l.sent.push(name); l.pendingMat = false;
    log(l, `📎 ${name} — ${S.biz.sendWhen === 'now' ? 'נשלח' : 'יישלח בערב'} ב${ch.join(' + ')}`);
    toast(`📎 ${name} ${S.biz.sendWhen === 'now' ? 'נשלח' : 'יישלח בערב'} ל${People.rowName(l)} · ${ch.join(' + ')}`);
  }
  /** A button whose step is "send at once" sends the moment it is tapped — its own material. */
  function autoSend(l, b) {
    stepsOf(b).filter(immediate).forEach((s) => {
      const mats = S.biz.materials;
      const name = s.mat && mats.some((x) => x.name === s.mat) ? s.mat : mats.length === 1 ? mats[0].name : '';
      if (name) doSend(l, name);
      else if (!l.pendingMat) { l.pendingMat = true; log(l, '📎 ממתין לחומר'); toast('📎 ' + (mats.length ? 'יש כמה חומרים — לבחור בצעד של הכפתור' : 'עוד אין חומר — סומן "ממתין לחומר"')); }
    });
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

  // ---- notes, typed or spoken ----
  let rec = null;   // { mr, chunks, blob, sr, tr, lid }
  function sheetNote(l, startNow) {
    sheet(`<h2>הערה על ${esc(People.rowName(l))}</h2>
      <textarea id="note-text" class="say small" placeholder="מה חשוב לזכור עליו"></textarea>
      <div class="actions"><button class="btn" data-act="rec" data-lid="${l.id}" id="rec-btn">🎙️ להקליט</button><span class="faint" id="rec-state"></span></div>
      <div class="tr-box" id="tr-box" hidden></div>
      <div class="actions"><button class="btn primary" data-act="note-save" data-lid="${l.id}">שמירה</button><button class="btn ghost" data-act="note-cancel">ביטול</button></div>
      ${notesList(l)}`, l.id);
    $('#scrim .sheet').dataset.note = '1';
    if (startNow) startRec(l); else if (FINE) setTimeout(() => $('#note-text') && $('#note-text').focus(), 30);
  }
  const notesList = (l) => (l.notes.length ? `<div class="label">הערות קודמות</div><ul class="log">${l.notes.slice().reverse().map((n) =>
    `<li><span class="when">${esc(H.heDate(new Date(n.at)))} ${new Date(n.at).toTimeString().slice(0, 5)}</span>${n.audio ? `<button class="btn ghost" data-play="${n.id}">▶ השמעה</button> ` : ''}${esc(n.text || '')}${n.tr ? `<div class="faint">תמלול: ${esc(n.tr)}</div>` : ''}</li>`).join('')}</ul>` : '');
  async function startRec(l) {
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast('המכשיר הזה לא מאפשר הקלטה.');
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return toast('אין גישה למיקרופון כאן. בטאבלט, בדפדפן רגיל, זה עובד.'); }
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
    const empty = L.filter((l) => effWarm(l) == null && !l.tags.length);
    if (empty.length) out.push({ fill: true, q: `${empty.length} בלי שום סימון. להשלים עכשיו, כל עוד זוכרים? בערך דקה.`, leads: empty });
    const waiting = L.filter((l) => l.pendingMat);
    if (waiting.length) out.push({ mat: true, q: `${waiting.length} מחכים לחומר${S.biz.materials.length ? '' : ', ועוד אין חומר'}.` });
    S.biz.buttons.map((b) => [b, L.filter((l) => l.tags.includes(b.id)).length, stepsOf(b).findIndex((s) => !immediate(s) && s.type !== 'none' && s.type !== 'season')])
      .filter(([, n, i]) => n >= 3 && i >= 0).sort((a, b) => b[1] - a[1]).slice(0, 2)   // the two busiest buttons; more is noise
      .forEach(([b, n, i]) => { const s = stepsOf(b)[i]; out.push({ days: b.id, idx: i, q: `${n} סימנו "${b.label}". ${s.label} — עד מתי?`, cur: s.days }); });
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
      `<button class="chip" data-btndays="${a.days}" data-i="${a.idx}" data-d="${d}" aria-pressed="${a.cur === d}">${t}</button>`).join('')}</div>`;
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
      const late = L.filter((l) => { const p = plan(l); return p.due && dayNo(p.due.getTime()) < t0; });
      if (late.length) out.push({ text: `${late.length} באיחור. להעביר את כולם למחר?`, leadIds: late.map((l) => l.id), action: { kind: 'shift' } });
      const held = L.filter((l) => plan(l).type === 'season');
      if (held.length) { const p = plan(held[0]); out.push({ text: `${held.length} שמורים ל${p.season || 'עונה'}. יחזרו אליך ב${H.label(p.due)}.`, leadIds: held.map((l) => l.id), action: null }); }
      const twice = L.filter((l) => l.noAnswer >= 2 && !l.sent.length && tasks(l).length);
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
  // CRM — every lead, by what is due
  // ------------------------------------------------------------------
  let crmFilter = null;      // null: today, or everything open when nothing is due today
  let crmQuery = '';
  function openTasks(L) {
    const score = (l) => { const p = plan(l); return (p.due ? p.due.getTime() : 9e15) - (effWarm(l) === 0 ? H.DAY / 2 : 0); };
    return L.filter((l) => tasks(l).length && plan(l).type !== 'season').sort((a, b) => score(a) - score(b));
  }
  function viewCRM(m) {
    const L = leadsNow();
    const t0 = dayNo(now());
    const due = (l) => { const p = plan(l); return p.due ? dayNo(p.due.getTime()) - t0 : null; };
    const groups = {
      today: openTasks(L).filter((l) => due(l) <= 0),
      week: openTasks(L).filter((l) => due(l) > 0 && due(l) <= 7),
      all: openTasks(L),
      season: L.filter((l) => plan(l).type === 'season'),
      audience: L.filter((l) => !l.lost && !l.won && !tasks(l).length),
      won: L.filter((l) => l.won),
    };
    const late = groups.today.filter((l) => due(l) < 0).length;
    const names = { today: 'היום', week: 'השבוע', all: 'כל הפתוחים', season: 'לעונה', audience: 'קהל', won: 'נסגרו' };
    const f = crmFilter || (groups.today.length ? 'today' : 'all');
    const q = People.norm(crmQuery);
    const list = groups[f].filter((l) => !q || People.norm(People.rowName(l) + ' ' + tagged(l).map((b) => b.label).join(' ') + ' ' + l.roleOf + ' ' + l.notes.map((n) => n.text).join(' ')).includes(q));
    m.innerHTML = `<div class="crm-head"><h1>CRM</h1>
        <span class="date-now">היום: ${esc(H.label(new Date(now())))} <button class="btn ghost" data-act="next-day">⏩ יום הבא (הדגמה)</button>${S.shift ? '<button class="btn ghost" data-act="today">לחזור להיום</button>' : ''}</span></div>
      <div class="stats">${Object.keys(names).map((k) => `<button class="stat${k === 'today' && late ? ' bad' : ''}" data-filter="${k}" aria-pressed="${f === k}"><span class="n">${groups[k].length}</span><span class="t">${names[k]}${k === 'today' && late ? ' · ' + late + ' באיחור' : ''}</span></button>`).join('')}</div>
      <input id="crm-q" class="text-input" placeholder="חיפוש לפי שם, כפתור, מוסד או הערה" value="${esc(crmQuery)}" autocomplete="off">
      <div style="margin-top:10px">${crmRows(list) || `<div class="empty">אין כאן אף אחד${L.length ? '' : ' — עוד לא נקלטו לידים'}.</div>`}</div>
      ${insightsBox('crm', 'מה כדאי לעשות')}`;
    $('#crm-q').addEventListener('input', (e) => { crmQuery = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#crm-q'); n.focus(); n.setSelectionRange(pos, pos); });
  }
  function crmRows(list) {
    if (!list.length) return '';
    return `<div class="rows">${list.map((l) => {
      const p = plan(l);
      const w = effWarm(l);
      const more = tasks(l).length - 1;
      const why = [w != null ? words()[w] : 'בלי חום'].concat(tagged(l).map((b) => b.label), l.roleOf ? [l.roleOf] : [], l.visits > 1 ? ['חזר לדוכן'] : [], l.noAnswer ? ['לא ענה ×' + l.noAnswer] : [], l.notes.length ? ['📝 ' + l.notes.length] : [], l.won ? ['🎉 נסגר'] : []).join(' · ');
      return `<button class="row" data-crmlead="${l.id}"><span><span class="dot w${w == null ? '' : w}"></span><span class="nm">${esc(People.rowName(l))}</span>${l.b != null ? '<span class="badge biz">עסק</span>' : ''} <span class="muted">${esc(People.town(l))}</span>${l.demo ? ' <span class="faint">· מדומה</span>' : ''}</span>
        <span class="due">${planHTML(p)}${more > 0 ? ` <span class="faint">· ועוד ${more}</span>` : ''}</span><span class="why">${esc(why)}</span></button>`;
    }).join('')}</div>`;
  }
  let callOpen = false;
  function crmBody(l) {
    const ts = tasks(l);
    return `<div class="lead-head"><div><span class="nm">${esc(People.rowName(l))}</span>${l.b != null ? '<span class="badge biz">עסק</span>' : ''} <span class="muted">${esc(People.town(l))}</span>
        <div class="faint">${esc(People.rowMeta(l))}</div></div><button class="btn" data-act="sheet-close">סגירה</button></div>
      <button class="next-line" data-act="tasks" data-lid="${l.id}" data-ret="crm"><span class="faint">הלאה:</span> ${planHTML(plan(l))}${ts.length > 1 ? ` <span class="faint">· ועוד ${ts.length - 1}</span>` : ''}</button>
      <div class="actions"><button class="btn primary" data-act="call" data-lid="${l.id}">📞 להתקשר עכשיו</button>
        <button class="btn" data-act="send" data-lid="${l.id}">📎 לשלוח חומר</button>
        <button class="btn" data-act="note" data-lid="${l.id}">📝 הערה</button>
        <button class="btn" data-act="edit-tags" data-lid="${l.id}">✎ תיוג</button></div>
      ${callOpen ? `<div class="mini"><div class="label" style="margin-top:0">איך היה?</div><div class="chips">
        <button class="chip" data-outcome="talk" data-lid="${l.id}">דיברנו — מה הלאה</button>
        <button class="chip" data-outcome="noans" data-lid="${l.id}">לא ענה</button>
        <button class="chip" data-outcome="won" data-lid="${l.id}">🎉 נסגרה עסקה</button>
        <button class="chip" data-outcome="lost" data-lid="${l.id}">לא רלוונטי</button></div>
        <div class="faint" style="margin-top:6px">במערכת האמיתית — החיוג יוצא מכאן, והתוצאה נשאלת כשהשיחה נגמרת.</div></div>` : ''}
      ${notesList(l)}
      <div class="label">מה היה עד עכשיו</div>
      <ul class="log">${l.log.slice().reverse().map((e) => `<li><span class="when">${esc(H.heDate(new Date(e.at)))} ${new Date(e.at).toTimeString().slice(0, 5)}</span>${esc(e.t)}</li>`).join('')}</ul>`;
  }
  function sheetCRM(l) { callOpen = false; sheet(crmBody(l), l.id, true); }
  function outcome(l, kind) {
    const today = new Date(now());
    const cur = tasks(l)[0];
    callOpen = false;
    if (kind === 'talk') {
      if (cur) l.done.push(cur.key);
      log(l, '📞 דיברנו' + (cur ? ' — ' + cur.label + ' בוצע' : ''));
      save();
      return sheetTasks(l, 'crm', 'דיברנו. מה הלאה?');
    }
    if (kind === 'noans') {
      l.noAnswer = (l.noAnswer || 0) + 1;
      if (l.noAnswer >= 3) { l.audience = true; log(l, '📞 לא ענה — פעם שלישית, עבר לקהל'); }
      else { if (cur) l.moved[cur.key] = H.addDays(today, 1).getTime(); log(l, '📞 לא ענה — ננסה מחר'); }
    }
    if (kind === 'won') {
      l.won = true;
      tasks(l).forEach((t) => l.done.push(t.key));
      const regular = tagged(l).some((b) => stepsOf(b).some((s) => s.type === 'regular')) || S.biz.buttons.some((b) => stepsOf(b).some((s) => s.type === 'regular'));
      if (regular) addManual(l, { type: 'regular', label: 'לבדוק אם צריך עוד', days: 28 }, H.addDays(today, 28).getTime());
      log(l, '🎉 נסגרה עסקה' + (regular ? ' — בדיקה חוזרת בעוד 4 שבועות' : ''));
    }
    if (kind === 'lost') { l.lost = true; log(l, 'לא רלוונטי'); }
    save();
    if (S.view === 'crm') render();
    sheetCRM(l);
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
    if (rec) { stopRec(); rec = null; }
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
    if (d.acc) { S.account[d.acc] = e.target.value.trim(); save(); }
    if (d.bizname !== undefined) { S.biz.name = e.target.value.trim(); save(); renderTop(); }
    if (d.smsname !== undefined) { e.target.value = e.target.value.replace(/[^A-Za-z0-9 ]/g, ''); S.biz.smsName = e.target.value; save(); }
    if (d.mail) {
      if (d.mail === 'prefix') e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
      S.biz.mail[d.mail] = e.target.value.trim(); save();
      if ($('#mail-prev')) $('#mail-prev').textContent = mailPreview(S.biz.mail.prefix || 'info');
    }
  });
  document.addEventListener('focusin', (e) => { if (e.target.closest && e.target.closest('.lead input')) stopIdle(); });
  document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('.lead input') && openId) setTimeout(startIdle, 0); });
  document.addEventListener('keydown', (e) => {
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

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) { const mn = $('#menu'); if (mn && !e.target.closest('#menu')) { mn.remove(); if (openId && $('#slot')) startIdle(); } return; }
    const d = b.dataset;
    if (!b.closest('#menu') && d.act !== 'menu') { const mn = $('#menu'); if (mn) mn.remove(); }
    if (openId && b.closest('.lead')) startIdle();
    const L = d.lid ? leadById(+d.lid) : null;

    if (d.view) { S.view = d.view; openId = null; stopIdle(); closeSheet(false); fillOpen = false; save(); render(); return window.scrollTo(0, 0); }
    if (d.step) { S.step = d.step; openId = null; stopIdle(); save(); render(); return window.scrollTo(0, 0); }
    if (d.sub) { S.sub = d.sub; save(); return render(); }
    if (d.ex) { const t = EXAMPLES[d.ex]; $('#say').value = t; S.biz.by = null; understandWords(t); return; }
    if (d.goal) { const g = $('#goal'); g.value = g.value.trim() ? g.value.trim() + ', ' + d.goal : d.goal; S.biz.goal = g.value; save(); return renderSayActions(); }
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
        const g = groupById(t.axis);
        if (!g || !g.multi) l.tags = l.tags.filter((x) => { const o = btnById(x); return !o || o.axis !== t.axis; });
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
    if (d.taskdone) { if (L) { const t = tasks(L).find((x) => x.key === d.taskdone); L.done.push(d.taskdone); log(L, '✓ ' + (t ? t.label : 'צעד') + ' — בוצע'); save(); sheetTasks(L, tasksRet); } return; }
    if (d.tasksend) {
      if (!L) return;
      const t = tasks(L).find((x) => x.key === d.tasksend);
      const name = t && t.mat ? t.mat : S.biz.materials.length === 1 ? S.biz.materials[0].name : '';
      if (!name) return sheetMaterials(L);
      doSend(L, name); L.done.push(d.tasksend); save(); return sheetTasks(L, tasksRet);
    }
    if (d.taskedit) {
      if (!L) return;
      const t = tasks(L).find((x) => x.key === d.taskedit);
      if (!t) return;
      const days = Math.max(0, dayNo(t.due.getTime()) - dayNo(now()));
      return sheetStep({ title: 'שינוי: ' + t.label, step: Object.assign({}, t, { days }), ctx: { kind: 'task', lid: L.id, key: t.key } });
    }
    if (d.btndays) { const t = btnById(d.btndays); if (t) { const ss = stepsOf(t); ss[+d.i].days = +d.d; t.steps = ss; save(); render(); } return; }
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
        if (S.step === 'account') {
          if (!S.account.name) return toast('מה השם שלך?');
          if (!emailOk(S.account.email)) return toast('צריך אימייל תקין — לשם יגיעו התשובות');
        }
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
      case 'save-steps': {
        keepDraft();
        if (D.kind === 'def') { S.biz.defSteps = D.steps; S.biz.defByHand = true; }
        else { const x = btnById(D.id); if (x) { x.label = D.label; x.steps = D.steps; x.weight = D.weight; x.byHand = true; x.unsure = false; } }
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
        return sheetTasks(l, tasksRet);
      }
      case 'step-back': {
        const c = ES && ES.ctx;
        if (c && c.kind === 'draft') { if (c.isNew) D.steps.splice(c.i, 1); return sheetSteps(); }
        if (c && c.lid) return sheetTasks(leadById(c.lid), tasksRet);
        closeSheet(false); return render();
      }
      case 'del-btn': {
        const x = btnById(d.id);
        if (!x) return;
        S.biz.buttons = S.biz.buttons.filter((y) => y.id !== x.id);
        S.biz.removed.push(x.axis + ':' + x.label);
        S.leads.forEach((l) => { l.tags = l.tags.filter((id) => id !== x.id); });
        D = null; save(); closeSheet(false); return render();
      }
      case 'tasks': { if (L) sheetTasks(L, d.ret || (S.view === 'crm' && S.phase === 'live' ? 'crm' : null)); return; }
      case 'tasks-close': { if (L) backFromTasks(L); return; }
      case 'task-add': { if (L) sheetStep({ title: 'צעד חדש ל' + People.rowName(L), step: normStep({ type: 'call' }), ctx: { kind: 'task', lid: L.id, key: null } }); return; }
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
        leadsNow().filter((l) => l.pendingMat).forEach((l) => doSend(l, S.biz.materials[0].name));
        save(); return render();
      }
      case 'note': { const l = L || leadById(openId); if (l) sheetNote(l, false); return; }
      case 'note-rec': { const l = L || leadById(openId); if (l) sheetNote(l, true); return; }
      case 'rec': { if (L) startRec(L); return; }
      case 'rec-stop': return stopRec();
      case 'note-save': { if (L) saveNote(L); return; }
      case 'note-cancel': closeSheet(); return;
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
      case 'reset-yes': S = fresh(); openId = null; D = null; stopIdle(); closeSheet(false); save(); return render();
    }
  });

  // Test hooks: the readers and the planner, checkable from the console.
  window.Demo3 = { parse: parseWords, clean: cleanAI, plan: (id) => plan(leadById(id)), tasks: (id) => tasks(leadById(id)), state: () => S };
  render();
})();
