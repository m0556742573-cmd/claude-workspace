// The exhibitor's screens beside the booth: the snapshot of the day, and the CRM — home, tasks, leads, dashboard, messages —
// the settings, and the admin's. Built on the brand book's pieces (ui.tsx): one title with a "?", tiles, white lists,
// and one outlined object per screen, the one in hand. What is built works on the real data; what is not says what it will be.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addDays, nextOccurrence, nextTask, pathAhead, type Action, type Holiday, type Lead, type Next, type Path, type Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import * as text from './lib/describe.ts';
import { add, remove, rename, setDays, setGoal, type Group } from './lib/edit.ts';
import { ACT, END, EXPO_DAY, dayLabel, describe, inDays, today } from './lib/words.ts';
import { Icon, PageHead, Tiles, longDate, setTipsOn, tipsOn } from './ui.tsx';
import { EXHIBITOR_FIELDS, PEOPLE_FIELDS, mapColumns, parseCsv, toRecords, type Fields } from './lib/csv.ts';
import { MeForm } from './me.tsx';
import { AddChip, EditChip, GROUPS, PathLines } from './parts.tsx';
import { SetupSteps } from './setup.tsx';
import { Qr, joinUrl } from './join.tsx';
import { forgetWa, waCheck, waLink, waOpen, waStatus, waUnlink, type WaState } from './lib/wa.ts';
import { destinationOf, showDestination } from './lib/destination.ts';
import { detailsIn, draftFor, fill, holes, messagesOf, setTexts, textOf, useTexts, type Me } from './lib/messages.ts';
import type { Person } from './demo/people.ts';
import type { LocalLead, LocalNote } from './store/local.ts';
import {
  addFollowNote, addManual, setupVersions, leadCount, pinLeads, setupOf, adminClearPeople, adminCounts, adminLoadExhibitors, adminLoadPeople, allContacts, removeLead, renameTaps, saveLead, adminApprove, adminExhibitors, changeTemplate, engineLead, leadContact, loadBook, markStep, myGreeting,
  loadTexts, queueSend, queuedFor, recordSent, updateMe, leadDestinations, addDestination, setReceives, removeDestination, type Destination, removeManual, resetText, setWaOptions, saveText, setCustomerDate, setGreeting, unmarkStep, voiceUrl,
  type AdminExhibitor, type Book, type Exhibitor, type LeadRow, type NoteRow,
} from './lib/backend.ts';

const LAB_URL = 'https://claude.ai/artifact/ThNurpj84KQfa4ETqSwUdH';
const OUTCOME: Record<string, string> = { engaged: 'דיברנו', noAnswer: 'לא ענה', closed: 'נסגרה עסקה', notRelevant: 'לא רלוונטי', optOut: 'ביקש להסיר' };
/** For a step that is not a talk, "noAnswer" means only "done, the path goes on". */
const DONE: Record<string, string> = { ...OUTCOME, noAnswer: 'בוצע' };

