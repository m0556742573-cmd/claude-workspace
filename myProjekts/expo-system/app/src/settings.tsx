// The settings (2/11, his "תיישם" to the UX proposal, artifact Tgxo1p6…): one list in five groups, by what the
// exhibitor does and when — his booth, before the expo, on the day, how the messages go out, his account — each row
// showing its state, under a "מוכן לאקספו" board until the day. On a computer the page opens beside the list; on a
// tablet held upright the list and the page are two screens, and "→ הגדרות" stays in sight. The pages are the same
// pieces as before (screens.tsx), set in their place; nothing has a save button but a change to the card or the paths,
// which still asks whom it applies to.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import { add, remove, rename, setDays, setGoal } from './lib/edit.ts';
import * as text from './lib/describe.ts';
import { EXPO_DAY, today } from './lib/words.ts';
import { signPrinted } from './lib/ready.ts';
import { Icon, PageHead, notifySaved, setTheme, setTipsOn, themeNow, tipsOn, type Theme } from './ui.tsx';
import { AddChip, EditChip, GROUPS, PathLines } from './parts.tsx';
import { SetupSteps } from './setup.tsx';
import { fill, holes, messagesOf, setTexts, textOf, useTexts, type Me } from './lib/messages.ts';
import { waStatus } from './lib/wa.ts';
import { changeTemplate, leadCount, loadTexts, myGreeting, pinLeads, renameTaps, saveText, setGreeting, waOpenState } from './lib/backend.ts';
import { BoothDefault, Brand, MailChoice, Morning, OfferEdit, SAMPLE, SelfSign, Signature, Soon, Trial, Versions, WaLink, hasWa, useMe, type Ctx } from './screens.tsx';

export type SetPage = 'card' | 'after' | 'rebuild' | 'trial' | 'sign' | 'offer' | 'boothmsg' | 'wa' | 'mymail' | 'visitormail' | 'me' | 'morning' | 'look';
const TITLE: Record<SetPage, string> = {
  card: 'הכרטיס בדוכן', after: 'אחרי האקספו', rebuild: 'להקים מחדש', trial: 'ניסיון', sign: 'שלט והרשמה עצמית', offer: 'מבצע אקספו',
  boothmsg: 'הודעה בדוכן', wa: 'וואטסאפ', mymail: 'המייל שלך', visitormail: 'המייל של המבקר', me: 'הפרטים שלי', morning: 'הודעת הבוקר', look: 'מראה ועזרה',
};

/** A page another screen asked for (the home page's board), opened when the settings open. */
let asked: SetPage | null = null;
export function openSettings(ctx: Ctx, page: SetPage) { asked = page; ctx.go('settings'); }

/** A setup the consultant built (or "להקים לבד" from it), to review in the steps. */
export type Review = { setup: Setup | null; texts?: Record<string, string> };

// ---------- what the rows and the board know: his WhatsApp, his visitors so far, the messages still missing a detail

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

// ---------- "מוכן לאקספו": until the day, what is ready and what is left, each with the one thing to do

interface Item { id: string; label: string; hint: string; state: 'ok' | 'miss' | 'opt' | 'soon'; act?: [string, () => void] }

