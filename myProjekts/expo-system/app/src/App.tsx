// Who is at the booth: sign in with Google, then the exhibitor's own account and setup from the database.
// The system has two parts — the day of the fair and the follow-up — and opens on the one that fits the date.
// "?demo" keeps the demo (invented names, the phone only) for trying the booth without an account.
import { useCallback, useEffect, useState } from 'react';
import type { Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import { Booth } from './booth/Booth.tsx';
import { Admin, Leads, Messages, Queue, Settings, SetupScreen, Snapshot, type Ctx } from './screens.tsx';
import { searchPeople, type Person } from './demo/people.ts';
import { allLeads, allNotes, dropLead, dropNote, putLead, putNote, type LocalLead, type LocalNote } from './store/local.ts';
import { EXPO_DAY, today } from './lib/words.ts';
import {
  activeSetup, flush, isAdmin, startFromTemplate, loadDirectory, myExhibitor, removeLead, saveLead, saveNote, searchIn, signInWithGoogle, signOut, supabase,
  type Exhibitor, type Session,
} from './lib/backend.ts';

function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    addEventListener('online', on); addEventListener('offline', off);
    return () => { removeEventListener('online', on); removeEventListener('offline', off); };
  }, []);
  return online;
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
  return new URLSearchParams(location.search).has('demo') ? <Demo /> : <Live />;
}

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="booth"><section className="step center"><h1>{title}</h1>{children}</section></div>;
}

type View = 'booth' | 'snapshot' | 'queue' | 'leads' | 'setup' | 'messages' | 'settings' | 'admin';
const PARTS: { id: 'day' | 'follow'; label: string; views: [View, string][] }[] = [
  { id: 'day', label: 'יום התערוכה', views: [['booth', 'הדוכן'], ['snapshot', 'תמונת מצב']] },
  { id: 'follow', label: 'המעקב', views: [['queue', 'הבא בתור'], ['leads', 'הלקוחות']] },
];
const MORE: [View, string][] = [['setup', 'ההקמה'], ['messages', 'ההודעות'], ['settings', 'הגדרות'], ['admin', 'ניהול']];
const ALL = new Set<string>([...PARTS.flatMap((p) => p.views.map(([v]) => v)), ...MORE.map(([v]) => v)]);

