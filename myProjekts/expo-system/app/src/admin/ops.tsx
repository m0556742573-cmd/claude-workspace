// משימות והחלטות, ומצב הפלטפורמות (יצחק, 3/11): "שכל החלטות והדברים הפתוחים וכל מה שאני אמור לנהל ולעקוב חייב להיות
// מתוך הניהול של האקספו כמו מערכת ניהול משימות אחרת דברים יאבדו", "אני רוצה סטטוס מצב בניהול האקספו כל הזמן", and
// "תוודא שתוכנית הניהול יהיה באמת אפקטיבי בלי לטבוע בים של דברים לא מובנים". So the first view is only what waits on him,
// most urgent first, in three bands; everything else is one tab away. The data is in the `ops` schema (migration 0046),
// read and written only through public.ops_*, which check is_admin(); every change to an item is kept on the server.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateField, PageHead } from '../ui.tsx';
import { supabase } from '../lib/backend.ts';
import { adminKeys } from '../lib/wa.ts';
import './ops.css';

type Kind = 'task' | 'decision' | 'bug' | 'finding';
type Status = 'open' | 'doing' | 'blocked' | 'done' | 'dropped';
type Level = 'ok' | 'warn' | 'bad' | 'unknown';
interface OpsItem {
  id: string; kind: Kind; track: string; title: string; detail: string | null; owner: 'yitzhak' | 'claude'; status: Status;
  priority: 'high' | 'medium' | 'low'; due: string | null; note: string | null; reply: string | null; check_how: string | null;
  source: string | null; created_by: string | null; created_at: string; updated_at: string; done_at: string | null;
}
interface LogRow { at: string; by: string | null; field: string; old: string | null; new: string | null }
interface OpsCheck {
  key: string; platform: string; label: string; level: Level; value: string | null; detail: string | null; expires_on: string | null;
  source: 'watch' | 'server' | 'db' | 'manual'; checked_at: string | null; since: string; stale?: boolean;
}
interface CheckLog { key: string; at: string; level: Level; value: string | null }

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}
const opsItems = () => rpc<OpsItem[]>('ops_items');
const opsSaveItem = (p: Partial<OpsItem>) => rpc<OpsItem>('ops_save_item', { p });
const opsItemLog = (id: string) => rpc<LogRow[]>('ops_item_log', { p_id: id });
const opsChecks = () => rpc<{ now: string; checks: OpsCheck[]; log: CheckLog[] }>('ops_checks');

const TRACKS: Record<string, string> = {
  tech: 'טכנולוגיה', build: 'בנייה', connect: 'חיבורים', dayof: 'יום האקספו', marketing: 'שיווק', security: 'אבטחה',
  qa: 'בדיקות', guides: 'מדריכים',
};
const KINDS: Record<Kind, string> = { task: 'משימה', decision: 'החלטה', bug: 'תקלה', finding: 'ממצא' };
const STATUSES: [Status, string][] = [['open', 'פתוח'], ['doing', 'בטיפול'], ['blocked', 'מחכה'], ['done', 'נעשה'], ['dropped', 'ירד']];
const statusLabel = (s: Status) => STATUSES.find(([k]) => k === s)![1];
const FIELDS: Record<string, string> = {
  created: 'נוצר', title: 'כותרת', detail: 'פירוט', kind: 'סוג', track: 'מסלול', owner: 'אצל מי', status: 'מצב',
  priority: 'עדיפות', due: 'תאריך יעד', note: 'התשובה שלך', reply: 'Claude עונה', check_how: 'איך בודקים',
};
const isDone = (i: OpsItem) => i.status === 'done' || i.status === 'dropped';
/** What waits on him: his, and not waiting on someone else (the organiser, a price decision). */
const forHim = (i: OpsItem) => i.owner === 'yitzhak' && (i.status === 'open' || i.status === 'doing');

