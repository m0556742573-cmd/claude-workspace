// מפתחות והגדרות (29/10): the keys the server needs (mail, Meta's official WhatsApp, Anthropic), pasted once here and
// sent straight to the server on the VPS, which keeps them on its own disk. They never pass through the chat, git or
// the database, and are never shown again: a secret shows only its last four characters.
import { useEffect, useState } from 'react';
import { PageHead } from '../ui.tsx';
import { adminKeys, adminMailTest, adminSetKey, type AdminKeys } from '../lib/wa.ts';

type Field = [name: string, label: string, secret: boolean, hint?: string];
const GROUPS: { title: string; about: string; fields: Field[]; when?: (k: AdminKeys['keys']) => boolean }[] = [
  { title: 'מייל · Amazon SES', about: 'אם בחרת באמזון. מפתח של משתמש IAM עם הרשאת שליחה בלבד.', when: (k) => k.mail_provider === 'ses',
    fields: [['ses_region', 'אזור (Region)', false, 'למשל eu-central-1'], ['ses_key_id', 'Access key ID', true], ['ses_secret', 'Secret access key', true]] },
  { title: 'מייל · Cloudflare', about: 'ה-Account ID מופיע בדף הבית של Cloudflare. ה-API token: מפתח חדש עם ההרשאה Email Sending: Edit. צריך גם את Workers Paid, אחרת אפשר לשלוח רק לכתובות שאומתו.', when: (k) => k.mail_provider === 'cloudflare',
    fields: [['cf_account', 'Account ID', false], ['cf_token', 'API token', true]] },
  { title: 'וואטסאפ רשמי · הודעת הבוקר', about: 'מ-Meta, אחרי ההקמה שם.', fields: [['meta_phone_id', 'Phone number ID', false], ['meta_token', 'Access token (System User)', true]] },
  { title: 'Anthropic · היועץ', about: 'מ-console.anthropic.com.', fields: [['anthropic_key', 'API key', true]] },
];

export function KeysView() {
  const [st, setSt] = useState<AdminKeys | null | undefined>(undefined);
  const [err, setErr] = useState('');
  useEffect(() => { adminKeys().then(setSt).catch(() => setSt(null)); }, []);
  async function save(name: string, value: string) {
    setErr('');
    try { setSt(await adminSetKey(name, value)); } catch (e) { setErr('לא נשמר: ' + String((e as Error).message ?? e)); }
  }
  return (
    <div className="page narrow">
      <PageHead title="מפתחות והגדרות" tip="מה שהשרת צריך כדי לשלוח: מייל, וואטסאפ רשמי, והיועץ. נשמר רק בשרת, ולא מוצג שוב." />
      <p className="muted">מדביקים כאן, וזה נשלח ישר לשרת ונשמר רק עליו. לא בצ'אט, לא בגיט ולא במסד הנתונים. אחרי השמירה רואים רק את ארבעת התווים האחרונים.</p>
      {st === undefined ? <p className="muted">טוען…</p> : st === null ? <p className="err">השרת לא עונה. אפשר לנסות שוב בעוד דקה.</p> : (
        <>
          <section className="card">
            <h2>מייל: הספק</h2>
            <div className="chips">
              {([['', 'עוד לא נבחר'], ['ses', 'Amazon SES'], ['cloudflare', 'Cloudflare']] as const).map(([v, label]) => (
                <button key={v} type="button" className="chip" aria-pressed={(st.keys.mail_provider ?? '') === v} onClick={() => save('mail_provider', v)}>{label}</button>
              ))}
            </div>
            <p className="muted small">{st.mail ? 'המייל מוכן: מיילים יוצאים מ-expo.y-h-m.com.' : 'המייל עוד לא פעיל. מיילים מחכים בתור עד שהספק והמפתחות שלו מוגדרים.'}</p>
            {st.mail && <MailTest />}
          </section>
          {GROUPS.filter((g) => !g.when || g.when(st.keys)).map((g) => (
            <section className="card" key={g.title}>
              <h2>{g.title}</h2>
              <p className="muted small">{g.about}</p>
              <div className="fills">{g.fields.map(([name, label, secret, hint]) => <KeyField key={name} label={label} secret={secret} hint={hint} now={st.keys[name] ?? null} onSave={(v) => save(name, v)} />)}</div>
            </section>
          ))}
          {err && <p className="err">{err}</p>}
        </>
      )}
    </div>
  );
}

function KeyField({ label, secret, hint, now, onSave }: { label: string; secret: boolean; hint?: string; now: string | null; onSave: (v: string) => Promise<void> }) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (value: string) => { setBusy(true); await onSave(value); setBusy(false); setV(''); };
  return (
    <div className="field">
      <span>{label} <span className="faint small">· {now ? (secret ? `נשמר ${now}` : now) : 'לא הוגדר'}</span></span>
      <div className="row">
        <input className="input" dir="ltr" type={secret ? 'password' : 'text'} autoComplete="off" spellCheck={false} placeholder={hint ?? (now ? 'להחלפה: להדביק חדש' : '')}
          value={v} onChange={(e) => setV(e.target.value)} />
        <button type="button" className="btn" disabled={busy || !v.trim()} onClick={() => run(v.trim())}>לשמור</button>
        {now && <button type="button" className="text-btn" disabled={busy} onClick={() => run('')}>למחוק</button>}
      </div>
    </div>
  );
}

function MailTest() {
  const [to, setTo] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setMsg('');
    try { await adminMailTest(to.trim()); setMsg('נשלח. כדאי לבדוק שהגיע לתיבה ולא לספאם.'); }
    catch (e) { setMsg('לא נשלח: ' + String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }
  return (
    <div className="row">
      <input className="input" dir="ltr" type="email" placeholder="כתובת לבדיקה" value={to} onChange={(e) => setTo(e.target.value)} />
      <button type="button" className="btn" disabled={busy || !to.includes('@')} onClick={run}>מייל בדיקה</button>
      {msg && <span className="muted small">{msg}</span>}
    </div>
  );
}
