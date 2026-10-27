// The exhibitor's screens beside the booth: the snapshot of the day, and the CRM — home, tasks, leads, dashboard, messages —
// the settings, and the admin's. Built on the brand book's pieces (ui.tsx): one title with a "?", tiles, white lists,
// and one outlined object per screen, the one in hand. What is built works on the real data; what is not says what it will be.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { nextTask, pathAhead, type Action, type Lead, type Next, type Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import * as text from './lib/describe.ts';
import { ACT, END, dayLabel, describe, inDays, today } from './lib/words.ts';
import { Icon, PageHead, Tiles, longDate, setTipsOn, tipsOn } from './ui.tsx';
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

export interface Ctx {
  exhibitor: Exhibitor; setup: Setup; directory: Person[]; setSetup: (s: Setup) => void;
  admin: boolean; go: (view: string) => void;
}

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
  return <section className="soon"><b>{title} <span className="tag">בבנייה</span></b><p>{children}</p></section>;
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
const eyebrowOf = (desk: boolean) => (desk ? 'CRM' : undefined);

// ---------- the undo line: one-tap actions can be taken back for ten seconds

interface Undo { label: string; run: () => Promise<void> }
function UndoBar({ undo, onDone }: { undo: Undo | null; onDone: () => void }) {
  useEffect(() => { if (!undo) return; const t = setTimeout(onDone, 10000); return () => clearTimeout(t); }, [undo, onDone]);
  if (!undo) return null;
  return (
    <div className="toast" role="status">
      <span>{undo.label}</span>
      <button type="button" className="text-btn" onClick={async () => { onDone(); await undo.run(); }}>ביטול</button>
    </div>
  );
}

function Meters({ rows }: { rows: { label: ReactNode; count: number; key: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="meters">
      {rows.map((r) => (
        <li key={r.key}><span>{r.label}</span><span className="meter"><span style={{ width: `${(r.count / max) * 100}%` }} /></span><strong>{r.count}</strong></li>
      ))}
    </ul>
  );
}

// ---------- תמונת מצב: the day of the fair, calmly, from this phone

export function Snapshot({ setup, todays, notes, waiting, eyebrow }: { setup: Setup; todays: LocalLead[]; notes: LocalNote[]; waiting: number; eyebrow?: string }) {
  const owners = todays.filter((l) => l.businessOwner).length;
  const ids = new Set(todays.map((l) => l.id));
  const mine = notes.filter((n) => ids.has(n.leadId));
  const byNeed = setup.needs.map((n) => ({ key: n.label, label: <>{n.label}{n.goal === 'primary' ? <span className="faint small"> · המטרה הראשית</span> : null}</>, count: todays.filter((l) => l.taps.includes(n.label)).length }));
  const nothing = todays.filter((l) => !l.taps.length).length;
  const ahead = todays.map((l) => nextTask(setup, l, today())).filter((n): n is Extract<Next, { kind: 'task' }> => n.kind === 'task');
  const week = inDays(7);
  const myWeek = ahead.filter((n) => n.who === 'me' && n.dueOn <= week).length;
  const autoWeek = ahead.filter((n) => n.who === 'auto' && n.dueOn <= week).length;
  const firstDay = ahead.map((n) => n.dueOn).sort()[0];
  return (
    <div className="page">
      <PageHead title="תמונת מצב" eyebrow={eyebrow} sub={longDate()} tip="מה נאסף היום בדוכן, ומה מחכה לך בימים שאחרי. הכל מהטלפון הזה." />
      <Tiles items={[[todays.length, 'נרשמו היום'], [owners, 'בעלי עסק'], [mine.filter((n) => n.body).length, 'הערות'], [mine.filter((n) => !n.body).length, 'הקלטות']]} />
      {waiting > 0 && <p className="note">{waiting} עוד ממתינים לעלות לשרת. הם יעלו לבד כשתהיה רשת.</p>}
      {byNeed.length > 0 && (
        <section className="stack">
          <div className="sec">מה ביקשו</div>
          <div className="panel-w"><Meters rows={[...byNeed, ...(nothing ? [{ key: '-', label: <span className="muted">בלי סימון</span>, count: nothing }] : [])]} /></div>
        </section>
      )}
      <section className="stack">
        <div className="sec">מה מחכה אחרי התערוכה</div>
        <div className="panel-w">
          {ahead.length ? (
            <p>בשבוע הקרוב: <b>{myWeek}</b> שיחות ופגישות שלך, ו־<b>{autoWeek}</b> הודעות שיוצאות לבד.{firstDay ? ` הראשונה ${dayLabel(firstDay)}.` : ''}</p>
          ) : <p className="muted">כשתרשום מבקרים, יופיע כאן מה מחכה לך בימים שאחרי.</p>}
        </div>
      </section>
    </div>
  );
}

// ---------- the follow-up: everything computed by the engine on the phone, from the server's records

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
const dueOf = (i: Item) => (i.next.kind === 'end' ? '9999' : i.next.dueOn);
function split(items: Item[]) {
  const open = items.filter((i) => i.next.kind !== 'end').sort((a, b) => dueOf(a).localeCompare(dueOf(b)));
  return { open, now: open.filter((i) => dueOf(i) <= today()), later: open.filter((i) => dueOf(i) > today()) };
}
function short(n: Next): string {
  if (n.kind === 'end') return END[n.reason] ?? '';
  if (n.kind === 'askDate') return 'לברר את התאריך שלו';
  return `${ACT[n.action] ?? n.action} ${n.who === 'me' ? 'ממך' : 'אוטומטית'}`;
}
function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : 'ערב טוב';
}

