// The exhibitor's screens after the booth: tasks, leads, the setup, messages, settings — and the admin's.
// What is built works on the real data; what is not built yet says plainly what it will be.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import { describe, today } from './booth/Booth.tsx';
import * as text from './lib/describe.ts';
import type { Person } from './demo/people.ts';
import {
  adminApprove, adminExhibitors, changeTemplate, listLeads, listSteps, listTasks, markStep, myGreeting, setCustomerDate, setGreeting,
  type AdminExhibitor, type Exhibitor, type LeadRow, type StepRow, type TaskRow,
} from './lib/backend.ts';

const LAB_URL = 'https://claude.ai/artifact/ThNurpj84KQfa4ETqSwUdH';
const DAYS = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת'];
const OUTCOME: Record<string, string> = { engaged: 'ענה', noAnswer: 'לא ענה', closed: 'נסגרה עסקה', notRelevant: 'לא רלוונטי', optOut: 'ביקש להסיר' };

export interface Ctx { exhibitor: Exhibitor; setup: Setup; directory: Person[]; setSetup: (s: Setup) => void }

function dateLabel(d: string): string {
  if (d === today()) return 'היום';
  const [y, m, day] = d.split('-').map(Number);
  return `${DAYS[new Date(y!, m! - 1, day!).getDay()]} ${day}.${m}`;
}
function nameOf(l: LeadRow, directory: Person[]): string {
  return l.typed_name ?? directory.find((p) => p.id === l.person_id)?.fullName ?? 'מבקר';
}
function ownerOf(l: LeadRow, directory: Person[]): boolean {
  return directory.find((p) => p.id === l.person_id)?.businessOwner ?? false;
}
function Soon({ title, children }: { title: string; children: ReactNode }) {
  return <section className="step soon"><h3>{title} <span className="badge">בבנייה</span></h3>{children}</section>;
}
function useData<T>(load: () => Promise<T>): [T | undefined, () => void, string] {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const reload = useCallback(() => { load().then(setData).catch((e) => setError(String(e.message ?? e))); }, [load]);
  useEffect(() => { reload(); }, [reload]);
  return [data, reload, error];
}

// ---------- המשימות שלי

export function Tasks({ ctx }: { ctx: Ctx }) {
  const load = useCallback(async () => ({ leads: await listLeads(), tasks: await listTasks() }), []);
  const [data, reload, error] = useData(load);
  const [busy, setBusy] = useState('');
  if (error) return <p className="err">{error}</p>;
  if (!data) return <p className="muted">טוען…</p>;
  const byId = new Map(data.leads.map((l) => [l.id, l]));
  const open = data.tasks.filter((t) => t.kind !== 'end' && byId.has(t.lead_id)).sort((a, b) => (a.due_on ?? '').localeCompare(b.due_on ?? ''));
  const now = open.filter((t) => (t.due_on ?? '') <= today());
  const later = open.filter((t) => (t.due_on ?? '') > today());

  async function act(t: TaskRow, outcome: string) {
    setBusy(t.lead_id);
    const l = byId.get(t.lead_id)!;
    await markStep(l, t.step_id!, outcome, ctx.exhibitor.id, ctx.setup, ownerOf(l, ctx.directory), today()).catch(() => {});
    setBusy(''); reload();
  }
  async function date(t: TaskRow, d: string) {
    if (!d) return;
    setBusy(t.lead_id);
    const l = byId.get(t.lead_id)!;
    await setCustomerDate(l, d, ctx.exhibitor.id, ctx.setup, ownerOf(l, ctx.directory), today()).catch(() => {});
    setBusy(''); reload();
  }
  function row(t: TaskRow) {
    const l = byId.get(t.lead_id)!;
    const label = t.kind === 'askDate' ? 'לברר את התאריך שלו' : describe({ kind: 'task', stepId: t.step_id!, action: t.action as 'talk', who: t.who as 'me', message: t.message ?? undefined, dueOn: t.due_on!, late: t.late }).split(' · ')[0];
    return (
      <li key={t.lead_id} className="task">
        <div className="task-head">
          <strong>{nameOf(l, ctx.directory)}</strong>
          <span className={'when' + ((t.due_on ?? '') < today() ? ' over' : '')}>{t.due_on ? dateLabel(t.due_on) : ''}</span>
        </div>
        <div className="muted">{label}{t.message ? ` · ${t.message}` : ''}{l.taps.length ? ` · ${l.taps.join(' · ')}` : ''}</div>
        {t.kind === 'askDate' ? (
          <label className="inline">התאריך שלו: <input type="date" disabled={busy === t.lead_id} onChange={(e) => date(t, e.target.value)} /></label>
        ) : t.who === 'auto' ? (
          <div className="muted small">יוצא אוטומטית. (השליחה עצמה מתחברת בקרוב.)</div>
        ) : (
          <div className="acts">
            <button type="button" className="act ok" disabled={busy === t.lead_id} onClick={() => act(t, 'engaged')}>ענה</button>
            <button type="button" className="act" disabled={busy === t.lead_id} onClick={() => act(t, 'noAnswer')}>לא ענה</button>
            <button type="button" className="act" disabled={busy === t.lead_id} onClick={() => act(t, 'closed')}>נסגרה עסקה</button>
            <button type="button" className="act" disabled={busy === t.lead_id} onClick={() => act(t, 'notRelevant')}>לא רלוונטי</button>
          </div>
        )}
      </li>
    );
  }
  return (
    <div className="screen">
      <h2>להיום</h2>
      {now.length ? <ul className="tasks">{now.map(row)}</ul> : <p className="muted">אין משימות להיום.</p>}
      <h2>בהמשך</h2>
      {later.length ? <ul className="tasks">{later.map(row)}</ul> : <p className="muted">אין משימות בהמשך. כל מבקר שתרשום בדוכן יקבל כאן את הצעד הבא שלו.</p>}
      <Soon title="הודעת בוקר"><p>כל בוקר תגיע אליך בוואטסאפ רשימת המשימות של היום, עם קישור לכאן.</p></Soon>
    </div>
  );
}