/** Today in Israel, as YYYY-MM-DD, so "late" means late where he is. */
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
const dayLabel = (d: string) => { const [, m, day] = d.split('-'); return `${Number(day)}/${Number(m)}`; };
const daysFrom = (d: string) => Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(today() + 'T00:00:00Z')) / 86400000);
const clock = (t: string) => new Date(t).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
/** Now: late, due within three days, or marked urgent. Soon: has a date further on. Later: no date. */
const band = (i: OpsItem): 0 | 1 | 2 =>
  (i.due && daysFrom(i.due) <= 3) || (i.priority === 'high' && !i.due) ? 0 : i.due ? 1 : 2;

// ---------- the strip on the overview

export function OpsStrip({ onTasks, onStatus }: { onTasks: () => void; onStatus: () => void }) {
  const [items, setItems] = useState<OpsItem[] | null>(null);
  const [checks, setChecks] = useState<OpsCheck[] | null>(null);
  useEffect(() => {
    opsItems().then(setItems).catch(() => setItems(null));
    opsChecks().then((r) => setChecks(r.checks)).catch(() => setChecks(null));
  }, []);
  const mine = items?.filter(forHim) ?? [];
  const late = mine.filter((i) => i.due && i.due < today()).length;
  const trouble = checks?.filter((c) => c.platform !== 'keys' && c.level === 'bad').length ?? 0;
  const attention = checks?.filter((c) => c.platform !== 'keys' && (c.level === 'warn' || c.level === 'unknown')).length ?? 0;
  return (
    <div className="ops-strip">
      <button type="button" className="ops-strip-b" onClick={onTasks}>
        <b>{items ? mine.length : '…'}</b>&nbsp;מחכים לך{late ? <span className="ops-late">&nbsp;· {late} באיחור</span> : null}
      </button>
      <button type="button" className="ops-strip-b" onClick={onStatus}>
        {checks === null ? 'מצב הפלטפורמות'
          : trouble ? <><span className="ops-dot bad" />{trouble} תקלות{attention ? ` · ${attention} לשים לב` : ''}</>
          : attention ? <><span className="ops-dot warn" />{attention} דורשים תשומת לב</>
          : <><span className="ops-dot ok" />הכל תקין</>}
      </button>
    </div>
  );
}

/** How many wait on him, for the menu. */
export function useWaitingCount(): number {
  const [n, setN] = useState(0);
  useEffect(() => { opsItems().then((r) => setN(r.filter(forHim).length)).catch(() => {}); }, []);
  return n;
}

// ---------- tasks and decisions

export type Filter = 'mine' | 'claude' | 'blocked' | 'dates' | 'done' | 'all';
const FILTERS: [Filter, string, (i: OpsItem) => boolean][] = [
  ['mine', 'מחכה לך', forHim],
  ['claude', 'אצל Claude', (i) => i.owner === 'claude' && !isDone(i) && i.status !== 'blocked'],
  ['blocked', 'מחכה למישהו אחר', (i) => i.status === 'blocked'],
  ['dates', 'לוח זמנים', (i) => !!i.due && !isDone(i)],
  ['done', 'נעשו', isDone],
  ['all', 'הכל', () => true],
];
const BANDS = ['עכשיו', 'בהמשך', 'בלי תאריך'];

