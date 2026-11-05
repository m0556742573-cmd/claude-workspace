// The pieces every screen is built from. Icons: the YHM set of the ExpoMax design system (31/10): a 24 grid, a 1.75
// line with round caps; where the design system draws an icon (check, phone, mail, plus) its drawing is used.
// One title per screen with a "?" beside it; small section labels.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SAVED } from './lib/saved.ts';

const PATHS = {
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z M16 16l5 5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  key: 'M15 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z M12.2 11.8 4 20 M6 18l2 2 M8.5 15.5l2 2',
  home: 'M4 11l8-7 8 7v10H4Z M10 21v-6h4v6',
  leads: 'M4 20v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2 M9 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6 M16 20v-2a5 5 0 0 0-2-4 M15 4a3 3 0 0 1 0 6',
  tasks: 'M5 5h14v14H5Z M8 12l3 3 5-6',
  bars: 'M3 21h18 M6 21V11 M12 21V4 M18 21v-7',
  mail: 'M3.5 6.5h17v11h-17z M3.5 7.5l8.5 6 8.5-6',
  help: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14 M12 17h.01',
  phone: 'M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z',
  gear: 'M15 12a3 3 0 1 1-6 0 3 3 0 1 1 6 0Z M12 4v3 M12 17v3 M4 12h3 M17 12h3 M6.3 6.3l2.2 2.2 M15.5 15.5l2.2 2.2 M17.7 6.3l-2.2 2.2 M8.5 15.5l-2.2 2.2',
  play: 'M8 5l11 7-11 7Z',
  video: 'M3 5h18v14H3Z M10 9l5 3-5 3Z',
  plus: 'M12 5v14 M5 12h14',
  fold: 'M9 6l6 6-6 6',
  unfold: 'M15 6l-6 6 6 6',
  stand: 'M3 9l2-5h14l2 5Z M5 9v11h14V9 M9 20v-6h6v6',
  crm: 'M4 8h16v12H4Z M9 8V5h6v3 M4 13h16',
  // Two more in the same hand, for the booth's card: a microphone and a pen.
  mic: 'M9 3h6v10H9Z M5 11a7 7 0 0 0 14 0 M12 18v3 M8 21h8',
  pen: 'M4 20h4L19 9l-4-4L4 16Z M13 7l4 4',
  close: 'M6 6l12 12 M18 6L6 18',
  // The consultant (2/11): a spark, in the same line.
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7Z',
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, stroke = 1.75 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATHS[name]} /></svg>
  );
}

// The two looks of the design system (31/10): forest (dark, the default) and snow (light). Kept on this device; the
// page's head reads it before anything paints.
export type Theme = 'forest' | 'snow';
export const themeNow = (): Theme => (document.documentElement.dataset.theme === 'snow' ? 'snow' : 'forest');
export function setTheme(t: Theme) {
  if (t === 'snow') document.documentElement.dataset.theme = 'snow'; else delete document.documentElement.dataset.theme;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', '#0B1A13'); // both themes: the top bar is forest
  try { localStorage.setItem('expo-theme', t); } catch { /* the device may not keep it */ }
}

// One way to save (2/11, the UX proposal): every change is kept at once (lib/saved.ts), and this says so for two seconds.
export { notifySaved } from './lib/saved.ts';
export function SavedToast() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const f = () => { setOn(true); clearTimeout(t); t = setTimeout(() => setOn(false), 2000); };
    addEventListener(SAVED, f);
    return () => { removeEventListener(SAVED, f); clearTimeout(t); };
  }, []);
  return on ? <div className="saved-toast" role="status">נשמר ✓</div> : null;
}

// The "?" beside each title. There are no videos yet, so it opens a few words about the screen;
// a switch in the settings hides them all ("להציג הסבר ליד כל מסך").
const TIPS_KEY = 'expo-tips';
export function tipsOn(): boolean {
  try { return localStorage.getItem(TIPS_KEY) !== 'off'; } catch { return true; }
}
export function setTipsOn(on: boolean) {
  try { localStorage.setItem(TIPS_KEY, on ? 'on' : 'off'); } catch { /* the phone may not keep it */ }
  dispatchEvent(new Event('expo-tips'));
}
function useTips(): boolean {
  const [on, setOn] = useState(tipsOn);
  useEffect(() => { const f = () => setOn(tipsOn()); addEventListener('expo-tips', f); return () => removeEventListener('expo-tips', f); }, []);
  return on;
}

