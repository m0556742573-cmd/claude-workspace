/* Expo leads — demo 3: three moments, almost no settings.
 *
 * A setting is a small failure: a question the system asks because it could
 * not work the answer out. So there is no settings form. There are three
 * moments, and each setting arrives at the one where it means something:
 *
 *   1. Before the fair — "what do you sell?" in one sentence, and/or the
 *      products typed one by one. The booth buttons, a next step per product
 *      in the exhibitor's own words, and the season are inferred and shown as
 *      a live preview to correct.
 *   2. At the booth — nothing configured in advance. Material to send is asked
 *      for on the first send, grade names on a long press, a role the first
 *      time one is tagged, a second tablet when it opens the link.
 *   3. The first evening — first fill in what is missing, then a few questions
 *      that only make sense once there are numbers.
 *
 * Reading the sentence: inside a Claude viewer the page asks Claude (the
 * `sample` capability). Anywhere else — a static host — it falls back to a
 * word list, which was measured on 200 real community businesses and
 * understood about a quarter of them. That number is why the word list is
 * only the fallback, and why every product stays editable by hand.
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

  /** The word-list reader. Returns what it understood and what it did not. */
  function parseWords(text) {
    const products = [];
    const unclear = [];
    const dropped = [];
    const trades = {};
    const seasons = {};
    const add = (name, entry, unsure) => {
      const key = name.replace(PRICE_RE, ' ').replace(/\s+/g, ' ').trim();
      if (!key || products.some((p) => p.name === key)) return;
      if (products.length >= 8) { dropped.push(key); return; }
      products.push({ name: key, next: entry ? entry.next : null, opts: entry ? [entry.next] : [], unsure: !!unsure });
      if (entry && entry.trade) { trades[entry.trade] = (trades[entry.trade] || 0) + 1; if (entry.season) seasons[entry.trade] = entry.season; }
    };
    let institutions = INST_RE.test(text);
    const pieces = String(text || '').split(/[,،;\n]+|\sוגם\s/).map((s) => s.trim()).filter(Boolean);
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
    const trade = Object.keys(trades).sort((a, b) => trades[b] - trades[a])[0] || '';
    return { products, trade, season: seasons[trade] || null, institutions, unclear, dropped, by: 'words' };
  }

  // ------------------------------------------------------------------
  // The Claude reader — used whenever the page runs inside a Claude viewer.
  // ------------------------------------------------------------------
  let ai = null;
  const PROMPT = (text) => `You help an exhibitor at a Hasidic community business fair in Israel set up a lead-capture tablet.
He answered "what do you sell?" in Hebrew:
"""${text.slice(0, 1500)}"""

Reply with ONLY one JSON object, all strings in Hebrew:
{"products":[{"name":"...","next":"...","options":["...","..."]}],"trade":"...","season":null,"institutions":false,"unclear":[]}

Rules:
- products: what he sells, as short buttons in HIS words (1-3 words), at most 8. ONLY things he actually named. Never add a product or service he did not say.
- Audiences and occasions are NOT products: לבתים, לעסקים, למוסדות, לבתי כנסת, לאירועים, לשמחות, "לכל מי שצריך". They tell you who buys, nothing more.
- Read community Hebrew correctly: "מזונות" = pastries and cakes (the mezonot blessing), not food or catering. "משווק", "סוכן", "מפיץ", "יבואן" = he sells goods made by others (a distributor), he does not produce or cook them. "בוטיק" = small premium makers.
- Drop prices and filler ("אני מוכר", "אני משווק").
- next: what HE does next with a visitor interested in that product, 2-4 Hebrew words, specific to his business and his role (a distributor sends a price list, arranges a tasting or a regular supply; he does not "measure" or "cook"). Examples of the form: "לשלוח מחירון", "לתאם טעימה", "להציע אספקה קבועה", "לבדוק תאריך". Never something that does not fit his business.
- options: 2-3 other next steps that fit THIS business.
- trade: his trade in 1-4 Hebrew words, including his role when he said it (e.g. "סוכן מאפיות בוטיק", not "קייטרינג").
- season: the period of the Jewish year when his business is busiest, only if clearly so, from: "לפני פסח", "לפני ראש השנה", "אלול–תשרי", "לפני סוכות", "בין הזמנים", "עונת החתונות", "חנוכה", "פורים", "לפני הקיץ"; otherwise null.
- institutions: true if he sells to institutions, shuls, yeshivas, schools or community groups.
- unclear: parts of his sentence you could not understand.`;

  // A product whose main word is not in his sentence was invented: keep it, but marked "?".
  const saidIt = (name, text) => {
    const w = fin(name.split(/\s+/)[0] || '');
    const t = fin(text);
    return !w || t.includes(w) || (w.length > 3 && t.includes(w.slice(0, -2)));
  };

  function cleanAI(r, text) {
    if (!r || !Array.isArray(r.products)) throw { code: 'invalid_json' };
    const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
    const products = r.products.slice(0, 8).map((p) => {
      const name = str(p && p.name, 30);
      return {
        name, next: str(p && p.next, 30) || null,
        opts: Array.isArray(p && p.options) ? p.options.map((o) => str(o, 30)).filter(Boolean).slice(0, 3) : [],
        unsure: !saidIt(name, text),
      };
    }).filter((p) => p.name);
    return {
      products, trade: str(r.trade, 30), season: str(r.season, 30) || null, institutions: r.institutions === true,
      unclear: Array.isArray(r.unclear) ? r.unclear.map((u) => str(u, 40)).filter(Boolean) : [], dropped: [], by: 'ai',
    };
  }

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  const KEY = 'expo-demo3b';
  const DEVKEY = 'expo-demo3-device';   // staff mode belongs to THIS tablet, not to the business
  const GRADES = {
    classic: { name: 'הקלאסי', words: ['חם', 'פושר', 'קר'] },
    serious: { name: 'לפי רצינות', words: ['רציני', 'אולי', 'סתם'] },
    time:    { name: 'לפי זמן', words: ['עכשיו', 'בהמשך', 'לא כרגע'] },
    plain:   { name: 'במילים פשוטות', words: ['מעניין מאוד', 'מעניין', 'רק עבר'] },
  };
  const DEFAULT_ROLES = ['גבאי בית כנסת', 'גבאי קבוצה', 'מנהל מוסד', 'ועד הורים', 'מארגן אירוע', 'אחראי רכש'];
  const EXAMPLES = {
    'נגר': 'מטבחים, ארונות קיר ודלתות פנים, גם למוסדות',
    'דפוס': 'הזמנות לחתונות, חוברות ושילוט לעסקים',
    'הפעלות': 'הפעלות חוויתיות וטיולים לקבוצות ולמוסדות',
    'דגים': 'דגים טריים ומעושנים, משלוחים לבתים ולמוסדות',
  };
  function fresh() {
    return {
      stage: 'onboard', ready: false,
      biz: {
        name: '', said: '', parsedFrom: null, products: [], removed: [], trade: '', season: null, institutions: false,
        unclear: [], dropped: [], by: null, materials: [], matDeclined: false, grades: 'classic', roles: [], devices: 1, learned: {},
      },
      leads: [], seq: 1, answered: {}, rules: { boostRoles: false, holdForSeason: false },
    };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
  let DEV;
  try { DEV = JSON.parse(localStorage.getItem(DEVKEY)) || { staff: false }; } catch (e) { DEV = { staff: false }; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(DEVKEY, JSON.stringify(DEV)); } catch (e) { /* private window */ } };
  const words = () => GRADES[S.biz.grades].words;
  const learn = (what, when) => { S.biz.learned[what] = when; };
  const leadById = (id) => S.leads.find((l) => l.id === id);
  const ownerOnly = (what) => { toast('🔒 ' + what + ' — רק לבעלים'); };

  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('sample').then((s) => { if (s) { ai = s; if (S.stage === 'onboard') renderSayActions(); } }).catch(() => {});
  }

  // ------------------------------------------------------------------
  // Shell
  // ------------------------------------------------------------------
  function render() {
    renderTop();
    const m = $('#main');
    if (S.stage === 'onboard') return viewOnboard(m);
    if (S.stage === 'booth') return viewBooth(m);
    if (S.stage === 'evening') return viewEvening(m);
    if (S.stage === 'know') return viewKnow(m);
  }
  function renderTop() {
    const st = S.stage;
    $('#top').innerHTML = `<div class="top-in">
      <div class="brand">${esc(S.biz.name || 'הדוכן שלי')}</div>
      <nav class="moments" aria-label="שלושת הרגעים">
        ${[['onboard', '1', 'לפני'], ['booth', '2', 'בדוכן'], ['evening', '3', 'בערב']].map(([k, n, t]) =>
          `<button class="moment" data-go="${k}" aria-current="${st === k}" ${(k !== 'onboard' && !S.ready) || (k === 'onboard' && DEV.staff) ? 'disabled' : ''}><span class="n">${n}</span>${t}</button>`).join('')}
      </nav>
      ${DEV.staff ? '<span class="lock">🔒 מצב עובד</span>' : ''}
      <button class="icon-btn" data-act="menu" aria-label="תפריט">⋯</button>
    </div>`;
  }

  // ------------------------------------------------------------------
  // Moment 1 — one sentence, or products one by one
  // ------------------------------------------------------------------
  function viewOnboard(m) {
    m.innerHTML = `<div class="onb">
      <section class="card">
        <h1>מה אתה מוכר?</h1>
        <p class="muted">תכתוב כמו שהיית אומר ללקוח. את השאר נסדר לבד, ותוכל לתקן כל דבר.</p>
        <textarea id="say" class="say" placeholder="למשל: מטבחים, ארונות קיר ודלתות פנים, גם למוסדות">${esc(S.biz.said)}</textarea>
        <div id="say-actions"></div>
        <div class="examples"><span class="faint">דוגמה:</span>
          ${Object.keys(EXAMPLES).map((k) => `<button class="chip" data-ex="${esc(k)}">${esc(k)}</button>`).join('')}
        </div>
        <div class="label">שם העסק <small>רשות</small></div>
        <input id="bizname" class="text-input" value="${esc(S.biz.name)}" placeholder="למשל: נגריית הדר" autocomplete="off">
      </section>
      <section class="card" id="preview"></section>
    </div>`;
    const say = $('#say');
    let t;
    // With Claude available the sentence is read on a tap; until then the word list is a live draft.
    say.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => understandWords(say.value), 180); });
    $('#bizname').addEventListener('input', (e) => { S.biz.name = e.target.value.trim(); save(); renderTop(); });
    renderSayActions();
    renderPreview();
    if (!S.biz.said && FINE) setTimeout(() => say.focus(), 40);
  }

  function renderSayActions() {
    const box = $('#say-actions');
    if (!box) return;
    box.innerHTML = ai
      ? `<div class="actions"><button class="btn primary" data-act="ai-read" id="ai-btn">✨ תבין אותי</button>
          <span class="faint" id="ai-note">${S.biz.by === 'ai' ? 'הובן ע"י בינה מלאכותית' : 'עד שתלחץ — טיוטה מהירה לפי מילים'}</span></div>`
      : `<p class="honest">כאן המשפט נקרא לפי רשימת מילים, שמזהה בערך רבע מהעסקים. מה שלא זוהה נשאר במילים שלך, ואפשר לתקן. בתוך קלוד — בינה מלאכותית קוראת את המשפט.</p>`;
  }

  /** Merge a fresh reading into what is there, keeping every hand edit and every removal. */
  function applyReading(r, text) {
    const b = S.biz;
    const hand = b.products.filter((p) => p.byHand);
    const removed = new Set(b.removed);
    const read = r.products.filter((p) => !removed.has(p.name) && !hand.some((h) => h.name === p.name));
    b.products = hand.concat(read).slice(0, 8);
    b.said = text; b.parsedFrom = text;
    b.trade = r.trade; b.season = r.season; b.institutions = r.institutions;
    b.unclear = r.unclear; b.dropped = r.dropped; b.by = r.by;
    save();
    renderPreview();
    renderSayActions();
  }
  function understandWords(text) {
    if (S.biz.by === 'ai' && text === S.biz.parsedFrom) return;
    applyReading(parseWords(text), text);
  }
  async function understandAI() {
    const text = ($('#say') && $('#say').value.trim()) || '';
    if (!text) return toast('כתוב קודם מה אתה מוכר');
    const btn = $('#ai-btn');
    const note = $('#ai-note');
    if (btn) btn.disabled = true;
    if (note) note.textContent = 'קורא…';
    try {
      applyReading(cleanAI(await ai.json(PROMPT(text), { modelTier: 'quick' }), text), text);
    } catch (e) {
      const code = e && e.code;
      if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) {
        ai = null; renderSayActions(); toast('הבינה המלאכותית לא זמינה כאן. נשארנו עם הקריאה לפי מילים.');
      } else if (code === 'rate_limited') {
        toast('יותר מדי בקשות. אפשר לנסות שוב בעוד רגע.');
      } else {
        toast('לא הצלחתי לקרוא עכשיו. הטיוטה נשארה, ואפשר לנסות שוב.');
      }
      if ($('#ai-note')) $('#ai-note').textContent = 'עד שתלחץ — טיוטה מהירה לפי מילים';
    } finally {
      if ($('#ai-btn')) $('#ai-btn').disabled = false;
    }
  }

  function renderPreview() {
    const box = $('#preview');
    if (!box) return;
    const b = S.biz;
    box.innerHTML = `
      <h2>ככה הדוכן שלך ייראה</h2>
      ${b.products.length ? `<ul class="understood">
        ${b.trade ? `<li>התחום: <b>${esc(b.trade)}</b></li>` : ''}
        ${b.season ? `<li>העונה החזקה: <b>${esc(b.season)}</b> — מי שאמר "בהמשך" יישמר לשם</li>` : ''}
        ${b.institutions ? '<li>עובד גם <b>עם מוסדות וקהילות</b></li>' : ''}
        ${b.unclear.length ? `<li class="warn-li">לא זיהיתי בוודאות: <b>${esc(b.unclear.join(' · '))}</b> — השארתי במילים שלך</li>` : ''}
        ${b.dropped.length ? `<li class="warn-li">לא נכנסו (עד 8 מוצרים): ${esc(b.dropped.join(' · '))}</li>` : ''}
      </ul>` : '<div class="empty">תתחיל לכתוב, והדוכן ייבנה כאן תוך כדי.</div>'}
      <div class="label">הכפתורים בדוכן, ומה עושים אחרי <small>לגעת כדי לשנות</small></div>
      <div class="prod-list">${b.products.map((p, i) => `
        <button class="prod-row" data-editprod="${i}">
          <span class="pn">${esc(p.name)}${p.unsure ? ' <span class="q">?</span>' : ''}</span>
          <span class="pnext">← ${esc(p.next || 'לחזור אליו')}</span>
        </button>`).join('')}</div>
      <div class="add-row"><input id="new-prod" class="text-input" placeholder="+ להוסיף מוצר בעצמך" autocomplete="off">
        <button class="btn" data-act="add-prod">הוספה</button></div>
      <div class="actions"><button class="btn primary big" data-act="ready">זה נכון — לדוכן ←</button></div>`;
    const inp = $('#new-prod');
    if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') addProduct(); });
  }
  function addProduct() {
    const v = ($('#new-prod') && $('#new-prod').value.trim()) || '';
    if (!v) return;
    const b = S.biz;
    if (b.products.length >= 8) return toast('עד 8 מוצרים בדוכן');
    if (b.products.some((p) => p.name === v)) return toast('כבר יש');
    const hit = findEntries(v)[0];
    b.products.push({ name: v, next: hit ? hit.next : null, opts: hit ? [hit.next] : [], byHand: true });
    b.removed = b.removed.filter((r) => r !== v);
    save(); renderPreview();
    if ($('#new-prod')) $('#new-prod').focus();
  }
  function sheetProduct(i) {
    const p = S.biz.products[i];
    if (!p) return;
    const opts = Array.from(new Set([p.next].concat(p.opts || [], ['לחזור אליו']).filter(Boolean)));
    sheet(`<h2>${esc(p.name)}</h2>
      <div class="label">שם הכפתור</div>
      <input id="ep-name" class="text-input" value="${esc(p.name)}" autocomplete="off">
      <div class="label">מה עושים אחרי שמישהו התעניין בזה?</div>
      <input id="ep-next" class="text-input" value="${esc(p.next || '')}" placeholder="לחזור אליו" autocomplete="off">
      <div class="chips" style="margin-top:8px">${opts.map((o) => `<button class="chip" data-nextopt="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <div class="actions"><button class="btn primary" data-act="save-prod" data-i="${i}">שמירה</button>
        <button class="btn ghost danger" data-act="del-prod" data-i="${i}">להסיר את הכפתור</button></div>`);
  }

  // ------------------------------------------------------------------
  // Moment 2 — the booth
  // ------------------------------------------------------------------
  let openId = null;
  let idleTimer = null;
  const IDLE = 8000;

  function viewBooth(m) {
    m.innerHTML = `<input id="q" class="search" type="search" placeholder="שתיים-שלוש אותיות מהשם" autocomplete="off" autocapitalize="off">
      <div id="slot"></div>
      <p class="foot" id="foot"></p>`;
    const q = $('#q');
    q.addEventListener('input', () => { openId = null; stopIdle(); renderResults(q.value); });
    if (openId) renderLead(); else renderResults('');
    updateFoot();
    if (FINE) setTimeout(() => q.focus(), 30);
  }
  function updateFoot() {
    const f = $('#foot');
    if (!f) return;
    const demo = S.leads.filter((l) => l.demo).length;
    f.textContent = 'דוגמית 3 · ' + (S.leads.length - demo) + ' נקלטו' + (demo ? ' (ועוד ' + demo + ' מדומים)' : '');
  }

  function renderResults(query) {
    const slot = $('#slot');
    if (!slot) return;
    if (!People.norm(query)) {
      slot.innerHTML = `<div class="empty">מישהו ניגש? שתיים-שלוש אותיות מהשם, ונגיעה בשם.<br>כל השאר רשות.</div>`;
      return;
    }
    const hits = People.search(query, 6);
    slot.innerHTML = hits.length ? `<div class="results">${hits.map(({ i }) => {
      const p = People.get(i);
      const been = S.leads.some((l) => l.pid === i);
      return `<button class="result" data-pick="${i}"><span><span class="nm">${esc(People.name(p))}</span><span class="city">${esc(p[5])}</span>
        <span class="mt">${esc(People.meta(p))}</span></span>${been ? '<span class="badge">ביקר כבר</span>' : ''}</button>`;
    }).join('')}</div>` : '<div class="empty">לא נמצא ברשימה.</div>';
  }

  function pick(i) {
    let l = S.leads.find((x) => x.pid === i);
    if (!l) { l = { id: S.seq++, pid: i, at: Date.now(), warmth: null, products: [], role: null, roleOf: '', sent: [], pendingMat: false }; S.leads.push(l); }
    save();
    openId = l.id;
    $('#q').value = '';
    renderLead();
    updateFoot();
    toast('✓ נשמר: ' + People.name(People.get(i)));
  }

  /** One lead editor, used at the booth and from the evening lists. */
  function leadBody(l, inSheet) {
    const p = People.get(l.pid);
    const sentLabel = l.sent.length ? '📎 נשלח: ' + l.sent.join(', ') : l.pendingMat ? '📎 ממתין לחומר' : '📎 שלח חומר';
    return `
      <div class="lead-head"><div><span class="nm">${esc(People.name(p))}</span> <span class="muted">${esc(p[5])}</span>
        <div class="faint">${esc(People.meta(p))}</div></div>
        <button class="btn" data-act="close-lead">${inSheet ? 'סגירה' : 'חזרה לחיפוש'}</button></div>
      <div class="warmth">${words().map((w, k) => `<button class="warm-btn w${k}" data-warm="${k}" data-lid="${l.id}" aria-pressed="${l.warmth === k}">${esc(w)}</button>`).join('')}</div>
      ${S.biz.learned.grades ? '' : '<div class="hint">לחיצה ארוכה על כפתור — לשנות את השמות</div>'}
      ${S.biz.products.length ? `<div class="label">במה התעניין <small>רשות</small></div>
        <div class="chips">${S.biz.products.map((pr) => `<button class="chip" data-prod="${esc(pr.name)}" data-lid="${l.id}" aria-pressed="${l.products.includes(pr.name)}">${esc(pr.name)}</button>`).join('')}</div>` : ''}
      <div class="label">מי הוא כאן <small>רשות</small></div>
      <div class="chips">${S.biz.roles.map((r) => `<button class="chip" data-role="${esc(r)}" data-lid="${l.id}" aria-pressed="${l.role === r}">${esc(r)}</button>`).join('')}
        <button class="chip add" data-act="role-add" data-lid="${l.id}">+ תפקיד</button></div>
      ${l.role && l.roleOf ? `<div class="hint">${esc(l.role)} · ${esc(l.roleOf)}</div>` : ''}
      <div class="actions"><button class="btn" data-act="send" data-lid="${l.id}">${esc(sentLabel)}</button>
        <button class="btn ghost danger" data-act="del-lead" data-lid="${l.id}">מחיקה</button></div>`;
  }

  function renderLead() {
    const l = leadById(openId);
    const slot = $('#slot');
    if (!l || !slot) return;
    slot.innerHTML = `<div class="lead"><div class="timer" id="timer"></div>${leadBody(l, false)}</div>`;
    startIdle();
  }
  /** Redraw wherever this lead is being edited: an evening sheet or the booth panel. */
  function refreshLead(l) {
    const sh = $('#scrim .sheet[data-lead]');
    if (sh && +sh.dataset.lead === l.id) { sh.innerHTML = leadBody(l, true); return; }
    if (S.stage === 'booth' && openId === l.id) renderLead();
    else if (S.stage === 'evening') render();
  }

  function startIdle() {
    stopIdle();
    if ($('#scrim') || $('#menu')) return;          // never count down behind a sheet or the menu
    const bar = $('#timer');
    if (bar) bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: IDLE, easing: 'linear', fill: 'forwards' });
    idleTimer = setTimeout(() => {
      if ($('#scrim') || $('#menu')) return;
      openId = null;
      const q = $('#q');
      renderResults(q ? q.value : '');
      if (q && FINE) q.focus();
    }, IDLE);
  }
  function stopIdle() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    const bar = $('#timer');
    if (bar && bar.getAnimations) bar.getAnimations().forEach((a) => a.cancel());
  }

  // ---- settings that arrive when needed ----
  function sheetGrades() {
    if (DEV.staff) return ownerOnly('שמות הדרגות');
    sheet(`<h2>איך לקרוא לדרגות?</h2><p class="muted">רק השמות משתנים. מי שסומן הכי חם נשאר הכי חם.</p>
      <div class="opts">${Object.entries(GRADES).map(([k, g]) => `<button class="opt" data-grades="${k}" aria-pressed="${S.biz.grades === k}">${esc(g.words.join(' · '))}<small>${esc(g.name)}</small></button>`).join('')}</div>`);
  }
  function sheetMaterials(l) {
    const mats = S.biz.materials;
    sheet(`<h2>מה לשלוח${l ? ' ל' + esc(People.name(People.get(l.pid))) : ''}?</h2>
      ${mats.length ? `<div class="opts">${mats.map((m) => `<button class="opt" data-sendmat="${esc(m.name)}" data-lid="${l ? l.id : ''}" aria-pressed="${l ? l.sent.includes(m.name) : false}">📎 ${esc(m.name)}<small>${esc(m.file)}</small></button>`).join('')}</div>` : '<p class="muted">עוד אין חומר לשליחה.</p>'}
      ${DEV.staff ? '' : `<div class="label">${mats.length ? 'להוסיף חומר' : 'להוסיף עכשיו'}</div>
        <input id="mat-name" class="text-input" value="${mats.length ? '' : 'קטלוג'}" placeholder="שם החומר — קטלוג, מחירון, תמונות עבודות" autocomplete="off">
        <div class="opts"><label class="opt" for="mat-file">📷 לצלם או לבחור קובץ<small>תמונה או PDF</small></label></div>
        <input id="mat-file" type="file" accept="image/*,application/pdf" hidden>`}
      ${!mats.length && l ? `<div class="opts"><button class="opt" data-act="mat-later" data-lid="${l.id}">לא עכשיו<small>הליד יסומן "ממתין לחומר", ולא נשאל שוב עד הערב</small></button></div>` : ''}
      <div class="actions"><button class="btn" data-act="sheet-close">סיום</button></div>`);
    const f = $('#mat-file');
    if (f) f.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const name = (($('#mat-name') && $('#mat-name').value.trim()) || 'קטלוג').slice(0, 30);
      if (S.biz.materials.some((m) => m.name === name)) return toast('כבר יש חומר בשם הזה');
      S.biz.materials.push({ name, file: file.name });
      learn('materials', S.stage === 'booth' ? 'booth' : 'evening');
      if (l && !l.sent.includes(name)) { l.sent.push(name); l.pendingMat = false; }
      save(); sheetMaterials(l);
      toast(name + ' נשמר' + (l ? ' ויישלח ל' + People.name(People.get(l.pid)) : ''));
    });
  }
  let sheetLead = null;
  function sheetRole(l) {
    const all = Array.from(new Set(DEFAULT_ROLES.concat(S.biz.roles)));
    sheetLead = l;
    sheet(`<h2>מי הוא כאן?</h2><p class="muted">מה שתבחר יישמר ככפתור לפעם הבאה.</p>
      <div class="label">של מי? <small>רשות — בית הכנסת, הקבוצה או המוסד</small></div>
      <input id="role-of" class="text-input" placeholder="למשל: קבוצת שערי חסד" autocomplete="off">
      <div class="opts">${all.map((r) => `<button class="opt" data-pickrole="${esc(r)}">${esc(r)}</button>`).join('')}</div>
      ${DEV.staff ? '' : `<div class="label">תפקיד אחר</div>
      <div class="add-row"><input id="role-new" class="text-input" placeholder="למשל: ראש כולל" autocomplete="off">
        <button class="btn" data-act="role-new">הוספה</button></div>`}`);
  }
  function setRole(name) {
    const l = sheetLead;
    if (!l) return;
    const of = ($('#role-of') && $('#role-of').value.trim()) || '';
    if (!S.biz.roles.includes(name)) { S.biz.roles.push(name); learn('roles', 'booth'); }
    l.role = name; l.roleOf = of;
    save(); closeSheet(); refreshLead(l);
    toast(name + (of ? ' · ' + of : '') + ' — נשמר');
  }
  function sheetLeadEdit(l) { sheet(leadBody(l, true), l.id); }
  function sheetConfirm(title, text, act, extra) {
    sheet(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
      <div class="opts"><button class="opt danger" data-act="${act}" ${extra || ''}>כן</button><button class="opt" data-act="sheet-close">ביטול</button></div>`);
  }
  function sheetJoin() {
    sheet(`<h2>טאבלט נוסף לדוכן</h2>
      <p class="muted">אין קוד ואין הגדרה. פותחים בטאבלט השני את אותו קישור, והוא שואל:</p>
      <div class="join-mock"><div class="faint">בטאבלט השני</div>
        <h3 style="margin:8px 0">להצטרף לדוכן של ${esc(S.biz.name || 'העסק')}?</h3>
        <button class="btn primary" data-act="join">להצטרף</button></div>
      <p class="faint" style="margin-top:10px">בדוגמית זה מדומה, ואין סנכרון בין מכשירים. במערכת האמיתית — שני הטאבלטים רואים את אותם לידים.</p>`);
  }
  function sheetStaff() {
    if (DEV.staff) {
      sheet(`<h2>לבטל את מצב העובד?</h2><p class="muted">בגרסה האמיתית — רק עם קוד של הבעלים.</p>
        <div class="opts"><button class="opt" data-act="staff-off">אני הבעלים — לבטל</button><button class="opt" data-act="sheet-close">ביטול</button></div>`);
    } else {
      sheet(`<h2>מצב עובד לטאבלט הזה</h2><p class="muted">קולטים, מתייגים ושולחים. לא משנים מוצרים, חומרים או הגדרות — כדי שנגיעה בטעות לא תמחק כלום באמצע התערוכה. נוגע רק בטאבלט הזה.</p>
        <div class="opts"><button class="opt" data-act="staff-on">להפעיל</button><button class="opt" data-act="sheet-close">ביטול</button></div>`);
    }
  }

  // Long press on a warmth button opens the grade names.
  let pressTimer = null;
  let longFired = false;
  let pressAt = null;
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-warm]');
    if (!b) return;
    longFired = false;
    pressAt = { x: e.clientX, y: e.clientY };
    pressTimer = setTimeout(() => { longFired = true; stopIdle(); sheetGrades(); }, 550);
  });
  document.addEventListener('pointermove', (e) => {
    if (pressTimer && pressAt && Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) > 12) { clearTimeout(pressTimer); pressTimer = null; }
  });
  ['pointerup', 'pointercancel'].forEach((ev) => document.addEventListener(ev, () => { clearTimeout(pressTimer); pressTimer = null; }));
  document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-warm]')) e.preventDefault(); });

  // ------------------------------------------------------------------
  // Moment 3 — the evening: first fill in, then ask
  // ------------------------------------------------------------------
  function seedDay() {
    const rnd = (n) => Math.floor(Math.random() * n);
    const prods = S.biz.products.map((p) => p.name);
    const roles = S.biz.roles.length ? S.biz.roles : ['גבאי קבוצה', 'מנהל מוסד'];
    const taken = new Set(S.leads.map((l) => l.pid));
    const start = new Date(); start.setHours(10, 0, 0, 0);
    for (let n = 0; n < 20; n++) {
      let i; do { i = rnd(People.list.length); } while (taken.has(i));
      taken.add(i);
      const r = Math.random();
      const warmth = r < 0.25 ? null : r < 0.42 ? 0 : r < 0.72 ? 1 : 2;
      const asked = prods.length && Math.random() < 0.6 ? [prods[Math.random() < 0.5 ? 0 : rnd(prods.length)]] : [];
      S.leads.push({ id: S.seq++, pid: i, at: start.getTime() + rnd(9 * 3600000), warmth, products: warmth === 2 ? [] : asked,
        role: Math.random() < 0.1 ? roles[rnd(roles.length)] : null, roleOf: '', sent: [], pendingMat: false, demo: true });
    }
    save();
  }

  function asks() {
    const L = S.leads;
    const out = [];
    const noWarm = L.filter((l) => l.warmth == null);
    const noProd = S.biz.products.length ? L.filter((l) => l.warmth !== 2 && !l.products.length) : [];
    if (noWarm.length || noProd.length) {
      out.push({ id: 'fill', fill: true, q: [noWarm.length ? noWarm.length + ' בלי ' + words().join('/') : '', noProd.length ? noProd.length + ' בלי "במה התעניין"' : ''].filter(Boolean).join(' · ') + '. להשלים עכשיו? בערך דקה.' });
    }
    const waiting = L.filter((l) => l.pendingMat);
    if (waiting.length) out.push({ id: 'mat', mat: true, q: `${waiting.length} מחכים לחומר. להוסיף חומר עכשיו?` });
    S.biz.products.forEach((p) => {
      const n = L.filter((l) => l.products.includes(p.name) && l.warmth !== 2).length;
      if (n >= 3) out.push({ id: 'days:' + p.name, days: p.name, q: `${n} שאלו על ${p.name}. ${p.next || 'לחזור אליהם'} — עד מתי?` });
    });
    const roled = L.filter((l) => l.role).length;
    if (roled >= 2) out.push({ id: 'roles', q: `יש ${roled} שמייצגים ציבור — גבאים, מוסדות, ועדים. להעלות אותם לראש הרשימה של מחר?`,
      apply: (yes) => { S.rules.boostRoles = yes; learn('boost', 'evening'); } });
    const later = L.filter((l) => l.warmth === 1 && !l.role).length;
    if (S.biz.season && later >= 3) out.push({ id: 'season', q: `${later} סומנו "${words()[1]}". לשמור אותם לעונה שלך (${S.biz.season}) ולהזכיר לך לפני, במקום להתקשר השבוע?`,
      apply: (yes) => { S.rules.holdForSeason = yes; learn('season', 'evening'); } });
    return out;
  }

  function viewEvening(m) {
    const demo = S.leads.filter((l) => l.demo).length;
    const real = S.leads.length - demo;
    const list = asks();
    m.innerHTML = `<h1>ערב טוב. ${real} אנשים היו אצלך היום${demo ? ` <span class="faint">(ועוד ${demo} מדומים)</span>` : ''}.</h1>
      ${S.leads.length < 8 ? `<div class="ask-card" style="margin-top:12px"><div class="q">כדי לראות איך נראה ערב אמיתי, אפשר להוסיף 20 מבקרים מדומים.</div>
        <div class="actions"><button class="btn" data-act="seed">להוסיף מבקרים מדומים</button></div></div>` : ''}
      <p class="muted">קודם משלימים מה שחסר, ואז כמה שאלות שבבוקר לא היה להן מובן.</p>
      <div class="ask" style="margin-top:14px">${list.map(askCard).join('') || '<div class="empty">אין שאלות הערב.</div>'}</div>
      <h2 style="margin-top:26px">מחר בבוקר</h2>
      ${tomorrow()}`;
  }
  function askCard(a) {
    const done = S.answered[a.id];
    const locked = DEV.staff && !a.fill;
    let actions;
    if (a.fill) actions = done === 'open' ? fillList() : `<div class="actions"><button class="btn primary" data-ask="fill" data-ans="open">להשלים</button></div>`;
    else if (locked) actions = '<div class="faint" style="margin-top:6px">🔒 רק לבעלים</div>';
    else if (a.mat) actions = `<div class="actions"><button class="btn primary" data-act="mat-evening">להוסיף חומר</button></div>`;
    else if (a.days) {
      const p = S.biz.products.find((x) => x.name === a.days);
      actions = `<div class="chips" style="margin-top:8px">${[[1, 'עד מחר'], [3, 'תוך 3 ימים'], [7, 'השבוע']].map(([d, t]) =>
        `<button class="chip" data-days="${esc(a.days)}" data-d="${d}" aria-pressed="${!!p && p.days === d}">${t}</button>`).join('')}</div>`;
    } else if (done) {
      actions = `<div class="faint" style="margin-top:6px">${done === 'yes' ? '✓ כן' : 'לא'} · <button class="btn ghost" data-ask="${esc(a.id)}" data-ans="${done === 'yes' ? 'no' : 'yes'}">לשנות</button></div>`;
    } else {
      actions = `<div class="actions"><button class="btn primary" data-ask="${esc(a.id)}" data-ans="yes">כן</button><button class="btn ghost" data-ask="${esc(a.id)}" data-ans="no">לא</button></div>`;
    }
    return `<div class="ask-card ${done && !a.fill && !a.days ? 'done' : ''}"><div class="q">${esc(a.q)}</div>${actions}</div>`;
  }
  function fillList() {
    const left = S.leads.filter((l) => l.warmth == null || (S.biz.products.length && l.warmth !== 2 && !l.products.length));
    if (!left.length) return '<div class="faint" style="margin-top:6px">✓ הכול מלא.</div>';
    return `<div style="margin-top:8px">${left.map((l) => `<div class="tag-row"><button class="link" data-openlead="${l.id}"><b>${esc(People.name(People.get(l.pid)))}</b> <span class="muted">${esc(People.get(l.pid)[5])}</span>${l.demo ? ' <span class="faint">· מדומה</span>' : ''}</button>
      <span class="mini-w">${words().map((w, k) => `<button class="warm-btn w${k}" data-warm="${k}" data-lid="${l.id}" aria-pressed="${l.warmth === k}">${esc(w)}</button>`).join('')}</span></div>`).join('')}</div>
      <div class="faint" style="margin-top:6px">נגיעה בשם פותחת את הכרטיס המלא.</div>`;
  }

  function dueDays(l) {
    const p = S.biz.products.find((x) => l.products.includes(x.name));
    if (p && p.days) return p.days;
    return l.warmth === 0 ? 1 : l.warmth === 1 ? 3 : 2;
  }
  function tomorrow() {
    const tasks = [];
    const held = [];
    const audience = [];
    S.leads.forEach((l) => {
      if (l.warmth === 2) audience.push(l);
      else if (S.rules.holdForSeason && l.warmth === 1 && !l.role) held.push(l);
      else tasks.push(l);
    });
    const score = (l) => (l.warmth === 0 ? 100 : l.warmth === 1 ? 50 : 20) + (S.rules.boostRoles && l.role ? 80 : 0) - dueDays(l);
    tasks.sort((a, b) => score(b) - score(a));
    const row = (l, withDue) => {
      const p = People.get(l.pid);
      const prod = S.biz.products.find((x) => l.products.includes(x.name));
      const what = (prod && prod.next) || 'לחזור אליו';
      const d = dueDays(l);
      const why = [l.warmth != null ? words()[l.warmth] : 'לא תויג'].concat(l.products, l.role ? [l.role] : [], l.pendingMat ? ['ממתין לחומר'] : []).join(' · ');
      return `<button class="row" data-openlead="${l.id}"><span><span class="dot w${l.warmth == null ? '' : l.warmth}"></span><span class="nm">${esc(People.name(p))}</span> <span class="muted">${esc(p[5])}</span>${l.demo ? ' <span class="faint">· מדומה</span>' : ''}</span>
        ${withDue ? `<span class="due">${esc(what)} · ${d === 1 ? 'עד מחר' : d === 7 ? 'השבוע' : 'תוך ' + d + ' ימים'}</span>` : '<span></span>'}<span class="why">${esc(why)}</span></button>`;
    };
    return `<div class="rows">${tasks.slice(0, 12).map((l) => row(l, true)).join('') || '<div class="empty">אין שיחות למחר.</div>'}</div>
      ${tasks.length > 12 ? `<div class="faint" style="margin-top:6px">ועוד ${tasks.length - 12} בהמשך השבוע.</div>` : ''}
      ${held.length ? `<details class="held"><summary>שמורים ל${esc(S.biz.season)} (${held.length})</summary><div class="rows">${held.map((l) => row(l, false)).join('')}</div></details>` : ''}
      ${audience.length ? `<details class="held"><summary>קהל — בלי משימה (${audience.length})</summary><div class="rows">${audience.map((l) => row(l, false)).join('')}</div></details>` : ''}`;
  }

  // ------------------------------------------------------------------
  // What the system knows — every capability still exists, and where it came from.
  // ------------------------------------------------------------------
  function viewKnow(m) {
    const b = S.biz;
    const src = (k, dflt) => ({ onboard: 'מהמשפט שכתבת', booth: 'מהדוכן', evening: 'מהערב' }[b.learned[k]] || dflt || 'ברירת מחדל');
    const dayWord = (d) => (d === 1 ? 'עד מחר' : d === 7 ? 'השבוע' : 'תוך ' + d + ' ימים');
    const rows = [
      ['מה אתה מוכר, ומה עושים אחרי', b.products.map((p) => p.name + ' ← ' + (p.next || 'לחזור אליו') + (p.days ? ' (' + dayWord(p.days) + ')' : '')).join(' · ') || '—', b.by === 'ai' ? 'בינה מלאכותית, מהמשפט' : 'מהמשפט שכתבת'],
      ['התחום', b.trade || '—', 'מהמשפט שכתבת'],
      ['העונה', b.season || 'לא זוהתה', 'מהמשפט שכתבת'],
      ['חומרים לשליחה', b.materials.map((x) => x.name).join(' · ') || 'עוד אין — יישאל בשליחה הראשונה', src('materials')],
      ['שמות הדרגות', words().join(' · '), src('grades')],
      ['תפקידים', b.roles.join(' · ') || 'עוד לא תויג אף אחד', src('roles')],
      ['טאבלטים', b.devices + (b.devices === 1 ? ' טאבלט' : ' טאבלטים'), b.devices > 1 ? 'מהדוכן' : 'ברירת מחדל'],
      ['גבאים ומוסדות ראשונים', S.rules.boostRoles ? 'כן' : 'לא', src('boost')],
      ['"בהמשך" נשמרים לעונה', S.rules.holdForSeason ? 'כן' : 'לא', src('season')],
    ];
    m.innerHTML = `<h1>מה המערכת יודעת עליך</h1>
      <p class="muted">אין כאן טופס. כל דבר נקבע ברגע שהיה לו מובן — וכאן רואים מאיפה.</p>
      <div class="know" style="margin-top:14px">${rows.map(([k, v, s]) => `<div class="know-row"><span class="k">${esc(k)}</span><span class="src">${esc(s)}</span><span class="v">${esc(v)}</span></div>`).join('')}</div>
      <div class="actions"><button class="btn" data-go="onboard">לשנות מוצרים</button><button class="btn" data-act="mat-evening">חומרים</button><button class="btn" data-act="grades">שמות דרגות</button><button class="btn primary" data-go="booth">חזרה לדוכן</button></div>`;
  }

  // ------------------------------------------------------------------
  // Sheet, menu, toast
  // ------------------------------------------------------------------
  function sheet(html, leadId) {
    closeSheet(false);
    stopIdle();
    const s = document.createElement('div');
    s.className = 'scrim'; s.id = 'scrim';
    s.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"${leadId ? ` data-lead="${leadId}"` : ''}>${html}</div>`;
    s.addEventListener('click', (e) => { if (e.target === s) closeSheet(); });
    document.body.appendChild(s);
  }
  /** restart: give the booth panel its countdown back. Opening one sheet over another does not. */
  function closeSheet(restart) {
    const s = $('#scrim');
    if (s) s.remove();
    if (restart !== false && S.stage === 'booth' && openId) startIdle();
  }
  function toggleMenu() {
    const old = $('#menu');
    if (old) { old.remove(); if (S.stage === 'booth' && openId) startIdle(); return; }
    stopIdle();
    const m = document.createElement('div');
    m.className = 'menu'; m.id = 'menu';
    const staff = DEV.staff;
    m.innerHTML = [
      !staff && S.ready ? '<button data-go="know">מה המערכת יודעת עליך</button>' : '',
      S.ready ? '<button data-act="join-open">טאבלט נוסף לדוכן</button>' : '',
      S.ready ? `<button data-act="staff">${staff ? '🔒 מצב עובד פעיל — לבטל' : 'מצב עובד לטאבלט הזה'}</button>` : '',
      S.ready ? '<button data-go="evening">לערב (הדגמה)</button>' : '',
      !staff ? '<button data-act="reset">להתחיל מחדש</button>' : '',
    ].join('');
    $('.top-in').appendChild(m);
  }
  let toastT;
  function toast(text) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text;
    clearTimeout(toastT);
    toastT = setTimeout(() => t.remove(), 2600);
  }

  // ------------------------------------------------------------------
  // Clicks
  // ------------------------------------------------------------------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) { const mn = $('#menu'); if (mn && !e.target.closest('#menu')) { mn.remove(); if (S.stage === 'booth' && openId) startIdle(); } return; }
    const d = b.dataset;
    if (!b.closest('#menu') && d.act !== 'menu') { const mn = $('#menu'); if (mn) mn.remove(); }
    if (S.stage === 'booth' && openId && b.closest('.lead')) startIdle();
    const L = d.lid ? leadById(+d.lid) : null;

    if (d.go) {
      if (d.go === 'onboard' && DEV.staff) return ownerOnly('שינוי מוצרים');
      if (d.go === 'know' && DEV.staff) return ownerOnly('ההגדרות');
      S.stage = d.go; openId = null; stopIdle(); closeSheet(false); save(); return render();
    }
    if (d.ex) { const t = EXAMPLES[d.ex]; $('#say').value = t; understandWords(t); return; }
    if (d.editprod !== undefined) return sheetProduct(+d.editprod);
    if (d.nextopt) { const n = $('#ep-next'); if (n) n.value = d.nextopt; return; }
    if (d.pick !== undefined) return pick(+d.pick);
    if (d.warm !== undefined) {
      if (longFired) { longFired = false; return; }
      const l = L || leadById(openId);
      if (l) { l.warmth = +d.warm; save(); refreshLead(l); }   // sets, never toggles: a double tap must not undo it
      return;
    }
    if (d.prod) {
      const l = L || leadById(openId);
      if (l) { const i = l.products.indexOf(d.prod); if (i >= 0) l.products.splice(i, 1); else l.products.push(d.prod); save(); refreshLead(l); }
      return;
    }
    if (d.role) {
      const l = L || leadById(openId);
      if (l) { l.role = l.role === d.role ? null : d.role; save(); refreshLead(l); }
      return;
    }
    if (d.pickrole) return setRole(d.pickrole);
    if (d.grades) {
      S.biz.grades = d.grades; learn('grades', 'booth'); save(); closeSheet();
      if (S.stage === 'booth' && openId) renderLead(); else render();
      return toast('השמות עודכנו: ' + words().join(' · '));
    }
    if (d.sendmat) {
      const l = L;
      if (!l) return;
      if (!l.sent.includes(d.sendmat)) { l.sent.push(d.sendmat); l.pendingMat = false; toast('📎 ' + d.sendmat + ' יישלח ל' + People.name(People.get(l.pid))); }
      save(); sheetMaterials(l); refreshLead(l);
      return;
    }
    if (d.openlead) { const l = leadById(+d.openlead); if (l) sheetLeadEdit(l); return; }
    if (d.ask) {
      if (DEV.staff && d.ask !== 'fill') return ownerOnly('שאלות הערב');
      const a = asks().find((x) => x.id === d.ask);
      S.answered[d.ask] = d.ans;
      if (a && a.apply) a.apply(d.ans === 'yes');
      save(); return render();
    }
    if (d.days) {
      if (DEV.staff) return ownerOnly('שאלות הערב');
      const p = S.biz.products.find((x) => x.name === d.days);
      if (p) { p.days = +d.d; learn('days', 'evening'); save(); render(); }
      return;
    }

    switch (d.act) {
      case 'menu': return toggleMenu();
      case 'ai-read': return understandAI();
      case 'add-prod': return addProduct();
      case 'save-prod': {
        const p = S.biz.products[+d.i];
        if (!p) return;
        const name = $('#ep-name').value.trim() || p.name;
        if (name !== p.name) S.leads.forEach((l) => { const k = l.products.indexOf(p.name); if (k >= 0) l.products[k] = name; });
        p.name = name; p.next = $('#ep-next').value.trim() || null; p.byHand = true; p.unsure = false;
        save(); closeSheet(); return renderPreview();
      }
      case 'del-prod': {
        const p = S.biz.products[+d.i];
        if (!p) return;
        S.biz.products.splice(+d.i, 1);
        S.biz.removed.push(p.name);
        save(); closeSheet(); return renderPreview();
      }
      case 'ready': {
        const say = $('#say');
        if (say && say.value !== S.biz.parsedFrom && S.biz.by !== 'ai') applyReading(parseWords(say.value), say.value);
        if (!S.biz.products.length) return toast('כתוב קודם מה אתה מוכר, או הוסף מוצר');
        S.ready = true; S.stage = 'booth'; learn('products', 'onboard'); save(); return render();
      }
      case 'close-lead':
        if ($('#scrim')) { closeSheet(false); if (S.stage === 'evening') render(); return; }
        openId = null; stopIdle(); renderResults(''); if ($('#q') && FINE) $('#q').focus(); return;
      case 'send': {
        const l = L || leadById(openId);
        if (!l) return;
        if (!S.biz.materials.length && (S.biz.matDeclined || DEV.staff)) {
          l.pendingMat = true; save(); refreshLead(l);
          return toast('סומן "ממתין לחומר". בערב תתבקש להוסיף.');
        }
        if (S.biz.materials.length === 1 && !l.sent.length) {
          const name = S.biz.materials[0].name;
          l.sent.push(name); l.pendingMat = false; save(); refreshLead(l);
          return toast('📎 ' + name + ' יישלח ל' + People.name(People.get(l.pid)));
        }
        return sheetMaterials(l);
      }
      case 'mat-later': {
        S.biz.matDeclined = true;
        const l = d.lid ? leadById(+d.lid) : null;
        if (l) l.pendingMat = true;
        save(); closeSheet(); if (l) refreshLead(l);
        return toast('סומן "ממתין לחומר". לא נשאל שוב עד הערב.');
      }
      case 'mat-evening': if (DEV.staff) return ownerOnly('חומרים'); return sheetMaterials(null);
      case 'role-add': { const l = L || leadById(openId); return l && sheetRole(l); }
      case 'role-new': { const v = $('#role-new') && $('#role-new').value.trim(); if (v) setRole(v); return; }
      case 'del-lead': { const l = L || leadById(openId); return l && sheetConfirm('למחוק את ' + People.name(People.get(l.pid)) + '?', 'הליד יימחק מהרשימה.', 'del-lead-yes', `data-lid="${l.id}"`); }
      case 'del-lead-yes': {
        const id = +d.lid;
        S.leads = S.leads.filter((x) => x.id !== id);
        if (openId === id) openId = null;
        save(); closeSheet(false); render(); return toast('הליד נמחק');
      }
      case 'sheet-close':
        closeSheet();
        if (S.stage === 'evening' || S.stage === 'know') render();
        return;
      case 'grades': return sheetGrades();
      case 'seed': seedDay(); return render();
      case 'join-open': return sheetJoin();
      case 'join': S.biz.devices += 1; save(); closeSheet(); return toast('בדוגמית זה מדומה. במערכת — טאבלט ' + S.biz.devices + ' מחובר לאותו דוכן.');
      case 'staff': return sheetStaff();
      case 'staff-on': DEV.staff = true; if (S.stage === 'know' || S.stage === 'onboard') S.stage = 'booth'; save(); closeSheet(false); render(); return toast('🔒 מצב עובד בטאבלט הזה');
      case 'staff-off': DEV.staff = false; save(); closeSheet(false); render(); return toast('מצב עובד בוטל');
      case 'reset': return sheetConfirm('להתחיל מחדש?', 'כל הלידים, המוצרים וההגדרות יימחקו.', 'reset-yes');
      case 'reset-yes': S = fresh(); openId = null; stopIdle(); closeSheet(false); save(); return render();
    }
  });

  // Test hook: lets the word-list reader be checked against real trades from the console.
  window.Demo3 = { parse: parseWords };
  render();
})();
