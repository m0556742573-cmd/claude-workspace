// The exhibitor's own details: the welcome after the first sign-in, and the same form in the settings.
// Name, business and phone are required (his notes, 20/10). WhatsApp is a question, not a field: no means
// no WhatsApp anywhere, and the messages go by mail only.
import { useState } from 'react';
import { updateMe, type Exhibitor } from './lib/backend.ts';

export function MeForm({ exhibitor: e, onSaved, submit, welcome }: { exhibitor: Exhibitor; onSaved: (e: Exhibitor) => void; submit: string; welcome?: boolean }) {
  const [f, setF] = useState({ name: e.name, business: e.business, phone: e.phone ?? '', email: e.email ?? '' });
  const [wa, setWa] = useState<'yes' | 'no' | null>(e.whatsapp ? 'yes' : e.onboarded ? 'no' : null);
  const [kind, setKind] = useState<'personal' | 'business'>(e.whatsapp_kind ?? 'personal');
  const [same, setSame] = useState(!e.whatsapp || e.whatsapp === e.phone);
  const [waNum, setWaNum] = useState(e.whatsapp && e.whatsapp !== e.phone ? e.whatsapp : '');
  const [state, setState] = useState('');

  const whatsapp = wa === 'yes' ? (same ? f.phone.trim() : waNum.trim()) || null : null;
  const next = {
    name: f.name.trim(), business: f.business.trim(), phone: f.phone.trim() || null, email: f.email.trim() || null,
    whatsapp, whatsapp_kind: whatsapp ? kind : null, onboarded: true,
  };
  const complete = !!(next.name && next.business && next.phone && wa && (wa === 'no' || whatsapp));
  const changed = welcome || JSON.stringify(next) !== JSON.stringify({
    name: e.name, business: e.business, phone: e.phone, email: e.email, whatsapp: e.whatsapp, whatsapp_kind: e.whatsapp ? e.whatsapp_kind : null, onboarded: true,
  });
  async function save() {
    setState('busy');
    try { await updateMe(e.id, next); onSaved({ ...e, ...next }); setState(welcome ? '' : 'saved'); }
    catch (err) { setState(String((err as Error).message ?? err)); }
  }
  const field = (k: keyof typeof f, label: string, more: object = {}) => (
    <label className="field" htmlFor={'me-' + k}>{label}
      <input id={'me-' + k} className="input" value={f[k]} onChange={(ev) => { setF({ ...f, [k]: ev.target.value }); setState(''); }} {...more} />
    </label>
  );
  const ltr = { dir: 'ltr', style: { textAlign: 'right' } };
  return (
    <div className="stack">
      <div className="typed">
        {field('name', 'השם שלך')}
        {field('business', 'שם העסק')}
        {field('phone', 'טלפון', { inputMode: 'tel', ...ltr })}
        {field('email', 'מייל (לא חובה)', { inputMode: 'email', ...ltr })}
      </div>
      <div className="q-block">
        <span className="sec">יש לך וואטסאפ?</span>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={wa === 'yes'} onClick={() => { setWa('yes'); setState(''); }}>כן</button>
          <button type="button" className="chip" aria-pressed={wa === 'no'} onClick={() => { setWa('no'); setState(''); }}>לא</button>
        </div>
      </div>
      {wa === 'yes' && (
        <>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={kind === 'personal'} onClick={() => setKind('personal')}>וואטסאפ רגיל</button>
            <button type="button" className="chip" aria-pressed={kind === 'business'} onClick={() => setKind('business')}>וואטסאפ עסקי</button>
          </div>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={same} onClick={() => setSame(true)}>על הטלפון שלמעלה</button>
            <button type="button" className="chip" aria-pressed={!same} onClick={() => setSame(false)}>על מספר אחר</button>
          </div>
          {!same && <label className="field" htmlFor="me-wa">מספר הוואטסאפ<input id="me-wa" className="input" inputMode="tel" dir="ltr" style={{ textAlign: 'right' }} value={waNum} onChange={(ev) => setWaNum(ev.target.value)} /></label>}
        </>
      )}
      {wa === 'no' && <p className="muted small">בלי וואטסאפ, ההודעות למבקרים יוצאות במייל בלבד, וכפתורי הוואטסאפ לא יופיעו.</p>}
      <div className="row">
        <button type="button" className={'btn primary' + (welcome ? ' tall wide' : '')} disabled={!complete || !changed || state === 'busy'} onClick={save}>{submit}</button>
        {state === 'saved' && <span className="muted">נשמר.</span>}
        {state && state !== 'busy' && state !== 'saved' && <span className="err">{state}</span>}
      </div>
      {welcome && !complete && <p className="faint small">שם, עסק, טלפון, ותשובה על הוואטסאפ: אלה נכנסים לחתימה של כל הודעה.</p>}
    </div>
  );
}
