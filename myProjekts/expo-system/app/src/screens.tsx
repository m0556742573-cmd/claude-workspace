// The exhibitor's screens beside the booth: the snapshot of the day, the follow-up queue, the customers,
// the setup, messages, settings — and the admin's. What is built works on the real data; what is not says what it will be.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { nextTask, pathAhead, type Action, type Lead, type Next, type Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import * as text from './lib/describe.ts';
import { ACT, END, dayLabel, describe, inDays, today } from './lib/words.ts';
import type { Person } from './demo/people.ts';
import type { LocalLead, LocalNote } from './store/local.ts';
import {
  addFollowNote, addManual, adminApprove, adminExhibitors, changeTemplate, engineLead, leadContact, loadBook, markStep, myGreeting,
  removeManual, setCustomerDate, setGreeting, unmarkStep, voiceUrl,
  type AdminExhibitor, type Book, type Exhibitor, type LeadRow, type NoteRow,
} from './lib/backend.ts';

const LAB_URL = 'https://claude.ai/artifact/ThNurpj84KQfa4ETqSwUdH';
const OUTCOME: Record<string, string> = { engaged: 'דיברנו', noAnswer: 'לא ענה', closed: 'נסגרה עסקה', notRelevant: 'לא רלוונטי', optOut: 'ביקש להסיר' };
/** For a step that is not a talk, "noAnswer" means only "done, the path goes on". */
const DONE: Record<string, string> = { ...OUTCOME, noAnswer: 'בוצע' };

export interface Ctx { exhibitor: Exhibitor; setup: Setup; directory: Person[]; setSetup: (s: Setup) => void }

function nameOf(l: LeadRow, directory: Person[]): string {
  return l.typed_name ?? directory.find((p) => p.id === l.person_id)?.fullName ?? 'מבקר';
}
function cityOf(l: LeadRow, directory: Person[]): string {
  return directory.find((p) => p.id === l.person_id)?.city ?? '';
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
/** 050-1234567 → 972501234567, for a WhatsApp link. */
function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('0') ? '972' + d.slice(1) : d;
}

// ---------- the undo bar: one-tap actions can be taken back for a few seconds

interface Undo { label: string; run: () => Promise<void> }
function UndoBar({ undo, onDone }: { undo: Undo | null; onDone: () => void }) {
  useEffect(() => { if (!undo) return; const t = setTimeout(onDone, 10000); return () => clearTimeout(t); }, [undo, onDone]);
  if (!undo) return null;
  return (
    <div className="undo" role="status">
      <span>{undo.label}</span>
      <button type="button" className="link" onClick={async () => { onDone(); await undo.run(); }}>ביטול</button>
    </div>
  );
}

// ---------- תמונת מצב: the day of the fair, calmly, from this phone

