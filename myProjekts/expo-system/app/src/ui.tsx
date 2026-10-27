// The pieces every screen is built from, from the brand book (artifact PhXCTLxz4Xu6GhDPCaUaMK, 19-20/10):
// line icons on a 24 grid with square caps; one title per screen with a "?" beside it; small grey section labels.
import { useEffect, useState, type ReactNode } from 'react';

const PATHS = {
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Z M16 16l5 5',
  check: 'M4 12l5 5L20 6',
  home: 'M4 11l8-7 8 7v10H4Z M10 21v-6h4v6',
  leads: 'M4 20v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2 M9 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6 M16 20v-2a5 5 0 0 0-2-4 M15 4a3 3 0 0 1 0 6',
  tasks: 'M5 5h14v14H5Z M8 12l3 3 5-6',
  bars: 'M3 21h18 M6 21V11 M12 21V4 M18 21v-7',
  mail: 'M3 5h18v14H3Z M3 6l9 7 9-7',
  help: 'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14 M12 17h.01',
  phone: 'M4 4h5l1.5 5L8 11a11 11 0 0 0 5 5l2-1.5 5 1.5v5h-1C9 21 4 16 4 5Z',
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
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, stroke = 1.75 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg className="ic" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true"><path d={PATHS[name]} /></svg>
  );
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

export function Tiles({ items }: { items: [number | string, string, boolean?][] }) {
  return (
    <div className="tiles">
      {items.map(([n, k, late]) => (
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
