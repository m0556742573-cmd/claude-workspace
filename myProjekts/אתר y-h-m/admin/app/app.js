/* YHM control center: sign in with Google, then the parts of the center. Data comes through public.hq_* functions. */
(function () {
  'use strict';
  var C = window.YHM_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var main = $('#main'), root = document.documentElement;

  /* ---------- the parts of the center; the later ones are listed with their phase ---------- */
  var PARTS = [
    { id: 'overview', label: 'סקירה' },
    { id: 'site', label: 'האתר' },
    { id: 'campaigns', label: 'קישורי קמפיין' },
    { id: 'whatsapp', label: 'וואטסאפ', phase: 2 },
    { id: 'inquiries', label: 'פניות', phase: 3 },
    { id: 'clients', label: 'לקוחות ופרויקטים', phase: 4 },
    { id: 'booth', label: 'דוכן חכם', phase: 5 },
    { id: 'marketing', label: 'שיווק ותוכן', phase: 6 },
    { id: 'brand', label: 'נכסי מותג', phase: 6 },
    { id: 'settings', label: 'הגדרות' }
  ];

  /* ---------- small helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Number(n || 0).toLocaleString('he-IL'); }
  function many(n, one, word) { return !n ? 'אין ' + word : n === 1 ? one : fmt(n) + ' ' + word; }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 2600); }
  function logoInto(el) { el.innerHTML = $('#logo').innerHTML; }
  document.querySelectorAll('[data-logo]').forEach(logoInto);

  var EVENT = { visit: 'נכנס לאתר', whatsapp: 'לחץ על וואטסאפ', phone: 'לחץ על הטלפון', mail: 'לחץ על המייל' };
  var DEVICE = { mobile: 'נייד', desktop: 'מחשב', tablet: 'טאבלט' };
  /* Cloudflare names cities in English */
  var CITY = { 'Jerusalem': 'ירושלים', 'Bnei Brak': 'בני ברק', 'Tel Aviv': 'תל אביב', 'Haifa': 'חיפה', 'Petah Tikva': 'פתח תקווה', 'Beit Shemesh': 'בית שמש', 'Ashdod': 'אשדוד', 'Modiin Illit': 'מודיעין עילית', "Modi'in Illit": 'מודיעין עילית', 'Elad': 'אלעד', 'Beitar Illit': 'ביתר עילית', 'Netanya': 'נתניה', 'Rishon LeZion': 'ראשון לציון', 'Rehovot': 'רחובות', 'Holon': 'חולון', 'Ramat Gan': 'רמת גן', 'Bat Yam': 'בת ים', 'Herzliya': 'הרצליה', 'Kfar Saba': 'כפר סבא', "Ra'anana": 'רעננה', 'Hadera': 'חדרה', 'Ashkelon': 'אשקלון', 'Beersheba': 'באר שבע', "Be'er Sheva": 'באר שבע', 'Safed': 'צפת', 'Tiberias': 'טבריה', 'Kiryat Gat': 'קריית גת', 'Modiin': 'מודיעין', 'Rosh HaAyin': 'ראש העין', 'Lod': 'לוד', 'Ramla': 'רמלה', 'Givatayim': 'גבעתיים', 'Or Yehuda': 'אור יהודה', 'Kiryat Ata': 'קריית אתא', 'Nazareth': 'נצרת', 'Eilat': 'אילת' };
  function city(c) { return c ? CITY[c] || c : 'לא ידוע'; }
  var BUTTON = { whatsapp: 'וואטסאפ', phone: 'טלפון', mail: 'מייל' };
  function source(ref, campaign) {
    if (campaign) return 'קמפיין ' + campaign;
    if (!ref) return 'ישיר';
    if (/whatsapp|wa\.me/.test(ref)) return 'וואטסאפ';
    if (/google\./.test(ref)) return 'גוגל';
    if (/facebook|fb\./.test(ref)) return 'פייסבוק';
    if (/instagram/.test(ref)) return 'אינסטגרם';
    if (/y-h-m\.com$/.test(ref)) return 'מתוך האתר';
    return ref;
  }
  /* google.com and google.co.il are both גוגל: rows come per referrer and campaign, and are merged by name */
  function bySource(rows) {
    var m = {};
    (rows || []).forEach(function (x) { var k = source(x.k, x.c); m[k] = (m[k] || 0) + x.visits; });
    return Object.keys(m).map(function (k) { return { k: k, n: m[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);
  }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'עכשיו';
    if (s < 3600) { var m = Math.round(s / 60); return m === 1 ? 'לפני דקה' : 'לפני ' + m + ' דקות'; }
    if (s < 86400) { var h = Math.round(s / 3600); return h === 1 ? 'לפני שעה' : h === 2 ? 'לפני שעתיים' : 'לפני ' + h + ' שעות'; }
    if (s < 172800) return 'אתמול';
    return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  }
  function greet() { var h = new Date().getHours(); return h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : h < 21 ? 'ערב טוב' : 'לילה טוב'; }
  function delta(now, prev) {
    if (!prev && !now) return { t: 'אין עדיין נתונים להשוואה', up: false };
    if (!prev) return { t: 'חדש בתקופה הזו', up: true };
    var p = Math.round((now - prev) / prev * 100);
    if (p === 0) return { t: 'כמו בתקופה הקודמת', up: false };
    return { t: (p > 0 ? '+' : '') + p + '% מהתקופה הקודמת', up: p > 0 };
  }
  function range(key) {
    var to = new Date(), from = new Date();
    if (key === 'today') from.setHours(0, 0, 0, 0);
    else from.setDate(from.getDate() - (key === '30' ? 30 : key === '90' ? 90 : 7));
    return { from: from.toISOString(), to: to.toISOString(), bucket: key === 'today' ? 'hour' : 'day' };
  }

  /* ---------- data ---------- */
  var sb = null, DATA;
  if (C.demo) DATA = demoData();
  else {
    sb = window.supabase.createClient(C.url, C.key, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
    var rpc = function (fn, args) { return sb.rpc(fn, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; }); };
    DATA = {
      isAdmin: function () { return rpc('hq_is_admin'); },
      stats: function (r) { return rpc('hq_stats', { p_from: r.from, p_to: r.to, p_bucket: r.bucket }); },
      recent: function (n) { return rpc('hq_recent', { p_limit: n }); },
      campaigns: function () { return rpc('hq_campaigns'); },
      addCampaign: function (name, code, note) { return rpc('hq_add_campaign', { p_name: name, p_code: code, p_note: note || null }); },
      admins: function () { return rpc('hq_admins'); }
    };
  }

  /* ---------- sign in ---------- */
  function showGate(text, withOut) {
    $('#shell').hidden = true; $('#gate').hidden = false;
    $('#gate-text').textContent = text; $('#google').hidden = !!withOut; $('#gate-out').hidden = !withOut;
  }
  $('#google').addEventListener('click', function () {
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/admin', queryParams: { prompt: 'select_account' } } });
  });
  function signOut() { if (sb) sb.auth.signOut().then(function () { location.replace('/admin'); }); else location.reload(); }
  $('#gate-out').addEventListener('click', signOut);
  $('#out').addEventListener('click', signOut);
  $('#theme').addEventListener('click', function () {
    var next = root.dataset.theme === 'snow' ? 'forest' : 'snow';
    root.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', next === 'snow' ? '#F4F6F1' : '#0B1A13');
    try { localStorage.setItem('yhm-theme', next); } catch (e) {}
    route();
  });

  function start() {
    if (C.demo) return enter();
    sb.auth.getSession().then(function (r) {
      if (/[?&](code|error)=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);   /* the sign-in leaves ?code= behind */
      if (!r.data.session) return showGate('כניסה לבעלים בלבד.', false);
      DATA.isAdmin().then(function (ok) {
        if (ok) enter();
        else showGate('לחשבון ' + r.data.session.user.email + ' אין גישה למרכז הבקרה.', true);
      }).catch(function () { showGate('משהו השתבש בבדיקת ההרשאה. כדאי לנסות שוב.', true); });
    });
  }
  function enter() {
    $('#gate').hidden = true; $('#shell').hidden = false;
    $('#nav').innerHTML = PARTS.map(function (p) {
      return p.phase
        ? '<span class="nav-item later" title="בשלב ' + p.phase + '"><span class="mark"></span>' + p.label + '<span class="phase">שלב ' + p.phase + '</span></span>'
        : '<a class="nav-item" href="#' + p.id + '" data-id="' + p.id + '"><span class="mark"></span>' + p.label + '</a>';
    }).join('');
    window.addEventListener('hashchange', route);
    route();
  }

  /* ---------- router ---------- */
  var VIEWS = { overview: overview, site: site, campaigns: campaigns, settings: settings };
  function route() {
    var id = (location.hash || '#overview').slice(1);
    if (!VIEWS[id]) id = 'overview';
    document.querySelectorAll('.nav-item[data-id]').forEach(function (a) { if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    VIEWS[id]();
    main.focus({ preventScroll: true });
  }
  function fail(e) { main.insertAdjacentHTML('afterbegin', '<div class="notice warn">לא הצלחתי לטעון את הנתונים: ' + esc(e && e.message || e) + '</div>'); }

  /* ---------- the chart: visits as moss bars, inquiries as lit bars inside them ---------- */
  /* columns in HTML, so the dates stay readable at any width; the first day is on the right, as Hebrew reads */
  function chart(series, bucket) {
    if (!series || !series.length) return '<div class="empty">עוד אין כניסות בתקופה הזו.</div>';
    var n = series.length, every = Math.ceil(n / 7), gap = n > 40 ? 1 : n > 14 ? 3 : 6;
    var max = Math.max(1, Math.max.apply(null, series.map(function (s) { return s.visits; })));
    return '<div class="cols" style="gap:' + gap + 'px" role="img" aria-label="כניסות ופניות לאורך הזמן">' + series.map(function (s, i) {
      var d = new Date(s.t), t = bucket === 'hour' ? d.getHours() + ':00' : d.getDate() + '.' + (d.getMonth() + 1);
      var label = (bucket === 'hour' ? t : d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })) + ': ' + many(s.visits, 'כניסה אחת', 'כניסות') + ', ' + many(s.inquiries, 'פנייה אחת', 'פניות');
      return '<div class="c" title="' + esc(label) + '"><div class="b" style="height:' + (s.visits / max * 100).toFixed(1) + '%">'
        + (s.inquiries ? '<i style="height:' + Math.min(100, s.inquiries / Math.max(1, s.visits) * 100).toFixed(1) + '%"></i>' : '') + '</div>'
        + ((n - 1 - i) % every === 0 ? '<span class="t">' + t + '</span>' : '') + '</div>';
    }).join('') + '</div>'
      + '<div class="legend"><span><i style="background:var(--bar)"></i>כניסות</span><span><i style="background:var(--lit)"></i>פניות</span></div>';
  }
  function barList(rows, label, ask) {
    if (!rows || !rows.length) return '<div class="empty">אין עדיין.</div>';
    var max = Math.max.apply(null, rows.map(function (r) { return r.n; }));
    return '<ul class="bars">' + rows.map(function (r) {
      return '<li class="' + (ask ? 'ask' : '') + '"><span>' + esc(label ? label(r.k) : r.k) + '</span><span class="n">' + fmt(r.n) + '</span><span class="track"><span class="fill" style="width:' + (r.n / max * 100).toFixed(1) + '%"></span></span></li>';
    }).join('') + '</ul>';
  }
  function chips(name, keys, cur) {
    var L = { today: 'היום', '7': '7 ימים', '30': '30 ימים', '90': '90 ימים' };
    return '<div class="chips" role="group" aria-label="תקופה">' + keys.map(function (k) { return '<button class="chip" type="button" data-' + name + '="' + k + '" aria-pressed="' + (k === cur) + '">' + L[k] + '</button>'; }).join('') + '</div>';
  }
  function feed(rows) {
    if (!rows || !rows.length) return '<div class="empty">עוד אין פעילות. היא תופיע כאן ברגע שמישהו ייכנס לאתר.</div>';
    return '<ul class="feed">' + rows.map(function (e) {
      var where = [e.city && city(e.city), DEVICE[e.device]].filter(Boolean).join(' · ');
      return '<li class="' + (e.type === 'visit' ? '' : 'ask') + '"><span class="dot"></span><span class="what"><b>' + EVENT[e.type] + '</b><small>' + (where ? esc(where) + ' · ' : '') + '<bdi>' + esc(source(e.referrer, e.campaign)) + '</bdi></small></span><span class="when">' + ago(e.at) + '</span></li>';
    }).join('') + '</ul>';
  }

  /* ---------- סקירה ---------- */
  var overviewRange = '7';
  function overview() {
    main.innerHTML = '<div class="head"><div><h1>' + greet() + ', יצחק</h1><p>מה קרה באתר, בקצרה.</p></div>' + chips('r', ['today', '7', '30'], overviewRange) + '</div><div id="ov" class="empty">טוען…</div>';
    main.querySelectorAll('[data-r]').forEach(function (b) { b.onclick = function () { overviewRange = b.dataset.r; overview(); }; });
    var r = range(overviewRange);
    Promise.all([DATA.stats(r), DATA.recent(12)]).then(function (x) {
      var s = x[0], dv = delta(s.visits, s.prev_visits), dp = delta(s.visitors, s.prev_visitors), di = delta(s.inquiries, s.prev_inquiries);
      var top = (s.buttons || [])[0];
      $('#ov').outerHTML =
        '<div class="grid kpis">'
        + '<div class="card kpi"><div class="v num">' + fmt(s.visits) + '</div><div class="l">כניסות</div><div class="d' + (dv.up ? ' up' : '') + '">' + dv.t + '</div></div>'
        + '<div class="card kpi"><div class="v num">' + fmt(s.visitors) + '</div><div class="l">מבקרים</div><div class="d' + (dp.up ? ' up' : '') + '">' + dp.t + '</div></div>'
        + '<div class="card kpi"><div class="v num">' + fmt(s.inquiries) + '</div><div class="l" title="וואטסאפ, טלפון ומייל">פניות</div><div class="d' + (di.up ? ' up' : '') + '">' + (top ? 'הכי הרבה: ' + BUTTON[top.k] : di.t) + '</div></div>'
        + '</div>'
        + '<div class="grid two"><div class="card chart"><h2>כניסות ופניות</h2>' + chart(s.series, r.bucket) + '</div>'
        + '<div class="card"><h2>פעילות אחרונה</h2>' + feed(x[1]) + '</div></div>';
    }).catch(fail);
  }

  /* ---------- האתר ---------- */
  var siteRange = '30';
  function site() {
    main.innerHTML = '<div class="head"><div><h1>האתר</h1><p>מי נכנס, מאיפה הגיע, ומה עשה.</p></div>' + chips('r', ['7', '30', '90'], siteRange) + '</div><div id="st" class="empty">טוען…</div>';
    main.querySelectorAll('[data-r]').forEach(function (b) { b.onclick = function () { siteRange = b.dataset.r; site(); }; });
    var r = range(siteRange);
    DATA.stats(r).then(function (s) {
      var conv = s.visitors ? Math.min(100, Math.round((s.askers || 0) / s.visitors * 1000) / 10) : 0;      /* visitors who reached out at least once */
      $('#st').outerHTML =
        '<div class="grid kpis">'
        + '<div class="card kpi"><div class="v num">' + fmt(s.visits) + '</div><div class="l">כניסות</div></div>'
        + '<div class="card kpi"><div class="v num">' + fmt(s.inquiries) + '</div><div class="l">פניות</div></div>'
        + '<div class="card kpi"><div class="v num">' + conv + '%</div><div class="l">מהמבקרים פנו אליך</div></div>'
        + '</div>'
        + '<div class="grid three">'
        + '<div class="card"><h2>מאיפה הגיעו</h2>' + barList(bySource(s.sources)) + '</div>'
        + '<div class="card"><h2>על מה לחצו</h2>' + barList(s.buttons, function (k) { return BUTTON[k] || k; }, true) + '</div>'
        + '<div class="card"><h2>מכשיר</h2>' + barList(s.devices, function (k) { return DEVICE[k] || 'לא ידוע'; }) + '</div>'
        + '</div>'
        + '<div class="grid two">'
        + '<div class="card"><h2>ערים</h2>' + barList(s.cities, city) + '</div>'
        + '<div class="card"><h2>עמודים</h2>' + barList(s.pages, function (k) { return k === '/' ? 'דף הבית' : k; }) + '</div>'
        + '</div>';
    }).catch(fail);
  }

  /* ---------- קישורי קמפיין ---------- */
  function slug(s) {
    var t = String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (t.length >= 3) return t.slice(0, 24);
    return Math.random().toString(36).slice(2, 7);
  }
  function campaigns() {
    main.innerHTML = '<div class="head"><div><h1>קישורי קמפיין</h1><p>לכל קמפיין, פוסט או סטטוס יש קישור משלו, וכך רואים מה הביא כניסות ופניות.</p></div></div>'
      + '<div class="card" style="margin-bottom:14px"><h2>קמפיין חדש</h2><form class="form" id="cf">'
      + '<div class="field"><label for="c-name">שם</label><input class="input" id="c-name" required maxlength="80" placeholder="למשל: סטטוס חנוכה"></div>'
      + '<div class="field" style="max-width:240px"><label for="c-code">קוד בקישור</label><input class="input" id="c-code" dir="ltr" maxlength="24" pattern="[a-z0-9\\-]{2,24}" title="אותיות באנגלית, ספרות ומקף" placeholder="hanukah"><span class="hint">אותיות באנגלית, ספרות ומקף</span></div>'
      + '<button class="btn primary" type="submit">ליצור קישור</button></form></div>'
      + '<div id="cl" class="empty">טוען…</div>';
    var name = $('#c-name'), code = $('#c-code'), touched = false;
    code.addEventListener('input', function () { touched = true; });
    name.addEventListener('input', function () { if (!touched) code.value = /[a-z]/i.test(name.value) ? slug(name.value) : ''; });
    $('#cf').addEventListener('submit', function (e) {
      e.preventDefault();
      var c = (code.value.trim() || slug(name.value)).toLowerCase();
      var bad = 'בקוד יכולים להיות רק אותיות באנגלית, ספרות ומקף, בין 2 ל-24 תווים.';
      if (!/^[a-z0-9-]{2,24}$/.test(c)) { toast(bad); code.focus(); return; }
      DATA.addCampaign(name.value.trim(), c).then(function () { toast('הקישור מוכן: y-h-m.com/c/' + c); campaigns(); })
        .catch(function (err) { var m = String(err && (err.code || err.message)); toast(/duplicate|exists|23505/.test(m) ? 'הקוד הזה כבר תפוס. כדאי לבחור אחר.' : /23514|check/.test(m) ? bad : 'לא נשמר: ' + (err && err.message || err)); });
    });
    DATA.campaigns().then(function (rows) {
      if (!rows || !rows.length) {
        $('#cl').outerHTML = '<div class="empty-big"><svg viewBox="0 0 120 40" aria-hidden="true"><rect x="4" y="24" width="30" height="6" rx="3" fill="var(--loose)" transform="rotate(-8 19 27)"/><rect x="45" y="16" width="30" height="6" rx="3" fill="var(--loose)" transform="rotate(16 60 19)"/><rect x="86" y="8" width="30" height="6" rx="3" fill="var(--loose)" transform="rotate(-22 101 11)"/></svg>עוד אין קמפיינים. הקישור הראשון שתיצור יופיע כאן.</div>';
        return;
      }
      $('#cl').outerHTML = '<div class="table-wrap"><table><thead><tr><th>קמפיין</th><th>קישור</th><th>כניסות</th><th>פניות</th><th>נוצר</th></tr></thead><tbody>'
        + rows.map(function (r) {
          var link = 'y-h-m.com/c/' + r.code;
          return '<tr><td><b>' + esc(r.name) + '</b></td><td><span class="link-cell"><code>' + esc(link) + '</code><button class="btn ghost sm" type="button" data-copy="https://' + esc(link) + '">להעתיק</button></span></td><td class="n">' + fmt(r.visits) + '</td><td class="n">' + fmt(r.inquiries) + '</td><td>' + new Date(r.created_at).toLocaleDateString('he-IL') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      main.querySelectorAll('[data-copy]').forEach(function (b) {
        b.onclick = function () {
          var v = b.dataset.copy;
          (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { toast('הקישור הועתק'); }, function () { toast(v); });
        };
      });
    }).catch(fail);
  }

  /* ---------- הגדרות ---------- */
  function settings() {
    main.innerHTML = '<div class="head"><div><h1>הגדרות</h1><p>מי נכנס למרכז, ואיך המעקב באתר עובד.</p></div></div><div id="sg" class="empty">טוען…</div>';
    Promise.all([DATA.admins(), DATA.recent(1)]).then(function (x) {
      var last = x[1] && x[1][0];
      $('#sg').outerHTML = '<div class="grid two" style="margin-top:0">'
        + '<div class="card"><h2>מי נכנס</h2><ul class="feed">' + (x[0] || []).map(function (a) { return '<li class="ask"><span class="dot"></span><span dir="ltr">' + esc(a.email) + '</span><span class="when">' + esc(a.note || '') + '</span></li>'; }).join('') + '</ul><p class="note">רק חשבונות גוגל ברשימה הזו נכנסים. כל חשבון אחר מקבל "אין גישה".</p><button class="btn ghost sm" id="out2" type="button" style="margin-top:12px">יציאה מהחשבון</button></div>'
        + '<div class="card"><h2>המעקב באתר</h2><p style="margin:0 0 8px">' + (last ? 'האירוע האחרון הגיע ' + ago(last.at) + '.' : 'עוד לא הגיע אף אירוע מהאתר.') + '</p>'
        + '<p class="note">נספרות כניסות ולחיצות על וואטסאפ, טלפון ומייל. לא נשמרים כתובות IP, עוגיות או כל פרט שמזהה אדם. כל מבקר נספר פעם אחת ביום, לפי קוד מוצפן שמתחלף מדי יום.</p>'
        + '<label class="check"><input type="checkbox" id="me"' + (notMe() ? ' checked' : '') + '><span>לא לספור את הכניסות שלי מהדפדפן הזה<small>כדי שהבדיקות שלך באתר לא ייכנסו לנתונים. בדפדפן אחר או בטלפון אחר הכניסות ייספרו.</small></span></label></div>'
        + '</div>';
      $('#out2').onclick = signOut;
      $('#me').onchange = function () {
        try { if (this.checked) localStorage.setItem('yhm-me', '1'); else localStorage.removeItem('yhm-me'); } catch (e) {}
        toast(this.checked ? 'הכניסות מהדפדפן הזה לא ייספרו' : 'הכניסות מהדפדפן הזה ייספרו');
      };
    }).catch(fail);
  }
  function notMe() { try { return localStorage.getItem('yhm-me') === '1'; } catch (e) { return false; } }

  /* ---------- sample data, only with demo: true in the config ---------- */
  function demoData() {
    var cities = ['Bnei Brak', 'Jerusalem', 'Beit Shemesh', 'Elad', 'Modiin Illit', 'Petah Tikva'], types = 'vvvvvvwvvvvvvvvpvvvvvvvvvwvvvvvvm'.split('').map(function (c) { return { v: 'visit', w: 'whatsapp', p: 'phone', m: 'mail' }[c]; });
    var refs = [null, 'web.whatsapp.com', 'www.google.com', null, 'wa.me', 'www.google.co.il'];
    var ev = [];
    for (var i = 0; i < 700; i++) ev.push({ at: new Date(Date.now() - Math.pow(Math.random(), 1.4) * 32 * 86400000).toISOString(), type: types[i % types.length], city: cities[i % cities.length], device: i % 4 ? 'mobile' : 'desktop', referrer: refs[i % refs.length], campaign: i % 9 === 0 ? 'status-hanukah' : null, page: '/', v: 'v' + (i % 120) });
    ev.sort(function (a, b) { return b.at < a.at ? -1 : 1; });
    var camps = [{ name: 'סטטוס חנוכה', code: 'status-hanukah', created_at: new Date(Date.now() - 12 * 86400000).toISOString() }];
    function nameOf(code) { var c = code && camps.filter(function (x) { return x.code === code; })[0]; return c ? c.name : null; }
    function count(list, f) { var m = {}; list.forEach(function (e) { var k = f(e); m[k] = (m[k] || 0) + 1; }); return Object.keys(m).map(function (k) { return { k: k === 'null' ? null : k, n: m[k] }; }).sort(function (a, b) { return b.n - a.n; }); }
    return {
      isAdmin: function () { return Promise.resolve(true); },
      stats: function (r) {
        var a = new Date(r.from), b = new Date(r.to), span = b - a, pa = new Date(a - span);
        var cur = ev.filter(function (e) { var t = new Date(e.at); return t >= a && t <= b; }), prev = ev.filter(function (e) { var t = new Date(e.at); return t >= pa && t < a; });
        var asks = function (l) { return l.filter(function (e) { return e.type !== 'visit'; }).length; };
        var vis = function (l) { return l.filter(function (e) { return e.type === 'visit'; }); };
        var series = [], t = new Date(a), next;
        if (r.bucket === 'hour') t.setMinutes(0, 0, 0); else t.setHours(0, 0, 0, 0);
        for (; t <= b; t = next) {                               /* calendar steps, so the clock change does not split a day */
          next = new Date(t); if (r.bucket === 'hour') next.setHours(t.getHours() + 1); else next.setDate(t.getDate() + 1);
          var inb = cur.filter(function (e) { var x = new Date(e.at); return x >= t && x < next; });
          series.push({ t: t.toISOString(), visits: vis(inb).length, inquiries: asks(inb) });
        }
        var srcs = count(vis(cur), function (e) { return (e.referrer || '') + '|' + (e.campaign || ''); }).map(function (x) { var p = x.k.split('|'); return { k: p[0] || null, c: nameOf(p[1]), visits: x.n }; });
        return Promise.resolve({ visits: vis(cur).length, visitors: new Set(vis(cur).map(function (e) { return e.v; })).size, inquiries: asks(cur), askers: new Set(cur.filter(function (e) { return e.type !== 'visit'; }).map(function (e) { return e.v; })).size, prev_visits: vis(prev).length, prev_visitors: new Set(vis(prev).map(function (e) { return e.v; })).size, prev_inquiries: asks(prev), series: series, sources: srcs,
          buttons: count(cur.filter(function (e) { return e.type !== 'visit'; }), function (e) { return e.type; }), devices: count(vis(cur), function (e) { return e.device; }), cities: count(vis(cur), function (e) { return e.city; }), pages: count(vis(cur), function (e) { return e.page; }) });
      },
      recent: function (n) { return Promise.resolve(ev.slice(0, n).map(function (e) { return Object.assign({}, e, { campaign: nameOf(e.campaign) }); })); },
      campaigns: function () { return Promise.resolve(camps.map(function (c) { var l = ev.filter(function (e) { return e.campaign === c.code; }); return Object.assign({ visits: l.filter(function (e) { return e.type === 'visit'; }).length, inquiries: l.filter(function (e) { return e.type !== 'visit'; }).length }, c); })); },
      addCampaign: function (name, code) { camps.unshift({ name: name, code: code, created_at: new Date().toISOString() }); return Promise.resolve(); },
      admins: function () { return Promise.resolve([{ email: 'owner@example.com', note: 'בעלים' }]); }
    };
  }

  start();
})();