export function Snapshot({ setup, todays, notes, waiting }: { setup: Setup; todays: LocalLead[]; notes: LocalNote[]; waiting: number }) {
  const owners = todays.filter((l) => l.businessOwner).length;
  const ids = new Set(todays.map((l) => l.id));
  const mine = notes.filter((n) => ids.has(n.leadId));
  const byNeed = setup.needs.map((n) => ({ label: n.label, count: todays.filter((l) => l.taps.includes(n.label)).length, primary: n.goal === 'primary' }));
  const nothing = todays.filter((l) => !l.taps.length).length;
  const ahead = todays.map((l) => nextTask(setup, l, today())).filter((n): n is Extract<Next, { kind: 'task' }> => n.kind === 'task');
  const week = inDays(7);
  const myWeek = ahead.filter((n) => n.who === 'me' && n.dueOn <= week).length;
  const autoWeek = ahead.filter((n) => n.who === 'auto' && n.dueOn <= week).length;
  const firstDay = ahead.map((n) => n.dueOn).sort()[0];
  const max = Math.max(1, ...byNeed.map((b) => b.count));
  return (
    <div className="screen">
      <section className="step hero">
        <span className="hero-num">{todays.length}</span>
        <span>נרשמו היום{owners ? ` · ${owners} בעלי עסק` : ''}</span>
        {waiting > 0 && <span className="note">{waiting} עוד ממתינים לעלות לשרת</span>}
      </section>
      {byNeed.length > 0 && (
        <section className="step">
          <h3>מה ביקשו</h3>
          <ul className="bars">
            {byNeed.map((b) => (
              <li key={b.label}>
                <span>{b.label}{b.primary ? <span className="muted small"> · המטרה הראשית</span> : null}</span>
                <span className="meter"><span style={{ width: `${(b.count / max) * 100}%` }} /></span>
                <strong>{b.count}</strong>
              </li>
            ))}
            {nothing > 0 && <li><span className="muted">בלי סימון</span><span className="meter" /><strong>{nothing}</strong></li>}
          </ul>
        </section>
      )}
      <section className="step">
        <h3>מה כבר נאסף</h3>
        <p>{mine.filter((n) => n.body).length} הערות · {mine.filter((n) => !n.body).length} הקלטות</p>
      </section>
      <section className="step">
        <h3>מה מחכה אחרי התערוכה</h3>
        {ahead.length ? (
          <p>בשבוע הקרוב: <strong>{myWeek}</strong> שיחות ופגישות שלך, ו־<strong>{autoWeek}</strong> הודעות שיוצאות לבד.{firstDay ? ` הראשונה ${dayLabel(firstDay)}.` : ''}</p>
        ) : <p className="muted">כשתרשום מבקרים, יופיע כאן מה מחכה לך בימים שאחרי.</p>}
      </section>
    </div>
  );
}

// ---------- הבא בתור: one thing at a time, with what is needed to do it

interface Item { row: LeadRow; lead: Lead; next: Next; name: string; city: string; owner: boolean }

function useItems(ctx: Ctx, book: Book | undefined): Item[] {
  return useMemo(() => {
    if (!book) return [];
    return book.leads.map((row) => {
      const owner = ownerOf(row, ctx.directory);
      const lead = engineLead(row, book, owner);
      return { row, lead, next: nextTask(ctx.setup, lead, today()), name: nameOf(row, ctx.directory), city: cityOf(row, ctx.directory), owner };
    });
  }, [book, ctx.setup, ctx.directory]);
}

export function Queue({ ctx }: { ctx: Ctx }) {
  const [book, reload, error] = useData(loadBook);
  const items = useItems(ctx, book);
  const [undo, setUndo] = useState<Undo | null>(null);
  const clearUndo = useCallback(() => setUndo(null), []);
  if (error) return <p className="err">{error}</p>;
  if (!book) return <p className="muted">טוען…</p>;

  const open = items.filter((i) => i.next.kind !== 'end').sort((a, b) => dueOf(a).localeCompare(dueOf(b)));
  const now = open.filter((i) => dueOf(i) <= today());
  const later = open.filter((i) => dueOf(i) > today());
  const days = [...new Set(later.map(dueOf))];

  return (
    <div className="screen">
      <UndoBar undo={undo} onDone={clearUndo} />
      {now.length ? (
        <>
          <h2>הבא בתור <span className="muted small">· {now.length} להיום</span></h2>
          <ul className="tasks">
            {now.map((i, n) => <TaskCard key={i.row.id} item={i} first={n === 0} ctx={ctx} notes={book.notes.filter((x) => x.lead_id === i.row.id)} onChange={reload} onUndo={setUndo} />)}
          </ul>
        </>
      ) : (
        <section className="step center">
          <h2>אין מה לעשות היום</h2>
          <p className="muted">{later.length ? `הבא: ${later[0]!.name}, ${dayLabel(dueOf(later[0]!))}.` : 'כל מבקר שתרשום בדוכן יקבל כאן את הצעד הבא שלו.'}</p>
        </section>
      )}
      {later.length > 0 && (
        <>
          <h2>בהמשך</h2>
          {days.map((d) => (
            <div key={d} className="day-group">
              <span className="qlabel">{dayLabel(d)}</span>
              <ul className="plain">
                {later.filter((i) => dueOf(i) === d).map((i) => <li key={i.row.id}><strong>{i.name}</strong> <span className="muted">· {short(i.next)}</span></li>)}
              </ul>
            </div>
          ))}
        </>
      )}
      <Soon title="הודעת בוקר"><p>כל בוקר תגיע אליך בוואטסאפ רשימת המשימות של היום, עם קישור ישר לכאן.</p></Soon>
    </div>
  );
}
const dueOf = (i: Item) => (i.next.kind === 'end' ? '9999' : i.next.dueOn);
function short(n: Next): string {
  if (n.kind === 'end') return END[n.reason] ?? '';
  if (n.kind === 'askDate') return 'לברר את התאריך שלו';
  return `${ACT[n.action] ?? n.action} ${n.who === 'me' ? 'ממך' : 'אוטומטית'}`;
}

