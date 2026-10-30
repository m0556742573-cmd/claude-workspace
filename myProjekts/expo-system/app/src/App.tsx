// Who is at the booth: sign in with Google, then the exhibitor's own account and setup from the database.
// The shell is the brand book's (artifact PhXCTLxz4Xu6GhDPCaUaMK): two parts — the day of the fair and the CRM — with a switch,
// and the navigation shows only the part you are in. A computer: a white side menu, help and settings pinned at its foot,
// panels opening beside it. A tablet or a phone: a header with the switch and a bar at the bottom with a raised middle.
// The app opens on the part that fits the date. "?demo" keeps the demo (invented names, the phone only).
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import { MeForm } from './me.tsx';
import { Join } from './join.tsx';
import { SetupSteps } from './setup.tsx';
import { Booth } from './booth/Booth.tsx';
import { Dashboard, Home, Leads, Messages, Settings, Snapshot, Tasks, type Ctx } from './screens.tsx';
import { demoPeople, searchPeople, type Person } from './demo/people.ts';
import { keep, kept } from './store/cache.ts';
import { allLeads, allNotes, dropLead, dropNote, putLead, putNote, type LocalLead, type LocalNote } from './store/local.ts';
import { EXPO_DAY, today } from './lib/words.ts';
import { Icon, type IconName } from './ui.tsx';
import {
  activeSetup, fileUrl, flush, isAdmin, keptSession, loadPhase, type Phase, pullSelf, startFromTemplate, loadDirectory, myExhibitor, removeLead, saveLead, saveNote, searchIn, signInWithGoogle, signOut, supabase,
  type Exhibitor, type Session,
} from './lib/backend.ts';
import { waCheck } from './lib/wa.ts';

function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener('online', on); addEventListener('offline', off);
    return () => { removeEventListener('online', on); removeEventListener('offline', off); };
  }, []);
  return online;
}

/** A computer gets the side menu; anything narrower gets the tablet's bars. */
function useDesk(): boolean {
  const q = '(min-width: 1100px)';
  const [desk, setDesk] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q), f = () => setDesk(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return desk;
}