function Live() {
  const online = useOnline();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [exhibitor, setExhibitor] = useState<Exhibitor | null | undefined>(undefined);
  const [setup, setSetup] = useState<Setup | null | undefined>(undefined);
  const [directory, setDirectory] = useState<Person[]>([]);
  const { todays, notes, waiting, refresh } = useToday();
  const [error, setError] = useState('');
  const [view, setView] = useState<View>(() => {
    const h = location.hash.slice(1);
    return ALL.has(h) ? (h as View) : today() <= EXPO_DAY ? 'booth' : 'queue';
  });
  const [menu, setMenu] = useState(false);
  const [admin, setAdmin] = useState(false);
  useEffect(() => { history.replaceState(null, '', location.search + '#' + view); setMenu(false); }, [view]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    myExhibitor().then(async (ex) => {
      setExhibitor(ex);
      if (!ex || !ex.approved) return;
      setSetup(await activeSetup(ex.id));
      setDirectory(await loadDirectory());
      setAdmin(await isAdmin());
    }).catch((e) => setError(String(e.message ?? e)));
  }, [session]);

  useEffect(() => {
    if (!exhibitor || !setup) return;
    const tick = () => flush(exhibitor.id, setup).then(refresh).catch(() => {});
    tick();
    const t = setInterval(tick, 30000);
    addEventListener('online', tick);
    return () => { clearInterval(t); removeEventListener('online', tick); };
  }, [exhibitor, setup, refresh]);

  const search = useCallback((q: string) => searchIn(directory, q), [directory]);

  if (session === undefined) return <Message title="דוכן חכם" />;
  if (!session) {
    return (
      <Message title="דוכן חכם">
        <p className="muted">הכניסה למציגים בתערוכה.</p>
        <button type="button" className="save" onClick={signInWithGoogle}>כניסה עם Google</button>
        <p className="muted small">כניסה עם קוד למייל תתווסף בקרוב.</p>
      </Message>
    );
  }
  if (error) return <Message title="משהו לא עבד"><p>{error}</p><button type="button" className="link" onClick={() => location.reload()}>לנסות שוב</button></Message>;
  if (exhibitor === undefined) return <Message title="טוען…" />;
  if (!exhibitor) {
    return (
      <Message title="החשבון שלך עוד לא נפתח">
        <p>נכנסת בתור <strong>{session.user.email}</strong>. רגע, החשבון נפתח — נסה לרענן.</p>
        <button type="button" className="link" onClick={() => location.reload()}>רענון</button>
        <button type="button" className="link" onClick={signOut}>יציאה</button>
      </Message>
    );
  }
  if (!exhibitor.approved) {
    return (
      <Message title="הדוכן שלך ממתין לאישור">
        <p>נכנסת בתור <strong>{session.user.email}</strong>. המייל הזה לא ברשימת המציגים של התערוכה, אז הדוכן ייפתח אחרי אישור של מנהל התערוכה.</p>
        <button type="button" className="link" onClick={signOut}>יציאה</button>
      </Message>
    );
  }
  if (setup === undefined) return <Message title="טוען…" />;
  if (!setup) {
    return (
      <Message title="בוא נקים את הדוכן">
        <p>מסך ההקמה המלא בדרך. בינתיים אפשר להתחיל מתבנית של עסק דומה, ולשנות אחר כך.</p>
        <div className="templates">
          {fixtures.map((f) => (
            <button key={f.id} type="button" className="chip" onClick={async () => { await startFromTemplate(exhibitor.id, f.setup); setSetup(f.setup); }}>{f.name}</button>
          ))}
        </div>
      </Message>
    );
  }

  const ctx: Ctx = { exhibitor, setup, directory, setSetup };
  const part = PARTS.find((p) => p.views.some(([v]) => v === view));
  const more = MORE.filter(([v]) => v !== 'admin' || admin);
  return (
    <div className="shell">
      <nav className="bar" aria-label="המערכת">
        <div className="parts" role="group" aria-label="החלק">
          {PARTS.map((p) => (
            <button key={p.id} type="button" className="part" aria-pressed={part?.id === p.id} onClick={() => setView(p.views[0]![0])}>{p.label}</button>
          ))}
          <button type="button" className="part more" aria-expanded={menu} onClick={() => setMenu(!menu)}>עוד</button>
        </div>
        {menu && (
          <div className="menu">
            {more.map(([v, l]) => <button key={v} type="button" className="tab" aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>{l}</button>)}
            <button type="button" className="tab" onClick={signOut}>יציאה</button>
          </div>
        )}
        {part ? (
          <div className="tabs">
            {part.views.map(([v, l]) => <button key={v} type="button" className="tab" aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>{l}</button>)}
          </div>
        ) : (
          <div className="tabs"><span className="tab here">{MORE.find(([v]) => v === view)?.[1]}</span></div>
        )}
      </nav>
      {view === 'booth' && (
        <Booth
          setup={setup}
          header={<strong className="who">{exhibitor.name}</strong>}
          search={search}
          saveLead={async (l) => { const r = await saveLead(l, exhibitor.id, setup); await refresh(); return r; }}
          removeLead={async (id) => { await removeLead(id, exhibitor.id).catch(() => {}); await refresh(); }}
          saveNote={async (n) => { const r = await saveNote(n, exhibitor.id); await refresh(); return r; }}
          todays={todays}
          notes={notes}
          waiting={waiting}
          online={online}
        />
      )}
      {view === 'snapshot' && <Snapshot setup={setup} todays={todays} notes={notes} waiting={waiting} />}
      {view === 'queue' && <Queue ctx={ctx} />}
      {view === 'leads' && <Leads ctx={ctx} />}
      {view === 'setup' && <SetupScreen ctx={ctx} />}
      {view === 'messages' && <Messages ctx={ctx} />}
      {view === 'settings' && <Settings ctx={ctx} onSignOut={signOut} />}
      {view === 'admin' && admin && <Admin />}
    </div>
  );
}

/** The demo: invented names, saved on this phone only. */
function Demo() {
  const online = useOnline();
  const [biz, setBiz] = useState(0);
  const { todays, notes, refresh } = useToday();
  return (
    <Booth
      setup={fixtures[biz]!.setup}
      header={<select aria-label="העסק (הדגמה)" value={biz} onChange={(e) => setBiz(Number(e.target.value))}>{fixtures.map((f, i) => <option key={f.id} value={i}>{f.name}</option>)}</select>}
      search={searchPeople}
      saveLead={async (l) => { await putLead({ ...l, synced: true }); await refresh(); return 'saved'; }}
      removeLead={async (id) => { await dropLead(id); for (const n of notes.filter((x) => x.leadId === id)) await dropNote(n.id); await refresh(); }}
      saveNote={async (n) => { await putNote({ ...n, synced: true }); await refresh(); return 'saved'; }}
      todays={todays}
      notes={notes}
      waiting={0}
      online={online}
    />
  );
}
