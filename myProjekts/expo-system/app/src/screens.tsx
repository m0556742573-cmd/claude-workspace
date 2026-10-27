// The exhibitor's screens beside the booth: the snapshot of the day, and the CRM — home, tasks, leads, dashboard, messages —
// the settings, and the admin's. Built on the brand book's pieces (ui.tsx): one title with a "?", tiles, white lists,
// and one outlined object per screen, the one in hand. What is built works on the real data; what is not says what it will be.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addDays, nextOccurrence, nextTask, pathAhead, type Action, type Holiday, type Lead, type Next, type Path, type Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import * as text from './lib/describe.ts';
import { add, remove, rename, setDays, setGoal, type Group } from './lib/edit.ts';
import { ACT, END, dayLabel, describe, inDays, today } from './lib/words.ts';
import { Icon, PageHead, Tiles, longDate, setTipsOn, tipsOn } from './ui.tsx';
import { EXHIBITOR_FIELDS, PEOPLE_FIELDS, mapColumns, parseCsv, toRecords, type Fields } from './lib/csv.ts';
import { MeForm } from './me.tsx';
import { AddChip, EditChip, GROUPS, PathLines } from './parts.tsx';
import { SetupSteps } from './setup.tsx';
import { Qr, joinUrl } from './join.tsx';
import { THANKS, draftFor, fill, holes, messagesOf, setTexts, textOf, useTexts, type Me } from './lib/messages.ts';
import type { Person } from './demo/people.ts';
import type { LocalLead, LocalNote } from './store/local.ts';
import {
  addFollowNote, addManual, setupVersions, leadCount, pinLeads, setupOf, adminClearPeople, adminCounts, adminLoadExhibitors, adminLoadPeople, allContacts, removeLead, renameTaps, saveLead, adminApprove, adminExhibitors, changeTemplate, engineLead, leadContact, loadBook, markStep, myGreeting,
  loadTexts, recordSent, recordSkip, removeManual, sentByLead, resetText, saveText, setCustomerDate, setGreeting, unmarkStep, voiceUrl,
  type AdminExhibitor, type Book, type Exhibitor, type LeadRow, type NoteRow,
} from './lib/backend.ts';

const LAB_URL = 'https://claude.ai/artifact/ThNurpj84KQfa4ETqSwUdH';
const OUTCOME: Record<string, string> = { engaged: 'דיברנו', noAnswer: 'לא ענה', closed: 'נסגרה עסקה', notRelevant: 'לא רלוונטי', optOut: 'ביקש להסיר' };
/** For a step that is not a talk, "noAnswer" means only "done, the path goes on". */
const DONE: Record<string, string> = { ...OUTCOME, noAnswer: 'בוצע' };