// ---------- דף הבית: what waits today, and the next in line — the one thing in hand

export function Home({ ctx, desk }: { ctx: Ctx; desk: boolean }) {
  const [book, reload, error] = useData(loadBook);
  const items = useItems(ctx, book);
  const [undo, setUndo] = useState<Undo | null>(null);
  const clearUndo = useCallback(() => setUndo(null), []);
  const head = <PageHead title={`${greeting()}, ${ctx.exhibitor.name}`} eyebrow={eyebrowOf(desk)} sub={longDate()} tip="מה מחכה היום, ומי הבא בתור, עם מה שצריך כדי לטפל בו." />;
  if (error) return <div className="page">{head}<p className="err">{error}</p></div>;
  if (!book) return <div className="page">{head}<p className="muted">טוען…</p></div>;
  const { now, later, open } = split(items);
  const late = now.filter((i) => i.next.kind === 'task' && i.next.late).length;
  const week = open.filter((i) => dueOf(i) <= inDays(7)).length;
  const closed = items.filter((i) => i.next.kind === 'end' && i.next.reason === 'closed').length;
  const first = now[0];
  const after = [...now.slice(1), ...later].slice(0, 6);
  return (
    <div className="page">
      <UndoBar undo={undo} onDone={clearUndo} />
      {head}
      <Tiles items={[[now.length, 'להיום'], [late, 'באיחור', late > 0], [week, 'השבוע'], [closed, 'עסקאות שנסגרו']]} />
      <div className="home-grid">
        <section className="stack">
          <div className="sec">הבא בתור</div>
          {first ? (
            <ul className="task-list"><TaskCard item={first} held ctx={ctx} notes={book.notes.filter((x) => x.lead_id === first.row.id)} onChange={reload} onUndo={setUndo} /></ul>
          ) : (
            <div className="empty">
              <b>אין מה לעשות היום</b>
              <p className="muted">{later.length ? `הבא: ${later[0]!.name}, ${dayLabel(dueOf(later[0]!))}.` : 'כל מבקר שתרשום בדוכן יקבל כאן את הצעד הבא שלו.'}</p>
            </div>
          )}
        </section>
        {after.length > 0 && (
          <aside className="stack">
            <div className="sec">אחריו בתור</div>
            <ul className="list">
              {after.map((i) => (
                <li key={i.row.id} className="list-row">
                  <div className="row-name">{i.name}</div>
                  <div className="row-step">{short(i.next)} · {dayLabel(dueOf(i))}</div>
                </li>
              ))}
            </ul>
            <button type="button" className="text-btn" onClick={() => ctx.go('tasks')}>לכל המשימות</button>
          </aside>
        )}
      </div>
    </div>
  );
}

// ---------- משימות: everything to do, by date