function TaskCard({ item, first, ctx, notes, onChange, onUndo }: { item: Item; first: boolean; ctx: Ctx; notes: NoteRow[]; onChange: () => void; onUndo: (u: Undo) => void }) {
  const { row, next, name, owner } = item;
  const [busy, setBusy] = useState(false);
  const [talk, setTalk] = useState(false);
  const [more, setMore] = useState(false);
  const [contact, setContact] = useState<{ phone: string | null } | null>(null);
  useEffect(() => { leadContact(row.id).then(setContact).catch(() => setContact(null)); }, [row.id]);
  if (next.kind === 'end') return null;
  const stepId = next.stepId;
  const args = [ctx.exhibitor.id, ctx.setup, owner, today()] as const;

  async function mark(outcome: 'noAnswer' | 'closed' | 'notRelevant' | 'optOut', label: string) {
    setBusy(true);
    try {
      await markStep(row, stepId, outcome, ...args);
      onUndo({ label: `${name}: ${label}`, run: async () => { await unmarkStep(row, stepId, ...args); onChange(); } });
    } finally { setBusy(false); setMore(false); onChange(); }
  }
  async function date(d: string) {
    if (!d) return;
    setBusy(true);
    await setCustomerDate(row, d, ...args).catch(() => {});
    setBusy(false); onChange();
  }

  const isTalk = next.kind === 'task' && (next.action === 'talk' || next.action === 'meet');
  const isWait = next.kind === 'task' && next.action === 'wait';
  const isAuto = next.kind === 'task' && next.who === 'auto';
  const what = next.kind === 'askDate' ? 'לברר מתי התאריך שלו' : `${ACT[next.action] ?? next.action}${next.message ? ` · ${next.message}` : ''}`;

  return (
    <li className={'task' + (first ? ' first' : '')}>
      <div className="task-head">
        <div><strong className="big">{name}</strong> <span className="muted">{item.city}{owner ? ' · בעל עסק' : ''}</span></div>
        <span className={'when' + (next.kind === 'task' && next.late ? ' over' : '')}>{next.kind === 'task' && next.late ? 'באיחור' : dayLabel(next.dueOn)}</span>
      </div>
      <div className="what">{what}{isAuto ? <span className="muted small"> · אמור לצאת לבד (השליחה מתחברת בקרוב)</span> : null}</div>
      {row.taps.length > 0 && <div className="muted small">ביקש: {row.taps.join(' · ')}</div>}
      {(row.note || notes.length > 0) && <Notes note={row.note} notes={notes} />}
      {contact?.phone && (
        <div className="contact">
          <a className="act" href={`tel:${contact.phone}`}>חיוג {contact.phone}</a>
          <a className="act" href={`https://wa.me/${waNumber(contact.phone)}`} target="_blank" rel="noreferrer">וואטסאפ</a>
        </div>
      )}

      {talk ? (
        <TalkSheet item={item} ctx={ctx} stepId={stepId} onClose={() => setTalk(false)} onChange={onChange} onUndo={onUndo} />
      ) : next.kind === 'askDate' ? (
        <div className="acts">
          <label className="inline">התאריך שלו: <input type="date" disabled={busy} onChange={(e) => date(e.target.value)} /></label>
          <button type="button" className="act" onClick={() => setTalk(true)}>דיברנו</button>
        </div>
      ) : (
        <div className="acts">
          {isWait ? (
            <>
              <button type="button" className="act ok" disabled={busy} onClick={() => setTalk(true)}>הוא חזר אליי</button>
              <button type="button" className="act" disabled={busy} onClick={() => mark('noAnswer', 'עדיין לא חזר')}>עדיין לא</button>
            </>
          ) : isTalk ? (
            <>
              <button type="button" className="act ok" disabled={busy} onClick={() => setTalk(true)}>דיברנו</button>
              <button type="button" className="act" disabled={busy} onClick={() => mark('noAnswer', 'לא ענה')}>לא ענה</button>
            </>
          ) : (
            <>
              <button type="button" className="act ok" disabled={busy} onClick={() => mark('noAnswer', isAuto ? 'נשלח ביד' : 'בוצע')}>{isAuto ? 'שלחתי ביד' : 'בוצע'}</button>
              <button type="button" className="act" disabled={busy} onClick={() => setTalk(true)}>דיברנו</button>
            </>
          )}
          <button type="button" className="act" aria-expanded={more} onClick={() => setMore(!more)}>עוד</button>
        </div>
      )}
      {more && !talk && (
        <div className="acts">
          <button type="button" className="act" disabled={busy} onClick={() => mark('closed', 'נסגרה עסקה')}>נסגרה עסקה</button>
          <button type="button" className="act" disabled={busy} onClick={() => mark('notRelevant', 'לא רלוונטי')}>לא רלוונטי</button>
          <button type="button" className="act" disabled={busy} onClick={() => mark('optOut', 'ביקש להסיר')}>ביקש להסיר אותו</button>
        </div>
      )}
    </li>
  );
}

