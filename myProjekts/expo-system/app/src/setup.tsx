// The setup step by step, without AI (model, section 15): the same structure the consultant fills, in five short steps
// (2/11, the UX proposal; seven until then) — the business and the goal with a similar business to start from, the card,
// what happens after, the messages, and a check before saving that also asks his time. Every "!" in the check leads to
// the step that fixes it. It opens for a new booth, and from the settings to set up again.
import { useMemo, useState } from 'react';
import type { Holiday, NeedPath, Path, Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import { add, remove, rename, setDays, setGoal, type At } from './lib/edit.ts';
import { HOLIDAY, variantTitle } from './lib/describe.ts';
import { fill, holes, messagesOf, textOf, useTexts } from './lib/messages.ts';
import { PATTERNS, minutesIn14, needFrom, patternOf, recognise } from './lib/patterns.ts';
import { AddChip, EditChip, GROUPS, PathLines } from './parts.tsx';

const EMPTY: Setup = {
  business: '', anchor: { goal: '', success: '' }, needs: [], when: [], who: [],
  defaults: { business: { steps: [], end: { kind: 'list' } }, private: { steps: [], end: { kind: 'list' } } }, sensitive: false,
};
const STEPS = ['העסק והמטרה', 'הכרטיס', 'מה קורה אחרי', 'ההודעות', 'בדיקה ושמירה'];
const MINUTES = [15, 30, 60, 90, 120];

/** The Hebrew words of a business. */
const words = (t: string) => t.split(/[^א-ת]+/).filter((w) => w.length >= 3);
/** A word as written, and without a letter that may join it to the one before ("ושיפוצים" is also "שיפוצים"). */
const forms = (w: string) => (/^[והבלמש]/.test(w) && w.length >= 4 ? [w, w.slice(1)] : [w]);
/** Two words alike: the same first three letters, in any of their forms. */
const alike = (a: string, b: string) => forms(a).some((x) => forms(b).some((y) => x.slice(0, 3) === y.slice(0, 3)));
/** Up to three of the rounds' businesses that share a word (or its start) with what he wrote. */
function similar(business: string) {
  const mine = words(business);
  if (!mine.length) return [];
  return fixtures.map((f) => ({ f, n: words(f.name).filter((w) => mine.some((m) => alike(m, w))).length }))
    .filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3).map((x) => x.f);
}