export function Tasks({ ctx, desk }: { ctx: Ctx; desk: boolean }) {
  const [book, reload, error] = useData(loadBook);
  const items = useItems(ctx, book);
  const [undo, setUndo] = useState<Undo | null>(null);
  const clearUndo = useCallback(() => setUndo(null), []);
  const head = <PageHead title="משימות" eyebrow={eyebrowOf(desk)} tip="כל מה שעליך לעשות, לפי התאריך. אחרי כל פעולה אפשר לבטל אותה בתוך 10 שניות." />;
  if (error) return <div className="page narrow">{head}<p className="err">{error}</p></div>;
  if (!book) return <div className="page narrow">{head}<p className="muted">טוען…</p></div>;
  const { now, later } = split(items);
  const days = [...new Set(later.map(dueOf))];
  return (
    <div className="page narrow">
      <UndoBar undo={undo} onDone={clearUndo} />
      {head}
      <section className="stack">
        <div className="sec">להיום · {now.length}</div>
        {now.length ? (
          <ul className="task-list">
            {now.map((i, n) => <TaskCard key={i.row.id} item={i} held={n === 0} ctx={ctx} notes={book.notes.filter((x) => x.lead_id === i.row.id)} onChange={reload} onUndo={setUndo} />)}
          </ul>
        ) : <div className="empty"><b>אין מה לעשות היום</b><p className="muted">כל מבקר שתרשום בדוכן יקבל כאן את הצעד הבא שלו.</p></div>}
      </section>
      {days.map((d) => (
        <section key={d} className="stack">
          <div className="sec">{dayLabel(d)}</div>
          <ul className="list">
            {later.filter((i) => dueOf(i) === d).map((i) => <li key={i.row.id} className="list-row"><div className="row-name">{i.name}</div><div className="row-step">{short(i.next)}</div></li>)}
          </ul>
        </section>
      ))}
      <Soon title="הודעת בוקר">כל בוקר תגיע אליך בוואטסאפ רשימת המשימות של היום, עם קישור ישר לכאן.</Soon>
    </div>
  );
}