// ---------- דיברנו — מה הלאה: the next step is already chosen; one tap to confirm, or change it

const NEXT_ACTIONS: Action[] = ['talk', 'meet', 'send', 'prepare'];
const QUICK: [string, number][] = [['היום', 0], ['מחר', 1], ['עוד 3 ימים', 3], ['שבוע', 7], ['שבועיים', 14], ['חודש', 30]];

function TalkSheet({ item, ctx, stepId, onClose, onChange, onUndo }: { item: Item; ctx: Ctx; stepId: string | null; onClose: () => void; onChange: () => void; onUndo: (u: Undo) => void }) {
  const { row, lead, name, owner } = item;
  // What the path would do after this talk: the step after the current one, as if he had answered.
  const suggested = useMemo(() => {
    const after: Lead = stepId ? { ...lead, history: [...lead.history, { stepId, doneOn: today(), outcome: 'noAnswer' }] } : lead;
    const s = pathAhead(ctx.setup, after);
    const fits = !!s && s.who === 'me' && NEXT_ACTIONS.includes(s.action);
    const action: Action = fits ? s.action : 'talk';
    const days = s && s.timing.kind === 'after' && s.timing.days > 0 ? s.timing.days : 7;
    return { action, days: fits ? days : 7, fromPath: fits };
  }, [ctx.setup, lead, stepId]);
  const [action, setAction] = useState<Action>(suggested.action);
  const [due, setDue] = useState(inDays(suggested.days));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const args = [ctx.exhibitor.id, ctx.setup, owner, today()] as const;

  async function finish(outcome: 'engaged' | 'closed' | 'notRelevant', withNext: boolean) {
    setBusy(true);
    try {
      const id = stepId ?? `talk:${Date.now()}`;
      await markStep(row, id, outcome, ...args);
      const manual = withNext ? await addManual(row, { action, dueOn: due }, ...args) : null;
      if (note.trim()) await addFollowNote(row.id, note.trim(), ctx.exhibitor.id);
      const label = outcome === 'engaged' ? (manual ? `${ACT[action]} ${dayLabel(due)}` : 'בלי המשך כרגע') : OUTCOME[outcome]!;
      onUndo({
        label: `${name}: ${label}`,
        run: async () => { if (manual) await removeManual(row, manual, ...args); await unmarkStep(row, id, ...args); onChange(); },
      });
      onClose();
    } finally { setBusy(false); onChange(); }
  }

  return (
    <div className="sheet">
      <strong>דיברנו — מה הלאה?</strong>
      <div className="q">
        <span className="qlabel">הצעד הבא{suggested.fromPath ? ' (לפי המסלול שלך)' : ''}</span>
        <div className="chips">{NEXT_ACTIONS.map((a) => <button key={a} type="button" className="chip" aria-pressed={action === a} onClick={() => setAction(a)}>{ACT[a]}</button>)}</div>
      </div>
      <div className="q">
        <span className="qlabel">מתי</span>
        <div className="chips">
          {QUICK.map(([l, d]) => <button key={l} type="button" className="chip" aria-pressed={due === inDays(d)} onClick={() => setDue(inDays(d))}>{l}</button>)}
          <input type="date" className="chip-date" value={due} min={today()} onChange={(e) => e.target.value && setDue(e.target.value)} />
        </div>
      </div>
      <textarea rows={2} placeholder="מה סוכם (לא חובה)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button" className="save inline-save" disabled={busy} onClick={() => finish('engaged', true)}>שמירה: {ACT[action]} · {dayLabel(due)}</button>
      <div className="acts">
        <button type="button" className="act" disabled={busy} onClick={() => finish('closed', false)}>נסגרה עסקה</button>
        <button type="button" className="act" disabled={busy} onClick={() => finish('notRelevant', false)}>לא רלוונטי</button>
        <button type="button" className="act" disabled={busy} onClick={() => finish('engaged', false)}>בלי המשך כרגע</button>
        <button type="button" className="link" onClick={onClose}>חזרה</button>
      </div>
    </div>
  );
}