export function TasksView({ initial = 'mine' }: { initial?: Filter }) {
  const [items, setItems] = useState<OpsItem[] | null | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>(initial);
  const [track, setTrack] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => { opsItems().then(setItems).catch(() => setItems(null)); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setFilter(initial); }, [initial]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([k, , f]) => [k, items?.filter(f).length ?? 0])) as Record<Filter, number>, [items]);
  const shown = useMemo(() => {
    const f = FILTERS.find(([k]) => k === filter)![2];
    const s = q.trim();
    const rows = (items ?? []).filter(f).filter((i) => !track || i.track === track)
      .filter((i) => !s || [i.title, i.detail ?? '', i.note ?? '', i.reply ?? ''].some((x) => x.includes(s)));
    if (filter === 'done') return rows.sort((a, b) => (b.done_at ?? b.updated_at).localeCompare(a.done_at ?? a.updated_at));
    const pri = (i: OpsItem) => (i.priority === 'high' ? 0 : i.priority === 'medium' ? 1 : 2);
    return rows.sort((a, b) => band(a) - band(b) || (a.due ?? '9999').localeCompare(b.due ?? '9999') || pri(a) - pri(b));
  }, [items, filter, track, q]);
  const tracks = useMemo(() => [...new Set((items ?? []).map((i) => i.track))], [items]);
  const banded = filter === 'mine' || filter === 'claude' || filter === 'dates';

  const head = <PageHead title="משימות והחלטות" sub={items ? `${counts.mine} מחכים לך` : undefined}
    tip="כל מה שפתוח באקספו: מה מחכה לך, מה אצל Claude, ולוח הזמנים. כל שינוי נשמר עם תאריך, אז שום דבר לא הולך לאיבוד." />;
  if (items === undefined) return <div className="page">{head}<p className="muted">טוען…</p></div>;
  if (items === null) return <div className="page">{head}<p className="muted">לא נטען: אין חיבור כרגע. <button type="button" className="text-btn" onClick={load}>לנסות שוב</button></p></div>;
  return (
    <div className="page">
      {head}
      <div className="tb-bar">
        <nav className="tabs" aria-label="סינון">
          {FILTERS.map(([k, l]) => (
            <button key={k} type="button" className="tab" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l} <span className="n">{counts[k]}</span></button>
          ))}
        </nav>
      </div>
      <div className="ops-bar">
        <input className="input" type="search" aria-label="חיפוש" placeholder="חיפוש" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" aria-label="מסלול" value={track} onChange={(e) => setTrack(e.target.value)}>
          <option value="">כל המסלולים</option>
          {tracks.map((t) => <option key={t} value={t}>{TRACKS[t] ?? t}</option>)}
        </select>
        <button type="button" className="btn primary" onClick={() => setAdding(true)}>＋ משימה</button>
      </div>
      {adding && <NewItem onDone={(saved) => { setAdding(false); if (saved) load(); }} />}
      {shown.length ? (
        <div className="ops-list">
          {shown.map((i, n) => (
            <div key={i.id}>
              {banded && (n === 0 || band(shown[n - 1]!) !== band(i)) && <div className="group-head ops-band"><span>{BANDS[band(i)]}</span></div>}
              <ItemRow i={i} open={open === i.id} onToggle={() => setOpen(open === i.id ? null : i.id)} onSaved={load} />
            </div>
          ))}
        </div>
      ) : <div className="empty"><p className="muted">{filter === 'mine' ? 'אין כלום שמחכה לך.' : 'אין כאן כלום.'}</p></div>}
    </div>
  );
}

function DueTag({ i }: { i: OpsItem }) {
  if (!i.due) return null;
  if (isDone(i)) return <span className="ops-due">{dayLabel(i.due)}</span>;
  const d = daysFrom(i.due);
  if (d < 0) return <span className="ops-due late">באיחור · {dayLabel(i.due)}</span>;
  if (d === 0) return <span className="ops-due soon">היום</span>;
  if (d === 1) return <span className="ops-due soon">מחר</span>;
  return <span className={'ops-due' + (d <= 3 ? ' soon' : '')}>{dayLabel(i.due)}</span>;
}

function ItemRow({ i, open, onToggle, onSaved }: { i: OpsItem; open: boolean; onToggle: () => void; onSaved: () => void }) {
  return (
    <article className={'ops-item' + (open ? ' open' : '') + (isDone(i) ? ' is-done' : '')}>
      <button type="button" className="ops-item-head" aria-expanded={open} onClick={onToggle}>
        <span className={'ops-kind k-' + i.kind}>{KINDS[i.kind]}</span>
        <span className="ops-title">{i.priority === 'high' && !isDone(i) ? <b className="ops-hi" title="דחוף">!</b> : null}{i.title}</span>
        <span className="ops-meta">
          <DueTag i={i} />
          <span className="ops-who">{i.owner === 'yitzhak' ? 'אתה' : 'Claude'}</span>
          <span className={'ops-st s-' + i.status}>{statusLabel(i.status)}</span>
        </span>
      </button>
      {open && <ItemBody i={i} onSaved={onSaved} />}
    </article>
  );
}