/** Today's leads and notes, from the phone's own copy. */
function useToday() {
  const [todays, setTodays] = useState<LocalLead[]>([]);
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [waiting, setWaiting] = useState(0);
  const refresh = useCallback(async () => {
    const [ls, ns] = await Promise.all([allLeads(), allNotes()]);
    setTodays(ls.filter((l) => l.capturedOn === today()));
    setNotes(ns);
    setWaiting(ls.filter((l) => !l.synced).length + ns.filter((n) => !n.synced).length);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { todays, notes, waiting, refresh };
}

export function App() {
  const join = /^#join\/([a-z0-9]+)/i.exec(location.hash);
  if (join) return <Join code={join[1]!} />;
  const demo = new URLSearchParams(location.search).has('demo');
  // The setup step by step, to try without an account: nothing is saved.
  if (demo && location.hash === '#setup') return <TrySetup />;
  return demo ? <Demo /> : <Live />;
}

function Gate({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="gate">
      <header className="gate-top"><div className="brand"><span className="mark" aria-hidden="true" /><span className="biz">דוכן חכם</span></div></header>
      <section className="gate-box">
        <h1>{title}</h1>
        {children}
      </section>
    </div>
  );
}

type View = 'booth' | 'snapshot' | 'home' | 'tasks' | 'leads' | 'dash' | 'messages' | 'settings';
type Part = 'day' | 'crm';
type Panel = 'menu' | 'help' | 'support' | null;
const DAY: [View, string, IconName][] = [['booth', 'הדוכן', 'search'], ['snapshot', 'תמונת מצב', 'check']];
const CRM: [View, string, IconName][] = [['home', 'דף הבית', 'home'], ['leads', 'לידים', 'leads'], ['tasks', 'משימות', 'tasks'], ['dash', 'דשבורד', 'bars'], ['messages', 'הודעות', 'mail']];
const ALL = new Set<string>([...DAY, ...CRM].map(([v]) => v).concat('settings'));
const partOf = (v: View): Part | null => (DAY.some(([d]) => d === v) ? 'day' : CRM.some(([c]) => c === v) ? 'crm' : null);

interface Boot { exhibitor: Exhibitor; setup: Setup; directory: Person[]; phase?: Phase }

function Live() {
  const online = useOnline();
  const desk = useDesk();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [exhibitor, setExhibitor] = useState<Exhibitor | null | undefined>(undefined);
  const [setup, setSetup] = useState<Setup | null | undefined>(undefined);
  const [directory, setDirectory] = useState<Person[]>([]);
  const { todays, notes, waiting, refresh } = useToday();
  const [error, setError] = useState('');
  const [view, setView] = useState<View>(() => {
    const h = location.hash.slice(1);
    return ALL.has(h) ? (h as View) : today() <= EXPO_DAY ? 'booth' : 'home';
  });
  const [part, setPart] = useState<Part>(() => partOf(view) ?? (today() <= EXPO_DAY ? 'day' : 'crm'));
  const [panel, setPanel] = useState<Panel>(null);
  const [folded, setFolded] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [newVisitor, setNewVisitor] = useState(0);
  const [phase, setPhase] = useState<Phase>('practice');

  const go = useCallback((v: View) => { setView(v); setPanel(null); const p = partOf(v); if (p) setPart(p); scrollTo(0, 0); }, []);
  useEffect(() => { history.replaceState(null, '', location.search + '#' + view); }, [view]);
  useEffect(() => {
    if (!panel) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanel(null); };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, [panel]);

  useEffect(() => {
    // Without a network an expired sign-in cannot be renewed; the booth still opens on what this tablet keeps.
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? (navigator.onLine ? null : keptSession())))
      .catch(() => setSession(keptSession()));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? (navigator.onLine ? null : keptSession())));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    myExhibitor().then(async (ex) => {
      setExhibitor(ex);
      if (!ex || !ex.approved) return;
      setSetup(await activeSetup(ex.id));
      // In practice the booth searches sample names only: the real list is not even loaded (יצחק, 28/10); the server
      // gives it only from the fair on. The admin may try the real list before (29/10).
      const ph = await loadPhase().catch(() => 'practice' as const);
      const adm = await isAdmin();
      setPhase(ph);
      setDirectory(ph === 'practice' && !adm ? demoPeople : await loadDirectory());
      setAdmin(adm);
    }).catch(async (e) => {
      // No server: the booth opens from the copy kept on this tablet at the last load.
      const k = await kept<Boot>('boot:' + userId).catch(() => undefined);
      if (k) { setExhibitor(k.exhibitor); setSetup(k.setup); setDirectory(k.directory); setPhase(k.phase ?? 'practice'); }
      else setError(navigator.onLine ? String(e.message ?? e) : 'אין רשת, ועוד אין בטאבלט הזה עותק של הדוכן. צריך להיכנס פעם אחת עם רשת.');
    });
  }, [userId]);
  // What the booth needs to open without a network is kept after every change.
  useEffect(() => {
    if (!userId || !exhibitor || !setup) return;
    keep('boot:' + userId, { exhibitor, setup, directory, phase } satisfies Boot).catch(() => {});
  }, [userId, exhibitor, setup, directory, phase]);

  useEffect(() => {
    if (!exhibitor || !setup) return;
    // What waits on the phone goes up; what visitors registered on their own phones comes down.
    const tick = () => flush(exhibitor.id, setup)
      .then(() => pullSelf(exhibitor.id, setup, directory, today()).catch(() => false))
      .then(refresh).catch(() => {});
    tick();
    const t = setInterval(tick, 30000);
    addEventListener('online', tick);
    return () => { clearInterval(t); removeEventListener('online', tick); };
  }, [exhibitor, setup, directory, refresh]);

  const search = useCallback((q: string) => searchIn(directory, q), [directory]);

  if (session === undefined) return <Gate title="רגע…" />;
  if (!session) {
    return (
      <Gate title="דוכן חכם">
        <p className="muted">לבעלי דוכנים בתערוכת העסקים. נכנסים פעם אחת, וממשיכים מכל מכשיר.</p>
        <button type="button" className="opt sign-opt" onClick={signInWithGoogle}><span className="g-mark" aria-hidden="true">G</span>התחברות עם Google</button>
        <p className="faint small">כניסה עם קוד למייל, בלי חשבון Google, תתווסף בקרוב.</p>
      </Gate>
    );
  }
  if (error) return <Gate title="משהו לא עבד"><p>{error}</p><button type="button" className="btn" onClick={() => location.reload()}>לנסות שוב</button></Gate>;
  if (exhibitor === undefined) return <Gate title="טוען…" />;
  if (!exhibitor) {
    return (
      <Gate title="החשבון שלך עוד לא נפתח">
        <p>נכנסת בתור <strong>{session.user.email}</strong>. רגע, החשבון נפתח. נסה לרענן.</p>
        <div className="row"><button type="button" className="btn primary" onClick={() => location.reload()}>רענון</button><button type="button" className="btn" onClick={signOut}>יציאה</button></div>
      </Gate>
    );
  }
  if (!exhibitor.approved) {
    return (
      <Gate title="הדוכן שלך ממתין לאישור">
        <p>נכנסת בתור <strong>{session.user.email}</strong>. המייל הזה לא ברשימת המציגים של התערוכה, אז הדוכן ייפתח אחרי אישור של מנהל התערוכה.</p>
        <button type="button" className="btn" onClick={signOut}>יציאה</button>
      </Gate>
    );
  }
  if (!exhibitor.onboarded) {
    return (
      <Gate title="ברוכים הבאים">
        <p className="muted">לפני הכל, כמה פרטים שלך. הם נכנסים לחתימה של כל הודעה שתצא למבקרים, ואפשר לשנות אותם אחר כך בהגדרות.</p>
        <MeForm exhibitor={exhibitor} onSaved={setExhibitor} submit="נתחיל" welcome />
      </Gate>
    );
  }
  if (setup === undefined) return <Gate title="טוען…" />;
  if (!setup) {
    return (
      <div className="setup-gate">
        <div className="brand"><span className="mark" aria-hidden="true" /><span className="biz">בוא נקים את הדוכן</span></div>
        <SetupSteps start={null} business={exhibitor.business} onSave={async (s) => { await startFromTemplate(exhibitor.id, s); setSetup(s); }} />
      </div>
    );
  }

  const ctx: Ctx = { exhibitor, setup, directory, setSetup, setExhibitor, admin, phase, go: (v) => go(v as View) };
  const biz = exhibitor.business || exhibitor.name;
  // His own logo heads the booth when he uploaded one (30/10); otherwise the system's mark.
  const mark = exhibitor.logo ? <img className="mark logo" src={fileUrl(exhibitor.logo)} alt="" /> : <span className="mark" aria-hidden="true" />;
  const items = part === 'day' ? DAY : CRM;
  const slim = desk && (folded || !!panel);
  const switcher = (
    <div className="seg" role="group" aria-label="החלק במערכת">
      <button type="button" aria-pressed={part === 'day'} title="יום התערוכה" onClick={() => go('booth')}><Icon name="stand" size={18} /><span>יום התערוכה</span></button>
      <button type="button" aria-pressed={part === 'crm'} title="CRM" onClick={() => go('home')}><Icon name="crm" size={18} /><span>CRM</span></button>
    </div>
  );
  const nv = (label: string, icon: IconName, on: boolean, act: () => void, sub?: string) => (
    <button key={label} type="button" className="nv" aria-current={on ? 'true' : undefined} title={label} aria-label={label} onClick={act}>
      <Icon name={icon} /><span className="nv-l">{label}</span>{sub && <span className="nv-s">{sub}</span>}
    </button>
  );
  const bt = (label: string, icon: IconName, on: boolean, act: () => void) => (
    <button key={label} type="button" className="bt" aria-current={on ? 'true' : undefined} onClick={act}><Icon name={icon} size={24} />{label}<i aria-hidden="true" /></button>
  );
  const here = (v: View) => view === v && !panel;
  const openPanel = (p: Panel) => setPanel(panel === p && desk ? null : p);
  const help = bt('עזרה', 'help', panel === 'menu' || panel === 'help' || panel === 'support', () => setPanel('menu'));
  const settingsTab = bt('הגדרות', 'gear', here('settings'), () => go('settings'));

  return (
    <div className={'shell ' + (desk ? 'is-desk' : 'is-tab') + (slim ? ' slim' : '') + (desk && panel ? ' with-panel' : '')}>
      {desk ? (
        <nav className="side" aria-label="תפריט ראשי">
          <div className="brand">{mark}<span className="biz">{biz}</span></div>
          {switcher}
          {items.map(([v, l, i]) => nv(l, i, view === v, () => go(v)))}
          <div className="side-gap" />
          <div className="side-foot">
            {nv('עזרה', 'help', panel === 'help', () => openPanel('help'), 'סרטונים')}
            {nv('תמיכה', 'phone', panel === 'support', () => openPanel('support'), 'פנייה')}
            {nv('הגדרות', 'gear', view === 'settings', () => go('settings'))}
            <button type="button" className="nv fold" aria-expanded={!slim} title={slim ? 'להרחיב את התפריט' : 'לכווץ את התפריט'} aria-label={slim ? 'להרחיב את התפריט' : 'לכווץ את התפריט'}
              onClick={() => { if (slim) { setFolded(false); setPanel(null); } else setFolded(true); }}>
              <Icon name={slim ? 'unfold' : 'fold'} /><span className="nv-l">{slim ? 'להרחיב את התפריט' : 'לכווץ את התפריט'}</span>
            </button>
          </div>
        </nav>
      ) : (
        <header className="thead">
          {mark}<span className="biz">{biz}</span>
          {switcher}
        </header>
      )}

      <main>
        {view === 'booth' && (
          <Booth
            setup={setup}
            eyebrow={desk ? 'יום התערוכה · הדוכן' : undefined}
            newVisitor={newVisitor}
            desk={desk}
            search={search}
            saveLead={async (l) => { const r = await saveLead(l, exhibitor.id, setup); await refresh(); return r; }}
            removeLead={async (id) => { await removeLead(id, exhibitor.id).catch(() => {}); await refresh(); }}
            saveNote={async (n) => { const r = await saveNote(n, exhibitor.id); await refresh(); return r; }}
            todays={todays}
            notes={notes}
            waiting={waiting}
            online={online}
            joinCode={exhibitor.join_code}
            phase={phase}
            boothDefault={exhibitor.booth_default}
            checkWa={phase === 'live' ? waCheck : undefined}
            trialSend={exhibitor.trial_send}
          />
        )}
        {view === 'snapshot' && <Snapshot setup={setup} todays={todays} notes={notes} waiting={waiting} eyebrow={desk ? 'יום התערוכה' : undefined} onCrm={() => go('home')} onBooth={() => go('booth')} />}
        {view === 'home' && <Home ctx={ctx} desk={desk} />}
        {view === 'tasks' && <Tasks ctx={ctx} desk={desk} />}
        {view === 'leads' && <Leads ctx={ctx} desk={desk} />}
        {view === 'dash' && <Dashboard ctx={ctx} desk={desk} />}
        {view === 'messages' && <Messages ctx={ctx} desk={desk} />}
        {view === 'settings' && <Settings ctx={ctx} onSignOut={signOut} />}
        
      </main>

      {!desk && (
        <nav className="tbar" aria-label="ניווט">
          {part === 'day' ? (
            <>
              <div className="bt-side">{bt('הדוכן', 'search', here('booth'), () => go('booth'))}{bt('תמונת מצב', 'check', here('snapshot'), () => go('snapshot'))}</div>
              <button type="button" className="bt-mid" onClick={() => { go('booth'); setNewVisitor((n) => n + 1); }}><span className="c"><Icon name="plus" size={26} stroke={2} /></span>מבקר חדש</button>
              <div className="bt-side">{help}{settingsTab}</div>
            </>
          ) : (
            <>
              <div className="bt-side">{bt('לידים', 'leads', here('leads'), () => go('leads'))}{bt('משימות', 'tasks', here('tasks'), () => go('tasks'))}{bt('דשבורד', 'bars', here('dash'), () => go('dash'))}</div>
              <button type="button" className="bt-mid" aria-current={here('home') ? 'true' : undefined} onClick={() => go('home')}><span className="c"><Icon name="home" size={26} stroke={2} /></span>דף הבית</button>
              <div className="bt-side">{bt('הודעות', 'mail', here('messages'), () => go('messages'))}{help}{settingsTab}</div>
            </>
          )}
        </nav>
      )}

      {panel && !desk && <button type="button" className="scrim" aria-label="סגירה" onClick={() => setPanel(null)} />}
      {panel && <HelpPanel kind={panel} desk={desk} view={view} onPick={setPanel} onClose={() => setPanel(null)} />}
    </div>
  );
}

