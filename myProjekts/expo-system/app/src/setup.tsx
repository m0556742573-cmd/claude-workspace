// The setup step by step, without AI (model, section 15): the same structure the consultant fills, in six short
// steps — the goal, a starting point, the card, what happens after, his time, and a check before saving.
// It opens for a new booth instead of the bare list of templates, and from the settings to set up again.
import { useMemo, useState } from 'react';
import type { Holiday, NeedPath, Path, Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import { add, remove, rename, setDays, setGoal, type At } from './lib/edit.ts';
import { HOLIDAY, variantTitle } from './lib/describe.ts';
import { messagesOf } from './lib/messages.ts';
import { PATTERNS, minutesIn14, needFrom, patternOf, recognise } from './lib/patterns.ts';
import { AddChip, EditChip, GROUPS, PathLines } from './parts.tsx';

const EMPTY: Setup = {
  business: '', anchor: { goal: '', success: '' }, needs: [], when: [], who: [],
  defaults: { business: { steps: [], end: { kind: 'list' } }, private: { steps: [], end: { kind: 'list' } } }, sensitive: false,
};
const STEPS = ['המטרה', 'נקודת התחלה', 'הכרטיס', 'מה קורה אחרי', 'הזמן שלך', 'בדיקה ושמירה'];
const MINUTES = [15, 30, 60, 90, 120];

export function SetupSteps({ start, business, onSave, onCancel }: {
  start: Setup | null;
  /** The business he gave at sign-up: the first answer until he writes another. */
  business?: string;
  onSave: (s: Setup, renames: [string, string][]) => Promise<void>;
  onCancel?: () => void;
}) {
  const [at, setAt] = useState(0);
  const [s, setS] = useState<Setup>(() => { const b = start ?? EMPTY; return { ...b, business: b.business || business || '' }; });
  const [from, setFrom] = useState<number | 'empty' | 'mine' | null>(start ? 'mine' : null);
  const [renames, setRenames] = useState<[string, string][]>([]);
  const [visitors, setVisitors] = useState(40);
  const [state, setState] = useState('');
  const capacity = s.capacity ?? 30;

  /** A starting point keeps what he already wrote about himself: the business, the goal, sensitivity. */
  function startFrom(f: number | 'empty' | 'mine') {
    const base = f === 'empty' ? EMPTY : f === 'mine' ? start! : { ...fixtures.find((x) => x.id === f)!.setup, template: f };
    setS({ ...base, business: s.business, anchor: s.anchor, sensitive: s.sensitive, capacity: s.capacity });
    setFrom(f); setRenames([]);
  }
  const load = useMemo(() => {
    const paths = s.needs.length ? s.needs.map((n) => n.variants[n.variants.length - 1]!.path) : [s.defaults.private];
    const each = paths.reduce((a, p) => a + minutesIn14(p), 0) / paths.length;
    return { need: Math.round((each * visitors) / 60), have: Math.round((capacity * 10) / 60) };
  }, [s, visitors, capacity]);

  const checks: [boolean, string][] = [
    [!!s.anchor.goal.trim(), 'נכתב מה יהפוך את התערוכה להצלחה'],
    [!s.needs.length || s.needs.some((n) => n.goal === 'primary'), 'סומנה מטרה ראשית בין הכפתורים'],
    [s.needs.every((n) => n.variants.length > 0), 'לכל כפתור "מה הוא צריך" יש מסלול'],
    [load.need <= load.have, 'הזמן שלך מספיק למסלולים'],
  ];
  const messages = messagesOf(s).length;

  async function save() {
    setState('busy');
    try { await onSave(s, renames); } catch (e) { setState('לא נשמר: ' + String((e as Error).message ?? e)); return; }
    setState('');
  }
  const can = at === 0 ? !!s.anchor.goal.trim() : at === 1 ? from !== null : true;

  return (
    <div className="setup-steps stack">
      <div className="steps-head">
        <span className="sec">שלב {at + 1} מתוך {STEPS.length}</span>
        <h1>{STEPS[at]}</h1>
        <div className="dots" aria-hidden="true">{STEPS.map((_, i) => <i key={i} className={i <= at ? 'on' : ''} />)}</div>
      </div>

      {at === 0 && (
        <section className="panel-w">
          <label className="field" htmlFor="su-biz">במה העסק עוסק?<input id="su-biz" className="input" placeholder="למשל: נגרות מטבחים, קייטרינג, שטריימלך" value={s.business} onChange={(e) => setS({ ...s, business: e.target.value })} /></label>
          <label className="field" htmlFor="su-goal">מה יהפוך את התערוכה להצלחה בשבילך?<textarea id="su-goal" className="area" rows={3} placeholder="במילים שלך. למשל: אבות שכבר יש להם חתן, שיבואו למדידה." value={s.anchor.goal} onChange={(e) => setS({ ...s, anchor: { ...s.anchor, goal: e.target.value } })} /></label>
          <label className="field" htmlFor="su-num">ובמספר?<input id="su-num" className="input" placeholder="למשל: 15 מדידות, 30 הזמנות" value={s.anchor.success} onChange={(e) => setS({ ...s, anchor: { ...s.anchor, success: e.target.value } })} /></label>
          <div className="switchrow">
            <span>עסק רגיש<span className="faint small" style={{ display: 'block' }}>שדכנות, טיפול, ייעוץ אישי: בלי שם העסק בהודעות, ורשימת תפוצה רק למי שהסכים.</span></span>
            <button type="button" className="switch" role="switch" aria-checked={s.sensitive} aria-label="עסק רגיש" onClick={() => setS({ ...s, sensitive: !s.sensitive })} />
          </div>
          <p className="faint small">המטרה הזאת נשמרת עם ההקמה. כל מסלול בהמשך צריך לשרת אותה.</p>
        </section>
      )}

      {at === 1 && (
        <section className="panel-w">
          <p className="muted">מאיזה עסק דומה להתחיל? הכפתורים והמסלולים שלו נכנסים כהצעה, ובשלבים הבאים משנים הכל.</p>
          <div className="chips">
            {start && <button type="button" className="chip" aria-pressed={from === 'mine'} onClick={() => startFrom('mine')}>ההקמה שלי עכשיו</button>}
            {fixtures.map((f) => <button key={f.id} type="button" className="chip" aria-pressed={from === f.id} onClick={() => startFrom(f.id)}>{f.name}</button>)}
            <button type="button" className="chip" aria-pressed={from === 'empty'} onClick={() => startFrom('empty')}>כרטיס ריק</button>
          </div>
          {from !== null && (
            <p className="note">{s.needs.length ? `בכרטיס: ${s.needs.map((n) => n.label).join(', ')}.` : 'כרטיס ריק: בשלב הבא מוסיפים כפתורים, או משאירים כרטיס של שם בלבד.'}</p>
          )}
        </section>
      )}

      {at === 2 && (
        <section className="panel-w">
          <p className="muted">שלוש שאלות, מה שנוגעים בו בדוכן. המבקר רואה את הכרטיס, לכן כל מילה צריכה להתאים לעיניים שלו. נגיעה בשם משנה אותו, ✕ מוציא אותו.</p>
          {GROUPS.map(([g, q]) => {
            const items = g === 'needs' ? s.needs.map((n) => ({ label: n.label, primary: n.goal === 'primary' })) : s[g].map((b) => ({ label: b.label, primary: false }));
            return (
              <div key={g} className="q-block"><span className="sec">{q}</span>
                <div className="chips">
                  {items.map((b) => <EditChip key={b.label} label={b.label} primary={b.primary}
                    onRename={(to) => { const next = rename(s, b.label, to); if (next !== s) { setS(next); setRenames([...renames, [b.label, to.trim()]]); } }}
                    onRemove={() => setS(remove(s, g, b.label))}
                    onPrimary={g === 'needs' && s.needs.length > 1 ? () => setS(setGoal(s, b.label)) : undefined} />)}
                  <AddChip onAdd={(l) => { let next = add(s, g, l); if (g === 'needs' && next.needs.length === 1) next = setGoal(next, l.trim()); setS(next); }} />
                </div>
              </div>
            );
          })}
          <p className="faint small">"מה הוא צריך" קובע את המסלול. "מתי" ו"מי הוא" משנים אותו: כפתור שלא משנה כלום לא שייך לכרטיס.</p>
        </section>
      )}

      {at === 3 && (
        <>
          <p className="muted">לכל כפתור: מה קורה אחרי התערוכה. בוחרים דפוס, ומשנים כמה ימים עובר בין צעד לצעד.</p>
          {s.needs.map((n, ni) => (
            <PathPick key={n.label} title={n.label} need={n} onPick={(p) => setS({ ...s, needs: s.needs.map((x, i) => (i === ni ? p : x)) })}
              edit={(vi, i, d) => setS(setDays(s, { need: ni, variant: vi }, i, d))} />
          ))}
          {(['business', 'private'] as const).map((k) => (
            <PathPick key={k} title={k === 'business' ? 'בעל עסק שלא סומן אצלו כלום' : 'מבקר שלא סומן אצלו כלום'}
              need={{ label: k, goal: 'secondary', relation: 'customer', variants: [{ path: s.defaults[k] }] }}
              onPick={(p) => setS({ ...s, defaults: { ...s.defaults, [k]: p.variants[0]!.path } })}
              edit={(_vi, i, d) => setS(setDays(s, { default: k } as At, i, d))} />
          ))}
        </>
      )}

      {at === 4 && (
        <section className="panel-w">
          <span className="sec">כמה זמן ביום יהיה לך למעקב, בשבועיים שאחרי התערוכה?</span>
          <div className="chips">{MINUTES.map((m) => <button key={m} type="button" className="chip" aria-pressed={capacity === m} onClick={() => setS({ ...s, capacity: m })}>{m < 60 ? `${m} דקות` : m === 60 ? 'שעה' : m === 90 ? 'שעה וחצי' : 'שעתיים'}</button>)}</div>
          <label className="field" htmlFor="su-vis">כמה מבקרים אתה מצפה לרשום?<input id="su-vis" className="input days" type="number" min={1} max={2000} inputMode="numeric" value={visitors} onChange={(e) => setVisitors(Math.max(1, Number(e.target.value) || 1))} /></label>
          <p className={load.need > load.have ? 'note warn' : 'note'}>
            {load.need > load.have
              ? `המסלולים ידרשו ממך בערך ${load.need} שעות בשבועיים הראשונים, ויש לך כ־${load.have}. כדאי להרחיק צעדים, להפוך שיחה להודעה, או לשלוח חלק מהכפתורים לרשימת התפוצה. אחרת המשימות יצטברו באיחור.`
              : `המסלולים ידרשו ממך בערך ${load.need} שעות בשבועיים הראשונים, ויש לך כ־${load.have}. זה מתאים.`}
          </p>
          <p className="faint small">החשבון גס: שיחה כ־5 דקות, פגישה כחצי שעה, הכנה כרבע שעה, עשרה ימי עבודה, ולא כל מבקר מגיע לכל צעד.</p>
        </section>
      )}

      {at === 5 && (
        <section className="panel-w">
          <ul className="checks">
            {checks.map(([ok, t]) => <li key={t} className={ok ? 'ok' : 'miss'}><span aria-hidden="true">{ok ? '✓' : '!'}</span>{t}</li>)}
            <li className="ok"><span aria-hidden="true">✓</span>כל מסלול מסתיים: ברשימת התפוצה, בעצירה, או בבדיקה חוזרת</li>
          </ul>
          <p className="muted">{messages} הודעות יוצאות במסלולים האלה. אחרי השמירה, בעמוד "הודעות", רואים לכל אחת נוסח מוצע ומשלימים מה שחסר.</p>
          {s.anchor.goal && <p className="note"><b>המטרה:</b> {s.anchor.goal}{s.anchor.success ? ` · ${s.anchor.success}` : ''}</p>}
        </section>
      )}

      <div className="row">
        {at > 0 && <button type="button" className="btn tall" onClick={() => { setAt(at - 1); scrollTo(0, 0); }}>→ הקודם</button>}
        {at < STEPS.length - 1
          ? <button type="button" className="btn primary tall" disabled={!can} onClick={() => { setAt(at + 1); scrollTo(0, 0); }}>הבא ←</button>
          : <button type="button" className="btn primary tall" disabled={state === 'busy'} onClick={save}>{state === 'busy' ? 'שומר…' : 'שמירת ההקמה'}</button>}
        {onCancel && <button type="button" className="text-btn" onClick={onCancel}>ביטול</button>}
      </div>
      {state && state !== 'busy' && <p className="err">{state}</p>}
    </div>
  );
}

/** One need (or a default): the pattern it follows, with the days as fields. A path from a template stays as it is until a pattern is picked. */
function PathPick({ title, need, onPick, edit }: { title: string; need: NeedPath; onPick: (n: NeedPath) => void; edit: (variant: number, index: number, days: number) => void }) {
  const only = need.variants.length === 1 ? need.variants[0]!.path : null;
  const known = only ? recognise(only) : undefined;
  const season = only?.steps.find((st) => st.timing.kind === 'calendar')?.timing;
  const holiday = season?.kind === 'calendar' && 'holiday' in season.anchor ? season.anchor.holiday : 'pesach';
  const pick = (id: string, h?: Holiday) => {
    if (id === 'none') return onPick({ ...need, variants: [{ path: { steps: [], end: { kind: 'list' } } as Path }] });
    const p = patternOf(id);
    if (p) onPick({ ...needFrom(need.label, p, need.goal, h), goal: need.goal });
  };
  return (
    <section className="panel-w">
      <h2>{title}</h2>
      <label className="field" htmlFor={'pp-' + title}>המסלול
        <select id={'pp-' + title} className="input" value={known?.id ?? (only && !only.steps.length ? 'none' : 'custom')} onChange={(e) => pick(e.target.value, holiday)}>
          {!known && !(only && !only.steps.length) && <option value="custom">{need.variants.length > 1 ? `המסלול הנוכחי (${need.variants.length} מסלולים, לפי מה שסומן)` : 'המסלול הנוכחי'}</option>}
          {PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          <option value="none">רשימת תפוצה בלבד, בלי צעדים</option>
        </select>
      </label>
      {known && <p className="faint small">מתאים ל: {known.fits}</p>}
      {known?.id === 'list' && (
        <label className="field" htmlFor={'ps-' + title}>לפני איזו עונה
          <select id={'ps-' + title} className="input" value={holiday} onChange={(e) => pick('list', e.target.value as Holiday)}>
            {Object.entries(HOLIDAY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      )}
      {need.variants.map((v, vi) => (
        <div key={vi}>
          {need.variants.length > 1 && <span className="muted small">{variantTitle(v)}:</span>}
          <PathLines path={v.path} edit={(i, d) => edit(vi, i, d)} />
        </div>
      ))}
    </section>
  );
}