export function PageHead({ title, eyebrow, sub, tip, actions }: { title: string; eyebrow?: string; sub?: ReactNode; tip?: string; actions?: ReactNode }) {
  const show = useTips();
  const [open, setOpen] = useState(false);
  return (
    <div className="head">
      <div className="head-main">
        {eyebrow && <div className="sec eyebrow">{eyebrow}</div>}
        <div className="title">
          <h1>{title}</h1>
          {tip && show && <button type="button" className="q" aria-expanded={open} aria-label="הסבר על המסך הזה" onClick={() => setOpen(!open)}>?</button>}
        </div>
        {sub && <p className="date">{sub}</p>}
        {open && tip && show && (
          <div className="tip" role="dialog" aria-label="הסבר על המסך הזה">
            <p>{tip}</p>
            <p className="faint small">סרטון הסבר קצר יופיע כאן בקרוב.</p>
            <button type="button" className="text-btn" onClick={() => setOpen(false)}>סגירה</button>
          </div>
        )}
      </div>
      {actions && <div className="head-acts">{actions}</div>}
    </div>
  );
}

export function Tiles({ items, onPick }: { items: [number | string, string, boolean?][]; onPick?: (label: string) => void }) {
  return (
    <div className="tiles">
      {items.map(([n, k, late]) => onPick ? (
        <button key={k} type="button" className="tile" onClick={() => onPick(k)}><div className={'num' + (late ? ' late' : '')}>{n}</div><div className="tile-k">{k}</div></button>
      ) : (
        <div key={k} className="tile"><div className={'num' + (late ? ' late' : '')}>{n}</div><div className="tile-k">{k}</div></div>
      ))}
    </div>
  );
}

/** 16 → ט״ז, 20 → כ׳: the day of the Hebrew month in letters. */
function hebDay(n: number): string {
  const tens = ['', 'י', 'כ', 'ל'][Math.floor(n / 10)]!, ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'][n % 10]!;
  const s = n === 15 ? 'טו' : n === 16 ? 'טז' : tens + ones;
  return s.length > 1 ? `${s.slice(0, -1)}״${s.slice(-1)}` : `${s}׳`;
}

/** "יום שלישי, ט״ז בחשוון (27/10)" — the Hebrew date first, the civil one after it in grey. */
export function longDate(d = new Date()): ReactNode {
  let heb = '';
  try {
    const parts = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long' }).formatToParts(d);
    const day = Number(parts.find((p) => p.type === 'day')?.value), month = parts.find((p) => p.type === 'month')?.value;
    if (day && month) heb = `${hebDay(day)} ב${month.replace(/^ב/, '')}`;
  } catch { /* old phone */ }
  const day = new Intl.DateTimeFormat('he', { weekday: 'long' }).format(d);
  return <>{day}{heb ? `, ${heb}` : ''} <span>({d.getDate()}/{d.getMonth() + 1})</span></>;
}

// ---------- the date picker (יצחק, 4/11: "תאריכים עבריים במסך של בחירת תאריך בכל מקום באקספו מקס")
// A month of the Hebrew calendar: each day by its Hebrew letters, with the civil day small under it. The chosen date
// reads Hebrew first and civil after it, like longDate. The value stays a civil YYYY-MM-DD, so nothing that stores,
// sends or compares a date changes. A phone whose Intl has no Hebrew calendar keeps the browser's own picker.
// Days are counted at noon UTC, so no time zone moves a date across midnight.

