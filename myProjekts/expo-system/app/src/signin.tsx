// Signing in with a code by mail (30/10; in the prototype since 18/10): for whoever has no Google account or prefers
// not to use it. He types his mail, a code arrives, he types the code. The mail goes out through the project's own
// sender (Supabase Auth over Cloudflare's SMTP), not through the WhatsApp server.
import { useEffect, useState } from 'react';
import { sendMailCode, verifyMailCode } from './lib/backend.ts';

/** newUsers: the booth lets a new exhibitor in (he waits for approval as with Google); the admin platform does not. */
export function MailCode({ newUsers }: { newUsers: boolean }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [wait, setWait] = useState(0);
  useEffect(() => { if (wait > 0) { const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); } }, [wait]);

  const mail = email.trim().toLowerCase();
  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail);
  const digits = code.replace(/\D/g, '');

  async function send() {
    setBusy(true); setMsg('');
    try { await sendMailCode(mail, newUsers); setSent(true); setCode(''); setWait(60); }
    catch (e) { setMsg(why(e)); }
    finally { setBusy(false); }
  }
  async function verify() {
    setBusy(true); setMsg('');
    try { await verifyMailCode(mail, digits); }
    catch (e) { setMsg(why(e)); setBusy(false); }
  }

  if (!sent) {
    return (
      <form className="mail-code" onSubmit={(e) => { e.preventDefault(); if (mailOk && !busy) send(); }}>
        <label className="label" htmlFor="mc-mail">או עם קוד למייל</label>
        <div className="row">
          <input id="mc-mail" className="input" type="email" dir="ltr" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="btn" disabled={!mailOk || busy}>לשלוח לי קוד</button>
        </div>
        {msg && <p className="muted small" role="alert">{msg}</p>}
      </form>
    );
  }
  return (
    <form className="mail-code" onSubmit={(e) => { e.preventDefault(); if (digits.length >= 6 && !busy) verify(); }}>
      <p>שלחנו קוד אל <b dir="ltr">{mail}</b>. אם הוא לא בתיבה, כדאי להציץ גם בספאם ובקידומי מכירות.</p>
      <div className="row">
        <input className="input code-in" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={10} placeholder="הקוד" aria-label="הקוד מהמייל"
          value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
        <button type="submit" className="btn primary" disabled={digits.length < 6 || busy}>כניסה</button>
      </div>
      {msg && <p className="muted small" role="alert">{msg}</p>}
      <div className="row">
        <button type="button" className="text-btn" disabled={wait > 0 || busy} onClick={send}>{wait > 0 ? `אפשר לשלוח שוב בעוד ${wait} שניות` : 'לשלוח קוד חדש'}</button>
        <button type="button" className="text-btn" disabled={busy} onClick={() => { setSent(false); setMsg(''); }}>מייל אחר</button>
      </div>
    </form>
  );
}

/** What went wrong, in his words. Supabase's messages are in English and change; the cases are by their meaning. */
function why(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e).toLowerCase();
  if (/rate|too many|security purposes|seconds/.test(m)) return 'נשלחו כמה קודים ברצף. אפשר לבקש שוב בעוד דקה.';
  if (/expired|invalid|token|otp/.test(m)) return 'הקוד לא נכון או שעבר זמנו. אפשר לבקש קוד חדש.';
  if (/signups not allowed|not found|not allowed/.test(m)) return 'למייל הזה אין גישה כאן.';
  if (/fetch|network|failed to/.test(m)) return 'אין חיבור כרגע. כדאי לבדוק את האינטרנט ולנסות שוב.';
  return 'משהו לא עבד. אפשר לנסות שוב, או להיכנס עם Google.';
}
