// The exhibitor's own details: the welcome after the first sign-in, and the same form in the settings.
// Name, business and phone are required (his notes, 20/10). WhatsApp is one question with three answers (2/11, the UX
// proposal: "רגיל או עסקי" was kept and used by nothing, and dropped): on this number, on another, or none — and none
// means no WhatsApp anywhere, the messages go by mail only. In the settings every change is kept at once.
import { useState } from 'react';
import { updateMe, type Exhibitor } from './lib/backend.ts';
import { MailInput, mailHints, mailProblem } from './mail.tsx';

type Wa = 'same' | 'other' | 'none';

export function MeForm({ exhibitor: e, onSaved, submit, welcome }: { exhibitor: Exhibitor; onSaved: (e: Exhibitor) => void; submit: string; welcome?: boolean }) {
  const [f, setF] = useState({ name: e.name, business: e.business, phone: e.phone ?? '', email: e.email ?? '' });
  const [wa, setWa] = useState<Wa | null>(e.whatsapp ? (e.whatsapp === e.phone ? 'same' : 'other') : e.onboarded ? 'none' : null);
  const [waNum, setWaNum] = useState(e.whatsapp && e.whatsapp !== e.phone ? e.whatsapp : '');
  const [state, setState] = useState('');
  const [mailLeft, setMailLeft] = useState(false);

  const build = (w: Wa | null, form = f, num = waNum) => {
    const whatsapp = w === 'same' ? form.phone.trim() || null : w === 'other' ? num.trim() || null : null;
    return {
      name: form.name.trim(), business: form.business.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null,
      whatsapp, whatsapp_kind: whatsapp ? e.whatsapp_kind : null, onboarded: true,
    };
  };
  const next = build(wa);
  const okFor = (w: Wa | null, n: ReturnType<typeof build>, mail: string) => !!(n.name && n.business && n.phone && !mailProblem(mail) && w && (w === 'none' || n.whatsapp));
  const mailWrong = mailProblem(f.email);
  const complete = okFor(wa, next, f.email);
  const was = { name: e.name, business: e.business, phone: e.phone, email: e.email, whatsapp: e.whatsapp, whatsapp_kind: e.whatsapp ? e.whatsapp_kind : null, onboarded: true };
  const changed = (n: ReturnType<typeof build>) => JSON.stringify(n) !== JSON.stringify(was);
  async function save(n = next) {
    setState('busy');
    try { await updateMe(e.id, n); onSaved({ ...e, ...n }); setState(''); }
    catch (err) { setState(String((err as Error).message ?? err)); }
  }
  /** In the settings: kept when he leaves a field or picks an answer, once the form is whole. */
  const keep = (w: Wa | null = wa, form = f, num = waNum) => {
    if (welcome) return;
    const n = build(w, form, num);
    if (okFor(w, n, form.email) && changed(n)) save(n);
  };
  const field = (k: keyof typeof f, label: string, more: object = {}) => (
    <label className="field" htmlFor={'me-' + k}>{label}
      <input id={'me-' + k} className="input" value={f[k]} onChange={(ev) => { setF({ ...f, [k]: ev.target.value }); setState(''); }} onBlur={() => keep()} {...more} />
    </label>
  );
  const ltr = { dir: 'ltr', style: { textAlign: 'right' } };
  const pick = (w: Wa) => { setWa(w); setState(''); keep(w); };
  return (
    <div className="stack">
      <div className="typed">
        {field('name', 'השם שלך')}
        {field('business', 'שם העסק')}
        {field('phone', 'טלפון', { inputMode: 'tel', ...ltr })}
        <label className="field" htmlFor="me-email">מייל (לא חובה)
          <MailInput id="me-email" className="input" style={{ textAlign: 'right' }} value={f.email} onValue={(email) => { setF({ ...f, email }); setState(''); }} onBlur={() => { setMailLeft(true); keep(); }} />
        </label>
        {mailWrong && mailLeft && !mailHints(f.email).options.length && <p className="err small" role="alert">{mailWrong}</p>}
      </div>
      <div className="q-block">
        <span className="sec">הוואטסאפ שלך</span>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={wa === 'same'} onClick={() => pick('same')}>על המספר הזה</button>
          <button type="button" className="chip" aria-pressed={wa === 'other'} onClick={() => pick('other')}>על מספר אחר</button>
          <button type="button" className="chip" aria-pressed={wa === 'none'} onClick={() => pick('none')}>אין לי וואטסאפ</button>
        </div>
      </div>
      {wa === 'other' && <label className="field" htmlFor="me-wa">מספר הוואטסאפ<input id="me-wa" className="input" inputMode="tel" dir="ltr" style={{ textAlign: 'right' }} value={waNum} onChange={(ev) => setWaNum(ev.target.value)} onBlur={() => keep()} /></label>}
      {wa === 'none' && <p className="muted small">בלי וואטסאפ, ההודעות למבקרים יוצאות במייל בלבד, וכפתורי הוואטסאפ לא יופיעו.</p>}
      {welcome ? (
        <div className="row">
          <button type="button" className="btn primary tall wide" disabled={!complete || state === 'busy'} onClick={() => save()}>{submit}</button>
          {state && state !== 'busy' && <span className="err">{state}</span>}
        </div>
      ) : state && state !== 'busy' && <p className="err small">לא נשמר: {state}</p>}
      {welcome && !complete && <p className="faint small">שם, עסק, טלפון, ותשובה על הוואטסאפ: אלה נכנסים לחתימה של כל הודעה.</p>}
      {!welcome && !complete && <p className="faint small">כדי לשמור: שם, עסק, טלפון, ותשובה על הוואטסאפ.</p>}
    </div>
  );
}