const DAY = 86_400_000;
const atNoon = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y!, m! - 1, d!, 12); };
const isoOf = (t: number) => new Date(t).toISOString().slice(0, 10);
const HEB = (() => { try { return new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch { return null; } })();
function hebOf(t: number) {
  const parts = HEB!.formatToParts(new Date(t)), get = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
  return { day: Number(get('day')), month: get('month'), year: Number(get('year')) };
}
const HAS_HEB = (() => { try { return !!HEB && hebOf(Date.UTC(2026, 10, 5, 12)).year === 5787; } catch { return false; } })();
const CIVIL_MONTH = new Intl.DateTimeFormat('he', { month: 'long', timeZone: 'UTC' });

/** 5787 → תשפ״ז: the year in letters, without the thousands, as it is written. */
function hebYear(y: number): string {
  let n = y % 1000, s = '';
  while (n >= 400) { s += 'ת'; n -= 400; }
  if (n >= 100) { s += ' קרש'[Math.floor(n / 100)]; n %= 100; }
  s += n === 15 ? 'טו' : n === 16 ? 'טז'
    : ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'][Math.floor(n / 10)]! + ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'][n % 10]!;
  return s.length > 1 ? `${s.slice(0, -1)}״${s.slice(-1)}` : `${s}׳`;
}
const hebFull = (t: number) => { const h = hebOf(t); return `${hebDay(h.day)} ב${h.month} ${hebYear(h.year)}`; };
const civil = (t: number) => { const d = new Date(t); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`; };
const monthStart = (t: number) => t - (hebOf(t).day - 1) * DAY;
const monthLength = (start: number) => (hebOf(start + 29 * DAY).day === 1 ? 29 : 30);
/** "אוקטובר–נובמבר 2026": the civil months a Hebrew month falls in. */
function civilSpan(start: number, end: number): string {
  const a = new Date(start), b = new Date(end);
  if (a.getUTCMonth() === b.getUTCMonth()) return `${CIVIL_MONTH.format(a)} ${a.getUTCFullYear()}`;
  return a.getUTCFullYear() === b.getUTCFullYear()
    ? `${CIVIL_MONTH.format(a)}–${CIVIL_MONTH.format(b)} ${b.getUTCFullYear()}`
    : `${CIVIL_MONTH.format(a)} ${a.getUTCFullYear()}–${CIVIL_MONTH.format(b)} ${b.getUTCFullYear()}`;
}

export function DateField({ value, onChange, min, disabled, id, label, clearable = false, className = '' }: {
  value: string; onChange: (iso: string) => void; min?: string; disabled?: boolean; id?: string;
  /** For a field with no visible label around it. */ label?: string; clearable?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(0); // noon of the 1st of the Hebrew month shown
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!HAS_HEB) {
    return <input id={id} className={`input ${className}`} type="date" aria-label={label} value={value} min={min} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }
  const today = atNoon(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date()));
  const minT = min ? atNoon(min) : -Infinity;
  const pick = (iso: string) => { onChange(iso); setOpen(false); };
  const len = open ? monthLength(month) : 0, head = open ? hebOf(month) : null;
  return (
    <span className={`datef ${className}`} ref={box}>
      <button id={id} type="button" className="input datef-btn" aria-label={label} aria-haspopup="dialog" aria-expanded={open} disabled={disabled}
        onClick={() => { if (!open) setMonth(monthStart(value ? atNoon(value) : Math.max(today, minT))); setOpen(!open); }}>
        {value ? <><b>{hebFull(atNoon(value))}</b><small>{civil(atNoon(value))}</small></> : <span className="datef-empty">בחירת תאריך</span>}
      </button>
      {open && head && (
        // Inside a <label>, a click on the panel itself would press the button again and close it.
        <div className="datef-pop" role="dialog" aria-label={label ?? 'בחירת תאריך'} onClick={(e) => e.preventDefault()}>
          <div className="datef-head">
            <button type="button" className="datef-nav" aria-label="החודש הקודם" onClick={() => setMonth(monthStart(month - DAY))}>›</button>
            <div><b>{head.month} {hebYear(head.year)}</b><small>{civilSpan(month, month + (len - 1) * DAY)}</small></div>
            <button type="button" className="datef-nav" aria-label="החודש הבא" onClick={() => setMonth(month + len * DAY)}>‹</button>
          </div>
          <div className="datef-grid">
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((w) => <span key={w} className="datef-wd">{w}׳</span>)}
            {Array.from({ length: new Date(month).getUTCDay() }, (_, i) => <span key={`x${i}`} />)}
            {Array.from({ length: len }, (_, i) => month + i * DAY).map((t, i) => (
              <button key={t} type="button" className="datef-day" disabled={t < minT} aria-pressed={value === isoOf(t)}
                aria-current={t === today ? 'date' : undefined} aria-label={`${hebFull(t)}, ${civil(t)}`} onClick={() => pick(isoOf(t))}>
                <b>{hebDay(i + 1)}</b><small>{new Date(t).getUTCDate()}</small>
              </button>
            ))}
          </div>
          <div className="datef-foot">
            <button type="button" className="btn" disabled={today < minT} onClick={() => pick(isoOf(today))}>היום</button>
            {clearable && value && <button type="button" className="btn ghost" onClick={() => pick('')}>בלי תאריך</button>}
          </div>
        </div>
      )}
    </span>
  );
}