// ---------- help and support: always in reach. Support is a person, never a bot.

const ABOUT: Partial<Record<View, string>> = {
  booth: 'מקלידים שתי אותיות מהשם ונוגעים בשם: המבקר נשמר מיד. הכרטיס נשאר פתוח לסימונים, להערה ולהקלטה.',
  snapshot: 'מה נאסף היום בדוכן, ומה מחכה לך בימים שאחרי.',
  home: 'מה מחכה היום, ומי הבא בתור, עם מה שצריך כדי לטפל בו.',
  tasks: 'כל מה שעליך לעשות, לפי התאריך. אחרי כל פעולה אפשר לבטל בתוך 10 שניות.',
  leads: 'כל מי שנרשם, עם מה שקרה עד עכשיו ומה הצעד הבא.',
};

function HelpPanel({ kind, desk, view, onPick, onClose }: { kind: Exclude<Panel, null>; desk: boolean; view: View; onPick: (p: Panel) => void; onClose: () => void }) {
  const title = kind === 'support' ? 'תמיכה' : 'עזרה';
  return (
    <div className={'pnl ' + (desk ? 'side-p' : 'dialog')} role="dialog" aria-label={title}>
      <div className="p-head">
        {!desk && kind !== 'menu' && <button type="button" className="p-back" onClick={() => onPick('menu')}>→ חזרה</button>}
        {desk && <Icon name={kind === 'support' ? 'phone' : 'help'} size={22} />}
        <h2>{title}</h2>
        <button type="button" className="sq" aria-label="סגירה" onClick={onClose}><Icon name="close" /></button>
      </div>
      <div className="p-body">
        {kind === 'menu' && (
          <>
            <div className="choices">
              <button type="button" className="choice" onClick={() => onPick('support')}><Icon name="phone" size={26} /><b>תמיכה</b><small>לדבר עם אדם</small></button>
              <button type="button" className="choice" onClick={() => onPick('help')}><Icon name="video" size={26} /><b>הסברים</b><small>על כל מסך, בקצרה</small></button>
            </div>
            {ABOUT[view] && <section className="stack"><div className="sec">על המסך הזה</div><p>{ABOUT[view]}</p></section>}
          </>
        )}
        {kind === 'help' && (
          <>
            {ABOUT[view] && <section className="stack"><div className="sec">על המסך הזה</div><p>{ABOUT[view]}</p></section>}
            <section className="stack">
              <div className="sec">סרטונים · פחות מדקה כל אחד</div>
              {['הדוכן: לרשום מבקר בנגיעה', 'תמונת מצב: מה נאסף היום', 'ה-CRM: הבא בתור ומשימות', 'הגדרות: הכרטיס וההודעות'].map((t) => (
                <div key={t} className="vrow"><div className="vthumb"><Icon name="play" size={18} /></div><div><div className="vt">{t}</div><div className="faint small">בהכנה</div></div></div>
              ))}
            </section>
            <section className="stack">
              <div className="sec">הסברים קצרים בכתב</div>
              <details className="qa"><summary>מה קורה כשאין רשת בתערוכה?</summary><p>הכל נשמר בטלפון, ועולה לשרת לבד כשהרשת חוזרת. בראש הדוכן כתוב כמה ממתינים לעלות.</p></details>
              <details className="qa"><summary>נגעתי בשם הלא נכון</summary><p>בכרטיס שנפתח יש "ביטול הרישום". הוא מוחק את המבקר, עם ההערות וההקלטות שלו, אחרי אישור.</p></details>
              <details className="qa"><summary>מה ההבדל בין "לא רלוונטי" לרשימת התפוצה?</summary><p>"לא רלוונטי" מסיים את המעקב אחריו. רשימת התפוצה היא מי שלא סימנת אצלו כלום: הוא מקבל רק הודעות כלליות.</p></details>
            </section>
          </>
        )}
        {kind === 'support' && (
          <>
            <p className="muted">משהו לא עובד, או יש שאלה? כאן מגיעים לאדם, לא לבוט.</p>
            <div className="contact-card"><div><b>פרטי התמיכה</b><small>הטלפון והמייל של התמיכה יפורסמו כאן לפני התערוכה, עם מענה מיידי ביום עצמו.</small></div></div>
          </>
        )}
      </div>
    </div>
  );
}