// ---------- הלקוחות שלי

export function Leads({ ctx }: { ctx: Ctx }) {
  const load = useCallback(async () => ({ leads: await listLeads(), tasks: await listTasks() }), []);
  const [data, , error] = useData(load);
  const [open, setOpen] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepRow[]>([]);
  useEffect(() => { if (open) listSteps(open).then(setSteps).catch(() => setSteps([])); }, [open]);
  if (error) return <p className="err">{error}</p>;
  if (!data) return <p className="muted">טוען…</p>;
  const task = new Map(data.tasks.map((t) => [t.lead_id, t]));
  const status = (id: string): string => {
    const t = task.get(id);
    if (!t) return '—';
    if (t.kind === 'end') return ({ list: 'ברשימת התפוצה', stop: 'המעקב נגמר', engaged: 'בטיפול', closed: 'נסגרה עסקה', notRelevant: 'לא רלוונטי', optOut: 'הוסר' } as Record<string, string>)[t.end_reason ?? ''] ?? '—';
    if (t.kind === 'askDate') return 'לברר תאריך';
    return `${({ talk: 'שיחה', meet: 'פגישה', send: 'הודעה', reserve: 'שריון', check: 'בדיקה' } as Record<string, string>)[t.action ?? ''] ?? t.action} · ${t.due_on ? dateLabel(t.due_on) : ''}`;
  };
  return (
    <div className="screen">
      <h2>כל המבקרים ({data.leads.length})</h2>
      {!data.leads.length && <p className="muted">עוד לא נרשמו מבקרים. הם יופיעו כאן מהרגע שתשמור אותם בדוכן.</p>}
      <ul className="leads">
        {data.leads.map((l) => (
          <li key={l.id}>
            <button type="button" className="lead" onClick={() => setOpen(open === l.id ? null : l.id)}>
              <strong>{nameOf(l, ctx.directory)}</strong>
              <span className="muted">{l.taps.join(' · ') || 'בלי סימון'}</span>
              <span className="status">{status(l.id)}</span>
            </button>
            {open === l.id && (
              <div className="lead-detail">
                <p className="muted small">נרשם {dateLabel(l.captured_on)}{l.customer_date ? ` · התאריך שלו: ${l.customer_date.split('-').reverse().join('.')}` : ''}{l.typed_phone ? ` · ${l.typed_phone}` : ''}</p>
                {l.note && <p>הערה: {l.note}</p>}
                <h4>מה קרה עד עכשיו</h4>
                {steps.length ? <ul className="history">{steps.map((s) => <li key={s.step_id}>{dateLabel(s.done_on)} · {OUTCOME[s.outcome] ?? s.outcome}</li>)}</ul> : <p className="muted small">עוד לא היה צעד.</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
      <Soon title="עוד בלקוחות"><p>סינון לפי מצב, חיפוש, ייצוא לאקסל, ותשובות שהגיעו מהלקוח בוואטסאפ, בציר הזמן של כל אחד.</p></Soon>
    </div>
  );
}

// ---------- ההקמה

export function SetupScreen({ ctx }: { ctx: Ctx }) {
  const s = ctx.setup;
  const [picking, setPicking] = useState(false);
  return (
    <div className="screen">
      <section className="step">
        <h3>איך מקימים</h3>
        <div className="ways">
          <a className="way" href={LAB_URL} target="_blank" rel="noreferrer"><strong>שיחה עם היועץ החכם</strong><span className="muted small">בגרסת ניסיון, בחלון נפרד. בקרוב בתוך המערכת, וההקמה תישמר ישר לכאן.</span></a>
          <div className="way soon-way"><strong>הקמה בטופס <span className="badge">בבנייה</span></strong><span className="muted small">שאלות קצרות לפי הסדר: מטרה, כרטיס, מסלולים, זמן, הודעות.</span></div>
          <button type="button" className="way" onClick={() => setPicking(!picking)}><strong>החלפת תבנית</strong><span className="muted small">להתחיל מעסק דומה מהסבבים.</span></button>
        </div>
        {picking && (
          <div className="templates">{fixtures.map((f) => <button key={f.id} type="button" className="chip" onClick={async () => { await changeTemplate(ctx.exhibitor.id, f.setup); ctx.setSetup(f.setup); setPicking(false); }}>{f.name}</button>)}</div>
        )}
      </section>

      {(s.anchor.goal || s.anchor.success) && (
        <section className="step"><h3>מה תהיה הצלחה בתערוכה</h3><p>{s.anchor.goal}</p>{s.anchor.success && <p className="muted">{s.anchor.success}</p>}</section>
      )}

      <section className="step">
        <h3>הכרטיס בדוכן</h3>
        {[['מה הוא צריך?', s.needs.map((n) => ({ label: n.label, effect: n.goal === 'primary' ? 'המטרה הראשית' : '' }))], ['מתי?', s.when], ['מי הוא?', s.who]].map(([q, items]) => (
          (items as { label: string; effect: string }[]).length ? (
            <div key={q as string} className="q"><span className="qlabel">{q as string}</span>
              <ul className="plain">{(items as { label: string; effect: string }[]).map((b) => <li key={b.label}><strong>{b.label}</strong>{b.effect ? <span className="muted"> — {b.effect}</span> : null}</li>)}</ul>
            </div>
          ) : null
        ))}
        {!s.needs.length && !s.when.length && !s.who.length && <p className="muted">כרטיס של שם בלבד.</p>}
      </section>

      <section className="step">
        <h3>מה קורה אחרי התערוכה</h3>
        {s.needs.map((n) => (
          <div key={n.label} className="path-block">
            <strong>{n.label}</strong>
            {n.variants.map((v, i) => (
              <div key={i} className="variant">
                {n.variants.length > 1 && <span className="muted small">{text.variantTitle(v)}:</span>}
                <ol>{text.path(v.path).map((line, j) => <li key={j}>{line}</li>)}</ol>
              </div>
            ))}
          </div>
        ))}
        <div className="path-block"><strong>מבקר שלא סומן אצלו כלום</strong>
          <div className="variant"><span className="muted small">בעל עסק:</span><ol>{text.path(s.defaults.business).map((l, j) => <li key={j}>{l}</li>)}</ol></div>
          <div className="variant"><span className="muted small">פרטי:</span><ol>{text.path(s.defaults.private).map((l, j) => <li key={j}>{l}</li>)}</ol></div>
        </div>
      </section>
    </div>
  );
}

// ---------- ההודעות

export function Messages({ ctx }: { ctx: Ctx }) {
  const ids = new Set<string>();
  for (const n of ctx.setup.needs) for (const v of n.variants) for (const st of v.path.steps) if (st.message) ids.add(st.message);
  for (const p of [ctx.setup.defaults.business, ctx.setup.defaults.private]) for (const st of p.steps) if (st.message) ids.add(st.message);
  return (
    <div className="screen">
      <h2>ההודעות שהמסלולים שולחים</h2>
      <ul className="plain">
        <li><strong>תודה שביקרת</strong> <span className="muted">— בערב של יום התערוכה</span></li>
        {[...ids].map((m) => <li key={m}><strong>{m}</strong></li>)}
      </ul>
      <Soon title="הנוסח של כל הודעה"><p>כאן תראה ותערוך את הטקסט שהמבקר מקבל. הנוסחים שאושרו בסבב 9 ייכנסו כברירת מחדל, עם הפנייה שבחרת בהגדרות.</p></Soon>
      <Soon title="איך הן יוצאות"><p>בוואטסאפ מהמספר שלך, ובמייל למי שאין לו וואטסאפ. בקצב איטי ומפוזר, אף פעם לא בשבת וביום טוב.</p></Soon>
    </div>
  );
}

// ---------- ההגדרות

export function Settings({ ctx, onSignOut }: { ctx: Ctx; onSignOut: () => void }) {
  const [greeting, setG] = useState<'shalom' | 'kavod' | null>(null);
  useEffect(() => { myGreeting().then(setG).catch(() => setG('shalom')); }, []);
  async function choose(g: 'shalom' | 'kavod') { setG(g); await setGreeting(ctx.exhibitor.id, g).catch(() => {}); }
  return (
    <div className="screen">
      <section className="step">
        <h3>איך ההודעות שלך פונות לאנשים</h3>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={greeting === 'shalom'} onClick={() => choose('shalom')}>שלום [שם]</button>
          <button type="button" className="chip" aria-pressed={greeting === 'kavod'} onClick={() => choose('kavod')}>בס"ד · לכבוד ר' [שם]</button>
        </div>
      </section>
      <Soon title="חיבור הוואטסאפ שלך"><p>סורקים קוד QR מהטלפון, כמו בוואטסאפ ווב, וההודעות יוצאות מהמספר שלך. אפשר לנתק בכל רגע.</p></Soon>
      <Soon title="קריאת תשובות"><p>באישורך בלבד: המערכת רואה רק תשובות של מבקרים שנרשמו אצלך, כדי לעצור את המעקב כשמישהו ענה.</p></Soon>
      <section className="step"><h3>החשבון</h3><p>{ctx.exhibitor.name}</p><button type="button" className="link" onClick={onSignOut}>יציאה</button></section>
    </div>
  );
}

// ---------- ניהול (למנהל התערוכה)

export function Admin() {
  const load = useCallback(() => adminExhibitors(), []);
  const [rows, reload, error] = useData<AdminExhibitor[]>(load);
  if (error) return <p className="err">{error}</p>;
  if (!rows) return <p className="muted">טוען…</p>;
  const waiting = rows.filter((r) => !r.approved);
  return (
    <div className="screen">
      <h2>מציגים ({rows.length})</h2>
      {waiting.length > 0 && <p className="note">{waiting.length} ממתינים לאישור</p>}
      <ul className="admin">
        {rows.map((r) => (
          <li key={r.id}>
            <div><strong>{r.name}</strong> <span className="muted small">{r.email}</span></div>
            <div className="muted small">{r.business || '—'} · {r.leads} מבקרים</div>
            {r.approved
              ? <button type="button" className="link" onClick={async () => { await adminApprove(r.id, false); reload(); }}>לבטל אישור</button>
              : <button type="button" className="act ok" onClick={async () => { await adminApprove(r.id, true); reload(); }}>לאשר</button>}
          </li>
        ))}
      </ul>
      <Soon title="רשימת המציגים מהמארגן"><p>מעלים את הקובץ, וכל מי שבו נכנס בלי לחכות לאישור.</p></Soon>
      <Soon title="רשימת הקהילה"><p>העלאת הרשימה האמיתית במקום השמות לדוגמה. הטלפונים והמיילים נשארים בשרת.</p></Soon>
    </div>
  );
}
