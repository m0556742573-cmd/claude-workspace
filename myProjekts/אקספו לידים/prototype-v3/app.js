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

  /* Icons. Emoji are another typeface's colour decisions leaking into ours —
   * they ignore the ink tokens, render differently on every OS, and in a
   * monochrome system they are the one thing that still looks bought-in.
   * Drawn for this system on one grammar: a 24 box with content between 3 and
   * 21, stroke 1.75, SQUARE caps and MITRE joins, every angle 90° or 45°, every
   * curve a quarter circle of radius 3, 5 or 8. A round cap reads friendly; a
   * square one reads made — that single choice carries the whole set's character.
   * currentColor throughout, so an icon is the colour and size of its text. */
  const ICON = {
    call: 'M4 4h5l1.5 5L8 11a11 11 0 0 0 5 5l2-1.5 5 1.5v5h-1C9 21 4 16 4 5Z',
    clip: 'M19 7v9a5 5 0 0 1-10 0V6a3 3 0 0 1 6 0v10a1 1 0 0 1-2 0V7',
    quote: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z M9 8h6 M9 12h6 M9 16h3',
    meet: 'M4 20v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2 M9 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6 M16 20v-2a5 5 0 0 0-2-4 M15 4a3 3 0 0 1 0 6 M20 20v-2a5 5 0 0 0-2-4',
    date: 'M4 6h16v15H4Z M8 3v5 M16 3v5 M4 11h16',
    pen: 'M4 20h4L20 8l-4-4L4 16Z M14 6l4 4',
    repeat: 'M4 9V7h13l-3-3 M4 9l3 3 M20 15v2H7l3 3 M20 15l-3-3',
    season: 'M4 6h16v15H4Z M8 3v5 M16 3v5 M4 11h16 M8 17h5l-2-2 M8 17l2 2',
    note: 'M5 3h10l4 4v14H5Z M15 3v4h4 M9 12h6 M9 16h4',
    mic: 'M12 3h0a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z M5 11v1a7 7 0 0 0 14 0v-1 M12 19v3 M8 22h8',
    spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z M19 3v4 M17 5h4',
    won: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z M8 12l3 3 5-6',
    lock: 'M5 11h14v10H5Z M8 11V7a4 4 0 0 1 8 0v4 M12 15v2',
    mail: 'M3 5h18v14H3Z M3 6l9 7 9-7',
    sms: 'M3 4h18v13H8l-5 4Z M8 9h8 M8 13h5',
    wa: 'M3 21l1.5-4.5A9 9 0 1 1 7.5 19.5Z',
    camera: 'M3 7h4l2-3h6l2 3h4v13H3Z M12 9a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
    tag: 'M3 3h9l9 9-9 9-9-9Z M7 7l1 1',
    warn: 'M12 3l10 18H2Z M12 9v5 M12 17h.01',
    check: 'M4 12l5 5L20 6',
    fwd: 'M3 5l8 7-8 7Z M13 5l8 7-8 7Z',
    dot: 'M9 12h6',
    // Added for screens the set was not drawn for (the tracking view), on the same grammar.
    auto: 'M15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M12 4v3 M12 17v3 M4 12h3 M17 12h3 M6.3 6.3l2.2 2.2 M15.5 15.5l2.2 2.2 M17.7 6.3l-2.2 2.2 M8.5 15.5l-2.2 2.2',
    save: 'M6 3h12v18l-6-6-6 6Z',
    download: 'M12 3v13 M6 10l6 6 6-6 M4 21h16',
    bell: 'M7 17v-6a5 5 0 0 1 10 0v6 M4 17h16 M10 20h4',
    ban: 'M20 12a8 8 0 1 1-16 0 8 8 0 1 1 16 0Z M6.3 6.3l11.4 11.4',
    // The CRM's side menu (17/10), on the same grammar.
    home: 'M4 11l8-7 8 7v10H4Z M10 21v-6h4v6',
    bars: 'M3 21h18 M6 21V11 M12 21V4 M18 21v-7',
    // The shell from the brand book (20/10), on the same grammar.
    search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z M16 16l5 5',
    leads: 'M4 20v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2 M9 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6 M16 20v-2a5 5 0 0 0-2-4 M15 4a3 3 0 0 1 0 6',
    tasks: 'M5 5h14v14H5Z M8 12l3 3 5-6',
    help: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14 M12 17h.01',
    stand: 'M3 9l2-5h14l2 5Z M5 9v11h14V9 M9 20v-6h6v6',
    crm: 'M4 8h16v12H4Z M9 8V5h6v3 M4 13h16',
    fold: 'M9 6l6 6-6 6',
    unfold: 'M15 6l-6 6 6 6',
    plus: 'M12 5v14 M5 12h14',
    play: 'M8 5l11 7-11 7Z',
    video: 'M3 5h18v14H3Z M10 9l5 3-5 3Z',
  };
  /* The map holds path DATA, so the element is built here. Sub-paths are
   * separated inside one `d`, which one <path> renders correctly. */
  const ic = (k) => (ICON[k]
    ? '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"'
      + ' stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="' + ICON[k] + '"/></svg>'
    : '');
  /* The code and the log keep their emoji as words — the log is read by them
   * ("📞 דיברנו") — and the screen draws them with the set above. Typographic marks
   * (← ✓ ✕ ⋯) stay text. A message as the customer will get it (.bubble) keeps its
   * emoji; a <select> option, which cannot hold a drawing, drops them. */
  const GLYPH = { '📞': 'call', '📎': 'clip', '🧾': 'quote', '🤝': 'meet', '📅': 'date', '🗓': 'date', '✍': 'pen', '🔁': 'repeat',
    '📝': 'note', '📄': 'note', '🎙': 'mic', '✨': 'spark', '🎉': 'won', '🔒': 'lock', '📧': 'mail', '💬': 'sms', '🟢': 'wa', '✅': 'check',
    '📷': 'camera', '💰': 'tag', '⚠': 'warn', '⏩': 'fwd', '⚙': 'auto', '⭐': 'save', '💾': 'save', '⬇': 'download', '🔔': 'bell', '🚫': 'ban' };
  const GLYPH_RE = new RegExp('(' + Object.keys(GLYPH).join('|') + ')\uFE0F?', 'g');
  function iconize(root) {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const hits = [];
    for (let n = walk.nextNode(); n; n = walk.nextNode()) { GLYPH_RE.lastIndex = 0; if (GLYPH_RE.test(n.data)) hits.push(n); }
    for (const n of hits) {
      const p = n.parentElement;
      if (!p || p.closest('textarea, script, style, title, .bubble')) continue;
      if (p.closest('select')) { n.data = n.data.replace(GLYPH_RE, '').trim(); continue; }
      const t = document.createElement('template');
      t.innerHTML = esc(n.data).replace(GLYPH_RE, (m, g) => ic(GLYPH[g]));
      n.replaceWith(t.content);
    }
  }
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((a) => {
    if (a.nodeType === 1) iconize(a);
    else if (a.nodeType === 3 && a.parentElement) iconize(a.parentElement);
  }))).observe(document.body, { childList: true, subtree: true });
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
  const MAIL_DOMAIN = 'y-h-m.com';   // the system's own sending domain (יצחק, 18/10, J9). Needs SPF, DKIM and DMARC before mail goes out.
  const STEPS = {
    call:     { name: 'להתקשר', days: 2, icon: '📞', label: 'לחזור אליו' },
    send:     { name: 'לשלוח הודעה', days: 0, icon: '📎', label: 'לשלוח הודעה' },
    quote:    { name: 'הצעת מחיר', days: 2, icon: '🧾', label: 'להכין הצעת מחיר' },
    meet:     { name: 'פגישה או ביקור', days: 3, icon: '🤝', label: 'לתאם פגישה' },
    date:     { name: 'תלוי תאריך', days: 1, icon: '📅', label: 'לבדוק תאריך' },
    register: { name: 'הרשמה', days: 1, icon: '✍️', label: 'לשלוח פרטי הרשמה' },
    season:   { name: 'לעונה', days: null, icon: '🗓', label: 'לחזור לפני העונה' },
    none:     { name: 'בלי משימה, בלי מעקב', days: null, icon: '·', label: 'בלי מעקב' },
  };
  // When two steps fall on the same day, the more committing one comes first.
  const PRI = ['meet', 'quote', 'date', 'register', 'send', 'call', 'season', 'none'];
  function typeOfNext(s) {
    s = String(s || '');
    if (/הצעת מחיר|להכין הצעה|לשלוח הצעה/.test(s)) return 'quote';
    if (/הרשמ|שיעור ראשון/.test(s)) return 'register';
    if (/תאריך/.test(s)) return 'date';
    if (/קבוע/.test(s)) return 'call';   // "a regular customer" is a goal, not a step (יצחק, 08/10)
    if (/לשלוח|מחירון|דוגמאות|קטלוג/.test(s)) return 'send';
    if (/מדיד|ביקור|פגיש|לתאם|בדיק|טעימ|הדגמ|תיקון/.test(s)) return 'meet';
    if (/לפני ה|לעונה/.test(s)) return 'season';
    return 'call';
  }
  const normStep = (s) => {
    const t = s && STEPS[s.type] ? s.type : 'call';
    const out = { type: t, label: (s && s.label) || STEPS[t].label, days: s && s.days != null ? s.days : STEPS[t].days, pkg: (s && s.pkg) || '' };
    if (t === 'date') out.before = s && s.before != null ? s.before : 4;   // weeks before the simcha
    if (s && s.sid) out.sid = s.sid;   // the step's own id: "done" stays on it however the list is reordered (L3)
    return out;
  };
  // "Send material — at once" is not a task. It happens the moment the button is tapped.
  const immediate = (s) => s.type === 'send' && s.days === 0;

  /* Groups of buttons: what separates one customer from another. A carpenter
   * separates by product, a distributor of bakeries by who is asking and how
   * much. These four are suggestions; a business deletes any of them and adds
   * its own. */
  const STD = {
    what: { title: 'במה התעניין', hint: 'מוצרים או שירותים', multi: true },
    who:  { title: 'מי הוא', hint: 'פרטי, מוסד, בעל שמחה' },
    size: { title: 'כמה הוא קונה', hint: '' },
    when: { title: 'מתי', hint: 'עכשיו, לשמחה, לעונה' },
  };
  // Importance is one star, on or off (יצחק, 16/10): it decides only who comes first. Kept as a weight of 2 so old data reads the same.
  const isStar = (b) => (b && b.weight || 0) >= 2;
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
      { label: 'מוסד', steps: [{ type: 'meet', label: 'לקבוע פגישה' }], weight: 2 },
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
His goal at the fair — he was asked inside his text "what do you want from this fair"; read it from there${goal ? ', and also from this' : ''}:
"""${(goal || 'see his text').slice(0, 800)}"""

While talking to a visitor he taps buttons on the tablet. Decide which of these four groups really separate one customer from another FOR THIS BUSINESS AND THIS GOAL — the ones where a different answer means he does something different next. Use one or two groups, three at most:
- "what": products or services. Only if the difference changes what he does next. Products handled the same way are ONE button, or no group at all.
- "who": the kind of visitor (e.g. פרטי, בעל שמחה, מוסד, גבאי או קבוצה, עסק, בעל קייטרינג, חנות).
- "size": the size of the order (e.g. יחידה, משפחה, אירוע, מוסד, אספקה קבועה).
- "when": timing (e.g. עכשיו, לשמחה בתאריך, לעונה).

Each button: {"label": 1-3 Hebrew words, "star": true only for the buttons of his biggest orders or most valuable visitors GIVEN HIS GOAL (a third of the buttons at most), "steps": one or two steps}.
Each step: {"step": one of "call","send","quote","meet","date","register","season","none", "stepLabel": what HE does, 2-4 Hebrew words in his trade's language, "days": after how many days (0 = at once)}.
Step meanings: call = phone him back; send = send material (days 0 = sent from the booth at once); quote = prepare a price quote; meet = meeting, visit, tasting, measuring, demo; date = depends on a date (an event); register = sign up; season = come back before his busy season; none = no task.
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
        const weight = b && (b.star === true || +b.weight >= 2) ? 2 : 0;   // the star: "these come first"
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
  // A7 (יצחק, 16/10): "קר" and "פושר" describe the person; the default describes his situation. "סתם" is gone — a visitor who saw it would be hurt.
  const GRADES = {
    serious: { name: 'ברירת המחדל', words: ['רציני', 'שוקל', 'לא עכשיו'] },
    classic: { name: 'הקלאסי', words: ['חם', 'פושר', 'קר'] },
    time:    { name: 'לפי זמן', words: ['עכשיו', 'בהמשך', 'לא כרגע'] },
    plain:   { name: 'במילים פשוטות', words: ['מעניין מאוד', 'מעניין', 'רק עבר'] },
  };
  const EXAMPLES = {
    'נגר': 'נגרייה: מטבחים, ארונות קיר ודלתות פנים, לבתים ולמוסדות. מגיעים למדידה, ואחרי זה הצעת מחיר.',
    'מאפים': 'משווק לחמים ומזונות של מאפיות בוטיק, לאירועים, לעסקים ולכל מי שצריך. יש מחירון, ומי שלוקח באופן קבוע מקבל משלוח.',
    'הפעלות': 'הפעלות חוויתיות וטיולים לקבוצות ולמוסדות. העונה החזקה בבין הזמנים.',
    'דפוס': 'דפוס: הזמנות לחתונות, חוברות ושילוט לעסקים. שולחים דוגמאות והצעת מחיר.',
  };

  /* Three phases (יצחק, 17/10):
   *   setup — once: who he is, his business, what goes out, what the system does by itself. Afterwards the
   *           same screens are the settings, reachable at any time.
   *   the booth, the evening and the CRM — with sample data and "add samples" buttons, until Yitzhak switches the
   *           system to real (his call, in real time, a day or two before the fair). Then the samples are gone,
   *           and every exhibitor is told so.
   *   after the fair — a day or two on, only the CRM is left; the booth is hidden.
   * `phase` is where the screen is (setup / live / settings); `sys` is where the system is (demo / real / after). */
  function fresh() {
    return {
      signed: false, sys: 'demo', phase: 'setup', step: 'account', sub: 'buttons', view: 'booth', shift: 0,
      account: { name: '', email: '', phone: '', wa2: '' },
      notices: [{ id: 'n0', at: Date.now(), text: 'ברוך הבא לדוכן חכם. עד שהמערכת תעבור למצב אמיתי, הדוכן וה-CRM מלאים בדוגמאות — כדי להתאמן.', urgent: false, read: false }],
      seen: {},
      biz: {
        name: '', said: '', goal: '', goalNote: '', parsedFrom: null, by: null, trade: '', unclear: [], dropped: [],
        removed: [], removedGroups: [], groups: [], buttons: [], bseq: 1,
        defSteps: [{ type: 'call', label: 'לחזור אליו', days: 3 }], defByHand: false,
        seasons: [], seasonsByHand: false, seasonDefs: JSON.parse(JSON.stringify(H.SEASONS)), remindWeeks: 3,
        grades: 'serious', idleSec: 12, hideVisited: true, coldDo: 'ask', noAnsDo: 'ask', collectList: false,
        materials: [], channels: { email: true, sms: false, wa: false }, waHow: '',
        mail: { replyTo: '', prefix: '' }, smsName: '',
        template: 'שלום {שם}, תודה שעברת בדוכן של {עסק}. מצורף {קובץ}. נשמח לעמוד לשירותך.',
        devices: 1,
      },
      leads: [], seq: 1, nseq: 1, ai: { dash: null, crm: null },
    };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
  let DEV;
  try { DEV = JSON.parse(localStorage.getItem(DEVKEY)) || { role: 'owner' }; } catch (e) { DEV = { role: 'owner' }; }
  /* L3: every step of a button (and of the default) gets an id of its own. A step that had none was known by its
   * place ("k3:0"); when it gets its id, what leads marked on that place moves to the id, so nothing done is lost. */
  function ensureSids() {
    if (!S || !S.biz) return;
    const fix = (owner, steps) => (steps || []).forEach((s, i) => {
      if (!s || s.sid) return;
      s.sid = 's' + (S.biz.bseq++);
      const from = owner + ':' + i;
      const to = owner + ':' + s.sid;
      S.leads.forEach((l) => {
        if (l.done && l.done.includes(from)) l.done = l.done.map((k) => (k === from ? to : k));
        if (l.moved && l.moved[from] != null) { l.moved[to] = l.moved[from]; delete l.moved[from]; }
      });
    });
    fix('def', S.biz.defSteps);
    (S.biz.buttons || []).forEach((b) => fix(b.id, b.steps));
    // L1: a button with no steps of its own used to carry the default under its own name ("k5:0"); the default is now
    // the default's own ("def:<id>"), so what was marked on it moves there and does not come back as a new task.
    (S.biz.buttons || []).filter((b) => !(b.steps && b.steps.length)).forEach((b) => (S.biz.defSteps || []).forEach((s, i) => {
      const from = b.id + ':' + i;
      const to = 'def:' + s.sid;
      S.leads.forEach((l) => {
        if (l.done && l.done.includes(from)) l.done = l.done.filter((k) => k !== from).concat(l.done.includes(to) ? [] : [to]);
        if (l.moved && l.moved[from] != null) { if (l.moved[to] == null) l.moved[to] = l.moved[from]; delete l.moved[from]; }
      });
    }));
  }
  const save = () => { ensureSids(); try { localStorage.setItem(KEY, JSON.stringify(S)); localStorage.setItem(DEVKEY, JSON.stringify(DEV)); } catch (e) { /* private window, or full */ } if (S.phase === 'settings') flashSaved(); };

  const words = () => GRADES[S.biz.grades].words;
  const worker = () => DEV.role === 'worker';
  const ownerOnly = (what) => toast('🔒 ' + what + ' — רק בטאבלט של בעל הדוכן');
  // The demo can step forward in time, so the CRM can be seen on the days after the fair.
  const now = () => Date.now() + S.shift * H.DAY;

  const btnById = (id) => S.biz.buttons.find((b) => b.id === id);
  const groupById = (id) => S.biz.groups.find((g) => g.id === id);
  const groupButtons = (gid) => S.biz.buttons.filter((b) => b.axis === gid);
  const liveGroups = () => S.biz.groups.filter((g) => groupButtons(g.id).length);
  // A business record is not asked who he is — the system knows he is a business (UX review D-4: "no question is asked if the answer can be known").
  const groupsFor = (l) => liveGroups().filter((g) => !(l && l.b != null && g.id === 'who'));
  const tagged = (l) => l.tags.map(btnById).filter(Boolean);
  const leadById = (id) => S.leads.find((l) => l.id === id);
  // Until the system is switched to real, whatever is recorded is a sample — and is deleted at the switch.
  const practice = () => S.sys === 'demo';
  const atBoothNow = () => S.phase === 'live' && S.view === 'booth';
  const afterFair = () => S.sys === 'after';
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
  /* Two axes, kept apart (יצחק, 09/10):
   *   warmth     — how interested HE is. Only the owner says so, by hand (17/10): a warmth the system
   *                guessed was a mark he did not make, and it moved when he tapped something else.
   *   importance — how much such a visitor is worth to the owner: the star of the buttons. It orders the lists;
   *                it never makes a lead warm. */
  /** Importance: a star on any button tapped for him. */
  const importance = (l) => (tagged(l).some(isStar) ? 1 : 0);
  const effWarm = (l) => (l.warmth == null ? null : l.warmth);
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
  /* A change to a button's steps after leads were tagged with it (יצחק, 17/10): by default it is for the next
   * visitors only. Those already tagged keep the steps they had — frozen on the lead, under the same keys, so
   * what was done or moved stays done or moved. Steps the owner set by hand on a lead are never touched. */
  const stepsFor = (l, b) => (l.frozen && l.frozen[b ? b.id : 'def'] ? l.frozen[b ? b.id : 'def'].map(normStep) : stepsOf(b));
  function derived(l) {
    // A button with no steps of its own adds nothing when another tapped button gives a step (L1):
    // "פרטי" + "מטבחים" is one measuring visit, not a visit and a call. The default comes in only when no button gives one.
    const own = tagged(l).filter((b) => (b.steps && b.steps.length) || (l.frozen && l.frozen[b.id]));
    const src = own.length ? own.map((b) => [b.id, stepsFor(l, b)]) : [['def', stepsFor(l, null)]];
    const seen = new Set();
    const out = [];
    src.forEach(([id, ss]) => ss.forEach((s, i) => {
      const sig = s.type + '|' + s.label;
      if (seen.has(sig)) return;
      seen.add(sig);
      out.push(Object.assign({}, s, { key: id + ':' + (s.sid || i) }));   // L3: a step keeps its key when the steps are reordered
    }));
    return out;
  }
  // Friday is short and busy before Shabbat: a call or a meeting moves to Sunday. Messages and preparation still may land on it.
  const talk = (t) => t === 'call' || t === 'meet';
  function dueOf(l, s) {
    if (l.moved[s.key]) return new Date(l.moved[s.key]);
    // "Depends on a date": like a season, but his own — X weeks before the simcha. Checked before a stored day,
    // so a date filled in later still moves a step that was added by hand.
    if (s.type === 'date' && l.eventDate) {
      const d = H.addDays(new Date(new Date(l.eventDate + 'T09:00').getTime() - (s.before || 4) * 7 * H.DAY), 0);
      return d.getTime() > now() ? d : H.addDays(new Date(now()), 1);
    }
    if (s.dueAt) return new Date(s.dueAt);
    if (s.type === 'season') return seasonDue() || H.addDays(new Date(l.at), 3);
    let days = s.days == null ? 2 : s.days;
    if (effWarm(l) === 0) days = Math.min(days, 1);
    return H.addDays(new Date(l.at), Math.max(1, days), talk(s.type));
  }
  /** Everything still to do for this lead, soonest first. Empty: closed either way, kept for the list only, or waiting for the owner. */
  function tasks(l) {
    if (l.lost || l.audience || l.listOnly) return [];
    const w = effWarm(l);
    // "Cold" means whatever the owner meant by it (יצחק, 16/10): he says beforehand what follows from it — ask him in the
    // evening (the default), the mailing list, or the same tasks as anyone.
    const coldHold = w === 2 && S.biz.coldDo !== 'tasks';
    let list = coldHold ? [] : derived(l);
    const saidNone = list.some((s) => s.type === 'none');
    list = list.filter((s) => s.type !== 'none' && !immediate(s));
    // Buttons that only send at once still leave someone to follow up with.
    if (!list.length && !coldHold && !saidNone && tagged(l).length) list = stepsFor(l, null).map((s, i) => Object.assign({}, s, { key: 'def:' + (s.sid || i) })).filter((s) => s.type !== 'none' && !immediate(s));
    const season = seasonStart();
    return list.concat(l.manual).filter((s) => !l.done.includes(s.key))
      .map((s) => Object.assign({}, s, { due: dueOf(l, s), season: s.type === 'season' && season ? season.name : undefined }))
      .sort((a, b) => a.due - b.due || PRI.indexOf(a.type) - PRI.indexOf(b.type));
  }
  /* Two axes again (יצחק, 18/10 — they were lost on the way since 23/09):
   *   the outcome — open, a deal ("נסגרה עסקה"), or not closed ("לא נסגרה"); the last two end the follow-up;
   *   the mailing list — in or out, whatever the outcome. A customer who closed a deal can be on it too.
   * Asking to be removed takes him off the list, and only that. A lead whose buttons say "no task", or a "cold"
   * one when the owner chose so, has no follow-up without a tap — he is not closed, he simply has nothing to do. */
  const saidNone = (l) => derived(l).some((s) => s.type === 'none');
  const ended = (l) => !!l.lost || !!l.listOnly || (!l.won && !tasks(l).length && (saidNone(l) || (S.biz.coldDo === 'list' && effWarm(l) === 2)));
  const onList = (l) => !l.optOut && l.list !== false;
  /** No step, not closed, not ended: the owner has not said what to do with him yet. */
  const undecided = (l) => !l.won && !ended(l) && !tasks(l).length;
  const lostStage = () => (stageOf('lost') || {}).id || 'lost';
  /** "Not closed": the follow-up ends, and he stays on the mailing list unless he asked to be removed. */
  const toEnd = (l, why) => setStage(l, lostStage(), why);
  const restWord = (l) => (l.won ? 'נסגרה עסקה' : l.listOnly ? 'רק רשימת התפוצה' : l.lost ? stageById(l.stage).name : ended(l) ? 'בלי מעקב' : 'מחכה להחלטה');
  const NOFOLLOW = 'בלי מעקב';   // the action that ends the follow-up without a deal, as the buttons say it
  function plan(l) {
    // An open lead with no step is not on the list: he waits for the owner's decision, and says so wherever he appears.
    return tasks(l)[0] || { type: 'none', label: restWord(l), due: null };
  }
  const dayNo = (t) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / H.DAY);
  /** W27: the way the community writes a day — "יום ג׳, ז׳ כסלו". The civil date stays on the lead's page only. */
  const shortDay = (d) => { const p = H.parts(d); return 'יום ' + 'אבגדהוש'[d.getDay()] + '׳, ' + H.gem(p.d) + ' ' + H.HE[p.m]; };
  function dueText(d) {
    if (!d) return '';
    const diff = dayNo(d.getTime()) - dayNo(now());
    const rel = diff < 0 ? 'באיחור · ' : diff === 0 ? 'היום · ' : diff === 1 ? 'מחר · ' : '';
    return rel + shortDay(d);
  }
  const daysWord = (s) => (s.type === 'none' ? 'בלי משימה' : s.type === 'season' ? 'לפני העונה' : s.days === 0 ? 'מיד' : inDays(s.days));
  /** W28: "בעוד 3 ימים", not "תוך 3 ימים" — the task is set for that day, not "any time until". */
  function inDays(n) { return n <= 0 ? 'היום' : n === 1 ? 'מחר' : n === 2 ? 'בעוד יומיים' : n === 7 ? 'בעוד שבוע' : n === 14 ? 'בעוד שבועיים' : n === 30 ? 'בעוד חודש' : 'בעוד ' + n + ' ימים'; }
  const stepText = (s) => STEPS[s.type].icon + ' ' + s.label + (s.pkg && pkgById(s.pkg) ? ' (' + pkgById(s.pkg).name + ')' : '') + ' · ' + daysWord(s);
  const stepsText = (ss) => ss.map(stepText).join('  +  ');
  const planHTML = (p, bare) => `${STEPS[p.type].icon} <b>${esc(p.label)}</b>${p.due && !bare ? ' · ' + esc(dueText(p.due)) : ''}${p.season ? ' · לקראת ' + esc(p.season) : p.type === 'season' && p.due ? ' · אין עונה מוגדרת' : ''}`;
  const log = (l, t) => l.log.push({ at: now(), t });
  const addManual = (l, s, dueAt) => { l.manual.push({ key: 'm' + (S.nseq++), type: s.type, label: s.label, days: s.days, pkg: s.pkg || '', before: s.before, phase: s.phase || '', dueAt }); };
  function dueFor(s) {
    if (s.type === 'season') { const d = seasonDue(); return d ? d.getTime() : H.addDays(new Date(now()), 3).getTime(); }
    return H.addDays(new Date(now()), Math.max(1, s.days || 0), talk(s.type)).getTime();
  }

  // ------------------------------------------------------------------
  // Shell
  // ------------------------------------------------------------------
  // Setting up is four steps, once (יצחק, 17/10). The same screens are the settings afterwards, split in two:
  // how the system works, and his details and connections. Practising is the booth itself, before the fair.
  /* 20/10 (יצחק): settings and setup are the same thing. A one-time registration (welcome, his details, the business),
   * then the setup IS the settings' two parts — details and connections, opened at "הודעות", and the customization,
   * headed by what the AI understood and made for him. "סיימתי להגדיר" ends it; afterwards the same screens are the settings. */
  const SETUP = [['welcome', 'ברוך הבא'], ['account', 'הפרטים שלך'], ['biz', 'העסק'], ['messages', 'הודעות'], ['custom', 'התאמה אישית']];
  const SETTINGS_NAV = [['details', 'פרטים וחיבורים'], ['how', 'התאמה אישית']];
  const SUBS_HOW = [['buttons', 'כפתורים ומשימות'], ['booth', 'הדוכן'], ['auto', 'מה קורה לבד'], ['seasons', 'עונות'], ['crm', 'שלבי המכירה']];
  // How it is sent, the messages and the morning message are one tab (יצחק, 20/10).
  const SUBS_DET = [['account', 'פרטי העסק'], ['biz', 'תיאור העסק'], ['messages', 'הודעות']];
  // Old links across the code name a screen by its old place; each lands in its new one.
  const SUB_ALIAS = { connect: 'messages', send: 'messages', channels: 'messages', materials: 'messages', digest: 'messages' };
  /** The part of the settings on screen: in the setup, the step says which. */
  const setPart = () => (S.phase === 'setup' ? (S.step === 'messages' ? 'details' : 'how') : S.step);
  function goSettings(sub) {
    sub = SUB_ALIAS[sub] || sub || 'buttons';
    if (S.phase !== 'settings') S.backView = S.phase === 'live' ? S.view : S.backView;
    S.phase = 'settings';
    S.step = SUBS_DET.some(([k]) => k === sub) ? 'details' : 'how';
    S.sub = sub;
    openId = null; stopIdle(); save(); render(); window.scrollTo(0, 0);
  }
  // 16/10: the booth screen and the evening screen keep working names until the product has its own.
  const LIVE = [['booth', 'הדוכן'], ['dash', 'סוף היום'], ['crm', 'CRM']];
  const liveNav = () => (afterFair() ? [['crm', 'CRM']] : LIVE.filter(([k]) => !(worker() && k === 'crm')));
  function render() {
    if (adminMode()) return renderAdmin();
    renderTop();
    const m = $('#main');
    if (!S.signed) { m.classList.remove('wide'); return viewSignIn(m); }
    // The tracking view and the settings are mostly used on a computer (יצחק, 11–12/10): they take the width. A tablet is narrower anyway.
    m.classList.toggle('wide', S.phase === 'settings' || (S.phase === 'live' && S.view === 'crm'));
    if (S.phase === 'setup') {
      if (!SETUP.some(([k]) => k === S.step)) S.step = 'welcome';
      if (S.step === 'messages' || S.step === 'custom') viewSettings(m);
      else ({ welcome: viewWelcome, account: viewAccount, biz: viewBiz }[S.step])(m);
      const i = SETUP.findIndex(([k]) => k === S.step);
      const next = S.step === 'welcome' ? '<button class="btn primary big" data-act="setup-next">נתחיל ←</button>'
        : S.step === 'custom' ? '<button class="btn primary big" data-act="setup-finish">סיימתי להגדיר ✓</button>'
        : `<button class="btn primary big" data-act="setup-next">הבא: ${esc(SETUP[i + 1][1])} ←</button>`;
      m.insertAdjacentHTML('beforeend', `<div class="next-bar">${i > 1 ? `<button class="btn ghost" data-step="${SETUP[i - 1][0]}">→ חזרה</button>` : ''}${next}</div>`);
      return noticeBar(m);
    }
    if (S.phase === 'settings') { viewSettings(m); return noticeBar(m); }
    if (afterFair() && S.view !== 'crm') S.view = 'crm';   // after the fair only the CRM is left
    if (worker() && (S.view === 'crm' || afterFair())) S.view = afterFair() ? 'over' : 'booth';   // E7: a worker tablet is for the fair day only
    // A screen that fails says so, with the reason — a blank page tells no one anything.
    try { ({ booth: viewBooth, dash: viewDash, crm: viewCRM, over: viewWorkerOver }[S.view] || viewBooth)(m); }
    catch (er) { showFail(m, er); }
    noticeBar(m);
  }
  function viewWorkerOver(m) {
    m.innerHTML = `<section class="card narrow" style="margin-top:20px"><h1>התערוכה הסתיימה</h1><p class="muted">הטאבלט הזה היה לדוכן ביום התערוכה. מה שנרשם בו נמצא אצל בעל הדוכן, ב-CRM.</p></section>`;
  }
  function showFail(m, er) {
    const where = String((er && er.stack) || '').split('\n').slice(1, 3).map((s) => s.trim()).join(' | ');
    // K10: what he needs to know first — what he marked is saved. The technical part is folded, for whoever fixes it.
    m.innerHTML = `<section class="card" style="margin-top:14px"><h2>משהו השתבש במסך הזה</h2>
      <p class="muted">מה שסימנת — שמור.</p>
      <details class="faint"><summary>פרטים טכניים</summary><p dir="ltr">${esc(String((er && er.message) || er))}</p><p dir="ltr">${esc(where)}</p></details>
      <div class="actions"><button class="btn" data-view="${afterFair() ? 'crm' : 'booth'}">חזרה</button></div></section>`;
  }
  // An error in a button shows at the bottom of the screen, so a tap that "does nothing" names its reason.
  window.addEventListener('error', () => { try { toast('משהו לא עבד. אפשר לנסות שוב.'); } catch (x) { /* before toast exists */ } });
  const unread = () => (S.notices || []).filter((n) => !n.read);
  /* ------------------------------------------------------------------
   * The shell, from the brand book (יצחק, 19–20/10; https://claude.ai/artifact/PhXCTLxz4Xu6GhDPCaUaMK).
   * A computer: a white menu on the side, with a switch between the fair day and the CRM that shows only that part;
   * help, support, the AI agent and the settings always at its foot. A panel opens beside the menu, the menu folds to
   * its icons, and the content is pushed aside — nothing is hidden. The menu folds by hand at any time too.
   * A tablet: a header with the same switch, and a bar at the bottom with a raised middle — "＋ מבקר חדש" on the fair
   * day, the home screen in the CRM — both sides equal, help and settings always in it. The AI agent floats above the
   * bar as a circle. Help opens one dialog in the middle with support and the videos.
   * ------------------------------------------------------------------ */
  const UI = { panel: null };   // null · 'help' · 'support' · 'ai' · 'menu' (the tablet's one help dialog)
  /** A computer or a tablet: a mouse and the width for a menu — unless the demo's menu chose one. */
  const deskMode = () => (DEV.ui ? DEV.ui === 'desk' : FINE && innerWidth >= 1000);
  const shellOn = () => S.signed && S.phase !== 'setup';
  const slimNav = () => !!(DEV.navFolded || UI.panel);
  /** The width the content really has, beside the menu and an open panel. */
  const contentW = () => innerWidth - (shellOn() && deskMode() ? (UI.panel ? 76 + 400 : DEV.navFolded ? 76 : 248) : 0);
  const canCrm = () => !worker();
  const canFair = () => !afterFair();
  /** Which part he is in. In the settings, the part he came from. */
  const inFair = () => { const v = S.phase === 'settings' ? S.backView : S.view; return canFair() && (v === 'booth' || v === 'dash' || !canCrm()); };
  /** The assistant is everywhere but at the booth (יצחק, 17/10): there he talks to a person, not to a screen. */
  const assistOk = () => shellOn() && !worker() && !(S.phase === 'live' && S.view === 'booth');
  /** The screen he is on, as the help names it. */
  const helpHere = () => (S.phase === 'settings' ? (HELP[S.sub] ? S.sub : 'buttons') : S.view === 'crm' ? (S.crmTab === 'overview' ? 'home' : null) : S.view === 'dash' ? 'dash' : 'booth');
  /** A small label above the screen's title on a computer, naming the part he is in (יצחק, 20/10). */
  const eyebrow = (t) => (deskMode() ? `<div class="eyebrow">${esc(t)}</div>` : '');

  /** Go to a place in either part. Leaving the settings this way is leaving them. */
  function goPlace(view, tab) {
    if (view === 'crm' && !canCrm()) return ownerOnly('המעקב');
    if (S.phase === 'settings') { S.phase = 'live'; S.backSetup = null; }
    if (UI.panel && !deskMode()) UI.panel = null;
    if (UI.panel === 'ai' && view === 'booth') UI.panel = null;
    S.view = view;
    if (tab) { S.crmTab = tab; S.crmLead = null; tbSel.clear(); }
    closeLead(); closeHeld(); closeSheet(false); fillOpen = false; filled.clear(); fillSnap = {}; filledCold.clear();
    if (view === 'crm') idleOnce();
    save(); render(); window.scrollTo(0, 0);
  }
  function openPanel(p) {
    UI.panel = UI.panel === p && deskMode() ? null : p;
    if (UI.panel === 'support') { (S.notices || []).forEach((x) => { x.read = true; }); save(); }
    render();
  }

  function renderTop() {
    const setup = S.phase === 'setup';
    const shell = shellOn();
    const desk = deskMode();
    document.body.classList.remove('admin-page');
    document.body.classList.toggle('shell', shell);
    document.body.classList.toggle('is-desk', shell && desk);
    document.body.classList.toggle('is-tab', shell && !desk);
    document.body.classList.toggle('nav-slim', shell && desk && slimNav());
    document.body.classList.toggle('with-panel', shell && !!UI.panel);
    document.body.classList.toggle('no-help', !!DEV.helpOff);
    if (UI.panel === 'ai' && !assistOk()) UI.panel = null;
    // The demo shows the final system (יצחק, 20/10): the operator's tools live on their own page (#admin). While the
    // booth is a sample one, each send says it did not go out; once it is real, one bar says this is still a demo.
    const bar = S.signed && !practice();
    document.body.classList.toggle('has-demo', bar);
    $('#demo').innerHTML = bar ? '<span>הדגמה — שום דבר לא נשלח באמת</span>' : '';
    if (!shell) {
      // Signing in and the setup: a thin header. Setup is a line of steps, not a menu (יצחק, 17/10).
      const at = SETUP.findIndex(([k]) => k === S.step);
      $('#side').innerHTML = ''; $('#bar').innerHTML = '';
      $('#top').innerHTML = `<div class="top-in">
        <span class="bsd" aria-label="בסייעתא דשמיא">בס"ד</span>
        <div class="brand"><span class="mark" aria-hidden="true"></span>${esc(S.biz.name || 'דוכן חכם')}${setup && S.signed ? ' <span class="faint">· הקמה</span>' : ''}</div>
        ${setup && S.signed ? `<nav class="stepper" aria-label="שלבי ההקמה">${SETUP.map(([k, t], n) => `<button class="st${n < at ? ' done' : ''}" data-step="${k}" aria-current="${S.step === k}" ${n > (S.setupReach || 0) ? 'disabled' : ''}><span class="bar"></span><span class="t">${n + 1}. ${t}</span></button>`).join('')}</nav>` : ''}
      </div>`;
      renderPanel();
      return paintSaved();
    }
    if (desk) { $('#side').innerHTML = sideHTML(); $('#top').innerHTML = ''; $('#bar').innerHTML = ''; }
    else { $('#side').innerHTML = ''; $('#top').innerHTML = tabHeadHTML(); $('#bar').innerHTML = barHTML(); }
    renderPanel();
    paintSaved();
  }

  /* ------------------------------------------------------------------
   * The operator's page (יצחק, 20/10): "the demo shows the final system, so everything about operating it is outside".
   * The same address with #admin. It shares the browser's storage with the system, so a change here reaches an open
   * system tab at once (it reloads on the storage event). Nothing here is part of what an exhibitor sees.
   * ------------------------------------------------------------------ */
  // The address carries #admin, or the sign-in page's link opened it: a framed page may not let the address change.
  let adminOn = false;
  const adminMode = () => adminOn || location.hash === '#admin';
  function renderAdmin() {
    document.body.className = 'admin-page';
    ['#side', '#top', '#bar', '#demo'].forEach((s) => { if ($(s)) $(s).innerHTML = ''; });
    const p = $('#panel'); if (p) p.remove();
    const sc = $('#pscrim'); if (sc) sc.remove();
    const opt = (attr, val, on, t, sub) => `<button class="opt" data-${attr}="${val}" aria-pressed="${on}">${esc(t)}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
    $('#main').innerHTML = `<section class="card narrow admin">
      <div class="eyebrow">לא חלק מהמערכת</div>
      <h1>מסך מפעיל</h1>
      <p class="muted">כאן מפעילים את ההדגמה: מצב המערכת, הודעות לכל המציגים, הזמן, והתצוגה. מה שמשנים כאן מגיע מיד לחלון המערכת הפתוח.</p>
      <h2>מצב המערכת</h2>
      <div class="opts">${opt('sys', 'demo', S.sys === 'demo', SYS_NAMES.demo, 'הדוכן לדוגמה, ושום דבר לא נשלח. מתאמנים.')}${opt('sys', 'real', S.sys === 'real', SYS_NAMES.real, 'הדוגמאות נמחקות, וכל מציג מקבל הודעה. בהדגמה עדיין שום דבר לא יוצא.')}${opt('sys', 'after', S.sys === 'after', SYS_NAMES.after, 'הדוכן נסגר, ונשאר ה-CRM.')}</div>
      <h2>הודעה דחופה לכל המציגים</h2>
      <textarea id="ad-notice" class="say small" placeholder="למשל: הכניסה לאולם נפתחת היום ב-10:00. בעלי דוכנים מתבקשים להגיע עד 9:30."></textarea>
      <div class="actions"><button class="btn primary" data-act="admin-notice">לשלוח לכל המציגים</button></div>
      <h2>הזמן</h2>
      <p class="muted">היום במערכת: ${esc(shortDay(new Date(now())))}${S.shift ? ` (${S.shift} ${S.shift === 1 ? 'יום' : 'ימים'} קדימה)` : ''}.</p>
      <div class="actions"><button class="btn" data-act="next-day">⏩ יום הבא</button>${S.shift ? '<button class="btn" data-act="today">לחזור להיום</button>' : ''}</div>
      <h2>התצוגה</h2>
      <div class="opts">${opt('uiset', 'desk', DEV.ui === 'desk', 'מחשב')}${opt('uiset', 'tab', DEV.ui === 'tab', 'טאבלט')}${opt('uiset', 'auto', !DEV.ui, 'לפי המכשיר')}</div>
      <h2>איפוס</h2>
      <p class="muted">מוחק את כל המבקרים, הכפתורים וההגדרות, ומתחילים מההתחלה.</p>
      <div class="actions"><button class="btn danger" data-act="reset">איפוס מערכת</button></div>
      <div class="actions" style="margin-top:24px"><button class="btn" data-act="admin-close">← לפתוח את המערכת</button></div>
    </section>`;
  }
  window.addEventListener('hashchange', () => render());
  // The operator's page and the system in two tabs of one browser: a change in one shows in the other.
  window.addEventListener('storage', (e) => { if (e.key === KEY || e.key === DEVKEY) location.reload(); });

  /** The switch between the two parts, when both are open to him. */
  function partSwitch() {
    if (!canCrm() || !canFair()) return '';
    const fair = inFair();
    const b = (on, nav, icon, t) => `<button data-nav="${nav}" aria-pressed="${on}" title="${t}" aria-label="${t}">${ic(icon)}<span>${t}</span></button>`;
    return `<div class="part-switch" role="group" aria-label="חלק במערכת">${b(fair, 'booth', 'stand', 'יום התערוכה')}${b(!fair, 'crm:' + (S.crmTab || 'overview'), 'crm', 'CRM')}</div>`;
  }

  function sideHTML() {
    const slim = slimNav();
    const live = S.phase === 'live';
    const fair = inFair();
    const it = (label, icon, on, attrs, sub, cls) => `<button class="nv${cls ? ' ' + cls : ''}" ${attrs} aria-current="${!!on}" title="${esc(label)}" aria-label="${esc(label)}">${ic(icon)}<span class="nv-l">${esc(label)}</span>${sub ? `<span class="nv-s">${sub}</span>` : ''}</button>`;
    let items;
    if (fair) items = it('הדוכן', 'search', live && S.view === 'booth', 'data-nav="booth"') + it('סוף היום', 'check', live && S.view === 'dash', 'data-nav="dash"');
    else {
      crmPlace();
      const q = todayQueue(crmLeads()).length;
      items = CRM_TABS.map(([k, t]) => it(t, { overview: 'home', leads: 'leads', tasks: 'tasks', segments: 'bars', messages: 'mail' }[k], live && S.view === 'crm' && S.crmTab === k, `data-nav="crm:${k}"`, k === 'overview' && q ? String(q) : '')).join('');
    }
    const n = unread().length;
    const misses = assistOk() && S.view === 'crm' && live ? crmMisses().length : 0;
    return `<div class="side-top"><span class="bsd" aria-label="בסייעתא דשמיא">בס"ד</span></div>
      <div class="side-brand"><span class="mark" aria-hidden="true"></span><span class="nv-l">${esc(S.biz.name || 'דוכן חכם')}</span></div>
      ${worker() ? `<div class="side-lock nv-l">🔒 טאבלט עובד</div>` : ''}
      ${partSwitch()}
      <nav class="side-items" aria-label="${fair ? 'יום התערוכה' : 'CRM'}">${items}</nav>
      <div class="side-gap"></div>
      <div class="side-foot">
        ${it('עזרה', 'help', UI.panel === 'help', 'data-panel="help"', 'סרטונים')}
        ${it('תמיכה', 'call', UI.panel === 'support', 'data-panel="support"', n ? `<span class="dot-n">${n}</span>` : 'פנייה')}
        ${assistOk() ? it('סוכן AI', 'spark', UI.panel === 'ai', 'data-panel="ai"', misses ? `<span class="ai-n">${misses}</span>` : '', 'is-ai') : ''}
        ${worker() ? '' : it('הגדרות', 'auto', S.phase === 'settings', 'data-act="settings"')}
        ${it(slim ? 'להרחיב את התפריט' : 'לכווץ את התפריט', slim ? 'unfold' : 'fold', false, `data-act="nav-fold" aria-expanded="${!slim}"`, '', 'is-fold')}
      </div>`;
  }

  function tabHeadHTML() {
    return `<div class="tab-head"><span class="mark" aria-hidden="true"></span>
      <span class="brand">${esc(S.biz.name || 'דוכן חכם')}${S.phase === 'settings' ? ' <span class="faint">· הגדרות</span>' : ''}</span>
      <span class="bsd" aria-label="בסייעתא דשמיא">בס"ד</span>
      ${worker() ? '<span class="lock">🔒 טאבלט עובד</span>' : ''}
      ${partSwitch()}</div>`;
  }

  function barHTML() {
    const live = S.phase === 'live';
    const fair = inFair();
    const helpOn = ['menu', 'help', 'support'].includes(UI.panel);
    const tab = (label, icon, on, attrs) => `<button class="bt" ${attrs} aria-current="${!!on}">${ic(icon)}<span>${esc(label)}</span><i aria-hidden="true"></i></button>`;
    const raised = (label, icon, on, attrs) => `<button class="bt-mid" ${attrs} aria-current="${!!on}"><span class="c">${ic(icon)}</span><span>${esc(label)}</span></button>`;
    const helpTab = tab('עזרה', 'help', helpOn, 'data-panel="menu"');
    const setTab = worker() ? '' : tab('הגדרות', 'auto', S.phase === 'settings', 'data-act="settings"');
    let start, mid, end;
    if (fair) {
      start = tab('הדוכן', 'search', live && S.view === 'booth' && !UI.panel, 'data-nav="booth"') + tab('סוף היום', 'check', live && S.view === 'dash' && !UI.panel, 'data-nav="dash"');
      mid = raised('מבקר חדש', 'plus', false, 'data-act="bar-new"');
      end = helpTab + setTab;
    } else {
      crmPlace();
      const on = (k) => live && S.view === 'crm' && S.crmTab === k && !UI.panel;
      start = tab('לידים', 'leads', on('leads'), 'data-nav="crm:leads"') + tab('משימות', 'tasks', on('tasks'), 'data-nav="crm:tasks"') + tab('דשבורד', 'bars', on('segments'), 'data-nav="crm:segments"');
      mid = raised('דף הבית', 'home', on('overview'), 'data-nav="crm:overview"');
      end = tab('הודעות', 'mail', on('messages'), 'data-nav="crm:messages"') + helpTab + setTab;
    }
    return `<nav class="tab-bar" aria-label="ניווט"><div class="bt-side">${start}</div>${mid}<div class="bt-side">${end}</div></nav>
      ${assistOk() ? `<button class="ai-fab" data-panel="ai" title="סוכן AI" aria-label="סוכן AI">${ic('spark')}</button>` : ''}`;
  }

  // ---- the panels: beside the menu on a computer, one dialog in the middle on a tablet ----
  const PANEL_T = { help: 'עזרה', support: 'תמיכה', ai: 'סוכן AI', menu: 'עזרה' };
  function renderPanel() {
    let p = $('#panel');
    let sc = $('#pscrim');
    const on = shellOn() && UI.panel;
    if (!on) { if (p) p.remove(); if (sc) sc.remove(); return; }
    const desk = deskMode();
    if (!desk && !sc) { sc = document.createElement('button'); sc.id = 'pscrim'; sc.className = 'pscrim'; sc.dataset.act = 'panel-close'; sc.setAttribute('aria-label', 'סגירה'); document.body.appendChild(sc); }
    if (desk && sc) sc.remove();
    if (!p) { p = document.createElement('aside'); p.id = 'panel'; document.body.appendChild(p); }
    p.className = 'panel ' + (desk ? 'is-side' : 'is-dialog');
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', PANEL_T[UI.panel]);
    if (UI.panel === 'ai') return renderAssist();
    const back = !desk && ['help', 'support'].includes(UI.panel) ? '<button class="p-back" data-panel="menu">→ חזרה</button>' : '';
    const icon = desk ? ic({ help: 'help', support: 'call' }[UI.panel] || '') : '';
    p.innerHTML = `<div class="p-head">${back}${icon}<h2>${PANEL_T[UI.panel]}</h2>${UI.panel === 'menu' ? '<span class="faint">הכל במקום אחד</span>' : ''}
      <button class="icon-btn p-close" data-act="panel-close" aria-label="סגירה">✕</button></div>
      <div class="p-body">${UI.panel === 'menu' ? helpMenuBody() : UI.panel === 'support' ? supportBody() : helpBody()}</div>`;
  }
  /** The short explanation of the screen he is on — the "?" — as the first thing in the help. */
  function hereCard(big) {
    const k = helpHere();
    const h = k && HELP[k];
    if (!h) return '';
    return `<section class="p-sec"><div class="eyebrow">על המסך הזה</div>
      <div class="vrow"><div class="vthumb${big ? ' big' : ''}">${ic('play')}<span class="soon">בקרוב</span></div><div><b>${esc(h[0])}</b><div class="muted">${esc(h[1])}</div></div></div></section>`;
  }
  function helpBody() {
    const keys = Object.keys(HELP);
    return `<label class="p-search">${ic('search')}<input id="hp-q" type="search" placeholder="לחפש בעזרה" aria-label="לחפש בעזרה" autocomplete="off"></label>
      ${hereCard(true)}
      <section class="p-sec"><div class="eyebrow">סרטונים · פחות מדקה כל אחד</div>
        ${[['booth', 'הדוכן: לרשום מבקר בשתי נגיעות'], ['dash', 'סוף היום: להשלים מה שחסר'], ['home', 'ה-CRM: הבא בתור ומשימות'], ['buttons', 'הגדרות: כפתורים ומשימות']].map(([, t]) => `<div class="vrow"><div class="vthumb">${ic('play')}</div><div><b class="vt">${esc(t)}</b><div class="faint">יצולם לפני התערוכה</div></div></div>`).join('')}</section>
      <section class="p-sec" id="hp-list"><div class="eyebrow">הסברים קצרים בכתב</div>
        ${keys.map((k) => `<details class="hp-item" data-hk="${esc((HELP[k][0] + ' ' + HELP[k][1]).toLowerCase())}"><summary>${esc(HELP[k][0])}</summary><p>${esc(HELP[k][1])}</p></details>`).join('')}</section>
      <div class="p-switch"><span>להציג את ה-? ליד הכותרות</span><button class="switch" role="switch" aria-checked="${!DEV.helpOff}" data-act="help-toggle" aria-label="להציג את ה-? ליד הכותרות"></button></div>`;
  }
  function supportBody() {
    const notes = (S.notices || []).slice().reverse();
    return `<p class="muted">משהו לא עובד, או יש שאלה? כאן מגיעים לאדם, לא לבוט.</p>
      <section class="p-sec"><div class="eyebrow">ביום התערוכה — מענה מיידי</div>
        <div class="contact"><div><b dir="ltr">${esc(SUPPORT.phone)}</b><small>טלפון התמיכה</small></div><button class="btn" data-act="copy" data-copy="${esc(SUPPORT.phone)}">להעתיק</button></div>
        <div class="contact"><div><b dir="ltr" class="mail">${esc(SUPPORT.email)}</b><small>מייל</small></div><button class="btn" data-act="copy" data-copy="${esc(SUPPORT.email)}">להעתיק</button></div></section>
      ${notes.length ? `<section class="p-sec"><div class="eyebrow">הודעות מהמפעילים</div><ul class="notices">${notes.map((x) => `<li class="${x.urgent ? 'urgent' : ''}"><span class="when">${esc(H.heDate(new Date(x.at)))} ${new Date(x.at).toTimeString().slice(0, 5)}</span>${x.urgent ? '<b>דחוף · </b>' : ''}${esc(x.text)}</li>`).join('')}</ul></section>` : ''}
      <section class="p-sec"><div class="eyebrow">פנייה בכתב</div>
        <label class="label" for="tk-text">מה קרה?</label>
        <textarea id="tk-text" class="say small" placeholder="למשל: הטאבלט לא מוצא שמות"></textarea>
        <div class="actions"><button class="btn primary" data-act="ticket-send">לשלוח למפעילים</button><span class="faint">מצורף אוטומטית: המסך שבו אתה נמצא</span></div></section>
      ${(S.tickets || []).length ? `<section class="p-sec"><div class="eyebrow">הפניות שלך</div>${S.tickets.slice().reverse().map((x) => `<div class="ticket"><div class="ticket-top"><b>${esc(x.text.slice(0, 80))}</b><span class="pill${/נענתה/.test(x.status) ? ' good' : ''}">${esc(x.status.split(' — ')[0])}</span></div><div class="faint">${esc(x.status.split(' — ')[1] || '')} · ${esc(H.heDate(new Date(x.at)))} ${new Date(x.at).toTimeString().slice(0, 5)}</div></div>`).join('')}</section>` : ''}`;
  }
  function helpMenuBody() {
    return `<div class="p-choices">
        <button class="p-choice" data-panel="support">${ic('call')}<b>תמיכה</b><small>לדבר עם אדם: טלפון, או פנייה בכתב</small></button>
        <button class="p-choice" data-panel="help">${ic('video')}<b>סרטוני הסבר</b><small>פחות מדקה כל אחד, והסברים בכתב</small></button></div>
      ${hereCard(true)}
      <div class="contact"><div><b dir="ltr">${esc(SUPPORT.phone)}</b><small>ביום התערוכה — מענה מיידי בטלפון</small></div></div>`;
  }
  // The way of laying out changes with the width: a computer that narrows becomes a tablet, and back.
  let lastDesk = null;
  window.addEventListener('resize', () => { const d = deskMode(); if (lastDesk !== null && d !== lastDesk && S.signed) render(); lastDesk = d; });

  /* "✓ נשמר", in the top bar, a moment after every change in the settings (יצחק, 17/10): there is no "save" button to look for. */
  // Kept as a moment, not as an element: the top bar is redrawn by the same tap that saved.
  let savedAt = 0;
  let savedT;
  function flashSaved() { savedAt = Date.now(); paintSaved(); }
  function paintSaved() {
    const el = $('#saved-ind');
    if (!el) return;
    const on = S.phase !== 'live' && Date.now() - savedAt < 1400;
    el.textContent = on ? '✓ נשמר' : '';
    el.classList.toggle('on', on);
    clearTimeout(savedT);
    if (on) savedT = setTimeout(paintSaved, 1420 - (Date.now() - savedAt));
  }
  /** An urgent message from the operator stands above the screen until it is read (יצחק, 17/10). */
  function noticeBar(m) {
    const u = (S.notices || []).find((x) => x.urgent && !x.read);
    if (u) m.insertAdjacentHTML('afterbegin', `<div class="urgent-bar" role="alert"><span>⚠️ ${esc(u.text)}</span><button class="btn" data-act="notice-read" data-id="${esc(u.id)}">הבנתי</button></div>`);
  }
  const SUPPORT = { phone: '050-000-0000', email: 'support@y-h-m.com' };   // demo values: the real line is set before the fair
  function sheetBell() {
    const list = (S.notices || []).slice().reverse();
    sheet(`<h2>הודעות</h2>
      <div class="support"><b>תמיכה ביום התערוכה</b><span>טלפון: <bdi dir="ltr">${esc(SUPPORT.phone)}</bdi></span><span>מייל: <bdi dir="ltr">${esc(SUPPORT.email)}</bdi></span></div>
      ${list.length ? `<ul class="notices">${list.map((x) => `<li class="${x.read ? '' : 'new'}${x.urgent ? ' urgent' : ''}"><span class="when">${esc(H.heDate(new Date(x.at)))} ${new Date(x.at).toTimeString().slice(0, 5)}</span>${x.urgent ? '<b>דחוף · </b>' : ''}${esc(x.text)}</li>`).join('')}</ul>` : '<p class="muted">אין הודעות.</p>'}
      <div class="label">פנייה למפעילים <small>תקלה, שאלה, משהו לא עובד</small></div>
      <textarea id="tk-text" class="say small" placeholder="מה קרה? למשל: הטאבלט לא מוצא שמות"></textarea>
      <div class="actions"><button class="btn" data-act="ticket-send">לשלוח למפעילים</button></div>
      ${(S.tickets || []).length ? `<div class="label">הפניות שלך</div><ul class="notices">${S.tickets.slice().reverse().map((x) => `<li><span class="when">${esc(H.heDate(new Date(x.at)))} ${new Date(x.at).toTimeString().slice(0, 5)} · ${esc(x.status)}</span>${esc(x.text)}</li>`).join('')}</ul>` : ''}
      <div class="actions"><button class="btn primary" data-act="bell-read">סגירה</button></div>`);
  }
  /** A request to the operators (יצחק, 17/10): kept with its status. In the demo it is received, not sent anywhere. */
  function sendTicket() {
    const v = ($('#tk-text') && $('#tk-text').value.trim()) || '';
    if (!v) { if ($('#tk-text')) $('#tk-text').focus(); return toast('מה קרה?'); }
    S.tickets = (S.tickets || []).concat({ at: Date.now(), text: v.slice(0, 600), status: 'התקבלה — נחזור אליך' });
    save(); UI.panel = 'support'; render(); toast('✓ הפנייה נשלחה למפעילים (בהדגמה — לא יוצאת)');
  }
  const notify = (text, urgent) => { S.notices = (S.notices || []).concat({ id: 'n' + Date.now(), at: Date.now(), text, urgent: !!urgent, read: false }); };

  // ------------------------------------------------------------------
  // Signing in — before anything (יצחק, 17/10): Google, or a code to his mail. No password to remember.
  // ------------------------------------------------------------------
  let signStep = null;   // null · 'mail' · 'code'
  function viewSignIn(m) {
    m.innerHTML = `<section class="card narrow sign-in">
      <h1>דוכן חכם</h1>
      <p class="muted">לבעלי דוכנים בתערוכת העסקים. נכנסים פעם אחת, וממשיכים מכל מכשיר.</p>
      ${signStep === 'mail' ? `<label class="label" for="si-mail">המייל שלך</label><input id="si-mail" class="text-input ltr" type="email" autocomplete="email" placeholder="name@gmail.com">
          <div class="actions"><button class="btn primary big" data-act="si-send">לשלוח לי קוד</button><button class="btn ghost" data-act="si-back">חזרה</button></div>`
        : signStep === 'code' ? `<p>שלחנו קוד בן 4 ספרות אל <bdi dir="ltr">${esc(S.account.email)}</bdi>.</p><label class="label" for="si-code">הקוד</label><input id="si-code" class="text-input ltr" inputmode="numeric" maxlength="4" autocomplete="one-time-code">
          <p class="faint">בהדגמה: כל 4 ספרות.</p><div class="actions"><button class="btn primary big" data-act="si-code">כניסה</button><button class="btn ghost" data-act="si-back">חזרה</button></div>`
        : `<div class="opts"><button class="opt google" data-act="si-google"><span class="g">G</span> התחברות עם Google</button>
          <button class="opt" data-act="si-mail">📧 קוד למייל<small>בלי חשבון Google</small></button></div>`}
      <p class="faint" style="margin-top:18px">הדגמה: אין כאן חשבון אמיתי, ושום פרט לא יוצא מהמכשיר.
        <button class="link" data-act="admin-open">מסך מפעיל ←</button></p>
    </section>`;
    if (FINE) setTimeout(() => { const f = $('#si-mail') || $('#si-code'); if (f) f.focus(); }, 30);
  }
  function signedIn() {
    S.signed = true; signStep = null;
    // A returning exhibitor goes on where he was; a new one starts the setup.
    if (!accountOk()) { S.phase = 'setup'; S.step = 'welcome'; S.setupReach = 0; }
    save(); render(); window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------
  // Setup 1 — the business's details. No mail and no password: he signed in already (יצחק, 17/10).
  // ------------------------------------------------------------------
  let accErrors = {};
  function viewAccount(m) {
    const a = S.account;
    const err = (k) => (accErrors[k] ? `<div class="err" id="err-${k}">${esc(accErrors[k])}</div>` : '');
    const inv = (k) => (accErrors[k] ? ` aria-invalid="true" aria-describedby="err-${k}"` : '');
    const setup = S.phase === 'setup';
    const yn = (attr, val, t) => `<button class="chip" data-${attr}="${val}" aria-pressed="${a[attr === 'haswa' ? 'hasWa' : 'waSame'] === (val === '1')}">${t}</button>`;
    // WhatsApp is a small question, not a field (יצחק, 20/10): have it? on the phone above? if not, which number.
    const wa = `<div class="label">האם יש לך וואטסאפ?</div><div class="chips">${yn('haswa', '1', 'כן')}${yn('haswa', '0', 'לא')}</div>
      ${a.hasWa === true && a.phone ? `<div class="label">הוואטסאפ על <bdi dir="ltr">${esc(a.phone)}</bdi>?</div><div class="chips">${yn('wasame', '1', 'כן, על המספר הזה')}${yn('wasame', '0', 'במספר אחר')}</div>` : ''}
      ${a.hasWa === true && (!a.phone || a.waSame === false) ? `<label class="label" for="acc-wa2">מספר הוואטסאפ</label><input id="acc-wa2" class="text-input ltr" type="tel" data-acc="wa2" value="${esc(a.wa2 || '')}" autocomplete="off">` : ''}`;
    m.innerHTML = `<section class="card narrow">
      <h1>${setup ? 'הפרטים שלך' : 'פרטי העסק'} ${help('account')}</h1>
      ${setup ? '<p class="muted">פעם אחת. כל מה שתכתוב כאן נשמר גם בהגדרות, ואפשר לשנות אותו שם.</p>' : ''}
      ${a.email ? `<p class="faint">מחובר בתור <bdi dir="ltr">${esc(a.email)}</bdi></p>` : ''}
      <label class="label" for="acc-name">השם שלך <small class="req">חובה</small></label>
      <input id="acc-name" class="text-input${accErrors.name ? ' bad' : ''}" data-acc="name" value="${esc(a.name)}" autocomplete="name"${inv('name')}>${err('name')}
      <label class="label" for="acc-biz">שם העסק <small>כמו שהלקוחות מכירים אותו</small></label><input id="acc-biz" class="text-input" data-bizname value="${esc(S.biz.name)}" autocomplete="organization">
      <label class="label" for="acc-phone">טלפון העסק</label><input id="acc-phone" class="text-input ltr" type="tel" data-acc="phone" value="${esc(a.phone)}" autocomplete="tel">
      ${wa}
    </section>
    ${setup ? '' : `<section class="card narrow" style="margin-top:14px"><h2>הטאבלטים שלך</h2>
      <p class="muted">מחוברים: ${S.biz.devices} ${S.biz.devices === 1 ? 'טאבלט' : 'טאבלטים'}. טאבלט של עובד רושם ושולח, בלי הגדרות ובלי CRM.</p>
      <div class="actions">${afterFair() ? '' : '<button class="btn" data-act="devices">+ להוסיף טאבלט</button>'}</div></section>
    <section class="card narrow" style="margin-top:14px"><h2>החשבון</h2>
      <p class="muted">${a.email ? `מחובר בתור <bdi dir="ltr">${esc(a.email)}</bdi>.` : 'מחובר.'}</p>
      <div class="actions"><button class="btn" data-act="sign-out">יציאה מהחשבון</button></div></section>`}`;
  }
  /** The number his WhatsApp is on, from the small question — or none. */
  const waNumber = () => (S.account.hasWa ? (S.account.waSame !== false && S.account.phone ? S.account.phone : S.account.wa2) : '');
  /** Errors beside the fields, focus on the first: a toast that vanishes is no place for them. */
  function checkAccount() {
    accErrors = {};
    if (!S.account.name) accErrors.name = 'מה השם שלך?';
    return !Object.keys(accErrors).length;
  }
  const accountOk = () => !!S.account.name;
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
  let exPending = null;
  function useExample(k) { const t = EXAMPLES[k]; if (!t || !$('#say')) return; $('#say').value = t; S.biz.by = null; understandWords(t); }

  // ------------------------------------------------------------------
  // Setup 2 — the business and the goal, in his words
  // ------------------------------------------------------------------
  function viewBiz(m) {
    m.innerHTML = `<div class="onb">
      <section class="card">
        <h1>ספר לי על העסק שלך ${help('biz')}</h1>
        <p class="muted">כתוב כמו שהיית מספר ללקוח. ככל שתכתוב יותר — הכפתורים בדוכן יתאימו יותר:</p>
        <ul class="prompts"><li>מה אתה מוכר, ולמי?</li><li>איך מתחילים לעבוד איתך? (מחירון, מדידה בבית, טעימה, פגישה)</li><li>מה לקוח רגיל קונה, ומי הלקוח הכי טוב שלך?</li><li>מתי אצלך הכי עמוס? (לפני פסח, עונת החתונות…)</li><li>מה מבקשים ממך בדוכן בדרך כלל? (קטלוג, מחירון, תמונות)</li>
          <li class="goal-q"><b>ובעיקר: מה אתה רוצה מהאקספו הזה?</b> למשל: "הפעם אני מחפש מוסדות"</li></ul>
        <textarea id="say" class="say" placeholder="מה אתה מוכר, למי, ואיך מתחילים לעבוד איתך. במילים שלך, כמו ללקוח.">${esc(S.biz.said)}</textarea>

        <div class="examples"><span class="faint">דוגמה:</span>
          ${Object.keys(EXAMPLES).map((k) => `<button class="chip" data-ex="${esc(k)}">${esc(k)}</button>`).join('')}</div>
        <div id="say-actions"></div>
      </section>
      <section class="card" id="preview"></section>
    </div>`;
    const say = $('#say');
    let t;
    say.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => understandWords(say.value), 220); });

    renderSayActions();
    renderPreview();
    if (!S.biz.said && FINE) setTimeout(() => say.focus(), 40);
  }
  function renderSayActions() {
    const box = $('#say-actions');
    if (!box) return;
    const stale = S.biz.by === 'ai' && ((($('#say') && $('#say').value) !== S.biz.parsedFrom) || S.biz.goal !== S.biz.goalFrom);
    box.innerHTML = ai
      ? `<div class="actions"><button class="btn primary big" data-act="ai-read" id="ai-btn">✨ תסדר לי הכל בשנייה</button>
          <span class="faint" id="ai-note">${stale ? 'שינית — לחץ שוב לעדכון' : S.biz.by === 'ai' ? '✓ מסודר' : 'בינתיים — הצעה ראשונה'}</span></div>`
      : '';   // without the AI there is no button at all — and no note about word lists (H25)
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
    // A button that real leads are tagged with is never dropped by a new reading (K1): a word changed in the
    // description — even for a moment while typing — must not wipe what was tapped at the fair.
    const used = new Set([].concat(...S.leads.filter((l) => !l.practice).map((l) => l.tags)));
    const keep = old.filter((x) => !x.byHand && used.has(x.id) && !read.some((y) => y.id === x.id));
    b.buttons = hand.concat(keep, read);
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
  /* "What I understood" became the booth card itself (יצחק, 17/10): he sees what the visitor's card will look like,
   * tries it — a tap shows what follows — and in "עריכה" a tap on a button opens it to change. */
  let PVW = { mode: 'try', tags: [], warm: null };
  function renderPreview() {
    const box = $('#preview');
    if (!box) return;
    const b = S.biz;
    const gs = liveGroups();
    if (!gs.length) { box.innerHTML = '<h2>כך ייראה הכרטיס בדוכן</h2><div class="empty">תתחיל לכתוב, והכרטיס של המבקר ייבנה כאן.</div>'; return; }
    PVW.tags = PVW.tags.filter((id) => btnById(id));
    const fake = { tags: PVW.tags, manual: [], done: [], moved: {}, lost: false, won: false, warmth: PVW.warm, at: now(), frozen: null };
    const ts = tasks(fake);
    const edit = PVW.mode === 'edit';
    const seasons = b.seasons.map((id) => (b.seasonDefs.find((s) => s.id === id) || {}).name).filter(Boolean);
    box.innerHTML = `<div class="pv-head"><h2>כך ייראה הכרטיס בדוכן ${help('preview')}</h2>
        <nav class="tabs" aria-label="מצב"><button class="tab" data-pvmode="try" aria-pressed="${!edit}">לנסות</button><button class="tab" data-pvmode="edit" aria-pressed="${edit}">✎ לערוך</button></nav></div>
      ${b.trade || b.goalNote ? `<p class="faint">${b.trade ? 'התחום: <b>' + esc(b.trade) + '</b>' : ''}${b.trade && b.goalNote ? ' · ' : ''}${b.goalNote ? 'המטרה: <b>' + esc(b.goalNote) + '</b>' : ''}</p>` : ''}
      <div class="lead pv-card${edit ? ' editing' : ''}">
        <div class="lead-head"><div><span class="nm">משה כהן</span> <span class="muted">בני ברק</span><div class="faint">מבקר לדוגמה</div></div></div>
        <div class="warmth">${words().map((t, k) => `<button class="warm-btn w${k}" data-pvwarm="${k}" aria-pressed="${PVW.warm === k}" ${edit ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>
        ${gs.map((g) => `<div class="label">${esc(g.title)}${edit ? ` <button class="link" data-editgroup="${g.id}">עריכה</button>` : ''}</div>
          <div class="chips">${groupButtons(g.id).map((x) => `<button class="chip" ${edit ? `data-editbtn="${x.id}"` : `data-pvtag="${x.id}"`} aria-pressed="${!edit && PVW.tags.includes(x.id)}">${esc(x.label)}${x.unsure ? ' <span class="q">?</span>' : ''}${isStar(x) ? ' ⭐' : ''}${edit ? ' ✎' : ''}</button>`).join('')}
            ${edit ? `<span class="pv-add"><input class="text-input" data-newbtn="${g.id}" placeholder="+ כפתור" autocomplete="off"><button class="btn" data-addbtn="${g.id}">הוספה</button></span>` : ''}</div>`).join('')}
        <div class="next-line ro"><span class="faint">מה הלאה:</span> ${ts.length ? planHTML(ts[0], true) + (ts.length > 1 ? ` <span class="faint">· ועוד ${many(ts.length - 1, 'משימה', 'משימות')}</span>` : '') : '<b>' + esc(restWord(fake)) + '</b>'}</div>
      </div>
      <p class="faint" style="margin-top:10px">${edit ? 'נגיעה בכפתור פותחת אותו: שם, משימות, ⭐ חשוב, או הסרה.' : 'נגע בכפתורים וראה מה המערכת תעשה אחר כך.'}
        ${b.buttons.some((x) => x.unsure) ? ' <span class="q">?</span> = לא בטוח, כדאי לבדוק.' : ''}</p>
      ${seasons.length ? `<p class="faint">העונה החזקה: <b>${esc(seasons.join(' · '))}</b></p>` : ''}
      ${b.unclear.length ? `<p class="faint warn-li">לא זיהיתי בוודאות: <b>${esc(b.unclear.join(' · '))}</b> — השארתי במילים שלך.</p>` : ''}`;
  }

  // ------------------------------------------------------------------
  // Setup 3 — how a message reaches the visitor
  // ------------------------------------------------------------------
  /* 18/10 (יצחק): everyone in the community has a fully kosher phone — calls only. About 95% have mail. WhatsApp
   * can run on a kosher number too; SMS cannot. So: mail always, and on top of it what he chooses — WhatsApp for
   * whoever has it, SMS only to a visitor who gave a second number. A message goes out on every channel he chose,
   * not on "the first one connected". How WhatsApp is connected (his own number, or an official account) is a
   * detail of the connection, not another channel. */
  const CHANNELS = [
    { k: 'email', ic: '📧', name: 'מייל' },
    { k: 'wa', ic: '🟢', name: 'וואטסאפ' },
    { k: 'sms', ic: '💬', name: 'SMS' },
  ];
  const toggle = (k, on, name) => `<button class="toggle" data-toggle="${k}" aria-pressed="${!!on}" aria-label="${esc(name || 'הפעלה')}"></button>`;
  /** The one question about channels, the same in the setup and in the settings. */
  function channelQuestion() {
    const b = S.biz;
    const box = (k, on, t, sub, lock) => `<button class="check-opt" ${lock ? 'disabled' : `data-chq="${k}"`} aria-pressed="${!!on}"><span class="box">${on ? '✓' : ''}</span><span><b>${t}</b><small>${sub}</small></span></button>`;
    return `<div class="check-list">
      ${box('email', true, 'מייל, תמיד', 'כמעט לכולם יש מייל. יוצא בשם העסק שלך.', true)}
      ${box('wa', b.channels.wa, 'גם וואטסאפ, למי שיש לו', b.channels.wa ? (b.waHow === 'official' ? 'מחובר: חשבון עסקי רשמי' : 'מחובר: מהמספר שלך') : 'גם במספר כשר יכול להיות וואטסאפ. צריך לחבר פעם אחת.')}
      ${box('sms', b.channels.sms, 'גם SMS', 'רק למבקר שמסר מספר נוסף. לטלפון כשר SMS לא מגיע.')}
    </div>`;
  }
  function viewChannels(m) {
    const b = S.biz;
    const prefix = b.mail.prefix || 'info';
    // No WhatsApp (he said so in his details): the question is not asked — only how the mail reaches them (יצחק, 20/10).
    const noWa = S.account.hasWa === false;
    m.innerHTML = `<h1>איך שולחים ${help('channels')}</h1>
      <div class="stack" style="margin-top:14px">
        ${noWa ? '' : `<section class="card"><h2>איך המבקרים יקבלו את מה ששלחת?</h2>${channelQuestion()}</section>`}
        <section class="card"><h2>📧 המייל</h2><p class="muted">יוצא מהמערכת, בשם העסק שלך.</p>
          <div class="label">הכתובת שממנה זה יוצא</div>
          <div class="mail-from ltr"><input class="text-input" data-mail="prefix" value="${esc(b.mail.prefix)}" placeholder="info" autocomplete="off" spellcheck="false"><span>@${MAIL_DOMAIN}</span></div>
          <div class="label">לאן יגיעו תשובות <small>ברירת המחדל: המייל שאיתו נכנסת</small></div>
          <input class="text-input ltr" type="email" data-mail="replyTo" value="${esc(b.mail.replyTo)}" placeholder="${esc(S.account.email || 'name@example.com')}">
          <p class="faint" id="mail-prev" style="margin-top:8px">${esc(mailPreview(prefix))}</p></section>
        ${b.channels.wa ? `<section class="card"><div class="toggle-row"><div><h2>🟢 וואטסאפ</h2><p class="muted">${b.waHow === 'official' ? 'מחובר לחשבון העסקי הרשמי שלך.' : 'מחובר למספר שלך, בקצב שלא נחסם. בלי אחריות.'}</p></div>
          <button class="btn" data-act="disconnect" data-ch="wa">לנתק</button></div></section>` : ''}
        ${b.channels.sms ? `<section class="card"><h2>💬 SMS</h2><div class="label">שם השולח <small>עד 11 אותיות באנגלית או ספרות</small></div>
          <input class="text-input ltr" data-smsname value="${esc(b.smsName)}" maxlength="11" placeholder="Hadar" autocomplete="off"></section>` : ''}
      </div>`;
  }
  // H37: the technical address says nothing to him — the name it goes out under, and where the answers come.
  const mailPreview = () => `יוצא בשם: ${S.biz.name || 'העסק'}  ·  תשובות יגיעו אל: ${replyTo() || '—'}`;
  /** WhatsApp is connected once: through his own number (a QR, no guarantee), or an official business account he already has. */
  function sheetConnect() {
    sheet(`<h2>לחבר וואטסאפ</h2>
      <p class="muted">פעם אחת. אחר כך כל מה שתשלח ייצא גם בוואטסאפ, למי שיש לו.</p>
      <div class="opts"><button class="opt" data-act="connect-how" data-how="own">מהמספר שלי<small>סורקים קוד, כמו וואטסאפ במחשב. בקצב איטי, ובלי אחריות: וואטסאפ יכולה לחסום כל מספר.</small></button>
        <button class="opt" data-act="connect-how" data-how="official">יש לי חשבון עסקי רשמי<small>נכנסים עם החשבון הקיים ומאשרים למערכת לשלוח בשמו.</small></button></div>
      <div class="actions"><button class="btn ghost" data-act="sheet-close">לא עכשיו</button></div>`);
  }
  function sheetConnectOwn() {
    sheet(`<h2>וואטסאפ מהמספר שלך</h2>
      <p class="warn-box">⚠️ <b>אין אחריות.</b> החיבור עובד דרך המספר שלך, בקצב איטי שמיועד לא להיחסם — אבל וואטסאפ יכולה לחסום כל מספר, בכל זמן, וזה באחריותך בלבד.</p>
      <div class="join-mock"><div class="qr" aria-hidden="true"></div><div class="faint">בוואטסאפ בטלפון שלך: מכשירים מקושרים ← קישור מכשיר ← לסרוק</div></div>
      <div class="opts"><button class="opt" data-act="connect-yes" data-how="own">הבנתי, וסרקתי</button><button class="opt" data-act="sheet-close">ביטול</button></div>`);
  }

  /** The way out to customization, from inside a setup step: plain to see, never in the way of "next". */
  const tuneLinks = (list) => `<div class="card tune" style="margin-top:14px"><span class="faint">רוצה לשנות?</span> ${list.map(([sub, t]) =>
    `<button class="link" data-act="tune" data-tune="${sub}">${esc(t)} ←</button>`).join(' · ')}</div>`;

  // ------------------------------------------------------------------
  // Setup 3 — what goes out: how it reaches him, and the messages
  // ------------------------------------------------------------------
  /* 17/10 (יצחק): the second part of "what goes out" is the messages themselves — a message, and the way to add
   * more. "What will be written to him" is not a part of its own: it is the message. Each one can be written by the
   * AI, and one of them is the booth's default — what the send button on a visitor's card sends. */
  function viewSend(m) {
    const b = S.biz;
    const def = boothDefault();
    const sample = (t) => t.text.replace(/\{שם\}/g, 'משה כהן').replace(/\{עסק\}/g, b.name || 'העסק').replace(/\{(קובץ|חומר)\}/g, t.mat || 'הקובץ');
    m.innerHTML = `<h1>מה שולחים למבקר ${help('send')}</h1>
      <p class="muted">שני דברים קצרים. אפשר לשנות הכל אחר כך, בהגדרות.</p>
      <div class="stack" style="margin-top:14px">
        <section class="card"><h2>1. איך המבקרים יקבלו את מה ששלחת?</h2>${channelQuestion()}
          <p class="faint" style="margin-top:8px">${esc(mailPreview(b.mail.prefix || 'info'))}</p></section>
        <section class="card"><h2>2. ההודעות ${help('messages')}</h2>
          <p class="muted">כל מה שיוצא למבקר הוא הודעה, ואפשר לצרף לה קובץ: קטלוג, מחירון, תמונות. נגיעה בהודעה פותחת אותה לעריכה${ai ? ', וגם "✨ תכתוב לי"' : ''}.</p>
          <div class="prod-list">${b.templates.map((t) => `<button class="prod-row" data-tpledit="${t.id}"><span class="pn">${t.mat ? '📎' : '💬'} ${esc(t.name)}${t.mat ? ` <span class="faint">· ${esc(t.mat)}</span>` : ''}${t.booth ? ' <span class="booth-tag">ברירת המחדל בדוכן</span>' : ''}</span><span class="pnext">${esc(sample(t).slice(0, 110))}</span></button>`).join('') || '<div class="faint">עוד אין הודעות.</div>'}</div>
          <div class="actions"><button class="btn" data-act="tpl-add">+ הודעה חדשה</button>${ai ? '<button class="btn" data-act="tpl-ai">✨ תכתוב לי הודעה</button>' : ''}
            <label class="btn" for="cat-file">📎 הודעה עם קובץ</label><input id="cat-file" type="file" accept="image/*,application/pdf" hidden></div>
          <div class="label">מה שולח כפתור השליחה בכרטיס המבקר, בדוכן</div>
          <div class="chips">${b.templates.map((t) => `<button class="chip" data-boothdef="${esc(t.id)}" aria-pressed="${!!(def && def.id === t.id)}">${t.mat ? '📎' : '💬'} ${esc(t.name)}</button>`).join('')}
            <button class="chip" data-boothdef="" aria-pressed="${!def}">בלי ברירת מחדל — לבחור בכל פעם</button></div>
          <p class="faint" style="margin-top:6px">${def ? `בדוכן: נגיעה אחת ב"📎 לשלוח", ו"${esc(def.name)}" יוצאת.` : 'בדוכן: נגיעה ב"לשלוח" מראה את ההודעות ככפתורים קטנים, ובוחרים.'}</p></section>
      </div>`;
    $('#cat-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const name = (file.name.replace(/\.[^.]+$/, '') || 'קטלוג').slice(0, 30);
      if (b.materials.some((x) => x.name === name)) return toast('כבר יש קובץ בשם הזה');
      const id = addPackageWithFile(name, file.name);
      // The first catalogue is the booth's default, and what goes out on every channel when nothing else was chosen.
      if (!boothDefault()) setBoothDefault(id);
      b.chDefault = b.chDefault || {};
      ['wa', 'email', 'sms'].forEach((k) => { if (!b.chDefault[k]) b.chDefault[k] = id; });
      save(); render(); sheetTemplate(id); toast('"' + name + '" נוספה. אפשר לשנות את השם ואת המילים');
    });
  }
  /** One message is the booth's default (יצחק, 17/10): the send button on the card sends it. None — he chooses each time. */
  const boothDefault = () => S.biz.templates.find((t) => t.booth) || null;
  const setBoothDefault = (id) => { S.biz.templates.forEach((t) => { t.booth = !!id && t.id === id; }); };


  // ------------------------------------------------------------------
  // Settings — the setup's screens, in two places (יצחק, 17/10: mixing them was "a strategic mistake")
  // ------------------------------------------------------------------
  function viewSettings(m) {
    const setup = S.phase === 'setup';
    const det = setPart() === 'details';
    const subs = det ? SUBS_DET : SUBS_HOW;
    S.sub = SUB_ALIAS[S.sub] || S.sub;
    if (!subs.some(([k]) => k === S.sub)) S.sub = det && setup ? 'messages' : subs[0][0];
    const back = { crm: 'ל-CRM', dash: 'לסוף היום' }[S.backView] || (afterFair() ? 'ל-CRM' : 'לדוכן');
    // The two halves of the settings sat in the old top bar; in the new shell they head the screen (20/10).
    // The customization is headed by what the AI made for him, and that all of it can change (יצחק, 20/10).
    m.innerHTML = `<div class="set-head"><h1>${setup ? (det ? 'פרטים וחיבורים' : 'התאמה אישית') : 'הגדרות'} ${help(S.sub)}</h1><nav class="seg-ctl" aria-label="הגדרות">${SETTINGS_NAV.map(([k, t]) => `<button data-part="${k}" aria-pressed="${setPart() === k}">${t}</button>`).join('')}</nav></div>
      ${det ? `<p class="muted set-intro">הפרטים שלך, ואיך מה ששולחים מגיע למבקר. כל שינוי נשמר מיד.</p>`
        : `<div class="ai-made">${ic('spark')}<span><b>זה מה שה-AI הבין על העסק שלך, ויצר לבד.</b> כל דבר כאן אפשר לשנות ולהתאים לך. כל שינוי נשמר מיד.</span></div>`}
      <nav class="subtabs" aria-label="${det ? 'פרטים וחיבורים' : 'התאמה אישית'}">${subs.map(([k, t]) => `<button class="chip" data-sub="${k}" aria-pressed="${S.sub === k}">${t}</button>`).join('')}</nav><div id="subview"></div>
      ${setup ? '' : `<button class="float-back" data-act="settings-done">← חזרה ${back}</button>`}`;
    ({ buttons: viewButtons, booth: viewBoothSettings, seasons: viewSeasons, crm: viewCrmSettings, auto: viewRules,
      account: viewAccount, biz: viewBiz, messages: viewMessages }[S.sub] || viewButtons)($('#subview'));
  }
  /* One tab for everything that goes out (יצחק, 20/10): how it is sent, the messages themselves, and the morning
   * message. Each part is the screen it was; its title steps down to a section heading. */
  function viewMessages(m) {
    m.innerHTML = `<div class="msg-parts"><div id="mp-ch"></div><div id="mp-mat"></div><div id="mp-dig"></div></div>`;
    viewChannels($('#mp-ch')); viewMaterials($('#mp-mat')); viewDigest($('#mp-dig'));
    m.querySelectorAll('.msg-parts h1').forEach((h) => { const h2 = document.createElement('h2'); h2.className = 'part-title'; h2.innerHTML = h.innerHTML; h.replaceWith(h2); });
  }
  /** The welcome (יצחק, 20/10): before his name is known, so it greets no one by name. */
  function viewWelcome(m) {
    m.innerHTML = `<section class="card narrow welcome">
      <h1>ברוך הבא לדוכן חכם</h1>
      <p class="muted">ארבעה צעדים קצרים, ואתה מוכן לתערוכה:</p>
      <ol class="welcome-steps">
        <li><b>הפרטים שלך</b><span>שם, טלפון, והאם יש לך וואטסאפ.</span></li>
        <li><b>העסק</b><span>כמה מילים על מה שאתה עושה. ה-AI בונה לך מזה את הדוכן.</span></li>
        <li><b>הודעות</b><span>מה יוצא למבקרים, ואיך. ומתי תקבל את הודעת הבוקר.</span></li>
        <li><b>התאמה אישית</b><span>לראות מה נבנה בשבילך, ולשנות מה שתרצה.</span></li>
      </ol>
      <p class="faint">כל דבר אפשר לשנות גם אחר כך, בהגדרות.${S.account.email ? ` מחובר בתור <bdi dir="ltr">${esc(S.account.email)}</bdi>.` : ''}</p>
    </section>`;
  }
  /** Everything the system does by itself, in one place (יצחק, 17/10): the rules, and what the buttons do — marked where it comes from. */
  let ruleTab = 'on';
  function viewRules(m) {
    viewAutoSetup(m);

  }
  /* Setup (יצחק, 16/10): what the system does by itself is set before the fair, in words — what "cold" means for him,
   * what happens when a visitor does not answer three times, and a few ready rules. The full editor is in the settings. */
  const COLD_DO = [['ask', 'לשאול אותי בסוף היום'], ['list', 'בלי מעקב (נשאר ברשימת התפוצה)'], ['tasks', 'לתת לו משימות כמו לכל מבקר']];
  const NOANS_DO = [['ask', 'לשאול אותי'], ['week', 'לנסות שוב בעוד שבוע'], ['end', 'להפסיק את המעקב']];
  function viewAutoSetup(m) {
    const b = S.biz;
    const rules = b.rules || [];
    const on = rules.filter((r) => r.on);
    const sugg = rules.filter((r) => !r.on);
    const setup = S.phase === 'setup';
    // In the settings a rule opens to be changed, and says how many times it acted; in the setup it is only on or off.
    const row = (r) => { const t = ruleText(r); const body = `<span class="when">${esc(t.when)}</span><span class="then">⚙️ ${esc(t.then)}${sendsOut(r) ? ' <span class="out-tag">יוצא למבקר</span>' : ''}</span><span class="src">מקור: ${r.src === 'ai' ? 'הצעת העוזר' : r.byHand ? 'כלל שכתבת' : 'כלל מוכן'}</span>`;
      return `<div class="rule${r.on ? '' : ' off'}">${toggle('rule:' + r.id, r.on, 'הפעלת הכלל')}
      ${setup ? `<div class="rule-body">${body}</div>` : `<button class="rule-body" data-ruleedit="${r.id}">${body}</button>`}
      ${setup ? '' : r.fired ? `<button class="link" data-rulehits="${r.id}">הופעל ${many(r.fired, 'פעם אחת', 'פעמים')} ←</button>` : '<span class="faint">עוד לא הופעל</span>'}</div>`; };
    m.innerHTML = `<h1>מה המערכת עושה לבד ${help('auto')}</h1>
      <p class="muted">מה שהמערכת עושה בשבילך, בלי שתבקש. אפשר להדליק, לכבות ולשנות כל דבר — גם אחר כך, בהגדרות.</p>
      <div class="stack" style="margin-top:14px">
        <section class="card"><h2>כשסימנת "${esc(words()[2])}" ${help('cold')}</h2>
          <p class="muted">רק אתה יודע מה התכוונת. לכן המערכת לא מחליטה לבד, אלא עושה מה שתבחר כאן.</p>
          <div class="chips">${COLD_DO.map(([k, t]) => `<button class="chip" data-colddo="${k}" aria-pressed="${b.coldDo === k}">${esc(t)}</button>`).join('')}</div></section>
        <section class="card"><h2>כשמבקר לא ענה 3 פעמים ${help('noans')}</h2>
          <p class="muted">אחרי פעם ופעמיים המערכת מנסה שוב ביום העבודה הבא. בפעם השלישית — מה שתבחר כאן.</p>
          <div class="chips">${NOANS_DO.map(([k, t]) => `<button class="chip" data-noansdo="${k}" aria-pressed="${(b.noAnsDo || 'ask') === k}">${esc(t)}</button>`).join('')}</div></section>
        <section class="card"><h2>כללים</h2>
          <nav class="tabs" aria-label="כללים"><button class="tab" data-ruletab="on" aria-pressed="${ruleTab === 'on'}">פעילים <span class="n">${on.length}</span></button><button class="tab" data-ruletab="sugg" aria-pressed="${ruleTab === 'sugg'}">הצעות <span class="n">${sugg.length}</span></button></nav>
          <p class="faint" style="margin:8px 0">${ruleTab === 'on' ? 'מה שפועל עכשיו.' : 'כללים מוכנים שעוד לא הפעלת. מדליקים בנגיעה.'}</p>
          <div class="rules">${(ruleTab === 'on' ? on : sugg).map(row).join('') || `<div class="empty">${ruleTab === 'on' ? 'אין כללים פעילים.' : 'אין הצעות כרגע.'}</div>`}</div>
          ${setup ? '' : '<div class="actions"><button class="btn primary" data-act="rule-add">+ כלל חדש</button></div>'}</section>
        <section class="card"><h2>מה הכפתורים עושים ${help('btnrules')}</h2>
          <p class="muted">גם כפתור בדוכן הוא כלל: כשמסמנים אותו — המערכת קובעת משימה, או שולחת. משנים בכפתור עצמו.</p>
          <div class="rules">${btnRules().map((x) => `<div class="rule"><span></span>
            <button class="rule-body" ${x.id === 'def' ? 'data-act="edit-def"' : `data-editbtn="${x.id}"`}><span class="when">${esc(x.when)}</span><span class="then">${esc(x.then)}
${x.out ? ' <span class="out-tag">יוצא למבקר</span>' : ''}</span><span class="src">מקור: ${esc(x.src)}</span></button><span class="faint">עריכה</span></div>`).join('')}</div></section>
      </div>`;
  }
  /** What the buttons do, said as rules — read from the buttons, never stored twice. */
  function btnRules() {
    const out = S.biz.buttons.filter((b) => b.steps && b.steps.length).map((b) => ({ id: b.id, when: 'כשמסמנים "' + b.label + '"', then: stepsText(stepsOf(b)), out: stepsOf(b).some(immediate), src: 'הכפתור "' + b.label + '"' }));
    out.push({ id: 'def', when: 'כשלא סימנו כלום', then: stepsText(stepsOf(null)) || 'בלי מעקב', out: stepsOf(null).some(immediate), src: 'ברירת המחדל' });
    return out;
  }
  // ---- the morning message: his own, to his phone or mail, at the hour he picks (יצחק, 18/10) ----
  function viewDigest(m) {
    const b = S.biz;
    m.innerHTML = `<h1>הודעת הבוקר ${help('digest')}</h1>
      <div class="stack" style="margin-top:14px">
        <section class="card"><div class="toggle-row"><div><h2>כל בוקר: מה לטיפול היום</h2><p class="muted">רשימה קצרה של מה מחכה לך היום, ומה המערכת עשתה לבד. נשלחת אליך מהמספר של מערכת הדוכן.</p></div>${toggle('digest', b.digest.on, 'הודעת בוקר')}</div>
          ${b.digest.on ? `<div class="label">לאן לשלוח לך?</div><div class="chips">${DIGEST_CH.filter((k) => k !== 'wa' || S.account.hasWa !== false).map((k) => `<button class="chip" data-digestch="${k}" aria-pressed="${b.digest.ch === k}">${CH_NAMES[k]}</button>`).join('')}</div>
          ${b.digest.ch === 'wa' && !waNumber() ? '<p class="faint">לאיזה מספר? ממלאים ב"פרטי העסק".</p>' : ''}
          <div class="label">באיזו שעה</div><div class="chips">${['06:00', '07:00', '08:00', '09:00', '10:00', '12:00'].map((h) => `<button class="chip" data-digesth="${h}" aria-pressed="${b.digest.hour === h}">${h}</button>`).join('')}</div>` : ''}</section>
      </div>`;
  }

  // ---- buttons, in groups ----
  function viewButtons(m) {
    const missing = Object.keys(STD).filter((ax) => !groupById(ax));
    m.innerHTML = `<h1>הכפתורים בדוכן ${help('buttons')}</h1>
      <p class="muted">מה שמבדיל אצלך בין פונה לפונה. מאחורי כל כפתור יש משימה אחת או יותר, והמערכת פועלת לפיהן: שולחת, מזכירה, וחוזרת לפני העונה.</p>
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
        <span class="pn">${esc(x.label)}${x.unsure ? ' <span class="q">?</span>' : ''}${isStar(x) ? ' <span class="wt">⭐ חשוב</span>' : ''}</span>
        <span class="pnext">${esc(x.steps && x.steps.length ? stepsText(stepsOf(x)) : 'ברירת המחדל · ' + (stepsText(stepsOf(null)) || 'בלי מעקב'))}</span></button>`).join('')}</div>
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
      D = { kind: ctx.kind, id: ctx.id, label: x ? x.label : '', weight: x ? x.weight || 0 : 0, steps: (x ? (x.steps || []).map(normStep) : stepsOf(null)).map((s) => Object.assign({}, s)) /* a button's OWN steps: the default is not copied into it */ };
    }
    const isBtn = D.kind === 'btn';
    sheet(`<h2>${isBtn ? esc(D.label) : 'מי שלא סומן לו כלום'}</h2>
      ${isBtn ? `<div class="label">שם הכפתור</div><input id="eb-name" class="text-input" value="${esc(D.label)}" autocomplete="off">` : ''}
      <div class="label">מה עושים אחר כך <small>אפשר כמה משימות</small></div>
      <div class="step-list">${D.steps.map((s, i) => `<div class="step-line"><button class="prod-row" data-editstep="${i}"><span class="pn">${esc(stepText(s))}</span></button>
        <button class="btn ghost danger" data-delstep="${i}" aria-label="להסיר משימה">✕</button></div>`).join('') || (isBtn ? `<div class="faint">אין לו משימה משלו, ולכן יקבל את ברירת המחדל: ${esc(stepsText(stepsOf(null)) || 'אין')}.</div>` : '<div class="faint">אין משימה. מבקר שלא סימנת לו כלום יישאר בלי מעקב.</div>')}</div>
      <button class="chip add" data-act="add-step" style="margin-top:8px">+ משימה</button>
      ${isBtn ? `<div class="label">חשיבות</div>
        <div class="chips"><button class="chip" data-esstar="1" aria-pressed="${D.weight >= 2}">⭐ חשוב — מופיע קודם</button></div>` : ''}
      <div class="actions"><button class="btn primary" data-act="save-steps">שמירה</button><button class="btn ghost" data-act="steps-cancel">ביטול</button>
        ${isBtn ? `<button class="btn ghost danger far" data-act="del-btn" data-id="${D.id}">להסיר את הכפתור</button>` : ""}</div>`);
    $("#scrim .sheet").dataset.guard = "1";
  }
  /** Real, open leads whose steps come from this button (or from the default), not yet frozen on it. */
  const stepsAffected = (key) => leadsNow().filter((l) => !l.won && !l.lost && !l.listOnly && !(l.frozen && l.frozen[key])
    && (key === 'def' ? derived(l).some((s) => s.key.startsWith('def:')) : l.tags.includes(key)));
  /* The question, with what changes in plain sight: before → after. Steps he set by hand on a lead never change. */
  function sheetApply(key, was, next, hit) {
    const name = key === 'def' ? 'ברירת המחדל' : '"' + (D.label || (btnById(key) || {}).label || '') + '"';
    sheet(`<h2>שינית את מה שקורה אחרי ${esc(name)}</h2>
      <p class="muted">${hit.length === 1 ? 'מבקר אחד כבר סומן' : hit.length + ' מבקרים כבר סומנו'} בזה. השינוי חל על המבקרים הבאים. מה עם הקיימים?</p>
      <div class="apply-prev"><div><span class="faint">עד עכשיו</span><b>${esc(stepsText(was.map(normStep)) || 'בלי משימה')}</b></div>
        <div><span class="faint">מעכשיו</span><b>${esc(stepsText(next.map(normStep)) || 'בלי משימה')}</b></div></div>
      <p class="faint">למשל: ${esc(hit.slice(0, 4).map((l) => People.rowName(l)).join(', '))}${hit.length > 4 ? ' ועוד ' + (hit.length - 4) : ''}. משימות שקבעת ביד אצל מבקר — לא משתנות. מה שכבר בוצע נשאר בוצע.</p>
      <div class="opts"><button class="opt" data-act="save-steps" data-apply="new">רק למבקרים הבאים<small>הקיימים ממשיכים עם מה שהיה</small></button>
        <button class="opt" data-act="save-steps" data-apply="all">להחיל גם על ${hit.length} הקיימים<small>המשימות שלהם יתעדכנו לפי השינוי</small></button></div>
      <div class="actions"><button class="btn ghost" data-act="steps-back">חזרה לעריכה</button></div>`);
    $('#scrim .sheet').dataset.guard = '1';
  }
  const keepDraft = () => {
    if (D && $('#eb-name')) D.label = $('#eb-name').value.trim() || D.label;

  };

  /* One editor for a single step: a button's, the default's, or a lead's own. */
  let ES = null;
  function sheetStep(o) {
    ES = { sid: o.step.sid, type: o.step.type, days: o.step.days, pkg: o.step.pkg || '', before: o.step.before != null ? o.step.before : 4, ctx: o.ctx };
    sheet(`<h2>${esc(o.title)}</h2>
      <div class="label">סוג המשימה <small>לפי זה המערכת יודעת מה לעשות</small></div>
      <div class="step-grid">${Object.entries(STEPS).map(([k, v]) => `<button class="opt" data-steptype="${k}" aria-pressed="${ES.type === k}">${v.icon} ${esc(v.name)}</button>`).join('')}</div>
      <div class="label">איך אתה קורא לזה <small>המילים שלך</small></div>
      <input id="es-label" class="text-input" value="${esc(o.step.label)}" autocomplete="off">
      <div id="es-extra"></div>
      <div class="actions"><button class="btn primary" data-act="save-step">אישור</button><button class="btn ghost" data-act="step-back">חזרה</button></div>`);
    renderStepExtra();
    $("#scrim .sheet").dataset.guard = "1";
    $('#es-label').addEventListener('input', () => { ES.typed = true; });
  }
  function renderStepExtra() {
    const box = $('#es-extra');
    if (!box) return;
    const pkgs = S.biz.templates;
    const days = ES.type === 'none' || ES.type === 'season'
      ? `<p class="faint" style="margin-top:10px">${ES.type === 'season' ? (S.biz.seasons.length ? 'יחזור אליך ' + S.biz.remindWeeks + ' שבועות לפני העונה שלך.' : '⚠️ אין לך עונות מוגדרות, ולכן המשימה תיקבע לעוד 3 ימים. מגדירים ב"עונות".') : 'בלי משימה ובלי מעקב. הוא נשאר ברשימת התפוצה.'}</p>`
      : `<div class="label">מתי</div><div class="chips">${(ES.type === 'send' ? [0] : []).concat([1, 2, 3, 5, 7, 14, 30]).map((d) =>
        `<button class="chip" data-esdays="${d}" aria-pressed="${ES.days === d}">${d === 0 ? 'מיד' : inDays(d)}</button>`).join('')}</div>
        ${ES.type === 'send' && ES.days === 0 ? '<p class="faint" style="margin-top:6px">יישלח ברגע שנוגעים בכפתור בדוכן. בכרטיס לא יופיע כפתור "שלח חומר".</p>' : ''}`;
    const mat = ES.type !== 'send' ? '' : `<div class="label">איזו הודעה לשלוח</div>
      <div class="chips">${pkgs.map((x) => `<button class="chip" data-espkg="${esc(x.id)}" aria-pressed="${ES.pkg === x.id}">${x.mat ? '📎' : '💬'} ${esc(x.name)}</button>`).join('')}
        <button class="chip" data-espkg="" aria-pressed="${!ES.pkg}">ברירת המחדל של הערוץ</button></div>
      <div class="label">הודעה חדשה <small>שם, ואפשר לצרף קובץ</small></div>
      <div class="add-row"><input id="es-pk-name" class="text-input" value="${esc(ES.newName || '')}" placeholder="${esc(sampleWhat() ? "למשל: קטלוג " + sampleWhat() : "למשל: מחירון")}" autocomplete="off">
        <label class="btn" for="es-mat-file">📎 ${ES.newFile ? esc(ES.newFile.name) : 'לצרף קובץ'}</label><button class="btn" data-act="es-pk-add">הוספה</button></div>
      <input id="es-mat-file" type="file" accept="image/*,application/pdf" hidden>`;
    const before = ES.type !== 'date' ? '' : `<div class="label">כמה לפני השמחה</div><div class="chips">${[1, 2, 4, 8, 12].map((w) =>
      `<button class="chip" data-esbefore="${w}" aria-pressed="${ES.before === w}">${w === 1 ? 'שבוע' : w + ' שבועות'}</button>`).join('')}</div>
      <p class="faint" style="margin-top:6px">בדוכן נשאל "מתי השמחה?". אם לא נמסר תאריך — לפי "מתי" שלמעלה.</p>`;
    box.innerHTML = days + before + mat;
    // A new package can be made right here — a name, and a file if he wants one — and is chosen for this step at once.
    const f = $('#es-mat-file');
    if (f) f.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      ES.newName = ($('#es-pk-name') && $('#es-pk-name').value.trim()) || '';
      ES.newFile = { name: file.name.replace(/\.[^.]+$/, '').slice(0, 30), file: file.name };
      renderStepExtra();
    });
  }
  const readStep = () => normStep({ type: ES.type, label: ($('#es-label') && $('#es-label').value.trim()) || STEPS[ES.type].label, days: ES.days == null ? STEPS[ES.type].days : ES.days, pkg: ES.pkg, before: ES.before, sid: ES.sid });

  // ---- warmth and the booth ----
  function viewBoothSettings(m) {
    const b = S.biz;
    m.innerHTML = `<h1>הדוכן ${help('boothset')}</h1>
      <div class="stack" style="margin-top:14px">
        <section class="card"><h2>איך לקרוא לשלוש הדרגות</h2><p class="muted">רק השם משתנה. את החום מסמנים תמיד ביד — המערכת לא מנחשת אותו.</p>
          <div class="opts grid2">${Object.entries(GRADES).map(([k, g]) => `<button class="opt" data-grades="${k}" aria-pressed="${b.grades === k}">${esc(g.words.join(' · '))}<small>${esc(g.name)}</small></button>`).join('')}</div></section>
        <section class="card"><h2>כמה זמן הכרטיס נשאר פתוח</h2><p class="muted">בלי נגיעה, הכרטיס נסגר לבד וחוזר לחיפוש. מה שסומן — נשמר. כשצריך עוד זמן, "⏸ עצור" בכרטיס עוצר את השעון.</p>
          <div class="chips">${[8, 12, 15, 20, 30].map((s) => `<button class="chip" data-idle="${s}" aria-pressed="${b.idleSec === s}">${s} שניות</button>`).join('')}</div></section>
        <section class="card"><div class="toggle-row"><div><h2>מי שכבר ביקר לא מופיע שוב בחיפוש</h2>
          <p class="muted">הוא מופיע בשורה "ביקרו כבר", ונגיעה פותחת את הכרטיס שלו. העסק שלו, או העסק של אשתו, מופיע כשורה נפרדת.</p></div>${toggle('hideVisited', b.hideVisited, 'להסתיר מי שביקר')}</div></section>
        <section class="card"><div class="toggle-row"><div><h2>גם לאסוף לרשימת התפוצה ${help('collect')}</h2>
          <p class="muted">רק אם אתה רוצה להגדיל את רשימת התפוצה שלך. בכרטיס יופיע כפתור "רק לרשימת התפוצה": המבקר נרשם לרשימה, ולא כליד — בלי משימות ובלי מעקב.</p></div>${toggle('collectList', b.collectList, 'גם לאסוף לרשימת התפוצה')}</div></section>
      </div>`;

  }

  // ---- seasons, on the Jewish calendar ----
  const rangeText = (s) => (s.greg
    ? s.greg.map(([a, b]) => `${a % 100}/${Math.floor(a / 100)}–${b % 100}/${Math.floor(b / 100)}`).join(', ')
    : s.ranges.map((r) => `${H.gem(r.from[1])} ב${H.HE[r.from[0]]} – ${H.gem(r.to[1])} ב${H.HE[r.to[0]]}`).join(' · '));
  function viewSeasons(m) {
    const b = S.biz;
    const today = new Date(now());
    m.innerHTML = `<h1>העונות שלך ${help('seasons')}</h1>

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
    const groups = [['email', 'מייל', true], ['wa', 'וואטסאפ', b.channels.wa], ['sms', 'SMS', b.channels.sms]].filter((g) => g[2]);
    const pkgOpts = (sel) => `<option value="" ${!sel ? 'selected' : ''}>—</option>` + b.templates.map((t) => `<option value="${esc(t.id)}" ${sel === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
    m.innerHTML = `<h1>הודעות ${help('messages')}</h1>
      <p class="muted">כל מה שיוצא למבקר הוא הודעה, ואפשר לצרף לה קובץ. בכפתור, במשימה ובשליחה לקבוצה — בוחרים הודעה לפי השם. אחת מהן היא ברירת המחדל בדוכן: כפתור השליחה בכרטיס המבקר שולח אותה.</p>
      <div class="stack" style="margin-top:14px">
        <section class="card"><h2>ההודעות</h2>
          <div class="prod-list">${b.templates.map((t) => `<button class="prod-row" data-tpledit="${t.id}"><span class="pn">${t.mat ? '📎' : '💬'} ${esc(t.name)}${t.mat ? ` <span class="faint">· ${esc(t.mat)}</span>` : ''}${t.booth ? ' <span class="booth-tag">ברירת המחדל בדוכן</span>' : ''}</span><span class="pnext">${esc(t.text.slice(0, 90))}</span></button>`).join('') || '<div class="faint">עוד אין הודעות.</div>'}</div>
          <div class="actions"><button class="btn" data-act="tpl-add">+ הודעה חדשה</button>${ai ? '<button class="btn" data-act="tpl-ai">✨ תכתוב לי הודעה</button>' : ''}</div>
          <div class="label">מה שולח כפתור השליחה בכרטיס המבקר, בדוכן</div>
          <div class="chips">${b.templates.map((t) => `<button class="chip" data-boothdef="${esc(t.id)}" aria-pressed="${!!(boothDefault() && boothDefault().id === t.id)}">${t.mat ? '📎' : '💬'} ${esc(t.name)}</button>`).join('')}
            <button class="chip" data-boothdef="" aria-pressed="${!boothDefault()}">בלי ברירת מחדל — לבחור בכל פעם</button></div></section>
        <section class="card"><h2>מה יוצא בכל ערוץ, כשלא בחרו הודעה</h2>
          ${groups.length ? groups.map(([k, n]) => `<label class="field-row"><span>${n}</span><select class="text-input" data-chdef="${k}" aria-label="ברירת מחדל ל${n}">${pkgOpts((b.chDefault || {})[k])}</select></label>`).join('')
            : ''}</section>

        <section class="card"><h2>הקבצים</h2><p class="muted">קבצים שאפשר לצרף להודעות. קובץ לבדו לא נשלח — הוא יוצא רק עם הודעה.</p>
          <div class="prod-list">${b.materials.map((x, i) => `<div class="prod-row"><span class="pn">📎 ${esc(x.name)}</span><span class="pnext">${esc(x.file)} <button class="btn ghost danger" data-act="del-mat" data-i="${i}">הסרה</button></span></div>`).join('') || '<div class="faint">עוד אין קבצים. אפשר גם להוסיף בדוכן, בשליחה הראשונה.</div>'}</div>
          <div class="add-row"><input id="mat-name" class="text-input" placeholder="שם — קטלוג, מחירון, תמונות עבודות" autocomplete="off">
            <label class="btn" for="mat-file">📷 קובץ</label></div><input id="mat-file" type="file" accept="image/*,application/pdf" hidden></section>
      </div>`;
    bindMatFile(null);
  }
  function bindMatFile(l) {
    const f = $('#mat-file');
    if (!f) return;
    f.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const name = (($('#mat-name') && $('#mat-name').value.trim()) || file.name.replace(/\.[^.]+$/, '') || 'קטלוג').slice(0, 30);
      if (S.biz.materials.some((x) => x.name === name)) return toast('כבר יש קובץ בשם הזה');
      // In settings a file only joins the library. At the booth, a name and a file are a new package, sent at once.
      if (l) sendPackage(l, addPackageWithFile(name, file.name));
      else S.biz.materials.push({ name, file: file.name });
      save();
      if (l) { sheetMaterials(l); refreshLead(l); } else render();
      toast(name + ' נשמר');
    });
  }

  // ------------------------------------------------------------------
  // The booth
  // ------------------------------------------------------------------
  let openId = null;
  let idleTimer = null;
  let lastClosed = null;   // { id, at } — the card that just closed, one tap away for a minute
  let held = null;         // the card left open when he started typing the next name — saved, or gone back to
  let againAll = false;    // "and N more who visited" was opened for this search
  let cardSnap = null;     // { id, before } — the open card as it was when opened; before is null for a visitor just added
  let micState = navigator.mediaDevices && window.MediaRecorder ? null : "none";   // "none" once we know there is no microphone
  const IDLE = () => S.biz.idleSec * 1000;
  const leadByKey = (key) => leadsNow().find((l) => l.key === key);

  let paused = false;      // the open card's countdown stopped by hand (⏸): it waits until he finishes or goes on
  function viewBooth(m) {
    // Before the system goes live (יצחק, 17/10) the booth holds sample visitors, and he may add more to see a full day.
    // The sample visitors were added but nothing on this screen showed it (יצחק, 20/10: "לא עשה כלום"). Now the banner
    // counts them, says where they are, and they can be taken out again.
    const nDemo = leadsNow().filter((l) => l.demo).length;
    const demoBar = practice() ? `<div class="practice-banner"><span><b>דוכן לדוגמה.</b> כאן מתאמנים עד שהמערכת עוברת למצב אמיתי. מה שנרשם עכשיו יימחק אז.${nDemo ? ` <br>יש כאן ${nDemo} מבקרים לדוגמה: מחפשים אותם בשם, ורואים אותם ב"סוף היום" וב-CRM.` : ''}</span>
      ${worker() ? '' : `<span class="pb-acts"><button class="btn" data-act="seed">להוסיף 20 מבקרים לדוגמה</button>${nDemo ? '<button class="btn ghost" data-act="seed-remove">להסיר את המבקרים לדוגמה</button>' : ''}</span>`}</div>` : '';
    // "New" stands at the top, beside the search, and again at the end of the results (יצחק, 17/10): a visitor who is not on the list must never be lost.
    m.innerHTML = `${demoBar}${eyebrow('יום התערוכה · הדוכן')}<div class="search-row"><input id="q" class="search" type="search" placeholder="שם או עסק…" aria-label="חיפוש מבקר" autocomplete="off" autocapitalize="off">
      <button class="btn new-btn" data-act="new-person">＋ מבקר חדש</button>${help('booth')}</div>
      <div id="slot"></div><p class="foot" id="foot"></p>`;
    const q = $('#q');
    // Typing while a card is open does not drop it: the card is held, and a bar asks to save it or go back to it (K2).
    q.addEventListener('input', () => { if (openId) { held = openId; openId = null; } againAll = false; stopIdle(); renderResults(q.value); });
    if (openId && leadById(openId)) renderLead(); else { openId = null; renderResults(''); }
    updateFoot();
    if (FINE) setTimeout(() => q.focus(), 30);
  }
  function updateFoot() {
    const f = $('#foot');
    if (!f) return;
    const L = leadsNow();
    const demo = L.filter((l) => l.demo).length;
    const lo = L.filter((l) => l.listOnly).length;
    f.textContent = (practice() ? 'לדוגמה · ' : '') + many(L.length - demo - lo, 'מבקר אחד', 'מבקרים') + (demo ? ' (ועוד ' + demo + ' לדוגמה)' : '') + (lo ? ' · ' + lo + ' רק לרשימת התפוצה' : '');
  }
  function renderResults(query) {
    const slot = $('#slot');
    if (!slot) return;
    // The card that just closed stays one tap away for a minute — reopening it records nothing.
    const last = lastClosed && Date.now() - lastClosed.at < 60000 ? leadById(lastClosed.id) : null;
    const lastBar = last ? `<div class="last-bar"><span>האחרון: <b>${esc(People.rowName(last))}</b> · ${esc(People.town(last))}</span><button class="btn" data-reopen="${last.id}">לפתוח</button></div>` : '';
    const h = held && leadById(held);
    const heldBar = h ? `<div class="last-bar held"><span><b>${esc(People.rowName(h))}</b> עוד פתוח</span><span><button class="btn primary" data-act="held-save">✓ סיום</button> <button class="btn" data-act="held-back">← חזרה אליו</button></span></div>` : '';
    if (!People.norm(query)) {
      slot.innerHTML = heldBar + lastBar + '<div class="empty">כמה אותיות מהשם, ונגיעה בשם — הוא נשמר.<br>כל השאר רשות.</div>';
      return;
    }
    const { hits, skipped, total } = People.search(query, 6, S.biz.hideVisited ? (k) => !!leadByKey(k) : null);
    const rows = hits.map((h) => {
      const been = !S.biz.hideVisited && leadByKey(h.key);
      return `<button class="result" data-pick="${h.key}"><span><span class="nm">${esc(People.rowName(h))}</span>${h.b != null ? '<span class="badge biz">עסק</span>' : ''}<span class="city">${esc(People.town(h))}</span>
        <span class="mt">${esc(People.rowMeta(h))}</span></span>${been ? '<span class="badge">ביקר כבר</span>' : ''}</button>`;
    }).join('');
    // Above the results, with the town and the family line: two men of the same name must not be confused.
    // Opening one records nothing. "Came back" is gone (יצחק, 18/10): counting visits told him nothing.
    // L11: three are shown, and "and N more" opens the rest — no one who visited is out of reach.
    const shownAgain = againAll ? skipped : skipped.slice(0, 3);
    const againMore = skipped.length > shownAgain.length ? `<button class="btn ghost" data-act="again-all">ועוד ${skipped.length - shownAgain.length} שביקרו ←</button>` : '';
    const again = skipped.length ? `<div class="again"><div class="label" style="margin:0">ביקרו כבר</div>${shownAgain.map((h) => {
      const l = leadByKey(h.key);
      return `<div class="again-row"><button class="result small" data-reopen="${l.id}"><span><span class="nm">${esc(People.rowName(h))}</span> <span class="city">${esc(People.town(h))}</span><span class="mt">${esc(People.rowMeta(h))}</span></span><span class="badge">לפתוח</span></button></div>`;
    }).join('')}${againMore}</div>` : '';
    const more = total > hits.length ? `<div class="more">ועוד ${total - hits.length} — להקליד עוד אות, או את העיר</div>` : '';
    // Visitors added here by hand are not in the organisers' list, so the search finds them among the leads.
    const nq = People.norm(query);
    const mine = leadsNow().filter((l) => l.custom && People.norm(People.rowName(l)).includes(nq)).slice(0, 3);
    const added = mine.length ? `<div class="again"><div class="label" style="margin:0">נוספו בדוכן</div>${mine.map((l) => `<div class="again-row"><button class="result small" data-reopen="${l.id}"><span><span class="nm">${esc(People.rowName(l))}</span> <span class="city">${esc(People.town(l))}</span></span><span class="badge">לפתוח</span></button></div>`).join('')}</div>` : '';
    // G1: whoever is not on the list is added in a few seconds — a visitor is never lost to a missing registration.
    const addNew = `<div class="actions add-new"><button class="btn new-btn" data-act="new-person">＋ לא ברשימה? להוסיף אותו</button></div>`;

    slot.innerHTML = heldBar + lastBar + again + added + (rows ? `<div class="results">${rows}</div>` : '<div class="empty">לא נמצא ברשימה.</div>') + more + addNew;
  }
  const newLead = (key, r) => ({ id: S.seq++, key, i: r.i, b: r.b, at: now(), lastAt: now(), created: Date.now(), visits: 1, warmth: null, warmBy: null, tags: [],
    eventDate: '', roleOf: '', sent: [], queue: [], practice: practice(), log: [], done: [], moved: {}, manual: [], noAnswer: 0, notes: [],
    stage: 'new', list: true, contact: { phone: '', email: '' }, files: [], ruled: {}, by: worker() ? 'עובד' : 'בעלים' });
  function pick(key) {
    let l = leadByKey(key);
    if (!l) {
      l = newLead(key, People.row(key));
      log(l, 'ביקר בדוכן');
      S.leads.push(l);
      save();
      return openLead(l, true);
    }
    save();
    openLead(l);
  }
  /** A visitor who is not on the organisers' list: his name, and how to reach him. Brought over from the first prototype. */
  function sheetNewPerson() {
    const q = $('#q') ? $('#q').value.trim() : '';
    sheet(`<h2>מבקר שלא ברשימה</h2>
      <label class="label" for="np-first">שם פרטי</label><input id="np-first" class="text-input" autocomplete="off">
      <label class="label" for="np-last">שם משפחה</label><input id="np-last" class="text-input" value="${esc(q)}" autocomplete="off">
      <label class="label" for="np-town">עיר <small>רשות</small></label><input id="np-town" class="text-input" autocomplete="off">
      <label class="label" for="np-phone">טלפון ${practice() ? '<small>בהדגמה — רשות</small>' : '<small class="req">חובה</small>'}</label><input id="np-phone" class="text-input ltr" type="tel" inputmode="tel" autocomplete="off">
      <div class="actions"><button class="btn primary" data-act="np-save">שמירה</button><button class="btn ghost" data-act="sheet-close">ביטול</button></div>`);
    setTimeout(() => $('#np-first') && $('#np-first').focus(), 30);
  }
  function saveNewPerson() {
    const v = (id) => ($(id) && $(id).value.trim()) || '';
    const first = v('#np-first');
    const last = v('#np-last');
    if (!first && !last) { $('#np-first').focus(); return toast('מה השם שלו?'); }
    // The phone is required only for real (יצחק, 17/10): a sample visitor has none.
    if (!practice() && !v('#np-phone')) { $('#np-phone').focus(); return toast('מה הטלפון שלו?'); }

    const l = newLead('c:' + S.seq, { i: null, b: null });
    l.custom = { first, last, town: v('#np-town') };
    l.contact.phone = v('#np-phone');
    log(l, 'ביקר בדוכן · לא ברשימה, נוסף ידנית');
    S.leads.push(l);
    save(); closeSheet(false);
    toast('✓ נשמר: ' + People.rowName(l));
    // From the CRM (a business contact met elsewhere, יצחק 18/10) the new lead opens on its own page; at the booth, as a card.
    if (S.phase === 'live' && S.view === 'crm') return sheetCRM(l);
    openLead(l, true);
  }

  function openLead(l, isNew) {
    // Another card replaces this one: the old one closes for real (sent, rules run), and a held one too — unless it is the one coming back.
    const back = held === l.id;
    if (back) held = null; else closeHeld();
    if (openId && openId !== l.id) closeLead();
    // "Undo the changes" takes the card back to how it opened: a new visitor is not kept, a known one returns as he was.
    if (!back || !cardSnap || cardSnap.id !== l.id) cardSnap = { id: l.id, before: isNew ? null : JSON.parse(JSON.stringify(l)) };
    openId = l.id;
    lastClosed = null;
    paused = false;
    if ($('#q')) $('#q').value = '';
    renderLead();
    updateFoot();
  }
  /** The card closes: what it queued goes out now, and it stays reopenable for a minute. */
  /** The card held while typing the next name is closed for real: what it queued goes out, its rules run. */
  function closeHeld() {
    if (!held) return;
    const was = openId;
    openId = held; held = null;
    closeLead();
    if (was && was !== lastClosed.id) openId = was;
  }
  function closeLead() {
    if (!openId) return;
    const l = leadById(openId);
    flushSends(l);
    if (l && !l.capRun) { l.capRun = true; runRules('captured', l); save(); }   // the "lead captured" automations run once, when the card closes
    lastClosed = { id: openId, at: Date.now() };
    if (cardSnap && cardSnap.id === openId) cardSnap = null;
    openId = null;
    paused = false;
    stopIdle();
  }

  /** One lead editor, used at the booth and in a sheet from the dashboard or the CRM. */
  function leadBody(l, inSheet) {
    const w = effWarm(l);
    const bs = tagged(l);
    const datey = bs.some((b) => stepsOf(b).some((s) => s.type === 'date')) || (l.manual || []).some((s) => s.type === 'date' && !l.done.includes(s.key));
    const autoSent = bs.some((b) => stepsOf(b).some(immediate));
    const ts = tasks(l);
    const queued = (l.queue || []).map((q) => (pkgById(q.pkg) || { name: 'ברירת המחדל' }).name);
    // Nothing waits (יצחק, 16/10): a message goes out at once or not at all. What is not set up yet is a red dot, not a state of the visitor.
    const ready = sendReady();
    // At the booth a message is chosen, never written (יצחק, 17/10). With a default, the send button sends it in one tap;
    // without one, the messages show as small buttons, and a tap sends.
    const dflt = boothDefault();
    const sendBtn = !ready && !l.sent.length
      ? `<button class="btn has-dot" data-act="not-ready">📎 לשלוח לו<span class="red-dot" aria-label="עוד לא הוגדר איך לשלוח"></span></button>`
      : autoSent
        ? `<span class="sent-note">📎 ${queued.length ? 'יישלח כשתסיים: ' + esc(queued.join(', ')) : l.sent.length ? 'נשלח: ' + esc(l.sent.join(', ')) : 'יישלח'}</span>`
        : dflt
          ? `<button class="btn send-def" data-sendnow="${esc(dflt.id)}" data-lid="${l.id}" aria-pressed="${l.sent.includes(dflt.name)}">${l.sent.includes(dflt.name) ? '✓ נשלח: ' : '📎 לשלוח: '}${esc(dflt.name)}</button>`
          : `<span class="send-row"><span class="faint">לשלוח לו:</span>${S.biz.templates.slice(0, 5).map((t) => `<button class="chip send-chip" data-sendnow="${esc(t.id)}" data-lid="${l.id}" aria-pressed="${l.sent.includes(t.name)}">${l.sent.includes(t.name) ? '✓ ' : t.mat ? '📎 ' : '💬 '}${esc(t.name)}</button>`).join('')}</span>`;
    const last = l.notes[l.notes.length - 1];
    const hintPause = !inSheet && practice() && !(S.seen && S.seen.pause);
    return `
      <div class="lead-head"><div><span class="nm">${esc(People.rowName(l))}</span>${l.b != null ? '<span class="badge biz">עסק</span>' : ''} <span class="muted">${esc(People.town(l))}</span>
        <div class="faint">${esc(People.rowMeta(l))}${l.demo ? ' · לדוגמה' : ''}</div></div>
        <div class="head-acts">${inSheet ? "" : `<span class="saved-tag">${paused ? 'השעון עצור' : '✓ נשמר · נסגר לבד'}</span><button class="btn pause-btn" data-act="pause" aria-pressed="${paused}">${paused ? '▶ להמשיך' : '⏸ עצור'}</button>`}<button class="btn primary" data-act="close-lead">✓ סיום</button></div></div>
      ${hintPause ? `<div class="hint pause-hint">צריך עוד רגע? <b>⏸ עצור</b> עוצר את השעון, והכרטיס לא ייסגר לבד. <button class="link" data-act="hint-ok" data-k="pause">הבנתי</button></div>` : ''}
      <div class="warmth">${words().map((t, k) => `<button class="warm-btn w${k}" data-warm="${k}" data-lid="${l.id}" aria-pressed="${w === k}">${esc(t)}</button>`).join('')}</div>
      ${groupsFor(l).map((g) => `<div class="label">${esc(g.title)}</div>
        <div class="chips">${groupButtons(g.id).map((b) => `<button class="chip" data-tag="${b.id}" data-lid="${l.id}" aria-pressed="${l.tags.includes(b.id)}">${esc(b.label)}</button>`).join('')}</div>`).join('')}
      ${datey ? `<div class="label">מתי השמחה?</div><input type="date" class="text-input" data-eventdate="${l.id}" value="${esc(l.eventDate)}">` : ''}
      ${inSheet
        ? `<button class="next-line" data-act="tasks" data-lid="${l.id}"><span class="faint">מה הלאה:</span> ${planHTML(plan(l))}${ts.length > 1 ? ` <span class="faint">· ועוד ${many(ts.length - 1, 'משימה', 'משימות')}</span>` : ''}<span class="next-edit">שינוי</span></button>`
        // At the booth "what next" is read, not edited (יצחק, 17/10): it follows from the buttons, and is changed in the evening or in the CRM.
        : `<div class="next-line ro"><span class="faint">מה הלאה:</span> ${planHTML(plan(l))}${ts.length > 1 ? ` <span class="faint">· ועוד ${many(ts.length - 1, 'משימה', 'משימות')}</span>` : ''}${help('next')}</div>`}
      ${last ? `<div class="note-peek">📝 ${last.audio ? '🎙️ ' : ''}${esc((last.text || last.tr || 'הקלטה').slice(0, 80))}${l.notes.length > 1 ? ` <span class="faint">(${l.notes.length} הערות)</span>` : ''}</div>` : ''}
      <div class="actions">${sendBtn}
        <button class="btn" data-act="note" data-lid="${l.id}">📝 הערה</button>
        <button class="btn" data-act="note-rec" data-lid="${l.id}" ${micState === 'none' ? 'disabled title="אין מיקרופון במכשיר הזה"' : ''}>🎙️ ${micState === 'none' ? 'אין מיקרופון' : 'הקלטה'}</button>
        ${!inSheet && S.biz.collectList ? `<button class="btn" data-act="list-only" data-lid="${l.id}">רק לרשימת התפוצה</button>` : ''}
        ${!inSheet
          // One button, always the same (יצחק, 09/10): back to how the card opened — for a new visitor, not kept at all.
          ? `<button class="btn ghost danger far" data-act="card-undo" data-lid="${l.id}">↶ ביטול השינויים</button>`
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
    if (paused) return;                              // ⏸: he asked for time — the card waits for "סיום"
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
  const chName = (k) => (CHANNELS.find((c) => c.k === k) || { name: k }).name;
  /** Where one message goes (18/10): mail always, WhatsApp too when he chose it, and SMS only to a visitor who gave a second number. */
  function sendKeys(l) {
    const out = ['email'];
    if (S.biz.channels.wa) out.push('wa');
    if (S.biz.channels.sms && (!l || (l.contact && l.contact.phone2))) out.push('sms');
    return out;
  }
  const sendChannels = () => sendKeys().map(chName).concat(S.biz.channels.sms ? ['SMS (למי שמסר מספר נוסף)'] : []);

  /* Packages (08/10): a message and the material attached to it travel together, under a name the owner gives.
   * Whatever goes to a visitor — from the booth, a button, a task, a rule or a group send — is a package.
   * Each channel has a default package: what goes out on it when no package was chosen. */
  const PKG_TEXT = 'שלום {שם}, תודה שעברת בדוכן של {עסק}. מצורף {קובץ}.';
  const pkgById = (id) => S.biz.templates.find((t) => t.id === id);
  const CH_GROUP = { wa: 'wa', email: 'email', sms: 'sms' };
  const pkgFor = (id, k) => pkgById(id) || pkgById((S.biz.chDefault || {})[CH_GROUP[k]]) || (S.biz.templates.length === 1 ? S.biz.templates[0] : null);
  /** A file brought in anywhere becomes a material and a package of its own, with the default words. Returns the package id. */
  function addPackageWithFile(name, file) {
    if (!S.biz.materials.some((x) => x.name === name)) S.biz.materials.push({ name, file });
    let p = S.biz.templates.find((t) => t.mat === name);
    if (!p) { p = { id: 'p' + (S.biz.bseq++), name, mat: name, text: PKG_TEXT }; S.biz.templates.unshift(p); }
    return p.id;
  }
  let byRule = false;   // set while an automation acts: what it sends is logged as the system's, not the owner's
  /** Send one package (or each channel's default) to one lead. o: { quiet, toGroup }. False when nothing went out. */
  function sendPackage(l, id, o) {
    o = o || {};
    const chosen = pkgById(id);
    if (l.optOut && (o.toGroup || byRule)) return false;
    if (chosen && !o.toGroup && l.sent.includes(chosen.name)) return true;   // already has it
    const keys = sendKeys(l);
    const out = keys.map((k) => [k, pkgFor(id, k)]).filter(([, p]) => p);
    if (!out.length) { if (!o.quiet && !byRule) sheetNotReady(); return false; }
    // The practice booth searches real names: nothing it does may reach a real person (K3).
    if (l.practice) {
      out.forEach(([k, p]) => { if (!l.sent.includes(p.name)) l.sent.push(p.name); log(l, `📎 "${p.name}" — לדוגמה, לא נשלח (היה יוצא ב${chName(k)})`); });
      if (!o.quiet) toast('לדוגמה — לא נשלח באמת. במצב אמיתי זה ייצא ב' + out.map(([k]) => chName(k)).join(' + '));
      return true;
    }
    out.forEach(([k, p]) => {
      if (!l.sent.includes(p.name)) l.sent.push(p.name);
      log(l, `${byRule ? '⚙️ ' : ''}${p.mat ? '📎' : '💬'} "${p.name}" נשלח ב${chName(k)}${byRule ? ' (אוטומטי · עם שורת הסרה)' : o.toGroup ? ' (לקבוצה)' : ''}`);
    });
    // Something sent to him personally after the fair means he is in touch (M7). A group message, an automation,
    // or the catalogue handed over at the booth itself does not — that is still the first meeting.
    // The dashboard is the fair's own evening (N3): what is sent from it is still part of the first meeting.
    if (!o.toGroup && !byRule && S.view !== 'booth' && S.view !== 'dash') advance(l, 'contact', 'נשלח לו ' + out[0][1].name);
    if (!o.quiet && !byRule) toast(`${out[0][1].mat ? '📎' : '💬'} "${[...new Set(out.map(([, p]) => p.name))].join('", "')}" נשלח ל${People.rowName(l)} · ${out.map(([k]) => chName(k)).join(' + ')}`);
    return true;
  }
  /* A button whose step is "send at once" queues its package, and the queue goes
   * out when the card closes. Until then, untapping the button takes it back — a
   * message that has left cannot be. */
  function autoSend(l, b) {
    stepsOf(b).filter(immediate).forEach((s) => {
      const has = pkgById(s.pkg) || keysHaveDefault();
      // Not set up yet: nothing is queued and nothing is marked — the red dot on the card says so.
      if (has) l.queue = (l.queue || []).filter((q) => q.btn !== b.id).concat({ btn: b.id, pkg: s.pkg || '' });
    });
  }
  const keysHaveDefault = () => sendKeys().some((k) => pkgFor('', k));
  /** Everything ready before the fair (יצחק, 16/10): a way to send, and a message to send. What is missing is named. */
  const sendMissing = () => (!S.biz.templates.length ? 'מה לשלוח' : '');

  const sendReady = () => !sendMissing();
  function sheetNotReady() {
    const m = sendMissing();
    sheet(`<h2>עוד לא הגדרת ${esc(m || 'איך לשלוח')} למבקר</h2>
      <p class="muted">${m === 'מה לשלוח' ? 'אין עדיין הודעה לשליחה.' : 'אין עדיין דרך שליחה פעילה — מייל או וואטסאפ.'} כרגע שום דבר לא יוצא.</p>
      ${worker() || atBoothNow() ? '<p class="faint">את זה מגדירים בהגדרות, לפני התערוכה ואחריה — לא באמצע הדוכן.</p>' : ''}
      <div class="actions">${worker() || atBoothNow() ? '' : '<button class="btn primary" data-act="setup-send">להגדיר ←</button>'}<button class="btn ghost" data-act="sheet-close">סגירה</button></div>`);
  }
  const unqueue = (l, b) => { l.queue = (l.queue || []).filter((q) => q.btn !== b.id); };
  const unqueueAll = (l) => { l.queue = []; };   // what waited for the card to close does not go out
  function flushSends(l) {
    if (!l || !(l.queue || []).length) return;
    const q = l.queue;
    l.queue = [];
    q.forEach((x) => sendPackage(l, x.pkg));
    save();
  }
  window.addEventListener('pagehide', () => { if (openId) flushSends(leadById(openId)); if (held) flushSends(leadById(held)); });
  /** "What to send" — the owner's packages by name; the one tapped goes out with its message and its file. */
  function sheetMaterials(l) {
    const pkgs = S.biz.templates;
    const withFile = pkgs.filter((x) => x.mat).length;
    sheet(`<h2>מה לשלוח${l ? ' ל' + esc(People.rowName(l)) : ''}?</h2>
      ${pkgs.length ? `<div class="opts">${pkgs.map((x) => `<button class="opt" data-sendmat="${esc(x.id)}" data-lid="${l ? l.id : ''}" aria-pressed="${l ? l.sent.includes(x.name) : false}">${x.mat ? '📎' : '💬'} ${esc(x.name)}<small>${esc(x.mat ? 'מצורף: ' + x.mat : 'רק טקסט')}</small></button>`).join('')}</div>` : '<p class="muted">עוד אין מה לשלוח.</p>'}
      ${worker() ? '' : `<div class="label">${withFile ? 'הודעה חדשה עם קובץ' : 'להוסיף קטלוג עכשיו'}</div>
        <input id="mat-name" class="text-input" value="${withFile ? '' : 'קטלוג'}" placeholder="שם — קטלוג, מחירון, תמונות עבודות" autocomplete="off">
        <div class="opts"><label class="opt" for="mat-file">📷 לצלם או לבחור קובץ<small>תמונה או PDF</small></label></div>
        <input id="mat-file" type="file" accept="image/*,application/pdf" hidden>`}
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
      if (btn) btn.outerHTML = '<span class="faint">אין גישה למיקרופון — אפשר לכתוב.</span>';
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
    // At the booth a step for another day cannot be done yet: it can be changed, not marked done (יצחק, 09/10).
    const atBooth = S.view === 'booth' || S.phase !== 'live';
    const canDo = (t) => !atBooth || !t.due || dayNo(t.due.getTime()) <= dayNo(now());
    sheet(`<h2>${esc(title || 'מה הלאה עם ' + People.rowName(l) + '?')}</h2>
      ${ts.length ? `<div class="step-list">${ts.map((t, i) => `<div class="task-line${i === 0 ? ' first' : ''}"><span>${planHTML(t)}</span>
        <span class="task-acts">${t.type === 'send' || t.type === 'register' ? `<button class="btn" data-tasksend="${esc(t.key)}" data-lid="${l.id}">📎 לשלוח</button>` : ''}
          ${canDo(t) ? `<button class="btn" data-taskdone="${esc(t.key)}" data-lid="${l.id}">✓ ${doneWord(t)}</button>` : ''}
          <button class="btn ghost" data-taskedit="${esc(t.key)}" data-lid="${l.id}">שינוי</button></span></div>`).join('')}</div>`
        : l.won || ended(l) ? `<p class="muted">אין משימות. ${esc(restWord(l))}.</p>`
          // No step and no decision yet (a "cold" lead): the owner decides, not the system (G2).
          : `<p class="muted">אין לו משימה. מה עושים איתו?</p><div class="actions"><button class="btn" data-act="task-audience" data-lid="${l.id}">${NOFOLLOW}</button></div>`}
      <div class="actions"><button class="btn" data-act="task-add" data-lid="${l.id}">+ משימה</button>
        ${ts.length ? `<button class="btn ghost" data-act="task-audience" data-lid="${l.id}">${NOFOLLOW}</button>` : ''}
        <button class="btn primary" data-act="tasks-close" data-lid="${l.id}">סיום</button></div>`, l.id);
    $('#scrim .sheet').dataset.tasks = '1';
  }
  /** After a step is done, changed or added: back to the lead's page if that is where it started, else the steps sheet. */
  function afterTask(l) {
    // From the evening list or the "decide" list: a step added goes straight back to the list it came from (יצחק, 17/10).
    if (tasksRet === 'list') { tasksRet = null; filledCold.add(l.id); closeSheet(false); return render(); }
    if (tasksRet === 'page'
 || (!$('#scrim') && S.view === 'crm' && S.crmLead === l.id)) { tasksRet = null; closeSheet(false); return render(); }
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
    for (let n = 0; n < 20; n++) {
      let key;
      do { key = Math.random() < 0.2 ? 'b:' + rnd(1200) : 'p:' + rnd(People.list.length); } while (taken.has(key) || (key[0] === 'b' && !People.biz(+key.slice(2))));
      taken.add(key);
      const hand = Math.random() < 0.4;
      const l = Object.assign(newLead(key, People.row(key)), { at: now() - rnd(8 * 3600000), created: 0, visits: Math.random() < 0.08 ? 2 : 1,
        warmth: hand ? rnd(3) : null, warmBy: hand ? 'hand' : null, demo: true });
      liveGroups().forEach((g) => { if (Math.random() < 0.55) { const bs = groupButtons(g.id); l.tags.push(bs[rnd(bs.length)].id); } });
      if (Math.random() < 0.15) l.notes.push({ id: 'n' + (S.nseq++), at: l.at, text: ['ביקש לחזור אחרי החגים', 'מתעניין בכמות גדולה', 'מכיר אותנו מהשכונה'][rnd(3)], audio: false, tr: '' });
      log(l, 'ביקר בדוכן');
      S.leads.push(l);
    }
    save();
  }
  function dashAsks(L) {
    const out = [];
    // Two kinds (יצחק, 09/10): "חסר" — nothing marked at all; "להשלמה" — something marked, but not everything:
    // no warmth, or a group of buttons with nothing tapped in it.
    const isEmpty = (l) => effWarm(l) == null && !l.tags.length;
    const isPartial = (l) => !isEmpty(l) && missingOf(l).length > 0;
    // A row filled in stays where it is until the screen is left: the next row must not slide under the finger.
    const rowsE = L.filter((l) => isEmpty(l) || filled.has('empty:' + l.id));
    const rowsP = L.filter((l) => (isPartial(l) || filled.has('partial:' + l.id)) && !rowsE.includes(l));
    const leftE = rowsE.filter(isEmpty).length;
    const leftP = rowsP.filter(isPartial).length;
    if (rowsE.length) out.push({ fill: 'empty', q: leftE ? `${leftE === 1 ? 'אחד לא סומן' : leftE + ' לא סומנו'} בכלל. כדאי עכשיו, כשעוד זוכרים — בערך דקה.` : '✓ הכל מולא.', leads: rowsE });
    if (rowsP.length) out.push({ fill: 'partial', q: leftP ? `${leftP === 1 ? 'אחד סומן' : leftP + ' סומנו'} רק חלקית.` : '✓ הכל מולא.', leads: rowsP });
    // G2: "cold" is the owner's call — the system cannot know what he meant by it, so it asks: a task, or the mailing list.
    const cold = L.filter((l) => effWarm(l) === 2 && undecided(l));
    if (cold.length || filledCold.size) out.push({ cold: true, q: cold.length ? `${cold.length === 1 ? 'אחד סומן' : cold.length + ' סומנו'} "${words()[2]}" — מה איתם?` : '✓ כולם הוחלטו.', leads: cold.concat(L.filter((l) => filledCold.has(l.id) && !cold.includes(l))) });
    // Not set up to send: one line about the business, not a list of visitors waiting (יצחק, 16/10).
    if (!sendReady() && !worker()) out.push({ setup: true, q: `עוד לא הגדרת ${sendMissing()} למבקר — מהדוכן לא יוצאת שום הודעה.` });
    return out;
  }
  /** The evening's last line: what waits on the next working day, counted, not listed — the list is the CRM's. */
  // S14: one of a kind is said as one ("הצעת מחיר אחת להכין"), never "1 הצעות".
  const PLURAL = { call: ['שיחה אחת', 'שיחות'], meet: ['תיאום פגישה אחד', 'תיאומי פגישה'], quote: ['הצעת מחיר אחת להכין', 'הצעות מחיר להכין'], send: ['הודעה אחת לשלוח', 'הודעות לשלוח'], date: ['בדיקת תאריך אחת', 'בדיקות תאריך'], register: ['פרטי הרשמה לשלוח', 'פרטי הרשמה לשלוח'] };
  function nextDayLine(L) {
    const all = [].concat(...L.map((l) => tasks(l).filter((t) => t.type !== 'season' && t.due)));
    if (!all.length) return 'אין משימות.';
    // Everything due today or late counts as today (N4) — not only the earliest day that has a step.
    const first = Math.max(dayNo(now()), Math.min(...all.map((t) => dayNo(t.due.getTime()))));
    const day = all.filter((t) => (first === dayNo(now()) ? dayNo(t.due.getTime()) <= first : dayNo(t.due.getTime()) === first));
    const n = {};
    day.forEach((t) => { n[t.type] = (n[t.type] || 0) + 1; });
    const when = first - dayNo(now()) === 1 ? 'מחר' : first <= dayNo(now()) ? 'היום' : 'ב' + shortDay(day[0].due);
    return `<b>${esc(when)}:</b> ${PRI.filter((k) => n[k]).map((k) => (PLURAL[k] ? many(n[k], PLURAL[k][0], PLURAL[k][1]) : n[k] + ' ' + STEPS[k].name)).join(' · ')}`;
  }
  function viewDash(m) {
    const all = leadsNow();
    const lo = all.filter((l) => l.listOnly).length;
    const L = all.filter((l) => !l.listOnly);   // kept for the mailing list only: not a lead, nothing to complete
    const demo = L.filter((l) => l.demo).length;
    const ws = [0, 1, 2, null].map((k) => L.filter((l) => effWarm(l) === k).length);
    const asks = dashAsks(L);
    m.innerHTML = `${eyebrow('יום התערוכה · סוף היום')}<h1>בדוכן: ${many(L.length - demo, 'מבקר אחד', 'מבקרים')}${demo ? ` <span class="faint">(ועוד ${demo} לדוגמה)</span>` : ''} ${help('dash')}</h1>
      ${lo ? `<p class="faint">ועוד ${lo} שנרשמו רק לרשימת התפוצה.</p>` : ''}
      ${practice() && !worker() && L.length < 8 ? `<div class="ask-card" style="margin-top:12px"><div class="q">רוצה לראות יום מלא?</div>
        <div class="actions"><button class="btn" data-act="seed">להוסיף 20 מבקרים לדוגמה</button></div></div>` : ''}

      <div class="stats">${words().map((t, k) => `<button class="stat" data-act="warm-list" data-k="${k}" ${ws[k] ? '' : 'disabled'}><span class="n">${ws[k]}</span><span class="t">${esc(t)}</span></button>`).join('')}
        <button class="stat" data-act="warm-list" data-k="none" ${ws[3] ? '' : 'disabled'}><span class="n">${ws[3]}</span><span class="t">לא סומן</span></button></div>
      <h2 style="margin-top:22px">מה כדאי להשלים</h2>
      <div class="ask" style="margin-top:10px">${asks.map(dashCard).join('') || '<div class="empty">הכל מסומן.</div>'}</div>
      <h2 style="margin-top:26px">מה מחכה</h2>
      <div class="ask-card" style="margin-top:10px"><div class="q">${nextDayLine(L)}</div>
        ${worker() ? '' : '<div class="actions"><button class="btn" data-view="crm">למעקב ←</button></div>'}</div>
      ${insightsBox('dash', 'איך היה היום')}`;   // last, and only a look back at the day (יצחק, 12/10) — the actions are above it
  }
  let fillOpen = false;
  const filled = new Set();   // rows filled in on this visit to the dashboard — they keep their place
  let fillSnap = {};   // what each row had when the evening list opened — a tap that changes it asks first (יצחק, 13/10)
  let askOk = false;   // the "change it?" question was answered yes, and the tap is replayed
  let pendingAsk = null;   // the button that asked, found again after yes
  // One action stands out on the evening screen (UX review D-2): the first card in the list, the one whose memory fades first.
  function dashCard(a, i) {
    const pri = i ? '' : ' primary';
    let body = '';
    if (a.fill) body = fillOpen === a.fill ? fillList(a.leads, a.fill) : `<div class="actions"><button class="btn${pri}" data-act="fill-open" data-kind="${a.fill}">להשלים</button></div>`;
    else if (a.cold) body = fillOpen === 'cold' ? coldList(a.leads) : `<div class="actions"><button class="btn${pri}" data-act="fill-open" data-kind="cold">מה איתם</button></div>`;
    else if (a.setup) body = `<div class="actions"><button class="btn${pri}" data-act="setup-send">להגדיר ←</button></div>`;
    // An open list closes with its own button, or with a tap anywhere outside it (יצחק, 12/10).
    const open = (a.fill && fillOpen === a.fill) || (a.cold && fillOpen === 'cold');
    return `<div class="ask-card${open ? ' open' : ''}"><div class="q">${esc(a.q)}</div>${body}${open ? '<div class="actions"><button class="btn ghost" data-act="fill-close">סגירה</button></div>' : ''}</div>`;
  }
  const filledCold = new Set();   // cold leads decided on this visit to the dashboard — they keep their place
  function coldList(leads) {
    return `<div style="margin-top:8px">${leads.map((l) => {
      const done = l.won || ended(l) ? restWord(l) : tasks(l).length ? 'יש משימה' : '';
      return `<div class="tag-row${done ? ' filled' : ''}"><button class="link" data-${S.view === 'crm' ? 'crmlead' : 'openlead'}="${l.id}">${done ? '✓ ' : ''}<b>${esc(People.rowName(l))}</b> <span class="muted">${esc(People.town(l))}</span><span class="memo">${esc([People.rowMeta(l), done].filter(Boolean).join(' · '))}</span></button>
        <span class="chips">${done ? '' : `<button class="chip" data-act="task-add" data-ret="list" data-lid="${l.id}">+ משימה</button><button class="chip" data-act="cold-aud" data-lid="${l.id}">${NOFOLLOW}</button>`}</span></div>`;
    }).join('')}</div>`;
  }
  /** What a lead still lacks: warmth, and each group of buttons with nothing tapped in it. */
  const missingOf = (l) => [effWarm(l) == null ? 'חום' : ''].concat(groupsFor(l).filter((g) => !groupButtons(g.id).some((x) => l.tags.includes(x.id))).map((g) => g.title)).filter(Boolean);
  function fillList(leads, kind) {
    if (!leads.length) return '<div class="faint" style="margin-top:6px">✓ הכל מסומן.</div>';
    // Every group is shown, as at the booth — he may remember something and want to change it (יצחק, 13/10).
    // A tap that changes what was marked before the list opened asks first; filling in what is missing does not.
    return `<div style="margin-top:8px">${leads.map((l) => {
      const w = effWarm(l);
      const was = fillSnap[l.id] || (fillSnap[l.id] = { warm: w, tags: l.tags.slice() });
      const gs = kind === 'partial' ? groupsFor(l) : groupsFor(l).slice(0, 1);
      const askWarm = (k) => was.warm != null && was.warm !== k && w === was.warm;
      const askTag = (x, g) => (l.tags.includes(x.id) ? was.tags.includes(x.id)
        : !g.multi && groupButtons(g.id).some((o) => o.id !== x.id && l.tags.includes(o.id) && was.tags.includes(o.id)));
      const note = l.notes[0] && (l.notes[0].text || l.notes[0].tr);
      const lack = kind === 'partial' ? missingOf(l) : [];
      const memo = [new Date(l.at).toTimeString().slice(0, 5), People.rowMeta(l), lack.length ? 'חסר: ' + lack.join(', ') : '', note ? '📝 ' + note.slice(0, 40) : ''].filter(Boolean).join(' · ');
      const done = filled.has(kind + ':' + l.id);
      return `<div class="tag-row${done ? ' filled' : ''}" data-fill="${kind}"><button class="link" data-openlead="${l.id}">${done ? '✓ ' : ''}<b>${esc(People.rowName(l))}</b> <span class="muted">${esc(People.town(l))}</span>${l.demo ? ' <span class="faint">· לדוגמה</span>' : ''}<span class="memo">${esc(memo)}</span></button>
        <span class="mini-w">${words().map((t, k) => `<button class="warm-btn w${k}" data-warm="${k}" data-lid="${l.id}" aria-pressed="${w === k}"${askWarm(k) ? ' data-ask="1"' : ''}>${esc(t)}</button>`).join('')}</span>
        ${gs.map((g) => `<span class="chips mini-tags">${groupButtons(g.id).map((x) => `<button class="chip" data-tag="${x.id}" data-lid="${l.id}" aria-pressed="${l.tags.includes(x.id)}"${askTag(x, g) ? ' data-ask="1"' : ''}>${esc(x.label)}</button>`).join('')}</span>`).join('')}</div>`;
    }).join('')}</div>
      `;
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
      if (held.length) { const p = plan(held[0]); out.push({ text: `${held.length} שמורים לעונה "${p.season || 'העונה'}". יחזרו אליך ב${shortDay(p.due)}.`, leadIds: held.map((l) => l.id), action: null }); }
      const twice = L.filter((l) => l.noAnswer >= 2 && !l.sent.length && tasks(l).length);
      if (twice.length) out.push({ text: `${twice.length} לא ענו פעמיים. לשלוח להם הודעה במקום עוד שיחה?`, leadIds: twice.map((l) => l.id), action: { kind: 'step', type: 'send' } });

    }
    return out;
  }
  function insightsBox(scope, title) {
    const fixed = fixedInsights(scope);
    const got = S.ai[scope];
    if (!fixed.length && !got && !ai) return '';   // nothing to show and no one to ask: no empty box
    const card = (x, i, src) => `<div class="insight ${src}"><div class="q">${esc(x.text)}</div>
      ${x.leadIds && x.leadIds.length ? `<div class="faint">${x.leadIds.map(leadById).filter(Boolean).slice(0, 6).map((l) => `<button class="link" ${scope === 'crm' ? 'data-crmlead' : 'data-openlead'}="${l.id}">${esc(People.rowName(l))}</button>`).join(' · ')}${x.leadIds.length > 6 ? ' ועוד ' + (x.leadIds.length - 6) : ''}</div>` : ''}
      ${x.action ? (x.done ? '<div class="faint">✓ בוצע</div>' : `<div class="actions"><button class="btn primary" data-insight="${src}:${i}" data-scope="${scope}">${esc(actionText(x.action))}</button></div>`) : ''}</div>`;
    return `<h2 style="margin-top:26px">✨ ${esc(title)}</h2>
      <div class="ask" style="margin-top:10px">${fixed.map((x, i) => card(x, i, 'fixed')).join('')}
        ${got ? got.items.map((x, i) => card(x, i, 'ai')).join('') || '<div class="faint">לא נמצא משהו מיוחד.</div>' : ''}
        ${ai ? `<div class="actions"><button class="btn" data-act="ai-insights" data-scope="${scope}" id="ins-${scope}">${got ? (scope === 'dash' ? '✨ לסכם שוב' : '✨ מה עוד כדאי?') : scope === 'dash' ? '✨ לסכם לי את היום' : '✨ מה עוד כדאי?'}</button></div>`
          : ''}
        ${!fixed.length && !got && !ai ? '<div class="faint">אין כרגע.</div>' : ''}</div>`;
  }
  const actionText = (a) => (a.kind === 'shift' ? 'להעביר למחר' : a.kind === 'warm' ? 'לסמן ' + words()[a.value] : 'להוסיף משימה: ' + (STEPS[a.type] || STEPS.call).name);
  function applyInsight(scope, ref) {
    const [src, i] = ref.split(':');
    const x = src === 'fixed' ? fixedInsights(scope)[+i] : S.ai[scope] && S.ai[scope].items[+i];
    if (!x || !x.action) return;
    x.leadIds.map(leadById).filter(Boolean).forEach((l) => {
      const a = x.action;
      if (a.kind === 'warm') { l.warmth = a.value; l.warmBy = 'hand'; }
      // N7: "tomorrow" for a call or a meeting skips Friday, as everywhere else.
      else if (a.kind === 'shift') tasks(l).filter((t) => dayNo(t.due.getTime()) < dayNo(now())).forEach((t) => { l.moved[t.key] = H.addDays(new Date(now()), 1, talk(t.type)).getTime(); });
      else if (a.type === 'none') toEnd(l, 'לפי הצעה');
      else { const s = normStep({ type: a.type }); addManual(l, s, dueFor(s)); }
      log(l, 'לפי הצעה: ' + actionText(a));
    });
    x.done = true;
    save(); render();
    toast('✓ ' + actionText(x.action));
  }
  function leadFacts(l) {
    const p = plan(l);
    // G5: the AI gets a lead by its number, never by name — the screen turns the numbers back into names.
    return { id: l.id, business: l.b != null, town: People.town(l), warmth: effWarm(l) == null ? null : words()[effWarm(l)],
      tags: tagged(l).map((b) => b.label), sent: l.sent, next: p.label, nextKind: p.type,
      dueInDays: p.due ? dayNo(p.due.getTime()) - dayNo(now()) : null, openSteps: tasks(l).length, noAnswer: l.noAnswer || 0,
      notes: l.notes.map((n) => n.text || n.tr).filter(Boolean).slice(-5), won: !!l.won, notClosed: !!l.lost, onMailingList: onList(l) };
  }
  async function aiInsights(scope) {
    const L = leadsNow().slice(-80).map(leadFacts);
    const btn = $('#ins-' + scope);
    if (btn) { btn.disabled = true; btn.textContent = 'קורא…'; }
    const focus = scope === 'dash'
      ? 'Give a short OVERVIEW OF THE DAY AT THE BOOTH, looking back only: how many came and of what kind, what they were interested in, how warm, who came back, what the notes say. No advice, no tasks, no actions — only what happened. Set every action to null.'
      : 'Read every lead\'s notes first: when a note asks for something — to be called at a time, a price, a sample, a date, a visit — propose exactly that step for that lead, and say which note it comes from. Then look at the SALES FOLLOW-UP: who to call first and why, overdue or neglected leads, what is held for a season, leads that should get another step. Do not talk about tagging at the booth.';
    const prompt = `You assist an exhibitor (${S.biz.trade || 'a business'}) at a Hasidic community business fair in Israel.
His goal at the fair: ${S.biz.goalNote || S.biz.goal || 'not given'}.
His buttons: ${S.biz.buttons.map((b) => b.label + ' → ' + stepsOf(b).map((s) => STEPS[s.type].name).join(' + ')).join('; ')}.
His leads (JSON): ${JSON.stringify(L)}
${focus}
Give at most 4 short, concrete observations in Hebrew, each about specific leads, judged against his goal. Skip anything obvious or already handled.
Leads are given by number only. Never write a lead number or a name in the text — the screen lists the leads under each observation.
Reply with ONLY JSON: {"insights":[{"text":"one Hebrew sentence","leadIds":[ids],"action":null | {"kind":"warm","value":0|1|2} | {"kind":"step","type":"call|send|quote|meet|date|register|season|none"}}]}
warm value: 0 = ${words()[0]}, 1 = ${words()[1]}, 2 = ${words()[2]}. A step action ADDS that step to those leads.`;
    try {
      const r = await ai.json(prompt, { modelTier: 'quick' });
      const ids = new Set(leadsNow().map((l) => l.id));
      const items = (r && Array.isArray(r.insights) ? r.insights : []).slice(0, 4).map((x) => {
        let action = null;
        const a = x && x.action;
        if (a && a.kind === 'warm' && [0, 1, 2].includes(a.value)) action = { kind: 'warm', value: a.value };
        if (a && a.kind === 'step' && STEPS[a.type]) action = { kind: 'step', type: a.type };
        if (scope === 'dash') action = null;   // the day's overview tells what happened; it does not act
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
  //   סקירה    next in line: one lead and its action, the queue, what to do (11/10)
  //   לידים    a table (filters, saved views, bulk actions, Excel) or by stage; a message to a group
  //   משימות   a list by day, or a board by time
  //   פילוחים  the numbers, the 14 days, the morning message, the AI, any dimension against any measure
  //   The rules (when X, do Y) are in the settings.
  // ------------------------------------------------------------------
  const DEF_STAGES = [
    { id: 'new', name: 'ליד חדש' }, { id: 'contact', name: 'בקשר' }, { id: 'quote', name: 'הצעה נשלחה' },
    { id: 'nego', name: 'במשא ומתן' }, { id: 'won', name: 'נסגרה עסקה', kind: 'won' }, { id: 'lost', name: 'לא נסגרה', kind: 'lost' },
  ];
  const DEF_TEMPLATES = [
    { id: 't1', name: 'תודה על הביקור', mat: '', booth: true, text: 'שלום {שם}, תודה שעברת בדוכן של {עסק} בתערוכה. נשמח לעמוד לשירותך.' },
    { id: 't2', name: 'כמו שדיברנו', mat: '', text: 'שלום {שם}, כמו שדיברנו — לכל שאלה אני כאן.' },
    { id: 't3', name: 'תזכורת לפגישה', mat: '', text: 'שלום {שם}, מזכיר את הפגישה שקבענו. מחכים לך!' },
    { id: 't4', name: 'לפני העונה', mat: '', text: 'שלום {שם}, העונה מתקרבת — זה הזמן להזמין. נשמח לשמוע ממך.' },
  ];
  // Rules that send something to the visitor start switched off: the owner turns them on knowingly.
  const DEF_RULES = [
    { id: 'r1', on: false, trigger: 'noanswer', arg: 2, cond: {}, action: { kind: 'message', tpl: '' }, fired: 0 },
    // Examples that are on from the start (יצחק, 11/10): each does something the system does not do by itself,
    // so the owner sees how a rule is built for his own needs. Rules that send to a customer start off.
    { id: 'r3', on: true, trigger: 'idle', arg: 7, cond: {}, action: { kind: 'step', type: 'call', days: 1 }, fired: 0 },
    { id: 'r5', on: true, trigger: 'stage', arg: 'quote', cond: {}, action: { kind: 'notify' }, fired: 0 },
    // Q5 (יצחק, 18/10: "not quite"): a business visitor is not by itself a deal — "lead = an opportunity for a deal".
    // So this one waits among the suggestions, off, for whoever wants it.
    { id: 'r6', on: false, trigger: 'captured', arg: null, cond: { biz: true }, action: { kind: 'notify' }, fired: 0 },
    { id: 'r4', on: false, trigger: 'won', arg: null, cond: {}, action: { kind: 'message', tpl: 't1' }, fired: 0 },
  ];
  const clone = (x) => JSON.parse(JSON.stringify(x));
  /** Older saved states lack the CRM's fields; fill them in rather than throw the data away. */
  function upgrade() {
    const b = S.biz;
    if (!b.stages) b.stages = clone(DEF_STAGES);
    if (!b.coldDo) b.coldDo = 'ask';
    (b.groups || []).forEach((g) => {   // the group names in plain words (S11, G7)
      if (g.id === 'who' && g.title === 'סוג פונה') { g.title = STD.who.title; g.hint = STD.who.hint; }
      if (g.id === 'size' && g.title === 'סדר גודל') { g.title = STD.size.title; g.hint = STD.size.hint; }
    });
    if (!b.gradesV) { b.gradesV = true; if (b.grades === 'classic' || !GRADES[b.grades]) b.grades = 'serious'; }   // the new default names
    (b.templates || []).forEach((t) => { if (t.text) t.text = t.text.replace(/\{חומר\}/g, '{קובץ}'); });   // only messages, with a file or without (W18)
    if (!b.listV) {   // 16/10: "audience" and "not relevant" are one — the mailing list, the last stage
      b.listV = true;
      const lost = b.stages.find((s) => s.kind === 'lost');
      const won = b.stages.find((s) => s.kind === 'won');
      if (lost && /^(לא רלוונטי|אבוד)$/.test(lost.name)) lost.name = 'רשימת תפוצה';
      if (won && won.name === 'נסגר') won.name = 'נסגרה עסקה';
      S.leads.forEach((l) => { if (l.audience && !l.won) { l.lost = true; l.stage = lost ? lost.id : 'lost'; } delete l.audience; });
    }
    if (!b.listV2) {   // 18/10: two axes — the outcome ends in "לא נסגרה", and the mailing list is a flag of its own
      b.listV2 = true;
      const lost = b.stages.find((s) => s.kind === 'lost');
      if (lost && /^(רשימת תפוצה|רשימת התפוצה|לא רלוונטי|אבוד)$/.test(lost.name)) lost.name = 'לא נסגרה';
      S.leads.forEach((l) => { l.list = !l.optOut; });
    }
    if (!S.v1810) {   // 17–18/10: sign-in, three phases, mail always, warmth by hand, the settings in two
      S.v1810 = true;
      if (S.signed === undefined) S.signed = !!S.account.name;
      if (!S.sys) S.sys = S.phase === 'live' ? 'real' : 'demo';
      if (S.step === 'try') { S.phase = 'live'; S.view = 'booth'; }
      if (S.phase === 'settings') { S.phase = 'live'; S.view = S.view || 'booth'; }
      if (S.phase === 'setup' && !SETUP.some(([k]) => k === S.step)) S.step = 'account';
      if (!S.notices) S.notices = fresh().notices;
      if (!S.seen) S.seen = {};
      if (S.account.wa2 === undefined) S.account.wa2 = '';
      // 20/10: WhatsApp became a question; a number typed in the old field means "yes, on another number".
      if (S.account.hasWa === undefined && S.account.wa2) { S.account.hasWa = true; S.account.waSame = false; }
      // 20/10: the setup's old steps land in their new ones.
      if (S.phase === 'setup') { S.step = { send: 'messages', auto: 'custom' }[S.step] || S.step; if (S.setupReach === undefined) S.setupReach = Math.max(0, SETUP.findIndex(([k]) => k === S.step)); }
      b.channels = { email: true, wa: !!(b.channels && (b.channels.wa || b.channels.waApi)), sms: !!(b.channels && b.channels.sms) };
      if (!b.waHow) b.waHow = b.channels.wa ? 'own' : '';
      delete b.chOrder; delete b.sendAll; delete b.derive;
      if (!b.noAnsDo) b.noAnsDo = 'ask';
      if (b.collectList === undefined) b.collectList = false;
      // A warmth the system once suggested is not his mark: only what he tapped stays.
      S.leads.forEach((l) => { if (l.warmBy !== 'hand') l.warmth = l.warmth != null && l.warmBy == null ? l.warmth : null; delete l.warmBy; });
      // The message offered at the booth: the first one with a file, or the first one.
      if (!(b.templates || []).some((t) => t.booth)) { const t = (b.templates || []).find((x) => x.mat) || (b.templates || [])[0]; if (t) t.booth = true; }
    }
    if (!(b.digest && b.digest.hour)) b.digest = Object.assign({ on: true, ch: 'wa', hour: '08:00' }, b.digest);
    delete b.team;   // the team was taken out (יצחק, 09/10): a lead belongs to the business
    if (!b.templates) b.templates = clone(DEF_TEMPLATES);
    if (!b.rules) b.rules = clone(DEF_RULES);
    b.templates.filter((t) => t.booth).slice(1).forEach((t) => { t.booth = false; });   // one booth default, never several
    if (!b.digest) b.digest = { on: true, ch: 'wa', hour: '08:00' };
    if (b.digest.ch === 'sms') b.digest.ch = 'wa';
    if (!b.digestNotes) b.digestNotes = [];
    if (b.afterSale === undefined) b.afterSale = 7;   // days after a deal to ask how it went; 0 = never
    // A step kind that no longer exists (the regular-customer step, 08/10) becomes a call wherever it was saved:
    // a lead's own steps, the buttons, the rules, and insights kept from an earlier reading.
    const known = (s) => { if (s && s.type && !STEPS[s.type]) s.type = 'call'; };
    S.leads.forEach((l) => (l.manual || []).forEach(known));
    b.buttons.forEach((x) => (x.steps || []).forEach(known));
    (b.defSteps || []).forEach(known);
    (b.rules || []).forEach((r) => { if (r.action && r.action.kind === 'step') known(r.action); });
    Object.values(S.ai || {}).forEach((got) => ((got && got.items) || []).forEach((x) => { if (x.action && x.action.kind === 'step') known(x.action); }));
    if (!b.views) b.views = [];
    if (!b.pkgV) {   // 08/10: a message and its material travel together, as one named package
      b.pkgV = 1;
      const wrap = b.template || 'שלום {שם}, תודה שעברת בדוכן של {עסק}. מצורף {חומר}.';
      b.templates.forEach((t) => { delete t.ch; if (t.mat === undefined) t.mat = ''; });
      const byMat = {};
      (b.materials || []).forEach((m) => {
        let p = b.templates.find((t) => t.mat === m.name);
        if (!p) { p = { id: 'p' + (b.bseq++), name: m.name, mat: m.name, text: wrap }; b.templates.unshift(p); }
        byMat[m.name] = p.id;
      });
      // An old template that says "attached" gets the first file, so it never promises a file it does not carry.
      b.templates.forEach((t) => { if (!t.mat && /{חומר}/.test(t.text) && b.materials.length) t.mat = b.materials[0].name; });
      const fix = (s) => { if (s && 'mat' in s) { if (s.mat && byMat[s.mat]) s.pkg = byMat[s.mat]; delete s.mat; } };
      b.buttons.forEach((x) => (x.steps || []).forEach(fix));
      (b.defSteps || []).forEach(fix);
      S.leads.forEach((l) => { (l.manual || []).forEach(fix); (l.queue || []).forEach((q) => { if (q.mat) q.pkg = byMat[q.mat]; delete q.mat; }); });
      b.rules.forEach((r) => { if (r.action.kind === 'send') { r.action.kind = 'message'; r.action.tpl = byMat[r.action.mat] || ''; } delete r.action.mat; });
      if (!b.chDefault) b.chDefault = {};
      delete b.template; delete b.sendWhen;
    }
    if (!b.rulesV3) {   // 11/10: the default "captured + hot → a meeting" doubled the buttons' own steps; examples of what the system lacks replace it
      b.rulesV3 = true;
      b.rules = b.rules.filter((r) => !(r.id === 'r2' && r.trigger === 'captured' && r.action.kind === 'step' && !r.fired));
      DEF_RULES.filter((d) => ['r5', 'r6'].includes(d.id)).forEach((d) => { if (!b.rules.some((r) => r.id === d.id)) b.rules.push(clone(d)); });
    }
    if (!b.rulesV2) {   // after the reviews: sending rules off unless the owner turns them on, and one ready view
      b.rulesV2 = true;
      b.rules.forEach((r) => { if ((r.action.kind === 'send' || r.action.kind === 'message') && !r.fired) r.on = false; });
      if (!b.views.some((v) => v.builtin)) b.views.unshift({ name: 'חמים בלי מענה', builtin: true, tb: { f: { warm: '0', answer: 'none' }, sort: { col: 'at', dir: 1 }, cols: ['name', 'town', 'stage', 'last', 'next', 'due', 'phone'] } });
    }
    if (!S.crmTab) S.crmTab = 'overview';
    if (!S.tb) S.tb = { f: {}, sort: { col: 'due', dir: 1 }, cols: ['name', 'town', 'stage', 'warm', 'last', 'next', 'due'] };
    if (!S.tb.v2) { S.tb.v2 = true; if (!S.tb.cols.includes('last')) S.tb.cols.splice(Math.max(0, S.tb.cols.indexOf('next')), 0, 'last'); }
    // 16/10: no worth on screen — a star decides who comes first, and amounts are gone (D1, C3).
    S.tb.cols = S.tb.cols.filter((c) => c !== 'value'); if (PV.metric === 'value') PV.metric = 'count';
    b.buttons.forEach((x) => { x.weight = isStar(x) ? 2 : 0; delete x.value; });
    (b.rules || []).forEach((r) => { if (r.cond) delete r.cond.minValue; });
    S.tb.cols = S.tb.cols.filter((c) => c !== 'owner'); (S.biz.views || []).forEach((v) => { if (v.tb && v.tb.cols) v.tb.cols = v.tb.cols.filter((c) => c !== 'owner'); if (v.tb && v.tb.f) delete v.tb.f.owner; }); delete S.tb.f.owner; delete S.mine;
    S.leads.forEach(upgradeLead);
  }
  function upgradeLead(l) {
    if (!l.stage) l.stage = l.won ? 'won' : l.lost ? 'lost' : 'new';

    if (!l.contact) l.contact = { phone: '', email: '' };
    if (!l.files) l.files = [];
    if (!l.ruled) l.ruled = {};
    if (!l.ruleHits) l.ruleHits = {};
    if (!l.queue) l.queue = [];
    if (!l.by) l.by = 'בעלים';
    delete l.pendingMat;   // 16/10: nothing waits — a message goes out at once or not at all
  }
  const stageById = (id) => S.biz.stages.find((s) => s.id === id) || S.biz.stages[0];
  const stageOf = (kind) => S.biz.stages.find((s) => s.kind === kind);
  const nis = (v) => (Math.round(v || 0)).toLocaleString('he-IL') + ' ₪';
  const dateShort = (t) => { if (!t) return '—'; const d = new Date(t); return d.getDate() + '/' + (d.getMonth() + 1); };
  /** What the lead is worth: typed in, or the average the owner set on the most valuable button tapped. Never guessed. */

  const isOpenLead = (l) => !l.won && !l.lost;
  const many = (n, one, few) => (n === 1 ? one : n + ' ' + few);   // "פעם אחת" / "3 פעמים"

  /* Contact, counted honestly. A person reached the visitor when the owner spoke with
   * him, or sent him something by hand. A "no answer" is an attempt, not contact, and
   * what an automation sent is the system's doing — neither may make a lead look handled. */
  const isAuto = (t) => /^⚙️/.test(t);
  const isTalk = (t) => /^📞 דיברנו/.test(t);
  const isNoAnswer = (t) => /^📞 לא ענה/.test(t);
  // M2: a message sent to a whole group is not contact with this person — it must not make a neglected lead look handled.
  const isHumanSend = (t) => /^(💬|📎)/.test(t) && !/ממתין|\(לקבוצה\)|בניסיון/.test(t);
  const touched = (l) => l.log.filter((e) => isTalk(e.t) || isHumanSend(e.t));
  const tries = (l) => l.log.filter((e) => isNoAnswer(e.t));
  /** none · tried (no answer yet) · sent (material or a message, not spoken) · talked */
  function answerState(l) {
    if (l.log.some((e) => isTalk(e.t))) return 'talked';
    if (l.log.some((e) => isHumanSend(e.t))) return 'sent';
    if (tries(l).length) return 'tried';
    return 'none';
  }
  const ANSWER = { none: 'עוד לא', tried: 'ניסינו ולא ענה', sent: 'קיבל הודעה', talked: 'דיברנו' };
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
      // After a deal: one check on how it went — the moment a happy customer orders again. A setting of the business, not a button.
      if (S.biz.afterSale) addManual(l, { type: 'call', label: 'איך היה? בדיקה אחרי מכירה', days: S.biz.afterSale, phase: 'after' }, H.addDays(new Date(now()), S.biz.afterSale, true).getTime());
      runRules('won', l);
    }
    runRules('stage', l, st.id);
  }

  /* M7 (יצחק, 11/10): "a system that runs the business, not a business that runs a system". What the system knows
   * from an event moves the lead forward by itself — never back, and never to closed or not relevant, which are the
   * owner's to say. Where it cannot know, the "what next?" sheet asks where he stands, with the likely answer chosen. */
  const workStages = () => S.biz.stages.filter((s) => !s.kind);
  function advance(l, id, why) {
    if (l.won || l.lost) return;
    const w = workStages();
    const to = w.findIndex((s) => s.id === id);
    if (to < 0 || to <= w.findIndex((s) => s.id === l.stage)) return;
    setStage(l, id, 'המערכת קידמה · ' + why);   // the log says who moved him, and on what
  }

  // ---- automations ----
  const TRIGGERS = { captured: 'ליד נרשם בדוכן', noanswer: 'לא ענה', idle: 'עוברים ימים בלי קשר', stage: 'ליד עובר לשלב', won: 'נסגרה עסקה' };
  const ACTIONS = { step: 'להוסיף משימה', message: 'לשלוח הודעה', stage: 'להעביר לשלב', warm: 'לסמן חום', notify: 'להוסיף להודעת הבוקר' };
  const sendsOut = (r) => r.action.kind === 'send' || r.action.kind === 'message';
  const tplById = (id) => S.biz.templates.find((t) => t.id === id);
  function ruleText(r) {
    const a = r.action;
    const when = r.trigger === 'noanswer' ? `לא ענה ${many(r.arg, 'פעם אחת', 'פעמים')}` : r.trigger === 'idle' ? `עוברים ${r.arg} ימים בלי קשר` : r.trigger === 'stage' ? `ליד עובר ל"${stageById(r.arg).name}"` : r.trigger === 'captured' ? 'ליד נרשם בדוכן' : 'נסגרה עסקה';
    const c = r.cond || {};
    const conds = [c.warm != null ? words()[c.warm] : '', c.btn && btnById(c.btn) ? 'סימן "' + btnById(c.btn).label + '"' : '', c.biz === true ? 'עסק' : c.biz === false ? 'פרטי' : ''].filter(Boolean);
    const days = inDays;
    const then = a.kind === 'step' ? `${(STEPS[a.type] || STEPS.call).name} ${days(a.days || 1)}` : a.kind === 'message' ? (tplById(a.tpl) ? 'לשלוח "' + tplById(a.tpl).name + '"' : 'לשלוח את ברירת המחדל של הערוץ') : a.kind === 'stage' ? 'להעביר ל"' + stageById(a.stage).name + '"' : a.kind === 'warm' ? 'לסמן ' + words()[a.value || 0] : 'להוסיף להודעת הבוקר';
    return { when: 'כש' + when + (conds.length ? ' · רק אם: ' + conds.join(', ') : ''), then };
  }
  function condOk(r, l) {
    const c = r.cond || {};
    if (c.warm != null && effWarm(l) !== c.warm) return false;
    if (c.btn && !l.tags.includes(c.btn)) return false;
    if (c.biz != null && (l.b != null) !== c.biz) return false;

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
    // M3: a rule does not add a step of a kind already open for him — the buttons' steps come first.
    if (a.kind === 'step' && tasks(l).some((t) => t.type === a.type)) return;
    r.fired = (r.fired || 0) + 1;
    l.ruleHits = l.ruleHits || {};
    l.ruleHits[r.id] = (l.ruleHits[r.id] || 0) + 1;
    byRule = true;
    if (!sendsOut(r)) log(l, '⚙️ לבד: ' + ruleText(r).then);
    if (a.kind === 'step') { const s = normStep({ type: a.type, days: a.days || 1 }); addManual(l, s, dueFor(s)); }
    else if (a.kind === 'message') sendPackage(l, a.tpl, { quiet: true, auto: true });   // M6: goes out with the opt-out line
    else if (a.kind === 'stage') setStage(l, a.stage, 'לבד');
    else if (a.kind === 'warm') { l.warmth = a.value || 0; l.warmBy = 'hand'; }
    else if (a.kind === 'notify') S.biz.digestNotes.push({ at: now(), text: People.rowName(l) + ' — ' + ruleText(r).when.replace(/^כש/, '') });
    byRule = false;
  }
  /** "N days without contact" counts from the last real contact or attempt, and is checked whenever the CRM opens, once per quiet spell. */
  function runIdle() {
    const rules = (S.biz.rules || []).filter((r) => r.on && r.trigger === 'idle');
    if (!rules.length) return;
    leadsNow().filter((l) => isOpenLead(l) && !ended(l)).forEach((l) => {
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
  // The morning message: WhatsApp or mail. SMS does not reach a kosher phone (יצחק, 16/10).
  const DIGEST_CH = ['wa', 'email'];
  const OPT_OUT = 'להסרה מרשימת התפוצה השיבו "הסר".';
  /** A template filled in for one lead. Messages to a group carry the opt-out line the law asks for. */
  const fillFor = (t, l, toGroup) => t.text.replace(/\{שם\}/g, People.rowName(l)).replace(/\{עסק\}/g, S.biz.name || 'העסק').replace(/\{(קובץ|חומר)\}/g, t.mat || 'הקובץ') + (toGroup ? '\n' + OPT_OUT : '');
  const sendTemplate = (l, tid, quiet, toGroup) => sendPackage(l, tid, { quiet, toGroup });

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
  function openTasks(L) {
    // By day; within a day the more important first (●●●), then the warmer.
    const day = (l) => { const p = plan(l); return p.due ? dayNo(p.due.getTime()) : 9e9; };
    const w = (l) => (effWarm(l) == null ? 3 : effWarm(l));
    return L.filter((l) => tasks(l).length && plan(l).type !== 'season')
      .sort((a, b) => day(a) - day(b) || importance(b) - importance(a) || w(a) - w(b));
  }
  function barChart(rows, fmt) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return `<div class="bars">${rows.map((r) => `<div class="bar-row${r.thin ? ' thin' : ''}" title="${esc(r.label)}: ${esc((fmt || String)(r.value))}">
      <span class="bl">${esc(r.label)}</span><span class="bt"><span class="bf${r.cls ? ' ' + r.cls : ''}" style="width:${(r.value / max * 100).toFixed(1)}%"></span></span><span class="bv">${esc((fmt || String)(r.value))}${r.sub ? ' <span class="faint">' + esc(r.sub) + '</span>' : ''}</span></div>`).join('')}</div>`;
  }
  const CRM_NAME = 'CRM';
  /* 17/10 (יצחק): a real CRM's shape — a menu on the side with every place in it, the way every system his
   * customers know looks: home, leads, tasks, dashboard, messages; then the rules, the assistant and the settings. */
  const CRM_TABS = [['overview', 'דף הבית', 'home'], ['leads', 'לידים', 'meet'], ['tasks', 'משימות', 'check'], ['segments', 'דשבורד', 'bars'], ['messages', 'הודעות', 'mail']];
  const CRM_VIEWS = { leads: [['table', 'טבלה'], ['pipeline', 'לפי שלב']], tasks: [['list', 'רשימה'], ['time', 'לפי זמן']] };
  // Each view's ⚙️ goes straight to the settings of what it shows.
  const VIEW_SETTINGS = { overview: ['digest', 'הודעת הבוקר'], tasks: ['buttons', 'הכפתורים והמשימות'], time: ['buttons', 'הכפתורים והמשימות'], pipeline: ['crm', 'השלבים'], table: ['cols', 'העמודות'], segments: ['buttons', 'הכפתורים'], messages: ['materials', 'ההודעות'] };
  /** The old tabs, still set by links across the code, land in their new place. */
  function crmPlace() {
    if (!S.crmView) S.crmView = { leads: 'table', tasks: 'list' };
    const old = { table: ['leads', 'table'], pipeline: ['leads', 'pipeline'], auto: ['overview'] }[S.crmTab];
    if (old) { S.crmTab = old[0]; if (old[1]) S.crmView.leads = old[1]; }
    if (S.crmView.leads === 'messages') { S.crmView.leads = 'table'; S.crmTab = 'messages'; }
    if (!CRM_TABS.some(([k]) => k === S.crmTab)) S.crmTab = 'overview';
  }
  const viewKey = () => (S.crmTab === 'leads' ? S.crmView.leads : S.crmTab === 'tasks' && S.crmView.tasks === 'time' ? 'time' : S.crmTab);
  /** A computer has the width for the list and the lead side by side; a tablet keeps the lead as its own page. */
  const wideCRM = () => contentW() >= 1060;
  /** M10: "days without contact" is checked once a day — when the tracking view opens or the day changes — not inside drawing the screen. */
  function idleOnce() {
    const today = dayNo(now());
    if (S.idleDay === today) return;
    S.idleDay = today;
    runIdle();
    save();
  }
  /** The CRM's leads: everyone recorded, but not those kept for the mailing list only — they are not leads. */
  const crmLeads = () => leadsNow().filter((l) => !l.listOnly);
  function viewCRM(m) {
    const L = crmLeads();
    crmPlace();
    const rec = S.crmLead && leadById(S.crmLead);
    const side = rec && wideCRM();   // on a computer the lead opens beside the list, and the list stays where it was
    const full = rec && !side;
    const vs = VIEW_SETTINGS[viewKey()];
    const views = CRM_VIEWS[S.crmTab];
    // The CRM's own side menu moved into the shell's menu (20/10): one menu for the whole system.
    m.innerHTML = `<div class="crm-shell">
      <div class="crm-main">
        <div class="crm-head">${full || S.crmTab === 'overview' ? '' : `<div class="crm-title">${eyebrow('CRM')}<h1>${esc((CRM_TABS.find(([k]) => k === S.crmTab) || ['', CRM_NAME])[1])}</h1></div>`}
          ${!full && views ? `<nav class="tabs" aria-label="איך להציג">${views.map(([k, t]) => `<button class="tab" data-crmview="${k}" aria-pressed="${S.crmView[S.crmTab] === k}">${t}</button>`).join('')}</nav>` : ''}
          ${!full && S.crmTab === 'leads' ? `<button class="btn" data-crmtab="messages">💬 הודעה לקבוצה</button><button class="btn" data-act="new-person">＋ ליד</button>` : ''}
          <span class="date-now">${S.crmTab === 'overview' && !full ? '' : `היום: ${esc(shortDay(new Date(now())))}`}
            ${!full && vs ? `<button class="btn ghost" data-act="view-settings" title="הגדרות: ${esc(vs[1])}" aria-label="הגדרות: ${esc(vs[1])}">⚙️</button>` : ''}</span></div>
        ${!full && practice() && !worker() && L.length < 8 ? `<div class="ask-card" style="margin-top:12px"><div class="q">רוצה לראות איך זה נראה? 20 לידים לדוגמה, כאילו עברו שבועיים.</div>
          <div class="actions"><button class="btn primary" data-act="seed-progress">להוסיף דוגמה</button></div></div>` : ''}
        ${!full && practice() && !worker() && L.some((l) => l.demo) ? `<p class="faint demo-note">יש כאן ${L.filter((l) => l.demo).length} לידים לדוגמה. <button class="link" data-act="seed-remove">להסיר אותם</button></p>` : ''}
        <div class="${side ? 'crm-split' : ''}"><div id="crm-body"></div>${side ? '<aside class="crm-side" id="crm-side" aria-label="הליד"></aside>' : ''}</div>
      </div></div>`;
    if (full) return recordPage($('#crm-body'), rec);
    const body = $('#crm-body');
    if (S.crmTab === 'leads') ({ table: crmTable, pipeline: crmPipeline }[S.crmView.leads] || crmTable)(body, L);
    else if (S.crmTab === 'tasks') (S.crmView.tasks === 'time' ? crmTimeBoard : crmTasks)(body, L);
    else ({ overview: crmOverview, segments: crmSegments, messages: crmMessages }[S.crmTab] || crmOverview)(body, L);
    if (side) {
      recordPage($('#crm-side'), rec);
      document.querySelectorAll(`[data-crmlead="${rec.id}"], [data-plid="${rec.id}"]`).forEach((n) => n.classList.add('sel'));
    }
  }

  // ---- contact, as the screens say it ----
  function lastTouch(l) {
    const t = touched(l);
    const e = t[t.length - 1];
    return e ? { at: e.at, kind: isTalk(e.t) ? 'דיברנו' : 'קיבל הודעה' } : null;
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
    // W28: "פעמיים", not "×2" — and the contact said as one phrase, "דיברנו לפני 3 ימים" (M33).
    const times = (n) => (n === 2 ? ' פעמיים' : n > 2 ? ' ' + n + ' פעמים' : '');
    if (lt) return lt.kind + ' ' + agoText(lt.at) + (tr.length && tr[tr.length - 1].at > lt.at ? ` · אחר כך לא ענה${times(tr.length)}` : '');
    if (tr.length) return `לא ענה${times(tr.length)} · ${agoText(tr[tr.length - 1].at)}`;
    return 'עוד לא היה קשר';
  }

  // ---- ask the data, in plain words ----
  let ASK = null;   // { q, busy, answer, ids }
  /* Principle 9 (יצחק, 16/10): the grey example inside a field speaks his trade, not someone else's —
   * taken from his own buttons, so a carpenter reads about kitchens and a caterer about events. */
  const sampleWhat = () => (S.biz.buttons.find((b) => b.axis === 'what') || {}).label || '';
  const exampleAsk = () => (sampleWhat() ? `✨ שאלה, למשל: כמה התעניינו ב${sampleWhat()} ועוד לא היה איתם קשר?` : '✨ שאלה, למשל: כמה עוד לא היה איתם קשר?');
  const exampleNote = () => (sampleWhat() ? `למשל: רוצה הצעה ל${sampleWhat()}, לחזור אחרי החגים` : 'למשל: רוצה הצעת מחיר, לחזור אחרי החגים');
  function askBox() {
    if (!ai) return '';   // M70: no note about where the AI works — without it, the box is simply not there
    return `<form class="askbox" data-askform><input id="ask-q" class="text-input" placeholder="${esc(exampleAsk())}" aria-label="שאלה על הנתונים" value="${esc(ASK ? ASK.q : '')}" autocomplete="off">
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
    const facts = L.slice(-100).map((l) => ({ id: l.id, town: People.town(l), business: l.b != null, stage: stageById(l.stage).name, warmth: effWarm(l) == null ? null : words()[effWarm(l)],
      contact: ANSWER[answerState(l)], tags: tagged(l).map((b) => b.label), next: tasks(l).length ? plan(l).label : null }));

    const count = (f) => { const o = {}; L.forEach((l) => { const k = f(l); o[k] = (o[k] || 0) + 1; }); return o; };
    const prompt = `Question from a business owner about his leads (answer in Hebrew): """${q.slice(0, 300)}"""
Answer from the data below only. Count exactly; never guess. If the data cannot answer, say so plainly.
Leads are given by number only, without names. Never write a lead number in the answer — put them in leadIds, and the screen shows their names.
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

  // ---- סקירה: הבא בתור ----
  /* The system knows who is late, who matters (●●●), who is warm and what the note asked for —
   * so the owner is not asked to choose an order. One lead, its action, and the next one comes.
   * The queue is the head of the tasks list, in the same order, so the two never disagree.
   * A lead waiting for a decision is a task like any other, and joins the end of it. */
  let qSkip = [];
  let qSkipDay = null;
  function todayQueue(L) {
    if (qSkipDay !== dayNo(now())) { qSkip = []; qSkipDay = dayNo(now()); }   // N17: "later" lasts the day, not past it
    const real = L;
    const t0 = dayNo(now());
    const due = openTasks(real).filter((l) => plan(l).due && dayNo(plan(l).due.getTime()) <= t0);
    const decide = real.filter(undecided);
    const q = due.concat(decide);
    return q.filter((l) => !qSkip.includes(l.id)).concat(qSkip.map(leadById).filter((l) => l && q.includes(l)));
  }
  // יצחק, 13/10: two levels in words — "חשוב" and "חשוב מאוד"; "רגיל" and "טוב" carry no mark.
  const dots = (l) => (importance(l) ? '<span class="imp-tag">⭐ חשוב</span>' : '');
  /* What to do with the first step, in one place for the next-in-line card and the lead's page (UX review R-1, L-2):
   * the buttons follow the step — a meeting to arrange asks "arranged — when?", a quote asks "sent", a call asks how it went.
   * The final decisions sit under "עוד…", away from the everyday tap (R-3). `noPhone`: the page shows the phone itself. */
  function stepActs(l, noPhone) {
    const p = plan(l);
    const decide = !tasks(l).length;
    const phoneish = ['call', 'meet', 'date', 'season'].includes(p.type);
    const b = (cls, attrs, text) => `<button class="btn${cls ? ' ' + cls : ''}" ${attrs} data-lid="${l.id}">${text}</button>`;
    // Yitzhak, 13/10: the final decisions stay in sight, and a tap asks "sure?" before it happens — not hidden behind "more".
    const more = `<div class="actions">${b('', 'data-final="won" data-stay="1"', '🎉 נסגרה עסקה')}${b('', 'data-final="lost" data-stay="1"', 'לא נסגרה')}${b('ghost', 'data-act="tasks"', 'לשנות את המשימה')}</div>`;
    // No phone, nothing to call: adding it is the action (R-2).
    const phone = !phoneish || noPhone ? '' : l.contact.phone
      ? `<div class="nc-phone"><bdi dir="ltr">${esc(l.contact.phone)}</bdi>${b('ghost', 'data-act="copy-phone"', 'להעתיק')}</div>`
      : `<div class="nc-nophone"><label class="label" for="ncp-${l.id}">אין לו טלפון. יש לך?</label>
          <div class="add-row"><input id="ncp-${l.id}" class="text-input ltr" type="tel" data-lf="phone" data-lid="${l.id}" placeholder="050-0000000" autocomplete="off">${b('primary', 'data-act="phone-saved"', 'לשמור')}</div></div>`;
    const pri = phoneish && !noPhone && !l.contact.phone ? '' : 'primary';   // without a phone the field is what stands out
    let acts;
    if (decide) acts = `<p class="muted" style="margin:0">אין לו משימה. מה עושים איתו?</p><div class="actions">${b('primary', 'data-act="tasks"', '+ משימה')}${b('', 'data-act="cold-aud"', NOFOLLOW)}</div>`;
    else if (p.type === 'meet' && p.phase !== 'held') acts = `${phone}<div class="actions">${b(pri, `data-taskdone="${esc(p.key)}"`, '✓ תואם — מתי?')}${b('', 'data-rowout="noans"', 'לא ענה')}${b('', 'data-rowout="talk"', 'דיברנו, עוד לא תואם')}</div>${more}`;
    else if (p.type === 'meet') acts = `${phone}<div class="actions">${b('primary', `data-taskdone="${esc(p.key)}"`, '✓ הפגישה התקיימה')}${b('', 'data-act="tasks"', 'נדחתה — לקבוע מחדש')}</div>${more}`;
    else if (p.type === 'quote') acts = `<div class="actions">${b('primary', `data-taskdone="${esc(p.key)}"`, '✓ ההצעה נשלחה')}${b('', 'data-act="lead-msg"', 'לשלוח לו הודעה')}</div>${more}`;
    else if (p.type === 'send' || p.type === 'register') acts = `<div class="actions">${b('primary', `data-tasksend="${esc(p.key)}"`, 'לשלוח עכשיו')}${b('', `data-taskdone="${esc(p.key)}"`, '✓ כבר נשלח')}</div>${more}`;
    else acts = `${phone}<div class="actions">${b(pri, 'data-rowout="talk"', 'דיברנו — מה הלאה')}${b('', 'data-rowout="noans"', 'לא ענה')}</div>${more}`;
    return acts;
  }
  function nextCard(l) {
    const p = plan(l);
    const w = effWarm(l);

    const note = lastNote(l);
    const lateBy = p.due ? dayNo(now()) - dayNo(p.due.getTime()) : 0;
    const decide = !tasks(l).length;
    const acts = stepActs(l);
    return `<section class="next-card">
      <div class="nc-who"><h2>${esc(People.rowName(l))}</h2>${l.b != null ? '<span class="badge biz">עסק</span>' : ''}${dots(l)}
        <span class="muted">${esc([People.town(l), w != null ? words()[w] : '', stageById(l.stage).name].filter(Boolean).join(' · '))}</span></div>
      <div class="nc-now"><span class="faint">עכשיו</span> ${decide ? '<b>להחליט מה איתו</b>' : planHTML(p, true)}${lateBy > 0 ? ` <span class="late-tag">באיחור ${lateBy === 1 ? 'יום' : lateBy + ' ימים'}</span>` : ''}</div>
      ${note ? `<div class="note-peek nc-note">📝 ${esc(note.slice(0, 220))}</div>` : ''}
      <div class="nc-meta">${esc([contactLine(l)].concat(tagged(l).map((x) => x.label), l.roleOf ? [l.roleOf] : []).join(' · '))}</div>
      ${acts}
      <div class="nc-foot"><button class="btn ghost" data-crmlead="${l.id}">כל הפרטים ←</button><button class="btn ghost" data-act="q-skip" data-lid="${l.id}">אחר כך</button></div>
    </section>`;
  }
  /* The home page (יצחק, 17/10): a greeting and the Hebrew date; what waits, as numbers that open their list;
   * a few quick actions; the next in line. The cards that introduce the CRM's parts show only at the start —
   * in the demo and in the first week — and then make room. No "יישר כח": an empty day is said plainly. */
  function crmOverview(box, L) {
    const q = todayQueue(L);
    const t0 = dayNo(now());
    const late = q.filter((l) => plan(l).due && dayNo(plan(l).due.getTime()) < t0).length;
    const decide = q.filter((l) => !tasks(l).length).length;
    const week = openTasks(L).filter((l) => { const p = plan(l); const dd = p.due ? dayNo(p.due.getTime()) - t0 : -1; return dd > 0 && dd <= 7; }).length;
    const hr = new Date().getHours();
    const hello = hr < 12 ? 'בוקר טוב' : hr < 17 ? 'צהריים טובים' : 'ערב טוב';
    const first = (S.account.name || '').split(' ')[0];
    const start = L.length ? Math.min(...L.map((l) => l.at)) : now();
    const firstWeek = practice() || now() - start < 8 * H.DAY;
    const num = (n, t, act, cls) => `<button class="wait${cls && n ? ' ' + cls : ''}" data-act="${act}" ${n ? '' : 'disabled'}><span class="n">${n}</span><span class="t">${esc(t)}</span></button>`;
    const nd = nextDayLine(L);
    const mod = (icon, t, d, tab) => `<button class="mod" data-crmtab="${tab}">${ic(icon)}<b>${t}</b><span>${d}</span></button>`;
    box.innerHTML = `
      <div class="home-head"><div class="home-hello">${eyebrow('CRM')}<h1>${hello}${first ? ', ר׳ ' + esc(first) : ''} ${help('home')}</h1><p class="muted">${esc(H.label(new Date(now())))} <span class="faint">(${esc(dateShort(now()))})</span></p></div>
        <div class="quick">${worker() || !deskMode() ? '' : '<button class="btn primary" data-act="new-person">＋ ליד חדש</button>'}<button class="btn" data-crmtab="messages">💬 הודעה לקבוצה</button>${worker() ? '' : '<button class="btn ghost" data-act="tb-export-ask">⬇ להוריד לאקסל</button>'}</div></div>
      <div class="wait-strip">${num(q.length, 'להיום', 'go-today')}${num(late, 'באיחור', 'go-today', 'bad')}${num(decide, decide === 1 ? 'מחכה להחלטה' : 'מחכים להחלטה', 'go-decide')}${num(week, 'השבוע', 'go-week')}</div>
      <div class="ov-grid">
        <div><div class="group-head"><span>הבא בתור</span></div>
          ${q.length ? nextCard(q[0]) : `<section class="next-card done"><p>אין משימות להיום.${nd === 'אין משימות.' ? '' : ' הבאות — ' + nd}</p><p><button class="link" data-crmtab="tasks">לכל המשימות ←</button></p></section>`}</div>
        <aside class="ov-side">
          <div class="group-head"><span>אחריו בתור</span></div>
          ${q.length > 1 ? `<div class="q-list">${q.slice(1, 9).map((l) => `<button class="q-item" data-crmlead="${l.id}"><b>${esc(People.rowName(l))}</b>${dots(l)}<span class="faint">${tasks(l).length ? planHTML(plan(l), true) : 'להחליט מה איתו'}</span></button>`).join('')}
            ${q.length > 9 ? `<button class="link" data-act="go-today">ועוד ${q.length - 9} — לכל הרשימה ←</button>` : `<button class="link" data-act="go-today">לכל רשימת היום ←</button>`}</div>` : '<p class="faint" style="padding:0 16px">אין עוד אף אחד היום.</p>'}
        </aside>
      </div>
      ${firstWeek ? `<section class="modules"><div class="group-head"><span>הכירו את ה-CRM</span><span class="faint">מופיע רק בהתחלה</span></div>
        <div class="mod-grid">${mod('meet', 'לידים', 'כל מי שביקר בדוכן: בטבלה, או לפי שלב.', 'leads')}${mod('check', 'משימות', 'מה לעשות היום, השבוע, ואחר כך.', 'tasks')}${mod('bars', 'דשבורד', 'המספרים: איפה כולם עומדים, ומה עבד.', 'segments')}${mod('mail', 'הודעות', 'הודעה לקבוצה, ומה כבר נשלח.', 'messages')}</div></section>` : ''}
      ${insightsBox('crm', 'מה כדאי לעשות')}`;   // N12: proposals to act on belong where the day's work is, not with the numbers
  }
  // ---- משימות לפי זמן: a board whose columns are days, not stages ----
  function crmTimeBoard(box, L) {
    const real = L;
    const t0 = dayNo(now());
    const cols = [['late', 'באיחור'], ['d0', 'היום'], ['d1', 'מחר'], ['week', 'השבוע'], ['later', 'בהמשך'], ['decide', 'מחכים להחלטה']];
    const by = Object.fromEntries(cols.map(([k]) => [k, []]));
    openTasks(real).forEach((l) => {
      const p = plan(l);
      const d = p.due ? dayNo(p.due.getTime()) - t0 : 99;
      by[d < 0 ? 'late' : d === 0 ? 'd0' : d === 1 ? 'd1' : d <= 7 ? 'week' : 'later'].push(l);
    });
    by.decide = real.filter(undecided);
    const card = (l) => `<button class="pcard tcard" data-crmlead="${l.id}"><span class="pname"><span class="dot w${effWarm(l) == null ? '' : effWarm(l)}"></span>${esc(People.rowName(l))}${dots(l)}</span>
      <span class="faint">${tasks(l).length ? planHTML(plan(l), true) : 'להחליט מה איתו'}</span>${lastNote(l) ? `<span class="note-peek">📝 ${esc(lastNote(l).slice(0, 60))}</span>` : ''}</button>`;
    box.innerHTML = `<div class="pipe time-board">${cols.map(([k, t]) => `<section class="pcol${k === 'late' ? ' late' : ''}"><header><b>${t}</b><span class="faint">${by[k].length}</span></header>
      <div class="pcards">${by[k].slice(0, 30).map(card).join('') || '<div class="faint" style="padding:8px">—</div>'}${by[k].length > 30 ? `<div class="faint">ועוד ${by[k].length - 30}</div>` : ''}</div></section>`).join('')}</div>`;
  }

  // ---- פילוחים: the numbers, the AI and asking the data — what the overview used to carry ----
  function crmStats(box, L) {
    const real = L;
    const open = real.filter(isOpenLead);
    const won = real.filter((l) => l.won);
    const t0 = dayNo(now());
    // N13: "for today" is one number everywhere — the overview's queue: steps due or late, and the leads waiting for a decision.
    const dueToday = todayQueue(L);
    const late = dueToday.filter((l) => plan(l).due && dayNo(plan(l).due.getTime()) < t0).length;
    const hot = real.filter((l) => effWarm(l) === 0);
    const fast = hot.filter((l) => touched(l).some((e) => e.at - l.at <= 2 * H.DAY));
    const first = real.length ? Math.min(...real.map((l) => l.at)) : now();
    const day = dayNo(now()) - dayNo(first) + 1;   // the fair itself is day 1
    const st = { talked: 0, sent: 0, tried: 0, none: 0 };
    real.forEach((l) => { st[answerState(l)]++; });

    const kpi = (n, t, sub, cls, act) => `<${act ? `button data-act="${act}"` : 'div'} class="kpi${cls ? ' ' + cls : ''}"><span class="n">${n}</span><span class="t">${esc(t)}</span>${sub ? `<span class="s">${esc(sub)}</span>` : ''}</${act ? 'button' : 'div'}>`;
    const stages = S.biz.stages.map((s) => ({ label: s.name, value: real.filter((l) => l.stage === s.id).length, cls: s.kind === 'won' ? 'good' : s.kind === 'lost' ? 'muted' : '' }));
    const btnRows = S.biz.buttons.map((b) => { const ls = real.filter((l) => l.tags.includes(b.id)); return { label: b.label, value: ls.length, sub: ls.filter((l) => l.won).length ? ls.filter((l) => l.won).length + ' נסגרו' : '' }; }).filter((r) => r.value).sort((a, b) => b.value - a.value).slice(0, 8);
    const firstName = (S.account.name || '').split(' ')[0];
    const todayNames = dueToday.slice(0, 3).map((l) => People.rowName(l) + ' — ' + plan(l).label);
    const notes = S.biz.digestNotes.slice(-3);
    box.innerHTML = `
      <div class="kpis">
        ${kpi(dueToday.length, 'לטיפול היום', late ? (late === 1 ? 'אחד באיחור' : late + ' באיחור') : 'לפתוח את הרשימה ←', late ? 'bad' : '', 'go-today')}
        ${kpi(hot.length ? fast.length + '/' + hot.length : '—', `חזרו תוך יומיים ל"${words()[0]}"`, hot.length ? 'זה מה שהכי משפיע על סגירת עסקה' : '')}
        ${kpi(won.length, 'עסקאות שנסגרו', '', 'good')}
      </div>
      ${dueToday.length ? `<div class="actions"><button class="btn primary big" data-act="go-today">להתחיל: ${dueToday.length} לטיפול ←</button></div>` : ''}
      <section class="card" style="margin-top:14px"><h2>14 הימים שאחרי התערוכה</h2>
        <div class="days14" aria-label="יום ${Math.min(day, 14)} מתוך 14">${Array.from({ length: 14 }, (_, i) => `<span class="${i < day - 1 ? 'past' : i === day - 1 ? 'now' : ''}"></span>`).join('')}</div>
        <p style="margin:8px 0 0">${day > 14 ? 'עברו 14 הימים.' : `יום ${day} מתוך 14.`} מתוך ${real.length} לידים:
          עם <b>${st.talked}</b> דיברנו, <b>${st.sent}</b> קיבלו הודעה, <b>${st.tried}</b> ${st.tried === 1 ? 'לא ענה' : 'לא ענו'}, ועם <b>${st.none}</b> עוד לא היה קשר.
          נסגרו <b>${won.length}</b> עסקאות.</p>
        ${st.none + st.tried ? `<div class="actions"><button class="btn" data-act="view-noanswer">לראות את ${st.none + st.tried} שעוד לא היה איתם קשר</button></div>` : ''}</section>
      <div class="two-col">
        <section class="card"><h2>איפה כולם עומדים</h2>${barChart(stages)}</section>
        <section class="card"><h2>מה סומן הכי הרבה</h2>${btnRows.length ? barChart(btnRows) : '<div class="empty">עוד אין סימונים.</div>'}</section>
      </div>
      <section class="card digest-card" style="margin-top:14px"><h2>הודעת הבוקר שלך</h2>
        ${S.biz.digest.on ? `<div class="bubble"><b>בוקר טוב${firstName ? ' ר׳ ' + esc(firstName) : ''}!</b><br>היום, ${esc(shortDay(new Date(now())))}:<br>
          ${dueToday.length ? `📞 ${dueToday.length} לטיפול${late ? `, מהם ${late} באיחור` : ''}<br>${todayNames.map((t) => '• ' + esc(t)).join('<br>')}${dueToday.length > 3 ? '<br>• ועוד ' + (dueToday.length - 3) : ''}` : '✓ אין משימות להיום.'}<br>
          ${notes.length ? notes.map((n) => '🔔 ' + esc(n.text)).join('<br>') + '<br>' : ''}${won.length ? '🎉 מהאקספו: ' + many(won.length, 'עסקה אחת', 'עסקאות') : ''}</div>
          <p class="faint">נשלח אליך כל בוקר ב-${esc(S.biz.digest.hour)} ב${esc(CH_NAMES[S.biz.digest.ch] || 'וואטסאפ')}. <button class="link" data-act="crm-settings">שינוי</button></p>`
          : '<p class="muted">כבוי. <button class="link" data-act="crm-settings">להפעיל</button></p>'}</section>
      `;
  }

  // ---- משימות ----
  function crmTasks(box, L0) {
    const L = L0;
    const t0 = dayNo(now());
    const due = (l) => { const p = plan(l); return p.due ? dayNo(p.due.getTime()) - t0 : null; };
    const groups = {
      today: todayQueue(L),   // N13: the same list as the overview's queue, in the same order
      week: openTasks(L).filter((l) => due(l) > 0 && due(l) <= 7),
      all: openTasks(L),
      season: L.filter((l) => plan(l).type === 'season'),
      // M5: a lead with no step and no decision is not "audience" — it waits for the owner, in a tab of its own.
      decide: L.filter(undecided),
      audience: L.filter((l) => !l.won && ended(l)),
      won: L.filter((l) => l.won),
    };
    const f = crmFilter || (groups.today.length ? 'today' : 'all');
    const q = People.norm(crmQuery);
    const hay = (l) => People.norm(People.rowName(l) + ' ' + People.town(l) + ' ' + tagged(l).map((b) => b.label).join(' ') + ' ' + l.roleOf + ' ' + l.notes.map((n) => (n.text || '') + ' ' + (n.tr || '')).join(' '));   // N15: a transcribed recording is searched too
    const list = q ? L0.filter((l) => hay(l).includes(q)) : groups[f];
    const tab = (k, t, minor) => (minor && !groups[k].length ? '' : `<button class="tab${minor ? ' minor' : ''}" data-filter="${k}" aria-pressed="${!q && f === k}">${t} <span class="n">${groups[k].length}</span></button>`);
    let body;
    if (!list.length) body = `<div class="empty">${q ? 'לא נמצא.' : 'אין כאן אף אחד.'}</div>`;
    else if (!q && f === 'decide') body = coldList(list);   // the same three choices as on the dashboard: audience · not relevant · a step
    else body = crmRows(list, !q && f !== 'audience' && f !== 'won', true);
    box.innerHTML = `<div class="tasks-bar"><nav class="tabs" aria-label="סינון">${tab('today', 'היום')}${tab('week', 'השבוע')}${tab('all', 'הכל')}</nav>
        </div>
      <div class="more-tabs">${tab('decide', 'מחכים להחלטה', true)}${tab('season', 'לפני העונה', true)}${tab('audience', 'לא נסגרו ובלי מעקב', true)}${tab('won', 'עסקאות', true)}</div>
      <input id="crm-q" class="text-input" placeholder="חיפוש: שם, עיר, הערה…" aria-label="חיפוש בלידים" value="${esc(crmQuery)}" autocomplete="off">
      ${q ? `<div class="faint" style="margin-top:6px">מחפש בכל הלידים · <button class="link" data-act="crm-clear">ניקוי</button></div>` : ''}
      <div style="margin-top:10px">${body}</div>`;
    $('#crm-q').addEventListener('input', (e) => { crmQuery = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#crm-q'); n.focus(); n.setSelectionRange(pos, pos); });
  }
  /* The list is grouped by the day its next step falls on. Before, the date was
   * printed on every row — twelve rows in a column all reading
   * "לחזור אליו · יום ראשון, ל' בתשרי (11/10)". A date repeated twelve times is
   * not information, it is noise standing where information should be. It
   * belongs to the heading above the group; the row keeps only what differs
   * between one person and the next. */
  function dueGroup(l) {
    const p = plan(l);
    if (!p.due && undecided(l)) return { k: 'decide', label: 'מחכים להחלטה', ord: 9e8 };
    if (!p.due) return { k: 'none', label: 'בלי תאריך', ord: 9e9 };
    const d = dayNo(p.due.getTime()) - dayNo(now());
    if (d < 0) return { k: 'late', label: 'באיחור', ord: -1 };
    if (d === 0) return { k: 'd0', label: 'היום', ord: 0 };
    if (d === 1) return { k: 'd1', label: 'מחר', ord: 1 };
    return { k: 'd' + d, label: shortDay(p.due), ord: d };
  }
  /** One lead: who and what is next on the first line, why underneath. With `withCall`, a 📞 beside it records the call in place. */
  /** The newest note, written or transcribed — what he asked to be reminded of comes back with the lead (יצחק, 09/10). */
  const lastNote = (l) => { const n = l.notes[l.notes.length - 1]; return n ? n.text || n.tr || (n.audio ? 'הקלטה' : '') : ''; };
  function crmRow(l, bare, withCall) {
    const p = plan(l);
    const w = effWarm(l);
    const more = tasks(l).length - 1;
    // Two facts under the name — what he wanted and when we last spoke — and "hot" when he is (UX review: seven were noise).
    // The rest is one tap away, on the lead's page.
    const why = (w === 0 ? [words()[0]] : []).concat(tagged(l).filter((b) => b.axis !== 'who').map((b) => b.label).slice(0, 2), [contactLine(l)]).join(' · ');
    const row = `<button class="row" data-crmlead="${l.id}"><span><span class="nm">${esc(People.rowName(l))}</span>${l.b != null ? '<span class="badge biz">עסק</span>' : ''}${dots(l)} <span class="muted">${esc(People.town(l))}</span>${l.demo ? ' <span class="faint">· לדוגמה</span>' : ''}</span>
      <span class="due">${planHTML(p, bare)}${more > 0 ? ` <span class="faint">· ועוד ${more}</span>` : ''}</span><span class="why">${esc(why)}</span>${lastNote(l) ? `<span class="note-peek">📝 ${esc(lastNote(l).slice(0, 100))}</span>` : ''}</button>`;
    if (!withCall || !isOpenLead(l)) return row;
    return `<div class="row-wrap${rowOpen === l.id ? ' open' : ''}">${row}<button class="row-call" data-rowcall="${l.id}" aria-label="להתקשר ל${esc(People.rowName(l))}" aria-expanded="${rowOpen === l.id}">📞</button>
      ${rowOpen === l.id ? `<div class="row-out"><span class="faint">${l.contact.phone ? `<bdi dir="ltr">${esc(l.contact.phone)}</bdi> · ` : ''}איך היה?</span>
        <button class="chip" data-rowout="talk" data-lid="${l.id}">דיברנו — מה הלאה</button><button class="chip" data-rowout="noans" data-lid="${l.id}">לא ענה</button>
        <button class="chip" data-final="won" data-stay="1" data-lid="${l.id}">🎉 נסגרה עסקה</button><button class="chip" data-final="lost" data-stay="1" data-lid="${l.id}">לא נסגרה</button></div>` : ''}</div>`;
  }
  function crmRows(list, grouped, withCall) {
    if (!list.length) return '';
    if (!grouped) return `<div class="rows">${list.map((l) => crmRow(l, false, withCall)).join('')}</div>`;
    const order = [];
    const by = {};
    list.forEach((l) => {
      const g = dueGroup(l);
      if (!by[g.k]) { by[g.k] = { g, items: [] }; order.push(by[g.k]); }
      by[g.k].items.push(l);
    });
    order.sort((a, b) => a.g.ord - b.g.ord);
    return order.map((b) => `<section class="group">
      <div class="group-head${b.g.k === 'late' ? ' late' : ''}"><span>${esc(b.g.label)}</span><span class="c">${b.items.length}</span></div>
      <div class="rows">${b.items.map((l) => crmRow(l, true, withCall)).join('')}</div></section>`).join('');
  }

  // ---- צינור ----
  function crmPipeline(box, L) {
    const work = S.biz.stages.filter((s) => s.kind !== 'lost');
    const lost = stageOf('lost');
    const card = (l) => { const w = effWarm(l); const p = plan(l); const late = p.due && dayNo(p.due.getTime()) < dayNo(now()); return `<div class="pcard" draggable="true" data-plid="${l.id}">
      <button class="pname" data-crmlead="${l.id}">${esc(People.rowName(l))}</button>
      <div class="faint">${w == null ? 'לא סומן' : `<b class="warm-word w${w}">${esc(words()[w])}</b>`} · ${esc(People.town(l))}</div>
      ${p.due ? `<div class="pnext${late ? ' late' : ''}">${late ? 'באיחור · ' : ''}${STEPS[p.type].icon} ${esc(p.label)} · ${esc(dateShort(p.due.getTime()))}</div>` : ''}
      <button class="pmove" data-pmove="${l.id}" aria-label="להעביר את ${esc(People.rowName(l))} לשלב אחר">⇄</button></div>`; };
    const byDue = (a, b) => ((plan(a).due || { getTime: () => 9e15 }).getTime() - (plan(b).due || { getTime: () => 9e15 }).getTime());
    box.innerHTML = `<p class="muted"><span class="fine-only">גוררים כרטיס לשלב אחר, או </span>נוגעים ב-⇄ כדי להעביר. נגיעה בשם פותחת את כל הפרטים.</p>
      <div class="pipe">${work.map((s) => {
        const ls = L.filter((l) => l.stage === s.id).sort(byDue);

        return `<section class="pcol${s.kind ? ' ' + s.kind : ''}" data-pcol="${s.id}"><header><b>${esc(s.name)}</b> <span class="faint">${ls.length}</span></header>
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
      <div class="opts">${S.biz.stages.map((s) => { const sends = sendsOnStage(l, s.id); return `<button class="opt" data-pstage="${s.id}" data-lid="${l.id}" aria-pressed="${l.stage === s.id}">${esc(s.name)}${sends.length ? `<small>⚠️ יישלח אליו: ${esc(sends.map((r) => ruleText(r).then).join(', '))}</small>` : ''}</button>`; }).join('')}</div>`);
  }
  function sheetMoveConfirm(l, id, sends) {
    sheet(`<h2>${esc(People.rowName(l))} ➜ ${esc(stageById(id).name)}</h2>
      <p class="muted">המעבר הזה שולח אליו, לפי הכללים שלך:</p>
      ${sends.map((r) => `<div class="bubble">${esc(r.action.kind === 'message' && tplById(r.action.tpl) ? fillFor(tplById(r.action.tpl), l, true) : ruleText(r).then)}</div>`).join('')}
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
    { id: 'kind', t: 'עסק או פרטי', v: (l) => (l.b != null ? 'עסק' : 'פרטי') },
    { id: 'stage', t: 'שלב', v: (l) => stageById(l.stage).name, s: (l) => S.biz.stages.findIndex((x) => x.id === l.stage) },
    { id: 'warm', t: 'חום', v: (l) => (effWarm(l) == null ? '' : words()[effWarm(l)]), s: (l) => (effWarm(l) == null ? 9 : effWarm(l)) },

    { id: 'answer', t: 'קשר', v: (l) => ANSWER[answerState(l)], s: (l) => ['none', 'tried', 'sent', 'talked'].indexOf(answerState(l)) },
    { id: 'last', t: 'קשר אחרון', v: (l) => contactLine(l), s: (l) => (lastTouch(l) ? lastTouch(l).at : 0) },
    { id: 'tags', t: 'מה סימנו', v: (l) => tagged(l).map((b) => b.label).join(', ') },
    // No step is said in words, never as "—": a lead waiting for the owner's decision must not look like one with nothing to do.
    { id: 'next', t: 'מה הלאה', v: (l) => (tasks(l).length ? plan(l).label : restWord(l)) },
    { id: 'due', t: 'מתי', v: (l) => (plan(l).due ? plan(l).due.getTime() : null), f: dateShort, num: true },
    { id: 'by', t: 'נקלט ע"י', v: (l) => (l.by === 'בעלים' ? 'בעל הדוכן' : l.by) },
    { id: 'list', t: 'רשימת התפוצה', v: (l) => (l.optOut ? 'ביקש להסיר' : onList(l) ? 'כן' : 'לא') },
    { id: 'phone', t: 'טלפון', v: (l) => l.contact.phone, ltr: true },
    { id: 'email', t: 'מייל', v: (l) => l.contact.email, ltr: true },
    { id: 'notes', t: 'הערות', v: (l) => l.notes.map((n) => n.text || n.tr).filter(Boolean).join(' | ') },
    { id: 'at', t: 'תאריך ביקור', v: (l) => l.at, f: dateShort, num: true },
  ];
  const colById = (id) => COLS.find((c) => c.id === id);
  const FILTERS = {
    warm: { t: 'חום', opts: () => words().map((w, k) => [String(k), w]).concat([['none', 'לא סומן']]), ok: (l, v) => (v === 'none' ? effWarm(l) == null : effWarm(l) === +v) },
    answer: { t: 'קשר', opts: () => [['none', 'עוד לא היה קשר'], ['tried', 'ניסינו ולא ענה'], ['sent', 'קיבל הודעה'], ['talked', 'דיברנו']], ok: (l, v) => (v === 'notyet' ? answerState(l) !== 'talked' : v === 'none' ? ['none', 'tried'].includes(answerState(l)) : answerState(l) === v) },
    stage: { t: 'שלב', opts: () => S.biz.stages.map((s) => [s.id, s.name]), ok: (l, v) => l.stage === v },
    btn: { t: 'מה סימנו', more: true, opts: () => [['nobtn', 'לא סימנו כלום']].concat(S.biz.buttons.map((b) => [b.id, b.label])), ok: (l, v) => (v === 'nobtn' ? !l.tags.length : l.tags.includes(v)) },
    kind: { t: 'עסק או פרטי', more: true, opts: () => [['biz', 'עסק'], ['private', 'פרטי']], ok: (l, v) => (v === 'biz') === (l.b != null) },
    town: { t: 'עיר', more: true, opts: () => Array.from(new Set(leadsNow().map((l) => People.town(l)))).sort().map((t) => [t, t]), ok: (l, v) => People.town(l) === v },
    list: { t: 'רשימת התפוצה', more: true, opts: () => [['yes', 'ברשימה'], ['no', 'לא ברשימה']], ok: (l, v) => (v === 'yes') === onList(l) },
    decide: { t: 'מחכים להחלטה', more: true, opts: () => [['yes', 'כן']], ok: undecided },
  };
  let tbQuery = '';
  let tbPage = 0;
  const tbSel = new Set();
  let tbIds = null;    // the leads an answer to a question, or a rule, pointed at — a filter of its own
  let tbIdsWhy = '';
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
      if (ex || ey) return ex === ey ? 0 : ex ? 1 : -1;   // empty values always last: "when" sorted up must start with today, not with the leads that have nothing to do
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'he')) * S.tb.sort.dir;
    });
    return rows;
  }
  const narrow = () => window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  function crmTable(box, L) {
    const rows = tableRows(L);
    // M9: what is selected is what passes the filter now — an action never reaches a lead hidden by a search or a view.
    const inView = new Set(rows.map((l) => l.id));
    Array.from(tbSel).forEach((id) => { if (!inView.has(id)) tbSel.delete(id); });
    const per = 25;
    const pages = Math.max(1, Math.ceil(rows.length / per));
    tbPage = Math.min(tbPage, pages - 1);
    const shown = rows.slice(tbPage * per, tbPage * per + per);
    // On a tablet the default columns are the ones that decide who to call; chosen columns are kept as chosen.
    const ids = !wideCRM() && !S.tb.custom ? ['name', 'warm', 'next', 'due'] : S.tb.cols;   // T-5: below a computer's width, four that fit a tablet without scrolling sideways
    const cols = ids.map(colById).filter(Boolean);
    const active = Object.keys(S.tb.f).filter((k) => S.tb.f[k] && FILTERS[k]);
    const allSel = shown.length && shown.every((l) => tbSel.has(l.id));
    const sel = (k, F) => `<label class="tb-filter"><span class="faint">${F.t}</span><select data-tbf="${k}" aria-label="${F.t}"><option value="">הכל</option>${F.opts().map(([v, t]) => `<option value="${esc(v)}" ${S.tb.f[k] === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    /* One row above the table (UX review T-1): the search and the three questions a business owner asks of his list.
     * Every other filter, the columns and the export are behind "עוד", one tap away. */
    const quick = [['warm', '0', 'חמים'], ['answer', 'none', 'עוד לא היה קשר'], ['decide', 'yes', 'מחכים להחלטה']];
    const quickOn = (k, v) => S.tb.f[k] === v;
    const extra = Object.entries(FILTERS).filter(([k]) => k !== 'decide');
    const extraOn = extra.some(([k]) => S.tb.f[k] && !quick.some(([qk, qv]) => qk === k && qv === S.tb.f[k]));
    box.innerHTML = `
      <div class="tb-bar">
        <input id="tb-q" class="text-input tb-q" placeholder="חיפוש בטבלה" aria-label="חיפוש בטבלה" value="${esc(tbQuery)}" autocomplete="off">
        <span class="chips tb-quick">${quick.map(([k, v, t]) => `<button class="chip" data-tbquick="${k}:${v}" aria-pressed="${quickOn(k, v)}">${t}</button>`).join('')}</span>
      </div>
      <details class="more-filters"${extraOn ? ' open' : ''}><summary>עוד: סינון, עמודות, אקסל</summary>
        <div class="tb-bar">${extra.map(([k, F]) => sel(k, F)).join('')}</div>
        <div class="actions"><button class="btn" data-act="tb-cols">עמודות</button><button class="btn" data-act="tb-export-ask">⬇ להוריד לאקסל</button></div></details>
      <div class="tb-state">
        <span><b>${rows.length}</b> לידים${tbIds ? ` · <button class="chip small" data-act="ask-unfilter">${esc(tbIdsWhy || 'מתוך התשובה לשאלה')} ✕</button>` : ''}${active.length ? ' · מסונן לפי: ' + active.map((k) => `<button class="chip small" data-tbclear="${k}">${esc(FILTERS[k].t)}: ${esc((FILTERS[k].opts().find(([v]) => v === S.tb.f[k]) || [, S.tb.f[k]])[1])} ✕</button>`).join(' ') + ' <button class="link" data-tbclear="all">ניקוי הכל</button>' : ''}</span>
      </div>
      <div class="tb-wrap"><table class="tb">
        <thead><tr><th class="ck"><label class="ck-hit"><input type="checkbox" data-tbselall aria-label="לבחור את כל העמוד" ${allSel ? 'checked' : ''}></label></th>${cols.map((c) => `<th class="${c.num ? 'num' : ''}${c.id === 'name' ? ' stick' : ''}"><button class="th" data-tbsort="${c.id}">${esc(c.t)}${S.tb.sort.col === c.id ? (S.tb.sort.dir > 0 ? ' ▲' : ' ▼') : ''}</button></th>`).join('')}</tr></thead>
        <tbody>${shown.map((l) => `<tr${tbSel.has(l.id) ? ' class="sel"' : ''}><td class="ck"><label class="ck-hit"><input type="checkbox" data-tbsel="${l.id}" aria-label="לבחור את ${esc(People.rowName(l))}" ${tbSel.has(l.id) ? 'checked' : ''}></label></td>${cols.map((c) => {
          const v = c.v(l);
          const txt = c.f ? c.f(v) : v == null || v === '' ? '—' : String(v);
          if (c.id === 'name') return `<td class="stick"><button class="link" data-crmlead="${l.id}"><b>${esc(txt)}</b></button>${l.demo ? ' <span class="faint">לדוגמה</span>' : ''}</td>`;
          // Read only (UX review T-3): a hidden dashed underline was the only sign a cell could change — changes are made on the lead's page.
          return `<td class="${c.num ? 'num' : ''}"${c.ltr ? ' dir="ltr"' : ''}>${esc(txt)}</td>`;
        }).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length + 1}"><div class="empty">אין לידים שמתאימים לסינון. <button class="link" data-tbclear="all">ניקוי סינון</button></div></td></tr>`}</tbody>
      </table></div>
      ${pages > 1 ? `<div class="pager"><button class="btn" data-tbpage="${tbPage - 1}" ${tbPage ? '' : 'disabled'}>הקודם</button><span>עמוד ${tbPage + 1} מתוך ${pages}</span><button class="btn" data-tbpage="${tbPage + 1}" ${tbPage < pages - 1 ? '' : 'disabled'}>הבא</button></div>` : ''}
      ${tbSel.size ? `<div class="bulk" style="z-index:10"><b>${tbSel.size} נבחרו</b>
        <button class="btn primary-inv" data-bulk="message">💬 הודעה</button><button class="btn" data-bulk="stage">להעביר שלב</button><button class="btn" data-bulk="warm">לסמן חום</button>
        <button class="btn" data-bulk="step">להוסיף משימה</button><button class="btn" data-bulk="export">⬇ אקסל</button>
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
    const opts = kind === 'stage' ? S.biz.stages.map((s) => [s.id, s.name]) : kind === 'warm' ? words().map((w, k) => [String(k), w])
      : kind === 'step' ? Object.keys(STEPS).filter((k) => k !== 'none' && k !== 'season').map((k) => [k, STEPS[k].icon + ' ' + STEPS[k].name]) : S.biz.templates.map((t) => [t.id, '💬 ' + t.name]);
    const title = { stage: 'להעביר שלב', warm: 'לסמן חום', step: 'להוסיף משימה', message: 'איזו הודעה לשלוח' }[kind];
    sheet(`<h2>${title} — ${n} לידים</h2><div class="opts">${opts.map(([v, t]) => `<button class="opt" data-bulkdo="${kind}" data-v="${esc(v)}">${esc(t)}</button>`).join('')}</div>
      <div class="actions"><button class="btn ghost" data-act="sheet-close">ביטול</button></div>`);
  }
  function doBulk(kind, v) {
    const list = Array.from(tbSel).map(leadById).filter(Boolean);
    if (kind === 'message') return sheetSendConfirm(list, v);   // a message always passes through the confirmation
    closeSheet(false);
    undoable(`✓ עודכנו ${list.length}`, () => list.forEach((l) => {
      if (kind === 'stage') { holdSends = true; setStage(l, v, 'בפעולה על כמה'); holdSends = false; }
      if (kind === 'warm') { l.warmth = +v; l.warmBy = 'hand'; }
      if (kind === 'step') { const s = normStep({ type: v }); addManual(l, s, dueFor(s)); log(l, 'משימה: ' + s.label); }
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
      const why = l.optOut ? 'ביקש להסיר' : l.list === false ? 'לא ברשימת התפוצה' : !withClosed && l.won ? 'עסקה נסגרה'   // "not closed" stays on the list: future leads (יצחק, 08/10, 18/10)
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
    const ch = sendChannels().join(' + ');
    const reasons = {};
    out.forEach((x) => { reasons[x.why] = (reasons[x.why] || 0) + 1; });
    sheet(`<h2>לשלוח "${esc(t.name)}" ל-${keep.length}${ch ? ' ב' + esc(ch) : ''}?</h2>
      ${keep.length ? `<div class="bubble">${esc(fillFor(t, keep[0], true)).replace(/\n/g, '<br>')}</div><p class="faint">כך זה ייראה אצל ${esc(People.rowName(keep[0]))}. כל אחד מקבל את השם שלו.</p>` : ''}
      <p>${keep.length ? 'יקבלו: ' + esc(keep.slice(0, 8).map((l) => People.rowName(l)).join(', ')) + (keep.length > 8 ? ` ועוד ${keep.length - 8}` : '') : 'אף אחד לא יקבל.'}</p>
      ${out.length ? `<p class="muted">הוצאו ${out.length}: ${esc(Object.entries(reasons).map(([w, n]) => n + ' — ' + w).join(' · '))}</p>` : ''}
      <label class="check-line"><input type="checkbox" data-scclosed ${SC.withClosed ? 'checked' : ''}> לשלוח גם למי שעסקה איתו נסגרה</label>
      ${!ch ? '<p class="warn-box">אין דרך שליחה פעילה. מפעילים ב"מייל ווואטסאפ".</p>' : ''}
      <div class="actions"><button class="btn primary" data-act="send-confirm" ${keep.length && ch ? '' : 'disabled'}>לשלוח ל-${keep.length}</button><button class="btn ghost" data-act="sheet-close">ביטול</button></div>`);
  }
  function sendConfirmed() {
    const list = SC.ids.map(leadById).filter(Boolean);
    const { keep } = sendAudience(list, SC.tid, SC.withClosed);
    let n = 0;
    keep.forEach((l) => { if (sendTemplate(l, SC.tid, true, true)) n++; });
    SC = null; tbSel.clear();
    save(); closeSheet(false); render();
    toast(`💬 נשלח ל-${n}.`);
  }

  // ---- פילוח ----
  let PV = { dim: null, metric: 'conv' };
  function dims() {
    const d = {};
    liveGroups().forEach((g) => {
      d['g:' + g.id] = { t: g.title, of: (l) => { const bs = tagged(l).filter((b) => b.axis === g.id); return bs.length ? bs.map((b) => b.label) : ['לא סומן']; },
        filter: 'btn', key: (l) => { const bs = tagged(l).filter((b) => b.axis === g.id); return bs.length ? bs.map((b) => b.id) : ['nobtn']; } };
    });
    Object.assign(d, {
      warm: { t: 'חום', of: (l) => [effWarm(l) == null ? 'לא סומן' : words()[effWarm(l)]], filter: 'warm', key: (l) => [effWarm(l) == null ? 'none' : String(effWarm(l))] },
      answer: { t: 'קשר', of: (l) => [ANSWER[answerState(l)]], filter: 'answer', key: (l) => [answerState(l)] },
      kind: { t: 'עסק או פרטי', of: (l) => [l.b != null ? 'עסק' : 'פרטי'], filter: 'kind', key: (l) => [l.b != null ? 'biz' : 'private'] },
      town: { t: 'עיר', of: (l) => [People.town(l)], filter: 'town', key: (l) => [People.town(l)] },
      by: { t: 'נקלט ע"י', of: (l) => [l.by === 'בעלים' ? 'בעל הדוכן' : l.by] },
      hour: { t: 'שעת הביקור', of: (l) => [String(new Date(l.at).getHours()).padStart(2, '0') + ':00'] },
      stage: { t: 'שלב', of: (l) => [stageById(l.stage).name], filter: 'stage', key: (l) => [l.stage], ordered: true },
    });
    return d;
  }
  const METRICS = { count: 'כמה לידים', won: 'עסקאות', conv: 'אחוז סגירה', reached: 'היה קשר' };
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
      return { label: r.label, key: r.key, count: r.ls.length, won, conv: r.ls.length ? Math.round(won / r.ls.length * 100) : 0, reached: r.ls.filter(reached).length };
    });
    if (D.ordered) return rows.sort((a, b) => S.biz.stages.findIndex((s) => s.name === a.label) - S.biz.stages.findIndex((s) => s.name === b.label));
    return rows.sort((a, b) => (b.count >= MIN_N) - (a.count >= MIN_N) || b[PV.metric] - a[PV.metric]);
  }
  function crmSegments(box, L) {
    // X10: the comparison and the free question are behind one door — the dashboard itself stays plain.
    box.innerHTML = `<div id="seg-stats"></div>
      <details class="adv"${PV.open ? ' open' : ''}><summary><h2>כלים מתקדמים</h2><span class="faint">השוואה בין קבוצות, ושאלה חופשית על הנתונים</span></summary>
        ${askBox()}<h2 class="seg-h">השוואה</h2><div id="seg-pivot"></div></details>`;
    $('.adv').addEventListener('toggle', (e) => { PV.open = e.target.open; });
    crmStats($('#seg-stats'), L);
    crmPivot($('#seg-pivot'), L);
  }
  function crmPivot(box, L) {
    const D = dims();
    if (!PV.dim || !D[PV.dim]) PV.dim = Object.keys(D)[0];
    const isStage = PV.dim === 'stage';
    if (isStage && (PV.metric === 'conv' || PV.metric === 'won')) PV.metric = 'count';   // "closing rate by stage" carries no information
    const rows = pivot(L);
    const pct = (r) => (r.count >= MIN_N ? r.conv + '%' : '—');
    const fmt = String;
    const chartRows = rows.map((r) => ({ label: r.label, value: PV.metric === 'conv' ? (r.count >= MIN_N ? r.conv : 0) : r[PV.metric], sub: PV.metric === 'conv' ? (r.count >= MIN_N ? `(${r.won} מתוך ${r.count})` : `מעט מדי לידים (${r.count})`) : '', thin: r.count < MIN_N }));
    const canShow = !!D[PV.dim].filter;
    box.innerHTML = `<div class="tb-bar">
        <label class="tb-filter"><span class="faint">לפי</span><select data-pv="dim">${Object.entries(D).map(([k, d]) => `<option value="${k}" ${PV.dim === k ? 'selected' : ''}>${esc(d.t)}</option>`).join('')}</select></label>
        <label class="tb-filter"><span class="faint">לספור</span><select data-pv="metric">${Object.entries(METRICS).map(([k, t]) => `<option value="${k}" ${PV.metric === k ? 'selected' : ''} ${isStage && (k === 'conv' || k === 'won') ? 'disabled' : ''}>${t}</option>`).join('')}</select></label>
        <button class="btn" data-act="pv-export">⬇ אקסל</button></div>
      <p class="faint">אחוז מוצג רק כשיש ${MIN_N} לידים ומעלה — פחות מזה זה מקרה.</p>
      <div class="two-col">
        <section class="card"><h2>${esc(METRICS[PV.metric])} לפי ${esc(D[PV.dim].t)}</h2>${rows.length ? barChart(chartRows, PV.metric === 'conv' ? (v) => v + '%' : fmt) : '<div class="empty">אין נתונים.</div>'}</section>
        <section class="card"><div class="tb-wrap"><table class="tb pv">
          <thead><tr><th>${esc(D[PV.dim].t)}</th>${Object.entries(METRICS).map(([k, t]) => `<th class="num${k === PV.metric ? ' hl' : ''}">${t}</th>`).join('')}${canShow ? '<th></th>' : ''}</tr></thead>
          <tbody>${rows.map((r) => `<tr class="${r.count < MIN_N ? 'thin' : ''}"><td><b>${esc(r.label)}</b></td><td class="num${PV.metric === 'count' ? ' hl' : ''}">${r.count}</td><td class="num${PV.metric === 'won' ? ' hl' : ''}">${r.won}</td><td class="num${PV.metric === 'conv' ? ' hl' : ''}">${pct(r)}</td><td class="num${PV.metric === 'reached' ? ' hl' : ''}">${r.reached}</td>
            ${canShow ? `<td><button class="link" data-pvshow="${esc(D[PV.dim].filter)}" data-v="${esc(r.key)}">לטבלה ←</button></td>` : ''}</tr>`).join('')}</tbody>
        </table></div></section>
      </div>`;
  }

  // ---- אוטומציות ----
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
    const act = a.kind === 'step' ? `${sel('a.type', Object.keys(STEPS).filter((k) => k !== 'none' && k !== 'season').map((k) => [k, STEPS[k].name]), a.type, 'איזו משימה')} ${sel('a.days', [[0, 'היום'], [1, 'מחר'], [2, 'בעוד יומיים'], [3, 'בעוד 3 ימים'], [7, 'בעוד שבוע']], a.days || 1, 'מתי')}`
      : a.kind === 'message' ? sel('a.tpl', [['', 'ברירת המחדל של הערוץ']].concat(S.biz.templates.map((t) => [t.id, t.name])), a.tpl || '', 'איזו הודעה')
      : a.kind === 'stage' ? sel('a.stage', S.biz.stages.map((s) => [s.id, s.name]), a.stage || 'contact', 'לאיזה שלב')
      : a.kind === 'warm' ? sel('a.value', words().map((w, k) => [k, w]), a.value || 0, 'איזה חום') : '';
    const c = r.cond || {};
    const tpl = a.kind === 'message' && tplById(a.tpl);
    sheet(`<h2>${r.isNew ? 'כלל חדש' : 'עריכת כלל'}</h2>
      <div class="rule-sentence">כש ${sel('trigger', Object.entries(TRIGGERS), r.trigger, 'מתי')} ${arg}<br>
        אז ${sel('a.kind', Object.entries(ACTIONS), a.kind, 'מה לעשות')} ${act}</div>
      ${tpl ? `<div class="bubble">${esc(tpl.text + '\n' + OPT_OUT).replace(/\n/g, '<br>')}</div><p class="faint">מה שנשלח לבד יוצא עם שורת ההסרה, כמו שליחה לקבוצה.</p>` : ''}
      ${sendsOut(r) ? '<p class="out-tag">יוצא ללקוח, בשמך</p>' : ''}
      <div class="label">רק אם <small>רשות</small></div>
      <div class="rule-conds">
        <label><span class="faint">חום</span>${sel('c.warm', [['', 'כל חום']].concat(words().map((w, k) => [k, w])), c.warm == null ? '' : c.warm, 'חום')}</label>
        <label><span class="faint">כפתור</span>${sel('c.btn', [['', 'כל כפתור']].concat(S.biz.buttons.map((b) => [b.id, b.label])), c.btn || '', 'כפתור')}</label>
        <label><span class="faint">עסק או פרטי</span>${sel('c.biz', [['', 'שניהם'], ['1', 'רק עסק'], ['0', 'רק פרטי']], c.biz == null ? '' : c.biz ? '1' : '0', 'עסק או פרטי')}</label>
        </div>
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

    if (k === 'a.kind') { r.action = { kind: v, type: 'call', days: 1, tpl: (S.biz.templates[0] || {}).id, stage: 'contact', value: 0 }; return renderRule(); }
    if (k === 'a.type') r.action.type = v;
    if (k === 'a.days') r.action.days = +v;
    if (k === 'a.tpl') { r.action.tpl = v; return renderRule(); }
    if (k === 'a.stage') r.action.stage = v;
    if (k === 'a.value') r.action.value = +v;
  }

  // ---- הודעות ----
  let msgFilter = 'all';
  let grp = { who: '', stage: '', warm: '', btn: '', answer: '', tpl: '' };
  // Those kept for the mailing list only are reached here too, and only here (יצחק, 18/10): they are not leads.
  const grpList = () => leadsNow().filter((l) => (grp.who === 'all' || (grp.who === 'list' ? l.listOnly : !l.listOnly)) && (!grp.stage || l.stage === grp.stage) && (grp.warm === '' || effWarm(l) === +grp.warm) && (!grp.btn || l.tags.includes(grp.btn)) && (!grp.answer || FILTERS.answer.ok(l, grp.answer)));
  function crmMessages(box, L) {
    const sent = [];
    L.forEach((l) => l.log.forEach((e) => { if (/^(⚙️ )?(💬|📎)/.test(e.t)) sent.push({ l, e, auto: isAuto(e.t) }); }));
    sent.sort((a, b) => b.e.at - a.e.at);
    const shown = sent.filter((x) => msgFilter === 'all' || (msgFilter === 'auto') === x.auto);
    if (!grp.tpl && S.biz.templates[0]) grp.tpl = S.biz.templates[0].id;
    const aud = grpList();
    const { keep } = sendAudience(aud, grp.tpl, false);
    const sel = (k, opts, label) => `<select class="text-input" data-grp="${k}" aria-label="${label}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${String(grp[k]) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    const sample = leadsNow()[0];
    box.innerHTML = `<div class="two-col">
      <section class="card"><h2>ההודעות</h2><p class="muted">${S.biz.templates.length} הודעות: ${esc(S.biz.templates.map((t) => t.name).join(' · '))}</p>
        <div class="actions"><button class="btn" data-act="view-settings">⚙️ לנהל בהגדרות</button></div></section>
      <section class="card"><h2>שליחה לקבוצה</h2>
        <div class="rule-conds">
          ${leadsNow().some((l) => l.listOnly) ? `<label><span class="faint">למי</span>${sel('who', [['', 'הלידים'], ['list', 'רק רשימת התפוצה'], ['all', 'כולם']], 'למי')}</label>` : ''}
          <label><span class="faint">שלב</span>${sel('stage', [['', 'כל השלבים']].concat(S.biz.stages.map((s) => [s.id, s.name])), 'שלב')}</label>

          <label><span class="faint">חום</span>${sel('warm', [['', 'כל חום']].concat(words().map((w, k) => [k, w])), 'חום')}</label>
          <label><span class="faint">קשר</span>${sel('answer', [['', 'כולם']].concat(FILTERS.answer.opts()), 'קשר')}</label>
          <label><span class="faint">כפתור</span>${sel('btn', [['', 'כל כפתור']].concat(S.biz.buttons.map((b) => [b.id, b.label])), 'כפתור')}</label></div>
        <label class="label">איזו הודעה</label>${sel('tpl', S.biz.templates.map((t) => [t.id, (t.mat ? '📎 ' : '💬 ') + t.name]), 'הודעה')}
        <p class="faint" style="margin-top:8px">יישלח ל-<b>${keep.length}</b>${aud.length - keep.length ? ` (${aud.length - keep.length} הוצאו — עסקה נסגרה, ביקשו הסרה, או קיבלו אותה החודש)` : ''}: ${esc(keep.slice(0, 5).map((l) => People.rowName(l)).join(', '))}${keep.length > 5 ? ' ועוד ' + (keep.length - 5) : ''}</p>
        <div class="actions"><button class="btn primary" data-act="grp-send" ${keep.length ? '' : 'disabled'}>לראות ולשלוח…</button></div></section>
    </div>
    <section class="card" style="margin-top:14px"><h2>נשלחו לאחרונה</h2>
      <div class="chips tl-filter">${[['all', 'הכל'], ['manual', 'שלחתי'], ['auto', '⚙️ נשלח לבד']].map(([k, t]) => `<button class="chip small" data-msgf="${k}" aria-pressed="${msgFilter === k}">${t}</button>`).join('')}</div>
      ${shown.length ? `<ul class="log">${shown.slice(0, 15).map(({ l, e }) => `<li><span class="when">${esc(H.heDate(new Date(e.at)))} ${new Date(e.at).toTimeString().slice(0, 5)}</span><button class="link" data-crmlead="${l.id}">${esc(People.rowName(l))}</button> · ${esc(e.t.replace(/^(⚙️ )?💬\s*/, isAuto(e.t) ? '⚙️ ' : ''))}</li>`).join('')}</ul>` : '<div class="empty">עוד לא נשלחו הודעות.</div>'}</section>`;
  }
  function sheetTemplate(id) {
    const t = id ? tplById(id) : { id: '', name: '', mat: '', text: 'שלום {שם}, ' };
    sheet(`<h2>${id ? 'עריכת הודעה' : 'הודעה חדשה'}</h2>
      <label class="label" for="tp-name">שם <small>כך היא תופיע בדוכן</small></label><input id="tp-name" class="text-input" value="${esc(t.name)}" autocomplete="off">
      <div class="label">קובץ מצורף</div><div class="chips" id="tp-mats"><button class="chip" data-tpmat="" aria-pressed="${!t.mat}">בלי קובץ</button>${S.biz.materials.map((x) => `<button class="chip" data-tpmat="${esc(x.name)}" aria-pressed="${t.mat === x.name}">📎 ${esc(x.name)}</button>`).join('')}</div>
      <div class="actions" style="margin-top:6px"><label class="btn" for="tp-file">📎 לצרף קובץ חדש</label></div><input id="tp-file" type="file" accept="image/*,application/pdf" hidden>
      <label class="label" for="tp-text">ההודעה</label>
      ${ai ? `<div class="ai-write"><input id="tp-ask" class="text-input" placeholder="על מה ההודעה? למשל: תודה על הביקור, והמחירון מצורף" autocomplete="off"><button class="btn" data-act="tpl-write" id="tp-write">✨ תכתוב לי</button></div>` : ''}
      <div class="chips">${[['{שם}', '+ שם'], ['{עסק}', '+ שם העסק'], ['{קובץ}', '+ שם הקובץ']].map(([v, l]) => `<button class="chip small" data-tplvar="${v}">${l}</button>`).join('')}</div>
      <textarea id="tp-text" class="say small">${esc(t.text)}</textarea>
      <label class="check-line"><input type="checkbox" id="tp-booth" ${t.booth ? 'checked' : ''}> ברירת המחדל בדוכן <span class="faint">— כפתור השליחה בכרטיס המבקר שולח אותה</span></label>
      <p class="faint">{קובץ} = שם הקובץ המצורף. בלי קובץ — לא לכתוב "מצורף".</p>
      <p class="faint">בשליחה לקבוצה נוספת לבד השורה: "${esc(OPT_OUT)}"</p>
      <div class="actions"><button class="btn primary" data-act="tpl-save" data-id="${esc(t.id)}">שמירה</button><button class="btn ghost" data-act="sheet-close">ביטול</button>
        ${id ? `<button class="btn ghost danger far" data-act="tpl-del" data-id="${esc(id)}">למחוק</button>` : ''}</div>`);
    $('#scrim .sheet').dataset.guard = '1';
    // A new file joins the library and is attached here at once; the name and the words typed so far stay.
    $('#tp-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const name = (file.name.replace(/\.[^.]+$/, '') || file.name).slice(0, 30);
      if (!S.biz.materials.some((x) => x.name === name)) S.biz.materials.push({ name, file: file.name });
      save();
      document.querySelectorAll('[data-tpmat]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      let chip = [...document.querySelectorAll('[data-tpmat]')].find((x) => x.dataset.tpmat === name);
      if (!chip) { chip = document.createElement('button'); chip.className = 'chip'; chip.dataset.tpmat = name; chip.textContent = '📎 ' + name; $('#tp-mats').appendChild(chip); }
      chip.setAttribute('aria-pressed', 'true');
    });
  }
  function sheetLeadMsg(l) {
    sheet(`<h2>הודעה ל${esc(People.rowName(l))}</h2>
      ${l.optOut ? '<p class="warn-box">ביקש להסיר את עצמו מרשימת התפוצה. אפשר רק לענות לו אישית.</p>' : `<div class="opts">${S.biz.templates.map((t) => `<button class="opt" data-sendtpl="${t.id}" data-lid="${l.id}">💬 ${esc(t.name)} <span class="faint">· ${esc(sendChannels().join(' + ') || 'אין ערוץ פעיל')}</span><small>${esc(fillFor(t, l))}</small></button>`).join('')}</div>`}
      ${l.optOut || worker() ? "" : `<div class="opts"><button class="opt" data-act="send" data-lid="${l.id}">📎 הודעה חדשה עם קובץ<small>קטלוג, מחירון, תמונה</small></button></div>`}
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
  const TL_KINDS = { all: 'הכל', calls: '📞 שיחות', msgs: '💬 הודעות', notes: '📝 הערות', stages: '➜ שלבים' };
  const tlKind = (t) => (isAuto(t) ? 'auto' : /^📞/.test(t) ? 'calls' : /^(💬|📎)/.test(t) ? 'msgs' : /^📝/.test(t) ? 'notes' : /^➜/.test(t) ? 'stages' : 'other');
  function recordPage(box, l) {
    const ts = tasks(l);
    // On top: what to do now, with the buttons of that step (UX review L-2, L-6). "Call" stands apart only when the step is not itself a call.
    const open = ts.length || undecided(l);
    const talkFirst = ts.length && ['call', 'meet', 'date', 'season'].includes(ts[0].type);
    const w = effWarm(l);

    const lt = lastTouch(l);
    const tr = tries(l);
    const autos = l.log.filter((e) => isAuto(e.t)).length;
    const entries = l.log.slice().reverse().filter((e) => {
      const k = tlKind(e.t);
      if (k === 'auto') return tlAuto && tlFilter === 'all';
      return tlFilter === 'all' || k === tlFilter;
    });
    box.innerHTML = `<div class="rec">
      <div class="rec-top">
        <div class="rec-bar"><button class="btn ghost" data-act="record-back">${box.id === 'crm-side' ? '✕ סגירה' : '→ חזרה ל' + esc((CRM_TABS.find(([k]) => k === S.crmTab) || ['', CRM_NAME])[1])}</button>
          <button class="btn ghost" data-act="rec-menu" data-lid="${l.id}">עוד פעולות</button></div>
        <div class="rec-title"><h1>${esc(People.rowName(l))}${l.b != null ? ' <span class="badge biz">עסק</span>' : ''}${dots(l)}${l.optOut ? ' <span class="badge">ביקש הסרה</span>' : ''}</h1>
          ${l.contact.phone ? `<div class="rec-phone"><bdi dir="ltr">${esc(l.contact.phone)}</bdi><button class="btn ghost" data-act="copy-phone" data-lid="${l.id}">להעתיק</button></div>` : ''}
          <div class="muted">${esc(People.town(l))} · ${esc(People.rowMeta(l))}${l.demo ? ' · לדוגמה' : ''}</div></div>
        <div class="rec-keys">
          <button class="key" data-pmove="${l.id}" aria-label="לשנות שלב"><span class="faint">שלב</span><b>${esc(stageById(l.stage).name)} ⇄</b></button>
          <span class="key"><span class="faint">חום</span><b>${w == null ? 'בלי' : esc(words()[w])}</b></span>
          <button class="key" data-act="list-toggle" data-lid="${l.id}" aria-label="רשימת התפוצה: לשנות"><span class="faint">רשימת התפוצה</span><b>${l.optOut ? 'ביקש להסיר' : onList(l) ? 'כן' : 'לא'}</b></button>

          <span class="key"><span class="faint">קשר אחרון</span><b>${lt ? esc(lt.kind + ' ' + agoText(lt.at)) : 'עוד לא היה קשר'}</b>${tr.length ? `<span class="faint">אחר כך לא ענה${tr.length === 2 ? ' פעמיים' : tr.length > 2 ? ' ' + tr.length + ' פעמים' : ''} · ${esc(agoText(tr[tr.length - 1].at))}</span>` : ''}</span>
        </div>
        ${open ? `<section class="rec-now"><div class="nc-now"><span class="faint">עכשיו</span> ${ts.length ? planHTML(ts[0], true) : '<b>להחליט מה איתו</b>'}</div>${stepActs(l, !!l.contact.phone)}</section>` : ''}
        <div class="actions rec-acts">${talkFirst ? '' : `<button class="btn" data-act="call" data-lid="${l.id}">📞 להתקשר</button>`}
          <button class="btn" data-act="lead-msg" data-lid="${l.id}">💬 לשלוח</button>
          <button class="btn" data-act="note" data-lid="${l.id}">📝 הערה</button>
          <button class="btn" data-act="edit-tags" data-lid="${l.id}">✎ לשנות סימון</button></div>
        ${callOpen && !talkFirst ? `<div class="mini"><div class="label" style="margin-top:0">${l.contact.phone ? `הטלפון: <bdi dir="ltr" class="phone">${esc(l.contact.phone)}</bdi> · ` : ''}איך היה?</div><div class="chips">
          <button class="chip" data-outcome="talk" data-lid="${l.id}">דיברנו — מה הלאה</button>
          <button class="chip" data-outcome="noans" data-lid="${l.id}">לא ענה</button>
          <button class="chip" data-final="won" data-lid="${l.id}">🎉 נסגרה עסקה</button>
          <button class="chip" data-final="lost" data-lid="${l.id}">לא נסגרה</button></div>
          <div class="faint" style="margin-top:6px">מתקשרים מהטלפון, ומסמנים כאן איך היה.</div></div>` : ''}
      </div>
      <div class="rec-grid">
        <div class="rec-main">
          ${l.notes.length ? `<section class="card notes-card"><h2>📝 הערות <span class="faint">(${l.notes.length})</span></h2>
            <ul class="log">${l.notes.slice().reverse().map((n) => `<li><span class="when">${esc(H.heDate(new Date(n.at)))} ${new Date(n.at).toTimeString().slice(0, 5)}</span>${n.audio ? `<button class="btn ghost" data-play="${n.id}">▶ השמעה</button> ` : ''}<b>${esc(n.text || '')}</b>${n.tr ? `<div class="faint">תמלול: ${esc(n.tr)}</div>` : ''}</li>`).join('')}</ul></section>` : ''}
          <section class="card"><h2>מה הלאה</h2>
            ${ts.length ? `<div class="step-list">${ts.map((t, i) => `<div class="task-line${i === 0 ? ' first' : ''}"><span>${planHTML(t)}</span>
              <span class="task-acts">${t.type === 'send' || t.type === 'register' ? `<button class="btn" data-tasksend="${esc(t.key)}" data-lid="${l.id}">📎 לשלוח</button>` : ''}
                <button class="btn" data-taskdone="${esc(t.key)}" data-lid="${l.id}">✓ ${doneWord(t)}</button>
                <button class="btn ghost" data-taskedit="${esc(t.key)}" data-lid="${l.id}">שינוי</button></span></div>`).join('')}</div>`
              : l.won || ended(l) ? `<p class="muted">אין משימות. ${esc(restWord(l))}.</p>`
                // G2: no step and no decision — the question is asked once, at the top of the page.
                : '<p class="muted">אין משימות.</p>'}
            <div class="actions"><button class="btn" data-act="task-add" data-lid="${l.id}">+ משימה</button></div></section>
          <section class="card"><h2>מה היה עד עכשיו</h2>
            <div class="chips tl-filter">${Object.entries(TL_KINDS).map(([k, t]) => `<button class="chip" data-tl="${k}" aria-pressed="${tlFilter === k}">${t}</button>`).join('')}</div>
            <ul class="log timeline">${entries.map((e) => `<li class="tl-${tlKind(e.t)}"><span class="when">${esc(H.heDate(new Date(e.at)))} ${new Date(e.at).toTimeString().slice(0, 5)}</span>${esc(e.t)}</li>`).join('') || '<li class="faint">אין כאן כלום.</li>'}</ul>
            ${autos && tlFilter === 'all' ? `<button class="link" data-act="tl-auto">${tlAuto ? 'להסתיר' : 'להציג'} ${autos} דברים שהמערכת עשתה לבד ⚙️</button>` : ''}</section>
        </div>
        <details class="card rec-fields"${narrow() ? '' : ' open'}>
          <summary><h2>פרטים</h2>${l.contact.phone ? ` <bdi dir="ltr" class="faint">${esc(l.contact.phone)}</bdi>` : ''}</summary>
          <label><span class="faint">טלפון</span><input class="text-input ltr" type="tel" data-lf="phone" data-lid="${l.id}" value="${esc(l.contact.phone)}" ></label>
          ${l.contact.phone && !l.demo ? `<a class="phone" href="tel:${esc(l.contact.phone)}" dir="ltr">📞 ${esc(l.contact.phone)}</a>` : ''}
          <label><span class="faint">מייל</span><input class="text-input ltr" type="email" data-lf="email" data-lid="${l.id}" value="${esc(l.contact.email)}"></label>
          <div class="field-row"><span class="faint">מה סימנו</span><span>${tagged(l).map((b) => esc(b.label)).join(' · ') || '—'}</span></div>
          ${l.roleOf ? `<div class="field-row"><span class="faint">מוסד או קבוצה</span><span>${esc(l.roleOf)}</span></div>` : ''}
          ${l.eventDate || tasks(l).some((t) => t.type === 'date') ? `<label><span class="faint">תאריך השמחה</span><input type="date" class="text-input" data-eventdate="${l.id}" value="${esc(l.eventDate)}"></label>` : ''}
          <div class="field-row"><span class="faint">ביקר בדוכן</span><span>${esc(H.heDate(new Date(l.at)))} · נקלט ע"י ${esc(l.by === 'בעלים' ? 'בעל הדוכן' : l.by)}</span></div>
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
    save(); render(); if (!wideCRM()) window.scrollTo(0, 0); else { const sd = document.getElementById("crm-side"); if (sd) sd.scrollTop = 0; }
  }
  /** Only warmth and the buttons — the whole booth card has no place on the lead's page. */
  function sheetTags(l) {
    const w = effWarm(l);
    sheet(`<h2>${esc(People.rowName(l))} — מה סימנו</h2>
      <div class="warmth">${words().map((t, k) => `<button class="warm-btn w${k}" data-warm="${k}" data-lid="${l.id}" aria-pressed="${w === k}">${esc(t)}</button>`).join('')}</div>
      ${liveGroups().map((g) => `<div class="label">${esc(g.title)}</div><div class="chips">${groupButtons(g.id).map((b) => `<button class="chip" data-tag="${b.id}" data-lid="${l.id}" aria-pressed="${l.tags.includes(b.id)}">${esc(b.label)}</button>`).join('')}</div>`).join('')}
      <div class="actions"><button class="btn primary" data-act="back-crm" data-lid="${l.id}">סיום</button></div>`, l.id);
    $('#scrim .sheet').dataset.tags = '1';
  }
  function sheetRecMenu(l) {
    sheet(`<h2>${esc(People.rowName(l))}</h2>
      <div class="opts"><button class="opt" data-act="opt-out" data-lid="${l.id}">${l.optOut ? 'להחזיר לרשימת התפוצה' : 'ביקש להסיר — לא לשלוח לו הודעות'}<small>${l.optOut ? 'יחזור לקבל הודעות לקבוצה' : 'לא ייכלל בשליחה לקבוצה ובמה שנשלח לבד'}</small></button>
        <button class="opt danger" data-act="del-lead" data-lid="${l.id}">למחוק<small>יימחק לגמרי</small></button></div>
      <div class="actions"><button class="btn ghost" data-act="sheet-close">סגירה</button></div>`);
  }

  /* After "we talked": one sheet — what was said, a step and a day. Nothing is
   * marked done until a step is chosen, and choosing one closes the old calls. */
  let TK = null;
  /* The same sheet closes every finished step that leaves nothing open: a lead never falls out of the pipeline without a choice — a next step, a deal, or not relevant. `done` names that step. */
  function sheetTalk(l, stay, done) {
    const seen = new Set();
    const opts = derived(l).filter((s) => s.type !== 'none' && !immediate(s))
      .concat([normStep({ type: 'call' }), normStep({ type: 'meet' }), normStep({ type: 'quote' }), normStep({ type: 'send', days: 1 })], S.biz.seasons.length ? [normStep({ type: 'season' })] : [])
      .filter((s) => { if (seen.has(s.type)) return false; seen.add(s.type); return true; }).slice(0, 6);
    // "Where does he stand?" — the stages from here on, the likely one chosen: after a talk with a new lead, "in touch".
    const w = workStages();
    const at = Math.max(0, w.findIndex((s) => s.id === l.stage));
    const ahead = l.won || l.lost ? [] : w.slice(at);
    const likely = !done && l.stage === 'new' && w[at + 1] ? w[at + 1].id : l.stage;
    TK = { lid: l.id, opts, i: null, days: null, date: '', stay: !!stay, done: done || '', stage: likely };
    const today = new Date(now());
    const toSunday = ((7 - today.getDay()) % 7) || 7;
    sheet(`<h2>${done ? `✓ ${esc(done)}. מה הלאה עם ${esc(People.rowName(l))}?` : `דיברנו עם ${esc(People.rowName(l))}. מה הלאה?`}</h2>
      <label class="label" for="tk-note">${done ? "מה קרה?" : "מה נאמר?"} <small>רשות</small></label><textarea id="tk-note" class="say small" placeholder="${esc(exampleNote())}"></textarea>
      ${ahead.length > 1 ? `<div class="label">איפה הוא עומד עכשיו? <small>נבחר מה שסביר — נגיעה משנה</small></div>
      <div class="chips">${ahead.map((s) => `<button class="chip" data-tkstage="${s.id}" aria-pressed="${TK.stage === s.id}">${esc(s.name)}</button>`).join('')}</div>` : ''}
      <div class="label">המשימה הבאה</div>
      <div class="chips">${opts.map((s, i) => `<button class="chip" data-tkstep="${i}" aria-pressed="false">${STEPS[s.type].icon} ${esc(s.label)}</button>`).join('')}</div>
      <div class="label">מתי</div>
      <div class="chips">${[[1, 'מחר'], [toSunday, 'יום ראשון'], [7, 'בעוד שבוע']].map(([d, t]) => `<button class="chip" data-tkdays="${d}" aria-pressed="false">${t}</button>`).join('')}
        <label class="chip date-chip">תאריך… <input type="date" id="tk-date" aria-label="תאריך"></label></div>
      <div class="actions"><button class="btn primary" data-act="tk-save" id="tk-save" disabled>שמירה</button><button class="btn ghost" data-act="tk-back">חזרה</button></div>
      <div class="opts"><button class="opt" data-act="tk-won">🎉 נסגרה עסקה</button><button class="opt" data-act="tk-none">${NOFOLLOW}<small>בלי משימה. ${onList(l) ? 'נשאר ברשימת התפוצה' : 'ביקש להסיר, ולכן לא יקבל הודעות'}</small></button></div>`, l.id);
    $('#scrim .sheet').dataset.guard = '1';
    $('#tk-date').addEventListener('change', (e) => { TK.date = e.target.value; TK.days = null; document.querySelectorAll('[data-tkdays]').forEach((x) => x.setAttribute('aria-pressed', 'false')); tkReady(); });
  }
  const tkReady = () => { const b = $('#tk-save'); if (b) b.disabled = TK.i == null; };
  /** What "done" means for this step, in the words on its button. */
  const doneWord = (t) => (!t ? 'בוצע' : t.type === 'quote' ? 'הוכנה ונשלחה' : t.type === 'meet' && t.phase !== 'held' ? 'תואם' : t.type === 'meet' ? 'התקיימה' : 'בוצע');
  /* A meeting that was arranged needs its day: on that day the system asks how it went, and the pipeline goes on from there. */
  let MD = null;
  function sheetMeetDate(l) {
    MD = { lid: l.id };
    sheet(`<h2>הפגישה עם ${esc(People.rowName(l))} תואמה. מתי היא?</h2>
      <div class="label">התאריך</div><input type="date" id="md-date" class="text-input">
      <p class="faint" style="margin-top:6px">ביום הפגישה תופיע משימה: "איך הלכה הפגישה?" — ומשם ממשיכים.</p>
      <div class="actions"><button class="btn primary" data-act="md-save">שמירה</button></div>
      <div class="opts"><button class="opt" data-act="md-later">עוד לא נקבע יום<small>מה הלאה במקום</small></button></div>`, l.id);
    $('#scrim .sheet').dataset.guard = '1';
  }
  function tkSave() {
    const l = leadById(TK.lid);
    if (!l || TK.i == null) return;
    const s = TK.opts[TK.i];
    const note = ($('#tk-note') && $('#tk-note').value.trim()) || '';
    // The call that was due is done, and so is every other "call him" — he has just been called.
    if (!TK.done) tasks(l).filter((t, i) => i === 0 || t.type === 'call').forEach((t) => l.done.push(t.key));
    const dueAt = TK.date ? H.addDays(new Date(TK.date + 'T09:00'), 0).getTime() : H.addDays(new Date(now()), TK.days || Math.max(1, s.days || 1), talk(s.type)).getTime();
    addManual(l, s, dueAt);
    if (note) l.notes.push({ id: 'n' + (S.nseq++), at: now(), text: note, audio: false, tr: '' });
    log(l, (TK.done ? '✓ ' + TK.done + ' — משימה: ' : '📞 דיברנו — משימה: ') + s.label + ' · ' + H.heDate(new Date(dueAt)) + (note ? ' · ' + note.slice(0, 60) : ''));
    // M7: where he stands, as the owner confirmed it in this sheet (the likely answer was chosen for him).
    // A next step of "prepare a quote" no longer marks the quote as sent — it is not sent yet.
    if (TK.stage && TK.stage !== l.stage) setStage(l, TK.stage, TK.done ? 'אחרי: ' + TK.done : 'אחרי שיחה');
    const stay = TK.stay;
    TK = null; rowOpen = null;
    save();
    if (stay) { closeSheet(false); render(); } else { render(); sheetCRM(l); }
    toast('✓ ' + s.label + ' · ' + dueText(new Date(dueAt)));
  }
  function sheetNoAnswer(l) {
    sheet(`<h2>${esc(People.rowName(l))} לא ענה ${l.noAnswer} פעמים. מה עושים?</h2>
      <div class="opts"><button class="opt" data-act="lead-msg" data-lid="${l.id}">💬 לשלוח הודעה במקום<small>אולי הוא פשוט לא עונה למספר לא מוכר</small></button>
        <button class="opt" data-act="na-week" data-lid="${l.id}">📞 לנסות שוב בעוד שבוע</button>
        <button class="opt" data-act="task-audience" data-lid="${l.id}">${NOFOLLOW}<small>בלי משימה. ${onList(l) ? 'נשאר ברשימת התפוצה' : 'ביקש להסיר, ולכן לא יקבל הודעות'}</small></button></div>`, l.id);
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
      undoable('לא נסגרה · ' + People.rowName(l), () => toEnd(l));
      return render();
    }
    if (kind === 'noans') {
      l.noAnswer = (l.noAnswer || 0) + 1;
      // M4: the third time the system does not move him to the audience by itself — it asks; the owner decides.
      // What happens on the third time is the owner's, said once in the settings (יצחק, 17/10): ask him, try again in a week, or end the follow-up.
      if (l.noAnswer >= 3) {
        log(l, '📞 לא ענה — ' + l.noAnswer + ' פעמים'); runRules('noanswer', l, l.noAnswer);
        const how = S.biz.noAnsDo || 'ask';
        if (how === 'week') {
          const at = H.addDays(new Date(now()), 7, true).getTime();
          if (cur) l.moved[cur.key] = at; else addManual(l, normStep({ type: 'call' }), at);
          log(l, '⚙️ לבד: ננסה שוב בעוד שבוע (לפי ההגדרה)'); save(); render(); return toast('📞 לא ענה 3 פעמים · ננסה שוב ' + dueText(new Date(at)));
        }
        if (how === 'end') { toEnd(l, 'לא ענה 3 פעמים (לפי ההגדרה)'); save(); render(); return toast(People.rowName(l) + ' · לא ענה 3 פעמים · ' + NOFOLLOW); }
        save(); render(); return sheetNoAnswer(l);
      }
      if (cur) l.moved[cur.key] = H.addDays(today, 1, true).getTime();
      log(l, "📞 לא ענה — ננסה ביום העבודה הבא");
      runRules('noanswer', l, l.noAnswer);
      if (stay) toast('📞 ' + People.rowName(l) + ' — לא ענה, ננסה מחר');
    }
    if (kind === 'won') {
      const sends = sendsOnStage(l, (stageOf('won') || {}).id);
      if (sends.length) { save(); return sheetMoveConfirm(l, (stageOf('won') || {}).id, sends); }
      setStage(l, (stageOf('won') || {}).id || 'won', 'אחרי שיחה');
      if (stay) toast('🎉 בשעה טובה! נסגרה עסקה עם ' + People.rowName(l));
    }
    save();
    if (stay) return render();
    if (S.view === 'crm') render();
    sheetCRM(l);
  }

  // ---- demo: two weeks after the fair ----
  function seedProgress() {

    const before = S.leads.length;
    seedDay();
    const rnd = (n) => Math.floor(Math.random() * n);
    const back = 9 * H.DAY;
    S.leads.slice(before).forEach((l) => {
      l.at -= back; l.log.forEach((e) => { e.at -= back; }); l.notes.forEach((n) => { n.at -= back; });
      upgradeLead(l);
      l.by = Math.random() < 0.7 ? 'בעלים' : 'עובד';
      // יצחק, 17/10: in the demo no lead has a phone or a mail. Only the real system has them, from the organisers' list.
      l.contact = practice() ? { phone: '', email: '' } : { phone: '050-000-' + String(1000 + rnd(9000)), email: 'demo' + l.id + '@example.com' };

      const ev = (d, t) => l.log.push({ at: l.at + d * H.DAY + rnd(6) * 3600000, t });
      const r = Math.random();
      if (r < 0.75) ev(1, (Math.random() < 0.5 ? '📞 דיברנו' : '📎 מחירון — נשלח במייל'));
      if (r < 0.15) {
        l.stage = 'won'; l.won = true; ev(4, '➜ הצעה נשלחה'); ev(6, '➜ נסגר · אחרי שיחה'); l.done.push(...tasks(l).map((t) => t.key));
        // M8: closed the way a real deal closes — with its after-sale check.
        if (S.biz.afterSale) addManual(l, { type: 'call', label: 'איך היה? בדיקה אחרי מכירה', days: S.biz.afterSale, phase: 'after' }, H.addDays(new Date(l.at + 6 * H.DAY), S.biz.afterSale, true).getTime());
      }
      else if (r < 0.25) { l.stage = 'lost'; l.lost = true; ev(3, '➜ לא נסגרה'); }
      else if (r < 0.45) { l.stage = 'quote'; ev(3, '➜ הצעה נשלחה'); }
      else if (r < 0.55) { l.stage = 'nego'; ev(3, '➜ הצעה נשלחה'); ev(5, '➜ במשא ומתן'); }
      else if (r < 0.75) { l.stage = 'contact'; ev(2, '➜ בקשר'); }
      else if (Math.random() < 0.5) { l.noAnswer = 1 + rnd(2); for (let k = 0; k < l.noAnswer; k++) ev(2 + k, '📞 לא ענה — ננסה מחר'); }
      if (!l.won && !l.lost && r < 0.75) {
        tasks(l).forEach((t) => l.done.push(t.key));   // someone who was spoken to has one step ahead, not the old ones
        // N8: a lead whose quote went out follows it up — he is not asked to prepare it again.
        const step = l.stage === 'quote' || l.stage === 'nego' ? { type: 'call', label: 'לבדוק אם קיבל את ההצעה', days: 3 } : normStep({ type: ['call', 'meet', 'quote'][rnd(3)] });
        addManual(l, step, H.addDays(new Date(now()), rnd(7) - 2).getTime());
      }
      l.log.sort((a, b) => a.at - b.at);
    });
    save();
  }

  // ---- settings: stages, after a sale, the morning message ----
  function viewCrmSettings(m) {
    const b = S.biz;
    m.innerHTML = `<h1>שלבי המכירה ${help('stages')}</h1>
      <div class="stack" style="margin-top:14px">
        <section class="card"><h2>שלבי הצינור</h2><p class="muted">אפשר לשנות שמות. "נסגרה עסקה" ו"לא נסגרה" תמיד בסוף. רשימת התפוצה אינה שלב: היא נפרדת, ואפשר להיות בה בכל שלב.</p>
          <div class="step-list">${b.stages.map((s, i) => `<div class="stage-line"><input class="text-input" data-stname="${s.id}" value="${esc(s.name)}" aria-label="שם השלב">
            ${s.kind ? `<span class="faint">${s.kind === 'won' ? 'סגירה' : 'בלי עסקה'}</span>`
 : `<button class="btn ghost" data-stmove="${i}:-1" aria-label="למעלה" ${i ? '' : 'disabled'}>▲</button><button class="btn ghost" data-stmove="${i}:1" aria-label="למטה" ${b.stages[i + 1] && !b.stages[i + 1].kind ? '' : 'disabled'}>▼</button><button class="btn ghost danger" data-stdel="${s.id}" aria-label="למחוק">✕</button>`}</div>`).join('')}</div>
          <div class="add-row"><input id="new-stage" class="text-input" placeholder="+ שלב חדש" autocomplete="off"><button class="btn" data-act="stage-add">הוספה</button></div></section>
        <section class="card"><h2>אחרי עסקה שנסגרה</h2><p class="muted">בדיקה אחת: איך היה? לקוח מרוצה — זה הרגע להציע את ההזמנה הבאה.</p>
          <div class="chips">${[[0, "לא לבדוק"], [3, "אחרי 3 ימים"], [7, "אחרי שבוע"], [14, "אחרי שבועיים"], [30, "אחרי חודש"]].map(([d, t]) => `<button class="chip" data-aftersale="${d}" aria-pressed="${b.afterSale === d}">${t}</button>`).join("")}</div></section>
      </div>`;
  }

  // ------------------------------------------------------------------
  // "?" beside every step and part of a screen (יצחק, 17/10): a tap on a tablet, a click on a computer —
  // what it is and what it does, in two or three sentences. Not a tour that stands in his way.
  // ------------------------------------------------------------------
  const HELP = {
    account: ['פרטי העסק', 'השם שלך ושם העסק מופיעים בהודעות שיוצאות למבקרים. טלפון העסק — לשם מגיעה הודעת הבוקר בוואטסאפ, אם תבחר בה. אם הוואטסאפ שלך על מספר אחר, כתוב אותו בשדה השני.'],
    biz: ['ספר על העסק', 'כתוב כמו שהיית מספר ללקוח: מה אתה מוכר, למי, ואיך מתחילים לעבוד איתך. מזה המערכת בונה את הכפתורים בדוכן ואת המשימות שאחריהם. אפשר לשנות כל דבר אחר כך.'],
    preview: ['כך ייראה הכרטיס בדוכן', 'זה הכרטיס שייפתח לכל מבקר. ב"לנסות" — נגע בכפתורים וראה מה המערכת תעשה אחר כך. ב"לערוך" — נגיעה בכפתור פותחת אותו: לשנות שם, משימות, לסמן ⭐ חשוב, או להסיר.'],
    send: ['מה שולחים למבקר', 'מה שמבקש בדוכן קטלוג או מחירון — מקבל אותו בנגיעה. כאן בוחרים איך זה מגיע אליו, מה מצורף, ומה כתוב בהודעה.'],
    channels: ['איך שולחים', 'מייל יוצא תמיד, כי כמעט לכולם יש. וואטסאפ — למי שיש לו, גם על מספר כשר. SMS — רק למי שמסר מספר נוסף, כי לטלפון כשר SMS לא מגיע. כל הודעה יוצאת בכל הדרכים שבחרת.'],
    auto: ['מה המערכת עושה לבד', 'דברים שקורים בלי שתבקש: משימה כשעוברים ימים בלי קשר, תזכורת בהודעת הבוקר, ועוד. "פעילים" — מה שפועל עכשיו. "הצעות" — כללים מוכנים שאפשר להדליק בנגיעה.'],
    cold: ['כשסימנת "לא עכשיו"', 'רק אתה יודע מה התכוונת כשסימנת את הדרגה השלישית. לכן המערכת לא מחליטה לבד: היא שואלת אותך בסוף היום, או עושה מה שבחרת כאן מראש.'],
    noans: ['כשמבקר לא ענה', 'אחרי שיחה שלא נענתה המערכת מנסה שוב ביום העבודה הבא. בפעם השלישית היא עושה מה שבחרת: שואלת אותך, מנסה שוב בעוד שבוע, או מפסיקה את המעקב.'],
    btnrules: ['מה הכפתורים עושים', 'כל כפתור בדוכן הוא בעצם כלל: כשמסמנים אותו, המערכת קובעת משימה או שולחת הודעה. כאן רואים את כולם במקום אחד. משנים בנגיעה על השורה.'],
    boothset: ['הדוכן', 'איך הכרטיס של המבקר מתנהג: איך קוראים לשלוש דרגות החום, כמה זמן הוא נשאר פתוח לפני שהוא נסגר לבד, ומה קורה עם מי שכבר ביקר.'],
    collect: ['גם לאסוף לרשימת התפוצה', 'כבוי, אלא אם אתה רוצה בזה. כשהוא דלוק, בכרטיס יש כפתור "רק לרשימת התפוצה": המבקר נרשם כדי לקבל ממך הודעות, אבל הוא לא ליד — אין לו משימות ואין אחריו מעקב.'],
    stages: ['שלבי המכירה', 'איפה כל ליד עומד: מליד חדש ועד עסקה. "נסגרה עסקה" ו"לא נסגרה" מסיימים את המעקב. רשימת התפוצה היא דבר נפרד: לקוח יכול להיות בה בכל שלב.'],
    digest: ['הודעת הבוקר', 'כל בוקר, בשעה שבחרת: מי מחכה לך היום, מה באיחור, ומה המערכת עשתה לבד. נשלחת אליך בלבד.'],
    messages: ['הודעות', 'כל מה שיוצא למבקר הוא הודעה עם שם, ואפשר לצרף לה קובץ. הודעה אחת היא ברירת המחדל בדוכן: כפתור השליחה בכרטיס המבקר שולח אותה בנגיעה. בלי ברירת מחדל — ההודעות מופיעות ככפתורים קטנים, ובוחרים.'],
    buttons: ['כפתורים ומשימות', 'הכפתורים שבכרטיס, בקבוצות. מאחורי כל כפתור יש משימה אחת או יותר. שינוי באמצע התערוכה חל על המבקרים הבאים, והמערכת שואלת אם להחיל אותו גם על הקיימים.'],
    seasons: ['עונות', 'התקופות שבהן קונים ממך הכי הרבה, לפי הלוח העברי. ליד שנשמר "לעונה" חוזר אליך כמה שבועות לפני שהיא מתחילה.'],
    booth: ['הדוכן', 'כמה אותיות מהשם, ונגיעה בשם — הוא נשמר. כל השאר רשות: החום, הכפתורים, הערה. הכרטיס נסגר לבד אחרי כמה שניות בלי נגיעה, או ב"✓ סיום". מי שלא ברשימה — "＋ מבקר חדש".'],
    next: ['מה הלאה', 'מה המערכת תעשה עם המבקר הזה, לפי הכפתורים שסימנת. בדוכן רק רואים אותו; משנים בסוף היום או ב-CRM.'],
    dash: ['סוף היום', 'מה שנשאר להשלים מהיום, כל עוד הזיכרון טרי: מי לא סומן, מי סומן חלקית, ומה לעשות עם מי שסימנת "לא עכשיו".'],
    home: ['דף הבית', 'מה מחכה לך היום, והבא בתור: ליד אחד, עם מה שצריך לעשות איתו. נגיעה במספר פותחת את הרשימה שלו.'],
  };
  const help = (k) => (HELP[k] ? `<button class="help" data-help="${k}" aria-label="הסבר: ${esc(HELP[k][0])}">?</button>` : '');
  /* The explanation opens beside the "?" when the mouse rests on it (יצחק, 17/10), and on a tablet with a tap;
   * it closes when the mouse leaves, or with a tap anywhere else. It never covers the screen like a dialog. */
  let helpFor = null;
  function showHelp(b) {
    hideHelp();
    const h = HELP[b.dataset.help];
    if (!h) return;
    const p = document.createElement('div');
    p.id = 'helppop'; p.className = 'helppop'; p.setAttribute('role', 'tooltip');
    p.innerHTML = `<b>${esc(h[0])}</b><span>${esc(h[1])}</span>`;
    document.body.appendChild(p);
    const r = b.getBoundingClientRect();
    const w = Math.min(320, innerWidth - 24);
    p.style.width = w + 'px';
    p.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
    const below = r.bottom + 8;
    p.style.top = (below + p.offsetHeight > innerHeight - 8 ? Math.max(8, r.top - p.offsetHeight - 8) : below) + 'px';
    helpFor = b;
  }
  function hideHelp() { const p = $('#helppop'); if (p) p.remove(); helpFor = null; }
  if (FINE) document.addEventListener('mouseover', (e) => {
    const b = e.target.closest && e.target.closest('.help');
    if (b && b !== helpFor) showHelp(b);
    else if (!b && helpFor && !(e.target.closest && e.target.closest('#helppop'))) hideHelp();
  });
  window.addEventListener('scroll', hideHelp, { passive: true });

  // ------------------------------------------------------------------
  // The assistant (יצחק, 17/10): one panel, everywhere but the booth. It knows where he is; it answers, and in the
  // settings it may propose a change — which happens only when he taps "להחיל". It never acts by itself.
  // ------------------------------------------------------------------
  const AS = { open: false, msgs: [], busy: false };
  function assistCtx() {
    if (S.phase === 'settings') {
      const subs = S.step === 'details' ? SUBS_DET : SUBS_HOW;
      { const s = (subs.find(([k]) => k === S.sub) || [, ''])[1]; return { kind: 'settings', where: 'ההגדרות · ' + s, at: 'הגדרות · ' + s }; }
    }
    if (S.view === 'crm') { const t = (CRM_TABS.find(([k]) => k === S.crmTab) || [, ''])[1]; return { kind: 'crm', where: 'ה-CRM · ' + t, at: '-CRM · ' + t }; }
    if (S.view === 'dash') return { kind: 'dash', where: 'סוף היום', at: 'סוף היום' };
    return { kind: 'other', where: 'המערכת', at: 'מערכת' };
  }
  const AS_SUGGEST = {
    settings: ['מה כדאי לשנות אצלי לפני התערוכה?', 'איך לוודא שאף ליד חשוב לא יישכח?'],
    crm: ['למי כדאי להתקשר קודם היום?', 'מה מצב הלידים שלי?'],
    dash: ['איך היה היום?', 'מה הכי חשוב להשלים עכשיו?'],
    other: ['מה אפשר לעשות כאן?'],
  };
  /* In the CRM the agent does not wait to be asked (יצחק, 17/10: "gives advice, reports what was missed"): it opens
   * with what it noticed — counted from the data, not guessed — each with the way to the leads it means. */
  function crmMisses() {
    const L = crmLeads();
    const t0 = dayNo(now());
    const out = [];
    const late = L.filter((l) => { const p = plan(l); return tasks(l).length && p.due && dayNo(p.due.getTime()) < t0; });
    if (late.length) out.push({ text: `${many(late.length, 'משימה אחת באיחור', 'משימות באיחור')}.`, act: 'go-today', go: 'לרשימה' });
    const hot = L.filter((l) => effWarm(l) === 0 && isOpenLead(l) && !reached(l) && t0 - dayNo(l.at) >= 2);
    if (hot.length) out.push({ text: `${hot.length === 1 ? 'ליד אחד שסימנת' : hot.length + ' לידים שסימנת'} "${words()[0]}" — ועוד לא היה איתם קשר. מהירות החזרה היא מה שהכי משפיע על סגירה.`, act: 'miss-hot', go: 'להציג' });
    const decide = L.filter(undecided);
    if (decide.length) out.push({ text: decide.length === 1 ? 'אחד מחכה שתחליט מה איתו.' : decide.length + ' מחכים שתחליט מה איתם.', act: 'go-decide', go: 'להחליט' });
    const twice = L.filter((l) => (l.noAnswer || 0) >= 2 && tasks(l).length && !l.sent.length);
    if (twice.length) out.push({ text: `${twice.length === 1 ? 'אחד לא ענה' : twice.length + ' לא ענו'} פעמיים, ועוד לא קיבלו ממך הודעה. אולי הודעה במקום עוד שיחה.`, act: 'view-noanswer', go: 'להציג' });
    const noPhone = L.filter((l) => { const p = plan(l); return tasks(l).length && ['call', 'meet'].includes(p.type) && !l.contact.phone; });
    // The samples have no phone by design (17/10): not a miss.
    if (noPhone.length && !practice()) out.push({ text: `${noPhone.length === 1 ? 'לאחד יש' : 'ל-' + noPhone.length + ' יש'} שיחה מתוכננת — ואין טלפון.`, act: 'go-today', go: 'לרשימה' });
    return out;
  }
  function renderAssist() {
    // The agent lives in the shell's panel (20/10): beside the menu on a computer, a dialog in the middle on a tablet.
    const p = $('#panel');
    if (UI.panel !== 'ai' || !p) return;
    const c = assistCtx();
    const chg = (x, mi, ci) => `<div class="as-change"><span>${esc(changeText(x))}${x.why ? `<small>${esc(x.why)}</small>` : ''}</span>
      ${x.done ? '<span class="faint">✓ הוחל</span>' : `<button class="btn" data-asapply="${mi}:${ci}">להחיל</button>`}</div>`;
    const msg = (x, mi) => `<div class="as-msg ${x.who}">${esc(x.text)}${(x.changes || []).map((y, ci) => chg(y, mi, ci)).join('')}</div>`;
    p.innerHTML = `<div class="p-head as-head">${ic('spark')}<div><h2>סוכן AI</h2><div class="faint">אתה ב${esc(c.at)}</div></div><button class="icon-btn p-close" data-act="panel-close" aria-label="סגירה">✕</button></div>
      <div class="as-body" id="as-body">${c.kind === 'crm' ? (() => { const ms = crmMisses(); return `<section class="as-miss"><b>מה שמתי לב אליו</b>${ms.length ? ms.map((x) => `<div class="as-item"><span>${esc(x.text)}</span><button class="btn" data-act="${x.act}">${esc(x.go)}</button></div>`).join('') : '<p class="faint">לא פספסת כלום. הכל בזמן.</p>'}</section>`; })() : ''}
        ${AS.msgs.length ? AS.msgs.map(msg).join('') : `<p class="muted">אפשר לשאול כל דבר על המערכת ועל הלידים שלך.${c.kind === 'settings' ? ' בהגדרות אני גם מציע שינויים — והם קורים רק כשתלחץ "להחיל".' : ''}</p>`}
        ${AS.busy ? '<div class="as-msg ai faint">חושב…</div>' : ''}
        ${!AS.msgs.length ? `<div class="chips">${(AS_SUGGEST[c.kind] || AS_SUGGEST.other).map((q) => `<button class="chip" data-asq="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}</div>
      ${ai ? `<form class="as-ask" data-askform><input id="as-q" class="text-input" placeholder="לשאול משהו…" aria-label="שאלה לעוזר" autocomplete="off"><button class="btn primary" data-act="assist-ask" ${AS.busy ? 'disabled' : ''}>לשאול</button></form>`
        : '<p class="as-off">הסוכן לא מחובר בהדגמה הזו. במערכת האמיתית הוא עונה כאן על כל שאלה, ובהגדרות גם מציע שינויים שאפשר להחיל בנגיעה.</p>'}`;
    const body = $('#as-body');
    if (body) body.scrollTop = body.scrollHeight;
  }
  const SET_KEYS = {
    idleSec: { ok: (v) => [8, 12, 15, 20, 30].includes(+v), text: (v) => 'הכרטיס בדוכן נשאר פתוח ' + v + ' שניות', set: (v) => { S.biz.idleSec = +v; } },
    coldDo: { ok: (v) => COLD_DO.some(([k]) => k === v), text: (v) => 'כשסימנת "' + words()[2] + '": ' + COLD_DO.find(([k]) => k === v)[1], set: (v) => { S.biz.coldDo = v; } },
    noAnsDo: { ok: (v) => NOANS_DO.some(([k]) => k === v), text: (v) => 'כשלא ענה 3 פעמים: ' + NOANS_DO.find(([k]) => k === v)[1], set: (v) => { S.biz.noAnsDo = v; } },
    hideVisited: { ok: (v) => typeof v === 'boolean', text: (v) => (v ? 'להסתיר' : 'להראות') + ' בחיפוש את מי שכבר ביקר', set: (v) => { S.biz.hideVisited = v; } },
    collectList: { ok: (v) => typeof v === 'boolean', text: (v) => (v ? 'להדליק' : 'לכבות') + ' את "גם לאסוף לרשימת התפוצה"', set: (v) => { S.biz.collectList = v; } },
    digestHour: { ok: (v) => /^(06|07|08|09|10|12):00$/.test(v), text: (v) => 'הודעת הבוקר בשעה ' + v, set: (v) => { S.biz.digest.hour = v; } },
  };
  function changeText(x) {
    if (x.kind === 'setting') return SET_KEYS[x.key].text(x.value);
    const r = ruleText({ trigger: x.trigger, arg: x.arg, cond: {}, action: x.action });
    return 'כלל חדש: ' + r.when + ' ← ' + r.then;
  }
  /** Only what the system knows how to do comes through: a known setting with a valid value, or a rule of a known shape. */
  function cleanChange(x) {
    if (!x || typeof x !== 'object') return null;
    const why = str(x.why, 160);
    if (x.kind === 'setting' && SET_KEYS[x.key] && SET_KEYS[x.key].ok(x.value)) return { kind: 'setting', key: x.key, value: x.value, why };
    if (x.kind === 'rule' && TRIGGERS[x.trigger] && x.action && ['step', 'notify'].includes(x.action.kind)) {
      const arg = x.trigger === 'noanswer' ? Math.max(1, Math.min(3, +x.arg || 2)) : x.trigger === 'idle' ? Math.max(3, Math.min(30, +x.arg || 7)) : x.trigger === 'stage' ? (S.biz.stages.some((s) => s.id === x.arg) ? x.arg : null) : null;
      if (x.trigger === 'stage' && !arg) return null;
      const action = x.action.kind === 'notify' ? { kind: 'notify' } : { kind: 'step', type: ['call', 'meet', 'quote', 'send'].includes(x.action.type) ? x.action.type : 'call', days: Math.max(0, Math.min(7, +x.action.days || 1)) };
      return { kind: 'rule', trigger: x.trigger, arg, action, why };
    }
    return null;
  }
  async function askAssist(q) {
    if (!ai || !q || AS.busy) return;
    AS.msgs.push({ who: 'me', text: q });
    AS.busy = true; renderAssist();
    const c = assistCtx();
    const L = leadsNow().filter((l) => !l.listOnly);
    const b = S.biz;
    const settings = { cardOpenSeconds: b.idleSec, coldMeans: b.coldDo, thirdNoAnswer: b.noAnsDo || 'ask', hideVisited: b.hideVisited, collectList: !!b.collectList, morningHour: b.digest.hour,
      warmthWords: words(), buttons: b.buttons.map((x) => x.label + ' → ' + stepsText(stepsOf(x))), rules: (b.rules || []).map((r) => (r.on ? 'ON: ' : 'OFF: ') + ruleText(r).when + ' → ' + ruleText(r).then) };
    const prompt = `You are the assistant inside "דוכן חכם", a lead-capture and follow-up tool for exhibitors at a Hasidic community business fair in Israel. The exhibitor is now in: ${c.where}.
Answer in Hebrew, short and plain: the users are 35 to 65 and not technical. Never invent data; if the data cannot answer, say so plainly. Never write a lead's number.
His business: ${b.name || 'not named'} (${b.trade || 'trade not given'}). His goal at the fair: ${b.goalNote || b.goal || 'not given'}. Today: ${H.label(new Date(now()))}.
His settings (JSON): ${JSON.stringify(settings)}
${c.kind === 'crm' || c.kind === 'dash' ? `His leads (JSON, the latest 60, by number only): ${JSON.stringify(L.slice(-60).map(leadFacts))}` : `He has ${L.length} leads.`}
The conversation so far: ${JSON.stringify(AS.msgs.slice(-6).map((m) => ({ [m.who === 'me' ? 'exhibitor' : 'assistant']: m.text })))}
Reply with ONLY JSON: {"answer":"one to four short Hebrew sentences","changes":[]}
${c.kind === 'settings' ? `You may propose up to 3 changes, only if they really help him, each with "why" (one Hebrew sentence). Allowed:
{"kind":"setting","key":"idleSec","value":8|12|15|20|30} · {"kind":"setting","key":"coldDo","value":"ask"|"list"|"tasks"} · {"kind":"setting","key":"noAnsDo","value":"ask"|"week"|"end"} · {"kind":"setting","key":"hideVisited","value":true|false} · {"kind":"setting","key":"collectList","value":true|false} · {"kind":"setting","key":"digestHour","value":"06:00"|"07:00"|"08:00"|"09:00"|"10:00"|"12:00"} · {"kind":"rule","trigger":"noanswer"|"idle"|"stage"|"won"|"captured","arg":number of times, days, or a stage id from ${JSON.stringify(b.stages.map((s) => s.id))},"action":{"kind":"step","type":"call"|"meet"|"quote"|"send","days":1-7} or {"kind":"notify"}}.
A change happens only if he taps "apply" — say so in the answer only if you propose one.` : 'Outside the settings, "changes" is always [].'}`;
    try {
      const r = await ai.json(prompt, { modelTier: 'default' });
      const changes = c.kind === 'settings' && Array.isArray(r && r.changes) ? r.changes.slice(0, 3).map(cleanChange).filter(Boolean) : [];
      AS.msgs.push({ who: 'ai', text: str(r && r.answer, 900) || 'לא התקבלה תשובה.', changes });
    } catch (e) { AS.msgs.push({ who: 'ai', text: 'לא הצלחתי לענות עכשיו. אפשר לנסות שוב.' }); aiFailed(e); }
    AS.busy = false; renderAssist();
  }
  function applyChange(mi, ci) {
    const m = AS.msgs[mi];
    const x = m && m.changes && m.changes[ci];
    if (!x || x.done) return;
    if (x.kind === 'setting') SET_KEYS[x.key].set(x.value);
    else S.biz.rules.push({ id: 'r' + Date.now(), on: true, src: 'ai', trigger: x.trigger, arg: x.arg, cond: {}, action: x.action, fired: 0 });
    x.done = true;
    save(); render(); renderAssist();
    toast('✓ הוחל · ' + changeText(x));
  }

  /** "✨ תכתוב לי" (יצחק, 17/10): he says in a few words what the message is about; the words of the message are written for him, to change as he likes. */
  async function writeTemplate() {
    if (!ai) return;
    const ask = ($('#tp-ask') && $('#tp-ask').value.trim()) || '';
    if (!ask) { if ($('#tp-ask')) $('#tp-ask').focus(); return toast('על מה ההודעה?'); }
    const btn = $('#tp-write');
    if (btn) { btn.disabled = true; btn.textContent = 'כותב…'; }
    const pm = document.querySelector('[data-tpmat][aria-pressed="true"]');
    const mat = pm ? pm.dataset.tpmat : '';
    const prompt = `Write a short message in Hebrew from an exhibitor at a Hasidic community business fair in Israel to a visitor of his booth.
The business: ${S.biz.name || 'not named'} (${S.biz.trade || 'trade not given'}).
What the message is about, in his words: """${ask.slice(0, 300)}"""
${mat ? 'A file is attached, named "' + mat + '": mention it with the placeholder {קובץ}.' : 'No file is attached: never say "attached".'}
Write in the community's respectful, warm and plain register: two to four short sentences. Begin with "שלום {שם}," — {שם} becomes the visitor's name, and {עסק} the business name. No emoji, no English.
Reply with ONLY JSON: {"name":"2 to 4 Hebrew words naming the message","text":"the message"}`;
    try {
      const r = await ai.json(prompt, { modelTier: 'quick' });
      const ta = $('#tp-text');
      if (ta && r && r.text) ta.value = str(r.text, 600);
      const nm = $('#tp-name');
      if (nm && !nm.value.trim() && r && r.name) nm.value = str(r.name, 30);
    } catch (e) { aiFailed(e); }
    finally { const b2 = $('#tp-write'); if (b2) { b2.disabled = false; b2.textContent = '✨ לכתוב שוב'; } }
  }

  // ------------------------------------------------------------------
  // Where the system is — Yitzhak's switch, in the demo's menu (17/10): samples until it goes real, then real, then after the fair.
  // ------------------------------------------------------------------
  const SYS_NAMES = { demo: 'לפני התערוכה · נתוני דוגמה', real: 'אמיתי · התערוכה', after: 'אחרי התערוכה · CRM בלבד' };
  function sheetSys() {
    sheet(`<h2>מצב המערכת</h2>
      <p class="muted">במערכת האמיתית רק יצחק מחליף את המצב, לכל המציגים יחד. כאן, בהדגמה, אפשר לנסות.</p>
      <div class="opts">${Object.entries(SYS_NAMES).map(([k, t]) => `<button class="opt" data-sys="${k}" aria-pressed="${S.sys === k}">${esc(t)}<small>${{
        demo: 'הדוכן, סוף היום וה-CRM — עם נתוני דוגמה וכפתורים להוסיף עוד.',
        real: 'נתוני הדוגמה נמחקים, וכל מציג מקבל הודעה. מעכשיו כל מבקר נשמר באמת.',
        after: 'יום-יומיים אחרי התערוכה: הדוכן נעלם, ונשאר ה-CRM.' }[k]}</small></button>`).join('')}</div>
      <div class="actions"><button class="btn ghost" data-act="sheet-close">סגירה</button></div>`);
  }
  function setSys(k) {
    if (k === S.sys) return closeSheet(false);
    const n = S.leads.filter((l) => l.practice).length;
    if (k === 'real' && S.sys === 'demo') {
      S.leads = S.leads.filter((l) => !l.practice);
      notify('המערכת עברה למצב אמיתי. נתוני הדוגמה נמחקו' + (n ? ` (${n})` : '') + ', ומעכשיו כל מבקר שתרשום נשמר באמת. בהצלחה!', true);
      S.view = 'booth';
    } else if (k === 'after') {
      notify('התערוכה הסתיימה. הדוכן נסגר, וכל הלידים שלך מחכים ב-CRM. שם עובדים מעכשיו.', true);
      S.view = 'crm';
    } else if (k === 'demo') {
      notify('המערכת חזרה למצב הדגמה (רק בהדגמה הזו).', false);
      S.view = 'booth';
    } else S.view = 'booth';
    S.sys = k; S.phase = 'live'; S.crmLead = null; openId = null; stopIdle();
    if (k !== 'demo') idleOnce();
    save(); closeSheet(false); render(); window.scrollTo(0, 0);
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
  /** A question before an act. The yes button says what happens ("להחליף", "למחוק הכל"), never just "כן". */
  function sheetConfirm(title, text, act, extra, yes) {
    sheet(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
      <div class="opts"><button class="opt danger" data-act="${act}" ${extra || ''}>${esc(yes || 'כן')}</button><button class="opt" data-act="sheet-close">ביטול</button></div>`);
  }
  function sheetDevices() {
    sheet(`<h2>להוסיף טאבלט</h2>
      <p class="muted">בטאבלט השני פותחים את הקישור או סורקים, ובוחרים מי משתמש בו. שני הטאבלטים רואים את אותם לידים.</p>
      <div class="join-mock"><div class="qr" aria-hidden="true"></div><div class="faint">הקישור יופיע כאן</div>
        <button class="btn" data-act="join" style="margin-top:10px">לדמות חיבור של טאבלט</button></div>
      <div class="label">הטאבלט הזה</div>
      <div class="opts"><button class="opt" data-devrole="owner" aria-pressed="${!worker()}">בעל הדוכן<small>רואה הכל, משנה הגדרות</small></button>
        <button class="opt" data-devrole="worker" aria-pressed="${worker()}">עובד<small>רושם, מסמן ושולח — בלי הגדרות ובלי מחיקה</small></button></div>
      <p class="faint" style="margin-top:10px">מחוברים: ${S.biz.devices} ${S.biz.devices === 1 ? 'טאבלט' : 'טאבלטים'}.</p>`);
  }
  function toggleMenu() {
    const old = $('#menu');
    if (old) { old.remove(); if (openId && $('#slot')) startIdle(); return; }
    stopIdle();
    const m = document.createElement('div');
    m.className = 'menu'; m.id = 'menu';
    m.innerHTML = [
      !worker() && S.phase !== 'settings' ? '<button data-act="settings">⚙️ הגדרות</button>' : '',
      afterFair() ? '' : '<button data-act="devices">להוסיף טאבלט</button>',
      '<div class="menu-sep">הדגמה בלבד</div>',
      // To see the tablet on a computer, and back (20/10).
      `<button data-act="ui-desk" aria-pressed="${DEV.ui === 'desk'}">תצוגת מחשב</button>`,
      `<button data-act="ui-tab" aria-pressed="${DEV.ui === 'tab'}">תצוגת טאבלט</button>`,
      `<button data-act="ui-auto" aria-pressed="${!DEV.ui}">תצוגה לפי המכשיר</button>`,
      '<button data-act="sys">מצב המערכת (של יצחק)</button>',
      '<button data-act="demo-notice">לשלוח הודעת מערכת דחופה</button>',
      '<button data-act="sign-out">יציאה מהחשבון</button>',
      '<button data-act="reset">איפוס מערכת</button>',
    ].join('');
    $('#demo').appendChild(m);
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
    const before = JSON.parse(JSON.stringify(S));
    change();
    save();
    const after = JSON.parse(JSON.stringify(S));
    // Undo takes back THIS action only (K4): what changed between before and after is put back,
    // and anything that changed since — another lead captured, another tablet — stays.
    toast(text, () => { revert(S, before, after); save(); closeSheet(false); render(); toast('בוטל'); });
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const byIds = (a) => Array.isArray(a) && a.length > 0 && a.every((x) => isObj(x) && x.id != null);
  /** Put back in `cur` what one action changed from `before` to `after`, leaving every other change alone. */
  function revert(cur, before, after) {
    new Set(Object.keys(before).concat(Object.keys(after))).forEach((k) => {
      const b = before[k];
      const a = after[k];
      if (same(a, b)) return;
      const c = cur[k];
      if (isObj(b) && isObj(a) && isObj(c)) return revert(c, b, a);
      // Lists of things with an id (leads, buttons, messages, rules): by id, so a lead added since stays.
      if ((byIds(b) || byIds(a)) && Array.isArray(c) && (!b || Array.isArray(b)) && (!a || Array.isArray(a))) {
        const bs = b || [];
        const as = a || [];
        const ids = (xs) => new Set(xs.map((x) => x.id));
        const aIds = ids(as);
        const bIds = ids(bs);
        let out = c.filter((x) => !(aIds.has(x.id) && !bIds.has(x.id)));                 // added by the action: out
        bs.forEach((x, i) => { if (!aIds.has(x.id) && !out.some((y) => y.id === x.id)) out.splice(Math.min(i, out.length), 0, JSON.parse(JSON.stringify(x))); });   // removed: back
        out.forEach((x) => { const xb = bs.find((y) => y.id === x.id); const xa = as.find((y) => y.id === x.id); if (xb && xa && !same(xb, xa)) revert(x, xb, xa); });
        cur[k] = out;
        return;
      }
      // Other lists (tags, done steps, the log): by content, so a tag tapped or a line logged since stays.
      if ((!b || Array.isArray(b)) && (!a || Array.isArray(a)) && Array.isArray(c)) {
        const bs = (b || []).map((x) => JSON.stringify(x));
        const as = (a || []).map((x) => JSON.stringify(x));
        const added = as.filter((x) => !bs.includes(x));
        const removed = bs.filter((x) => !as.includes(x));
        const cs = c.map((x) => JSON.stringify(x));
        cur[k] = c.filter((x, i) => !added.includes(cs[i])).concat(removed.filter((x) => !cs.includes(x)).map((x) => JSON.parse(x)));
        return;
      }
      // Anything else: put it back only if no one changed it since.
      if (same(c, a)) { if (b === undefined) delete cur[k]; else cur[k] = JSON.parse(JSON.stringify(b)); }
    });
  }

  // ------------------------------------------------------------------
  // Typing, and clicks
  // ------------------------------------------------------------------
  // The WhatsApp question names the phone he typed: it is asked again with the new number once he leaves the field.
  document.addEventListener('change', (e) => { const d = e.target.dataset || {}; if (d.acc === 'phone' && S.account.hasWa) render(); });
  document.addEventListener('input', (e) => {
    const d = e.target.dataset || {};
    if (d.roleof) { const l = leadById(+d.roleof); if (l) { l.roleOf = e.target.value.trim(); save(); } }
    if (d.eventdate) { const l = leadById(+d.eventdate); if (l) { l.eventDate = e.target.value; log(l, '📅 תאריך השמחה: ' + (l.eventDate ? H.heDate(new Date(l.eventDate + 'T09:00')) : '—')); save(); refreshLead(l); } }
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
      l.contact[d.lf] = e.target.value.trim();
      save();
    }
    if (d.stname) { const s = S.biz.stages.find((x) => x.id === d.stname); if (s) { s.name = e.target.value.trim() || s.name; save(); } }

  });
  /* Selects, checkboxes and files report on "change". */
  document.addEventListener('change', (e) => {
    const t = e.target;
    const d = t.dataset || {};
    if (d.tbf) { S.tb.f[d.tbf] = t.value; tbPage = 0; tbSel.clear(); save(); return render(); }
    if (d.pv) { PV[d.pv] = t.value; return render(); }
    if (d.rd) return readRuleField(d.rd, t.value);
    if (d.lstage) { const l = leadById(+d.lstage); if (l) { setStage(l, t.value, 'ידני'); save(); render(); sheetCRM(l); } return; }
    if (d.chdef) { S.biz.chDefault = Object.assign({}, S.biz.chDefault, { [d.chdef]: t.value }); save(); return toast('נשמר'); }
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
    if (helpFor && !(b && b.classList.contains('help')) && !e.target.closest('#helppop')) hideHelp();
    // A dashboard list that is open closes on a tap outside it — before the tap does whatever else it does.
    const outside = fillOpen && S.phase === 'live' && S.view === 'dash' && !e.target.closest('.ask-card.open') && !e.target.closest('#scrim') && !e.target.closest('#toast');
    if (outside && (!b || b.dataset.act !== 'fill-open')) { fillOpen = false; render(); if (!b) return; }
    if (!b) { const mn = $('#menu'); if (mn && !e.target.closest('#menu')) { mn.remove(); if (openId && $('#slot')) startIdle(); } return; }
    const d = b.dataset;
    if (!b.closest('#menu') && d.act !== 'menu') { const mn = $('#menu'); if (mn) mn.remove(); }
    if (openId && b.closest('.lead')) startIdle();
    const L = d.lid ? leadById(+d.lid) : null;

    // The evening list: a tap that changes what was already marked asks first (יצחק, 13/10). Yes replays the same tap.
    if (d.ask && !askOk && L) {
      const was = d.warm !== undefined ? words()[effWarm(L)] : '';
      const t = d.tag ? btnById(d.tag) : null;
      const other = t && !L.tags.includes(t.id) ? L.tags.map(btnById).find((o) => o && o.axis === t.axis) : null;
      const q = d.warm !== undefined ? `לשנות את החום של ${People.rowName(L)} מ"${was}" ל"${words()[+d.warm]}"?`
        : other ? `להחליף אצל ${People.rowName(L)} את "${other.label}" ב"${t.label}"?` : `להוריד מ${People.rowName(L)} את "${t ? t.label : ''}"?`;
      pendingAsk = d.warm !== undefined ? `[data-warm="${d.warm}"][data-lid="${L.id}"]` : `[data-tag="${d.tag}"][data-lid="${L.id}"]`;
      return sheet(`<h2>${esc(q)}</h2><p class="muted">זה סומן כבר בדוכן.</p>
        <div class="actions"><button class="btn primary" data-act="ask-yes">כן, לשנות</button><button class="btn" data-act="sheet-close">לא</button></div>`);
    }

    if (d.nav) { const [v, t] = d.nav.split(':'); return goPlace(v, t); }
    if (d.panel) return openPanel(d.panel);
    if (d.view === 'crm' && worker()) return ownerOnly('המעקב');
    if (d.view) { S.view = d.view; closeLead(); closeHeld(); closeSheet(false); fillOpen = false; filled.clear(); fillSnap = {}; filledCold.clear(); if (d.view === 'crm') idleOnce(); save(); render(); return window.scrollTo(0, 0); }
    if (d.step) { S.step = d.step; if (S.step === 'messages') S.sub = 'messages'; if (S.step === 'custom') S.sub = SUBS_HOW[0][0]; openId = null; stopIdle(); save(); render(); return window.scrollTo(0, 0); }
    // The settings' two parts. In the setup a part is a step: details opens at "הודעות" (יצחק, 20/10).
    if (d.part) {
      if (S.phase === 'setup') { S.step = d.part === 'details' ? 'messages' : 'custom'; S.sub = d.part === 'details' ? 'messages' : SUBS_HOW[0][0]; S.setupReach = Math.max(S.setupReach || 0, SETUP.findIndex(([k]) => k === S.step)); }
      else { S.step = d.part; S.sub = (d.part === 'details' ? SUBS_DET : SUBS_HOW)[0][0]; }
      save(); render(); return window.scrollTo(0, 0);
    }
    if (d.uiset) { DEV.ui = d.uiset === 'auto' ? null : d.uiset; save(); return render(); }
    if (d.haswa) { S.account.hasWa = d.haswa === '1'; if (!S.account.hasWa) { S.biz.channels.wa = false; S.account.waSame = null; } save(); return render(); }
    if (d.wasame) { S.account.waSame = d.wasame === '1'; save(); return render(); }
    if (d.sub) { S.sub = d.sub; save(); render(); return window.scrollTo(0, 0); }
    if (d.help) { if (helpFor === b) hideHelp(); else showHelp(b); return; }
    // The booth card in the business step: try it, or edit its buttons in place.
    if (d.pvmode) { PVW.mode = d.pvmode; return renderPreview(); }
    if (d.pvtag) { const t = btnById(d.pvtag); if (!t) return; if (PVW.tags.includes(t.id)) PVW.tags = PVW.tags.filter((x) => x !== t.id); else { const g = groupById(t.axis); if (!g || !g.multi) PVW.tags = PVW.tags.filter((x) => { const o = btnById(x); return !o || o.axis !== t.axis; }); PVW.tags.push(t.id); } return renderPreview(); }
    if (d.pvwarm !== undefined) { PVW.warm = PVW.warm === +d.pvwarm ? null : +d.pvwarm; return renderPreview(); }
    // Mail always; WhatsApp is connected once, the first time it is ticked.
    if (d.chq) { const k = d.chq; if (k === 'wa' && !S.biz.channels.wa) return sheetConnect(); S.biz.channels[k] = !S.biz.channels[k]; save(); return render(); }
    if (d.noansdo) { S.biz.noAnsDo = d.noansdo; save(); return render(); }
    if (d.ruletab) { ruleTab = d.ruletab; return render(); }
    if (d.boothdef !== undefined) { setBoothDefault(d.boothdef); save(); return render(); }

    if (d.sys) return setSys(d.sys);
    if (d.asq) return askAssist(d.asq);
    if (d.asapply) { const [mi, ci] = d.asapply.split(':').map(Number); return applyChange(mi, ci); }
    // Setup step 3: a channel in one tap. WhatsApp goes through its own sheet, with the warning or the existing account.


    // ---- CRM ----
    if (d.crmtab) { S.crmTab = d.crmtab; S.crmLead = null; tbSel.clear(); save(); render(); return window.scrollTo(0, 0); }
    if (d.crmview) {
      crmPlace();
      if (d.crmview === 'list' || d.crmview === 'time') S.crmView.tasks = d.crmview;
      else S.crmView.leads = d.crmview === 'messages' && S.crmView.leads === 'messages' ? 'table' : d.crmview;
      save(); return render();
    }
    if (d.tl) { tlFilter = d.tl; return render(); }
    if (d.rowcall) { rowOpen = rowOpen === +d.rowcall ? null : +d.rowcall; return render(); }
    if (d.rowout) { if (L) outcome(L, d.rowout, true); return; }
    // A final decision asks first (יצחק, 13/10): a deal closed, or not relevant — the lead leaves the follow-up.
    if (d.final) {
      if (!L) return;
      const won = d.final === 'won';
      return sheet(`<h2>${won ? 'לסמן עסקה שנסגרה עם ' : 'לסמן שלא נסגרה עם '}${esc(People.rowName(L))}?</h2>
        <p class="muted">${won ? 'הוא עובר ל"' + esc((stageOf('won') || { name: 'נסגרה עסקה' }).name) + '".' : 'המעקב אחריו נגמר, בלי משימות. אפשר להחזיר אותו מדף הליד.'} ${onList(L) ? 'הוא נשאר ברשימת התפוצה.' : 'הוא ביקש להסיר, ולכן לא יקבל הודעות לקבוצה.'}</p>
        <div class="actions"><button class="btn primary" data-finalyes="${d.final}" data-stay="${d.stay || ''}" data-lid="${L.id}">${won ? 'כן, נסגרה עסקה' : 'כן, לא נסגרה'}</button><button class="btn" data-act="sheet-close">חזרה</button></div>`);
    }
    if (d.finalyes) { if (L) { closeSheet(false); outcome(L, d.finalyes, d.stay === '1'); } return; }
    if (d.msgf) { msgFilter = d.msgf; return render(); }
    if (d.rulehits) {
      const r = S.biz.rules.find((x) => x.id === d.rulehits);
      // From the settings the "leads now" are the practice ones; a rule acts on the fair's leads.
      tbIds = new Set(leadsNow().filter((l) => l.ruleHits && l.ruleHits[d.rulehits]).map((l) => l.id));
      tbIdsWhy = 'הכלל: ' + (r ? ruleText(r).then : '');
      // N9: the rules live in the settings now — the list of whom a rule touched opens in the tracking view.
      S.tb.f = {}; tbQuery = ''; tbPage = 0; S.crmTab = 'table'; S.crmLead = null; S.phase = 'live'; S.view = 'crm'; save(); render(); return window.scrollTo(0, 0);
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
    if (d.tbquick) { const [k, v] = d.tbquick.split(':'); S.tb.f[k] = S.tb.f[k] === v ? '' : v; tbPage = 0; tbSel.clear(); save(); return render(); }   // a quick filter is a switch: on, off
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
    if (d.tpmat !== undefined) { document.querySelectorAll('[data-tpmat]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return; }
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
    if (d.digestch) { S.biz.digest.ch = d.digestch; save(); return render(); }
    if (d.digesth) { S.biz.digest.hour = d.digesth; save(); return render(); }

    if (d.ex) {
      const say = $('#say');
      if (say.value.trim() && say.value.trim() !== EXAMPLES[d.ex]) { exPending = d.ex; return sheetConfirm('להחליף את מה שכתבת?', 'הטקסט שכתבת על העסק יוחלף בדוגמה.', 'ex-yes', '', 'להחליף'); }
      return useExample(d.ex);
    }

    if (d.addstd) return addGroup(d.addstd);
    if (d.editgroup) return sheetGroup(d.editgroup);
    if (d.egmulti !== undefined) { document.querySelectorAll('[data-egmulti]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return; }
    if (d.addbtn) return addButton(d.addbtn);
    if (d.editbtn) return sheetSteps({ kind: 'btn', id: d.editbtn });
    if (d.editstep !== undefined) { keepDraft(); const i = +d.editstep; return sheetStep({ title: 'משימה ' + (i + 1), step: D.steps[i], ctx: { kind: 'draft', i } }); }
    if (d.delstep !== undefined) { keepDraft(); D.steps.splice(+d.delstep, 1); return sheetSteps(); }
    if (d.steptype) {
      const was = STEPS[ES.type].label;
      ES.type = d.steptype;
      ES.days = STEPS[ES.type].days;
      const inp = $('#es-label');
      // The words follow the kind: a step changed from "measuring" to "call" no longer says "measuring" — unless he typed his own words just now.
      if (inp && (!ES.typed || !inp.value.trim() || inp.value.trim() === was)) inp.value = STEPS[ES.type].label;
      document.querySelectorAll('[data-steptype]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.steptype === ES.type));
      return renderStepExtra();
    }
    if (d.esdays !== undefined) { ES.days = +d.esdays; return renderStepExtra(); }
    if (d.esbefore !== undefined) { ES.before = +d.esbefore; return renderStepExtra(); }
    if (d.espkg !== undefined) { ES.pkg = d.espkg; return renderStepExtra(); }
    if (d.esstar) { D.weight = D.weight >= 2 ? 0 : 2; b.setAttribute('aria-pressed', D.weight >= 2); return; }
    if (d.toggle) {
      const k = d.toggle;
      if (k.startsWith('season:')) { const id = k.slice(7); const s = S.biz.seasons; S.biz.seasons = s.includes(id) ? s.filter((x) => x !== id) : s.concat(id); S.biz.seasonsByHand = true; }
      else if (k.startsWith('ch:')) { const c = k.slice(3); S.biz.channels[c] = !S.biz.channels[c]; }
      else if (k.startsWith('rule:')) { const r = S.biz.rules.find((x) => x.id === k.slice(5)); if (r) r.on = !r.on; }
      else if (k === 'digest') S.biz.digest.on = !S.biz.digest.on;
      else S.biz[k] = !S.biz[k];
      save(); return render();
    }
    if (d.colddo) { S.biz.coldDo = d.colddo; save(); return render(); }
    if (d.idle) { S.biz.idleSec = +d.idle; save(); return render(); }
    if (d.remind) { S.biz.remindWeeks = +d.remind; save(); return render(); }
    if (d.aftersale !== undefined) { S.biz.afterSale = +d.aftersale; save(); return render(); }

    if (d.editseason) return sheetSeason(d.editseason);
    if (d.grades) { S.biz.grades = d.grades; save(); return render(); }
    if (d.pick) return pick(d.pick);

    if (d.reopen) { const l = leadById(+d.reopen); if (l) openLead(l); return; }
    if (d.tkstep !== undefined) { TK.i = +d.tkstep; document.querySelectorAll('[data-tkstep]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return tkReady(); }
    if (d.tkstage) { TK.stage = d.tkstage; document.querySelectorAll('[data-tkstage]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return; }
    if (d.tkdays) { TK.days = +d.tkdays; TK.date = ''; if ($('#tk-date')) $('#tk-date').value = ''; document.querySelectorAll('[data-tkdays]').forEach((x) => x.setAttribute('aria-pressed', x === b)); return tkReady(); }
    if (d.warm !== undefined) {
      const l = L || leadById(openId);
      if (!l) return;
      if (b.closest('.tag-row')) {   // filling in on the dashboard: the row stays, and the tap can be taken back
        filled.add(b.closest('.tag-row').dataset.fill + ':' + l.id);
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
      if (b.closest('.tag-row')) filled.add(b.closest('.tag-row').dataset.fill + ':' + l.id);
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
    if (d.sendmat) { if (L) { sendPackage(L, d.sendmat); save(); sheetMaterials(L); refreshLead(L); } return; }
    if (d.sendnow) { if (L && !L.sent.includes((pkgById(d.sendnow) || {}).name)) { sendPackage(L, d.sendnow); save(); refreshLead(L); } return; }
    if (d.openlead) { const l = leadById(+d.openlead); if (l) sheet(leadBody(l, true), l.id); return; }
    if (d.crmlead) { const l = leadById(+d.crmlead); if (l) sheetCRM(l); return; }
    if (d.outcome) { if (L) outcome(L, d.outcome); return; }
    if (d.play) return playNote(d.play);
    if (d.taskdone) {
      if (!L) return;
      const t = tasks(L).find((x) => x.key === d.taskdone);
      const label = t ? t.label : 'משימה';
      undoable('✓ ' + label + ' — ' + doneWord(t), () => {
        L.done.push(d.taskdone);
        log(L, '✓ ' + label + ' — ' + doneWord(t));
        // A quote that went out, and registration details that went out, each bring their own check a few days on.
        if (t && t.type === 'quote') {
          advance(L, 'quote', 'ההצעה יצאה');
          addManual(L, { type: 'call', label: 'לבדוק אם קיבל את ההצעה', days: 3 }, H.addDays(new Date(now()), 3, true).getTime());
        }
        if (t && t.type === 'register') { advance(L, 'contact', 'נשלחו פרטי הרשמה'); addManual(L, { type: 'call', label: 'לבדוק אם נרשם', days: 3 }, H.addDays(new Date(now()), 3, true).getTime()); }
        // M7: a meeting arranged means he is in touch; a call made is too.
        if (t && t.type === 'meet' && t.phase !== 'held') advance(L, 'contact', 'פגישה תואמה');
        if (t && t.type === 'call') advance(L, 'contact', t.label);
      });
      const l2 = leadById(L.id) || L;   // after undoable the state object is the same, but stay safe
      if (t && t.type === 'meet' && t.phase !== 'held') return sheetMeetDate(l2);
      if (t && t.phase === 'after') return sheetTalk(l2, false, 'בדיקה אחרי מכירה');   // a happy customer: the next order starts here
      if (undecided(l2)) return sheetTalk(l2, false, t && t.type === 'meet' ? 'הפגישה התקיימה' : label.replace(/[?.]+$/, ''));
      return afterTask(l2);
    }
    if (d.tasksend) {
      if (!L) return;
      const t = tasks(L).find((x) => x.key === d.tasksend);
      if (!(t && pkgById(t.pkg)) && !keysHaveDefault()) return sheetMaterials(L);
      if (!sendPackage(L, t ? t.pkg : '')) return sheetMaterials(L);
      L.done.push(d.tasksend); save(); return afterTask(L);
    }
    if (d.taskedit) {
      if (!L) return;
      if (!$('#scrim')) tasksRet = 'page';   // editing from the lead's page: come back to the page, not to a sheet
      const t = tasks(L).find((x) => x.key === d.taskedit);
      if (!t) return;
      const days = Math.max(0, dayNo(t.due.getTime()) - dayNo(now()));
      return sheetStep({ title: 'לשנות: ' + t.label, step: Object.assign({}, t, { days }), ctx: { kind: 'task', lid: L.id, key: t.key } });
    }
    if (d.filter) { crmFilter = d.filter; crmQuery = ''; return render(); }
    if (d.insight) return applyInsight(d.scope, d.insight);
    if (d.devrole) {

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
        S.step = SETUP[i + 1][0];
        S.setupReach = Math.max(S.setupReach || 0, i + 1);
        if (S.step === 'messages') S.sub = 'messages';
        if (S.step === 'custom') S.sub = SUBS_HOW[0][0];
        save(); render(); return window.scrollTo(0, 0);
      }
      // "סיימתי להגדיר" (יצחק, 20/10): a welcome that says the setup is done, and into the system.
      // It ends at the booth — a sample one until the system goes real (יצחק, 17/10).
      case 'setup-finish':
        if (!checkAccount()) { S.step = 'account'; render(); return toast('מה השם שלך?'); }
        return sheet(`<h2>סיימת להגדיר. ברוך הבא!</h2>
          <p class="muted">מעבירים אותך עכשיו למערכת. כל מה שהגדרת נמצא בהגדרות, ואפשר לשנות אותו בכל רגע.</p>
          ${practice() ? '<p class="faint">עד שהמערכת עוברת למצב אמיתי, הדוכן הוא לדוגמה: מתאמנים בו, ושום דבר לא נשלח באמת.</p>' : ''}
          <div class="actions"><button class="btn primary big" data-act="setup-done">${afterFair() ? 'ל-CRM ←' : 'לדוכן ←'}</button></div>`);
      case 'setup-done':
        closeSheet(false);
        if (!checkAccount()) { S.step = 'account'; render(); return toast('מה השם שלך?'); }
        S.phase = 'live'; S.view = afterFair() ? 'crm' : 'booth'; save(); render(); return window.scrollTo(0, 0);
      // The settings are open at any time, the setup's first run included (יצחק, 17/10); from the setup, "back" returns to its step.
      case 'settings':
        if (worker()) return ownerOnly('ההגדרות');
        if (S.phase === 'setup') return;   // the setup is the settings (יצחק, 20/10)
        return goSettings(S.sub && S.sub !== 'custom' ? S.sub : 'buttons');
      case 'settings-done':
        if (S.backSetup) { S.phase = 'setup'; S.step = S.backSetup; S.backSetup = null; }
        else { S.phase = 'live'; S.view = afterFair() ? 'crm' : S.backView || 'booth'; }
        save(); render(); return window.scrollTo(0, 0);
      case 'si-google': S.account.email = S.account.email || 'demo@gmail.com'; return signedIn();
      case 'si-mail': signStep = 'mail'; return render();
      case 'si-back': signStep = null; return render();
      case 'si-send': { const v = ($('#si-mail') && $('#si-mail').value.trim()) || ''; if (!emailOk(v)) { toast('כתובת המייל לא שלמה. למשל: name@gmail.com'); return $('#si-mail').focus(); } S.account.email = v; signStep = 'code'; return render(); }
      case 'si-code': { const v = ($('#si-code') && $('#si-code').value.trim()) || ''; if (!/^\d{4}$/.test(v)) { toast('4 ספרות'); return $('#si-code').focus(); } return signedIn(); }
      case 'sign-out': S.signed = false; signStep = null; closeLead(); UI.panel = null; save(); render(); return window.scrollTo(0, 0);
      case 'bell': return openPanel('support');
      case 'ticket-send': return sendTicket();
      case 'bell-read': (S.notices || []).forEach((x) => { x.read = true; }); save(); closeSheet(false); return render();
      case 'notice-read': { const x = (S.notices || []).find((y) => y.id === d.id); if (x) x.read = true; save(); return render(); }
      case 'sys': return sheetSys();
      case 'demo-notice': notify('הודעה מהמארגנים: הכניסה לאולם נפתחת היום בשעה 10:00. בעלי דוכנים מתבקשים להגיע עד 9:30.', true); save(); render(); return toast('נשלחה הודעה דחופה (הדגמה)');
      case 'admin-notice': { const v = ($('#ad-notice') && $('#ad-notice').value.trim()) || ''; if (!v) { $('#ad-notice').focus(); return toast('מה ההודעה?'); } notify(v, true); save(); render(); return toast('✓ נשלחה לכל המציגים'); }
      case 'admin-close': adminOn = false; try { location.hash = ''; } catch (er) { /* framed */ } return render();
      // The way in from the sign-in page's demo line (יצחק, 20/10: "I don't see where to reset").
      case 'admin-open': adminOn = true; try { location.hash = '#admin'; } catch (er) { /* framed */ } return render();
      case 'assist': return openPanel('ai');
      case 'assist-close': case 'panel-close': UI.panel = null; return render();
      case 'nav-fold': DEV.navFolded = !slimNav(); if (!DEV.navFolded) UI.panel = null; save(); return render();
      case 'help-toggle': DEV.helpOff = !DEV.helpOff; save(); return render();
      case 'ui-desk': case 'ui-tab': case 'ui-auto': DEV.ui = d.act === 'ui-auto' ? null : d.act.slice(3); UI.panel = null; save(); render(); return toast(d.act === 'ui-auto' ? 'התצוגה לפי המכשיר' : d.act === 'ui-desk' ? 'תצוגת מחשב' : 'תצוגת טאבלט');
      case 'copy': try { navigator.clipboard.writeText(d.copy).then(() => toast('✓ הועתק'), () => toast(d.copy)); } catch (er) { toast(d.copy); } return;
      case 'bar-new': if (S.phase !== 'live' || S.view !== 'booth') goPlace('booth'); return sheetNewPerson();
      case 'assist-ask': { e.preventDefault(); const q = $('#as-q') && $('#as-q').value.trim(); if (q) askAssist(q); return; }
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
      case 'add-step': keepDraft(); D.steps.push(normStep({ type: 'call' })); return sheetStep({ title: 'משימה ' + D.steps.length, step: D.steps[D.steps.length - 1], ctx: { kind: 'draft', i: D.steps.length - 1, isNew: true } });
      case 'steps-cancel': D = null; closeSheet(false); return render();
      case 'steps-back': return D ? sheetSteps() : closeSheet();

      case 'save-steps': {
        keepDraft();
        // Changed after real visitors were tagged with it: the change is for the next ones, unless he says otherwise (יצחק, 17/10).
        const key = D.kind === 'def' ? 'def' : D.id;
        const was = D.kind === 'def' ? stepsOf(null) : (btnById(D.id) ? stepsOf(btnById(D.id)) : []);
        const sig = (ss) => JSON.stringify(ss.map((s) => [s.type, s.label, s.days, s.pkg || '', s.before || 0]));
        const now0 = D.kind === 'def' ? D.steps : (D.steps.length ? D.steps : stepsOf(null));
        const hit = sig(was) === sig(now0.map(normStep)) ? [] : stepsAffected(key);
        if (hit.length && !d.apply) return sheetApply(key, was, now0, hit);
        if (d.apply === 'new') hit.forEach((l) => { l.frozen = Object.assign({}, l.frozen, { [key]: clone(was) }); });
        if (d.apply === 'all') hit.forEach((l) => { if (l.frozen) delete l.frozen[key]; });
        if (D.kind === 'def') { S.biz.defSteps = D.steps; S.biz.defByHand = true; }
        else { const x = btnById(D.id); if (x) { x.label = D.label; x.steps = D.steps; x.weight = D.weight; x.byHand = true; x.unsure = false; } }
        D = null; save(); closeSheet(false); render();
        return d.apply ? toast(d.apply === 'new' ? '✓ נשמר · למבקרים הבאים' : '✓ נשמר · גם ל-' + hit.length + ' הקיימים') : undefined;
      }
      case 'save-step': {
        const s = readStep();
        const c = ES.ctx;
        if (c.kind === 'draft') { D.steps[c.i] = s; return sheetSteps(); }
        const l = leadById(c.lid);
        if (!l) return;
        if (c.key && !c.key.startsWith('m')) l.done.push(c.key);             // a step from a button: replaced by the lead's own
        if (c.key && c.key.startsWith('m')) l.manual = l.manual.filter((x) => x.key !== c.key);
        if (immediate(s)) { if (!sendPackage(l, s.pkg)) { save(); return sheetMaterials(l); } }
        else if (s.type === 'none') toEnd(l);
        else addManual(l, s, s.type === 'season' ? dueFor(s) : H.addDays(new Date(now()), Math.max(1, s.days || 0)).getTime());
        log(l, 'משימה: ' + s.label);
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
      case 'task-add': { if (L && d.ret) tasksRet = d.ret; else if (L && !$('#scrim')) tasksRet = 'page'; if (L) sheetStep({ title: 'משימה חדשה ל' + People.rowName(L), step: normStep({ type: 'call' }), ctx: { kind: 'task', lid: L.id, key: null } }); return; }
      case 'task-audience': { if (L) { toEnd(L); save(); backFromTasks(L); } return; }
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
      case 'connect': return sheetConnect();
      case 'connect-how':
        if (d.how === 'own') return sheetConnectOwn();
        S.biz.channels.wa = true; S.biz.waHow = 'official'; save(); closeSheet(false); render(); return toast('✓ וואטסאפ מחובר לחשבון העסקי');
      case 'connect-yes': S.biz.channels.wa = true; S.biz.waHow = 'own'; save(); closeSheet(false); render(); return toast('✓ וואטסאפ מחובר');
      case 'disconnect': S.biz.channels[d.ch] = false; if (d.ch === 'wa') S.biz.waHow = ''; save(); return render();
      case 'del-mat': {
        const x = S.biz.materials[+d.i];
        if (!x) return;
        const using = S.biz.templates.filter((t) => t.mat === x.name).length;
        undoable(`${x.name} הוסר${using ? ` — ${using} הודעות שצירפו אותו יישלחו מעכשיו בלי קובץ` : ''}`, () => { S.biz.materials.splice(+d.i, 1); S.biz.templates.forEach((t) => { if (t.mat === x.name) t.mat = ''; }); });
        return render();
      }
      case 'pause': paused = !paused; if (paused) stopIdle(); renderLead(); return;
      case 'hint-ok': S.seen = Object.assign({}, S.seen, { [d.k]: true }); save(); if (openId && $('#slot')) renderLead(); else render(); return;
      // The exhibitor's own choice to grow his mailing list (יצחק, 18/10): a visitor kept for the list only is not a lead — no tasks, no follow-up.
      case 'list-only': {
        const l = L;
        if (!l) return;
        openId = null; stopIdle(); cardSnap = null;
        undoable('✓ רק לרשימת התפוצה · ' + People.rowName(l), () => { l.listOnly = true; l.list = true; l.tags = []; l.warmth = null; log(l, 'נרשם רק לרשימת התפוצה'); });
        renderResults(''); updateFoot(); if ($('#q') && FINE) $('#q').focus();
        return;
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
      case 'record-back': S.crmLead = null; callOpen = false; save(); render(); if (!wideCRM()) window.scrollTo(0, 0); return;
      case 'tl-auto': tlAuto = !tlAuto; return render();
      case 'ask': { e.preventDefault(); const q = $('#ask-q') && $('#ask-q').value.trim(); if (q) askData(q); return; }
      case 'ask-clear': ASK = null; return render();
      case 'ask-table': tbIds = new Set(ASK.ids); tbIdsWhy = 'מתוך התשובה לשאלה'; S.tb.f = {}; tbQuery = ''; tbPage = 0; S.crmTab = 'table'; S.crmLead = null; save(); render(); return window.scrollTo(0, 0);
      case 'ask-unfilter': tbIds = null; tbIdsWhy = ''; return render();
      case 'view-settings': {
        crmPlace();
        const vs = VIEW_SETTINGS[viewKey()];
        if (!vs) return;
        if (vs[0] === 'cols') return sheetCols();
        if (worker()) return ownerOnly('ההגדרות');
        return goSettings(vs[0]);
      }
      case 'crm-settings': if (worker()) return ownerOnly('ההגדרות'); return goSettings('digest');
      case 'crm-rules': if (worker()) return ownerOnly('ההגדרות'); return goSettings('auto');
      // "⏭ later": the lead goes to the end of today's queue for this sitting — nothing is decided, nothing is written.
      case 'q-skip': if (L) { qSkip = qSkip.filter((x) => x !== L.id).concat(L.id); } return render();
      // On a computer "call" cannot dial: the number is copied, and the call is made from the phone in his hand.
      case 'warm-list': {   // a number on the evening screen opens who it counts (UX review D-5)
        const k = d.k === 'none' ? null : +d.k;
        const ls = leadsNow().filter((l) => effWarm(l) === k);
        return sheet(`<h2>${esc(k == null ? 'לא סומן' : words()[k])} · ${ls.length}</h2>
          <div class="opts">${ls.map((l) => `<button class="opt" data-openlead="${l.id}">${esc(People.rowName(l))}<small>${esc([People.town(l)].concat(tagged(l).map((b) => b.label)).join(' · '))}</small></button>`).join('')}</div>
          <div class="actions"><button class="btn ghost" data-act="sheet-close">סגירה</button></div>`);
      }
      case 'ask-yes': {   // replay the tap that asked, this time without asking
        const sel = pendingAsk; pendingAsk = null;
        closeSheet(false);
        const again = sel && document.querySelector('.tag-row ' + sel);
        if (again) { askOk = true; try { again.click(); } finally { askOk = false; } }
        return;
      }
      case 'phone-saved': if (L && L.contact.phone) { log(L, '✎ נוסף טלפון'); save(); toast('✓ הטלפון נשמר'); } return render();
      case 'copy-phone': if (L && L.contact.phone) { try { navigator.clipboard.writeText(L.contact.phone).then(() => toast('✓ המספר הועתק'), () => toast(L.contact.phone)); } catch (x) { toast(L.contact.phone); } } return;
      case 'go-decide': crmPlace(); S.crmTab = 'tasks'; S.crmView.tasks = 'list'; S.crmLead = null; crmFilter = 'decide'; crmQuery = ''; save(); render(); return window.scrollTo(0, 0);
      case 'tb-export-ask': if (worker()) return ownerOnly('הייצוא'); return sheet(`<h2>להוריד לאקסל</h2><div class="opts"><button class="opt" data-act="tb-export">רק מה שמוצג עכשיו<small>${tableRows(leadsNow()).length} לידים, לפי הסינון</small></button><button class="opt" data-act="export-all">את כל הלידים<small>עם טלפון ומייל, בלי קשר לסינון</small></button></div><div class="actions"><button class="btn ghost" data-act="sheet-close">ביטול</button></div>`);
      case 'tb-export': closeSheet(false); return exportLeads(tableRows(leadsNow()), 'לידים');
      // A general export (יצחק, 09/10): every lead of the fair, every column — phone and email included — whatever the filter.
      case 'export-all': if (worker()) return ownerOnly('הייצוא'); closeSheet(false); return exportLeads(crmLeads(), 'כל-הלידים');
      case 'tb-cols': return sheetCols();
      case 'pv-export': {
        const rows = pivot(leadsNow());
        const D = dims()[PV.dim];
        return exportXlsx('פילוח-' + stamp() + '.xlsx', [{ name: 'פילוח', rows: [[D.t].concat(Object.values(METRICS))].concat(rows.map((r) => [r.label, r.count, r.won, r.conv / 100, r.reached])) }]);
      }
      case 'rule-add': return sheetRule(null);
      case 'rule-save': {
        const r = RD;
        if (r.isNew) r.byHand = true;
        delete r.isNew;

        const i = S.biz.rules.findIndex((x) => x.id === r.id);
        if (i >= 0) S.biz.rules[i] = r; else S.biz.rules.push(r);
        RD = null; save(); closeSheet(false); render(); return toast('✓ הכלל נשמר');
      }
      case 'rule-del': { const id = RD.id; RD = null; closeSheet(false); undoable('הכלל נמחק', () => { S.biz.rules = S.biz.rules.filter((x) => x.id !== id); }); return render(); }
      case 'tpl-add': return sheetTemplate(null);
      case 'tpl-ai': sheetTemplate(null); if ($('#tp-ask')) $('#tp-ask').focus(); return;
      case 'tpl-write': return writeTemplate();

      case 'tpl-save': {
        const name = ($('#tp-name') && $('#tp-name').value.trim()) || 'הודעה';
        const text = ($('#tp-text') && $('#tp-text').value.trim()) || '';
        const pm = document.querySelector('[data-tpmat][aria-pressed="true"]');
        const mat = pm ? pm.dataset.tpmat : '';
        const booth = !!($('#tp-booth') && $('#tp-booth').checked);
        let t = d.id ? S.biz.templates.find((x) => x.id === d.id) : null;
        if (t) Object.assign(t, { name, text, mat });
        else { t = { id: 't' + Date.now(), name, text, mat, booth: false }; S.biz.templates.push(t); }
        if (booth) setBoothDefault(t.id); else t.booth = false;   // one default only
        save(); closeSheet(false); return render();
      }
      case 'tpl-del': { const id = d.id; closeSheet(false); undoable('ההודעה נמחקה', () => { S.biz.templates = S.biz.templates.filter((x) => x.id !== id); }); return render(); }
      case 'grp-send': return sheetSendConfirm(grpList(), grp.tpl);
      case 'send-confirm': return sendConfirmed();
      case 'go-today': crmPlace(); S.crmTab = 'tasks'; S.crmView.tasks = 'list'; S.crmLead = null; crmFilter = 'today'; crmQuery = ''; save(); render(); return window.scrollTo(0, 0);
      case 'go-week': crmPlace(); S.crmTab = 'tasks'; S.crmView.tasks = 'list'; S.crmLead = null; crmFilter = 'week'; crmQuery = ''; save(); render(); return window.scrollTo(0, 0);
      case 'view-noanswer': S.tb.f = { answer: 'none' }; tbIds = null; tbQuery = ''; tbPage = 0; S.crmTab = 'table'; save(); render(); return window.scrollTo(0, 0);
      case 'miss-hot': S.tb.f = { warm: '0', answer: 'none' }; tbIds = null; tbQuery = ''; tbPage = 0; S.crmTab = 'table'; S.crmLead = null; save(); render(); return window.scrollTo(0, 0);
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
      case 'opt-out': { if (!L) return; L.optOut = !L.optOut; L.list = !L.optOut; log(L, L.optOut ? '🚫 ביקש להסיר מרשימת התפוצה' : 'חזר לרשימת התפוצה'); save(); closeSheet(false); render(); return toast(L.optOut ? 'הוסר מרשימת התפוצה. לא יקבל יותר הודעות לקבוצה' : 'חזר לרשימת התפוצה'); }
      // The second axis, by hand: on the list or off it, whatever happened with the deal. Asking to be removed is kept apart — it is his word, not the owner's.
      case 'list-toggle': {
        if (!L) return;
        if (L.optOut) return toast('הוא ביקש להסיר. מחזירים רק אם הוא ביקש לחזור: "עוד פעולות"');
        L.list = L.list === false; log(L, L.list ? 'נוסף לרשימת התפוצה' : 'הוצא מרשימת התפוצה'); save(); render();
        return toast(L.list ? '✓ ברשימת התפוצה' : 'הוצא מרשימת התפוצה');
      }
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
      case 'ex-yes': closeSheet(false); return useExample(exPending);
      case 'crm-clear': crmQuery = ''; return render();
      case 'tk-save': return tkSave();
      // N10: "back" and "closed" return to where he was — the overview, the list, or the lead's page — not always to the lead.
      case 'tk-back': { TK = null; closeSheet(false); return render(); }
      case 'tk-won': { const l = TK && leadById(TK.lid); TK = null; if (l) outcome(l, 'won', true); return; }
      case 'md-save': {
        const l = MD && leadById(MD.lid);
        const v = $('#md-date') && $('#md-date').value;
        if (!l) return;
        if (!v) return toast('בחר תאריך, או "עוד לא נקבע יום"');
        const at = H.addDays(new Date(v + 'T09:00'), 0).getTime();
        addManual(l, { type: 'meet', label: 'איך הלכה הפגישה?', days: 0, phase: 'held' }, at);
        log(l, '🤝 פגישה נקבעה · ' + H.heDate(new Date(at)));
        advance(l, 'contact', 'פגישה נקבעה');
        MD = null; save(); closeSheet(false); render();
        return toast('🤝 נקבע · ' + dueText(new Date(at)));
      }
      case 'md-later': { const l = MD && leadById(MD.lid); MD = null; if (l) sheetTalk(l, false, 'הפגישה תואמה'); return; }
      case 'na-week': {
        if (!L) return;
        const cur = tasks(L)[0];
        const at = H.addDays(new Date(now()), 7, true).getTime();
        if (cur) L.moved[cur.key] = at; else addManual(L, normStep({ type: 'call' }), at);
        log(L, '📞 ננסה שוב בעוד שבוע');
        save(); closeSheet(false); render(); return toast('📞 ננסה שוב · ' + dueText(new Date(at)));
      }
      case 'cold-aud': { if (L) { filledCold.add(L.id); undoable(NOFOLLOW + ' · ' + People.rowName(L), () => toEnd(L, NOFOLLOW)); render(); } return; }
      case 'card-undo': {
        const l = L;
        const snap = cardSnap;
        if (!l || !snap || snap.id !== l.id) return;
        unqueueAll(l);
        if (snap.before === null) {   // added just now: not kept
          openId = null; cardSnap = null; stopIdle();
          undoable('לא נשמר · ' + People.rowName(l), () => { S.leads = S.leads.filter((x) => x.id !== l.id); });
          renderResults(''); updateFoot();
          if ($('#q') && FINE) $('#q').focus();
          return;
        }
        undoable('השינויים בוטלו · ' + People.rowName(l), () => {
          // What really went out cannot be called back: it stays on the lead, and in its log.
          const was = snap.before;
          const sent = l.sent.filter((x) => !was.sent.includes(x));
          const sentLog = l.log.filter((e) => /נשלח/.test(e.t) && !was.log.some((b) => b.at === e.at && b.t === e.t));
          Object.keys(l).forEach((k) => { delete l[k]; });
          Object.assign(l, JSON.parse(JSON.stringify(was)));
          l.sent = l.sent.concat(sent);
          l.log = l.log.concat(sentLog);
        });
        return renderLead();
      }
      case 'again-all': { againAll = true; const q = $('#q'); return renderResults(q ? q.value : ''); }
      case 'new-person': return sheetNewPerson();
      case 'np-save': return saveNewPerson();
      case 'held-save': { const q = $('#q'); closeHeld(); renderResults(q ? q.value : ''); if (q && FINE) q.focus(); return; }
      case 'held-back': { const l = leadById(held); if (l) openLead(l); return; }
      // A detour from a setup step into one of the settings screens: its "back" returns to that step.
      case 'tune': if (S.phase === 'setup') S.backSetup = S.step; return goSettings(d.tune);
      case 'es-pk-add': {
        const name = (($('#es-pk-name') && $('#es-pk-name').value.trim()) || (ES.newFile && ES.newFile.name) || '').slice(0, 30);
        if (!name) return toast('איך לקרוא להודעה?');
        let mat = '';
        if (ES.newFile) { mat = ES.newFile.name; if (!S.biz.materials.some((x) => x.name === mat)) S.biz.materials.push({ name: mat, file: ES.newFile.file }); }
        const id = 'p' + (S.biz.bseq++);
        S.biz.templates.push({ id, name, mat, text: mat ? PKG_TEXT : 'שלום {שם}, ' });
        ES.pkg = id; ES.newFile = null; ES.newName = '';
        save(); renderStepExtra(); return toast('"' + name + '" נוספה ונבחרה');
      }
      case 'tk-none': {
        const l = TK && leadById(TK.lid);
        TK = null;
        if (!l) return;
        closeSheet(false);
        undoable(NOFOLLOW + ' · ' + People.rowName(l), () => toEnd(l, 'אחרי שיחה'));
        return render();
      }

      case 'send': {
        const l = L || leadById(openId);
        if (!l) return;
        if (!sendReady()) return sheetNotReady();
        if (S.biz.templates.length === 1 && !l.sent.length) { sendPackage(l, S.biz.templates[0].id); save(); return refreshLead(l); }
        return sheetMaterials(l);
      }
      case 'not-ready': return sheetNotReady();
      // Where the missing part is set: during setup its own step, afterwards the settings — the way to send first, then the message.
      case 'setup-send': {
        if (worker()) return ownerOnly('ההגדרות');
        closeLead(); closeHeld(); closeSheet(false);
        if (S.phase === 'setup') { S.step = 'send'; save(); render(); return window.scrollTo(0, 0); }
        return goSettings(S.biz.templates.length ? 'channels' : 'materials');

      }
      case 'note': { const l = L || leadById(openId); if (l) sheetNote(l, false); return; }
      case 'note-rec': { const l = L || leadById(openId); if (l) sheetNote(l, true); return; }
      case 'rec': { if (L) startRec(L); return; }
      case 'rec-stop': return stopRec();
      case 'note-save': { if (L) saveNote(L); return; }
      case 'note-cancel': closeSheet(); return;
      case 'fill-open': fillOpen = d.kind; return render();
      case 'fill-close': fillOpen = false; return render();
      case 'call': { callOpen = true; return render(); }
      case 'edit-tags': { if (L) sheetTags(L); return; }
      case 'del-lead': { const l = L || leadById(openId); return l && sheetConfirm('למחוק את ' + People.rowName(l) + '?', 'יימחק לגמרי, ואי אפשר להחזיר.', 'del-lead-yes', `data-lid="${l.id}"`, 'למחוק'); }
      case 'del-lead-yes': {
        const id = +d.lid;
        S.leads = S.leads.filter((x) => x.id !== id);
        if (openId === id) openId = null;
        save(); closeSheet(false); render(); return toast('נמחק');
      }
      case 'sheet-close':
        closeSheet();
        if (S.phase === 'live' && S.view !== 'booth') render();
        return;
      case 'seed': seedDay(); render(); return toast('✓ נוספו 20 מבקרים לדוגמה. רואים אותם ב"סוף היום" וב-CRM');
      case 'seed-remove': { const n = S.leads.filter((l) => l.demo).length; return sheetConfirm('להסיר את המבקרים לדוגמה?', `${n} מבקרים לדוגמה יימחקו. מה שרשמת בעצמך נשאר.`, 'seed-remove-yes', '', 'להסיר'); }
      case 'seed-remove-yes': S.leads = S.leads.filter((l) => !l.demo); closeSheet(false); save(); render(); return toast('✓ המבקרים לדוגמה הוסרו');
      case 'next-day': S.shift += 1; idleOnce(); save(); return render();
      case 'today': S.shift = 0; idleOnce(); save(); return render();
      case 'devices': return sheetDevices();
      case 'join': S.biz.devices += 1; save(); return sheetDevices();
      case 'reset':
        if (worker()) return ownerOnly('איפוס');
        return sheetConfirm('איפוס מערכת?', 'כל המבקרים, הכפתורים וההגדרות יימחקו, ומתחילים מההתחלה.', 'reset-yes', '', 'למחוק הכל');
      case 'reset-yes': S = fresh(); upgrade(); openId = null; D = null; UI.panel = null; stopIdle(); closeSheet(false); save(); return render();
    }
  });

  // Test hooks: the readers and the planner, checkable from the console.
  window.Demo3 = { parse: parseWords, clean: cleanAI, useServerAI: () => aiReady(serverAI), plan: (id) => plan(leadById(id)), tasks: (id) => tasks(leadById(id)), state: () => S };
  upgrade();
  ensureSids();
  if (S.phase === 'live') idleOnce();
  render();
})();
