// The admin platform (יצחק, 28/10): a separate entrance with its own address, sign-in and menu, for whoever runs the fair.
// It is a different thing from the exhibitor's booth, and it will grow (more fairs, organisers with their own permissions);
// for now it holds what the admin already had inside the booth: the exhibitors, their approval, and the two lists.
// Same database and same pieces as the booth (lib/backend.ts, ui.tsx, styles.css); the server checks is_admin() on every call.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminApprove, adminCounts, adminExhibitors, adminPhase, adminSetPhase, adminSetWa, waOpenState, isAdmin, type Phase, signInWithGoogle, signOut, supabase, type AdminExhibitor, type Session } from '../lib/backend.ts';
import { Icon, PageHead, Tiles, type IconName } from '../ui.tsx';
import { MailCode } from '../signin.tsx';
import { ListLoad } from './lists.tsx';
import { KeysView } from './keys.tsx';
import { waStats } from '../lib/wa.ts';

const BOOTH_URL = 'https://expo.y-h-m.com';

type View = 'overview' | 'exhibitors' | 'lists' | 'state' | 'keys' | 'broadcast';
const MENU: [View, string, IconName][] = [
  ['overview', 'סקירה', 'home'],
  ['exhibitors', 'מציגים', 'leads'],
  ['lists', 'רשימות', 'tasks'],
  ['state', 'מצב המערכת', 'gear'],
  ['keys', 'מפתחות', 'key'],
  ['broadcast', 'הודעה למציגים', 'mail'],
];
const isView = (h: string): h is View => MENU.some(([v]) => v === h);

function Gate({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="gate">
      <header className="gate-top"><div className="brand"><span className="mark" aria-hidden="true" /><span className="biz">אקספומקס · ניהול</span></div></header>
      <section className="gate-box">
        <h1>{title}</h1>
        {children}
      </section>
    </div>
  );
}

export function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [allowed, setAllowed] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  const userId = session?.user.id;
  useEffect(() => { if (userId) isAdmin().then(setAllowed).catch(() => setAllowed(false)); }, [userId]);

  if (session === undefined) return <Gate title="רגע…" />;
  if (!session) {
    return (
      <Gate title="ניהול התערוכה">
        <p className="muted">הכניסה למי שמנהל את התערוכה: המציגים, האישורים והרשימות.</p>
        <button type="button" className="opt sign-opt" onClick={signInWithGoogle}><span className="g-mark" aria-hidden="true">G</span>התחברות עם Google</button>
        <MailCode newUsers={false} />
        <p className="faint small">מציגים נכנסים בכתובת של הדוכן: <a href={BOOTH_URL} dir="ltr">{BOOTH_URL.replace('https://', '')}</a></p>
      </Gate>
    );
  }
  if (allowed === undefined) return <Gate title="רגע…" />;
  if (!allowed) {
    return (
      <Gate title="אין לך גישה לניהול">
        <p>נכנסת בתור <strong>{session.user.email}</strong>. הכתובת הזאת למנהל התערוכה בלבד.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <a className="btn primary" href={BOOTH_URL}>לדוכן שלי</a>
          <button type="button" className="btn" onClick={signOut}>יציאה</button>
        </div>
      </Gate>
    );
  }
  return <Shell email={session.user.email ?? ''} />;
}