export interface Ctx {
  exhibitor: Exhibitor; setup: Setup; directory: Person[]; setSetup: (s: Setup) => void; setExhibitor: (e: Exhibitor) => void;
  admin: boolean; go: (view: string) => void;
  /** practice: sample names and nothing is sent; live; after the fair. */
  phase: 'practice' | 'live' | 'after';
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
/** He answered "no WhatsApp": no WhatsApp button anywhere. Not asked yet counts as yes. */
const hasWa = (ctx: Ctx) => !ctx.exhibitor.onboarded || !!ctx.exhibitor.whatsapp;

// ---------- the home page sends him to the leads with something to do there: a new lead, the export, or one lead open

type LeadsIntent = { kind: 'new' } | { kind: 'export' } | { kind: 'open'; id: string } | null;
let leadsIntent: LeadsIntent = null;
function toLeads(ctx: Ctx, intent: LeadsIntent) { leadsIntent = intent; ctx.go('leads'); }

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

export function Snapshot({ setup, todays, notes, waiting, eyebrow, onCrm, onBooth }: { setup: Setup; todays: LocalLead[]; notes: LocalNote[]; waiting: number; eyebrow?: string; onCrm?: () => void; onBooth?: () => void }) {
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
  const asks = [
    nothing > 0 && onBooth && { key: 'tag', text: <>{nothing === 1 ? 'מבקר אחד לא סומן' : <><b>{nothing}</b> לא סומנו</>} בכלל. כדאי עכשיו, כשעוד זוכרים — בערך דקה.</>, act: 'להשלים', primary: true, run: onBooth },
    waiting > 0 && { key: 'wait', text: <><b>{waiting}</b> עוד ממתינים לעלות לשרת. הם יעלו לבד כשתהיה רשת.</> },
  ].filter(Boolean) as { key: string; text: ReactNode; act?: string; primary?: boolean; run?: () => void }[];
  // As the prototype's evening screen: the title counts the day, the tiles split it, then what is worth completing and what waits.
  return (
    <div className="page">
      <PageHead title={todays.length ? `בדוכן: ${todays.length === 1 ? 'מבקר אחד' : `${todays.length} מבקרים`}` : 'תמונת מצב'} eyebrow={eyebrow} sub={longDate()} tip="מה נאסף היום בדוכן, ומה מחכה לך בימים שאחרי. הכל מהטלפון הזה." />
      <Tiles items={[[todays.length, 'נרשמו היום'], [owners, 'בעלי עסק'], [mine.filter((n) => n.body).length, 'הערות'], [mine.filter((n) => !n.body).length, 'הקלטות']]} />
      {asks.length > 0 && (
        <section className="snap-sec">
          <h2>מה כדאי להשלים</h2>
          {asks.map((x) => (
            <div key={x.key} className="ask-card">
              <p>{x.text}</p>
              {x.act && x.run && <button type="button" className={'btn' + (x.primary ? ' primary' : '')} onClick={x.run}>{x.act}</button>}
            </div>
          ))}
        </section>
      )}
      {byNeed.length > 0 && todays.length > 0 && (
        <section className="snap-sec">
          <h2>מה ביקשו</h2>
          <div className="card"><Meters rows={[...byNeed, ...(nothing ? [{ key: '-', label: <span className="muted">בלי סימון</span>, count: nothing }] : [])]} /></div>
        </section>
      )}
      <section className="snap-sec">
        <h2>מה מחכה</h2>
        <div className="ask-card">
          {ahead.length ? (
            <p>בשבוע הקרוב: <b>{myWeek}</b> שיחות ופגישות שלך, ו־<b>{autoWeek}</b> הודעות שיוצאות לבד.{firstDay ? ` הראשונה ${dayLabel(firstDay)}.` : ''}</p>
          ) : <p className="muted">כשתרשום מבקרים, יופיע כאן מה מחכה לך בימים שאחרי.</p>}
          {ahead.length > 0 && onCrm && <button type="button" className="btn" onClick={onCrm}>למעקב ←</button>}
        </div>
      </section>
    </div>
  );
}

// ---------- the follow-up: everything computed by the engine on the phone, from the server's records

interface Item { row: LeadRow; lead: Lead; next: Next; name: string; city: string; owner: boolean; setup: Setup; reply?: string }

function useItems(ctx: Ctx, book: Book | undefined): Item[] {
  return useMemo(() => {
    if (!book) return [];
    return book.leads.map((row) => {
      const owner = ownerOf(row, ctx.directory);
      const lead = engineLead(row, book, owner);
      const setup = setupOf(row, book, ctx.setup);
      const replies = book.replies.filter((r) => r.lead_id === row.id && !r.optout);
      return { row, lead, next: nextTask(setup, lead, today()), name: nameOf(row, ctx.directory), city: cityOf(row, ctx.directory), owner, setup, reply: replies[replies.length - 1]?.body };
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
  if (n.reply) return 'ענה לך · לחזור אליו';
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
  const head = (
    <PageHead title={`${greeting()}, ${ctx.exhibitor.name}`} eyebrow={eyebrowOf(desk)} sub={longDate()} tip="מה מחכה היום, ומי הבא בתור, עם מה שצריך כדי לטפל בו."
      actions={book && <>
        <button type="button" className="btn primary" onClick={() => toLeads(ctx, { kind: 'new' })}><Icon name="plus" size={18} />ליד חדש</button>
        {items.length > 0 && <button type="button" className="btn ghost" onClick={() => toLeads(ctx, { kind: 'export' })}>להוריד לאקסל</button>}
      </>} />
  );
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
      {ctx.exhibitor.wa_blocked_at && <p className="offline-line">החיבור לוואטסאפ שלך נעצר ({ctx.exhibitor.wa_blocked_reason ?? 'בלי סיבה'}), ושום הודעה לא יוצאת ממנו. <button type="button" className="text-btn" onClick={() => ctx.go('settings')}>להגדרות</button></p>}
      <Tiles items={[[now.length, 'להיום'], [late, 'באיחור', late > 0], [week, 'השבוע'], [closed, 'עסקאות שנסגרו']]} onPick={(k) => (k === 'עסקאות שנסגרו' ? ctx.go('leads') : ctx.go('tasks'))} />
      <div className="ov-grid">
        <section>
          <div className="group-head">הבא בתור</div>
          {first ? (
            <TaskCard item={first} held ctx={ctx} notes={book.notes.filter((x) => x.lead_id === first.row.id)} onChange={reload} onUndo={setUndo} onOpen={() => toLeads(ctx, { kind: 'open', id: first.row.id })} />
          ) : (
            <div className="empty">
              <b>אין מה לעשות היום</b>
              <p className="muted">{later.length ? `הבא: ${later[0]!.name}, ${dayLabel(dueOf(later[0]!))}.` : 'כל מבקר שתרשום בדוכן יקבל כאן את הצעד הבא שלו.'}</p>
            </div>
          )}
        </section>
        {desk && (
          <aside className="ov-side">
            <div className="group-head">אחריו בתור</div>
            {after.length ? (
              <div className="rows">
                {after.map((i) => (
                  <button key={i.row.id} type="button" className="row-btn" onClick={() => toLeads(ctx, { kind: 'open', id: i.row.id })}>
                    <b>{i.name}</b>
                    <span className="muted">{short(i.next)} · {dayLabel(dueOf(i))}</span>
                  </button>
                ))}
              </div>
            ) : <p className="faint side-empty">אין עוד אף אחד היום.</p>}
            <button type="button" className="btn ghost side-more" onClick={() => ctx.go('tasks')}>לכל המשימות ←</button>
          </aside>
        )}
      </div>
    </div>
  );
}

// ---------- "מה עוד אפשר להוציא" (model, section 12): no report of success, only what is still in the fair.
// Each line is a group of leads with a reason and what can be done; the names open under it.

/** The next holiday from today, for "worth reminding before ...". */
function nextHoliday(): { name: string; on: string } {
  const all = (Object.keys(text.HOLIDAY) as Holiday[]).map((h) => ({ name: text.HOLIDAY[h]!, on: nextOccurrence({ holiday: h }, today()) }));
  return all.sort((a, b) => a.on.localeCompare(b.on))[0]!;
}

function Harvest({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const t = today();
  const lastTouch = (i: Item) => i.lead.history.reduce((d, h) => (h.doneOn > d ? h.doneOn : d), i.lead.capturedOn);
  const ended = (r: string) => items.filter((i) => i.next.kind === 'end' && i.next.reason === r);
  const holiday = nextHoliday();
  const groups: { key: string; label: string; hint: string; of: Item[] }[] = [
    { key: 'untouched', label: 'שעוד לא יצרת איתם קשר', hint: 'נרשמו אצלך, ועוד לא סומן מולם אף צעד. הם מחכים במשימות.',
      of: items.filter((i) => i.next.kind !== 'end' && !i.lead.history.length && i.lead.capturedOn < t) },
    { key: 'stuck', label: 'שמחכים לך יותר משבוע', hint: 'הצעד שלהם עבר את הזמן, ומאז לא קרה כלום. ככל שעובר זמן, הם זוכרים פחות את הדוכן.',
      of: items.filter((i) => i.next.kind === 'task' && i.next.late && lastTouch(i) <= addDays(t, -7)) },
    { key: 'date', label: 'שהתאריך שלהם בחודשיים הקרובים', hint: 'החתונה או האירוע שלהם מתקרבים. זה הזמן שבו הם מחליטים.',
      of: items.filter((i) => i.next.kind !== 'end' && i.row.customer_date && i.row.customer_date >= t && i.row.customer_date <= addDays(t, 60)) },
    { key: 'engaged', label: 'שדיברת איתם, ועוד לא נסגרה עסקה', hint: 'הם כבר מכירים אותך. שיחה קצרה לבדוק איפה הם עומדים, או לסמן עסקה אם נסגרה.', of: ended('engaged') },
    { key: 'stop', label: 'שלא ענו, והמעקב אחריהם נגמר', hint: 'לא הגיע מהם מענה בזמן. בעונה הבאה שלהם אפשר לנסות שוב.', of: ended('stop') },
    { key: 'list', label: 'ברשימת התפוצה', hint: `כדאי להזכיר להם לפני ${holiday.name} (${dayLabel(holiday.on)}): הודעה כללית אחת, בלי לחץ.`, of: ended('list') },
  ].filter((g) => g.of.length);
  return (
    <section>
      <div className="group-head">מה עוד אפשר להוציא</div>
      {groups.length ? (
        <ul className="list">
          {groups.map((g) => (
            <li key={g.key} className="list-row harvest">
              <button type="button" className="harvest-head" aria-expanded={open === g.key} onClick={() => setOpen(open === g.key ? null : g.key)}>
                <span className="harvest-n">{g.of.length}</span>
                <span><span className="row-name">{g.label}</span><span className="row-step">{g.hint}</span></span>
              </button>
              {open === g.key && <p className="harvest-names">{g.of.slice(0, 40).map((i) => i.name).join(' · ')}{g.of.length > 40 ? ` ועוד ${g.of.length - 40}` : ''}</p>}
            </li>
          ))}
        </ul>
      ) : <div className="empty"><p className="muted">כרגע אין. אחרי התערוכה יופיעו כאן מי שעוד לא דיברת איתם, מי שהתאריך שלו מתקרב, ומי שכדאי להזכיר לו לפני החג.</p></div>}
    </section>
  );
}

// ---------- משימות: everything to do, by date

export function Tasks({ ctx, desk }: { ctx: Ctx; desk: boolean }) {
  const [book, reload, error] = useData(loadBook);
  const items = useItems(ctx, book);
  const [undo, setUndo] = useState<Undo | null>(null);
  const clearUndo = useCallback(() => setUndo(null), []);
  const [tab, setTab] = useState<'today' | 'week' | 'all'>('today');
  const [q, setQ] = useState('');
  const [out, setOut] = useState<string | null>(null);
  const head = <PageHead title="משימות" eyebrow={eyebrowOf(desk)} tip="כל מה שעליך לעשות, לפי התאריך. הטלפון בסוף השורה פותח את הפעולות; נגיעה בשם פותחת את הדף שלו. אחרי כל פעולה אפשר לבטל אותה בתוך 10 שניות." />;
  if (error) return <div className="page">{head}<p className="err">{error}</p></div>;
  if (!book) return <div className="page">{head}<p className="muted">טוען…</p></div>;
  const { open } = split(items);
  const t = today();
  const counts = { today: open.filter((i) => dueOf(i) <= t).length, week: open.filter((i) => dueOf(i) <= inDays(7)).length, all: open.length };
  const shown = open
    .filter((i) => (tab === 'today' ? dueOf(i) <= t : tab === 'week' ? dueOf(i) <= inDays(7) : true))
    .filter((i) => !q.trim() || i.name.includes(q.trim()) || i.city.includes(q.trim()) || (i.row.note ?? '').includes(q.trim()));
  // A group heading carries the date, so the rows under it do not have to.
  const groups: { key: string; label: string; late?: boolean; of: Item[] }[] = [];
  const isLate = (i: Item) => dueOf(i) < t || (i.next.kind === 'task' && i.next.late);
  const late = shown.filter(isLate);
  if (late.length) groups.push({ key: 'late', label: 'באיחור', late: true, of: late });
  const onTime = shown.filter((i) => !isLate(i));
  for (const d of [...new Set(onTime.map(dueOf))]) groups.push({ key: d, label: d === t ? 'היום' : dayLabel(d), of: onTime.filter((i) => dueOf(i) === d) });
  return (
    <div className="page">
      <UndoBar undo={undo} onDone={clearUndo} />
      {head}
      <div className="tasks-bar">
        <nav className="tabs" aria-label="סינון">
          {([['today', 'היום'], ['week', 'השבוע'], ['all', 'הכל']] as const).map(([k, l]) => (
            <button key={k} type="button" className="tab" aria-pressed={tab === k} onClick={() => setTab(k)}>{l} <span className="n">{counts[k]}</span></button>
          ))}
        </nav>
      </div>
      {open.length > 6 && <input className="input" type="search" aria-label="חיפוש במשימות" placeholder="חיפוש: שם, עיר, הערה…" value={q} onChange={(e) => setQ(e.target.value)} />}
      {groups.length ? groups.map((g) => (
        <section key={g.key} className="group">
          <div className={'group-head' + (g.late ? ' late' : '')}><span>{g.label}</span><span className="c">{g.of.length}</span></div>
          <div className="rows">
            {g.of.map((i) => (
              <div key={i.row.id} className={'row-wrap' + (out === i.row.id ? ' open' : '')}>
                <button type="button" className="lrow" onClick={() => toLeads(ctx, { kind: 'open', id: i.row.id })}>
                  <span><span className="nm">{i.name}</span> <span className="muted">{i.city}</span></span>
                  <span className="due"><b>{short(i.next)}</b>{i.next.kind === 'task' && i.next.late && <span className="late-w"> · באיחור</span>}</span>
                  <span className="why">{i.row.taps.join(' · ') || 'בלי סימון'}</span>
                  {i.row.note && <span className="note-peek">{i.row.note.slice(0, 90)}</span>}
                </button>
                <button type="button" className="row-call" aria-label={`הפעולות: ${i.name}`} aria-expanded={out === i.row.id} onClick={() => setOut(out === i.row.id ? null : i.row.id)}><Icon name="phone" /></button>
                {out === i.row.id && (
                  <div className="row-out">
                    <TaskCard item={i} held={false} bare ctx={ctx} notes={book.notes.filter((x) => x.lead_id === i.row.id)} onChange={() => { setOut(null); reload(); }} onUndo={setUndo} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )) : (
        <div className="empty"><b>{tab === 'today' ? 'אין מה לעשות היום' : 'אין משימות'}</b><p className="muted">{open.length ? 'אפשר לראות את מה שבהמשך ב"הכל".' : 'כל מבקר שתרשום בדוכן יקבל כאן את הצעד הבא שלו.'}</p></div>
      )}
      <Soon title="הודעת בוקר">כל בוקר תגיע אליך בוואטסאפ רשימת המשימות של היום, עם קישור ישר לכאן.</Soon>
    </div>
  );
}

function TaskCard({ item, held, ctx, notes, onChange, onUndo, onOpen, bare }: { item: Item; held: boolean; ctx: Ctx; notes: NoteRow[]; onChange: () => void; onUndo: (u: Undo) => void;
  /** "כל הפרטים ←": the lead's own page. */ onOpen?: () => void;
  /** Inside the lead's page: no frame and no name, the page has both. */ bare?: boolean }) {
  const { row, next, name, owner } = item;
  const [busy, setBusy] = useState(false);
  const [talk, setTalk] = useState(false);
  const [more, setMore] = useState(false);
  const [dests, setDests] = useState<Destination[] | null>(null);
  useEffect(() => { leadDestinations(row.id).then(setDests).catch(() => setDests(null)); }, [row.id]);
  const ownPhone = dests?.find((d) => d.own && d.kind === 'phone')?.value ?? null;
  if (next.kind === 'end') return null;
  const stepId = next.stepId;
  const args = [ctx.exhibitor.id, item.setup, owner, today()] as const;

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
  const what = next.kind === 'askDate' ? 'לברר מתי התאריך שלו' : next.reply ? 'ענה לך בוואטסאפ — לחזור אליו' : `${ACT[next.action] ?? next.action}${next.message ? ` · ${next.message}` : ''}`;
  const tall = held ? ' tall' : '';

  return (
    <Frame bare={bare} className={held ? 'held next-card' : 'task'}>
      {!bare && <div className="nc-who"><h2>{name}</h2> <span className="muted">{[item.city, owner ? 'בעל עסק' : '', row.taps.join(' · ')].filter(Boolean).join(' · ')}</span></div>}
      <div className="nc-now">
        <span className="faint">{next.dueOn <= today() ? 'עכשיו' : dayLabel(next.dueOn)}</span> <b>{what}</b>{late && <span className="late-w"> באיחור</span>}
        {isAuto && (ctx.phase === 'practice' ? <div className="faint small">בתרגול לא יוצא כלום. במצב אמיתי היא תצא לבד.</div> : <AutoLine blocked={!!ctx.exhibitor.wa_blocked_at} />)}
      </div>
      {next.kind === 'task' && next.reply && item.reply && <div className="note-peek reply-peek"><b>הוא כתב:</b> {item.reply}</div>}
      {!bare && (row.note || notes.length > 0) && <Notes note={row.note} notes={notes} />}
      {next.kind === 'task' && next.message && !talk
        ? <SendRow ctx={ctx} leadId={row.id} name={name} messageId={next.message} dests={dests} />
        : ownPhone && ctx.phase !== 'practice' && (
          <div className="row">
            <a className="btn" href={`tel:${ownPhone}`}><Icon name="phone" />{showDestination(ownPhone)}</a>
            <a className="btn" href={`https://wa.me/${waNumber(ownPhone)}`} target="_blank" rel="noreferrer">וואטסאפ</a>
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
      {onOpen && !talk && <div className="nc-foot"><button type="button" className="btn ghost" onClick={onOpen}>כל הפרטים ←</button></div>}
    </Frame>
  );
}
/** An automatic step: with his WhatsApp linked it goes out by itself (at a person's pace and hours); otherwise by hand. */
function AutoLine({ blocked }: { blocked: boolean }) {
  const [linked, setLinked] = useState<boolean | null>(null);
  useEffect(() => { waOpen().then(setLinked); }, []);
  if (linked === null) return null;
  if (blocked) return <div className="faint small">החיבור לוואטסאפ נעצר, אז הוא לא יוצא לבד. אפשר לשלוח ביד.</div>;
  if (!linked) return <div className="faint small">אמור לצאת לבד כשהוואטסאפ שלך מחובר (הגדרות › חיבורים). בינתיים אפשר לשלוח ביד.</div>;
  return <div className="faint small">יוצא לבד מהוואטסאפ שלך היום, בקצב של אדם ובשעות 9–20 (תקרה יומית למי שעוד לא ענה).</div>;
}

/** A task card is an item of a list, a card of its own, or (inside the lead's page) only its contents. */
function Frame({ bare, className, children }: { bare?: boolean; className: string; children: ReactNode }) {
  if (bare) return <div className="rec-now">{children}</div>;
  return <div className={className}>{children}</div>;
}

/** A step that carries a message: the text, filled for this visitor, goes out with one tap in WhatsApp or mail.
 *  A text with a hole left in it does not go out; it sends him to fill it first. */
export function SendRow({ ctx, leadId, name, messageId, dests, onSent }: { ctx: Ctx; leadId: string; name: string; messageId: string; dests: Destination[] | null; onSent?: () => void }) {
  const texts = useTexts();
  const me = useMe(ctx);
  const [shown, setShown] = useState(false);
  const body = fill(textOf(ctx.setup, texts, messageId), me, name);
  const missing = holes(body);
  const sent = (channel: 'whatsapp' | 'email') => { recordSent(ctx.exhibitor.id, leadId, channel, messageId, body).then(onSent).catch(() => {}); };
  const [linked, setLinked] = useState(false);
  const [queued, setQueued] = useState<'no' | 'busy' | 'yes' | 'err' | 'none'>('no');
  // Where it goes: every destination that receives (his own, his wife's, the office), not one that asked to be removed.
  const live = (dests ?? []).filter((d) => d.receives && !d.removed);
  const waTo = live.filter((d) => d.kind === 'phone' && d.wa !== false);
  const mailTo = live.filter((d) => d.kind === 'email');
  const ownPhone = dests?.find((d) => d.own && d.kind === 'phone');
  const optedOut = !!dests?.some((d) => d.own && d.removed);
  const who = (d: Destination, all: Destination[]) => (all.length < 2 ? '' : ` · ${d.own ? 'אליו' : d.label || showDestination(d.value)}`);
  useEffect(() => { if (!ctx.exhibitor.wa_blocked_at) waOpen().then(setLinked); }, [ctx.exhibitor.wa_blocked_at]);
  useEffect(() => { queuedFor(leadId).then((q) => { if (q.some((x) => x.status === 'queued')) setQueued('yes'); }).catch(() => {}); }, [leadId]);
  async function viaServer() {
    setQueued('busy');
    try { const n = await queueSend(leadId, messageId, body); setQueued(n ? 'yes' : 'none'); if (n) onSent?.(); } catch { setQueued('err'); }
  }
  return (
    <div className="stack">
      <button type="button" className="text-btn" style={{ alignSelf: 'start' }} aria-expanded={shown} onClick={() => setShown(!shown)}>{shown ? 'להסתיר את ההודעה' : 'לראות את ההודעה'}</button>
      {shown && <div className="note preview">{body}</div>}
      {ctx.phase === 'practice' ? (
        <p className="note">בתרגול לא נשלחת שום הודעה. כך היא תיראה כשהמערכת תהיה במצב אמיתי.</p>
      ) : optedOut ? (
        <p className="note">הוא ביקש לא לקבל הודעות. אפשר להתקשר, אם סיכמתם.</p>
      ) : missing.length ? (
        <p className="note">בהודעה עוד חסר: <b>{missing.join(' · ')}</b>. <button type="button" className="text-btn" onClick={() => ctx.go('messages')}>להשלים בהודעות</button></p>
      ) : (
        <div className="row">
          {queued === 'yes' && <span className="note">בתור. יוצא מהוואטסאפ שלך בקרוב, בקצב של אדם ובשעות 9–20.</span>}
          {queued === 'err' && <span className="err">לא נכנס לתור. אפשר לשלוח בנגיעה.</span>}
          {queued === 'none' && <span className="err">אין לו מספר עם וואטסאפ שמקבל הודעות. אפשר במייל, או להוסיף מספר בדף שלו.</span>}
          {waTo.length > 0 && linked && queued !== 'yes' && <button type="button" className="btn primary" disabled={queued === 'busy'} onClick={viaServer}>לשלוח מהוואטסאפ שלי{waTo.length > 1 ? ` · ל-${waTo.length}` : ''}</button>}
          {hasWa(ctx) && !linked && waTo.map((d) => <a key={d.value} className="btn" href={`https://wa.me/${waNumber(d.value)}?text=${encodeURIComponent(body)}`} target="_blank" rel="noreferrer" onClick={() => sent('whatsapp')}>{waTo.length > 1 ? 'וואטסאפ' : 'וואטסאפ עם ההודעה'}{who(d, waTo)}</a>)}
          {mailTo.map((d) => <a key={d.value} className="btn" href={`mailto:${d.value}?subject=${encodeURIComponent(me.sensitive ? me.name : me.business || me.name)}&body=${encodeURIComponent(body)}`} onClick={() => sent('email')}><Icon name="mail" />מייל{who(d, mailTo)}</a>)}
          {ownPhone && <a className="btn" href={`tel:${ownPhone.value}`}><Icon name="phone" />{showDestination(ownPhone.value)}</a>}
          {dests && !dests.length && <span className="muted">אין לו טלפון או מייל ברשימה.</span>}
        </div>
      )}
    </div>
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
    const s = pathAhead(item.setup, after);
    const fits = !!s && s.who === 'me' && NEXT_ACTIONS.includes(s.action);
    const action: Action = fits ? s.action : 'talk';
    const days = s && s.timing.kind === 'after' && s.timing.days > 0 ? s.timing.days : 7;
    return { action, days: fits ? days : 7, fromPath: fits };
  }, [item.setup, lead, stepId]);
  const [action, setAction] = useState<Action>(suggested.action);
  const [due, setDue] = useState(inDays(suggested.days));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const args = [ctx.exhibitor.id, item.setup, owner, today()] as const;

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
      {note && <li className="note-peek">{note}</li>}
      {notes.map((n) => (n.audio_path ? <Voice key={n.id} path={n.audio_path} when={n.created_at} /> : <li key={n.id} className="note-peek">{n.body}</li>))}
    </ul>
  );
}
function Voice({ path, when }: { path: string; when: string }) {
  const [url, setUrl] = useState<string | null>(null);
  return (
    <li className="note-peek voice">
      <span>הקלטה · {dayLabel(when.slice(0, 10))}</span>
      {url ? <audio controls autoPlay src={url} /> : <button type="button" className="text-btn" onClick={() => voiceUrl(path).then(setUrl)}>להשמיע</button>}
    </li>
  );
}

// ---------- לידים: everyone, with where he stands and what happened

export function Leads({ ctx, desk }: { ctx: Ctx; desk: boolean }) {
  const [book, reload, error] = useData(loadBook);
  const items = useItems(ctx, book);
  // What the home page sent him here to do, taken once.
  const [intent] = useState(() => { const x = leadsIntent; leadsIntent = null; return x; });
  const [open, setOpen] = useState<string | null>(intent?.kind === 'open' ? intent.id : null);
  const [q, setQ] = useState('');
  const [state, setState] = useState('all');
  const [need, setNeed] = useState('');
  const [city, setCity] = useState('');
  const [adding, setAdding] = useState(intent?.kind === 'new');
  const [exporting, setExporting] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);
  const clearUndo = useCallback(() => setUndo(null), []);
  const doExport = useCallback(async () => { setExporting(true); await exportLeads(items, ctx).catch(() => {}); setExporting(false); }, [items, ctx]);
  const [exported, setExported] = useState(false);
  useEffect(() => { if (intent?.kind === 'export' && book && items.length && !exported) { setExported(true); doExport(); } }, [intent, book, items, exported, doExport]);
  useEffect(() => { window.scrollTo(0, 0); }, [open]);

  const item = open ? items.find((i) => i.row.id === open) : undefined;
  if (book && item) {
    return (
      <div className="page">
        <UndoBar undo={undo} onDone={clearUndo} />
        <LeadPage item={item} ctx={ctx} book={book} onBack={() => setOpen(null)} onChange={reload} onUndo={setUndo} />
      </div>
    );
  }

  const head = (
    <PageHead title="לידים" eyebrow={eyebrowOf(desk)} sub={book ? `${items.length} מבקרים` : undefined}
      tip="כל מי שנרשם, עם מה שקרה עד עכשיו ומה הצעד הבא. נגיעה בשם פותחת את הדף שלו."
      actions={book && <>
        <button type="button" className="btn" onClick={() => setAdding(!adding)}><Icon name="plus" size={18} />ליד</button>
        {items.length > 0 && <button type="button" className="btn ghost" disabled={exporting} onClick={doExport}>{exporting ? 'מכין…' : 'להוריד לאקסל'}</button>}
      </>} />
  );
  if (error) return <div className="page">{head}<p className="err">{error}</p></div>;
  if (!book) return <div className="page">{head}<p className="muted">טוען…</p></div>;
  const states = STATES.map(([key, label, test]) => ({ key, label, count: items.filter(test).length })).filter((x) => x.key === 'all' || x.count);
  const needs = ctx.setup.needs.map((n) => n.label).filter((l) => items.some((i) => i.row.taps.includes(l)));
  const cities = [...new Set(items.map((i) => i.city).filter(Boolean))].sort();
  const test = STATES.find(([k]) => k === state)?.[2] ?? (() => true);
  const shown = items
    .filter(test)
    .filter((i) => !need || i.row.taps.includes(need))
    .filter((i) => !city || i.city === city)
    .filter((i) => !q.trim() || i.name.includes(q.trim()) || i.city.includes(q.trim()));
  const stateOf = (i: Item) => STATES.slice(1).find(([, , t]) => t(i))?.[1] ?? '';
  return (
    <div className="page">
      <UndoBar undo={undo} onDone={clearUndo} />
      {head}
      {adding && <NewLead ctx={ctx} onClose={() => setAdding(false)} onSaved={(id, n) => { setAdding(false); reload(); setUndo({ label: `${n} נוסף ללידים`, run: async () => { await removeLead(id, ctx.exhibitor.id).catch(() => {}); reload(); } }); }} />}
      {!items.length ? (
        <div className="empty"><b>עוד אין לידים</b><p className="muted">הם יופיעו כאן מהרגע שתיגע בשמם בדוכן.</p></div>
      ) : (
        <>
          <div className="tb-bar">
            <input className="input tb-q" type="search" aria-label="חיפוש בטבלה" placeholder="חיפוש בטבלה" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="chips" role="group" aria-label="סינון לפי מצב">
              {states.map((x) => <button key={x.key} type="button" className="chip" aria-pressed={state === x.key} onClick={() => setState(x.key)}>{x.label} · {x.count}</button>)}
            </span>
          </div>
          {(needs.length > 1 || cities.length > 1) && (
            <details className="more-filters">
              <summary>עוד: סינון</summary>
              <div className="tb-bar">
                {needs.length > 1 && (
                  <label className="tb-filter"><span>מה ביקש</span>
                    <select value={need} onChange={(e) => setNeed(e.target.value)}><option value="">הכל</option>{needs.map((l) => <option key={l} value={l}>{l}</option>)}</select>
                  </label>
                )}
                {cities.length > 1 && (
                  <label className="tb-filter"><span>עיר</span>
                    <select value={city} onChange={(e) => setCity(e.target.value)}><option value="">הכל</option>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                  </label>
                )}
              </div>
            </details>
          )}
          <div className="tb-state"><b>{shown.length} לידים</b></div>
          {shown.length ? (
            <div className="tb-wrap">
              <table className="tb">
                <thead><tr><th>שם</th><th>מה ביקש</th><th>מה הלאה</th><th>מתי</th><th>מצב</th></tr></thead>
                <tbody>
                  {shown.map((i) => (
                    <tr key={i.row.id} onClick={() => setOpen(i.row.id)}>
                      <td className="stick"><button type="button" className="link" onClick={(e) => { e.stopPropagation(); setOpen(i.row.id); }}><b>{i.name}</b></button> <span className="faint">{i.city}</span></td>
                      <td>{i.row.taps.join(' · ') || '—'}</td>
                      <td>{short(i.next) || '—'}</td>
                      <td className={'tnum' + (i.next.kind === 'task' && i.next.late ? ' late-c' : '')}>{i.next.kind === 'end' ? '—' : i.next.dueOn.split('-').slice(1).reverse().map(Number).join('/')}</td>
                      <td>{stateOf(i)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">אין לידים שמתאימים לסינון.</p>}
        </>
      )}
      <Soon title="תשובות מהלקוח">תשובות שהגיעו בוואטסאפ יופיעו בציר הזמן של כל אחד, כשהחיבור לוואטסאפ יעבוד.</Soon>
    </div>
  );
}

/** The states a lead can be in, as the filter shows them. */
const STATES: [string, string, (i: Item) => boolean][] = [
  ['all', 'הכל', () => true],
  ['now', 'להיום', (i) => i.next.kind !== 'end' && i.next.dueOn <= today()],
  ['later', 'בהמשך', (i) => i.next.kind !== 'end' && i.next.dueOn > today()],
  ['engaged', 'בטיפול שלך', (i) => i.next.kind === 'end' && i.next.reason === 'engaged'],
  ['closed', 'נסגרה עסקה', (i) => i.next.kind === 'end' && i.next.reason === 'closed'],
  ['list', 'ברשימת התפוצה', (i) => i.next.kind === 'end' && i.next.reason === 'list'],
  ['ended', 'הסתיים', (i) => i.next.kind === 'end' && ['stop', 'notRelevant', 'optOut'].includes(i.next.reason)],
];

/** Excel opens a CSV with a BOM in Hebrew; one row per lead, with what he needs to call and what was tapped. */
async function exportLeads(items: Item[], ctx: Ctx) {
  const contacts = await allContacts().catch(() => new Map<string, { phone: string | null; email: string | null }>());
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [
    ['שם', 'עיר', 'טלפון', 'מייל', 'בעל עסק', 'נרשם', 'מה ביקש', 'התאריך שלו', 'הערה', 'הצעד הבא', 'מתי'],
    ...items.map((i) => {
      const c = contacts.get(i.row.id);
      return [
        i.name, i.city, c?.phone ?? '', c?.email ?? '', i.owner ? 'כן' : '', i.row.captured_on.split('-').reverse().join('/'),
        i.row.taps.join(' · '), i.row.customer_date?.split('-').reverse().join('/') ?? '', i.row.note ?? '',
        short(i.next), i.next.kind === 'end' ? '' : i.next.dueOn.split('-').reverse().join('/'),
      ];
    }),
  ];
  const csv = '\ufeff' + rows.map((r) => r.map((v) => cell(String(v))).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `לידים - ${ctx.exhibitor.business || ctx.exhibitor.name} - ${today()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** A lead that did not come through the booth: someone who called after the fair, a card left at the stand. */
function NewLead({ ctx, onClose, onSaved }: { ctx: Ctx; onClose: () => void; onSaved: (id: string, name: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [taps, setTaps] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toggle = (l: string) => setTaps(taps.includes(l) ? taps.filter((t) => t !== l) : [...taps, l]);
  async function save() {
    setBusy(true); setErr('');
    const id = crypto.randomUUID();
    const r = await saveLead({
      id, capturedOn: today(), capturedAt: new Date().toISOString(), taps, businessOwner: false, history: [],
      name: name.trim(), typedPhone: phone.trim() || undefined, note: note.trim(), synced: false,
    }, ctx.exhibitor.id, ctx.setup).catch(() => 'waiting' as const);
    setBusy(false);
    if (r === 'saved') onSaved(id, name.trim()); else setErr('נשמר בטלפון, ויעלה כשתהיה רשת.');
  }
  return (
    <section className="held" aria-label="ליד חדש">
      <div className="card-top">
        <div className="who"><b>ליד חדש</b><span className="ctx">מי שלא נרשם בדוכן</span></div>
        <button type="button" className="sq" aria-label="סגירה" onClick={onClose}><Icon name="close" /></button>
      </div>
      <div className="typed">
        <label className="field" htmlFor="nl-name">שם<input id="nl-name" className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field" htmlFor="nl-phone">טלפון<input id="nl-phone" className="input" inputMode="tel" dir="ltr" style={{ textAlign: 'right' }} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      </div>
      {ctx.setup.needs.length > 0 && (
        <div className="q-block">
          <span className="sec">מה הוא צריך</span>
          <div className="chips">{ctx.setup.needs.map((n) => <button key={n.label} type="button" className="chip" aria-pressed={taps.includes(n.label)} onClick={() => toggle(n.label)}>{n.label}</button>)}</div>
        </div>
      )}
      <label className="field" htmlFor="nl-note">הערה<textarea id="nl-note" className="area" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      {err && <p className="note">{err}</p>}
      <div className="row">
        <button type="button" className="btn primary" disabled={busy || !name.trim()} onClick={save}>שמירה</button>
        <button type="button" className="btn" onClick={onClose}>ביטול</button>
      </div>
    </section>
  );
}

function LeadPage({ item, ctx, book, onBack, onChange, onUndo }: { item: Item; ctx: Ctx; book: Book; onBack: () => void; onChange: () => void; onUndo: (u: Undo) => void }) {
  const { row, next, name, city, owner } = item;
  const [talk, setTalk] = useState(false);
  const [noting, setNoting] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [contact, setContact] = useState<{ phone: string | null; email: string | null } | null>(null);
  useEffect(() => { leadContact(row.id).then(setContact).catch(() => setContact(null)); }, [row.id]);
  const steps = book.steps.filter((s) => s.lead_id === row.id);
  const manual = book.manual.filter((m) => m.lead_id === row.id);
  const notes = book.notes.filter((n) => n.lead_id === row.id);
  const stepId = next.kind === 'end' ? null : next.stepId;
  const finished = next.kind === 'end' && next.reason !== 'engaged' && next.reason !== 'list' && next.reason !== 'stop';
  const lastTouch = steps.reduce((d, x) => (x.done_on > d ? x.done_on : d), '');
  const stateWord = STATES.slice(1).find(([, , t]) => t(item))?.[1] ?? '';
  const ddmm = (d: string) => d.split('-').reverse().join('.');
  async function saveNote() {
    if (!noteText.trim()) return;
    await addFollowNote(row.id, noteText.trim(), ctx.exhibitor.id).catch(() => {});
    setNoteText(''); setNoting(false); onChange();
  }
  return (
    <div className="rec">
      <div className="rec-top">
        <div className="rec-bar"><button type="button" className="btn ghost" onClick={onBack}>→ חזרה ללידים</button></div>
        <div className="rec-title"><h1>{name}</h1><div className="muted">{[city, owner ? 'בעל עסק' : '', row.taps.join(' · ')].filter(Boolean).join(' · ')}</div></div>
        <div className="rec-keys">
          <span className="key"><span className="faint">מצב</span><b>{stateWord || '—'}</b></span>
          <span className="key"><span className="faint">נרשם</span><b>{dayLabel(row.captured_on)}</b></span>
          {row.customer_date && <span className="key"><span className="faint">התאריך שלו</span><b>{ddmm(row.customer_date)}</b></span>}
          <span className="key"><span className="faint">קשר אחרון</span><b>{lastTouch ? dayLabel(lastTouch) : 'עוד לא היה קשר'}</b></span>
        </div>
        {next.kind !== 'end' ? (
          <TaskCard item={item} held={false} bare ctx={ctx} notes={notes} onChange={onChange} onUndo={onUndo} />
        ) : (
          <div className="rec-now">
            <div className="nc-now"><span className="faint">עכשיו</span> <b>{END[next.reason] ?? ''}</b></div>
            {!finished && (talk
              ? <TalkSheet item={item} ctx={ctx} stepId={stepId} onClose={() => setTalk(false)} onChange={onChange} onUndo={onUndo} />
              : <div className="actions"><button type="button" className="btn" onClick={() => setTalk(true)}>דיברנו — מה הלאה</button></div>)}
          </div>
        )}
        <div className="actions rec-acts">
          <button type="button" className="btn" aria-expanded={noting} onClick={() => setNoting(!noting)}><Icon name="pen" size={18} />הערה</button>
          {next.kind === 'end' && contact?.phone && <a className="btn" href={`tel:${contact.phone}`}><Icon name="phone" size={18} />{contact.phone}</a>}
          {next.kind === 'end' && contact?.phone && hasWa(ctx) && <a className="btn" href={`https://wa.me/${waNumber(contact.phone)}`} target="_blank" rel="noreferrer">וואטסאפ</a>}
        </div>
        {noting && (
          <div className="note-box">
            <textarea className="area" rows={3} autoFocus aria-label="הערה" placeholder="מה חשוב לזכור עליו" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            <div className="row"><button type="button" className="btn primary" disabled={!noteText.trim()} onClick={saveNote}>שמירת ההערה</button><button type="button" className="btn ghost" onClick={() => setNoting(false)}>בלי</button></div>
          </div>
        )}
      </div>

      <div className="rec-grid">
        <div className="rec-main">
          <section className="card">
            <h2>הערות {(row.note ? 1 : 0) + notes.length > 0 && <span className="faint">({(row.note ? 1 : 0) + notes.length})</span>}</h2>
            {row.note || notes.length ? <Notes note={row.note} notes={notes} /> : <p className="muted small">עוד אין הערות.</p>}
          </section>
          <section className="card">
            <h2>מה היה עד עכשיו</h2>
            <ul className="log timeline">
              <li><span className="when">{dayLabel(row.captured_on)}</span>ביקר בדוכן</li>
              {book.replies.filter((r) => r.lead_id === row.id).map((r) => <li key={r.at} className="tl-reply"><span className="when">{dayLabel(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(r.at)))}</span>{r.optout ? 'ביקש להסיר (בוואטסאפ)' : <>ענה בוואטסאפ: <b>{r.body}</b></>}</li>)}
              {steps.map((x) => <li key={x.step_id}><span className="when">{dayLabel(x.done_on)}</span>{(x.step_id.startsWith('m:') || x.step_id.startsWith('talk:') ? OUTCOME : DONE)[x.outcome] ?? x.outcome}</li>)}
              {manual.filter((m) => !steps.some((x) => x.step_id === `m:${m.id}`)).map((m) => <li key={m.id}><span className="when">{dayLabel(m.due_on)}</span>נקבע: {ACT[m.action]}</li>)}
            </ul>
          </section>
        </div>
        <section className="card rec-fields">
          <h2>פרטים</h2>
          <Destinations ctx={ctx} leadId={row.id} onChange={onChange} />
          <div className="field-row"><span className="faint">מה סימנו</span><span>{row.taps.join(' · ') || '—'}</span></div>
          <div className="field-row"><span className="faint">ביקר בדוכן</span><span>{dayLabel(row.captured_on)}</span></div>
          {row.customer_date && <div className="field-row"><span className="faint">התאריך שלו</span><span>{ddmm(row.customer_date)}</span></div>}
        </section>
      </div>
    </div>
  );
}

/**
 * Where he receives (יצחק, 29/10): his own phone and mail, and numbers or mails added (his wife's, the office). Every
 * one that is on gets every message; a reply or "הסר" from any of them counts as his. Which message to which was left
 * out on purpose: "זה יסבך את המשתמש".
 */
function Destinations({ ctx, leadId, onChange }: { ctx: Ctx; leadId: string; onChange: () => void }) {
  const [list, setList] = useState<Destination[] | null>(null);
  const [typed, setTyped] = useState('');
  const [whose, setWhose] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(() => { leadDestinations(leadId).then(setList).catch(() => setList([])); }, [leadId]);
  useEffect(load, [load]);
  async function flip(d: Destination) {
    setList((l) => l?.map((x) => (x === d ? { ...x, receives: !d.receives } : x)) ?? l);
    await setReceives(leadId, d, !d.receives).catch(load);
    onChange();
  }
  async function add() {
    const d = destinationOf(typed);
    if (!d) { setErr('זה לא נראה כמו טלפון או מייל'); return; }
    if (list?.some((x) => x.kind === d.kind && x.value === d.value)) { setErr('כבר ברשימה'); return; }
    try {
      await addDestination(ctx.exhibitor.id, leadId, d, whose);
      setTyped(''); setWhose(''); setErr(''); load(); onChange();
      if (d.kind === 'phone' && ctx.phase === 'live') waCheck(leadId).then(load).catch(() => {});
    } catch { setErr('לא נשמר. אפשר לנסות שוב.'); }
  }
  async function drop(d: Destination) { await removeDestination(d.id!).catch(() => {}); load(); onChange(); }
  const title = (d: Destination) => (d.own ? (d.kind === 'phone' ? 'טלפון' : 'מייל') : d.label || (d.kind === 'phone' ? 'טלפון נוסף' : 'מייל נוסף'));
  const state = (d: Destination) => (d.removed ? 'ביקש להסיר' : d.kind !== 'phone' ? '' : d.wa === true ? 'וואטסאפ' : d.wa === false ? 'אין וואטסאפ' : '');
  return (
    <div className="dests">
      {list === null ? <p className="muted small">טוען…</p> : !list.length ? (
        <div className="field-row"><span className="faint">טלפון ומייל</span><span>—</span></div>
      ) : list.map((d) => (
        <div className="dest" key={d.id ?? d.kind}>
          <div className="field-row">
            <span className="faint">{title(d)}</span>
            <span><span dir="ltr">{showDestination(d.value)}</span>{state(d) && <span className="faint small"> · {state(d)}</span>}</span>
          </div>
          <span className="dest-acts">
            <button type="button" className="switch" role="switch" aria-checked={d.receives && !d.removed} aria-label={`${title(d)}: מקבל הודעות`} disabled={d.removed} onClick={() => flip(d)} />
            {!d.own && <button type="button" className="text-btn" onClick={() => drop(d)}>להסיר</button>}
          </span>
        </div>
      ))}
      {!!list?.length && <p className="faint small">מי שהמתג שלו דלוק מקבל את כל ההודעות. תשובה או "הסר" מכל אחד מהם נחשבים שלו.</p>}
      <form className="dest-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input className="input" dir="auto" aria-label="טלפון או מייל נוסף" placeholder="טלפון או מייל נוסף" value={typed} onChange={(e) => { setTyped(e.target.value); setErr(''); }} />
        <input className="input" aria-label="של מי (לא חובה)" placeholder="של מי? (לא חובה)" value={whose} onChange={(e) => setWhose(e.target.value)} />
        <button type="submit" className="btn" disabled={!typed.trim()}>להוסיף</button>
      </form>
      {err && <p className="err small">{err}</p>}
    </div>
  );
}

// ---------- דשבורד: where everyone stands

export function Dashboard({ ctx, desk }: { ctx: Ctx; desk: boolean }) {
  const [book, , error] = useData(loadBook);
  const items = useItems(ctx, book);
  const head = <PageHead title="דשבורד" eyebrow={eyebrowOf(desk)} tip="איפה כל הלידים עומדים, מה ביקשו בדוכן, ומה עוד אפשר להוציא מהתערוכה." />;
  if (error) return <div className="page">{head}<p className="err">{error}</p></div>;
  if (!book) return <div className="page">{head}<p className="muted">טוען…</p></div>;
  const { now, later } = split(items);
  const ended = (r: string) => items.filter((i) => i.next.kind === 'end' && i.next.reason === r).length;
  const late = now.filter((i) => i.next.kind === 'task' && i.next.late).length;
  // The 14 days after the fair: the window in which a visitor still remembers the booth.
  const t = today();
  const dayN = Math.floor((Date.parse(t) - Date.parse(EXPO_DAY)) / 86400000);
  const touched = items.filter((i) => i.lead.history.length).length;
  const untouched = items.length - touched;
  return (
    <div className="page">
      {head}
      <Tiles items={[[now.length, 'לטיפול היום'], [late, 'באיחור', late > 0], [now.length + later.length, 'במעקב'], [ended('closed'), 'עסקאות שנסגרו']]} onPick={(k) => ctx.go(k === 'עסקאות שנסגרו' ? 'leads' : 'tasks')} />
      {now.length > 0 && <button type="button" className="btn primary big start-btn" onClick={() => ctx.go('tasks')}>להתחיל: {now.length} לטיפול ←</button>}
      <section className="card">
        <h2>14 הימים שאחרי התערוכה</h2>
        <div className="days14" aria-hidden="true">
          {Array.from({ length: 14 }, (_, n) => <span key={n} className={n + 1 < dayN ? 'past' : n + 1 === dayN ? 'now' : ''} />)}
        </div>
        <p className="muted">
          {dayN < 1
            ? `התערוכה ב-${dayLabel(EXPO_DAY)}. מהיום שאחריה נספרים כאן 14 הימים שבהם המבקרים עוד זוכרים את הדוכן.`
            : <>{dayN <= 14 ? <>יום <b>{dayN}</b> מתוך 14. </> : 'עברו 14 הימים. '}מתוך {items.length} לידים: <b>{touched}</b> כבר בקשר, <b>{untouched}</b> עוד לא היה קשר, <b>{ended('closed')}</b> עסקאות.</>}
        </p>
        {dayN >= 1 && untouched > 0 && <button type="button" className="btn start-sm" onClick={() => ctx.go('tasks')}>לראות את {untouched} שעוד לא היה איתם קשר</button>}
      </section>
      <div className="two-col">
        <section className="card">
          <h2>איפה כולם עומדים</h2>
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
        </section>
        <section className="card">
          <h2>מה סומן הכי הרבה</h2>
          <Meters rows={[
            ...ctx.setup.needs.map((n) => ({ key: n.label, label: n.label, count: items.filter((i) => i.row.taps.includes(n.label)).length })),
            { key: '-', label: 'בלי סימון', count: items.filter((i) => !i.row.taps.length).length },
          ].sort((a, b) => b.count - a.count)} />
        </section>
      </div>
      <Harvest items={items} />
    </div>
  );
}

// ---------- הודעות: the text of each message, as the visitor gets it; one open at a time, in hand

/** The exhibitor as his messages sign: the greeting is kept apart, and a change in the settings reaches here. */
function useMe(ctx: Ctx): Me {
  const [greeting, setG] = useState<'shalom' | 'kavod'>('shalom');
  useEffect(() => {
    const f = () => myGreeting().then(setG).catch(() => {});
    f(); addEventListener('expo-greeting', f);
    return () => removeEventListener('expo-greeting', f);
  }, []);
  const e = ctx.exhibitor;
  return { name: e.name, business: e.business, phone: e.phone, greeting, sensitive: e.sensitive || ctx.setup.sensitive, fills: e.fills };
}
const SAMPLE = 'ישראל ישראלי';

export function Messages({ ctx, desk }: { ctx: Ctx; desk: boolean }) {
  const texts = useTexts();
  const me = useMe(ctx);
  const [open, setOpen] = useState<string | null>(null);
  const list = messagesOf(ctx.setup);
  const toFill = !texts ? 0 : list.filter((m) => holes(fill(textOf(ctx.setup, texts, m.id), me, SAMPLE)).length).length;
  return (
    <div className="page">
      <PageHead title="הודעות" eyebrow={eyebrowOf(desk)} sub={toFill ? `${toFill} מתוך ${list.length} עוד צריכות השלמה` : undefined}
        tip="הנוסח של כל הודעה, כמו שהמבקר יקבל אותה. פרט בסוגריים מרובעים (כתובת, שעות) ממלאים פעם אחת ב'פרטים להודעות', והוא נכנס לכל ההודעות. הודעה עם פרט ריק לא יוצאת." />
      <div className="two-col msgs">
      <section className="card">
      <h2>ההודעות</h2>
      <p className="muted">{list.length} הודעות. נגיעה בהודעה פותחת את הנוסח שלה.</p>
      {!texts ? <p className="muted">טוען…</p> : (
        <ul className="list in-card">
          {list.map((m) => {
            const body = textOf(ctx.setup, texts, m.id);
            const missing = holes(fill(body, me, SAMPLE));
            if (open === m.id) return <MessageEdit key={m.id} ctx={ctx} me={me} id={m.id} after={m.after} body={body} own={m.id in texts} onClose={() => setOpen(null)} />;
            return (
              <li key={m.id}>
                <button type="button" className="list-row" onClick={() => setOpen(m.id)}>
                  <div className="row-name">{m.id}{missing.length > 0 && <span className="tag">להשלים: {missing.length}</span>}{m.id in texts && <span className="tag">הנוסח שלך</span>}</div>
                  <div className="row-step">אחרי: {m.after.join(' · ')}</div>
                  <div className="row-id">{fill(body, me, SAMPLE).split('\n').find((l, n) => n > 0 && l.trim() && !l.startsWith('לכבוד')) ?? ''}</div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      </section>
      <div className="col">
      {texts && <MessageDetails ctx={ctx} texts={texts} list={list} />}
      <section className="card">
        <h2>איך הן יוצאות</h2>
        <p className="muted"><b>כשהוואטסאפ שלך מחובר</b> (הגדרות › חיבורים): ההודעות של המסלול יוצאות לבד מהמספר שלך ביום שלהן, ומה שתשלח מכרטיס המשימה נכנס לתור. הכל בקצב של אדם, בשעות 9–20, לא בשבת ובחג, ועם תקרה יומית למי שעוד לא ענה.</p>
        <p className="muted"><b>בלי חיבור:</b> בנגיעה מכרטיס המשימה. נפתח וואטסאפ או מייל עם ההודעה מוכנה, ואתה לוחץ שלח.</p>
        <p className="muted">הודעה עם פרט ריק בסוגריים מרובעים לא יוצאת עד שממלאים אותו.</p>
        <Soon title="בהמשך">מייל שיוצא לבד, למי שאין לו וואטסאפ.</Soon>
      </section>
      </div>
      </div>
    </div>
  );
}

/**
 * פרטים להודעות (יצחק, 29/10): every detail in square brackets across his messages, besides what the system fills by
 * itself, written once and filled into all of them. A new one (his own edit; later the consultant's) shows up here by
 * itself. While one is empty, the messages that use it do not go out.
 */
function MessageDetails({ ctx, texts, list }: { ctx: Ctx; texts: Record<string, string>; list: { id: string }[] }) {
  const uses = new Map<string, string[]>();
  for (const m of list) for (const k of detailsIn(textOf(ctx.setup, texts, m.id))) (uses.get(k) ?? uses.set(k, []).get(k)!).push(m.id);
  const fills = ctx.exhibitor.fills ?? {};
  const [vals, setVals] = useState<Record<string, string>>(fills);
  const [err, setErr] = useState('');
  async function save(k: string) {
    const v = (vals[k] ?? '').trim();
    if (v === (fills[k] ?? '')) return;
    const next = { ...fills };
    if (v) next[k] = v; else delete next[k];
    ctx.setExhibitor({ ...ctx.exhibitor, fills: next });
    try { await updateMe(ctx.exhibitor.id, { fills: next }); setErr(''); } catch { ctx.setExhibitor(ctx.exhibitor); setErr('לא נשמר. אפשר לנסות שוב.'); }
  }
  if (!uses.size) return null;
  const empty = [...uses.keys()].filter((k) => !fills[k]).length;
  return (
    <section className="card">
      <h2>פרטים להודעות {empty > 0 && <span className="tag">חסרים {empty}</span>}</h2>
      <p className="muted">ממלאים פעם אחת, וזה נכנס לכל ההודעות שבהן הפרט מופיע. כל עוד פרט ריק, ההודעות שלו לא יוצאות.</p>
      <div className="fills">
        {[...uses].map(([k, ids]) => {
          const file = k.startsWith('קובץ');
          const whole = ids.length === 1 && ids[0] === k;
          return (
            <label className="field" key={k}>
              <span>{file ? `${k.replace(/^קובץ:?\s*/, '') || 'קובץ'} (קובץ)` : k}{!fills[k] && <span className="faint small"> · חסר</span>}</span>
              <input className="input" dir="auto" value={vals[k] ?? ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} onBlur={() => save(k)}
                placeholder={file ? 'בינתיים: קישור לקובץ' : whole ? 'מה ההודעה אומרת' : ''} />
              <span className="faint small">{whole ? 'זו ההודעה עצמה. אפשר גם לכתוב אותה במלואה בנגיעה בה.' : `בהודעות: ${ids.join(' · ')}`}</span>
            </label>
          );
        })}
      </div>
      {err && <p className="err small">{err}</p>}
    </section>
  );
}

function MessageEdit({ ctx, me, id, after, body, own, onClose }: { ctx: Ctx; me: Me; id: string; after: string[]; body: string; own: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState(body);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const shown = fill(draft, me, SAMPLE);
  const missing = holes(shown);
  const suggested = draftFor(ctx.setup, id);
  async function run(f: () => Promise<void>) {
    setBusy(true); setErr('');
    try { await f(); setTexts(await loadTexts()); onClose(); }
    catch (e) { setErr(String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }
  return (
    <li className="held">
      <div className="card-top">
        <div className="who"><b>{id}</b><span className="ctx">אחרי: {after.join(' · ')}</span></div>
        <button type="button" className="sq" aria-label="סגירה" onClick={onClose}><Icon name="close" /></button>
      </div>
      <label className="field" htmlFor="msg-body">הנוסח
        <textarea id="msg-body" className="area" rows={Math.max(5, draft.split('\n').length + 1)} value={draft} onChange={(e) => setDraft(e.target.value)} />
      </label>
      <p className="faint small">[שם] יוחלף בשם המבקר, ו־[שם המציג], [העסק] ו־[טלפון] בפרטים שלך. כל פרט אחר בסוגריים (למשל [כתובת]) ממלאים פעם אחת ב"פרטים להודעות", וגם פרט חדש שתכתוב יופיע שם. הפנייה ("שלום" או "לכבוד") נקבעת בהגדרות.</p>
      <div className="stack">
        <span className="sec">כך {SAMPLE} יקבל אותה</span>
        <div className="note preview">{shown}</div>
      </div>
      {missing.length > 0 && <p className="note">עוד להשלים: <b>{missing.join(' · ')}</b>. עד שמשלימים, ההודעה לא יוצאת.</p>}
      {err && <p className="err">{err}</p>}
      <div className="row">
        <button type="button" className="btn primary" disabled={busy || draft.trim() === body.trim() || !draft.trim()}
          onClick={() => run(() => saveText(ctx.exhibitor.id, id, draft.trim()))}>שמירה</button>
        <button type="button" className="btn" onClick={onClose}>ביטול</button>
        {own && draft !== suggested && (
          <button type="button" className="text-btn" disabled={busy}
            onClick={() => run(() => resetText(ctx.exhibitor.id, id))}>חזרה לנוסח המוצע</button>
        )}
      </div>
    </li>
  );
}

// ---------- הגדרות: details and connections, and the personal setup — one place, in two parts

export function Settings({ ctx, onSignOut }: { ctx: Ctx; onSignOut: () => void }) {
  const [tab, setTab] = useState<'details' | 'custom'>('details');
  return (
    <div className="page settings">
      <div className="set-head">
        <PageHead title="הגדרות" tip="פרטים וחיבורים: איך ההודעות שלך פונות ויוצאות, וההרשמה העצמית. התאמה אישית: הכרטיס בדוכן ומה קורה אחרי התערוכה." />
        <div className="seg" role="group" aria-label="חלק בהגדרות">
          <button type="button" aria-pressed={tab === 'details'} onClick={() => setTab('details')}>פרטים וחיבורים</button>
          <button type="button" aria-pressed={tab === 'custom'} onClick={() => setTab('custom')}>התאמה אישית</button>
        </div>
      </div>
      {tab === 'details' ? <Details ctx={ctx} onSignOut={onSignOut} /> : <Custom ctx={ctx} />}
    </div>
  );
}

/** A part's sub-tabs, as chips under its intro. */
function SubTabs<K extends string>({ label, tabs, on, set }: { label: string; tabs: [K, string][]; on: K; set: (k: K) => void }) {
  return (
    <nav className="subtabs chips" aria-label={label}>
      {tabs.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={on === k} onClick={() => set(k)}>{l}</button>)}
    </nav>
  );
}

function Details({ ctx, onSignOut }: { ctx: Ctx; onSignOut: () => void }) {
  const [greeting, setG] = useState<'shalom' | 'kavod' | null>(null);
  const [tips, setTips] = useState(tipsOn);
  const [sub, setSub] = useState<'msgs' | 'self' | 'links' | 'account'>('msgs');
  useEffect(() => { myGreeting().then(setG).catch(() => setG('shalom')); }, []);
  async function choose(g: 'shalom' | 'kavod') { setG(g); await setGreeting(ctx.exhibitor.id, g).catch(() => {}); dispatchEvent(new Event('expo-greeting')); }
  return (
    <>
      <p className="muted set-intro"><b>הפרטים שלך, ואיך ההודעות יוצאות.</b> כל שינוי כאן חל על כל ההודעות.</p>
      <SubTabs label="פרטים וחיבורים" on={sub} set={setSub} tabs={[['msgs', 'הודעות'], ['self', 'הרשמה עצמית'], ['links', 'חיבורים'], ['account', 'החשבון']]} />
      <div className="subview">
        {sub === 'msgs' && <>
          <section className="panel-w">
            <h2>איך ההודעות שלך פונות לאנשים</h2>
            <div className="chips">
              <button type="button" className="chip" aria-pressed={greeting === 'shalom'} onClick={() => choose('shalom')}>שלום [שם]</button>
              <button type="button" className="chip" aria-pressed={greeting === 'kavod'} onClick={() => choose('kavod')}>בס"ד · לכבוד ר' [שם]</button>
            </div>
          </section>
          <Signature ctx={ctx} />
          <MailChoice ctx={ctx} />
          <section className="panel-w">
            <h2>הנוסח של כל הודעה</h2>
            <p className="muted">ההודעות עצמן, כמו שהמבקר יקבל אותן, נערכות במסך ההודעות.</p>
            <button type="button" className="btn start-sm" onClick={() => ctx.go('messages')}><Icon name="mail" size={18} />להודעות</button>
          </section>
        </>}
        {sub === 'self' && <SelfSign ctx={ctx} />}
        {sub === 'links' && <>
          {ctx.admin && <WaLink ctx={ctx} />}
          {!ctx.admin && <Soon title="חיבור הוואטסאפ שלך">סורקים קוד QR מהטלפון, כמו בוואטסאפ ווב, וההודעות יוצאות מהמספר שלך. אפשר לנתק בכל רגע.</Soon>}
          <Soon title="קריאת תשובות">באישורך בלבד: המערכת רואה רק תשובות של מבקרים שנרשמו אצלך, כדי לעצור את המעקב כשמישהו ענה.</Soon>
        </>}
        {sub === 'account' && <>
          <section className="panel-w">
            <div className="switchrow">
              <span>להציג הסבר ליד כל מסך</span>
              <button type="button" className="switch" role="switch" aria-checked={tips} aria-label="להציג הסבר ליד כל מסך" onClick={() => { setTips(!tips); setTipsOn(!tips); }} />
            </div>
          </section>
          <section className="panel-w">
            <h2>החשבון</h2>
            <p>{ctx.exhibitor.name}{ctx.exhibitor.business ? ` · ${ctx.exhibitor.business}` : ''}</p>
            <div className="row">
              <button type="button" className="btn" onClick={onSignOut}>יציאה</button>
              {ctx.admin && <a className="text-btn" href="https://expo-admin.pages.dev" target="_blank" rel="noreferrer">ניהול התערוכה ←</a>}
            </div>
          </section>
        </>}
      </div>
    </>
  );
}

/**
 * His own WhatsApp, linked as a device by scanning a QR (WhatsApp › מכשירים מקושרים). For now only the admin sees it:
 * the pilot measures how the server holds the accounts before exhibitors link theirs. Nothing is sent or read yet.
 */
function WaLink({ ctx }: { ctx: Ctx }) {
  const [st, setSt] = useState<WaState | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => { waStatus().then((x) => { setSt(x); setErr(''); }).catch(() => setErr('שרת הוואטסאפ עוד לא פעיל.')); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  // While a code is on the screen or the link is being made, ask again every two seconds.
  useEffect(() => {
    if (!st || (st.status !== 'qr' && st.status !== 'connecting')) return;
    const t = setInterval(refresh, 2000); return () => clearInterval(t);
  }, [st, refresh]);
  const run = async (f: () => Promise<WaState>) => { setBusy(true); try { setSt(await f()); setErr(''); } catch { setErr('שרת הוואטסאפ עוד לא פעיל.'); } finally { setBusy(false); } };
  return (
    <section className="panel-w">
      <h2>חיבור הוואטסאפ שלך <span className="tag">פיילוט</span></h2>
      {err ? <p className="muted">{err}</p>
        : !st ? <p className="muted">בודק…</p>
        : st.status === 'open' ? <>
          <p>מחובר: <b dir="ltr">{st.phone}</b>. הודעות שתשלח מכאן יוצאות מהמספר הזה, אחת אחת, בקצב של אדם ובשעות 9–20 (לא בשבת ובחג).</p>
          {ctx.exhibitor.wa_blocked_at && <WaBlocked ctx={ctx} />}
          <WaSwitch ctx={ctx} field="wa_read_replies" label="לקרוא תשובות של מבקרים"
            hint="רק ממספרים של מבקרים שנרשמו אצלך. כל שיחה אחרת לא נקראת ולא נשמרת. תשובה עוצרת את המסלול ומקפיצה אותו ל'היום'; 'הסר' מוריד אותו מהרשימה." />
          <WaSwitch ctx={ctx} field="wa_save_contacts" label="לשמור כל מבקר באנשי הקשר שלי"
            hint="לפני ההודעה הראשונה אליו, בשם כמו 'יעקב גרינברג · תערוכה'. כך תראה את השם שלו כשהוא עונה." />
          <button type="button" className="btn start-sm" disabled={busy} onClick={() => { forgetWa(); run(waUnlink); }}>לנתק</button>
        </>
        : st.status === 'qr' && st.qr ? <div className="sign-row">
          <Qr text={st.qr} size={220} />
          <div className="stack">
            <p><b>בטלפון:</b> וואטסאפ › הגדרות › מכשירים מקושרים › קישור מכשיר, ולסרוק את הקוד.</p>
            <p className="faint small">הקוד מתחלף כל כמה שניות; הוא מתעדכן כאן לבד.</p>
            <button type="button" className="btn ghost start-sm" disabled={busy} onClick={() => run(waUnlink)}>ביטול</button>
          </div>
        </div>
        : st.status === 'connecting' ? <p className="muted">מתחבר…</p>
        : <>
          <p className="muted">סורקים קוד מהטלפון, כמו בוואטסאפ ווב. הטלפון ממשיך לעבוד כרגיל, ואפשר לנתק בכל רגע.</p>
          <button type="button" className="btn primary start-sm" disabled={busy} onClick={() => run(waLink)}>לחבר את הוואטסאפ</button>
        </>}
    </section>
  );
}

/** When the visitor's own mail gets messages: his choice (יצחק, 29/10). Only when his phone gets no WhatsApp (§10), or always. */
function MailChoice({ ctx }: { ctx: Ctx }) {
  const on = ctx.exhibitor.mail_always;
  const set = async (v: boolean) => { if (v === on) return; ctx.setExhibitor({ ...ctx.exhibitor, mail_always: v }); await setWaOptions(ctx.exhibitor.id, { mail_always: v }).catch(() => ctx.setExhibitor(ctx.exhibitor)); };
  return (
    <section className="panel-w">
      <h2>המייל של המבקר</h2>
      <div className="chips">
        <button type="button" className="chip" aria-pressed={!on} onClick={() => set(false)}>רק כשאין לו וואטסאפ</button>
        <button type="button" className="chip" aria-pressed={on} onClick={() => set(true)}>תמיד, גם כשיש וואטסאפ</button>
      </div>
      <p className="muted small">אפשר לשנות לכל מבקר בדף שלו, בפרטים.</p>
    </section>
  );
}

/** The booth's default message (17/10): when the path sends nothing at once, the card offers it in one tap. */
function BoothDefault({ ctx }: { ctx: Ctx }) {
  const list = messagesOf(ctx.setup).map((m) => m.id);
  const value = ctx.exhibitor.booth_default ?? '';
  const set = async (v: string) => { const next = { ...ctx.exhibitor, booth_default: v || null }; ctx.setExhibitor(next); await setWaOptions(ctx.exhibitor.id, { booth_default: v || null }).catch(() => ctx.setExhibitor(ctx.exhibitor)); };
  if (!list.length) return null;
  return (
    <section className="panel-w">
      <h2>הודעה בדוכן</h2>
      <p className="muted">כשהמסלול של המבקר לא שולח לו כלום מיד, הכרטיס מציע את ההודעה הזאת בנגיעה אחת. תמיד אפשר לבחור אחרת, או בלי.</p>
      <label className="field">ברירת המחדל
        <select className="input" value={value} onChange={(e) => set(e.target.value)}>
          <option value="">בלי (בוחרים בכל פעם)</option>
          {list.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
    </section>
  );
}

function WaSwitch({ ctx, field, label, hint }: { ctx: Ctx; field: 'wa_read_replies' | 'wa_save_contacts'; label: string; hint: string }) {
  const on = ctx.exhibitor[field];
  const flip = async () => { const next = { ...ctx.exhibitor, [field]: !on }; ctx.setExhibitor(next); await setWaOptions(ctx.exhibitor.id, { [field]: !on }).catch(() => ctx.setExhibitor(ctx.exhibitor)); };
  return (
    <div className="switchrow wa-switch">
      <span><b>{label}</b><span className="faint small">{hint}</span></span>
      <button type="button" className="switch" role="switch" aria-checked={on} aria-label={label} onClick={flip} />
    </div>
  );
}

/** The server saw signs of a block: nothing went out since. After linking again, he says so and sending resumes. */
function WaBlocked({ ctx }: { ctx: Ctx }) {
  const clear = async () => { await setWaOptions(ctx.exhibitor.id, { wa_blocked_at: null, wa_blocked_reason: null }).catch(() => {}); ctx.setExhibitor({ ...ctx.exhibitor, wa_blocked_at: null, wa_blocked_reason: null }); forgetWa(); };
  return (
    <div className="offline-line">
      <p>וואטסאפ ניתק את החיבור ({ctx.exhibitor.wa_blocked_reason ?? 'בלי סיבה'}). מאז לא יצאה שום הודעה. כדאי לבדוק בטלפון שהוואטסאפ פעיל, ולחבר מחדש.</p>
      <button type="button" className="btn" onClick={clear}>חיברתי מחדש, אפשר לשלוח</button>
    </div>
  );
}

/**
 * Self-registration: the link and its code, and a sign to print for the booth. A visitor who scans it registers
 * himself and taps what interests him; within half a minute he is in the booth's list, marked "נרשם לבד".
 */
function SelfSign({ ctx }: { ctx: Ctx }) {
  const url = joinUrl(ctx.exhibitor.join_code);
  const biz = ctx.setup.sensitive || ctx.exhibitor.sensitive ? ctx.exhibitor.name : ctx.exhibitor.business || ctx.exhibitor.name;
  const [copied, setCopied] = useState(false);
  return (
    <section className="panel-w">
      <h2>הרשמה עצמית בדוכן</h2>
      <p className="muted">כשיש תור, מבקר סורק את הקוד ונרשם לבד מהטלפון שלו: שם, טלפון, ומה מעניין אותו, מאותם כפתורים של הכרטיס שלך. תוך חצי דקה הוא ברשימה של הדוכן.</p>
      <div className="sign-row">
        <Qr text={url} size={148} />
        <div className="stack">
          <a className="link-line" href={url} target="_blank" rel="noreferrer" dir="ltr">{url.replace(/^https?:\/\//, '')}</a>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => print()}>הדפסת שלט לדוכן</button>
            <button type="button" className="btn" onClick={() => { navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {}); }}>{copied ? 'הועתק' : 'העתקת הקישור'}</button>
          </div>
          <p className="faint small">אפשר לנסות בעצמך: מי שתירשם דרכו יופיע בדוכן, ואפשר לבטל אותו משם.</p>
        </div>
      </div>
      <div className="print-sign" aria-hidden="true">
        <div className="ps-biz">{biz}</div>
        <div className="ps-call">סורקים ונרשמים</div>
        <Qr text={url} size={380} />
        <div className="ps-how">שם, טלפון, ומה מעניין אותך. נחזור אליך עם בדיוק מה שמתאים.</div>
        <div className="ps-url" dir="ltr">{url.replace(/^https?:\/\//, '')}</div>
      </div>
    </section>
  );
}

/** The details at the foot of every message: [שם המציג], [העסק] · [טלפון]; and whether he has WhatsApp. */
function Signature({ ctx }: { ctx: Ctx }) {
  return (
    <section className="panel-w">
      <h2>הפרטים שלך</h2>
      <p className="muted">כל הודעה נחתמת בשם, בעסק ובטלפון.{ctx.setup.sensitive || ctx.exhibitor.sensitive ? ' בעסק שלך החתימה בלי שם העסק.' : ''}</p>
      <MeForm exhibitor={ctx.exhibitor} onSaved={ctx.setExhibitor} submit="שמירה" />
    </section>
  );
}

function Custom({ ctx }: { ctx: Ctx }) {
  const [draft, setDraft] = useState<Setup | null>(null);
  const [renames, setRenames] = useState<[string, string][]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const s = draft ?? ctx.setup;
  const [picking, setPicking] = useState(false);
  const [steps, setSteps] = useState(false);
  const [ask, setAsk] = useState<{ count: number; setup: Setup; renames: [string, string][] } | null>(null);
  const [sub, setSub] = useState<'card' | 'after' | 'build'>('card');

  /** A change with leads already registered asks whether it applies to them too (model, section 13). */
  async function apply(next: Setup, names: [string, string][], scope?: 'all' | 'new') {
    setBusy(true); setSaved('');
    try {
      if (!scope) {
        const count = await leadCount();
        if (count > 0) { setAsk({ count, setup: next, renames: names }); return; }
      }
      if (scope === 'new') await pinLeads(ctx.exhibitor.id);
      await changeTemplate(ctx.exhibitor.id, next);
      // A lead left on the old version keeps the old names of the buttons, as its old setup knows them.
      if (scope !== 'new') for (const [from, to] of names) await renameTaps(from, to);
      ctx.setSetup(next); setDraft(null); setRenames([]); setAsk(null); setSteps(false);
      setSaved(scope === 'new'
        ? 'נשמר. השינוי חל רק על מבקרים שיירשמו מעכשיו; מי שכבר נרשם ממשיך במסלול שהיה לו. הגרסה הקודמת שמורה.'
        : 'נשמר. השינוי חל מהצעד הבא של כל מבקר, גם של מי שכבר נרשם. הגרסה הקודמת שמורה.');
    } catch (e) { setSaved('לא נשמר: ' + String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }
  const save = () => { if (draft) apply(draft, renames); };
  const question = ask && (
    <section className="held" aria-label="על מי חל השינוי">
      <h2>כבר נרשמו אצלך {ask.count} מבקרים. על מי יחול השינוי?</h2>
      <div className="choices">
        <button type="button" className="choice" disabled={busy} onClick={() => apply(ask.setup, ask.renames, 'all')}><b>גם עליהם</b><small>מהצעד הבא של כל אחד</small></button>
        <button type="button" className="choice" disabled={busy} onClick={() => apply(ask.setup, ask.renames, 'new')}><b>רק על החדשים</b><small>מי שכבר נרשם ממשיך במסלול שהיה לו</small></button>
      </div>
      <button type="button" className="text-btn" disabled={busy} onClick={() => setAsk(null)}>חזרה, בלי לשמור</button>
    </section>
  );
  const intro = <p className="muted set-intro"><b>כאן בונים את הדוכן שלך.</b> הכרטיס שבדוכן, ומה קורה אחרי התערוכה עם כל מי שנרשם. כל דבר אפשר לשנות.</p>;
  if (steps) {
    return <>{intro}{question}<SetupSteps start={ctx.setup} business={ctx.exhibitor.business} onCancel={() => setSteps(false)} onSave={(next, names) => apply(next, names)} /></>;
  }
  return (
    <>
      {intro}
      <SubTabs label="התאמה אישית" on={sub} set={setSub} tabs={[['card', 'הכרטיס בדוכן'], ['after', 'מה קורה אחרי'], ['build', 'הקמה וגרסאות']]} />
      <div className="subview">
      {question}
      {sub === 'build' && <>
      <section className="panel-w">
        <h2>איך מקימים</h2>
        <ul className="list" style={{ background: 'var(--surface-2)' }}>
          <li><a className="list-row" href={LAB_URL} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><div className="row-name">שיחה עם היועץ החכם</div><div className="row-step">בגרסת ניסיון, בחלון נפרד. בקרוב בתוך המערכת, וההקמה תישמר ישר לכאן.</div></a></li>
          <li><button type="button" className="list-row" onClick={() => { setSteps(true); setSaved(''); scrollTo(0, 0); }}><div className="row-name">הקמה שלב אחר שלב</div><div className="row-step">שישה שלבים קצרים: מטרה, נקודת התחלה, כרטיס, מסלולים, זמן, ובדיקה.</div></button></li>
          <li><button type="button" className="list-row" aria-expanded={picking} onClick={() => setPicking(!picking)}><div className="row-name">החלפת תבנית</div><div className="row-step">להתחיל מעסק דומה מהסבבים.</div></button></li>
        </ul>
        {picking && (
          <div className="chips">{fixtures.map((f) => <button key={f.id} type="button" className="chip" onClick={async () => { await changeTemplate(ctx.exhibitor.id, f.setup); ctx.setSetup(f.setup); setPicking(false); }}>{f.name}</button>)}</div>
        )}
      </section>

      {(s.anchor.goal || s.anchor.success) && (
        <section className="panel-w"><h2>מה תהיה הצלחה בתערוכה</h2><p>{s.anchor.goal}</p>{s.anchor.success && <p className="muted">{s.anchor.success}</p>}</section>
      )}
      {!draft && <Versions ctx={ctx} key={saved} onRestore={(old) => apply(old, [])} />}
      </>}

      {sub === 'card' && <section className={draft ? 'held' : 'panel-w'}>
        <div className="card-top">
          <h2>הכרטיס בדוכן</h2>
          {!draft && <button type="button" className="btn" onClick={() => { setDraft(ctx.setup); setRenames([]); setSaved(''); }}><Icon name="pen" />עריכה</button>}
        </div>
        {draft && <p className="muted small">נגיעה בשם משנה אותו, ✕ מוציא אותו מהכרטיס. שם שמשתנה משתנה גם אצל מי שכבר סומן בו.</p>}
        {GROUPS.map(([g, q]) => {
          const items = g === 'needs' ? s.needs.map((n) => ({ label: n.label, effect: n.goal === 'primary' ? 'המטרה הראשית' : '' })) : s[g];
          if (!items.length && !draft) return null;
          return (
            <div key={g} className="q-block"><span className="sec">{q}</span>
              {draft ? (
                <div className="chips">
                  {items.map((b) => <EditChip key={b.label} label={b.label} primary={g === 'needs' && b.effect === 'המטרה הראשית'}
                    onRename={(to) => { const next = rename(draft, b.label, to); if (next !== draft) { setDraft(next); setRenames([...renames, [b.label, to.trim()]]); } }}
                    onRemove={() => setDraft(remove(draft, g, b.label))}
                    onPrimary={g === 'needs' && draft.needs.length > 1 ? () => setDraft(setGoal(draft, b.label)) : undefined} />)}
                  <AddChip onAdd={(l) => setDraft(add(draft, g, l))} />
                </div>
              ) : (
                <ul className="history">{items.map((b) => <li key={b.label}><b style={{ color: 'var(--ink)' }}>{b.label}</b>{b.effect ? ` — ${b.effect}` : null}</li>)}</ul>
              )}
            </div>
          );
        })}
        {!draft && !s.needs.length && !s.when.length && !s.who.length && <p className="muted">כרטיס של שם בלבד.</p>}
      </section>}
      {sub === 'card' && !draft && <BoothDefault ctx={ctx} />}

      {sub === 'after' && <section className={draft ? 'held' : 'panel-w'}>
        <div className="card-top">
          <h2>מה קורה אחרי התערוכה</h2>
          {!draft && <button type="button" className="btn" onClick={() => { setDraft(ctx.setup); setRenames([]); setSaved(''); }}><Icon name="pen" />עריכה</button>}
        </div>
        {draft && <p className="muted small">אפשר לשנות כמה ימים עובר בין צעד לצעד. צעד חדש לכפתור חדש: שיחה ממך שלושה ימים אחרי התערוכה.</p>}
        {s.needs.map((n, ni) => (
          <div key={n.label} className="q-block">
            <span className="sec">{n.label}</span>
            {n.variants.map((v, vi) => (
              <div key={vi}>
                {n.variants.length > 1 && <span className="muted small">{text.variantTitle(v)}:</span>}
                <PathLines path={v.path} edit={draft ? (i, d) => setDraft(setDays(draft, { need: ni, variant: vi }, i, d)) : undefined} />
              </div>
            ))}
          </div>
        ))}
        <div className="q-block"><span className="sec">מבקר שלא סומן אצלו כלום</span>
          <div><span className="muted small">בעל עסק:</span><PathLines path={s.defaults.business} edit={draft ? (i, d) => setDraft(setDays(draft, { default: 'business' }, i, d)) : undefined} /></div>
          <div><span className="muted small">פרטי:</span><PathLines path={s.defaults.private} edit={draft ? (i, d) => setDraft(setDays(draft, { default: 'private' }, i, d)) : undefined} /></div>
        </div>
      </section>}

      {draft && (
        <div className="row">
          <button type="button" className="btn primary tall" disabled={busy || JSON.stringify(draft) === JSON.stringify(ctx.setup)} onClick={save}>שמירת השינויים</button>
          <button type="button" className="btn tall" disabled={busy} onClick={() => { setDraft(null); setRenames([]); }}>ביטול</button>
        </div>
      )}
      {saved && <p className="note">{saved}</p>}
      </div>
    </>
  );
}

/** The earlier versions of the setup, newest first; one tap makes one of them the setup again. */
function Versions({ ctx, onRestore }: { ctx: Ctx; onRestore: (s: Setup) => Promise<void> }) {
  const [list, setList] = useState<import('./lib/backend.ts').SetupVersion[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setupVersions(ctx.exhibitor.id).then(setList).catch(() => setList([])); }, [ctx.exhibitor.id, ctx.setup]);
  const old = (list ?? []).filter((v) => !v.active);
  if (!old.length) return null;
  const when = (iso: string) => { const d = new Date(iso); return `${dayLabel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  return (
    <section className="panel-w">
      <div className="card-top">
        <h2>גרסאות קודמות</h2>
        <button type="button" className="text-btn" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'להסתיר' : `${old.length} שמורות`}</button>
      </div>
      {open && (
        <ul className="list">
          {old.map((v) => (
            <li key={v.version} className="list-row">
              <div className="row-name">גרסה {v.version}<span className="muted small"> · {when(v.created_at)}</span></div>
              <div className="row-step">{v.data.needs.map((n) => n.label).join(' · ') || 'כרטיס של שם בלבד'}</div>
              <div className="row"><button type="button" className="btn" disabled={busy} onClick={async () => { setBusy(true); try { await onRestore(v.data); } finally { setBusy(false); } }}>לחזור לגרסה הזאת</button></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