export function Ready({ ctx, open, compact }: { ctx: Ctx; open: (p: SetPage) => void; compact?: boolean }) {
  const texts = useTexts();
  const me = useMe(ctx);
  const wa = useWaNow(ctx);
  const [visitors, setVisitors] = useState<number | null>(null);
  useEffect(() => { leadCount().then(setVisitors).catch(() => setVisitors(null)); }, []);
  if (today() > EXPO_DAY) return null;
  const e = ctx.exhibitor;
  const miss = missingIn(ctx, texts, me);
  const items: Item[] = [
    { id: 'me', label: 'הפרטים שלך', hint: 'השם, העסק והטלפון שבחתימה של כל הודעה', state: e.name && e.business && e.phone ? 'ok' : 'miss', act: ['להשלים', () => open('me')] },
    { id: 'booth', label: 'הדוכן', hint: 'הכרטיס והמסלולים', state: 'ok' },
    { id: 'msgs', label: 'ההודעות', hint: miss.count ? `${miss.count === 1 ? 'הודעה אחת לא תצא' : `${miss.count} הודעות לא ייצאו`} עד שתמלא ${miss.details.join(', ')}` : 'כל ההודעות מוכנות לצאת', state: miss.count ? 'miss' : 'ok', act: ['להשלים', () => ctx.go('messages')] },
    ...(hasWa(ctx) ? [{ id: 'wa', label: 'הוואטסאפ שלך', hint: !wa.available ? 'החיבור ייפתח בקרוב' : 'כדי שההודעות ייצאו לבד, מהמספר שלך', state: !wa.available ? 'soon' : wa.open ? 'ok' : 'miss', act: ['לחבר', () => open('wa')] } as Item] : []),
    ...(ctx.phase === 'practice' ? [{ id: 'trial', label: 'ניסיון', hint: 'לרשום בדוכן מבקר לדוגמה, ולראות מה הוא מקבל', state: visitors ? 'ok' : 'miss', act: ['לנסות', () => ctx.go('booth')] } as Item] : []),
    { id: 'sign', label: 'שלט לדוכן', hint: 'קוד QR להרשמה עצמית כשיש תור', state: signPrinted() ? 'ok' : 'miss', act: ['להדפיס', () => open('sign')] },
    { id: 'logo', label: 'הלוגו שלך', hint: 'בראש כל מייל ועל השלט', state: e.logo ? 'ok' : 'opt', act: ['להעלות', () => open('mymail')] },
  ];
  const counted = items.filter((i) => i.state === 'ok' || i.state === 'miss');
  const done = counted.filter((i) => i.state === 'ok').length;
  const days = Math.round((Date.parse(EXPO_DAY) - Date.parse(today())) / 86400000);
  const shown = compact ? items.filter((i) => i.state === 'miss' || i.state === 'soon') : items;
  return (
    <section className="ready" aria-label="מוכן לאקספו">
      <div className="ready-head">
        <h2>{done === counted.length ? 'מוכן לאקספו ✓' : `מוכן לאקספו · ${done} מתוך ${counted.length}`}</h2>
        <span className="muted small">{days > 1 ? `עוד ${days} ימים` : days === 1 ? 'מחר' : 'היום'}</span>
      </div>
      <div className="ready-bar" aria-hidden="true"><i style={{ width: `${Math.round((done / Math.max(1, counted.length)) * 100)}%` }} /></div>
      {compact && done > 0 && <p className="ready-done">{done === 1 ? 'אחד מוכן ✓' : `${done} מוכנים ✓`}</p>}
      <ul className="ready-list">
        {shown.map((i) => (
          <li key={i.id}>
            <span className="r-t">{i.label}<small>{i.hint}</small></span>
            <span className={'rpill r-' + i.state}>{i.state === 'ok' ? '✓ מוכן' : i.state === 'opt' ? 'לא חובה' : i.state === 'soon' ? 'בקרוב' : 'חסר'}</span>
            {i.act && i.state !== 'ok' && i.state !== 'soon' && <button type="button" className={'btn' + (i.state === 'miss' ? ' primary' : '')} onClick={i.act[1]}>{i.act[0]}</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- the list

interface Row { id: SetPage | 'messages'; group: string; label: string; value: ReactNode; warn?: boolean }
const GROUP_ORDER = ['הדוכן שלי', 'לפני האקספו', 'ביום האקספו', 'איך ההודעות יוצאות', 'החשבון שלי'];

export function Settings({ ctx, desk, onSignOut, review, onReviewed, onConsult }: {
  ctx: Ctx; desk: boolean; onSignOut: () => void;
  /** A setup from the consultant to review here, in the steps; cleared when it is saved or dropped. */
  review: Review | null; onReviewed: () => void;
  /** Opens the consultant (the floating button's panel). */
  onConsult: () => void;
}) {
  const [page, setPage] = useState<SetPage | null>(() => { const p = asked; asked = null; return p ?? (review ? 'rebuild' : desk ? 'card' : null); });
  useEffect(() => { if (review) setPage('rebuild'); }, [review]);
  const texts = useTexts();
  const me = useMe(ctx);
  const wa = useWaNow(ctx);
  const e = ctx.exhibitor;
  const s = ctx.setup;
  const miss = missingIn(ctx, texts, me);
  const msgs = messagesOf(s).length;
  const questions = [s.needs.length, s.when.length, s.who.length].filter((n) => n > 0).length;
  const rows: Row[] = [
    { id: 'card', group: 'הדוכן שלי', label: 'הכרטיס בדוכן', value: questions ? `${questions === 1 ? 'שאלה אחת' : `${questions} שאלות`}` : 'שם בלבד' },
    { id: 'after', group: 'הדוכן שלי', label: 'אחרי האקספו', value: s.needs.length === 1 ? 'מסלול אחד' : `${s.needs.length} מסלולים` },
    { id: 'messages', group: 'הדוכן שלי', label: 'ההודעות', value: miss.count ? `${miss.count} להשלים` : msgs ? `${msgs} הודעות` : 'אין הודעות', warn: miss.count > 0 },
    { id: 'rebuild', group: 'הדוכן שלי', label: 'להקים מחדש', value: 'עם היועץ או לבד' },
    ...(ctx.phase === 'practice' ? [{ id: 'trial', group: 'לפני האקספו', label: 'ניסיון', value: e.trial_send ? 'ההודעות אליי' : 'בלי שליחה' } as Row] : []),
    { id: 'sign', group: 'לפני האקספו', label: 'שלט והרשמה עצמית', value: signPrinted() ? 'הודפס' : '' },
    { id: 'offer', group: 'ביום האקספו', label: 'מבצע אקספו', value: e.offer ? (e.offer.items.length === 1 ? 'פריט אחד' : `${e.offer.items.length} פריטים`) : 'אין' },
    ...(msgs ? [{ id: 'boothmsg', group: 'ביום האקספו', label: 'הודעה בדוכן', value: e.booth_default ?? 'בלי' } as Row] : []),
    ...(hasWa(ctx) ? [{ id: 'wa', group: 'איך ההודעות יוצאות', label: 'וואטסאפ', value: !wa.available ? 'בקרוב' : wa.open === null ? '' : wa.open ? 'מחובר' : 'לא מחובר', warn: wa.available && wa.open === false } as Row] : []),
    { id: 'mymail', group: 'איך ההודעות יוצאות', label: 'המייל שלך', value: e.logo ? 'עם לוגו' : 'בלי לוגו' },
    ...(hasWa(ctx) ? [{ id: 'visitormail', group: 'איך ההודעות יוצאות', label: 'המייל של המבקר', value: e.mail_always ? 'תמיד' : 'כשאין וואטסאפ' } as Row] : []),
    { id: 'me', group: 'החשבון שלי', label: 'הפרטים שלי', value: e.name },
    { id: 'morning', group: 'החשבון שלי', label: 'הודעת הבוקר', value: e.morning_mail || e.morning_wa ? `${(e.morning_at ?? '08:00').slice(0, 5)}` : 'כבויה' },
    { id: 'look', group: 'החשבון שלי', label: 'מראה ועזרה', value: themeNow() === 'snow' ? 'בהיר' : 'כהה' },
  ];
  const open = (p: SetPage) => { setPage(p); if (!desk) scrollTo(0, 0); };
  const list = (
    <nav className="set-list" aria-label="ההגדרות">
      {GROUP_ORDER.map((g) => {
        const mine = rows.filter((r) => r.group === g);
        if (!mine.length) return null;
        return (
          <div key={g} className="set-grp">
            <div className="set-grp-h">{g}</div>
            <ul className="list">
              {mine.map((r) => (
                <li key={r.id}>
                  <button type="button" className="set-row" aria-current={page === r.id ? 'true' : undefined} onClick={() => (r.id === 'messages' ? ctx.go('messages') : open(r.id))}>
                    <span className="set-row-l">{r.label}</span>
                    <span className={'set-row-v' + (r.warn ? ' warn' : '')}>{r.value}</span>
                    <span className="chev" aria-hidden="true">‹</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
  const body = page && <SetPageBody page={page} ctx={ctx} onSignOut={onSignOut} review={review} onReviewed={onReviewed} onConsult={onConsult} />;
  if (!desk && page) {
    return (
      <div className="page settings">
        <div className="set-back">
          <button type="button" className="text-btn" onClick={() => setPage(null)}>→ הגדרות</button>
          <b>{TITLE[page]}</b>
        </div>
        <div className="subview">{body}</div>
      </div>
    );
  }
  return (
    <div className="page settings">
      <PageHead title="הגדרות" tip="כל ההגדרות ברשימה אחת, לפי מה שעושים: הדוכן, מה שלפני האקספו, היום עצמו, איך ההודעות יוצאות, והחשבון שלך. כל שינוי נשמר מיד." />
      <Ready ctx={ctx} open={open} compact />
      {desk ? <div className="set-split">{list}<div className="subview set-detail">{body}</div></div> : list}
    </div>
  );
}

function SetPageBody({ page, ctx, onSignOut, review, onReviewed, onConsult }: { page: SetPage; ctx: Ctx; onSignOut: () => void; review: Review | null; onReviewed: () => void; onConsult: () => void }) {
  switch (page) {
    case 'card': return <CardPage ctx={ctx} />;
    case 'after': return <AfterPage ctx={ctx} />;
    case 'rebuild': return <RebuildPage ctx={ctx} review={review} onReviewed={onReviewed} onConsult={onConsult} />;
    case 'trial': return ctx.phase === 'practice' ? <Trial ctx={ctx} /> : <p className="muted">הניסיון נגמר כשהאקספו התחיל.</p>;
    case 'sign': return <SelfSign ctx={ctx} />;
    case 'offer': return <OfferEdit ctx={ctx} />;
    case 'boothmsg': return <BoothDefault ctx={ctx} />;
    case 'wa': return <WaPage ctx={ctx} />;
    case 'mymail': return <><Greeting ctx={ctx} /><Brand ctx={ctx} /><p className="muted small">החתימה של כל הודעה, השם, העסק והטלפון, נמצאת ב"הפרטים שלי".</p></>;
    case 'visitormail': return <MailChoice ctx={ctx} />;
    case 'me': return <Signature ctx={ctx} />;
    case 'morning': return <Morning ctx={ctx} />;
    case 'look': return <LookPage ctx={ctx} onSignOut={onSignOut} />;
  }
}

// ---------- the pages that are new here

function WaPage({ ctx }: { ctx: Ctx }) {
  const wa = useWaNow(ctx);
  return (
    <>
      {(ctx.admin || wa.available) && <WaLink ctx={ctx} />}
      {!ctx.admin && !wa.available && <Soon title="חיבור הוואטסאפ שלך">סורקים קוד QR מהטלפון, כמו בוואטסאפ ווב, וההודעות יוצאות מהמספר שלך. אפשר לנתק בכל רגע.</Soon>}
    </>
  );
}

function Greeting({ ctx }: { ctx: Ctx }) {
  const [g, setG] = useState<'shalom' | 'kavod' | null>(null);
  useEffect(() => { myGreeting().then(setG).catch(() => setG('shalom')); }, []);
  async function choose(x: 'shalom' | 'kavod') { setG(x); await setGreeting(ctx.exhibitor.id, x).catch(() => {}); dispatchEvent(new Event('expo-greeting')); }
  return (
    <section className="panel-w">
      <h2>איך ההודעות שלך פונות לאנשים</h2>
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
        <p className="muted small">נשמר במכשיר הזה.</p>
        <div className="switchrow">
          <span>להציג הסבר ליד כל מסך</span>
          <button type="button" className="switch" role="switch" aria-checked={tips} aria-label="להציג הסבר ליד כל מסך" onClick={() => { setTips(!tips); setTipsOn(!tips); notifySaved(); }} />
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
// whether it applies to them too (model, section 13).

function useApply(ctx: Ctx) {
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
      setSaved(scope === 'new'
        ? 'השינוי חל רק על מבקרים שיירשמו מעכשיו; מי שכבר נרשם ממשיך במסלול שהיה לו. הגרסה הקודמת שמורה.'
        : 'השינוי חל מהצעד הבא של כל מבקר, גם של מי שכבר נרשם. הגרסה הקודמת שמורה.');
    } catch (e) { setSaved('לא נשמר: ' + String((e as Error).message ?? e)); }
    finally { setBusy(false); }
  }
  const question = ask && (
    <section className="held" aria-label="על מי חל השינוי">
      <h2>כבר נרשמו אצלך {ask.count} מבקרים. על מי יחול השינוי?</h2>
      <div className="choices">
        <button type="button" className="choice" disabled={busy} onClick={() => apply(ask.setup, ask.renames, ask.then, 'all')}><b>גם עליהם</b><small>מהצעד הבא של כל אחד</small></button>
        <button type="button" className="choice" disabled={busy} onClick={() => apply(ask.setup, ask.renames, ask.then, 'new')}><b>רק על החדשים</b><small>מי שכבר נרשם ממשיך במסלול שהיה לו</small></button>
      </div>
      <button type="button" className="text-btn" disabled={busy} onClick={() => setAsk(null)}>חזרה, בלי לשמור</button>
    </section>
  );
  return { apply, busy, saved, setSaved, question };
}

function EditBar({ busy, changed, onSave, onCancel }: { busy: boolean; changed: boolean; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="row">
      <button type="button" className="btn primary tall" disabled={busy || !changed} onClick={onSave}>שמירת השינויים</button>
      <button type="button" className="btn tall" disabled={busy} onClick={onCancel}>ביטול</button>
    </div>
  );
}

function CardPage({ ctx }: { ctx: Ctx }) {
  const ap = useApply(ctx);
  const [draft, setDraft] = useState<Setup | null>(null);
  const [renames, setRenames] = useState<[string, string][]>([]);
  const s = draft ?? ctx.setup;
  const done = () => { setDraft(null); setRenames([]); };
  return (
    <>
      <section className={draft ? 'held' : 'panel-w'}>
        <div className="card-top">
          <h2>הכרטיס בדוכן</h2>
          {!draft && <button type="button" className="btn" onClick={() => { setDraft(ctx.setup); setRenames([]); ap.setSaved(''); }}><Icon name="pen" />עריכה</button>}
        </div>
        {draft && <p className="muted small">נגיעה בשם משנה אותו, ✕ מוציא אותו מהכרטיס. שם שמשתנה משתנה גם אצל מי שכבר סומן בו.</p>}
        {GROUPS.map(([g, q]) => {
          const items = g === 'needs' ? s.needs.map((n) => ({ label: n.label, effect: n.goal === 'primary' ? 'המטרה הראשית' : '' })) : s[g];
          if (!items.length && !draft) return null;
          return (
            <div key={g} className="q-block"><span className="sec">{q}</span>
              {draft ? (
                <div className="chips">
                  {items.map((b) => <EditChip key={b.label} label={b.label} primary={g === 'needs' && b.effect === 'המטרה הראשית'}
                    onRename={(to) => { const next = rename(draft, b.label, to); if (next !== draft) { setDraft(next); setRenames([...renames, [b.label, to.trim()]]); } }}
                    onRemove={() => setDraft(remove(draft, g, b.label))}
                    onPrimary={g === 'needs' && draft.needs.length > 1 ? () => setDraft(setGoal(draft, b.label)) : undefined} />)}
                  <AddChip onAdd={(l) => setDraft(add(draft, g, l))} />
                </div>
              ) : (
                <ul className="history">{items.map((b) => <li key={b.label}><b style={{ color: 'var(--ink)' }}>{b.label}</b>{b.effect ? ` — ${b.effect}` : null}</li>)}</ul>
              )}
            </div>
          );
        })}
        {!draft && !s.needs.length && !s.when.length && !s.who.length && <p className="muted">כרטיס של שם בלבד.</p>}
      </section>
      {draft && <EditBar busy={ap.busy} changed={JSON.stringify(draft) !== JSON.stringify(ctx.setup)} onSave={() => ap.apply(draft, renames, done)} onCancel={done} />}
      {ap.question}
      {ap.saved && <p className="note">{ap.saved}</p>}
    </>
  );
}

function AfterPage({ ctx }: { ctx: Ctx }) {
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
        {draft && <p className="muted small">אפשר לשנות כמה ימים עובר בין צעד לצעד. צעד חדש לכפתור חדש: שיחה ממך שלושה ימים אחרי האקספו.</p>}
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
          <div><span className="muted small">פרטי:</span><PathLines path={s.defaults.private} edit={draft ? (i, d) => setDraft(setDays(draft, { default: 'private' }, i, d)) : undefined} /></div>
        </div>
      </section>
      {draft && <EditBar busy={ap.busy} changed={JSON.stringify(draft) !== JSON.stringify(ctx.setup)} onSave={() => ap.apply(draft, [], done)} onCancel={done} />}
      {ap.question}
      {ap.saved && <p className="note">{ap.saved}</p>}
    </>
  );
}

/** Setting up again: with the consultant (in its panel), step by step, or from a similar business; and the versions. */
function RebuildPage({ ctx, review, onReviewed, onConsult }: { ctx: Ctx; review: Review | null; onReviewed: () => void; onConsult: () => void }) {
  const ap = useApply(ctx);
  const [steps, setSteps] = useState(false);
  const [picking, setPicking] = useState(false);
  const s = ctx.setup;
  const reviewing = !!review;
  const close = () => { setSteps(false); onReviewed(); };
  const first = useMemo(() => review?.setup ?? s, [review, s]);
  if (steps || reviewing) {
    // The result of saving (or the question about existing visitors) shows here too, not only outside the steps (30/10).
    return (
      <>
        {review?.setup && <p className="note">היועץ בנה את ההקמה הזאת. כדאי לעבור על כל שלב, ושום דבר לא נשמר לפני "שמירת ההקמה".</p>}
        <SetupSteps key={review?.setup ? 'built' : 'mine'} start={first} texts={review?.texts} business={ctx.exhibitor.business} onCancel={close}
          onSave={async (next, names, texts) => {
            await ap.apply(next, names, close);
            for (const [id, body] of Object.entries(texts)) await saveText(ctx.exhibitor.id, id, body).catch(() => {});
            if (Object.keys(texts).length) loadTexts().then(setTexts).catch(() => {});
          }} />
        {ap.question}
      </>
    );
  }
  return (
    <>
      <section className="panel-w">
        <h2>איך מקימים</h2>
        <ul className="list" style={{ background: 'var(--surface-2)' }}>
          <li><button type="button" className="list-row" onClick={onConsult}><div className="row-name">שיחה עם היועץ</div><div className="row-step">היועץ שואל על העסק ובונה הקמה. היא נפתחת כאן לבדיקה, ונשמרת רק כשתאשר. השיחה נשמרת, ואפשר לחזור אליה.</div></button></li>
          <li><button type="button" className="list-row" onClick={() => { setSteps(true); ap.setSaved(''); scrollTo(0, 0); }}><div className="row-name">לבד, שלב אחר שלב</div><div className="row-step">חמישה שלבים קצרים: העסק והמטרה, הכרטיס, מה קורה אחרי, ההודעות, ובדיקה.</div></button></li>
          <li><button type="button" className="list-row" aria-expanded={picking} onClick={() => setPicking(!picking)}><div className="row-name">להתחיל מעסק דומה</div><div className="row-step">הכרטיס והמסלולים של עסק מהסבבים, במקום שלך.</div></button></li>
        </ul>
        {picking && (
          // A template replaces the card and the paths, but keeps what he wrote about himself (his business, his goal,
          // sensitivity, his time), and goes through the same "גם עליהם / רק על החדשים" question as any change (30/10).
          <div className="chips">{fixtures.map((f) => <button key={f.id} type="button" className="chip" disabled={ap.busy} onClick={() => {
            if (!confirm(`להחליף את הכרטיס והמסלולים בתבנית "${f.name}"? הגרסה הנוכחית נשמרת, ואפשר לחזור אליה.`)) return;
            setPicking(false);
            ap.apply({ ...f.setup, template: f.id, business: s.business, anchor: s.anchor, sensitive: s.sensitive, capacity: s.capacity }, []);
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
