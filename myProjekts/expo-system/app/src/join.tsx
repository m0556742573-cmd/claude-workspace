// Self-registration: the visitor scans the code on the booth's sign and registers himself — a name, a phone, and what
// interests him, from the same buttons as the exhibitor's card. No sign-in: the page sees only the booth's name and
// its buttons (join_info), and can only add one visitor (join_booth). The lead lands in the exhibitor's booth list.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import qrcode from 'qrcode-generator';
import { fileUrl, joinBooth, joinInfo, type JoinInfo } from './lib/backend.ts';

const ASKS_DATE = /\s*\(מתי\?\)\s*$/;
/** On the visitor's page a button reads without the "(מתי?)" the exhibitor sees; a date field opens instead. */
const shown = (label: string) => label.replace(ASKS_DATE, '');

/** The sign always carries the public address (30/10), even when the exhibitor opened the booth at the old one. */
const PUBLIC = location.hostname === 'localhost' ? location.origin : 'https://expo.y-h-m.com';
export const joinUrl = (code: string) => `${PUBLIC}/#join/${code}`;

export function Join({ code }: { code: string }) {
  const [info, setInfo] = useState<JoinInfo | null | undefined>(undefined);
  const [f, setF] = useState({ name: '', phone: '', email: '' });
  const [taps, setTaps] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'' | 'busy' | 'done' | 'again'>('');
  const [error, setError] = useState('');

  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  // A weak network is not "the booth was not found" (30/10): it says so, and offers to try again.
  useEffect(() => { setFailed(false); joinInfo(code).then(setInfo).catch(() => setFailed(true)); }, [code, tries]);
  useEffect(() => { if (info) document.title = `הרשמה · ${info.business || info.name}`; }, [info]);

  if (failed && info === undefined) return <JoinBox title="אין חיבור כרגע"><p className="muted">הדף לא נטען. כדאי לבדוק את האינטרנט ולנסות שוב.</p><button type="button" className="btn" onClick={() => setTries(tries + 1)}>לנסות שוב</button></JoinBox>;
  if (info === undefined) return <JoinBox title="רגע…" />;
  if (!info) return <JoinBox title="הדוכן לא נמצא"><p className="muted">אולי הקישור לא שלם. אפשר לסרוק שוב את הקוד שעל השלט.</p></JoinBox>;

  const who = info.business || info.name;
  const wantsDate = taps.some((t) => ASKS_DATE.test(t));
  const phoneOk = f.phone.replace(/\D/g, '').replace(/^972/, '0').length >= 9;
  const ready = f.name.trim().length >= 2 && phoneOk;
  const toggle = (label: string) => setTaps(taps.includes(label) ? taps.filter((t) => t !== label) : [...taps, label]);

  async function send() {
    setState('busy'); setError('');
    try {
      const r = await joinBooth(code, { ...f, taps, consent, date: wantsDate && date ? date : null });
      setState(r.again ? 'again' : 'done');
    } catch (e) {
      const m = String((e as Error).message ?? e);
      setError(m.includes('phone') ? 'מספר הטלפון לא נראה שלם. כדאי לבדוק אותו.'
        : m.includes('email') ? 'המייל לא נראה תקין. אפשר גם להשאיר אותו ריק.'
          : m.includes('name') ? 'צריך שם, לפחות שתי אותיות.'
            : m.includes('busy') ? 'יש עומס רגעי בדוכן. אפשר לנסות שוב בעוד דקה.'
              : m.includes('closed') ? 'התערוכה הסתיימה, וההרשמה בדוכן הזה נסגרה.'
              : 'משהו לא עבד. אפשר לנסות שוב, או לגשת לדוכן.');
      setState('');
    }
  }

  if (state === 'done' || state === 'again') {
    const first = f.name.trim().split(/\s+/)[0];
    return (
      <JoinBox title={`תודה, ${first}`} by={who} logo={info.logo}>
        <p>{state === 'again' ? 'כבר היית רשום היום. הוספנו את מה שסימנת עכשיו.' : `נרשמת אצל ${who}.`}</p>
        <p className="muted">{info.sensitive && !consent ? 'נחזור אליך רק אם יהיה צורך.' : 'נחזור אליך על מה שסימנת.'} אפשר לבקש להסיר בכל רגע.</p>
        <button type="button" className="text-btn" onClick={() => { setF({ name: '', phone: '', email: '' }); setTaps([]); setDate(''); setConsent(false); setState(''); }}>לרשום עוד מישהו</button>
      </JoinBox>
    );
  }

  const questions: [string, string[]][] = [['מה מעניין אותך?', info.needs], ['מתי?', info.when], ['מי אתה?', info.who]];
  return (
    <JoinBox title="הרשמה" by={who} logo={info.logo}>
      <p className="muted">משאירים שם וטלפון, ו{info.name} יחזור אליך. הסימונים למטה עוזרים להכין לך בדיוק את מה שמתאים.</p>
      <div className="stack">
        <div className="typed">
          <label className="field" htmlFor="j-name">שם מלא<input id="j-name" className="input" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="field" htmlFor="j-phone">טלפון<input id="j-phone" className="input" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: 'right' }} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <label className="field" htmlFor="j-email">מייל (לא חובה)<input id="j-email" className="input" type="email" inputMode="email" autoComplete="email" dir="ltr" style={{ textAlign: 'right' }} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        </div>
        {questions.filter(([, items]) => items.length).map(([q, items]) => (
          <div className="q-block" key={q}>
            <span className="sec">{q}</span>
            <div className="chips">
              {items.map((label) => <button key={label} type="button" className="chip" aria-pressed={taps.includes(label)} onClick={() => toggle(label)}>{shown(label)}</button>)}
            </div>
          </div>
        ))}
        {wantsDate && <label className="field" htmlFor="j-date">התאריך<input id="j-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ justifySelf: 'start' }} /></label>}
        {info.sensitive && (
          <div className="chips"><button type="button" className="chip" aria-pressed={consent} onClick={() => setConsent(!consent)}>מסכים לקבל עדכונים</button></div>
        )}
        <button type="button" className="btn primary tall wide" disabled={!ready || state === 'busy'} onClick={send}>{state === 'busy' ? 'שולח…' : 'הרשמה'}</button>
        {error && <p className="err" role="alert">{error}</p>}
        <p className="faint small">{info.sensitive ? 'הפרטים נשארים אצל המציג בלבד.' : `בהרשמה ${info.name} יוכל לשלוח לך הודעות על מה שסימנת. אפשר לבקש להסיר בכל רגע.`}</p>
      </div>
    </JoinBox>
  );
}

/** The page heads with the booth's own logo when it has one (30/10). */
function JoinBox({ title, by, logo, children }: { title: string; by?: string; logo?: string | null; children?: ReactNode }) {
  return (
    <div className="gate">
      <section className="gate-box join">
        <div className="brand">{logo ? <img className="mark logo" src={fileUrl(logo)} alt="" /> : <span className="mark" aria-hidden="true" />}<span className="biz">{by ?? 'אקספומקס'}</span></div>
        <h1>{title}</h1>
        {children}
      </section>
    </div>
  );
}

/** The booth's code, drawn as squares (no picture from outside, so it prints sharp at any size). */
export function Qr({ text, size = 220 }: { text: string; size?: number }) {
  const d = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let path = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) path += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { n: n + 8, path };
  }, [text]);
  return (
    <svg className="qr" width={size} height={size} viewBox={`0 0 ${d.n} ${d.n}`} role="img" aria-label="קוד להרשמה" shapeRendering="crispEdges">
      <rect width={d.n} height={d.n} fill="#fff" />
      <path d={d.path} fill="#000" />
    </svg>
  );
}