function TrySetup() {
  const [done, setDone] = useState<Setup | null>(null);
  if (done) {
    return (
      <Gate title="ההקמה מוכנה">
        <p className="muted">בהדגמה היא לא נשמרת. בדוכן אמיתי היא נשמרת, והכרטיס בדוכן נבנה ממנה מיד.</p>
        <p>{done.needs.length ? `בכרטיס: ${done.needs.map((n) => n.label).join(", ")}` : "כרטיס של שם בלבד"}</p>
        <button type="button" className="btn" onClick={() => setDone(null)}>להקים שוב</button>
      </Gate>
    );
  }
  return (
    <div className="setup-gate">
      <div className="brand"><span className="mark" aria-hidden="true" /><span className="biz">הקמה · הדגמה</span></div>
      <SetupSteps start={null} onSave={async (s) => setDone(s)} />
    </div>
  );
}

/** The demo: invented names, saved on this phone only. */
function Demo() {
  const online = useOnline();
  const [biz, setBiz] = useState(0);
  const { todays, notes, refresh } = useToday();
  return (
    <div className="shell is-tab">
      <header className="thead">
        <span className="mark" aria-hidden="true" />
        <select className="input" style={{ width: 'auto' }} aria-label="העסק (הדגמה)" value={biz} onChange={(e) => setBiz(Number(e.target.value))}>{fixtures.map((f, i) => <option key={f.id} value={i}>{f.name}</option>)}</select>
        <span className="faint small" style={{ marginInlineStart: 'auto' }}>הדגמה · שמות לדוגמה</span>
      </header>
      <main style={{ paddingBottom: 48 }}>
        <Booth
          setup={fixtures[biz]!.setup}
          search={searchPeople}
          saveLead={async (l) => { await putLead({ ...l, synced: true }); await refresh(); return 'saved'; }}
          removeLead={async (id) => { await dropLead(id); for (const n of notes.filter((x) => x.leadId === id)) await dropNote(n.id); await refresh(); }}
          saveNote={async (n) => { await putNote({ ...n, synced: true }); await refresh(); return 'saved'; }}
          todays={todays}
          notes={notes}
          waiting={0}
          online={online}
        />
      </main>
    </div>
  );
}