export function SetupSteps({ start, business, onSave, onCancel, texts: given }: {
  start: Setup | null;
  /** The business he gave at sign-up: the first answer until he writes another. */
  business?: string;
  /** texts: the message texts he wrote or changed in the messages step, to be saved as his own. */
  onSave: (s: Setup, renames: [string, string][], texts: Record<string, string>) => Promise<void>;
  onCancel?: () => void;
  /** Texts that come with the setup (the consultant's), shown in the messages step and saved with it. */
  texts?: Record<string, string>;
}) {
  const own = useTexts();
  const [edits, setEdits] = useState<Record<string, string>>(given ?? {});
  const [at, setAt] = useState(0);
  // The business's name from sign-up is not what it does (30/10: "במה העסק עוסק?" opened filled with the name).
  const [s, setS] = useState<Setup>(() => { const b = start ?? EMPTY; return { ...b, business: b.business || '' }; });
  const [from, setFrom] = useState<number | 'empty' | 'mine' | null>(start ? 'mine' : null);
  const [all, setAll] = useState(false);
  // Once he changed the card or a path, another starting point asks first: it would replace what he did.
  const [touched, setTouched] = useState(false);
  const [renames, setRenames] = useState<[string, string][]>([]);
  const [visitors, setVisitors] = useState(40);
  const [state, setState] = useState('');
  const capacity = s.capacity ?? 30;
  const edit = (next: Setup) => { setS(next); setTouched(true); };

  /** A starting point keeps what he already wrote about himself: the business, the goal, sensitivity. */
  function startFrom(f: number | 'empty' | 'mine') {
    if (f === from) return;
    if (touched && !confirm('להחליף את הכרטיס והמסלולים? מה ששינית בהם לא יישמר.')) return;
    const base = f === 'empty' ? EMPTY : f === 'mine' ? start! : { ...fixtures.find((x) => x.id === f)!.setup, template: f };
    setS({ ...base, business: s.business, anchor: s.anchor, sensitive: s.sensitive, capacity: s.capacity });
    setFrom(f); setRenames([]); setTouched(false);
  }
  const near = useMemo(() => similar(s.business), [s.business]);
  const load = useMemo(() => {
    const paths = s.needs.length ? s.needs.map((n) => n.variants[n.variants.length - 1]!.path) : [s.defaults.private];
    const each = paths.reduce((a, p) => a + minutesIn14(p), 0) / paths.length;
    return { need: Math.round((each * visitors) / 60), have: Math.round((capacity * 10) / 60) };
  }, [s, visitors, capacity]);

  // A "מתי" or "מי הוא" button changes something when a path or a step names it, or (for "(מתי?)") when it asks his date.
  const named = useMemo(() => {
    const out = new Set<string>();
    const walk = (c: unknown) => { if (!c || typeof c !== 'object') return; const o = c as Record<string, unknown>; if (typeof o.tapped === 'string') out.add(o.tapped); for (const v of Object.values(o)) if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') walk(v); };
    for (const n of s.needs) for (const v of n.variants) { walk(v.if); for (const st of v.path.steps) walk(st.onlyIf); }
    return out;
  }, [s]);
  const idle = [...s.when, ...s.who].filter((b) => !named.has(b.label) && !/\(מתי\?\)\s*$/.test(b.label)).map((b) => b.label);
  const lone = ([['מה הוא צריך', s.needs.length], ['מתי', s.when.length], ['מי הוא', s.who.length]] as const).filter(([, n]) => n === 1).map(([q]) => q);
  const list = messagesOf(s);
  const bodyOf = (id: string) => edits[id] ?? textOf(s, own, id);
  // Each check with the step that fixes it; the time is asked right under the list.
  const checks: [boolean, string, number | null][] = [
    [!!s.anchor.goal.trim(), 'נכתב מה יהפוך את האקספו להצלחה', 0],
    [!s.needs.length || s.needs.some((n) => n.goal === 'primary'), 'סומנה מטרה ראשית בין הכפתורים', 1],
    [s.needs.every((n) => n.variants.length > 0), 'לכל כפתור "מה הוא צריך" יש מסלול', 2],
    // 26/10: every "מתי" and "מי הוא" button changes something; a button that changes nothing does not belong on the card.
    [!idle.length, idle.length ? `כפתורים שלא משנים כלום: ${idle.join(', ')}. כדאי לחבר אותם למסלול או להוציא מהכרטיס` : 'כל כפתור "מתי" ו"מי הוא" משנה משהו', 1],
    // Round 4: a question with one button is not a question.
    [!lone.length, lone.length ? `שאלה עם כפתור אחד: ${lone.join(', ')}. כדאי להוסיף עוד אחד, או להוציא אותה` : 'אין שאלה עם כפתור אחד בלבד', 1],
    [load.need <= load.have, 'הזמן שלך מספיק למסלולים (למטה)', null],
  ];
  const messages = list.length;
  const go = (i: number) => { setAt(i); scrollTo(0, 0); };

  async function save() {
    setState('busy');
    // Only the texts he wrote or changed here are his own; the rest stay the suggested ones.
    try { await onSave(s, renames, edits); } catch (e) { setState('לא נשמר: ' + String((e as Error).message ?? e)); return; }
    setState('');
  }
  const can = at === 0 ? !!s.anchor.goal.trim() : true;

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
          <label className="field" htmlFor="su-goal">מה יהפוך את האקספו להצלחה בשבילך?<textarea id="su-goal" className="area" rows={3} placeholder="במילים שלך. למשל: אבות שכבר יש להם חתן, שיבואו למדידה." value={s.anchor.goal} onChange={(e) => setS({ ...s, anchor: { ...s.anchor, goal: e.target.value } })} /></label>
          <label className="field" htmlFor="su-num">ובמספר?<input id="su-num" className="input" placeholder="למשל: 15 מדידות, 30 הזמנות" value={s.anchor.success} onChange={(e) => setS({ ...s, anchor: { ...s.anchor, success: e.target.value } })} /></label>
          <div className="switchrow">
            <span>עסק רגיש<span className="faint small" style={{ display: 'block' }}>שדכנות, טיפול, ייעוץ אישי: בלי שם העסק בהודעות, ורשימת תפוצה רק למי שהסכים.</span></span>
            <button type="button" className="switch" role="switch" aria-checked={s.sensitive} aria-label="עסק רגיש" onClick={() => setS({ ...s, sensitive: !s.sensitive })} />
          </div>
          {(start || s.business.trim().length >= 2) && (
            <div className="q-block">
              <span className="sec">להתחיל מעסק דומה?</span>
              <p className="faint small">הכפתורים והמסלולים שלו נכנסים כהצעה, ובשלבים הבאים משנים הכל. אפשר גם בלי.</p>
              <div className="chips">
                {start && <button type="button" className="chip" aria-pressed={from === 'mine'} onClick={() => startFrom('mine')}>ההקמה שלי עכשיו</button>}
                {(all ? fixtures : near).map((f) => <button key={f.id} type="button" className="chip" aria-pressed={from === f.id} onClick={() => startFrom(f.id)}>{f.name}</button>)}
                {!all && <button type="button" className="chip" onClick={() => setAll(true)}>{near.length ? 'עוד עסקים' : 'לבחור עסק דומה'}</button>}
                <button type="button" className="chip" aria-pressed={from === 'empty'} onClick={() => startFrom('empty')}>כרטיס ריק</button>
              </div>
              {from !== null && from !== 'mine' && (
                <p className="note">{s.needs.length ? `בכרטיס: ${s.needs.map((n) => n.label).join(', ')}.` : 'כרטיס ריק: בשלב הבא מוסיפים כפתורים, או משאירים כרטיס של שם בלבד.'}</p>
              )}
            </div>
          )}
          <p className="faint small">המטרה הזאת נשמרת עם ההקמה. כל מסלול בהמשך צריך לשרת אותה.</p>
        </section>
      )}

      {at === 1 && (
        <section className="panel-w">
          <p className="muted">שלוש שאלות, מה שנוגעים בו בדוכן. המבקר רואה את הכרטיס, לכן כל מילה צריכה להתאים לעיניים שלו. נגיעה בשם משנה אותו, ✕ מוציא אותו.</p>
          {GROUPS.map(([g, q]) => {
            const items = g === 'needs' ? s.needs.map((n) => ({ label: n.label, primary: n.goal === 'primary' })) : s[g].map((b) => ({ label: b.label, primary: false }));
            return (
              <div key={g} className="q-block"><span className="sec">{q}</span>
                <div className="chips">
                  {items.map((b) => <EditChip key={b.label} label={b.label} primary={b.primary}
                    onRename={(to) => { const next = rename(s, b.label, to); if (next !== s) { edit(next); setRenames([...renames, [b.label, to.trim()]]); } }}
                    onRemove={() => { let next = remove(s, g, b.label); if (g === 'needs' && next.needs.length && !next.needs.some((n) => n.goal === 'primary')) next = setGoal(next, next.needs[0]!.label); edit(next); }}
                    onPrimary={g === 'needs' && !b.primary ? () => edit(setGoal(s, b.label)) : undefined} />)}
                  <AddChip onAdd={(l) => { let next = add(s, g, l); if (g === 'needs' && next.needs.length === 1) next = setGoal(next, l.trim()); edit(next); }} />
                </div>
              </div>
            );
          })}
          <p className="faint small">"מה הוא צריך" קובע את המסלול. "מתי" ו"מי הוא" משנים אותו: כפתור שלא משנה כלום לא שייך לכרטיס.</p>
        </section>
      )}

      {at === 2 && (
        <>
          <p className="muted">לכל כפתור: מה קורה אחרי האקספו. בוחרים דפוס, ומשנים כמה ימים עובר בין צעד לצעד.</p>
          {s.needs.map((n, ni) => (
            <PathPick key={n.label} title={n.label} need={n} onPick={(p) => edit({ ...s, needs: s.needs.map((x, i) => (i === ni ? p : x)) })}
              edit={(vi, i, d) => edit(setDays(s, { need: ni, variant: vi }, i, d))} />
          ))}
          {(['business', 'private'] as const).map((k) => (
            <PathPick key={k} title={k === 'business' ? 'בעל עסק שלא סומן אצלו כלום' : 'מבקר שלא סומן אצלו כלום'}
              need={{ label: k, goal: 'secondary', relation: 'customer', variants: [{ path: s.defaults[k] }] }}
              onPick={(p) => edit({ ...s, defaults: { ...s.defaults, [k]: p.variants[0]!.path } })}
              edit={(_vi, i, d) => edit(setDays(s, { default: k } as At, i, d))} />
          ))}
        </>
      )}

      {at === 3 && (
        <section className="panel-w">
          <p className="muted">ההודעות שהמסלולים שולחים, כל אחת עם נוסח מוצע. אפשר לשנות כאן או אחר כך בעמוד "הודעות". פרט בסוגריים מרובעים, כמו [כתובת] או [מחירון], ממלאים פעם אחת ב"פרטים להודעות", והוא נכנס לכל ההודעות.</p>
          {!list.length && <p className="muted">המסלולים שבחרת לא שולחים הודעות.</p>}
          {list.map((m) => {
            const body = bodyOf(m.id);
            const missing = holes(fill(body, { name: 'אני', business: 'העסק', phone: '050-0000000', greeting: 'shalom', sensitive: s.sensitive }, 'ישראל ישראלי'));
            return (
              <label key={m.id} className="field">{m.id} <span className="faint small">· אחרי: {m.after.join(' · ')}{missing.length ? ` · להשלים: ${missing.join(', ')}` : ''}</span>
                <textarea className="area" rows={Math.min(8, body.split('\n').length + 1)} value={body} onChange={(e) => setEdits({ ...edits, [m.id]: e.target.value })} />
              </label>
            );
          })}
        </section>
      )}

      {at === 4 && (
        <>
          <section className="panel-w">
            <ul className="checks">
              {checks.map(([ok, t, to]) => (
                <li key={t} className={ok ? 'ok' : 'miss'}><span aria-hidden="true">{ok ? '✓' : '!'}</span>{t}
                  {!ok && to !== null && <button type="button" className="text-btn" onClick={() => go(to)}>לתקן</button>}
                </li>
              ))}
            </ul>
            <p className="muted">{messages} הודעות יוצאות במסלולים האלה. פרטים שחסרים בהן ממלאים בעמוד "הודעות" › "פרטים להודעות".</p>
            {s.anchor.goal && <p className="note"><b>המטרה:</b> {s.anchor.goal}{s.anchor.success ? ` · ${s.anchor.success}` : ''}</p>}
          </section>
          <section className="panel-w">
            <h2>הזמן שלך</h2>
            <span className="sec">כמה זמן ביום יהיה לך למעקב, בשבועיים שאחרי האקספו?</span>
            <div className="chips">{MINUTES.map((m) => <button key={m} type="button" className="chip" aria-pressed={capacity === m} onClick={() => setS({ ...s, capacity: m })}>{m < 60 ? `${m} דקות` : m === 60 ? 'שעה' : m === 90 ? 'שעה וחצי' : 'שעתיים'}</button>)}</div>
            <label className="field" htmlFor="su-vis">כמה מבקרים אתה מצפה לרשום?<input id="su-vis" className="input days" type="number" min={1} max={2000} inputMode="numeric" value={visitors} onChange={(e) => setVisitors(Math.max(1, Number(e.target.value) || 1))} /></label>
            <p className={load.need > load.have ? 'note warn' : 'note'}>
              {load.need > load.have
                ? `המסלולים ידרשו ממך בערך ${load.need} שעות בשבועיים הראשונים, ויש לך כ־${load.have}. כדאי להרחיק צעדים, להפוך שיחה להודעה, או לשלוח חלק מהכפתורים לרשימת התפוצה. אחרת המשימות יצטברו באיחור.`
                : `המסלולים ידרשו ממך בערך ${load.need} שעות בשבועיים הראשונים, ויש לך כ־${load.have}. זה מתאים.`}
            </p>
            <p className="faint small">החשבון גס: שיחה כ־5 דקות, פגישה כחצי שעה, הכנה כרבע שעה, עשרה ימי עבודה, ולא כל מבקר מגיע לכל צעד.</p>
          </section>
        </>
      )}

      <div className="row">
        {at > 0 && <button type="button" className="btn tall" onClick={() => go(at - 1)}>→ הקודם</button>}
        {at < STEPS.length - 1
          ? <button type="button" className="btn primary tall" disabled={!can} onClick={() => go(at + 1)}>הבא ←</button>
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
    // A button whose path changes by what else was tapped (e.g. "רק בודק מחירים → מחירון מיד") has several; a pattern
    // replaces them all with one, and he is told so first (30/10: they were dropped without a word).
    if (need.variants.length > 1 && !confirm(`ל"${need.label}" יש ${need.variants.length} מסלולים, לפי מה שעוד סומן. מסלול מהרשימה יחליף את כולם במסלול אחד. להחליף?`)) return;
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