function Notes({ note, notes }: { note: string | null; notes: NoteRow[] }) {
  return (
    <ul className="notes">
      {note && <li>{note}</li>}
      {notes.map((n) => (n.audio_path ? <Voice key={n.id} path={n.audio_path} when={n.created_at} /> : <li key={n.id}>{n.body}</li>))}
    </ul>
  );
}
function Voice({ path, when }: { path: string; when: string }) {
  const [url, setUrl] = useState<string | null>(null);
  return (
    <li className="voice">
      <span>הקלטה · {dayLabel(when.slice(0, 10))}</span>
      {url ? <audio controls autoPlay src={url} /> : <button type="button" className="link" onClick={() => voiceUrl(path).then(setUrl)}>להשמיע</button>}
    </li>
  );
}

// ---------- הלקוחות: everyone, with where he stands and what happened

export function Leads({ ctx }: { ctx: Ctx }) {
  const [book, reload, error] = useData(loadBook);
  const items = useItems(ctx, book);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [undo, setUndo] = useState<Undo | null>(null);
  const clearUndo = useCallback(() => setUndo(null), []);
  if (error) return <p className="err">{error}</p>;
  if (!book) return <p className="muted">טוען…</p>;
  const shown = items.filter((i) => !q.trim() || i.name.includes(q.trim()) || i.city.includes(q.trim()));
  return (
    <div className="screen">
      <UndoBar undo={undo} onDone={clearUndo} />
      <h2>כל המבקרים ({items.length})</h2>
      {items.length > 6 && <input className="search" placeholder="חיפוש לפי שם או עיר" value={q} onChange={(e) => setQ(e.target.value)} />}
      {!items.length && <p className="muted">עוד לא נרשמו מבקרים. הם יופיעו כאן מהרגע שתקיש על שמם בדוכן.</p>}
      <ul className="leads">
        {shown.map((i) => (
          <li key={i.row.id}>
            <button type="button" className="lead" aria-expanded={open === i.row.id} onClick={() => setOpen(open === i.row.id ? null : i.row.id)}>
              <strong>{i.name}</strong>
              <span className="muted">{i.row.taps.join(' · ') || 'בלי סימון'}</span>
              <span className="status">{describe(i.next)}</span>
            </button>
            {open === i.row.id && <LeadDetail item={i} ctx={ctx} book={book} onChange={reload} onUndo={setUndo} />}
          </li>
        ))}
      </ul>
      <Soon title="עוד בלקוחות"><p>סינון לפי מצב, ייצוא לאקסל, ותשובות שהגיעו מהלקוח בוואטסאפ, בציר הזמן של כל אחד.</p></Soon>
    </div>
  );
}

