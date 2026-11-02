// The settings (2/11, יצחק): "כל מה שהוגדר בהקמה, מסודר לא כתהליך אלא כהגדרות לשינויים". The prototype's two parts,
// reconsidered: "הדוכן שלי" first — what the visitor sees and what happens after, the part changed most — and "פרטים
// וחיבורים" — him, and how the messages reach the visitors. Up to five chips in each, in his words, the most used first.
// The same pages are the setup's (onboard.tsx), so there is one editor. The consultant floats beside them (App.tsx).
// Nothing has a save button but a change to the card or the paths, which still asks whom it applies to.
import { useEffect, useState } from 'react';
import type { Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import { add, remove, rename, setDays, setGoal } from './lib/edit.ts';
import * as text from './lib/describe.ts';
import { EXPO_DAY, today } from './lib/words.ts';
import { Icon, PageHead, notifySaved, setTheme, setTipsOn, themeNow, tipsOn, type Theme } from './ui.tsx';
import { AddChip, EditChip, GROUPS, PathLines } from './parts.tsx';
import { fill, holes, messagesOf, setTexts, textOf, useTexts, type Me } from './lib/messages.ts';
import { waStatus } from './lib/wa.ts';
import { changeTemplate, leadCount, loadTexts, myGreeting, pinLeads, renameTaps, saveText, setGreeting, waOpenState } from './lib/backend.ts';
import { BoothDefault, Brand, MailChoice, Messages, Morning, OfferEdit, SAMPLE, SelfSign, Signature, Soon, Trial, Versions, WaLink, hasWa, useMe, type Ctx } from './screens.tsx';

type Part = 'booth' | 'details';
export type SetPage = 'card' | 'after' | 'messages' | 'offer' | 'rebuild' | 'me' | 'wa' | 'mail' | 'morning' | 'look';
const BOOTH: [SetPage, string][] = [['card', 'הכרטיס'], ['after', 'אחרי האקספו'], ['messages', 'ההודעות'], ['offer', 'מבצע'], ['rebuild', 'להקים מחדש']];
const DETAILS: [SetPage, string][] = [['me', 'הפרטים שלך'], ['wa', 'וואטסאפ'], ['mail', 'המייל'], ['morning', 'הודעת הבוקר'], ['look', 'מראה']];
const partOf = (p: SetPage): Part => (BOOTH.some(([k]) => k === p) ? 'booth' : 'details');

/** A page another screen asked for (the home page's board), opened when the settings open. */
let asked: SetPage | null = null;
export function openSettings(ctx: Ctx, page: SetPage) { asked = page; ctx.go('settings'); }

/** A setup the consultant built from the floating button, to look at before it replaces his. null: start from a similar business. */
export type Review = { setup: Setup | null; texts?: Record<string, string> };

// ---------- what the board knows: his WhatsApp, his visitors so far, the messages still missing a detail

type WaNow = { open: boolean | null; available: boolean };
function useWaNow(ctx: Ctx): WaNow {
  const [st, setSt] = useState<WaNow>({ open: null, available: true });
  useEffect(() => {
    if (!hasWa(ctx)) return;
    let live = true;
    Promise.all([
      waStatus().then((x) => x.status === 'open').catch(() => null),
      ctx.admin ? Promise.resolve(true) : waOpenState().then((s) => s.open).catch(() => true),
    ]).then(([open, available]) => { if (live) setSt({ open, available }); });
    return () => { live = false; };
  }, [ctx.exhibitor.id, ctx.admin]);
  return st;
}
function missingIn(ctx: Ctx, texts: Record<string, string> | null, me: Me) {
  if (!texts) return { count: 0, details: [] as string[] };
  const per = messagesOf(ctx.setup).map((m) => holes(fill(textOf(ctx.setup, texts, m.id), me, SAMPLE))).filter((h) => h.length);
  return { count: per.length, details: [...new Set(per.flat())] };
}

// ---------- "מוכן לאקספו", on the home page until the day: only what is still missing, each with the one thing to do.
// The sign is not on it (יצחק, 2/11: "השלט לא קשור").

interface Item { id: string; label: string; hint: string; state: 'ok' | 'miss' | 'opt' | 'soon'; act?: [string, () => void] }

export function Ready({ ctx, open }: { ctx: Ctx; open: (p: SetPage) => void }) {
  const texts = useTexts();
  const me = useMe(ctx);
  const wa = useWaNow(ctx);
  const [visitors, setVisitors] = useState<number | null>(null);
  useEffect(() => { leadCount().then(setVisitors).catch(() => setVisitors(null)); }, []);
  if (today() > EXPO_DAY) return null;
  const e = ctx.exhibitor;
  const miss = missingIn(ctx, texts, me);
  const items: Item[] = [
    { id: 'me', label: 'הפרטים שלך', hint: 'השם, העסק והטלפון שבסוף כל הודעה', state: e.name && e.business && e.phone ? 'ok' : 'miss', act: ['להשלים', () => open('me')] },
    { id: 'booth', label: 'הדוכן', hint: 'הכרטיס, ומה קורה אחרי', state: 'ok' },
    { id: 'msgs', label: 'ההודעות', hint: miss.count ? `${miss.count === 1 ? 'הודעה אחת לא תצא' : `${miss.count} הודעות לא ייצאו`} עד שתכתוב ${miss.details.join(', ')}` : 'כל ההודעות מוכנות', state: miss.count ? 'miss' : 'ok', act: ['להשלים', () => open('messages')] },
    ...(hasWa(ctx) ? [{ id: 'wa', label: 'הוואטסאפ שלך', hint: !wa.available ? 'החיבור ייפתח בקרוב' : 'כדי שההודעות ייצאו לבד, מהמספר שלך', state: !wa.available ? 'soon' : wa.open ? 'ok' : 'miss', act: ['לחבר', () => open('wa')] } as Item] : []),
    ...(ctx.phase === 'practice' ? [{ id: 'trial', label: 'ניסיון', hint: 'לרשום בדוכן מבקר לדוגמה, ולראות מה הוא מקבל', state: visitors ? 'ok' : 'miss', act: ['לנסות', () => ctx.go('booth')] } as Item] : []),
    { id: 'logo', label: 'הלוגו שלך', hint: 'בראש כל מייל שיוצא ממך', state: e.logo ? 'ok' : 'opt', act: ['להעלות', () => open('mail')] },
  ];
  const counted = items.filter((i) => i.state === 'ok' || i.state === 'miss');
  const done = counted.filter((i) => i.state === 'ok').length;
  const days = Math.round((Date.parse(EXPO_DAY) - Date.parse(today())) / 86400000);
  const shown = items.filter((i) => i.state === 'miss' || i.state === 'soon');
  if (!shown.length) return null;
  return (
    <section className="ready" aria-label="מוכן לאקספו">
      <div className="ready-head">
        <h2>{`מוכן לאקספו · ${done} מתוך ${counted.length}`}</h2>
        <span className="muted small">{days > 1 ? `עוד ${days} ימים` : days === 1 ? 'מחר' : 'היום'}</span>
      </div>
      <div className="ready-bar" aria-hidden="true"><i style={{ width: `${Math.round((done / Math.max(1, counted.length)) * 100)}%` }} /></div>
      <ul className="ready-list">
        {shown.map((i) => (
          <li key={i.id}>
            <span className="r-t">{i.label}<small>{i.hint}</small></span>
            {i.act && i.state === 'miss'
              ? <button type="button" className="btn primary" onClick={i.act[1]}>{i.act[0]}</button>
              : <span className={'rpill r-' + i.state}>{i.state === 'soon' ? 'בקרוב' : 'לא חובה'}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- trying the booth before the expo is the booth itself, not a setting (the prototype, 17/10): a thin line at
// the head of the booth and the home page, and "לשנות" opens the choice (App.tsx)

export function TrialBar({ ctx, onChange }: { ctx: Ctx; onChange: () => void }) {
  if (ctx.phase !== 'practice') return null;
  const e = ctx.exhibitor;
  return (
    <div className="trial-bar" role="status">
      <span><b>לפני האקספו</b> · {e.trial_send ? 'כל הודעה מגיעה אליך, ולא למבקר' : 'שום הודעה לא יוצאת'}{e.trial_send && e.trial_fast ? ' · יום עובר בדקה' : ''}</span>
      <button type="button" className="text-btn" onClick={onChange}>לשנות</button>
    </div>
  );
}
export function TrialPanel({ ctx }: { ctx: Ctx }) { return <Trial ctx={ctx} />; }

// ---------- the settings

export function Settings({ ctx, desk, onSignOut, review, onReviewed, onConsult }: {
  ctx: Ctx; desk: boolean; onSignOut: () => void;
  review: Review | null; onReviewed: () => void;
  /** Opens the consultant (the floating button's panel). */
  onConsult: () => void;
}) {
  const [page, setPage] = useState<SetPage>(() => { const p = asked; asked = null; return p ?? (review ? 'rebuild' : 'card'); });
  useEffect(() => { if (review) setPage('rebuild'); }, [review]);
  const part = partOf(page);
  const chips = part === 'booth' ? BOOTH : DETAILS.filter(([k]) => k !== 'wa' || hasWa(ctx));
  return (
    <div className="page settings">
      <div className="set-head">
        <PageHead title="הגדרות" tip="כל מה שקבעת בהקמה, מסודר לשינויים. ב'הדוכן שלי': מה שהמבקר רואה, ומה שקורה איתו אחרי האקספו. ב'פרטים וחיבורים': הפרטים שלך, ואיך ההודעות מגיעות למבקרים." />
        <div className="seg" role="group" aria-label="חלק בהגדרות">
          <button type="button" aria-pressed={part === 'booth'} onClick={() => setPage('card')}>הדוכן שלי</button>
          <button type="button" aria-pressed={part === 'details'} onClick={() => setPage('me')}>פרטים וחיבורים</button>
        </div>
      </div>
      <p className="muted set-intro">{part === 'booth'
        ? <><b>הדוכן שלך:</b> מה שהמבקר רואה בכרטיס, ומה שקורה איתו אחרי האקספו. אפשר לשנות כל דבר, גם באמצע.</>
        : <><b>אתה, ואיך ההודעות מגיעות למבקרים.</b> כל שינוי נשמר מיד.</>}</p>
      <nav className="subtabs chips" aria-label={part === 'booth' ? 'הדוכן שלי' : 'פרטים וחיבורים'}>
        {chips.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={page === k} onClick={() => setPage(k)}>{l}</button>)}
      </nav>
      <div className="subview">
        {page === 'card' && <><CardPage ctx={ctx} /><BoothDefault ctx={ctx} /><SelfRegistration ctx={ctx} /></>}
        {page === 'after' && <AfterPage ctx={ctx} />}
        {page === 'messages' && <Messages ctx={ctx} desk={desk} bare />}
        {page === 'offer' && <OfferEdit ctx={ctx} />}
        {page === 'rebuild' && <RebuildPage ctx={ctx} review={review} onReviewed={onReviewed} onConsult={onConsult} />}
        {page === 'me' && <Signature ctx={ctx} />}
        {page === 'wa' && <WaPage ctx={ctx} />}
        {page === 'mail' && <><Greeting ctx={ctx} /><Brand ctx={ctx} />{hasWa(ctx) && <MailChoice ctx={ctx} />}</>}
        {page === 'morning' && <Morning ctx={ctx} />}
        {page === 'look' && <LookPage ctx={ctx} onSignOut={onSignOut} />}
      </div>
    </div>
  );
}

/** Registering on their own at the booth, when there is a queue: an extra, folded under the card (יצחק, 2/11: "אפשר
 *  אולי שיהיה שם כאפשרות נוספת אבל לא יותר"). */
function SelfRegistration({ ctx }: { ctx: Ctx }) {
  return (
    <details className="extra">
      <summary>אפשרות נוספת: מבקרים נרשמים לבד כשיש תור</summary>
      <SelfSign ctx={ctx} />
    </details>
  );
}

// ---------- the pages of "פרטים וחיבורים"

function WaPage({ ctx }: { ctx: Ctx }) {
  const wa = useWaNow(ctx);
  return (
    <>
      {(ctx.admin || wa.available) && <WaLink ctx={ctx} />}
      {!ctx.admin && !wa.available && <Soon title="חיבור הוואטסאפ שלך">סורקים קוד מהטלפון, כמו בוואטסאפ ווב, וההודעות יוצאות מהמספר שלך. החיבור ייפתח בקרוב.</Soon>}
    </>
  );
}

function Greeting({ ctx }: { ctx: Ctx }) {
  const [g, setG] = useState<'shalom' | 'kavod' | null>(null);
  useEffect(() => { myGreeting().then(setG).catch(() => setG('shalom')); }, []);
  async function choose(x: 'shalom' | 'kavod') { setG(x); await setGreeting(ctx.exhibitor.id, x).catch(() => {}); dispatchEvent(new Event('expo-greeting')); }
  return (
    <section className="panel-w">
      <h2>איך אתה פונה למבקרים</h2>
      <p className="muted small">השורה הראשונה בכל הודעה.</p>
      <div className="chips">
        <button type="button" className="chip" aria-pressed={g === 'shalom'} onClick={() => choose('shalom')}>שלום [שם]</button>
        <button type="button" className="chip" aria-pressed={g === 'kavod'} onClick={() => choose('kavod')}>בס"ד · לכבוד ר' [שם]</button>
      </div>
    </section>
  );
}

/** Dark or light (the design system's forest and snow, 31/10), on this device; the "?" beside the titles; the account. */
function LookPage({ ctx, onSignOut }: { ctx: Ctx; onSignOut: () => void }) {
  const [t, setT] = useState<Theme>(themeNow);
  const [tips, setTips] = useState(tipsOn);
  const pick = (x: Theme) => { setTheme(x); setT(x); notifySaved(); };
  return (
    <>
      <section className="panel-w">
        <h2>מראה</h2>
        <div className="chips">
          <button type="button" className="chip" aria-pressed={t === 'forest'} onClick={() => pick('forest')}>כהה</button>
          <button type="button" className="chip" aria-pressed={t === 'snow'} onClick={() => pick('snow')}>בהיר</button>
        </div>
        <p className="muted small">הבחירה נשמרת במכשיר הזה בלבד.</p>
        <div className="switchrow">
          <span>סימן שאלה ליד כל כותרת, עם הסבר קצר</span>
          <button type="button" className="switch" role="switch" aria-checked={tips} aria-label="סימן שאלה ליד כל כותרת" onClick={() => { setTips(!tips); setTipsOn(!tips); notifySaved(); }} />
        </div>
      </section>
      <section className="panel-w">
        <h2>החשבון</h2>
        <p>{ctx.exhibitor.name}{ctx.exhibitor.business ? ` · ${ctx.exhibitor.business}` : ''}</p>
        <div className="row">
          <button type="button" className="btn" onClick={onSignOut}>יציאה</button>
          {ctx.admin && <a className="text-btn" href="https://expo-admin.pages.dev" target="_blank" rel="noreferrer">ניהול האקספו ←</a>}
        </div>
      </section>
    </>
  );
}

// ---------- the booth: the card, the paths, and setting up again. A change with visitors already registered asks
// whether it applies to them too (model, section 13). Used by the settings and by the setup (onboard.tsx).

export function useApply(ctx: Ctx) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  const [ask, setAsk] = useState<{ count: number; setup: Setup; renames: [string, string][]; then?: () => void } | null>(null);
  async function apply(next: Setup, names: [string, string][], then?: () => void, scope?: 'all' | 'new') {
    setBusy(true); setSaved('');
    try {
      if (!scope) {
        const count = await leadCount();
        if (count > 0) { setAsk({ count, setup: next, renames: names, then }); return; }
      }
      if (scope === 'new') await pinLeads(ctx.exhibitor.id);
      await changeTemplate(ctx.exhibitor.id, next);
      // A lead left on the old version keeps the old names of the buttons, as its old setup knows them.
      if (scope !== 'new') for (const [from, to] of names) await renameTaps(from, to);
      ctx.setSetup(next); setAsk(null); then?.();
      notifySaved();
      setSaved(scope === 'new' ? 'השינוי חל על מבקרים שיירשמו מעכשיו. מי שכבר נרשם ממשיך כמו שהיה. הגרסה הקודמת שמורה.'
        : scope === 'all' ? 'השינוי חל מהצעד הבא של כל מבקר, גם של מי שכבר נרשם. הגרסה הקודמת שמורה.' : '');
    } catch (e) { setSaved('לא נשמר: ' + String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }
  const question = ask && (
    <section className="held" aria-label="על מי חל השינוי">
      <h2>{ask.count === 1 ? 'כבר נרשם אצלך מבקר אחד' : `כבר נרשמו אצלך ${ask.count} מבקרים`}. על מי יחול השינוי?</h2>
      <div className="choices">
        <button type="button" className="choice" disabled={busy} onClick={() => apply(ask.setup, ask.renames, ask.then, 'all')}><b>גם עליהם</b><small>מהצעד הבא של כל אחד</small></button>
        <button type="button" className="choice" disabled={busy} onClick={() => apply(ask.setup, ask.renames, ask.then, 'new')}><b>רק על החדשים</b><small>מי שכבר נרשם ממשיך כמו שהיה</small></button>
      </div>
      <button type="button" className="text-btn" disabled={busy} onClick={() => setAsk(null)}>חזרה, בלי לשמור</button>
    </section>
  );
  return { apply, busy, saved, setSaved, question };
}

function EditBar({ busy, changed, onSave, onCancel }: { busy: boolean; changed: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="row">
      <button type="button" className="btn primary tall" disabled={busy || !changed} onClick={onSave}>לשמור את השינויים</button>
      <button type="button" className="btn tall" disabled={busy} onClick={onCancel}>ביטול</button>
    </div>
  );
}

/** The card as the booth shows it: the three questions with their buttons; "עריכה" opens them for change. */
export function CardPage({ ctx }: { ctx: Ctx }) {
  const ap = useApply(ctx);
  const [draft, setDraft] = useState<Setup | null>(null);
  const [renames, setRenames] = useState<[string, string][]>([]);
  const s = draft ?? ctx.setup;
  const done = () => { setDraft(null); setRenames([]); };
  const empty = !s.needs.length && !s.when.length && !s.who.length;
  return (
    <>
      <section className={draft ? 'held' : 'panel-w'}>
        <div className="card-top">
          <h2>הכרטיס בדוכן</h2>
          {!draft && <button type="button" className="btn" onClick={() => { setDraft(ctx.setup); setRenames([]); ap.setSaved(''); }}><Icon name="pen" />עריכה</button>}
        </div>
        <p className="muted small">{draft ? 'נגיעה בכפתור משנה את השם שלו, ✕ מוציא אותו. ★ מסמן את המטרה הראשית.' : 'מה שאתה מסמן בדוכן על כל מבקר. מה שסומן קובע מה קורה איתו אחרי.'}</p>
        {GROUPS.map(([g, q]) => {
          const items = g === 'needs' ? s.needs.map((n) => ({ label: n.label, primary: n.goal === 'primary' })) : s[g].map((b) => ({ label: b.label, primary: false }));
          if (!items.length && !draft) return null;
          return (
            <div key={g} className="q-block"><span className="sec">{q}</span>
              {draft ? (
                <div className="chips">
                  {items.map((b) => <EditChip key={b.label} label={b.label} primary={b.primary}
                    onRename={(to) => { const next = rename(draft, b.label, to); if (next !== draft) { setDraft(next); setRenames([...renames, [b.label, to.trim()]]); } }}
                    onRemove={() => setDraft(remove(draft, g, b.label))}
                    onPrimary={g === 'needs' && draft.needs.length > 1 ? () => setDraft(setGoal(draft, b.label)) : undefined} />)}
                  <AddChip onAdd={(l) => setDraft(add(draft, g, l))} />
                </div>
              ) : (
                <div className="chips">{items.map((b) => <span key={b.label} className={'chip' + (b.primary ? ' on' : '')}>{b.primary ? '★ ' : ''}{b.label}</span>)}</div>
              )}
            </div>
          );
        })}
        {!draft && empty && <p className="muted">בכרטיס רק השם של המבקר. אפשר להוסיף שאלות ב"עריכה".</p>}
      </section>
      {draft && <EditBar busy={ap.busy} changed={JSON.stringify(draft) !== JSON.stringify(ctx.setup)} onSave={() => ap.apply(draft, renames, done)} onCancel={done} />}
      {ap.question}
      {ap.saved && <p className="note">{ap.saved}</p>}
    </>
  );
}

/** What happens with each visitor after the expo, by what was tapped on his card; "עריכה" opens the days. */
export function AfterPage({ ctx }: { ctx: Ctx }) {
  const ap = useApply(ctx);
  const [draft, setDraft] = useState<Setup | null>(null);
  const s = draft ?? ctx.setup;
  const done = () => setDraft(null);
  return (
    <>
      <section className={draft ? 'held' : 'panel-w'}>
        <div className="card-top">
          <h2>מה קורה אחרי האקספו</h2>
          {!draft && <button type="button" className="btn" onClick={() => { setDraft(ctx.setup); ap.setSaved(''); }}><Icon name="pen" />עריכה</button>}
        </div>
        <p className="muted small">{draft ? 'אפשר לשנות כמה ימים עוברים בין צעד לצעד.' : 'לכל כפתור, מה קורה עם המבקר: מתי אתה מתקשר, ואיזו הודעה יוצאת לבד.'}</p>
        {s.needs.map((n, ni) => (
          <div key={n.label} className="q-block">
            <span className="sec">{n.label}</span>
            {n.variants.map((v, vi) => (
              <div key={vi}>
                {n.variants.length > 1 && <span className="muted small">{text.variantTitle(v)}:</span>}
                <PathLines path={v.path} edit={draft ? (i, d) => setDraft(setDays(draft, { need: ni, variant: vi }, i, d)) : undefined} />
              </div>
            ))}
          </div>
        ))}
        <div className="q-block"><span className="sec">מבקר שלא סומן אצלו כלום</span>
          <div><span className="muted small">בעל עסק:</span><PathLines path={s.defaults.business} edit={draft ? (i, d) => setDraft(setDays(draft, { default: 'business' }, i, d)) : undefined} /></div>
          <div><span className="muted small">כל השאר:</span><PathLines path={s.defaults.private} edit={draft ? (i, d) => setDraft(setDays(draft, { default: 'private' }, i, d)) : undefined} /></div>
        </div>
      </section>
      {draft && <EditBar busy={ap.busy} changed={JSON.stringify(draft) !== JSON.stringify(ctx.setup)} onSave={() => ap.apply(draft, [], done)} onCancel={done} />}
      {ap.question}
      {ap.saved && <p className="note">{ap.saved}</p>}
    </>
  );
}

/** Setting up again: a new conversation with the consultant (its panel), or a similar business; and the earlier versions.
 *  A setup the consultant built from the floating button shows here first, and replaces his only when he says so. */
function RebuildPage({ ctx, review, onReviewed, onConsult }: { ctx: Ctx; review: Review | null; onReviewed: () => void; onConsult: () => void }) {
  const ap = useApply(ctx);
  const [picking, setPicking] = useState(!!review && !review.setup);
  const s = ctx.setup;
  const built = review?.setup ?? null;
  async function take(next: Setup, texts: Record<string, string> = {}) {
    await ap.apply(next, [], () => { onReviewed(); setPicking(false); });
    for (const [id, body] of Object.entries(texts)) await saveText(ctx.exhibitor.id, id, body).catch(() => {});
    if (Object.keys(texts).length) loadTexts().then(setTexts).catch(() => {});
  }
  return (
    <>
      {built && (
        <section className="held">
          <h2>היועץ בנה לך דוכן חדש</h2>
          <p className="muted">{built.needs.length ? `בכרטיס: ${built.needs.map((n) => n.label).join(' · ')}.` : 'בכרטיס רק השם של המבקר.'} אם תחליף, הדוכן הנוכחי נשמר בשינויים הקודמים, ואפשר לחזור אליו.</p>
          <div className="row">
            <button type="button" className="btn primary tall" disabled={ap.busy} onClick={() => take(built, review?.texts)}>להחליף לדוכן החדש</button>
            <button type="button" className="btn tall" disabled={ap.busy} onClick={onReviewed}>להשאיר את מה שיש</button>
          </div>
        </section>
      )}
      <section className="panel-w">
        <h2>להקים מחדש</h2>
        <ul className="list" style={{ background: 'var(--surface-2)' }}>
          <li><button type="button" className="list-row" onClick={onConsult}><div className="row-name">שיחה חדשה עם היועץ</div><div className="row-step">מספרים לו מה השתנה, והוא בונה דוכן חדש. הדוכן שלך לא משתנה עד שתבחר להחליף.</div></button></li>
          <li><button type="button" className="list-row" aria-expanded={picking} onClick={() => setPicking(!picking)}><div className="row-name">להתחיל מעסק דומה</div><div className="row-step">הכרטיס והמסלולים של עסק דומה, במקום שלך. מה שכתבת על העסק והמטרה נשאר.</div></button></li>
        </ul>
        {picking && (
          // A template replaces the card and the paths, but keeps what he wrote about himself (his business, his goal,
          // sensitivity, his time), and goes through the same "גם עליהם / רק על החדשים" question as any change (30/10).
          <div className="chips">{fixtures.map((f) => <button key={f.id} type="button" className="chip" disabled={ap.busy} onClick={() => {
            if (!confirm(`להחליף את הכרטיס והמסלולים בשל "${f.name}"? הנוכחיים נשמרים בשינויים הקודמים.`)) return;
            take({ ...f.setup, template: f.id, business: s.business, anchor: s.anchor, sensitive: s.sensitive, capacity: s.capacity });
          }}>{f.name}</button>)}</div>
        )}
      </section>
      {ap.question}
      {ap.saved && <p className="note">{ap.saved}</p>}
      {(s.anchor.goal || s.anchor.success) && (
        <section className="panel-w"><h2>מה תהיה הצלחה באקספו</h2><p>{s.anchor.goal}</p>{s.anchor.success && <p className="muted">{s.anchor.success}</p>}</section>
      )}
      <Versions ctx={ctx} key={ap.saved} onRestore={(old) => ap.apply(old, [])} />
    </>
  );
}
