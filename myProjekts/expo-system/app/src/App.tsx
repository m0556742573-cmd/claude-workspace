// Who is at the booth: sign in with Google, then the exhibitor's own account and setup from the database.
// "?demo" keeps the old demo (invented names, the phone only) for trying the screen without an account.
import { useCallback, useEffect, useState } from 'react';
import type { Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import { Booth, today } from './booth/Booth.tsx';
import { Admin, Leads, Messages, Settings, SetupScreen, Tasks, type Ctx } from './screens.tsx';
import { searchPeople, type Person } from './demo/people.ts';
import { allLeads, saveLead as saveLocal, type LocalLead } from './store/local.ts';
import {
  activeSetup, flush, isAdmin, startFromTemplate, loadDirectory, myExhibitor, saveLead, searchIn, signInWithGoogle, signOut, supabase,
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

export function App() {
  return new URLSearchParams(location.search).has('demo') ? <Demo /> : <Live />;
}

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="booth"><section className="step center"><h1>{title}</h1>{children}</section></div>;
}

function Live() {
  const online = useOnline();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [exhibitor, setExhibitor] = useState<Exhibitor | null | undefined>(undefined);
  const [setup, setSetup] = useState<Setup | null | undefined>(undefined);
  const [directory, setDirectory] = useState<Person[]>([]);
  const [todays, setTodays] = useState<LocalLead[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(() => (location.hash.slice(1) || 'booth'));
  const [admin, setAdmin] = useState(false);
  useEffect(() => { history.replaceState(null, '', '#' + tab); }, [tab]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    myExhibitor().then(async (ex) => {
      setExhibitor(ex);
      if (!ex) return;
      if (!ex.approved) return;
      setSetup(await activeSetup(ex.id));
      setDirectory(await loadDirectory());
      setAdmin(await isAdmin());
    }).catch((e) => setError(String(e.message ?? e)));
  }, [session]);

  const refreshToday = useCallback(async () => {
    if (!exhibitor) return;
    const local = (await allLeads()).filter((l) => l.capturedOn === today());
    setWaiting(local.filter((l) => !l.synced).length);
    setTodays(local);
  }, [exhibitor]);

  useEffect(() => { refreshToday(); }, [refreshToday]);
  useEffect(() => {
    if (!exhibitor || !setup) return;
    const tick = () => flush(exhibitor.id, setup).then(refreshToday).catch(() => {});
    tick();
    const t = setInterval(tick, 30000);
    addEventListener('online', tick);
    return () => { clearInterval(t); removeEventListener('online', tick); };
  }, [exhibitor, setup, refreshToday]);

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
        <p>נכנסת בתור <strong>{session.user.email}</strong>. כדי לרשום מבקרים, מנהל התערוכה צריך לפתוח לך דוכן.</p>
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
  return (
    <div className="shell">
      <nav className="tabs" aria-label="המערכת">
        {TABS.filter(([id]) => id !== 'admin' || admin).map(([id, label]) => (
          <button key={id} type="button" className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      {tab === 'booth' && (
        <Booth
          setup={setup}
          header={<strong className="who">{exhibitor.name}</strong>}
          search={search}
          save={async (lead) => { const r = await saveLead(lead, exhibitor.id, setup); await refreshToday(); return r; }}
          todays={todays}
          waiting={waiting}
          online={online}
        />
      )}
      {tab === 'tasks' && <Tasks ctx={ctx} />}
      {tab === 'leads' && <Leads ctx={ctx} />}
      {tab === 'setup' && <SetupScreen ctx={ctx} />}
      {tab === 'messages' && <Messages ctx={ctx} />}
      {tab === 'settings' && <Settings ctx={ctx} onSignOut={signOut} />}
      {tab === 'admin' && admin && <Admin />}
    </div>
  );
}

const TABS: [string, string][] = [
  ['booth', 'הדוכן'], ['tasks', 'המשימות שלי'], ['leads', 'הלקוחות'], ['setup', 'ההקמה'],
  ['messages', 'ההודעות'], ['settings', 'הגדרות'], ['admin', 'ניהול'],
];

/** The demo: invented names, saved on this phone only. */
function Demo() {
  const online = useOnline();
  const [biz, setBiz] = useState(0);
  const [todays, setTodays] = useState<LocalLead[]>([]);
  const refresh = useCallback(() => allLeads().then((ls) => setTodays(ls.filter((l) => l.capturedOn === today()))), []);
  useEffect(() => { refresh(); }, [refresh]);
  return (
    <Booth
      setup={fixtures[biz]!.setup}
      header={<select aria-label="העסק (הדגמה)" value={biz} onChange={(e) => setBiz(Number(e.target.value))}>{fixtures.map((f, i) => <option key={f.id} value={i}>{f.name}</option>)}</select>}
      search={searchPeople}
      save={async (lead) => { await saveLocal({ ...lead, synced: true }); await refresh(); return 'saved'; }}
      todays={todays}
      waiting={0}
      online={online}
    />
  );
}
