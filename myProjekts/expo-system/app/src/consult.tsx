// The setup consultant (יצחק, 22/10 and 30/10): a conversation with an AI that knows exactly this field, leading with one
// question at a time and filling a fixed structure until the checklist of a polished setup passes (model §15). Then it
// builds the setup, which opens in the step-by-step setup for him to review and change before it is saved. The
// conversation is kept, and he can come back to it.
import { useEffect, useRef, useState } from 'react';
import type { Setup } from '@expo/engine';
import { consultBuild, consultNew, consultSay, consultSession, type ConsultState } from './lib/wa.ts';

export function Consultant({ onBuilt, onSteps }: { onBuilt: (setup: Setup, texts: Record<string, string>) => void; onSteps?: () => void }) {
  const [st, setSt] = useState<ConsultState | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'' | 'say' | 'build'>('');
  const [err, setErr] = useState('');
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { consultSession().then(setSt).catch((e) => setErr(why(e))); }, []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [st, busy]);

  async function say(t: string) {
    const msg = t.trim();
    if (!msg || busy || !st) return;
    setBusy('say'); setErr(''); setText('');
    // His words show at once; the answer takes some seconds.
    setSt({ ...st, turns: [...st.turns, { role: 'user', text: msg }] });
    try { setSt(await consultSay(st.id, msg)); }
    catch (e) { setErr(why(e)); setText(msg); setSt(st); }
    finally { setBusy(''); }
  }
  async function make() {
    if (!st?.id || busy) return;
    setBusy('build'); setErr('');
    try { const r = await consultBuild(st.id); onBuilt(r.setup as Setup, r.texts); }
    catch (e) { setErr(why(e)); }
    finally { setBusy(''); }
  }
  async function fresh() {
    if (busy || !confirm('להתחיל שיחה חדשה? השיחה הזו נשמרת, אבל היועץ יתחיל מההתחלה.')) return;
    setSt(await consultNew().catch(() => st));
  }

  if (!st) return <section className="panel-w"><p className="muted">{err || 'פותח את השיחה…'}</p>{err && onSteps && <button type="button" className="btn" onClick={onSteps}>להקים שלב אחר שלב</button>}</section>;
  const passed = st.checks.filter(([, ok]) => ok).length;
  const ready = passed === st.checks.length;
  const last = st.turns[st.turns.length - 1];
  const d = st.draft;
  return (
    <div className="consult">
      <section className="panel-w consult-chat" aria-label="השיחה עם היועץ">
        <div className="consult-log" ref={log} aria-live="polite">
          {st.turns.map((t, i) => <div key={i} className={'bubble ' + (t.role === 'assistant' ? 'ai' : 'me')}>{t.text}</div>)}
          {busy === 'say' && <div className="bubble ai thinking">חושב…</div>}
        </div>
        {!busy && last?.role === 'assistant' && (last.quick?.length ?? 0) > 0 && (
          <div className="chips">{last.quick!.map((q) => <button key={q} type="button" className="chip" onClick={() => say(q)}>{q}</button>)}</div>
        )}
        <form className="consult-form" onSubmit={(e) => { e.preventDefault(); say(text); }}>
          <textarea className="area" rows={2} value={text} placeholder="אפשר לכתוב חופשי, או לבחור תשובה מוכנה" aria-label="התשובה שלך"
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); say(text); } }} />
          <button type="submit" className="btn primary" disabled={!!busy || !text.trim()}>שליחה</button>
        </form>
        {err && <p className="muted small" role="alert">{err}</p>}
        <div className="row">
          {onSteps && <button type="button" className="text-btn" disabled={!!busy} onClick={onSteps}>להקים לבד, שלב אחר שלב</button>}
          <button type="button" className="text-btn" disabled={!!busy} onClick={fresh}>שיחה חדשה</button>
        </div>
      </section>
      <section className="panel-w consult-side" aria-label="ההקמה שנבנית">
        <h2>ההקמה שנבנית <span className="muted small">· {passed} מתוך {st.checks.length}</span></h2>
        <ul className="consult-checks">{st.checks.map(([t, ok]) => <li key={t} className={ok ? 'ok' : ''}><span aria-hidden="true">{ok ? '✓' : '○'}</span> {t}</li>)}</ul>
        {(d.anchor.goal || d.goals.primary) && <p className="small"><b>מה תהיה הצלחה:</b> {[d.anchor.goal, d.anchor.success].filter(Boolean).join(' · ')}{d.goals.primary ? ` · מטרה ראשית: ${d.goals.primary}` : ''}</p>}
        {[['מה הוא צריך?', d.need.map((n) => n.label)], ['מתי?', d.when.map((b) => b.label)], ['מי הוא?', d.who.map((b) => b.label)]].map(([q, items]) => (items as string[]).length > 0 && (
          <div key={q as string} className="small"><b>{q as string}</b> {(items as string[]).join(' · ')}</div>
        ))}
        {d.open.length > 0 && <div className="small"><b>עוד פתוח:</b> {d.open.join(' · ')}</div>}
        <button type="button" className={'btn' + (ready ? ' primary' : '')} disabled={!!busy || !st.id || passed < 4} onClick={make}>
          {busy === 'build' ? 'בונה את הדוכן… (כחצי דקה)' : ready ? 'לבנות את הדוכן מהשיחה' : 'לבנות בכל זאת'}
        </button>
        <p className="faint small">{ready ? 'הדוכן ייפתח לבדיקה שלב אחר שלב, ואפשר לשנות כל דבר לפני השמירה.' : 'כדאי להמשיך עד שהרשימה מסומנת. אפשר גם לבנות עכשיו ולהשלים לבד.'}</p>
        {st.built && !busy && <button type="button" className="text-btn" onClick={() => onBuilt(st.built!.setup as Setup, st.built!.texts)}>לפתוח את מה שנבנה בפעם הקודמת</button>}
      </section>
    </div>
  );
}

function why(e: unknown): string {
  const m = String((e as Error)?.message ?? e);
  if (m === 'no_key') return 'היועץ עוד לא מחובר במערכת. בינתיים אפשר להקים שלב אחר שלב.';
  if (m === 'limit') return 'היום כבר דיברת הרבה עם היועץ. אפשר להמשיך מחר, או להשלים לבד שלב אחר שלב.';
  if (m === 'claude') return 'היועץ לא ענה הפעם. אפשר לנסות שוב.';
  return 'אין חיבור כרגע. אפשר לנסות שוב.';
}