function Shell({ email }: { email: string }) {
  const [view, setView] = useState<View>(() => { const h = location.hash.slice(1); return isView(h) ? h : 'overview'; });
  useEffect(() => {
    const f = () => { const h = location.hash.slice(1); if (isView(h)) setView(h); };
    addEventListener('hashchange', f); return () => removeEventListener('hashchange', f);
  }, []);
  const go = (v: View) => { location.hash = v; setView(v); scrollTo(0, 0); };
  const [rows, setRows] = useState<AdminExhibitor[] | undefined>();
  const [error, setError] = useState('');
  const reload = useCallback(() => { adminExhibitors().then(setRows).catch((e) => setError(String(e.message ?? e))); }, []);
  useEffect(() => { reload(); }, [reload]);
  const waiting = rows?.filter((r) => !r.approved).length ?? 0;

  return (
    <div className="adm">
      <nav className="adm-side" aria-label="ניהול">
        <div className="brand"><span className="mark" aria-hidden="true" /><span className="biz">ניהול התערוכה</span></div>
        <div className="adm-nav">
          {MENU.map(([v, label, icon]) => (
            <button key={v} type="button" className="nv" aria-current={view === v} onClick={() => go(v)}>
              <Icon name={icon} /><span className="nv-l">{label}</span>
              {v === 'exhibitors' && waiting > 0 && <span className="nv-s">{waiting} ממתינים</span>}
            </button>
          ))}
        </div>
        <div className="side-gap" />
        <div className="side-foot">
          <span className="faint small adm-who" dir="ltr">{email}</span>
          <a className="nv" href={BOOTH_URL}><Icon name="stand" /><span className="nv-l">לדוכן</span></a>
          <button type="button" className="nv" onClick={signOut}><Icon name="close" /><span className="nv-l">יציאה</span></button>
        </div>
      </nav>
      <main className="adm-main">
        {error && <p className="err">{error}</p>}
        {view === 'overview' && <Overview rows={rows} go={go} reload={reload} />}
        {view === 'exhibitors' && <Exhibitors rows={rows} reload={reload} />}
        {view === 'lists' && (
          <div className="page narrow">
            <PageHead title="רשימות" tip="שתי הרשימות שהמערכת עובדת איתן: המציגים מהמארגן, והקהילה שהדוכן מחפש בה. נטענות מקובץ CSV." />
            <ListLoad kind="exhibitors" onDone={reload} />
            <ListLoad kind="people" onDone={reload} />
          </div>
        )}
        {view === 'state' && <PhaseView />}
        {view === 'keys' && <KeysView />}
        {view === 'broadcast' && (
          <div className="page narrow">
            <PageHead title="הודעה למציגים" />
            <section className="card">
              <h2>הודעה דחופה לכל המציגים</h2>
              <p className="muted">למשל: "הכניסה לאולם נפתחת ב-10:00". תצא במייל ובוואטסאפ לכל המציגים, כשהחיבור למייל ולוואטסאפ יעבוד.</p>
              <span className="tag">בבנייה</span>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function Overview({ rows, go, reload }: { rows: AdminExhibitor[] | undefined; go: (v: View) => void; reload: () => void }) {
  const [counts, setCounts] = useState<{ people: number; listed: number } | null>(null);
  useEffect(() => { adminCounts().then(setCounts).catch(() => {}); }, []);
  const head = <PageHead title="סקירה" sub="התערוכה ב-16.11" tip="המצב של התערוכה במבט אחד: מי נרשם, מי ממתין לאישור, וכמה שמות יש ברשימות." />;
  if (!rows) return <div className="page">{head}<p className="muted">טוען…</p></div>;
  const waiting = rows.filter((r) => !r.approved);
  const leads = rows.reduce((n, r) => n + r.leads, 0);
  return (
    <div className="page">
      {head}
      <Tiles items={[[rows.length - waiting.length, 'מציגים מאושרים'], [waiting.length, 'ממתינים לאישור', waiting.length > 0], [leads, 'מבקרים שנרשמו'], [counts?.people ?? '—', 'ברשימת הקהילה']]}
        onPick={(k) => go(k === 'ברשימת הקהילה' ? 'lists' : 'exhibitors')} />
      <section>
        <div className="group-head"><span>ממתינים לאישור</span><span className="c">{waiting.length}</span></div>
        {waiting.length ? (
          <div className="rows">
            {waiting.map((r) => <ExhibitorRow key={r.id} r={r} reload={reload} />)}
          </div>
        ) : <div className="empty"><p className="muted">אין מי שממתין. מי שהמייל שלו ברשימת המארגן נכנס בלי לחכות.</p></div>}
      </section>
      <WaCard />
      <section className="card">
        <h2>רשימת המארגן</h2>
        <p className="muted">{counts ? `${counts.listed} מיילים של מציגים ברשימה. מי שנכנס עם אחד מהם מאושר מיד.` : 'טוען…'}</p>
        <button type="button" className="btn start-sm" onClick={() => go('lists')}>לרשימות ←</button>
      </section>
    </div>
  );
}

function ExhibitorRow({ r, reload }: { r: AdminExhibitor; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const set = async (ok: boolean) => { setBusy(true); try { await adminApprove(r.id, ok); reload(); } catch { alert('לא נשמר: אין חיבור כרגע.'); } finally { setBusy(false); } };
  return (
    <div className="adm-row">
      <span className="adm-id"><b>{r.name || 'בלי שם'}</b> <span className="muted">{r.business || ''}</span><span className="faint small adm-mail" dir="ltr">{r.email}</span></span>
      <span className="adm-n">{r.leads} מבקרים</span>
      {r.approved
        ? <button type="button" className="btn ghost" disabled={busy} onClick={() => set(false)}>לבטל אישור</button>
        : <button type="button" className="btn primary" disabled={busy} onClick={() => set(true)}>לאשר</button>}
    </div>
  );
}

function Exhibitors({ rows, reload }: { rows: AdminExhibitor[] | undefined; reload: () => void }) {
  const [q, setQ] = useState('');
  const [state, setState] = useState<'all' | 'waiting' | 'approved'>('all');
  const shown = useMemo(() => (rows ?? [])
    .filter((r) => state === 'all' || (state === 'waiting' ? !r.approved : r.approved))
    .filter((r) => !q.trim() || [r.name, r.business, r.email ?? ''].some((x) => x.toLowerCase().includes(q.trim().toLowerCase()))), [rows, q, state]);
  const head = <PageHead title="מציגים" sub={rows ? `${rows.length} נרשמו` : undefined} tip="כל מי שנכנס לדוכן. מי שלא ברשימת המארגן ממתין כאן לאישור." />;
  if (!rows) return <div className="page">{head}<p className="muted">טוען…</p></div>;
  const n = { all: rows.length, waiting: rows.filter((r) => !r.approved).length, approved: rows.filter((r) => r.approved).length };
  return (
    <div className="page">
      {head}
      <div className="tb-bar">
        <input className="input tb-q" type="search" aria-label="חיפוש מציג" placeholder="חיפוש: שם, עסק, מייל" value={q} onChange={(e) => setQ(e.target.value)} />
        <nav className="tabs" aria-label="סינון">
          {([['all', 'הכל'], ['waiting', 'ממתינים'], ['approved', 'מאושרים']] as const).map(([k, l]) => (
            <button key={k} type="button" className="tab" aria-pressed={state === k} onClick={() => setState(k)}>{l} <span className="n">{n[k]}</span></button>
          ))}
        </nav>
      </div>
      {shown.length ? (
        <div className="tb-wrap">
          <table className="tb">
            <thead><tr><th>שם</th><th>עסק</th><th>מייל</th><th>מבקרים</th><th>נרשם</th><th>מצב</th><th /></tr></thead>
            <tbody>{shown.map((r) => <ExhibitorLine key={r.id} r={r} reload={reload} />)}</tbody>
          </table>
        </div>
      ) : <p className="muted">אין מציגים שמתאימים.</p>}
    </div>
  );
}

function ExhibitorLine({ r, reload }: { r: AdminExhibitor; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const set = async (ok: boolean) => { setBusy(true); try { await adminApprove(r.id, ok); reload(); } catch { alert('לא נשמר: אין חיבור כרגע.'); } finally { setBusy(false); } };
  const d = new Date(r.created_at);
  return (
    <tr>
      <td className="stick"><b>{r.name || 'בלי שם'}</b></td>
      <td>{r.business || '—'}</td>
      <td dir="ltr" style={{ textAlign: 'right' }}>{r.email ?? '—'}</td>
      <td className="tnum">{r.leads}</td>
      <td className="tnum">{d.getDate()}/{d.getMonth() + 1}</td>
      <td>{r.approved ? 'מאושר' : <b className="late-c">ממתין</b>}</td>
      <td className="adm-act">
        {r.approved
          ? <button type="button" className="btn ghost" disabled={busy} onClick={() => set(false)}>לבטל אישור</button>
          : <button type="button" className="btn primary" disabled={busy} onClick={() => set(true)}>לאשר</button>}
      </td>
    </tr>
  );
}

/** The WhatsApp server on the VPS: how many accounts it holds and how much memory they take (the pilot's measure). */
function WaCard() {
  const [st, setSt] = useState<{ sessions: number; open: number; rssMb: number; heapMb: number; uptimeMin: number } | null | undefined>(undefined);
  useEffect(() => { waStats().then(setSt).catch(() => setSt(null)); }, []);
  return (
    <section className="card">
      <h2>שרת הוואטסאפ</h2>
      {st === undefined ? <p className="muted">בודק…</p>
        : st === null ? <p className="muted">עוד לא פעיל.</p>
        : <p className="muted"><b>{st.open}</b> חשבונות מחוברים (מתוך {st.sessions}). זיכרון: <b>{st.rssMb}MB</b>{st.open ? ` · כ-${Math.round(st.rssMb / st.open)}MB לחשבון, כולל הבסיס` : ''}. פועל {st.uptimeMin} דקות.</p>}
    </section>
  );
}

/** The system's phase, one for all booths (migration 0019). Moving to live can delete what was registered in practice:
 *  that cannot be undone, so it is asked in so many words, with the numbers, before it is done. */
const PHASES: [Phase, string, string][] = [
  ['practice', 'ניסיון · לפני התערוכה', 'הדוכן מחפש בשמות לדוגמה, ואף מבקר לא מקבל הודעה. כל מציג בוחר אם לנסות בלי שליחה, או לקבל את ההודעות בעצמו. מה שנרשם נשמר כניסיון.'],
  ['live', 'אמיתי', 'רשימת הקהילה האמיתית, וההודעות יוצאות. זה המצב לתערוכה ולימים שאחריה.'],
  ['after', 'אחרי התערוכה · CRM בלבד', 'הדוכן נסגר אצל כולם, וה-CRM נשאר. ההודעות ממשיכות לצאת לפי המסלולים.'],
];
function PhaseView() {
  const [st, setSt] = useState<Awaited<ReturnType<typeof adminPhase>> | null>(null);
  const [asking, setAsking] = useState<Phase | null>(null);
  const [drop, setDrop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => { setFailed(false); adminPhase().then(setSt).catch(() => setFailed(true)); }, []);
  useEffect(() => { load(); }, [load]);
  async function change(to: Phase) {
    setBusy(true); setDone('');
    try {
      const r = await adminSetPhase(to, to === 'live' && drop);
      setDone(`המערכת במצב "${PHASES.find(([p]) => p === to)![1]}".${r.dropped ? ` נמחקו ${r.dropped} רישומים מהניסיון.` : ''}`);
      setAsking(null); load();
    } catch (e) { setDone('לא הוחלף: ' + String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }
  return (
    <div className="page narrow">
      <PageHead title="מצב המערכת" sub={st ? `מאז ${new Date(st.changed_at).toLocaleDateString('he-IL')}${st.changed_by ? ` · ${st.changed_by}` : ''}` : undefined}
        tip="מצב אחד לכל הדוכנים. בניסיון אין שמות אמיתיים, ואף מבקר לא מקבל הודעה; במעבר לאמיתי אפשר למחוק את מה שנרשם בניסיון." />
      {!st ? (failed ? <p className="muted">לא נטען: אין חיבור כרגע. <button type="button" className="text-btn" onClick={load}>לנסות שוב</button></p> : <p className="muted">טוען…</p>) : (
        <div className="phase-list">
          {PHASES.map(([p, title, about]) => (
            <button key={p} type="button" className="opt-card" aria-pressed={st.phase === p} disabled={busy || st.phase === p} onClick={() => { setAsking(p); setDone(''); }}>
              <b>{title}{st.phase === p ? ' · עכשיו' : ''}</b>
              <span className="muted">{about}</span>
            </button>
          ))}
        </div>
      )}
      {asking && st && (
        <section className="held">
          <h2>להעביר את כל הדוכנים ל"{PHASES.find(([p]) => p === asking)![1]}"?</h2>
          {asking === 'live' && st.practice_leads > 0 && (
            <div className="switchrow">
              <span>למחוק את {st.practice_leads} הרישומים מהניסיון ({st.practice_booths} דוכנים), עם ההערות וההקלטות שלהם. <b>אי אפשר להחזיר.</b></span>
              <button type="button" className="switch" role="switch" aria-checked={drop} aria-label="למחוק את רישומי הניסיון" onClick={() => setDrop(!drop)} />
            </div>
          )}
          {asking === 'practice' && <p className="muted">מעכשיו הדוכן יחפש בשמות לדוגמה, ושום הודעה לא תצא. מה שכבר נרשם במצב אמיתי נשאר.</p>}
          <div className="row">
            <button type="button" className="btn primary" disabled={busy} onClick={() => change(asking)}>{busy ? 'מעביר…' : 'כן, להעביר'}</button>
            <button type="button" className="btn" disabled={busy} onClick={() => setAsking(null)}>לא</button>
          </div>
        </section>
      )}
      {done && <p className="note">{done}</p>}
      <WaOpen />
    </div>
  );
}

/** WhatsApp for every exhibitor (30/10): open when the server is ready, up to a number of accounts it holds at most. */
function WaOpen() {
  const [st, setSt] = useState<{ open: boolean; max: number } | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof waStats>> | null>(null);
  const [max, setMax] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    waOpenState().then((s) => { setSt(s); setMax(String(s.max)); }).catch(() => setMsg('לא נטען: אין חיבור כרגע.'));
    waStats().then(setStats).catch(() => setStats(null));
  }, []);
  async function save(open: boolean) {
    const n = Math.max(1, Math.min(500, Number(max) || 60));
    try { await adminSetWa(open, n); setSt({ open, max: n }); setMsg(open ? `נפתח. עד ${n} חשבונות.` : 'נסגר. מי שכבר מחובר נשאר מחובר.'); }
    catch (e) { setMsg('לא נשמר: ' + String((e as Error).message ?? e)); }
  }
  return (
    <section className="panel-w">
      <h2>וואטסאפ למציגים</h2>
      <p className="muted">כשזה פתוח, כל מציג מאושר רואה בהגדרות › חיבורים את חיבור הוואטסאפ שלו. כל חשבון מחובר תופס זיכרון בשרת, ולכן יש תקרה.</p>
      {stats && <p className="faint small">בשרת עכשיו: {stats.open} מחוברים מתוך {stats.sessions}, {stats.rssMb}MB זיכרון.</p>}
      {st && (
        <div className="row">
          <label className="field" style={{ maxWidth: 160 }}>עד כמה חשבונות<input className="input" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} /></label>
          <button type="button" className={'btn' + (st.open ? '' : ' primary')} onClick={() => save(!st.open)}>{st.open ? 'לסגור' : 'לפתוח לכל המציגים'}</button>
          {st.open && <button type="button" className="btn" onClick={() => save(true)}>לשמור את התקרה</button>}
        </div>
      )}
      {msg && <p className="muted small" role="status">{msg}</p>}
    </section>
  );
}