function ItemBody({ i, onSaved }: { i: OpsItem; onSaved: () => void }) {
  const [note, setNote] = useState(i.note ?? '');
  const [due, setDue] = useState(i.due ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [log, setLog] = useState<LogRow[] | null>(null);
  async function save(p: Partial<OpsItem>, said: string) {
    setBusy(true); setMsg('');
    try { await opsSaveItem({ id: i.id, ...p }); setMsg(said); onSaved(); if (log) setLog(await opsItemLog(i.id)); }
    catch (e) { setMsg('לא נשמר: ' + String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }
  return (
    <div className="ops-body">
      <div className="ops-tags">
        <span className="tag">{TRACKS[i.track] ?? i.track}</span>
        <span className="faint small">נוצר {clock(i.created_at)}{i.created_by ? ` · ${i.created_by}` : ''}</span>
      </div>
      {i.detail && <p className="ops-text">{i.detail}</p>}
      {i.check_how && <p className="ops-text"><b>איך יודעים שזה נעשה: </b>{i.check_how}</p>}
      {i.reply && <div className="ops-reply"><b>Claude עונה</b><p className="ops-text">{i.reply}</p></div>}
      <label className="field">התשובה שלך
        <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="מה אתה מחליט, או מה עוד חסר" />
      </label>
      <div className="row ops-row">
        <button type="button" className="btn primary" disabled={busy || note === (i.note ?? '')} onClick={() => save({ note }, 'התשובה נשמרה.')}>לשמור את התשובה</button>
        <label className="ops-date">תאריך יעד
          <DateField value={due} clearable
            onChange={(v) => { setDue(v); if (v !== (i.due ?? '')) save({ due: v || null }, 'התאריך נשמר.'); }} />
        </label>
      </div>
      <div className="chips" role="group" aria-label="מצב">
        {STATUSES.map(([s, l]) => (
          <button key={s} type="button" className="chip" aria-pressed={i.status === s} disabled={busy || i.status === s}
            onClick={() => save({ status: s }, `סומן: ${l}.`)}>{l}</button>
        ))}
        <button type="button" className="chip" disabled={busy} onClick={() => save({ owner: i.owner === 'yitzhak' ? 'claude' : 'yitzhak' }, 'הועבר.')}>
          {i.owner === 'yitzhak' ? 'להעביר ל-Claude' : 'להעביר אליי'}
        </button>
      </div>
      {msg && <p className="muted small" role="status">{msg}</p>}
      {log === null
        ? <button type="button" className="text-btn" onClick={() => opsItemLog(i.id).then(setLog).catch(() => setLog([]))}>היסטוריה</button>
        : (
          <ol className="ops-log">
            {log.map((l, n) => (
              <li key={n}><span className="faint">{clock(l.at)}</span> · {FIELDS[l.field] ?? l.field}
                {l.field !== 'created' && <>: <span className="muted">{short(l.old)}</span> ← <b>{short(l.new)}</b></>}
                {l.by ? <span className="faint"> · {l.by}</span> : null}</li>
            ))}
          </ol>
        )}
    </div>
  );
}
function short(s: string | null): string {
  if (s === null || s === '') return 'ריק';
  const v = STATUSES.find(([k]) => k === s)?.[1] ?? (s === 'yitzhak' ? 'אתה' : s === 'claude' ? 'Claude' : s);
  return v.length > 80 ? v.slice(0, 80) + '…' : v;
}

function NewItem({ onDone }: { onDone: (saved: boolean) => void }) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [kind, setKind] = useState<Kind>('task');
  const [owner, setOwner] = useState<'yitzhak' | 'claude'>('yitzhak');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function save() {
    if (!title.trim()) { setErr('חסר מה צריך לקרות.'); return; }
    setBusy(true);
    try { await opsSaveItem({ title: title.trim(), detail: detail.trim() || null, kind, owner, due: due || null, track: 'build' }); onDone(true); }
    catch (e) { setErr('לא נשמר: ' + String((e as Error).message ?? e)); setBusy(false); }
  }
  return (
    <section className="held">
      <h2>משימה חדשה</h2>
      <label className="field">מה צריך לקרות<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></label>
      <label className="field">פירוט (לא חובה)<textarea className="input" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} /></label>
      <div className="row ops-row">
        <div className="chips" role="group" aria-label="סוג">
          {(['task', 'decision'] as const).map((k) => <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{KINDS[k]}</button>)}
        </div>
        <div className="chips" role="group" aria-label="אצל מי">
          <button type="button" className="chip" aria-pressed={owner === 'yitzhak'} onClick={() => setOwner('yitzhak')}>אצלי</button>
          <button type="button" className="chip" aria-pressed={owner === 'claude'} onClick={() => setOwner('claude')}>אצל Claude</button>
        </div>
        <label className="ops-date">תאריך יעד<DateField value={due} onChange={setDue} clearable /></label>
      </div>
      {err && <p className="err">{err}</p>}
      <div className="row">
        <button type="button" className="btn primary" disabled={busy} onClick={save}>{busy ? 'שומר…' : 'להוסיף'}</button>
        <button type="button" className="btn" disabled={busy} onClick={() => onDone(false)}>ביטול</button>
      </div>
    </section>
  );
}

// ---------- the state of every platform

const PLATFORMS: [string, string][] = [
  ['expo', 'האקספו'], ['app', 'האפליקציה והניהול'], ['supabase', 'Supabase'], ['wa', 'וואטסאפ'], ['vps', 'השרת שלך'],
  ['mail', 'מייל'], ['google', 'Google'], ['anthropic', 'Anthropic'], ['backup', 'גיבוי'], ['cloudflare', 'Cloudflare'],
  ['domain', 'דומיין ותעודות'], ['site', 'האתר של YHM'], ['git', 'קוד'],
];
const LEVELS: Record<Level, string> = { ok: 'תקין', warn: 'לשים לב', bad: 'תקלה', unknown: 'לא ידוע' };
// Which check row shows which key slot on the server (admin/keys.tsx): its last four characters, never more.
const KEY_SLOTS: Record<string, string> = { 'key.anthropic': 'anthropic_key', 'key.cf_sending': 'cf_token', 'key.meta': 'meta_token' };

export function StatusView({ onDates }: { onDates: () => void }) {
  const [st, setSt] = useState<{ now: string; checks: OpsCheck[]; log: CheckLog[] } | null | undefined>(undefined);
  const [tails, setTails] = useState<Record<string, string | null>>({});
  const load = useCallback(() => { opsChecks().then(setSt).catch(() => setSt(null)); }, []);
  useEffect(() => {
    load();
    adminKeys().then((k) => setTails(k.keys)).catch(() => {});
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);
  const head = <PageHead title="מצב הפלטפורמות" sub={st ? `נבדק ${clock(st.now)}` : undefined}
    tip="כל שירות שהאקספו נשען עליו: האם הוא עובד, כמה נשאר עד המגבלה, ומתי משהו פג. מתעדכן לבד כל דקה." />;
  if (st === undefined) return <div className="page">{head}<p className="muted">טוען…</p></div>;
  if (st === null) return <div className="page">{head}<p className="err">המצב לא נטען. אם גם הדוכן לא עונה, ייתכן ש-Supabase למטה.</p><button type="button" className="btn" onClick={load}>לנסות שוב</button></div>;

  const checks = st.checks.filter((c) => c.platform !== 'keys');
  const keys = st.checks.filter((c) => c.platform === 'keys');
  const bad = checks.filter((c) => c.level === 'bad');
  const warn = checks.filter((c) => c.level === 'warn' || c.level === 'unknown');
  const watched = st.checks.filter((c) => c.source === 'watch' && c.checked_at).map((c) => c.checked_at!).sort().pop();
  const known = new Set(PLATFORMS.map(([p]) => p));
  const groups = [...PLATFORMS, ['other', 'אחר'] as [string, string]]
    .map(([p, name]) => [name, checks.filter((c) => (p === 'other' ? !known.has(c.platform) : c.platform === p))] as const)
    .filter(([, list]) => list.length)
    .sort((a, b) => rank(worst(a[1])) - rank(worst(b[1])));
  return (
    <div className="page">
      {head}
      <section className={'ops-sum ' + (bad.length ? 'bad' : warn.length ? 'warn' : 'ok')}>
        <b>{bad.length ? `${bad.length} תקלות` : warn.length ? `${warn.length} דורשים תשומת לב` : 'הכל תקין'}</b>
        <span className="muted">{watched ? `הבדיקה מבחוץ רצה לאחרונה ${clock(watched)}.` : 'הבדיקה האוטומטית מבחוץ עוד לא פועלת.'}</span>
        <button type="button" className="text-btn" onClick={onDates}>מה לחבר ומה לנתק, ומתי ←</button>
      </section>
      {bad.length > 0 && (
        <section className="card ops-now">
          <h2>מה לא בסדר עכשיו</h2>
          <ul className="ops-checks">{bad.map((c) => <CheckLine key={c.key} c={c} />)}</ul>
        </section>
      )}
      <div className="ops-grid">
        {groups.map(([name, list]) => (
          <section key={name} className="card ops-card">
            <h2><span className={'ops-dot ' + worst(list)} />{name}</h2>
            <ul className="ops-checks">{list.map((c) => <CheckLine key={c.key} c={c} />)}</ul>
          </section>
        ))}
      </div>
      <section className="card">
        <h2>מפתחות</h2>
        <p className="muted small">איפה כל מפתח שמור, ומתי מחליפים. בלי ערכים: לכל היותר ארבעת התווים האחרונים, ורק כשהשרת מחזיק את המפתח.</p>
        <div className="tb-wrap">
          <table className="tb">
            <thead><tr><th>מפתח</th><th>איפה שמור</th><th>פרטים</th><th>סוף</th><th>תוקף</th><th>מצב</th></tr></thead>
            <tbody>{keys.map((c) => {
              const slot = KEY_SLOTS[c.key];
              return (
                <tr key={c.key}>
                  <td className="stick"><b>{c.label}</b></td>
                  <td>{c.value ?? '—'}</td>
                  <td className="muted">{c.detail ?? ''}</td>
                  <td dir="ltr" className="tnum">{slot ? (tails[slot] ?? '—') : '—'}</td>
                  <td><Expiry d={c.expires_on} /></td>
                  <td><span className={'ops-dot ' + c.level} />{LEVELS[c.level]}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </section>
      {st.log.length > 0 && (
        <section className="card">
          <h2>מה השתנה</h2>
          <ol className="ops-log">
            {st.log.slice(0, 15).map((l, n) => {
              const c = st.checks.find((x) => x.key === l.key);
              return <li key={n}><span className="faint">{clock(l.at)}</span> · <span className={'ops-dot ' + l.level} />{c?.label ?? l.key}: {LEVELS[l.level]}{l.value ? ` · ${l.value}` : ''}</li>;
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

const rank = (l: Level) => ({ bad: 0, warn: 1, unknown: 2, ok: 3 })[l];
function worst(list: readonly OpsCheck[]): Level {
  return list.reduce<Level>((w, c) => (rank(c.level) < rank(w) ? c.level : w), 'ok');
}

function Expiry({ d }: { d: string | null }) {
  if (!d) return <>—</>;
  const n = daysFrom(d);
  return <span className={n < 0 ? 'ops-late' : n <= 14 ? 'ops-soon' : ''}>{dayLabel(d)}{n < 0 ? ' · פג' : n <= 60 ? ` · בעוד ${n} ימים` : ''}</span>;
}

function CheckLine({ c }: { c: OpsCheck }) {
  return (
    <li className="ops-check-line">
      <span className={'ops-dot ' + c.level} title={LEVELS[c.level]} />
      <span className="ops-cl-main">
        <b>{c.label}</b>{c.value ? <span> · {c.value}</span> : null}
        {c.detail && <span className="muted small ops-cl-detail">{c.detail}</span>}
        {c.stale && <span className="muted small ops-cl-detail">לא דיווח מאז {c.checked_at ? clock(c.checked_at) : '—'}.</span>}
      </span>
      <span className="faint small ops-cl-when">
        {c.expires_on ? <Expiry d={c.expires_on} /> : c.level !== 'ok' ? `מאז ${clock(c.since)}` : ''}
      </span>
    </li>
  );
}