export interface Ctx {
  exhibitor: Exhibitor; setup: Setup; directory: Person[]; setSetup: (s: Setup) => void; setExhibitor: (e: Exhibitor) => void;
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
/** He answered "no WhatsApp": no WhatsApp button anywhere. Not asked yet counts as yes. */
const hasWa = (ctx: Ctx) => !ctx.exhibitor.onboarded || !!ctx.exhibitor.whatsapp;

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

export function Snapshot({ setup, todays, notes, waiting, eyebrow, onThanks }: { setup: Setup; todays: LocalLead[]; notes: LocalNote[]; waiting: number; eyebrow?: string; onThanks?: () => void }) {
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
      {todays.length > 0 && onThanks && (
        <section className="panel-w">
          <h2>בערב: תודה שביקרת</h2>
          <p className="muted">כל מי שנרשם היום מחכה לתודה קצרה. היא מוכנה בדף הבית, נגיעה אחת לכל מבקר.</p>
          <button type="button" className="btn" style={{ alignSelf: 'start' }} onClick={onThanks}>לשליחת התודות</button>
        </section>
      )}
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

interface Item { row: LeadRow; lead: Lead; next: Next; name: string; city: string; owner: boolean; setup: Setup }

function useItems(ctx: Ctx, book: Book | undefined): Item[] {
  return useMemo(() => {
    if (!book) return [];
    return book.leads.map((row) => {
      const owner = ownerOf(row, ctx.directory);
      const lead = engineLead(row, book, owner);
      const setup = setupOf(row, book, ctx.setup);
      return { row, lead, next: nextTask(setup, lead, today()), name: nameOf(row, ctx.directory), city: cityOf(row, ctx.directory), owner, setup };
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
      <Thanks ctx={ctx} items={items} />
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
    <section className="stack">
      <div className="sec">מה עוד אפשר להוציא</div>
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
  const head = <PageHead title="משימות" eyebrow={eyebrowOf(desk)} tip="כל מה שעליך לעשות, לפי התאריך. אחרי כל פעולה אפשר לבטל אותה בתוך 10 שניות." />;
  if (error) return <div className="page narrow">{head}<p className="err">{error}</p></div>;
  if (!book) return <div className="page narrow">{head}<p className="muted">טוען…</p></div>;
  const { now, later } = split(items);
  const days = [...new Set(later.map(dueOf))];
  return (
    <div className="page narrow">
      <UndoBar undo={undo} onDone={clearUndo} />
      {head}
      <Thanks ctx={ctx} items={items} />
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
  const [contact, setContact] = useState<{ phone: string | null; email: string | null; opted_out?: boolean } | null>(null);
  useEffect(() => { leadContact(row.id).then(setContact).catch(() => setContact(null)); }, [row.id]);
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
      {next.kind === 'task' && next.message && !talk
        ? <SendRow ctx={ctx} leadId={row.id} name={name} messageId={next.message} contact={contact} />
        : contact?.phone && (
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

/** The thank-you, on the evening of the fair: everyone registered in the last two weeks who has not had it yet.
 *  One tap per visitor opens WhatsApp with his thank-you ready; "בלי תודה" takes him off the list. */
function Thanks({ ctx, items }: { ctx: Ctx; items: Item[] }) {
  const [done, setDone] = useState<Map<string, Set<string>> | null>(null);
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState<Set<string>>(new Set());
  useEffect(() => { sentByLead().then(setDone).catch(() => setDone(new Map())); }, []);
  if (!done) return null;
  const from = inDays(-14);
  const left = items.filter((i) => i.row.captured_on >= from && !done.get(i.row.id)?.has(THANKS) && !gone.has(i.row.id))
    .filter((i) => i.next.kind !== 'end' || i.next.reason !== 'optOut');
  if (!left.length) return null;
  const off = (id: string) => setGone(new Set([...gone, id]));
  return (
    <section className="stack">
      <div className="sec">תודה שביקרת · {left.length}</div>
      <div className="panel-w">
        <p>{left.length === 1 ? 'מבקר אחד עוד לא קיבל' : `${left.length} מבקרים עוד לא קיבלו`} תודה על הביקור. {hasWa(ctx) ? 'נגיעה פותחת וואטסאפ עם התודה מוכנה, ואתה לוחץ שלח.' : 'נגיעה פותחת מייל עם התודה מוכנה, ואתה לוחץ שלח.'}</p>
        <button type="button" className="btn" style={{ alignSelf: 'start' }} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'סגירה' : 'לשלוח עכשיו'}</button>
      </div>
      {open && (
        <ul className="list">
          {left.map((i) => <ThanksRow key={i.row.id} ctx={ctx} item={i} onDone={() => off(i.row.id)} />)}
        </ul>
      )}
    </section>
  );
}

function ThanksRow({ ctx, item, onDone }: { ctx: Ctx; item: Item; onDone: () => void }) {
  const [contact, setContact] = useState<{ phone: string | null; email: string | null; opted_out?: boolean } | null | undefined>(undefined);
  const texts = useTexts();
  const me = useMe(ctx);
  useEffect(() => { leadContact(item.row.id).then(setContact).catch(() => setContact(null)); }, [item.row.id]);
  const body = fill(textOf(ctx.setup, texts, THANKS), me, item.name);
  const missing = holes(body);
  const send = (channel: 'whatsapp' | 'email') => { recordSent(ctx.exhibitor.id, item.row.id, channel, THANKS, body).catch(() => {}); setTimeout(onDone, 400); };
  return (
    <li className="list-row">
      <div className="row-name">{item.name}{item.city && <span className="muted"> · {item.city}</span>}</div>
      {contact?.opted_out ? (
        <div className="row"><span className="muted">ביקש לא לקבל הודעות</span><button type="button" className="text-btn" onClick={() => { recordSkip(ctx.exhibitor.id, item.row.id, THANKS).catch(() => {}); onDone(); }}>להוריד מהרשימה</button></div>
      ) : missing.length ? (
        <div className="row-step">בתודה עוד חסר {missing.join(' · ')}. <button type="button" className="text-btn" onClick={() => ctx.go('messages')}>להשלים</button></div>
      ) : (
        <div className="row">
          {contact?.phone && hasWa(ctx) && <a className="btn" href={`https://wa.me/${waNumber(contact.phone)}?text=${encodeURIComponent(body)}`} target="_blank" rel="noreferrer" onClick={() => send('whatsapp')}>וואטסאפ</a>}
          {contact?.email && <a className="btn" href={`mailto:${contact.email}?subject=${encodeURIComponent('תודה שביקרת')}&body=${encodeURIComponent(body)}`} onClick={() => send('email')}><Icon name="mail" />מייל</a>}
          {contact === null || (contact && !contact.phone && !contact.email) ? <span className="muted">אין טלפון או מייל</span> : null}
          <button type="button" className="text-btn" onClick={() => { recordSkip(ctx.exhibitor.id, item.row.id, THANKS).catch(() => {}); onDone(); }}>בלי תודה</button>
        </div>
      )}
    </li>
  );
}

/** A step that carries a message: the text, filled for this visitor, goes out with one tap in WhatsApp or mail.
 *  A text with a hole left in it does not go out; it sends him to fill it first. */
export function SendRow({ ctx, leadId, name, messageId, contact, onSent }: { ctx: Ctx; leadId: string; name: string; messageId: string; contact: { phone: string | null; email: string | null; opted_out?: boolean } | null; onSent?: () => void }) {
  const texts = useTexts();
  const me = useMe(ctx);
  const [shown, setShown] = useState(false);
  const body = fill(textOf(ctx.setup, texts, messageId), me, name);
  const missing = holes(body);
  const sent = (channel: 'whatsapp' | 'email') => { recordSent(ctx.exhibitor.id, leadId, channel, messageId, body).then(onSent).catch(() => {}); };
  return (
    <div className="stack">
      <button type="button" className="text-btn" style={{ alignSelf: 'start' }} aria-expanded={shown} onClick={() => setShown(!shown)}>{shown ? 'להסתיר את ההודעה' : 'לראות את ההודעה'}</button>
      {shown && <div className="note preview">{body}</div>}
      {contact?.opted_out ? (
        <p className="note">הוא ביקש לא לקבל הודעות. אפשר להתקשר, אם סיכמתם.</p>
      ) : missing.length ? (
        <p className="note">בהודעה עוד חסר: <b>{missing.join(' · ')}</b>. <button type="button" className="text-btn" onClick={() => ctx.go('messages')}>להשלים בהודעות</button></p>
      ) : (
        <div className="row">
          {contact?.phone && hasWa(ctx) && <a className="btn" href={`https://wa.me/${waNumber(contact.phone)}?text=${encodeURIComponent(body)}`} target="_blank" rel="noreferrer" onClick={() => sent('whatsapp')}>וואטסאפ עם ההודעה</a>}
          {contact?.email && <a className="btn" href={`mailto:${contact.email}?subject=${encodeURIComponent(me.sensitive ? me.name : me.business || me.name)}&body=${encodeURIComponent(body)}`} onClick={() => sent('email')}><Icon name="mail" />מייל</a>}
          {contact?.phone && <a className="btn" href={`tel:${contact.phone}`}><Icon name="phone" />{contact.phone}</a>}
          {contact && !contact.phone && !contact.email && <span className="muted">אין לו טלפון או מייל ברשימה.</span>}
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
  const [state, setState] = useState('all');
  const [need, setNeed] = useState('');
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [undo, setUndo] = useState<Undo | null>(null);
  const clearUndo = useCallback(() => setUndo(null), []);
  const head = (
    <PageHead title="לידים" eyebrow={eyebrowOf(desk)} sub={book ? `${items.length} מבקרים` : undefined}
      tip="כל מי שנרשם, עם מה שקרה עד עכשיו ומה הצעד הבא. נגיעה בשם פותחת את הפרטים."
      actions={book && <>
        <button type="button" className="btn" onClick={() => setAdding(!adding)}><Icon name="plus" />ליד חדש</button>
        {items.length > 0 && <button type="button" className="btn" disabled={exporting} onClick={async () => { setExporting(true); await exportLeads(items, ctx).catch(() => {}); setExporting(false); }}>{exporting ? 'מכין…' : 'ייצוא לאקסל'}</button>}
      </>} />
  );
  if (error) return <div className="page narrow">{head}<p className="err">{error}</p></div>;
  if (!book) return <div className="page narrow">{head}<p className="muted">טוען…</p></div>;
  const states = STATES.map(([key, label, test]) => ({ key, label, count: items.filter(test).length })).filter((x) => x.key === 'all' || x.count);
  const needs = ctx.setup.needs.map((n) => n.label).filter((l) => items.some((i) => i.row.taps.includes(l)));
  const test = STATES.find(([k]) => k === state)?.[2] ?? (() => true);
  const shown = items
    .filter(test)
    .filter((i) => !need || i.row.taps.includes(need))
    .filter((i) => !q.trim() || i.name.includes(q.trim()) || i.city.includes(q.trim()));
  return (
    <div className="page narrow">
      <UndoBar undo={undo} onDone={clearUndo} />
      {head}
      {adding && <NewLead ctx={ctx} onClose={() => setAdding(false)} onSaved={(id, n) => { setAdding(false); reload(); setUndo({ label: `${n} נוסף ללידים`, run: async () => { await removeLead(id, ctx.exhibitor.id).catch(() => {}); reload(); } }); }} />}
      {items.length > 6 && <label className="searchbox"><Icon name="search" /><input type="search" aria-label="חיפוש לפי שם או עיר" placeholder="חיפוש לפי שם או עיר" value={q} onChange={(e) => setQ(e.target.value)} /></label>}
      {items.length > 0 && (
        <div className="chips" role="group" aria-label="סינון לפי מצב">
          {states.map((x) => <button key={x.key} type="button" className="chip" aria-pressed={state === x.key} onClick={() => setState(x.key)}>{x.label} · {x.count}</button>)}
        </div>
      )}
      {needs.length > 1 && (
        <div className="chips" role="group" aria-label="סינון לפי מה שביקש">
          {needs.map((l) => <button key={l} type="button" className="chip" aria-pressed={need === l} onClick={() => setNeed(need === l ? '' : l)}>{l}</button>)}
        </div>
      )}
      {items.length > 0 && !shown.length && <p className="muted">אין לידים שמתאימים לסינון.</p>}
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
  return { name: e.name, business: e.business, phone: e.phone, greeting, sensitive: e.sensitive || ctx.setup.sensitive };
}
const SAMPLE = 'ישראל ישראלי';

export function Messages({ ctx, desk }: { ctx: Ctx; desk: boolean }) {
  const texts = useTexts();
  const me = useMe(ctx);
  const [open, setOpen] = useState<string | null>(null);
  const list = messagesOf(ctx.setup);
  const toFill = !texts ? 0 : list.filter((m) => holes(fill(textOf(ctx.setup, texts, m.id), me, SAMPLE)).length).length;
  return (
    <div className="page narrow">
      <PageHead title="הודעות" eyebrow={eyebrowOf(desk)} sub={toFill ? `${toFill} מתוך ${list.length} עוד צריכות השלמה` : undefined}
        tip="הנוסח של כל הודעה, כמו שהמבקר יקבל אותה. מה שבסוגריים מרובעים צריך להשלים, והודעה כזאת לא יוצאת עד שמשלימים." />
      {!texts ? <p className="muted">טוען…</p> : (
        <ul className="list">
          {list.map((m) => {
            const body = textOf(ctx.setup, texts, m.id);
            const missing = holes(fill(body, me, SAMPLE));
            if (open === m.id) return <MessageEdit key={m.id} ctx={ctx} me={me} id={m.id} after={m.after} body={body} own={m.id in texts} onClose={() => setOpen(null)} />;
            return (
              <li key={m.id}>
                <button type="button" className="list-row" onClick={() => setOpen(m.id)}>
                  <div className="row-name">{m.id}{missing.length > 0 && <span className="tag">להשלים: {missing.length}</span>}{m.id in texts && <span className="tag">הנוסח שלך</span>}</div>
                  <div className="row-step">{m.id === THANKS ? 'בערב של יום התערוכה, לכל מי שנרשם' : `אחרי: ${m.after.join(' · ')}`}</div>
                  <div className="row-id">{fill(body, me, SAMPLE).split('\n').find((l, n) => n > 0 && l.trim() && !l.startsWith('לכבוד')) ?? ''}</div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Soon title="איך הן יוצאות">היום: בנגיעה מכרטיס המשימה. נפתח וואטסאפ או מייל עם ההודעה מוכנה, ואתה לוחץ שלח. בהמשך: חיבור הוואטסאפ שלך בסריקת קוד, ומייל שיוצא לבד. הודעה לכמה אנשים יחד תצא במייל, כדי לא לסכן את המספר שלך.</Soon>
    </div>
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
        <div className="who"><b>{id}</b><span className="ctx">{id === THANKS ? 'בערב של יום התערוכה, לכל מי שנרשם' : `אחרי: ${after.join(' · ')}`}</span></div>
        <button type="button" className="sq" aria-label="סגירה" onClick={onClose}><Icon name="close" /></button>
      </div>
      <label className="field" htmlFor="msg-body">הנוסח
        <textarea id="msg-body" className="area" rows={Math.max(5, draft.split('\n').length + 1)} value={draft} onChange={(e) => setDraft(e.target.value)} />
      </label>
      <p className="faint small">[שם] יוחלף בשם המבקר, ו־[שם המציג], [העסק] ו־[טלפון] בפרטים שלך. הפנייה ("שלום" או "לכבוד") נקבעת בהגדרות.</p>
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
  async function choose(g: 'shalom' | 'kavod') { setG(g); await setGreeting(ctx.exhibitor.id, g).catch(() => {}); dispatchEvent(new Event('expo-greeting')); }
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
      <SelfSign ctx={ctx} />
      <Soon title="חיבור הוואטסאפ שלך">סורקים קוד QR מהטלפון, כמו בוואטסאפ ווב, וההודעות יוצאות מהמספר שלך. אפשר לנתק בכל רגע.</Soon>
      <Soon title="קריאת תשובות">באישורך בלבד: המערכת רואה רק תשובות של מבקרים שנרשמו אצלך, כדי לעצור את המעקב כשמישהו ענה.</Soon>
      <Signature ctx={ctx} />
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
  if (steps) {
    return <>{question}<SetupSteps start={ctx.setup} business={ctx.exhibitor.business} onCancel={() => setSteps(false)} onSave={(next, names) => apply(next, names)} /></>;
  }
  return (
    <>
      {question}
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

      {!draft && <Versions ctx={ctx} key={saved} onRestore={(old) => apply(old, [])} />}

      {(s.anchor.goal || s.anchor.success) && (
        <section className="panel-w"><h2>מה תהיה הצלחה בתערוכה</h2><p>{s.anchor.goal}</p>{s.anchor.success && <p className="muted">{s.anchor.success}</p>}</section>
      )}

      <section className={draft ? 'held' : 'panel-w'}>
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
      </section>

      <section className="panel-w">
        <h2>מה קורה אחרי התערוכה</h2>
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
      </section>

      {draft && (
        <div className="row">
          <button type="button" className="btn primary tall" disabled={busy || JSON.stringify(draft) === JSON.stringify(ctx.setup)} onClick={save}>שמירת השינויים</button>
          <button type="button" className="btn tall" disabled={busy} onClick={() => { setDraft(null); setRenames([]); }}>ביטול</button>
        </div>
      )}
      {saved && <p className="note">{saved}</p>}
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


// ---------- ניהול (למנהל התערוכה): outside the system's menus, reached from the settings

// ---------- the two lists, from a file: Excel → "שמירה בשם" → CSV. The rows go from the browser straight to the server.

const LISTS = {
  exhibitors: {
    title: 'רשימת המציגים מהמארגן', fields: EXHIBITOR_FIELDS, need: 'email',
    about: 'מי שהמייל שלו ברשימה נכנס לדוכן בלי לחכות לאישור. מי שכבר נרשם וממתין, ומופיע ברשימה, מאושר עכשיו.',
    names: { email: 'מייל', name: 'שם', business: 'עסק' } as Record<string, string>,
  },
  people: {
    title: 'רשימת הקהילה', fields: PEOPLE_FIELDS, need: 'full_name',
    about: 'השמות שהדוכן מחפש בהם. בטלפון של המציג נשמרים רק שם ועיר; הטלפון והמייל נשארים בשרת, ונפתחים רק למציג שהמבקר נרשם אצלו.',
    names: { full_name: 'שם', first: 'שם פרטי', last: 'שם משפחה', city: 'עיר', phone: 'טלפון', email: 'מייל', business_owner: 'בעל עסק', business_name: 'שם העסק' } as Record<string, string>,
  },
};

function ListLoad({ kind, onDone }: { kind: keyof typeof LISTS; onDone: () => void }) {
  const L = LISTS[kind];
  const [file, setFile] = useState<{ name: string; header: string[]; rows: string[][] } | null>(null);
  const [cols, setCols] = useState<Record<string, number>>({});
  const [replace, setReplace] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState('');
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => { adminCounts().then((c) => setCount(c ? (kind === 'people' ? c.people : c.listed) : null)).catch(() => {}); }, [kind, result]);
  async function pick(f: File | undefined) {
    if (!f) return;
    setResult('');
    const all = parseCsv(await f.text());
    const header = all[0] ?? [];
    setFile({ name: f.name, header, rows: all.slice(1) });
    setCols(mapColumns(header, L.fields as Fields));
  }
  const ready = file && (L.need in cols || (kind === 'people' && ('first' in cols || 'last' in cols)));
  const records = useMemo(() => (file ? toRecords(file.rows, cols) : []), [file, cols]);
  async function load() {
    if (!file) return;
    setResult('');
    try {
      if (kind === 'exhibitors') {
        setProgress('טוען…');
        const r = await adminLoadExhibitors(records);
        setResult(`נטענו ${r.rows} מציגים. ${r.approved ? `${r.approved} שחיכו אושרו עכשיו.` : ''}`);
      } else {
        let removed = 0, added = 0;
        if (replace) { setProgress('מוציא את השמות הקודמים…'); removed = await adminClearPeople(); }
        for (let i = 0; i < records.length; i += 500) {
          setProgress(`טוען ${Math.min(i + 500, records.length)} מתוך ${records.length}…`);
          added += (await adminLoadPeople(records.slice(i, i + 500))).added;
        }
        setResult(`נוספו ${added} אנשים${removed ? `, ו־${removed} שמות קודמים יצאו` : ''}. שמות שכבר היו (אותו שם ואותו טלפון) לא נוספו שוב.`);
      }
      setFile(null); onDone();
    } catch (e) { setResult('לא נטען: ' + String((e as Error).message ?? e)); }
    finally { setProgress(''); }
  }
  return (
    <section className={file ? 'held' : 'panel-w'}>
      <h2>{L.title}{count !== null && <span className="muted small"> · {count} עכשיו</span>}</h2>
      <p className="muted">{L.about}</p>
      {!file ? (
        <>
          <label className="btn" style={{ alignSelf: 'start' }}>
            בחירת קובץ CSV
            <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          <p className="faint small">מאקסל: קובץ ← שמירה בשם ← CSV UTF-8. השורה הראשונה היא הכותרות.</p>
        </>
      ) : (
        <>
          <p><b>{file.name}</b> · {file.rows.length} שורות</p>
          <div className="stack">
            <span className="sec">העמודות שזוהו</span>
            <ul className="list">
              {Object.keys(L.fields).filter((f) => f in cols).map((f) => <li key={f} className="list-row"><div className="row-name">{L.names[f]}</div><div className="row-step">מהעמודה "{file.header[cols[f]!]}"</div></li>)}
            </ul>
            {file.header.some((_, i) => !Object.values(cols).includes(i)) && (
              <p className="faint small">לא בשימוש: {file.header.filter((_, i) => !Object.values(cols).includes(i)).join(' · ')}</p>
            )}
          </div>
          {!ready && <p className="note">לא מצאתי עמודת {L.names[L.need]}. כדאי לבדוק שהשורה הראשונה בקובץ היא הכותרות.</p>}
          {ready && records[0] && (
            <div className="stack">
              <span className="sec">השורה הראשונה, כמו שתיטען</span>
              <div className="note preview">{Object.entries(records[0]).map(([k, v]) => `${L.names[k] ?? k}: ${v === true ? 'כן' : v === false ? 'לא' : v || '—'}`).join('\n')}</div>
            </div>
          )}
          {kind === 'people' && ready && (
            <div className="switchrow">
              <span>במקום השמות שיש עכשיו (מי שכבר נרשם בדוכן נשאר)</span>
              <button type="button" className="switch" role="switch" aria-checked={replace} aria-label="במקום השמות שיש עכשיו" onClick={() => setReplace(!replace)} />
            </div>
          )}
          <div className="row">
            <button type="button" className="btn primary" disabled={!ready || !!progress} onClick={load}>{progress || `לטעון ${records.length} שורות`}</button>
            <button type="button" className="btn" disabled={!!progress} onClick={() => setFile(null)}>ביטול</button>
          </div>
        </>
      )}
      {result && <p className="note">{result}</p>}
    </section>
  );
}

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
      <ListLoad kind="exhibitors" onDone={reload} />
      <ListLoad kind="people" onDone={reload} />
    </div>
  );
}