function LeadDetail({ item, ctx, book, onChange, onUndo }: { item: Item; ctx: Ctx; book: Book; onChange: () => void; onUndo: (u: Undo) => void }) {
  const { row, next } = item;
  const [talk, setTalk] = useState(false);
  const [contact, setContact] = useState<{ phone: string | null; email: string | null } | null>(null);
  useEffect(() => { leadContact(row.id).then(setContact).catch(() => setContact(null)); }, [row.id]);
  const steps = book.steps.filter((s) => s.lead_id === row.id);
  const manual = book.manual.filter((m) => m.lead_id === row.id);
  const notes = book.notes.filter((n) => n.lead_id === row.id);
  const stepId = next.kind === 'end' ? null : next.stepId;
  const finished = next.kind === 'end' && next.reason !== 'engaged' && next.reason !== 'list' && next.reason !== 'stop';
  return (
    <div className="lead-detail">
      <p className="muted small">
        נרשם {dayLabel(row.captured_on)}{row.customer_date ? ` · התאריך שלו: ${row.customer_date.split('-').reverse().join('.')}` : ''}
        {contact?.phone ? ` · ${contact.phone}` : ''}{contact?.email ? ` · ${contact.email}` : ''}
      </p>
      {(row.note || notes.length > 0) && <Notes note={row.note} notes={notes} />}
      <h4>מה קרה עד עכשיו</h4>
      {steps.length || manual.length ? (
        <ul className="history">
          {steps.map((s) => <li key={s.step_id}>{dayLabel(s.done_on)} · {(s.step_id.startsWith('m:') || s.step_id.startsWith('talk:') ? OUTCOME : DONE)[s.outcome] ?? s.outcome}</li>)}
          {manual.filter((m) => !steps.some((s) => s.step_id === `m:${m.id}`)).map((m) => <li key={m.id}>נקבע: {ACT[m.action]} · {dayLabel(m.due_on)}</li>)}
        </ul>
      ) : <p className="muted small">עוד לא היה צעד.</p>}
      {!finished && (talk
        ? <TalkSheet item={item} ctx={ctx} stepId={stepId} onClose={() => setTalk(false)} onChange={onChange} onUndo={onUndo} />
        : <button type="button" className="act" onClick={() => setTalk(true)}>דיברנו איתו</button>)}
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
      <Soon title="איך הן יוצאות"><p>שלוש דרכים, לבחירתך: חיבור הוואטסאפ שלך בסריקת קוד; שליחה בהקשה (נפתח וואטסאפ עם ההודעה מוכנה, אתה לוחץ שלח); או מייל בלבד. הודעה לכמה אנשים יחד יוצאת במייל, כדי לא לסכן את המספר שלך.</p></Soon>
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
