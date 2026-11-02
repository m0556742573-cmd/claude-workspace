// The setup (2/11, יצחק: "יש תהליך הקמה שזה מיד בהרשמה למערכת", and "היועץ הקמה צריך להיות בכל החלק של ההקמה...
// הוא המרכז"). Once, right after signing up: his details; a conversation with the consultant, which builds the booth (or,
// on his own, a few lines and a similar business); the booth as it came out — the settings' own card and paths, with the
// consultant beside them; the messages; and "סיימתי להגדיר". The prototype's order (17/10, 20/10), with the messages
// after the booth, since they are born of its paths. Where he stopped is kept on this device.
import { useState, type ReactNode } from 'react';
import type { Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import { Logo } from './brand.tsx';
import { MeForm } from './me.tsx';
import { Consultant, StepAdvisor } from './consult.tsx';
import { EMPTY, cardIssues, similar } from './setup.tsx';
import { AfterPage, CardPage, useApply } from './settings.tsx';
import { Messages, type Ctx } from './screens.tsx';
import { Icon } from './ui.tsx';
import { add, setGoal } from './lib/edit.ts';
import { saveText, startFromTemplate, type Exhibitor } from './lib/backend.ts';

const STEPS = ['הפרטים שלך', 'שיחה עם היועץ', 'הדוכן', 'ההודעות'];
export type Flow = { step: 'booth' | 'messages'; via: 'advisor' | 'alone' };
const KEY = (id: string) => 'expo-flow:' + id;
/** Where he stopped in the setup, once the booth exists: the booth or the messages; null when he finished. */
export function flowOf(exhibitorId: string): Flow | null {
  try { const [step, via] = (localStorage.getItem(KEY(exhibitorId)) ?? '').split(':'); return (step === 'booth' || step === 'messages') ? { step, via: via === 'alone' ? 'alone' : 'advisor' } : null; }
  catch { return null; }
}
export function keepFlow(exhibitorId: string, f: Flow | null) {
  try { if (f) localStorage.setItem(KEY(exhibitorId), `${f.step}:${f.via}`); else localStorage.removeItem(KEY(exhibitorId)); } catch { /* the device may not keep it */ }
}

function Head({ at }: { at: number }) {
  return (
    <header className="flow-head">
      <Logo height={26} />
      <ol className="flow-steps" aria-label="הקמת הדוכן">
        {STEPS.map((t, i) => <li key={t} className={i < at ? 'done' : i === at ? 'on' : ''} aria-current={i === at ? 'step' : undefined}><span>{i < at ? '✓' : i + 1}</span>{t}</li>)}
      </ol>
    </header>
  );
}

/** A screen of the setup with the consultant beside it: a column on a computer, the round button on a tablet. */
function WithAdvisor({ step, setup, onAdd, children }: { step: string; setup: Setup; onAdd: (g: 'needs' | 'when' | 'who', labels: string[]) => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={'setup-wrap flow-wrap' + (open ? ' ai-open' : '')}>
      <div className="flow-body stack">{children}</div>
      <aside className="setup-ai">
        <button type="button" className="text-btn setup-ai-close" onClick={() => setOpen(false)}>→ חזרה</button>
        <StepAdvisor step={step} setup={setup} onAdd={onAdd} />
      </aside>
      {!open && <button type="button" className="ai-fab setup-ai-fab" aria-label="היועץ" title="היועץ" onClick={() => setOpen(true)}><Icon name="spark" size={26} stroke={1.9} /></button>}
    </div>
  );
}

// ---------- 1. his details, right after signing up

export function FlowDetails({ exhibitor, onSaved }: { exhibitor: Exhibitor; onSaved: (e: Exhibitor) => void }) {
  return (
    <div className="flow">
      <Head at={0} />
      <section className="flow-body narrow stack">
        <h1>ברוך הבא לאקספומקס</h1>
        <p className="lead">בכמה דקות הדוכן שלך יהיה מוכן לאקספו. קודם כמה פרטים, אחר כך שיחה קצרה עם היועץ, והוא בונה איתך את הכל.</p>
        <MeForm exhibitor={exhibitor} onSaved={onSaved} submit="נמשיך ←" welcome />
      </section>
    </div>
  );
}

// ---------- 2. the conversation with the consultant, or on his own

export function FlowStart({ exhibitor, onBuilt }: { exhibitor: Exhibitor; onBuilt: (s: Setup, via: Flow['via']) => void }) {
  const [alone, setAlone] = useState(false);
  const [err, setErr] = useState('');
  async function save(s: Setup, texts: Record<string, string>, via: Flow['via']) {
    setErr('');
    try {
      await startFromTemplate(exhibitor.id, s);
      // The texts the consultant wrote become his own; he can change them on the messages screen.
      for (const [id, body] of Object.entries(texts)) await saveText(exhibitor.id, id, body).catch(() => {});
      onBuilt(s, via);
    } catch (e) { setErr('הדוכן לא נשמר: ' + String((e as Error).message ?? e) + '. אפשר לנסות שוב.'); }
  }
  return (
    <div className="flow">
      <Head at={1} />
      <section className="flow-body stack">
        {alone ? <Alone business={exhibitor.business} onBack={() => setAlone(false)} onDone={(s) => save(s, {}, 'alone')} /> : <>
          <h1>שיחה עם היועץ</h1>
          <p className="lead">היועץ שואל על העסק שלך, שאלה אחת בכל פעם. מהתשובות הוא בונה את הכרטיס שבדוכן, ואת מה שקורה עם כל מבקר אחרי האקספו. אפשר לעצור בכל רגע ולבנות ממה שיש.</p>
          <Consultant onBuilt={(s, texts) => save(s, texts, 'advisor')} onSteps={() => setAlone(true)} />
        </>}
        {err && <p className="err" role="alert">{err}</p>}
      </section>
    </div>
  );
}

/** On his own: what the business does, what success is, and a similar business to start from, or an empty card. */
function Alone({ business, onBack, onDone }: { business: string; onBack: () => void; onDone: (s: Setup) => void }) {
  const [biz, setBiz] = useState('');
  const [goal, setGoalText] = useState('');
  const [num, setNum] = useState('');
  const [sensitive, setSensitive] = useState(false);
  const [from, setFrom] = useState<number | 'empty' | null>(null);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const near = similar(biz || business);
  const base = from === null || from === 'empty' ? EMPTY : { ...fixtures.find((x) => x.id === from)!.setup, template: from };
  async function done() { setBusy(true); try { await onDone({ ...base, business: biz.trim(), anchor: { goal: goal.trim(), success: num.trim() }, sensitive }); } finally { setBusy(false); } }
  return (
    <>
      <h1>להקים לבד</h1>
      <p className="lead">שלוש שאלות קצרות, ומאיזה עסק דומה להתחיל. אחר כך תעבור על הכרטיס ותשנה מה שצריך, והיועץ יהיה לידך.</p>
      <section className="panel-w">
        <label className="field" htmlFor="al-biz">במה העסק עוסק?<input id="al-biz" className="input" placeholder="למשל: נגרות מטבחים, קייטרינג, שטריימלך" value={biz} onChange={(e) => setBiz(e.target.value)} /></label>
        <label className="field" htmlFor="al-goal">מה יהפוך את האקספו להצלחה בשבילך?<textarea id="al-goal" className="area" rows={3} placeholder="במילים שלך. למשל: אבות שכבר יש להם חתן, שיבואו למדידה." value={goal} onChange={(e) => setGoalText(e.target.value)} /></label>
        <label className="field" htmlFor="al-num">ובמספר?<input id="al-num" className="input" placeholder="למשל: 15 מדידות, 30 הזמנות" value={num} onChange={(e) => setNum(e.target.value)} /></label>
        <div className="switchrow">
          <span>עסק רגיש<span className="faint small" style={{ display: 'block' }}>שדכנות, טיפול, ייעוץ אישי: בלי שם העסק בהודעות, ורשימת תפוצה רק למי שהסכים.</span></span>
          <button type="button" className="switch" role="switch" aria-checked={sensitive} aria-label="עסק רגיש" onClick={() => setSensitive(!sensitive)} />
        </div>
        <div className="q-block">
          <span className="sec">להתחיל מעסק דומה?</span>
          <div className="chips">
            {(all ? fixtures : near).map((f) => <button key={f.id} type="button" className="chip" aria-pressed={from === f.id} onClick={() => setFrom(f.id)}>{f.name}</button>)}
            {!all && <button type="button" className="chip" onClick={() => setAll(true)}>{near.length ? 'עוד עסקים' : 'לבחור עסק דומה'}</button>}
            <button type="button" className="chip" aria-pressed={from === 'empty'} onClick={() => setFrom('empty')}>כרטיס ריק</button>
          </div>
        </div>
      </section>
      <div className="row flow-nav">
        <button type="button" className="btn primary tall" disabled={busy || !goal.trim()} onClick={done}>{busy ? 'בונה…' : 'לבנות את הדוכן ←'}</button>
        <button type="button" className="text-btn" onClick={onBack}>→ חזרה ליועץ</button>
      </div>
      {!goal.trim() && <p className="faint small">כדי להמשיך: מה יהפוך את האקספו להצלחה.</p>}
    </>
  );
}

// ---------- 3. the booth as it came out, and 4. the messages — the settings' own screens, with the consultant beside them

function useAddFromAi(ctx: Ctx) {
  const ap = useApply(ctx);
  return (g: 'needs' | 'when' | 'who', labels: string[]) => {
    let next = ctx.setup;
    for (const l of labels) {
      const have = g === 'needs' ? next.needs.some((n) => n.label === l) : next[g].some((b) => b.label === l);
      if (!have) next = add(next, g, l);
    }
    if (g === 'needs' && next.needs.length && !next.needs.some((n) => n.goal === 'primary')) next = setGoal(next, next.needs[0]!.label);
    ap.apply(next, []);
  };
}

export function FlowBooth({ ctx, via, onNext }: { ctx: Ctx; via: Flow['via']; onNext: () => void }) {
  const onAdd = useAddFromAi(ctx);
  const issues = cardIssues(ctx.setup);
  return (
    <div className="flow">
      <Head at={2} />
      <WithAdvisor step="הדוכן" setup={ctx.setup} onAdd={onAdd}>
        <h1>הדוכן שלך</h1>
        <p className="lead">{via === 'advisor' ? 'זה מה שהיועץ הבין מהשיחה, ובנה בשבילך.' : 'זה הדוכן שבנית.'} עבור על הכרטיס ועל מה שקורה אחרי, ותקן כל מה שלא מדויק. אם משהו לא ברור, היועץ כאן לידך.</p>
        <CardPage ctx={ctx} />
        {issues.length > 0 && <div className="note warn"><b>כדאי לבדוק:</b><ul className="issues">{issues.map((t) => <li key={t}>{t}</li>)}</ul></div>}
        <AfterPage ctx={ctx} />
        <div className="row flow-nav"><button type="button" className="btn primary tall" onClick={onNext}>הבא: ההודעות ←</button></div>
      </WithAdvisor>
    </div>
  );
}

export function FlowMessages({ ctx, desk, onBack, onDone }: { ctx: Ctx; desk: boolean; onBack: () => void; onDone: () => void }) {
  const onAdd = useAddFromAi(ctx);
  return (
    <div className="flow">
      <Head at={3} />
      <WithAdvisor step="ההודעות" setup={ctx.setup} onAdd={onAdd}>
        <h1>ההודעות</h1>
        <p className="lead">אלה ההודעות שיוצאות למבקרים, כל אחת בזמן שלה. אפשר לשנות כל נוסח. פרט בסוגריים, כמו [כתובת], כותבים פעם אחת, והוא נכנס לכל ההודעות. הודעה עם פרט חסר לא יוצאת.</p>
        <Messages ctx={ctx} desk={desk} bare />
        <div className="row flow-nav">
          <button type="button" className="btn primary tall" onClick={onDone}>סיימתי להגדיר ✓</button>
          <button type="button" className="text-btn" onClick={onBack}>→ חזרה לדוכן</button>
        </div>
        <p className="faint small">כל מה שקבעת כאן נמצא אחר כך בהגדרות, ואפשר לשנות אותו בכל רגע.</p>
      </WithAdvisor>
    </div>
  );
}
