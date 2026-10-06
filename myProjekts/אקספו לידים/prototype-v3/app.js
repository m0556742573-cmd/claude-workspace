/* Expo leads — demo 3: three moments, almost no settings.
 *
 * A setting is a small failure: a question the system asks because it could
 * not work the answer out. So there is no settings form here. There are three
 * moments, and each setting arrives at the one where it means something:
 *
 *   1. Before the fair — one sentence: "what do you sell?" Everything else
 *      (the buttons at the booth, the next step per product, the season) is
 *      inferred from it and shown as a live preview to approve.
 *   2. At the booth — nothing to set up. A setting appears the first time it
 *      is needed: the catalog on the first send, grade names on a long press,
 *      a role the first time one is tagged, a second tablet when it opens.
 *   3. The first evening — questions that could not be asked in the morning,
 *      because now there are numbers to answer them with.
 *
 * In this demo the sentence is read with a word list. The real system would
 * read it with a language model; the screens stay the same.
 */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAY = 86400000;

  // ------------------------------------------------------------------
  // What a conversation leads to — in the exhibitor's words, per product.
  // ------------------------------------------------------------------
  const STEPS = {
    measure:  { label: 'לבוא למדוד',          short: 'מדידה בבית', days: 3 },
    quote:    { label: 'לשלוח הצעת מחיר',     short: 'הצעת מחיר',  days: 2 },
    meeting:  { label: 'לקבוע פגישה',          short: 'פגישה',      days: 3 },
    buy:      { label: 'להתקשר עם הצעה',       short: 'קנייה',      days: 1 },
    date:     { label: 'לתפוס תאריך',          short: 'תאריך',      days: 1 },
    register: { label: 'לשלוח פרטי הרשמה',     short: 'הרשמה',      days: 2 },
    call:     { label: 'להתקשר',               short: 'שיחה',       days: 2 },
  };

  /* The word list behind "read the sentence". Each entry: words that give it
   * away, the button it becomes, what usually happens next, the trade, and the
   * week of the Jewish year when that trade is busiest. */
  const DICT = [
    { k: ['מטבח'], label: 'מטבחים', step: 'measure', trade: 'נגרות ומטבחים' },
    { k: ['ארון', 'ארונות'], label: 'ארונות', step: 'measure', trade: 'נגרות ומטבחים' },
    { k: ['דלת'], label: 'דלתות', step: 'quote', trade: 'נגרות ומטבחים' },
    { k: ['ספרי'], label: 'ספריות', step: 'measure', trade: 'נגרות ומטבחים' },
    { k: ['חדר ילדים', 'חדרי ילדים'], label: 'חדרי ילדים', step: 'measure', trade: 'נגרות ומטבחים' },
    { k: ['ריהוט', 'רהיט'], label: 'ריהוט', step: 'quote', trade: 'ריהוט' },
    { k: ['וילון'], label: 'וילונות', step: 'measure', trade: 'עיצוב הבית' },
    { k: ['תאורה', 'גופי תאורה', 'לדים'], label: 'תאורה', step: 'quote', trade: 'תאורה' },
    { k: ['שיפוץ', 'שיפוצים'], label: 'שיפוצים', step: 'measure', trade: 'שיפוצים ובנייה', season: 'אחרי החגים' },
    { k: ['מיזוג', 'מזגן', 'מזגנים'], label: 'מיזוג אוויר', step: 'quote', trade: 'מיזוג אוויר', season: 'לפני הקיץ' },
    { k: ['דפוס', 'הדפס'], label: 'דפוס', step: 'quote', trade: 'דפוס וגרפיקה', season: 'עונת החתונות' },
    { k: ['הזמנות'], label: 'הזמנות לשמחות', step: 'quote', trade: 'דפוס וגרפיקה', season: 'עונת החתונות' },
    { k: ['חוברת', 'חוברות'], label: 'חוברות', step: 'quote', trade: 'דפוס וגרפיקה' },
    { k: ['שילוט', 'שלט'], label: 'שילוט', step: 'quote', trade: 'דפוס וגרפיקה' },
    { k: ['עיצוב גרפי', 'לוגו', 'מיתוג'], label: 'מיתוג ועיצוב', step: 'meeting', trade: 'דפוס וגרפיקה' },
    { k: ['דגים', 'דג '], label: 'דגים', step: 'buy', trade: 'מזון', season: 'לפני פסח וראש השנה' },
    { k: ['משלוח'], label: 'משלוחים', step: 'buy', trade: 'מזון' },
    { k: ['ייעוץ עסקי', 'ליווי עסקי'], label: 'ייעוץ עסקי', step: 'meeting', trade: 'ייעוץ' },
    { k: ['בשר', 'עופות'], label: 'בשר ועופות', step: 'buy', trade: 'מזון', season: 'לפני החגים' },
    { k: ['מאפה', 'מאפים', 'חלות', 'עוגות'], label: 'מאפים', step: 'buy', trade: 'מזון', season: 'לפני החגים' },
    { k: ['קייטרינג'], label: 'קייטרינג', step: 'date', trade: 'אירועים', season: 'עונת החתונות' },
    { k: ['אולם'], label: 'אולם אירועים', step: 'date', trade: 'אירועים', season: 'עונת החתונות' },
    { k: ['צילום', 'צלם'], label: 'צילום', step: 'date', trade: 'אירועים', season: 'עונת החתונות' },
    { k: ['תזמורת', 'זמר', 'אורגן'], label: 'מוזיקה לשמחות', step: 'date', trade: 'אירועים', season: 'עונת החתונות' },
    { k: ['טיול', 'טיולים'], label: 'טיולים', step: 'date', trade: 'נופש והפעלות', season: 'בין הזמנים' },
    { k: ['צימר'], label: 'צימרים', step: 'date', trade: 'נופש והפעלות', season: 'בין הזמנים' },
    { k: ['הפעל', 'חוויה', 'חוויתי'], label: 'הפעלות', step: 'date', trade: 'נופש והפעלות', season: 'בין הזמנים' },
    { k: ['הסעות', 'הסעה', 'אוטובוס'], label: 'הסעות', step: 'date', trade: 'תחבורה', season: 'בין הזמנים' },
    { k: ['השכרת רכב', 'רכב'], label: 'השכרת רכב', step: 'date', trade: 'תחבורה', season: 'בין הזמנים' },
    { k: ['קורס', 'לימוד', 'שיעור', 'הכשרה'], label: 'קורסים', step: 'register', trade: 'הדרכה', season: 'אלול' },
    { k: ['ביטוח'], label: 'ביטוח', step: 'meeting', trade: 'פיננסים' },
    { k: ['משכנתא', 'משכנתאות'], label: 'משכנתאות', step: 'meeting', trade: 'פיננסים' },
    { k: ['הנהלת חשבונות', 'רואה חשבון', 'דוחות'], label: 'הנהלת חשבונות', step: 'meeting', trade: 'פיננסים', season: 'סוף שנת המס' },
    { k: ['אתר', 'אתרים', 'אפליקצי', 'אוטומצי'], label: 'אתרים ואוטומציה', step: 'meeting', trade: 'דיגיטל' },
    { k: ['מחשב', 'מחשבים'], label: 'מחשבים', step: 'quote', trade: 'מחשבים וסלולר' },
    { k: ['טלפון', 'סלולר', 'פלאפון'], label: 'טלפונים', step: 'buy', trade: 'מחשבים וסלולר' },
    { k: ['יודאיקה', 'תשמישי קדושה', 'מזוזה', 'מזוזות', 'תפילין', 'כלי כסף'], label: 'יודאיקה', step: 'buy', trade: 'תשמישי קדושה', season: 'אלול–תשרי' },
    { k: ['שטריימל'], label: 'שטריימלים', step: 'buy', trade: 'ביגוד', season: 'עונת החתונות' },
    { k: ['בגד', 'בגדים', 'חליפ', 'מעיל'], label: 'ביגוד', step: 'buy', trade: 'ביגוד', season: 'לפני פסח וסוכות' },
    { k: ['מתנה', 'מתנות'], label: 'מתנות', step: 'buy', trade: 'מתנות', season: 'חנוכה' },
    { k: ['משחק', 'משחקים', 'צעצוע'], label: 'משחקים', step: 'buy', trade: 'משחקים', season: 'חנוכה' },
    { k: ['סכינ', 'ציוד מטבח'], label: 'ציוד למטבח', step: 'quote', trade: 'ציוד למוסדות' },
    { k: ['חשמל', 'חשמלאי'], label: 'חשמל', step: 'measure', trade: 'בעלי מקצוע' },
    { k: ['אינסטלציה', 'אינסטלטור'], label: 'אינסטלציה', step: 'measure', trade: 'בעלי מקצוע' },
    { k: ['אדריכל', 'עיצוב פנים'], label: 'אדריכלות ועיצוב', step: 'meeting', trade: 'אדריכלות' },
    { k: ['נדל"ן', 'נדלן', 'דירות', 'תיווך'], label: 'נדל"ן', step: 'meeting', trade: 'נדל"ן' },
  ];

  const EXAMPLES = {
    'נגר': 'מטבחים, ארונות קיר ודלתות פנים, גם למוסדות',
    'דפוס': 'הזמנות לחתונות, חוברות ושילוט לעסקים',
    'הפעלות': 'הפעלות חוויתיות וטיולים לקבוצות ולמוסדות',
    'דגים': 'דגים טריים ומעושנים, משלוחים לבתים ולמוסדות',
  };

  const GRADES = {
    classic: { name: 'הקלאסי', words: ['חם', 'פושר', 'קר'] },
    serious: { name: 'לפי רצינות', words: ['רציני', 'אולי', 'סתם'] },
    time:    { name: 'לפי זמן', words: ['עכשיו', 'בהמשך', 'לא כרגע'] },
    plain:   { name: 'במילים פשוטות', words: ['מעניין מאוד', 'מעניין', 'רק עבר'] },
  };
  const DEFAULT_ROLES = ['גבאי בית כנסת', 'גבאי קבוצה', 'מנהל מוסד', 'ועד הורים', 'מארגן אירוע', 'אחראי רכש'];

  // Keywords end in final letters (וילון) and the words that contain them do not
  // (וילונות), so both sides are compared with the final letters made regular.
  const FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  const fin = (s) => s.replace(/[ךםןףץ]/g, (c) => FIN[c]);
  const hasKey = (s, k) => fin(s).includes(fin(k));
  const opensKey = (s) => DICT.some((d) => d.k.some((k) => fin(s).startsWith(fin(k))));
  /** Strip a leading "and" without eating words that begin with vav (וילונות). */
  function unAnd(piece) {
    if (!/^ו/.test(piece) || opensKey(piece)) return piece;
    return piece.slice(1);
  }
  /** "ארונות קיר ודלתות פנים" is two products joined by "ו": split only where the
   *  "ו" opens a known word, so "חליפות ומעילים" splits and "וילונות" stays whole. */
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
  /** "…לבתים ולמוסדות" says who he sells to, not what — it is not a product. */
  function dropAudience(piece) {
    let s = piece;
    let prev;
    do {
      prev = s;
      s = s.replace(/\s*ו?(גם\s+)?(ל|ב|של\s+)?מוסדות?\s*$/, '')
        .replace(/\s+ו?(ל|ב)(בתים|קבוצות|עסקים|משפחות|ציבור)\s*$/, '')
        .trim();
    } while (s !== prev);
    return s;
  }

  /** Read the sentence. Returns what the system understood — never throws. */
  function parse(text) {
    const products = [];
    const seen = new Set();
    const trades = {};
    let season = null;
    const add = (label, entry) => {
      const key = label.trim();
      if (!key || seen.has(key) || products.length >= 8) return;
      seen.add(key);
      products.push({ name: key, step: entry.step || 'call', auto: !!entry.k });
      if (entry.trade) trades[entry.trade] = (trades[entry.trade] || 0) + 1;
      if (!season && entry.season) season = entry.season;
    };
    const institutions = /מוסד/.test(text);
    const pieces = String(text || '').split(/[,،;\n]+|\sוגם\s/).map((s) => s.trim()).filter(Boolean);
    for (const raw of pieces) {
      const whole = dropAudience(raw.replace(/^גם\s+/, ''));
      for (const part of splitAnd(whole)) {
        const piece = unAnd(part);
        if (!piece) continue;
        const hits = DICT.filter((d) => d.k.some((k) => hasKey(piece, k)));
        if (hits.length === 1) add(piece.length <= 26 ? piece : hits[0].label, hits[0]);
        else if (hits.length > 1) hits.forEach((h) => add(h.label, h));
        else if (piece.length >= 2 && !/^(ועוד|וכו|ועוד הרבה|הכל|הכול)$/.test(piece)) add(piece, {});
      }
    }
    const trade = Object.keys(trades).sort((a, b) => trades[b] - trades[a])[0] || '';
    return { products, trade, season, institutions };
  }

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  const KEY = 'expo-demo3';
  function fresh() {
    return {
      stage: 'onboard', // onboard | booth | evening | know
      biz: {
        name: '', said: '', products: [], trade: '', season: null, institutions: false,
        catalog: null, grades: 'classic', roles: [], devices: 1, staff: false,
        learned: {}, // where each setting came from: onboard | booth | evening
      },
      leads: [], seq: 1, rules: { steps: {}, boostRoles: false, holdForSeason: false }, answered: {},
      ready: false,
    };
  }
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch (e) { S = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* private window */ } };
  const words = () => GRADES[S.biz.grades].words;
  const learn = (what, when) => { S.biz.learned[what] = when; };

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
          `<button class="moment" data-go="${k}" aria-current="${st === k}" ${k !== 'onboard' && !S.ready ? 'disabled' : ''}${k === 'onboard' && S.biz.staff ? ' disabled' : ''}><span class="n">${n}</span>${t}</button>`).join('')}
      </nav>
      ${S.biz.staff ? '<span class="lock">🔒 מצב עובד</span>' : ''}
      <button class="icon-btn" data-act="menu" aria-label="תפריט">⋯</button>
    </div>`;
  }

  // ------------------------------------------------------------------
  // Moment 1 — one sentence
  // ------------------------------------------------------------------
  function viewOnboard(m) {
    m.innerHTML = `<div class="onb">
      <section class="card">
        <h1>מה אתה מוכר?</h1>
        <p class="muted">תכתוב כמו שהיית אומר ללקוח. זה הכול, את השאר נסדר לבד.</p>
        <textarea id="say" class="say" placeholder="למשל: מטבחים, ארונות קיר ודלתות פנים, גם למוסדות">${esc(S.biz.said)}</textarea>
        <div class="examples"><span class="faint">דוגמה:</span>
          ${Object.keys(EXAMPLES).map((k) => `<button class="chip" data-ex="${esc(k)}">${esc(k)}</button>`).join('')}
        </div>
        <div class="label">שם העסק <small>רשות</small></div>
        <input id="bizname" class="text-input" value="${esc(S.biz.name)}" placeholder="למשל: נגריית הדר" autocomplete="off">
        <p class="honest">בדוגמית המשפט נקרא לפי רשימת מילים. במערכת האמיתית — בינה מלאכותית, והמסכים נשארים אותו דבר.</p>
      </section>
      <section class="card" id="preview"></section>
    </div>`;
    const say = $('#say');
    let t;
    say.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => understand(say.value), 160); });
    $('#bizname').addEventListener('input', (e) => { S.biz.name = e.target.value.trim(); save(); renderTop(); renderPreview(); });
    renderPreview();
    if (!S.biz.said) setTimeout(() => say.focus(), 40);
  }

  /** Re-read the sentence, but keep any next step the person already changed by hand. */
  function understand(text) {
    const r = parse(text);
    const byHand = {};
    S.biz.products.forEach((p) => { if (p.byHand) byHand[p.name] = p.step; });
    S.biz.said = text;
    S.biz.products = r.products.map((p) => (byHand[p.name] ? Object.assign(p, { step: byHand[p.name], byHand: true }) : p));
    S.biz.trade = r.trade;
    S.biz.season = r.season;
    S.biz.institutions = r.institutions;
    save();
    renderPreview();
  }

  function renderPreview() {
    const box = $('#preview');
    if (!box) return;
    const b = S.biz;
    if (!b.products.length) {
      box.innerHTML = `<h2>ככה הדוכן שלך ייראה</h2><div class="empty">תתחיל לכתוב משמאל,<br>והדוכן ייבנה כאן תוך כדי.</div>`;
      return;
    }
    box.innerHTML = `
      <h2>ככה הדוכן שלך ייראה</h2>
      <ul class="understood">
        ${b.trade ? `<li>הבנו שהתחום שלך: <b>${esc(b.trade)}</b></li>` : ''}
        ${b.institutions ? '<li>עובד גם <b>עם מוסדות</b> — בדוכן יהיה כפתור לסמן תפקיד</li>' : ''}
        ${b.season ? `<li>העונה החזקה שלך: <b>${esc(b.season)}</b> — נשמור לך לשם את מי שאמר "בהמשך"</li>` : ''}
      </ul>
      <div class="mini">
        <div class="faint">כשמישהו ניגש לדוכן, תראה:</div>
        <div class="warmth">${words().map((w, i) => `<button class="warm-btn w${i}" tabindex="-1">${esc(w)}</button>`).join('')}</div>
        <div class="label">במה התעניין</div>
        <div class="chips">${b.products.map((p) => `<span class="chip">${esc(p.name)}</span>`).join('')}</div>
      </div>
      <div class="label">ומה קורה אחר כך <small>לגעת כדי לשנות</small></div>
      <div>${b.products.map((p, i) => `
        <div class="step-row">
          <div><span class="what">מי ששאל על ${esc(p.name)}</span> <span class="muted">← ${esc(STEPS[p.step].label)}, תוך ${STEPS[p.step].days} ימים</span></div>
          <div class="chips">${Object.keys(STEPS).filter((k) => k !== 'call').map((k) =>
            `<button class="chip" data-step="${i}" data-k="${k}" aria-pressed="${p.step === k}">${esc(STEPS[k].short)}</button>`).join('')}</div>
        </div>`).join('')}</div>
      <div class="actions"><button class="btn primary big" data-act="ready">זה נכון — לדוכן ←</button></div>`;
  }

  // ------------------------------------------------------------------
  // Moment 2 — the booth, with settings that arrive when needed
  // ------------------------------------------------------------------
  let openId = null;
  let idleTimer = null;
  const IDLE = 8000;

  function viewBooth(m) {
    m.innerHTML = `<input id="q" class="search" type="search" placeholder="שתיים-שלוש אותיות מהשם" autocomplete="off" autocapitalize="off">
      <div id="slot"></div>
      <p class="foot" id="foot">דוגמית 3 · נתוני הדגמה · ${S.leads.length} נקלטו</p>`;
    const q = $('#q');
    q.addEventListener('input', () => { openId = null; stopIdle(); renderResults(q.value); });
    if (openId) renderLead(); else renderResults('');
    setTimeout(() => q.focus(), 30);
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
    if (!l) { l = { id: S.seq++, pid: i, at: Date.now(), warmth: null, products: [], role: null, roleOf: '', sent: false }; S.leads.push(l); }
    save();
    openId = l.id;
    const f = $('#foot'); if (f) f.textContent = 'דוגמית 3 · נתוני הדגמה · ' + S.leads.length + ' נקלטו';
    $('#q').value = '';
    renderLead();
    toast('✓ נשמר: ' + People.name(People.get(i)));
  }

  function renderLead() {
    const l = S.leads.find((x) => x.id === openId);
    const slot = $('#slot');
    if (!l || !slot) return;
    const p = People.get(l.pid);
    const showRoles = S.biz.institutions || S.biz.roles.length;
    slot.innerHTML = `<div class="lead">
      <div class="timer" id="timer"></div>
      <div class="lead-head"><div><span class="nm">${esc(People.name(p))}</span> <span class="muted">${esc(p[5])}</span>
        <div class="faint">${esc(People.meta(p))}</div></div>
        <button class="btn" data-act="close">חזרה לחיפוש</button></div>
      <div class="warmth">${words().map((w, k) => `<button class="warm-btn w${k}" data-warm="${k}" aria-pressed="${l.warmth === k}">${esc(w)}</button>`).join('')}</div>
      ${S.biz.learned.grades ? '' : '<div class="hint">לחיצה ארוכה על כפתור — לשנות את השמות</div>'}
      ${S.biz.products.length ? `<div class="label">במה התעניין <small>רשות</small></div>
        <div class="chips">${S.biz.products.map((pr) => `<button class="chip" data-prod="${esc(pr.name)}" aria-pressed="${l.products.includes(pr.name)}">${esc(pr.name)}</button>`).join('')}</div>` : ''}
      ${showRoles ? `<div class="label">מי הוא כאן <small>רשות</small></div>
        <div class="chips">${S.biz.roles.map((r) => `<button class="chip" data-role="${esc(r)}" aria-pressed="${l.role === r}">${esc(r)}</button>`).join('')}
          <button class="chip add" data-act="role-add">+ תפקיד</button></div>
        ${l.role && l.roleOf ? `<div class="hint">${esc(l.role)} · ${esc(l.roleOf)}</div>` : ''}` : ''}
      <div class="actions"><button class="btn" data-act="send">📎 ${l.sent ? 'החומר יישלח ✓' : 'שלח קטלוג'}</button></div>
    </div>`;
    startIdle();
  }

  function startIdle() {
    stopIdle();
    const bar = $('#timer');
    if (bar) { bar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: IDLE, easing: 'linear', fill: 'forwards' }); }
    idleTimer = setTimeout(() => { openId = null; const q = $('#q'); renderResults(q ? q.value : ''); if (q) q.focus(); }, IDLE);
  }
  function stopIdle() { if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; } }

  // ---- settings that arrive when needed ----
  function sheetGrades() {
    sheet(`<h2>איך לקרוא לדרגות?</h2><p class="muted">ייקבע לכל הלידים, גם לאלה שכבר נקלטו.</p>
      <div class="opts">${Object.entries(GRADES).map(([k, g]) => `<button class="opt" data-grades="${k}" aria-pressed="${S.biz.grades === k}">${esc(g.words.join(' · '))}<small>${esc(g.name)}</small></button>`).join('')}</div>`);
  }
  function sheetCatalog(lead) {
    sheet(`<h2>אין עדיין קטלוג</h2><p class="muted">לצלם עכשיו? מעכשיו כל "שלח קטלוג" יהיה נגיעה אחת.</p>
      <div class="opts">
        <label class="opt" for="cat-file">📷 לצלם או לבחור קובץ<small>תמונה או PDF</small></label>
        <input id="cat-file" type="file" accept="image/*,application/pdf" capture="environment" hidden>
        <button class="opt" data-act="sheet-close">לא עכשיו<small>הליד נשמר בלי שליחה</small></button>
      </div>`);
    $('#cat-file').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      S.biz.catalog = f.name; learn('catalog', 'booth');
      if (lead) lead.sent = true;
      save(); closeSheet(); renderLead();
      toast('הקטלוג נשמר. מעכשיו נשלח בנגיעה.');
    });
  }
  function sheetRole(lead) {
    const all = Array.from(new Set(DEFAULT_ROLES.concat(S.biz.roles)));
    sheet(`<h2>מי הוא כאן?</h2><p class="muted">מה שתבחר יישמר, ויופיע ככפתור בפעם הבאה.</p>
      <div class="opts">${all.map((r) => `<button class="opt" data-pickrole="${esc(r)}">${esc(r)}</button>`).join('')}</div>
      <div class="label">של מי? <small>רשות — שם בית הכנסת, הקבוצה או המוסד</small></div>
      <input id="role-of" class="text-input" placeholder="למשל: קבוצת שערי חסד" autocomplete="off">
      <div class="label">תפקיד אחר</div>
      <div style="display:flex;gap:8px"><input id="role-new" class="text-input" placeholder="למשל: ראש כולל" autocomplete="off">
        <button class="btn" data-act="role-new">הוספה</button></div>`);
    sheetLead = lead;
  }
  let sheetLead = null;
  function setRole(name) {
    if (!sheetLead) return;
    const of = ($('#role-of') && $('#role-of').value.trim()) || '';
    if (!S.biz.roles.includes(name)) { S.biz.roles.push(name); learn('roles', 'booth'); }
    sheetLead.role = name; sheetLead.roleOf = of;
    save(); closeSheet(); renderLead();
    toast(name + ' — נשמר, ויופיע ככפתור בפעם הבאה');
  }
  function sheetJoin() {
    sheet(`<h2>טאבלט נוסף לדוכן</h2>
      <p class="muted">אין קוד ואין הגדרה. פותחים בטאבלט השני את אותו קישור, והוא שואל:</p>
      <div class="join-mock"><div class="faint">בטאבלט השני</div>
        <h3 style="margin:8px 0">להצטרף לדוכן של ${esc(S.biz.name || 'העסק')}?</h3>
        <button class="btn primary" data-act="join">להצטרף</button></div>`);
  }
  function sheetStaff() {
    if (S.biz.staff) {
      sheet(`<h2>לבטל את מצב העובד?</h2><p class="muted">רק הבעלים משנה מוצרים והגדרות. בגרסה האמיתית — קוד אישי.</p>
        <div class="opts"><button class="opt" data-act="staff-off">אני הבעלים — לבטל</button><button class="opt" data-act="sheet-close">ביטול</button></div>`);
    } else {
      sheet(`<h2>מצב עובד</h2><p class="muted">בטאבלט הזה אפשר לקלוט ולתייג, אבל לא לשנות מוצרים או הגדרות. כדי שנגיעה בטעות לא תמחק כלום באמצע התערוכה.</p>
        <div class="opts"><button class="opt" data-act="staff-on">להפעיל</button><button class="opt" data-act="sheet-close">ביטול</button></div>`);
    }
  }

  // Long press on a warmth button opens the grade names, at the moment he cares.
  let pressTimer = null;
  let longFired = false;
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-warm]');
    if (!b) return;
    longFired = false;
    pressTimer = setTimeout(() => {
      longFired = true;
      if (S.biz.staff) return toast('🔒 שמות הדרגות — רק לבעלים');
      stopIdle(); sheetGrades();
    }, 550);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => document.addEventListener(ev, () => { clearTimeout(pressTimer); }));

  // ------------------------------------------------------------------
  // Moment 3 — the evening asks what could not be asked in the morning
  // ------------------------------------------------------------------
  function seedDay() {
    const rnd = (n) => Math.floor(Math.random() * n);
    const prods = S.biz.products.map((p) => p.name);
    const roles = S.biz.roles.length ? S.biz.roles : ['גבאי קבוצה', 'מנהל מוסד'];
    const taken = new Set(S.leads.map((l) => l.pid));
    const start = new Date(); start.setHours(10, 0, 0, 0);
    for (let n = 0; n < 22; n++) {
      let i; do { i = rnd(People.list.length); } while (taken.has(i));
      taken.add(i);
      const r = Math.random();
      const warmth = r < 0.2 ? null : r < 0.38 ? 0 : r < 0.66 ? 1 : 2;
      // the first product is the one most people ask about, as at a real booth
      const asked = prods.length ? [prods[Math.random() < 0.55 ? 0 : rnd(prods.length)]] : [];
      S.leads.push({ id: S.seq++, pid: i, at: start.getTime() + rnd(9 * 3600000), warmth, products: warmth === 2 ? [] : asked,
        role: Math.random() < 0.1 ? roles[rnd(roles.length)] : null, roleOf: '', sent: false, demo: true });
    }
    save();
  }

  function asks() {
    const out = [];
    const L = S.leads;
    S.biz.products.forEach((p) => {
      const n = L.filter((l) => l.products.includes(p.name) && l.warmth !== 2).length;
      if (n >= 3) out.push({ id: 'step:' + p.name, q: `${n} אנשים שאלו על ${p.name}. ${STEPS[p.step].label} תוך ${STEPS[p.step].days} ימים?`,
        yes: 'כן, לקבוע', apply: () => { S.rules.steps[p.name] = p.step; learn('steps', 'evening'); } });
    });
    const roled = L.filter((l) => l.role).length;
    if (roled) out.push({ id: 'roles', q: `סימנת ${roled} שמייצגים ציבור — גבאים, מוסדות, ועדים. להעלות אותם לראש הרשימה של מחר?`,
      yes: 'כן, ראשונים', apply: () => { S.rules.boostRoles = true; learn('boost', 'evening'); } });
    const later = L.filter((l) => l.warmth === 1 || l.warmth === 2).length;
    if (S.biz.season && later) out.push({ id: 'season', q: `${later} אמרו "בהמשך". לשמור אותם ל${S.biz.season}, ולהזכיר לך לפני?`,
      yes: 'כן, לשמור לעונה', apply: () => { S.rules.holdForSeason = true; learn('season', 'evening'); } });
    const untagged = L.filter((l) => l.warmth == null).length;
    if (untagged) out.push({ id: 'tag', q: `${untagged} עוד לא תויגו. לעבור עליהם עכשיו? בערך דקה.`, yes: 'לעבור', tag: true });
    return out;
  }

  function viewEvening(m) {
    if (S.leads.length < 8) seedDay();
    const list = asks();
    m.innerHTML = `<h1>ערב טוב. ${S.leads.length} אנשים היו אצלך היום.</h1>
      <p class="muted">כמה שאלות שבבוקר לא היה להן מובן. עכשיו יש לך מספרים לענות עליהן.</p>
      <div class="ask" style="margin-top:14px">${list.map((a) => {
        const done = S.answered[a.id];
        return `<div class="ask-card ${done ? 'done' : ''}"><div class="q">${esc(a.q)}</div>
          ${done ? `<div class="faint" style="margin-top:6px">${done === 'yes' ? '✓ נקבע' : 'דילגת'}</div>`
            : `<div class="actions"><button class="btn primary" data-ask="${esc(a.id)}" data-ans="yes">${esc(a.yes)}</button><button class="btn ghost" data-ask="${esc(a.id)}" data-ans="no">לא</button></div>`}
          ${a.tag && done === 'yes' ? tagList() : ''}
        </div>`;
      }).join('') || '<div class="empty">אין שאלות הערב.</div>'}</div>
      <h2 style="margin-top:26px">מחר בבוקר</h2>
      ${tomorrow()}`;
  }

  function tagList() {
    const left = S.leads.filter((l) => l.warmth == null);
    if (!left.length) return '<div class="faint" style="margin-top:6px">כולם תויגו.</div>';
    return `<div style="margin-top:8px">${left.map((l) => `<div class="tag-row"><span><b>${esc(People.name(People.get(l.pid)))}</b> <span class="muted">${esc(People.get(l.pid)[5])}</span></span>
      <span class="mini-w">${words().map((w, k) => `<button class="warm-btn w${k}" data-tag="${l.id}" data-k="${k}">${esc(w)}</button>`).join('')}</span></div>`).join('')}</div>`;
  }

  function stepFor(l) {
    const p = S.biz.products.find((x) => l.products.includes(x.name));
    if (p && S.rules.steps[p.name]) return STEPS[S.rules.steps[p.name]];
    if (p) return STEPS[p.step];
    return STEPS.call;
  }
  function tomorrow() {
    const held = [];
    const act = [];
    S.leads.forEach((l) => {
      if (S.rules.holdForSeason && (l.warmth === 1 || l.warmth === 2) && !l.role) held.push(l); else act.push(l);
    });
    const score = (l) => (l.warmth === 0 ? 100 : l.warmth === 1 ? 50 : l.warmth === 2 ? 5 : 20) + (S.rules.boostRoles && l.role ? 80 : 0);
    act.sort((a, b) => score(b) - score(a));
    const row = (l) => {
      const p = People.get(l.pid);
      const st = stepFor(l);
      const why = [l.warmth != null ? words()[l.warmth] : 'לא תויג'].concat(l.products, l.role ? [l.role] : []).join(' · ');
      return `<div class="row"><span><span class="dot w${l.warmth == null ? '' : l.warmth}"></span><span class="nm">${esc(People.name(p))}</span> <span class="muted">${esc(p[5])}</span></span>
        <span class="due">${esc(st.label)} · ${st.days === 1 ? 'מחר' : 'בעוד ' + st.days + ' ימים'}</span><span class="why">${esc(why)}</span></div>`;
    };
    return `<div class="rows">${act.slice(0, 12).map(row).join('')}</div>
      ${act.length > 12 ? `<div class="faint" style="margin-top:6px">ועוד ${act.length - 12} בהמשך השבוע.</div>` : ''}
      ${held.length ? `<details class="held"><summary>שמורים ל${esc(S.biz.season)} (${held.length})</summary><div class="rows">${held.map(row).join('')}</div></details>` : ''}`;
  }

  // ------------------------------------------------------------------
  // What the system knows — every capability still exists, and here is where it came from.
  // ------------------------------------------------------------------
  function viewKnow(m) {
    const b = S.biz;
    const src = (k) => ({ onboard: 'מהמשפט שכתבת', booth: 'מהדוכן', evening: 'מהערב' }[b.learned[k]] || 'ברירת מחדל');
    const rows = [
      ['מה אתה מוכר', b.products.map((p) => p.name).join(' · ') || '—', 'מהמשפט שכתבת'],
      ['מה קורה אחרי שיחה', b.products.map((p) => p.name + ': ' + STEPS[S.rules.steps[p.name] || p.step].short).join(' · ') || '—', b.learned.steps ? src('steps') : 'מהמשפט שכתבת'],
      ['התחום', b.trade || '—', 'מהמשפט שכתבת'],
      ['העונה', b.season || 'לא זוהתה', 'מהמשפט שכתבת'],
      ['שמות הדרגות', words().join(' · '), src('grades')],
      ['תפקידים', b.roles.join(' · ') || 'עוד לא תויג אף אחד', src('roles')],
      ['קטלוג', b.catalog || 'עוד לא — יישאל בשליחה הראשונה', src('catalog')],
      ['טאבלטים', b.devices + (b.devices === 1 ? ' טאבלט' : ' טאבלטים'), b.devices > 1 ? 'מהדוכן' : 'ברירת מחדל'],
      ['גבאים ומוסדות ראשונים', S.rules.boostRoles ? 'כן' : 'לא', src('boost')],
      ['לשמור "בהמשך" לעונה', S.rules.holdForSeason ? 'כן' : 'לא', src('season')],
    ];
    m.innerHTML = `<h1>מה המערכת יודעת עליך</h1>
      <p class="muted">אין כאן טופס. כל דבר נקבע ברגע שהיה לו מובן — וכאן רואים מאיפה.</p>
      <div class="know" style="margin-top:14px">${rows.map(([k, v, s]) => `<div class="know-row"><span class="k">${esc(k)}</span><span class="src">${esc(s)}</span><span class="v">${esc(v)}</span></div>`).join('')}</div>
      <div class="actions"><button class="btn" data-go="onboard">לשנות את המשפט</button><button class="btn" data-act="grades">לשנות שמות דרגות</button><button class="btn primary" data-go="booth">חזרה לדוכן</button></div>`;
  }

  // ------------------------------------------------------------------
  // Sheet, menu, toast
  // ------------------------------------------------------------------
  function sheet(html) {
    closeSheet();
    const s = document.createElement('div');
    s.className = 'scrim'; s.id = 'scrim';
    s.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    s.addEventListener('click', (e) => { if (e.target === s) closeSheet(); });
    document.body.appendChild(s);
  }
  function closeSheet() { const s = $('#scrim'); if (s) s.remove(); if (S.stage === 'booth' && openId) startIdle(); }
  function toggleMenu() {
    const old = $('#menu');
    if (old) return old.remove();
    const m = document.createElement('div');
    m.className = 'menu'; m.id = 'menu';
    const staff = S.biz.staff;
    m.innerHTML = [
      !staff && S.ready ? '<button data-go="know">מה המערכת יודעת עליך</button>' : '',
      S.ready ? '<button data-act="join-open">טאבלט נוסף לדוכן</button>' : '',
      S.ready ? `<button data-act="staff">${staff ? '🔒 מצב עובד פעיל — לבטל' : 'מצב עובד'}</button>` : '',
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
    if (!b) { const mn = $('#menu'); if (mn && !e.target.closest('#menu')) mn.remove(); return; }
    const d = b.dataset;
    if (!b.closest('#menu') && d.act !== 'menu') { const mn = $('#menu'); if (mn) mn.remove(); }
    if (S.stage === 'booth' && openId && b.closest('.lead')) startIdle();

    if (d.go) {
      $('#menu') && $('#menu').remove();
      if (d.go === 'onboard' && S.biz.staff) return toast('🔒 שינוי מוצרים — רק לבעלים');
      S.stage = d.go; openId = null; stopIdle(); save(); return render();
    }
    if (d.ex) { const t = EXAMPLES[d.ex]; $('#say').value = t; return understand(t); }
    if (d.step !== undefined) {
      const p = S.biz.products[+d.step];
      if (p) { p.step = d.k; p.byHand = true; save(); renderPreview(); }
      return;
    }
    if (d.pick !== undefined) return pick(+d.pick);
    if (d.warm !== undefined) {
      if (longFired) { longFired = false; return; }
      const l = S.leads.find((x) => x.id === openId);
      if (l) { const k = +d.warm; l.warmth = l.warmth === k ? null : k; save(); renderLead(); }
      return;
    }
    if (d.prod) {
      const l = S.leads.find((x) => x.id === openId);
      if (l) { const i = l.products.indexOf(d.prod); if (i >= 0) l.products.splice(i, 1); else l.products.push(d.prod); save(); renderLead(); }
      return;
    }
    if (d.role) {
      const l = S.leads.find((x) => x.id === openId);
      if (l) { l.role = l.role === d.role ? null : d.role; save(); renderLead(); }
      return;
    }
    if (d.pickrole) return setRole(d.pickrole);
    if (d.grades) {
      S.biz.grades = d.grades; learn('grades', 'booth'); save(); closeSheet();
      if (S.stage === 'booth' && openId) renderLead(); else render();
      return toast('השמות עודכנו: ' + words().join(' · '));
    }
    if (d.ask) {
      const a = asks().find((x) => x.id === d.ask);
      S.answered[d.ask] = d.ans;
      if (a && d.ans === 'yes' && a.apply) a.apply();
      save(); return render();
    }
    if (d.tag) {
      const l = S.leads.find((x) => x.id === +d.tag);
      if (l) { l.warmth = +d.k; save(); render(); }
      return;
    }

    switch (d.act) {
      case 'menu': return toggleMenu();
      case 'ready':
        if (!S.biz.products.length) return toast('כתוב קודם מה אתה מוכר');
        S.ready = true; S.stage = 'booth'; learn('products', 'onboard'); save(); return render();
      case 'close': openId = null; stopIdle(); renderResults(''); return $('#q') && $('#q').focus();
      case 'send': {
        const l = S.leads.find((x) => x.id === openId);
        if (!l) return;
        if (!S.biz.catalog) { stopIdle(); return sheetCatalog(l); }
        l.sent = !l.sent; save(); renderLead();
        return l.sent && toast('📎 ' + S.biz.catalog + ' יישלח ל' + People.name(People.get(l.pid)));
      }
      case 'role-add': { stopIdle(); return sheetRole(S.leads.find((x) => x.id === openId)); }
      case 'role-new': { const v = $('#role-new') && $('#role-new').value.trim(); if (v) setRole(v); return; }
      case 'sheet-close': return closeSheet();
      case 'grades': return sheetGrades();
      case 'join-open': $('#menu') && $('#menu').remove(); return sheetJoin();
      case 'join': S.biz.devices += 1; save(); closeSheet(); return toast('טאבלט ' + S.biz.devices + ' מחובר. כולם רואים את אותם לידים.');
      case 'staff': $('#menu') && $('#menu').remove(); return sheetStaff();
      case 'staff-on': S.biz.staff = true; if (S.stage === 'know') S.stage = 'booth'; save(); closeSheet(); render(); return toast('🔒 מצב עובד — קולטים ומתייגים, לא משנים הגדרות');
      case 'staff-off': S.biz.staff = false; save(); closeSheet(); render(); return toast('מצב עובד בוטל');
      case 'reset': S = fresh(); openId = null; stopIdle(); save(); return render();
    }
  });

  render();
})();