function TaskCard({ item, held, ctx, notes, onChange, onUndo }: { item: Item; held: boolean; ctx: Ctx; notes: NoteRow[]; onChange: () => void; onUndo: (u: Undo) => void }) {
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
  const late = next.kind === 'task' && next.late;
  const what = next.kind === 'askDate' ? 'לברר מתי התאריך שלו' : `${ACT[next.action] ?? next.action}${next.message ? ` · ${next.message}` : ''}`;
  const tall = held ? ' tall' : '';

  return (
    <li className={held ? 'held' : 'task'}>
      <div className="who"><b>{name}</b><span className="ctx">{[item.city, owner ? 'בעל עסק' : '', row.taps.join(' · ')].filter(Boolean).join(' · ')}</span></div>
      <div>
        <span className="now-w">{next.dueOn <= today() ? 'עכשיו' : dayLabel(next.dueOn)}</span> <b>{what}</b>{late && <span className="late-w"> באיחור</span>}
        {isAuto && <div className="faint small">אמור לצאת לבד. השליחה מתחברת בקרוב, בינתיים אפשר לשלוח ביד.</div>}
      </div>
      {(row.note || notes.length > 0) && <Notes note={row.note} notes={notes} />}
      {contact?.phone && (
        <div className="row">
          <a className="btn" href={`tel:${contact.phone}`}><Icon name="phone" />{contact.phone}</a>
          <a className="btn" href={`https://wa.me/${waNumber(contact.phone)}`} target="_blank" rel="noreferrer">וואטסאפ</a>
        </div>
      )}

      {talk ? (
        <TalkSheet item={item} ctx={ctx} stepId={stepId} onClose={() => setTalk(false)} onChange={onChange} onUndo={onUndo} />
      ) : next.kind === 'askDate' ? (
        <div className="answers">
          <label className="field" style={{ fontWeight: 600 }}>התאריך שלו<input type="date" disabled={busy} onChange={(e) => date(e.target.value)} /></label>
          <button type="button" className={'btn' + tall} style={{ alignSelf: 'end' }} onClick={() => setTalk(true)}>דיברנו</button>
        </div>
      ) : (
        <div className="answers">
          {isWait ? (
            <>
              <button type="button" className={'btn primary' + tall} disabled={busy} onClick={() => setTalk(true)}>הוא חזר אליי</button>
              <button type="button" className={'btn' + tall} disabled={busy} onClick={() => mark('noAnswer', 'עדיין לא חזר')}>עדיין לא</button>
            </>
          ) : isTalk ? (
            <>
              <button type="button" className={'btn primary' + tall} disabled={busy} onClick={() => setTalk(true)}><Icon name="check" />דיברנו</button>
              <button type="button" className={'btn' + tall} disabled={busy} onClick={() => mark('noAnswer', 'לא ענה')}>לא ענה</button>
            </>
          ) : (
            <>
              <button type="button" className={'btn primary' + tall} disabled={busy} onClick={() => mark('noAnswer', isAuto ? 'נשלח ביד' : 'בוצע')}><Icon name="check" />{isAuto ? 'שלחתי ביד' : 'בוצע'}</button>
              <button type="button" className={'btn' + tall} disabled={busy} onClick={() => setTalk(true)}>דיברנו</button>
            </>
          )}
          <button type="button" className={'btn' + tall} aria-expanded={more} onClick={() => setMore(!more)}>עוד</button>
        </div>
      )}
      {more && !talk && (
        <div className="answers">
          <button type="button" className="btn" disabled={busy} onClick={() => mark('closed', 'נסגרה עסקה')}>נסגרה עסקה</button>
          <button type="button" className="btn" disabled={busy} onClick={() => mark('notRelevant', 'לא רלוונטי')}>לא רלוונטי</button>
          <button type="button" className="btn" disabled={busy} onClick={() => mark('optOut', 'ביקש להסיר')}>ביקש להסיר אותו</button>
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
      <h2>דיברנו — מה הלאה?</h2>
      <div className="q-block">
        <span className="sec">הצעד הבא{suggested.fromPath ? ' · לפי המסלול שלך' : ''}</span>
        <div className="chips">{NEXT_ACTIONS.map((a) => <button key={a} type="button" className="chip" aria-pressed={action === a} onClick={() => setAction(a)}>{ACT[a]}</button>)}</div>
      </div>
      <div className="q-block">
        <span className="sec">מתי</span>
        <div className="chips">
          {QUICK.map(([l, d]) => <button key={l} type="button" className="chip" aria-pressed={due === inDays(d)} onClick={() => setDue(inDays(d))}>{l}</button>)}
          <input type="date" aria-label="תאריך אחר" value={due} min={today()} onChange={(e) => e.target.value && setDue(e.target.value)} />
        </div>
      </div>
      <textarea className="area" rows={2} aria-label="מה סוכם" placeholder="מה סוכם (לא חובה)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button" className="btn primary tall wide" disabled={busy} onClick={() => finish('engaged', true)}>שמירה: {ACT[action]} · {dayLabel(due)}</button>
      <div className="row">
        <button type="button" className="btn" disabled={busy} onClick={() => finish('closed', false)}>נסגרה עסקה</button>
        <button type="button" className="btn" disabled={busy} onClick={() => finish('notRelevant', false)}>לא רלוונטי</button>
        <button type="button" className="btn" disabled={busy} onClick={() => finish('engaged', false)}>בלי המשך כרגע</button>
        <button type="button" className="text-btn" onClick={onClose}>חזרה</button>
      </div>
    </div>
  );
}

function Notes({ note, notes }: { note: string | null; notes: NoteRow[] }) {
  return (
    <ul className="notes">
      {note && <li className="note">{note}</li>}
      {notes.map((n) => (n.audio_path ? <Voice key={n.id} path={n.audio_path} when={n.created_at} /> : <li key={n.id} className="note">{n.body}</li>))}
    </ul>
  );
}
function Voice({ path, when }: { path: string; when: string }) {
  const [url, setUrl] = useState<string | null>(null);
  return (
    <li className="note voice">
      <span>הקלטה · {dayLabel(when.slice(0, 10))}</span>
      {url ? <audio controls autoPlay src={url} /> : <button type="button" className="text-btn" onClick={() => voiceUrl(path).then(setUrl)}>להשמיע</button>}
    </li>
  );
}

// ---------- לידים: everyone, with where he stands and what happened

export function Leads({ ctx, desk }: { ctx: Ctx; desk: boolean }) {
  const [book, reload, error] = useData(loadBook);
  const items = useItems(ctx, book);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [undo, setUndo] = useState<Undo | null>(null);
  const clearUndo = useCallback(() => setUndo(null), []);
  const head = <PageHead title="לידים" eyebrow={eyebrowOf(desk)} sub={book ? `${items.length} מבקרים` : undefined} tip="כל מי שנרשם, עם מה שקרה עד עכשיו ומה הצעד הבא. נגיעה בשם פותחת את הפרטים." />;
  if (error) return <div className="page narrow">{head}<p className="err">{error}</p></div>;
  if (!book) return <div className="page narrow">{head}<p className="muted">טוען…</p></div>;
  const shown = items.filter((i) => !q.trim() || i.name.includes(q.trim()) || i.city.includes(q.trim()));
  return (
    <div className="page narrow">
      <UndoBar undo={undo} onDone={clearUndo} />
      {head}
      {items.length > 6 && <label className="searchbox"><Icon name="search" /><input type="search" aria-label="חיפוש לפי שם או עיר" placeholder="חיפוש לפי שם או עיר" value={q} onChange={(e) => setQ(e.target.value)} /></label>}
      {!items.length ? (
        <div className="empty"><b>עוד אין לידים</b><p className="muted">הם יופיעו כאן מהרגע שתיגע בשמם בדוכן.</p></div>
      ) : (
        <ul className="list">
          {shown.map((i) => (
            <li key={i.row.id}>
              <button type="button" className="list-row" aria-expanded={open === i.row.id} onClick={() => setOpen(open === i.row.id ? null : i.row.id)}>
                <span className="row-name">{i.name}</span> <span className="muted small">{i.city}</span>
                <div className="row-step">{i.row.taps.join(' · ') || 'בלי סימון'}</div>
                <div className="row-id">{describe(i.next)}</div>
              </button>
              {open === i.row.id && <LeadDetail item={i} ctx={ctx} book={book} onChange={reload} onUndo={setUndo} />}
            </li>
          ))}
        </ul>
      )}
      <Soon title="עוד בלידים">סינון לפי מצב, ייצוא לאקסל, ותשובות שהגיעו מהלקוח בוואטסאפ, בציר הזמן של כל אחד.</Soon>
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
    <div className="detail">
      <p className="muted small">
        נרשם {dayLabel(row.captured_on)}{row.customer_date ? ` · התאריך שלו: ${row.customer_date.split('-').reverse().join('.')}` : ''}
        {contact?.email ? ` · ${contact.email}` : ''}
      </p>
      {contact?.phone && (
        <div className="row">
          <a className="btn" href={`tel:${contact.phone}`}><Icon name="phone" />{contact.phone}</a>
          <a className="btn" href={`https://wa.me/${waNumber(contact.phone)}`} target="_blank" rel="noreferrer">וואטסאפ</a>
        </div>
      )}
      {(row.note || notes.length > 0) && <Notes note={row.note} notes={notes} />}
      <div className="sec">מה קרה עד עכשיו</div>
      {steps.length || manual.length ? (
        <ul className="history">
          {steps.map((s) => <li key={s.step_id}>{dayLabel(s.done_on)} · {(s.step_id.startsWith('m:') || s.step_id.startsWith('talk:') ? OUTCOME : DONE)[s.outcome] ?? s.outcome}</li>)}
          {manual.filter((m) => !steps.some((s) => s.step_id === `m:${m.id}`)).map((m) => <li key={m.id}>נקבע: {ACT[m.action]} · {dayLabel(m.due_on)}</li>)}
        </ul>
      ) : <p className="muted small">עוד לא היה צעד.</p>}
      {!finished && (talk
        ? <TalkSheet item={item} ctx={ctx} stepId={stepId} onClose={() => setTalk(false)} onChange={onChange} onUndo={onUndo} />
        : <div className="row"><button type="button" className="btn" onClick={() => setTalk(true)}>דיברנו איתו</button></div>)}
    </div>
  );
}

// ---------- דשבורד: where everyone stands

export function Dashboard({ ctx, desk }: { ctx: Ctx; desk: boolean }) {
  const [book, , error] = useData(loadBook);
  const items = useItems(ctx, book);
  const head = <PageHead title="דשבורד" eyebrow={eyebrowOf(desk)} tip="איפה כל הלידים עומדים, ומה ביקשו בדוכן." />;
  if (error) return <div className="page">{head}<p className="err">{error}</p></div>;
  if (!book) return <div className="page">{head}<p className="muted">טוען…</p></div>;
  const { now, later } = split(items);
  const ended = (r: string) => items.filter((i) => i.next.kind === 'end' && i.next.reason === r).length;
  const late = now.filter((i) => i.next.kind === 'task' && i.next.late).length;
  return (
    <div className="page">
      {head}
      <Tiles items={[[items.length, 'כל הלידים'], [now.length + later.length, 'במעקב'], [late, 'באיחור', late > 0], [ended('closed'), 'עסקאות שנסגרו']]} />
      <div className="home-grid" style={{ gridTemplateColumns: desk ? 'minmax(0,1fr) minmax(0,1fr)' : undefined }}>
        <section className="stack">
          <div className="sec">איפה הם עומדים</div>
          <div className="panel-w">
            <Meters rows={[
              { key: 'now', label: 'משימה להיום', count: now.length },
              { key: 'later', label: 'משימה בהמשך', count: later.length },
              { key: 'engaged', label: END.engaged!, count: ended('engaged') },
              { key: 'list', label: END.list!, count: ended('list') },
              { key: 'closed', label: END.closed!, count: ended('closed') },
              { key: 'notRelevant', label: END.notRelevant!, count: ended('notRelevant') },
              { key: 'optOut', label: END.optOut!, count: ended('optOut') },
              { key: 'stop', label: END.stop!, count: ended('stop') },
            ].filter((r) => r.count)} />
            {!items.length && <p className="muted">עוד אין לידים.</p>}
          </div>
        </section>
        <section className="stack">
          <div className="sec">מה ביקשו בדוכן</div>
          <div className="panel-w">
            <Meters rows={[
              ...ctx.setup.needs.map((n) => ({ key: n.label, label: n.label, count: items.filter((i) => i.row.taps.includes(n.label)).length })),
              { key: '-', label: 'בלי סימון', count: items.filter((i) => !i.row.taps.length).length },
            ]} />
          </div>
        </section>
      </div>
    </div>
  );
}

// ---------- הודעות

export function Messages({ ctx, desk }: { ctx: Ctx; desk: boolean }) {
  const ids = new Set<string>();
  for (const n of ctx.setup.needs) for (const v of n.variants) for (const st of v.path.steps) if (st.message) ids.add(st.message);
  for (const p of [ctx.setup.defaults.business, ctx.setup.defaults.private]) for (const st of p.steps) if (st.message) ids.add(st.message);
  return (
    <div className="page narrow">
      <PageHead title="הודעות" eyebrow={eyebrowOf(desk)} tip="ההודעות שהמסלולים שלך שולחים למבקרים, ומתי." />
      <section className="stack">
        <div className="sec">ההודעות שהמסלולים שולחים</div>
        <ul className="list">
          <li className="list-row"><div className="row-name">תודה שביקרת</div><div className="row-step">בערב של יום התערוכה</div></li>
          {[...ids].map((m) => <li key={m} className="list-row"><div className="row-name">{m}</div></li>)}
        </ul>
      </section>
      <Soon title="הנוסח של כל הודעה">כאן תראה ותערוך את הטקסט שהמבקר מקבל. הנוסחים שאושרו בסבב 9 ייכנסו כברירת מחדל, עם הפנייה שבחרת בהגדרות.</Soon>
      <Soon title="איך הן יוצאות">שלוש דרכים, לבחירתך: חיבור הוואטסאפ שלך בסריקת קוד; שליחה בנגיעה (נפתח וואטסאפ עם ההודעה מוכנה, אתה לוחץ שלח); או מייל בלבד. הודעה לכמה אנשים יחד יוצאת במייל, כדי לא לסכן את המספר שלך.</Soon>
    </div>
  );
}

// ---------- הגדרות: details and connections, and the personal setup — one place, in two parts

export function Settings({ ctx, onSignOut }: { ctx: Ctx; onSignOut: () => void }) {
  const [tab, setTab] = useState<'details' | 'custom'>('details');
  return (
    <div className="page narrow">
      <PageHead title="הגדרות" tip="פרטים וחיבורים: איך ההודעות שלך פונות ויוצאות. התאמה אישית: הכרטיס בדוכן ומה קורה אחרי התערוכה." />
      <div className="seg" role="group" aria-label="חלק בהגדרות">
        <button type="button" aria-pressed={tab === 'details'} onClick={() => setTab('details')}>פרטים וחיבורים</button>
        <button type="button" aria-pressed={tab === 'custom'} onClick={() => setTab('custom')}>התאמה אישית</button>
      </div>
      {tab === 'details' ? <Details ctx={ctx} onSignOut={onSignOut} /> : <Custom ctx={ctx} />}
    </div>
  );
}

function Details({ ctx, onSignOut }: { ctx: Ctx; onSignOut: () => void }) {
  const [greeting, setG] = useState<'shalom' | 'kavod' | null>(null);
  const [tips, setTips] = useState(tipsOn);
  useEffect(() => { myGreeting().then(setG).catch(() => setG('shalom')); }, []);
  async function choose(g: 'shalom' | 'kavod') { setG(g); await setGreeting(ctx.exhibitor.id, g).catch(() => {}); }
  return (
    <>
      <section className="panel-w">
        <h2>איך ההודעות שלך פונות לאנשים</h2>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={greeting === 'shalom'} onClick={() => choose('shalom')}>שלום [שם]</button>
          <button type="button" className="chip" aria-pressed={greeting === 'kavod'} onClick={() => choose('kavod')}>בס"ד · לכבוד ר' [שם]</button>
        </div>
      </section>
      <section className="panel-w">
        <div className="switchrow">
          <span>להציג הסבר ליד כל מסך</span>
          <button type="button" className="switch" role="switch" aria-checked={tips} aria-label="להציג הסבר ליד כל מסך" onClick={() => { setTips(!tips); setTipsOn(!tips); }} />
        </div>
      </section>
      <Soon title="חיבור הוואטסאפ שלך">סורקים קוד QR מהטלפון, כמו בוואטסאפ ווב, וההודעות יוצאות מהמספר שלך. אפשר לנתק בכל רגע.</Soon>
      <Soon title="קריאת תשובות">באישורך בלבד: המערכת רואה רק תשובות של מבקרים שנרשמו אצלך, כדי לעצור את המעקב כשמישהו ענה.</Soon>
      <section className="panel-w">
        <h2>החשבון</h2>
        <p>{ctx.exhibitor.name}{ctx.exhibitor.business ? ` · ${ctx.exhibitor.business}` : ''}</p>
        <div className="row">
          <button type="button" className="btn" onClick={onSignOut}>יציאה</button>
          {ctx.admin && <button type="button" className="text-btn" onClick={() => ctx.go('admin')}>ניהול התערוכה</button>}
        </div>
      </section>
    </>
  );
}

function Custom({ ctx }: { ctx: Ctx }) {
  const s = ctx.setup;
  const [picking, setPicking] = useState(false);
  return (
    <>
      <section className="panel-w">
        <h2>איך מקימים</h2>
        <ul className="list" style={{ background: 'var(--surface-2)' }}>
          <li><a className="list-row" href={LAB_URL} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><div className="row-name">שיחה עם היועץ החכם</div><div className="row-step">בגרסת ניסיון, בחלון נפרד. בקרוב בתוך המערכת, וההקמה תישמר ישר לכאן.</div></a></li>
          <li className="list-row"><div className="row-name">הקמה בטופס <span className="tag">בבנייה</span></div><div className="row-step">שאלות קצרות לפי הסדר: מטרה, כרטיס, מסלולים, זמן, הודעות.</div></li>
          <li><button type="button" className="list-row" aria-expanded={picking} onClick={() => setPicking(!picking)}><div className="row-name">החלפת תבנית</div><div className="row-step">להתחיל מעסק דומה מהסבבים.</div></button></li>
        </ul>
        {picking && (
          <div className="chips">{fixtures.map((f) => <button key={f.id} type="button" className="chip" onClick={async () => { await changeTemplate(ctx.exhibitor.id, f.setup); ctx.setSetup(f.setup); setPicking(false); }}>{f.name}</button>)}</div>
        )}
      </section>

      {(s.anchor.goal || s.anchor.success) && (
        <section className="panel-w"><h2>מה תהיה הצלחה בתערוכה</h2><p>{s.anchor.goal}</p>{s.anchor.success && <p className="muted">{s.anchor.success}</p>}</section>
      )}

      <section className="panel-w">
        <h2>הכרטיס בדוכן</h2>
        {([['מה הוא צריך?', s.needs.map((n) => ({ label: n.label, effect: n.goal === 'primary' ? 'המטרה הראשית' : '' }))], ['מתי?', s.when], ['מי הוא?', s.who]] as [string, { label: string; effect: string }[]][]).map(([q, items]) => (
          items.length ? (
            <div key={q} className="q-block"><span className="sec">{q}</span>
              <ul className="history">{items.map((b) => <li key={b.label}><b style={{ color: 'var(--ink)' }}>{b.label}</b>{b.effect ? ` — ${b.effect}` : null}</li>)}</ul>
            </div>
          ) : null
        ))}
        {!s.needs.length && !s.when.length && !s.who.length && <p className="muted">כרטיס של שם בלבד.</p>}
      </section>

      <section className="panel-w">
        <h2>מה קורה אחרי התערוכה</h2>
        {s.needs.map((n) => (
          <div key={n.label} className="q-block">
            <span className="sec">{n.label}</span>
            {n.variants.map((v, i) => (
              <div key={i}>
                {n.variants.length > 1 && <span className="muted small">{text.variantTitle(v)}:</span>}
                <ol className="history" style={{ listStyle: 'decimal', paddingInlineStart: 22 }}>{text.path(v.path).map((line, j) => <li key={j}>{line}</li>)}</ol>
              </div>
            ))}
          </div>
        ))}
        <div className="q-block"><span className="sec">מבקר שלא סומן אצלו כלום</span>
          <div><span className="muted small">בעל עסק:</span><ol className="history" style={{ listStyle: 'decimal', paddingInlineStart: 22 }}>{text.path(s.defaults.business).map((l, j) => <li key={j}>{l}</li>)}</ol></div>
          <div><span className="muted small">פרטי:</span><ol className="history" style={{ listStyle: 'decimal', paddingInlineStart: 22 }}>{text.path(s.defaults.private).map((l, j) => <li key={j}>{l}</li>)}</ol></div>
        </div>
      </section>
    </>
  );
}

// ---------- ניהול (למנהל התערוכה): outside the system's menus, reached from the settings

export function Admin() {
  const load = useCallback(() => adminExhibitors(), []);
  const [rows, reload, error] = useData<AdminExhibitor[]>(load);
  const head = <PageHead title="ניהול התערוכה" sub={rows ? `${rows.length} מציגים` : undefined} />;
  if (error) return <div className="page narrow">{head}<p className="err">{error}</p></div>;
  if (!rows) return <div className="page narrow">{head}<p className="muted">טוען…</p></div>;
  const waiting = rows.filter((r) => !r.approved);
  return (
    <div className="page narrow">
      {head}
      {waiting.length > 0 && <p className="note">{waiting.length} ממתינים לאישור</p>}
      <ul className="list">
        {rows.map((r) => (
          <li key={r.id} className="list-row">
            <div><span className="row-name">{r.name}</span> <span className="faint small" dir="ltr">{r.email}</span></div>
            <div className="row-step">{r.business || '—'} · {r.leads} מבקרים</div>
            <div className="row" style={{ marginTop: 6 }}>
              {r.approved
                ? <button type="button" className="text-btn quiet" onClick={async () => { await adminApprove(r.id, false); reload(); }}>לבטל אישור</button>
                : <button type="button" className="btn primary" onClick={async () => { await adminApprove(r.id, true); reload(); }}>לאשר</button>}
            </div>
          </li>
        ))}
      </ul>
      <Soon title="רשימת המציגים מהמארגן">מעלים את הקובץ, וכל מי שבו נכנס בלי לחכות לאישור.</Soon>
      <Soon title="רשימת הקהילה">העלאת הרשימה האמיתית במקום השמות לדוגמה. הטלפונים והמיילים נשארים בשרת.</Soon>
    </div>
  );
}
