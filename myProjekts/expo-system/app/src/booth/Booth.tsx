// The booth: tap the visitor's name and he is saved — before anything else. The card stays open while you talk:
// what he needs, a note, a recording. It never closes by itself; the next name you tap simply opens the next card.
// Where the lead is stored is the caller's business (the database, or the phone alone in the demo).
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONSENT, immediateMessage, messagesOf, nextTask, type Setup } from '@expo/engine';
import type { Person } from '../demo/people.ts';
import { nextRev, type LocalLead, type LocalNote } from '../store/local.ts';
import { clock, describe, today } from '../lib/words.ts';
import { Icon } from '../ui.tsx';
import { Qr, joinUrl } from '../join.tsx';
import { destinationOf, showDestination } from '../lib/destination.ts';

type Checked = { num: string; own: boolean; wa: boolean | null };

export interface BoothProps {
  setup: Setup;
  /** On a computer, the small label naming the part. */
  eyebrow?: string;
  /** Grows each time "＋ מבקר חדש" is tapped in the bar: opens the form for someone not on the list. */
  newVisitor?: number;
  /** A computer: "＋ מבקר חדש" sits beside the search, as in the sketch. */
  desk?: boolean;
  search: (q: string) => Person[];
  saveLead: (lead: LocalLead) => Promise<'saved' | 'waiting'>;
  removeLead: (id: string) => Promise<'saved' | 'waiting'>;
  saveNote: (note: LocalNote) => Promise<'saved' | 'waiting'>;
  todays: LocalLead[];
  notes: LocalNote[];
  waiting: number;
  online: boolean;
  /** The booth's self-registration code: in a rush, the tablet turns around and shows it. */
  joinCode?: string;
  /** The system's phase: practice (sample names, nothing sent), live, or after the fair (the booth is closed). */
  phase?: 'practice' | 'live' | 'after';
  /** The booth's default message: one tap when the path sends nothing at once (17/10). */
  boothDefault?: string | null;
  /** The check at the visit (§10): whether the visitor's numbers have WhatsApp. Live only, with his WhatsApp linked. */
  checkWa?: (leadId: string) => Promise<Checked[] | null>;
  /** Before the fair: he chose to get every message himself instead of nowhere (29/10). */
  trialSend?: boolean;
}

interface Recording { leadId: string; recorder: MediaRecorder; started: number }

export function Booth({ setup, eyebrow, newVisitor, desk, search, saveLead, removeLead, saveNote, todays, notes, waiting, online, joinCode, phase = 'live', boothDefault, checkWa, trialSend }: BoothProps) {
  const practice = phase === 'practice';
  const [picking, setPicking] = useState(false);
  const messages = useMemo(() => messagesOf(setup).map((m) => m.id), [setup]);
  const [showCode, setShowCode] = useState(false);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState<{ name: string; phone: string } | null>(null);
  const [current, setCurrent] = useState<LocalLead | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [rec, setRec] = useState<Recording | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [asking, setAsking] = useState(false);
  const [toast, setToast] = useState('');
  const [checked, setChecked] = useState<Record<string, Checked[]>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  // Visitors cancelled while a recording of theirs was still running: the recording is dropped, not saved (30/10).
  const dropped = useRef(new Set<string>());
  const recRef = useRef<Recording | null>(null);
  recRef.current = rec;
  // "＋ מבקר חדש" from the bar opens the form when pressed, not again each time the booth comes back on screen (30/10).
  const seenNew = useRef(newVisitor);

  useEffect(() => { setCurrent(null); setQuery(''); }, [setup]);
  useEffect(() => { if (newVisitor && newVisitor !== seenNew.current) { seenNew.current = newVisitor; newOne(); } }, [newVisitor]); // eslint-disable-line react-hooks/exhaustive-deps
  // Leaving the booth in the middle of a recording ends it, and it is saved like any other (30/10: before, it was lost
  // and the microphone stayed on).
  useEffect(() => () => { const r = recRef.current; if (r && r.recorder.state !== 'inactive') r.recorder.stop(); }, []);
  // What the visitor added on his own phone reaches the card that is open for him, so the next tap does not erase it.
  useEffect(() => {
    if (!current) return;
    const here = todays.find((l) => l.id === current.id);
    if (here && (here.rev ?? 0) > (current.rev ?? 0)) setCurrent(here);
  }, [todays]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setSeconds(Math.round((Date.now() - rec.started) / 1000)), 500);
    return () => clearInterval(t);
  }, [rec]);

  const results = useMemo(() => (typing ? [] : search(query)), [query, typing, search]);
  const byPerson = useMemo(() => new Map(todays.filter((l) => l.personId).map((l) => [l.personId!, l])), [todays]);
  const myNotes = current ? notes.filter((n) => n.leadId === current.id) : [];
  const wantsDate = !!current && current.taps.some((t) => t.includes('מתי?'));

  /** At the visit: do his numbers have WhatsApp? Once the card is up; the answer stays with the number. */
  function verify(id: string) {
    if (!checkWa || practice) return;
    checkWa(id).then((r) => { if (r) setChecked((m) => ({ ...m, [id]: r })); }).catch(() => {});
  }
  function say(text: string) { setToast(text); setTimeout(() => setToast((t) => (t === text ? '' : t)), 4500); }
  /** Saved on the tablet at once; the upload waits its turn in one line (lib/backend.ts), never ahead of an earlier tap. */
  const store = (l: LocalLead) => saveLead(l);
  function open(l: LocalLead) {
    stopRecording();
    setCurrent(l); setNoteOpen(false); setNoteText(''); setAsking(false); setQuery(''); setTyping(null); setPicking(false);
  }
  /** Someone who is not on the list: a name and a phone, typed. */
  function newOne() {
    stopRecording();
    setCurrent(null); setTyping({ name: query.trim(), phone: '' });
  }

  async function capture(who: { person?: Person; name?: string; phone?: string }) {
    const existing = who.person && byPerson.get(who.person.id);
    if (existing) { open(existing); say(`${existing.name} כבר נרשם היום — פתחתי את הכרטיס שלו`); return; }
    const lead: LocalLead = {
      id: crypto.randomUUID(),
      capturedOn: today(),
      capturedAt: new Date().toISOString(),
      taps: [],
      businessOwner: who.person?.businessOwner ?? false,
      history: [],
      name: who.person?.fullName ?? who.name!.trim(),
      city: who.person?.city,
      personId: practice ? undefined : who.person?.id,
      typedPhone: who.phone?.trim() || undefined,
      note: '',
      synced: false,
      rev: nextRev(),
    };
    open(lead);
    const where = await store(lead);
    say(where === 'saved' ? `נשמר: ${lead.name}` : `נשמר בטלפון: ${lead.name} · יעלה כשתחזור הרשת`);
    if (where === 'saved') verify(lead.id);
  }

  function change(patch: Partial<LocalLead>) {
    if (!current) return;
    const next = { ...current, ...patch, synced: false, rev: nextRev(current.rev) };
    setCurrent(next);
    store(next);
  }
  /** Another number or mail for this visitor (his wife's, the office): it gets every message, as his own does. */
  function setExtra(extra: string[]) {
    if (!current) return;
    const next = { ...current, extra, synced: false, rev: nextRev(current.rev) };
    setCurrent(next);
    store(next).then((w) => { if (w === 'saved') verify(next.id); });
  }
  function toggle(label: string) {
    if (!current) return;
    const taps = current.taps.includes(label) ? current.taps.filter((t) => t !== label) : [...current.taps, label];
    change({ taps });
  }

  /** The box closes at once (the note is on the tablet before the network is asked), so a second tap cannot save it twice
   *  and a slow answer cannot clear what is typed on the next card (30/10). */
  async function addNote() {
    if (!current || !noteText.trim()) return;
    const note = { id: crypto.randomUUID(), leadId: current.id, body: noteText.trim(), createdAt: new Date().toISOString(), synced: false };
    setNoteText(''); setNoteOpen(false);
    const where = await saveNote(note);
    say(where === 'saved' ? 'ההערה נשמרה' : 'ההערה נשמרה בטלפון · תעלה כשתחזור הרשת');
  }

  async function startRecording() {
    if (!current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { say('הטלפון הזה לא מאפשר הקלטה מהדפדפן. אפשר לכתוב הערה, או להכתיב אותה במיקרופון של המקלדת.'); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { say('אין גישה למיקרופון. צריך לאשר אותה בדפדפן.'); return; }
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    const leadId = current.id;
    const started = Date.now();
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (dropped.current.has(leadId)) return;
      const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const secs = Math.max(1, Math.round((Date.now() - started) / 1000));
      if (!audio.size) { say('ההקלטה יצאה ריקה'); return; }
      const where = await saveNote({ id: crypto.randomUUID(), leadId, body: '', audio, seconds: secs, createdAt: new Date().toISOString(), synced: false });
      say(where === 'saved' ? `ההקלטה נשמרה (${clock(secs)})` : `ההקלטה נשמרה בטלפון (${clock(secs)}) · תעלה כשתחזור הרשת`);
    };
    recorder.start();
    setSeconds(0);
    setRec({ leadId, recorder, started });
  }
  function stopRecording() {
    if (rec && rec.recorder.state !== 'inactive') rec.recorder.stop();
    setRec(null);
  }

  async function cancelLead() {
    if (!current) return;
    const name = current.name;
    dropped.current.add(current.id);
    stopRecording();
    setCurrent(null); setAsking(false);
    const where = await removeLead(current.id);
    say(where === 'saved' ? `הרישום של ${name} בוטל` : `הרישום של ${name} בוטל בטאבלט · יימחק גם בשרת כשתחזור הרשת`);
    searchRef.current?.focus();
  }

  const questions: [string, string[]][] = [
    ['מה הוא צריך?', setup.needs.map((n) => n.label)],
    ['מתי?', setup.when.map((b) => b.label)],
    ['מי הוא?', setup.who.map((b) => b.label)],
    // A sensitive business asks before the mailing list.
    ['רשימת התפוצה', setup.sensitive ? [CONSENT] : []],
  ];
  const recordingHere = !!rec && rec.leadId === current?.id;


  const status = !online ? 'בלי רשת · נשמר בטלפון' : waiting ? `${waiting} ממתינים לעלות` : 'הכל נשמר';
  const lastNote = myNotes[myNotes.length - 1];

  // The screens of "דוגמית 3" (יצחק, 28/10): one search field, the largest thing on the screen, with "＋ מבקר חדש" beside it;
  // results as one list with hairlines; the open card as the one outlined object, its actions in a row at the foot.
  if (phase === 'after') {
    return (
      <div className="booth">
        <div className="empty"><b>התערוכה הסתיימה, והדוכן נסגר.</b><br />כל מי שנרשם נמצא ב-CRM, עם הצעד הבא שלו.</div>
      </div>
    );
  }

  return (
    <div className="booth">
      {eyebrow && <div className="sec eyebrow">{eyebrow}</div>}
      {practice && (
        <div className="practice-banner">
          <b>דוכן לניסיון.</b> השמות כאן לדוגמה{trialSend ? ', וההודעות מגיעות אליך ולא למבקר.' : ', ושום הודעה לא נשלחת.'} מה שנרשם עכשיו יימחק כשהמערכת עוברת למצב אמיתי, לפני התערוכה.
        </div>
      )}
      {!online && <p className="offline-line">בלי רשת. כל מי שנרשם נשמר בטלפון ויעלה כשתחזור הרשת.</p>}

      {typing ? (
        <section className="lead" aria-label="מבקר שלא ברשימה">
          <div className="lead-head">
            <div><span className="nm">מבקר חדש</span> <span className="muted">מי שלא נמצא ברשימה</span></div>
            <div className="head-acts"><button type="button" className="btn" onClick={() => { setTyping(null); searchRef.current?.focus(); }}>חזרה לחיפוש</button></div>
          </div>
          <label className="label" htmlFor="typed-name">שם</label>
          <input id="typed-name" className="input" autoFocus value={typing.name} onChange={(e) => setTyping({ ...typing, name: e.target.value })} />
          <label className="label" htmlFor="typed-phone">טלפון</label>
          <input id="typed-phone" className="input" inputMode="tel" dir="ltr" style={{ textAlign: 'right' }} value={typing.phone} onChange={(e) => setTyping({ ...typing, phone: e.target.value })} />
          <div className="actions">
            <button type="button" className="btn primary" disabled={!typing.name.trim()} onClick={() => capture({ name: typing.name, phone: typing.phone })}>✓ שמירה</button>
          </div>
        </section>
      ) : (
        <>
          <div className="search-row">
            <input ref={searchRef} id="search" className="search" type="search" autoFocus={!current} autoComplete="off" aria-label="חיפוש מבקר" placeholder="שם המבקר…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {desk && <button type="button" className="btn new-btn" onClick={newOne}><Icon name="plus" size={18} />מבקר חדש</button>}
            <HelpDot />
          </div>
          {results.length > 0 && (
            <div className="results" role="list" aria-label="תוצאות">
              {results.map((p) => {
                const done = byPerson.get(p.id);
                return (
                  <button key={p.id} type="button" role="listitem" className="result" onClick={() => capture({ person: p })}>
                    <span>
                      <span className="nm">{p.fullName}</span><span className="city">{p.city || 'בלי עיר'}</span>
                      {(p.businessOwner || done) && <span className="mt">{[p.businessOwner ? 'בעל עסק' : '', done ? 'כבר נרשם היום' : ''].filter(Boolean).join(' · ')}</span>}
                    </span>
                    {done && <span className="tag">כבר נרשם</span>}
                  </button>
                );
              })}
              <button type="button" className="result add-row" onClick={newOne}><span className="muted">לא מי שחיפשת? <b>＋ מבקר חדש</b></span></button>
            </div>
          )}
          {query.trim().length >= 2 && !results.length && (
            <div className="results"><button type="button" className="result add-row" onClick={newOne}><span className="muted">לא נמצא ברשימה. <b>＋ מבקר חדש</b></span></button></div>
          )}
          {!current && !query.trim() && (
            <div className="empty">
              כמה אותיות מהשם, ונגיעה בשם — הוא נשמר.<br />כל השאר רשות.
              <div className="empty-acts">
                {!desk && <button type="button" className="text-btn" onClick={newOne}>לא ברשימה? להקליד שם וטלפון</button>}
                {joinCode && <button type="button" className="text-btn" onClick={() => setShowCode(true)}>תור? קוד להרשמה עצמית</button>}
              </div>
            </div>
          )}
        </>
      )}

      {current && !typing && (
        <section className="lead" aria-label={`הכרטיס של ${current.name}`}>
          <div className="lead-head">
            <div>
              <span className="nm">{current.name}</span> <span className="muted">{current.city ?? ''}</span>
              {(current.businessOwner || current.typedPhone || current.self) && (
                <div className="faint">{[current.businessOwner ? 'בעל עסק' : '', current.typedPhone ?? '', current.self ? 'נרשם לבד' : ''].filter(Boolean).join(' · ')}</div>
              )}
            </div>
            <div className="head-acts">
              <span className="saved-tag">{current.synced || online ? '✓ נשמר' : '✓ נשמר בטלפון'}</span>
              <button type="button" className="btn primary" onClick={() => { stopRecording(); setCurrent(null); searchRef.current?.focus(); }}>✓ סיום</button>
            </div>
          </div>

          {questions.filter(([, items]) => items.length).map(([q, items]) => (
            <div key={q}>
              <div className="label">{q}</div>
              <div className="chips">
                {items.map((label) => (
                  <button key={label} type="button" className="chip" aria-pressed={current.taps.includes(label)} onClick={() => toggle(label)}>{label}</button>
                ))}
              </div>
            </div>
          ))}
          {wantsDate && (
            <>
              <label className="label" htmlFor="customer-date">התאריך שלו</label>
              <input id="customer-date" className="input date-in" type="date" value={current.customerDate ?? ''} onChange={(e) => change({ customerDate: e.target.value || undefined })} />
            </>
          )}

          {messages.length > 0 && <SendLine key={current.id} lead={current} setup={setup} messages={messages} boothDefault={boothDefault ?? null} practice={practice} trialSend={!!trialSend} picking={picking}
            onPick={() => setPicking(!picking)} onChoose={(booth) => { change({ booth }); setPicking(false); }}
            checked={checked[current.id]} onExtra={setExtra} />}

          <div className="next-line ro"><span className="faint">מה הלאה:</span> <b>{describe(nextTask(setup, current, today()))}</b></div>

          {lastNote && <NotePeek note={lastNote} count={myNotes.length} />}
          {noteOpen && (
            <div className="note-box">
              <textarea id="note" className="area" autoFocus rows={3} aria-label="הערה" placeholder="מה חשוב לזכור עליו. אפשר גם להכתיב במיקרופון של המקלדת." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <div className="row">
                <button type="button" className="btn primary" disabled={!noteText.trim()} onClick={addNote}>שמירת ההערה</button>
                <button type="button" className="btn ghost" onClick={() => { setNoteOpen(false); setNoteText(''); }}>בלי</button>
              </div>
            </div>
          )}

          {asking ? (
            <div className="confirm">
              <span>לבטל את הרישום של {current.name}? ההערות וההקלטות שלו יימחקו איתו.</span>
              <div className="row">
                <button type="button" className="btn primary" onClick={cancelLead}>כן, לבטל</button>
                <button type="button" className="btn" onClick={() => setAsking(false)}>לא</button>
              </div>
            </div>
          ) : (
            <div className="actions">
              <button type="button" className="btn" aria-expanded={noteOpen} onClick={() => setNoteOpen(!noteOpen)}><Icon name="pen" size={18} />הערה</button>
              <button type="button" className="btn" aria-pressed={recordingHere} onClick={recordingHere ? stopRecording : startRecording}>
                {recordingHere ? <><span className="rec-dot" aria-hidden="true" />עצירה ושמירה · {clock(seconds)}</> : <><Icon name="mic" size={18} />הקלטה</>}
              </button>
              <button type="button" className="btn danger far" onClick={() => setAsking(true)}>ביטול הרישום</button>
            </div>
          )}
        </section>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
      {showCode && joinCode && (
        <div className="code-screen" role="dialog" aria-label="קוד להרשמה עצמית">
          <div className="cs-call">סורקים ונרשמים</div>
          <Qr text={joinUrl(joinCode)} size={300} />
          <div className="cs-how">שם, טלפון, ומה מעניין אותך. תוך רגע זה אצלנו.</div>
          <button type="button" className="btn tall" onClick={() => setShowCode(false)}>חזרה לדוכן</button>
        </div>
      )}

      {todays.length > 0 && (
        <section aria-label="נרשמו היום">
          <div className="label">נרשמו היום · {todays.length}</div>
          <div className="results" role="list">
            {todays.map((l) => {
              const count = notes.filter((n) => n.leadId === l.id).length;
              return (
                <button key={l.id} type="button" role="listitem" className="result" aria-current={current?.id === l.id ? 'true' : undefined} onClick={() => open(l)}>
                  <span>
                    <span className="nm">{l.name}</span><span className="city">{l.city ?? ''}</span>
                    <span className="mt">{[...l.taps, count ? `${count} הערות` : ''].filter(Boolean).join(' · ') || 'בלי סימון'}</span>
                  </span>
                  <span className="r-side">
                    {l.self && <span className="tag">נרשם לבד</span>}
                    {!l.synced && <span className="tag">ממתין לעלות</span>}
                    <span className="r-next">{describe(nextTask(setup, l, today()))}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <p className="foot">נרשמו היום: {todays.length} · {status}</p>
    </div>
  );
}

/**
 * The card's message line (יצחק, 28/10). The path sends by itself; this line says what goes out at once, and lets him
 * choose instead: another message, or none now. A choice replaces the path's immediate message (the engine sees to it),
 * so the visitor never gets two. With nothing in the path and nothing chosen: the default in one tap, or the messages.
 */
function SendLine({ lead, setup, messages, boothDefault, practice, trialSend, picking, onPick, onChoose, checked, onExtra }: {
  lead: LocalLead; setup: Setup; messages: string[]; boothDefault: string | null; practice: boolean; trialSend: boolean; picking: boolean;
  onPick: () => void; onChoose: (booth: LocalLead['booth']) => void;
  /** What the check at the visit found, when it ran. */ checked?: Checked[]; onExtra: (extra: string[]) => void;
}) {
  const auto = immediateMessage(setup, lead);
  const chosen = lead.booth;
  const def = boothDefault && messages.includes(boothDefault) ? boothDefault : null;
  const extra = lead.extra ?? [];
  const noWa = checked?.find((c) => c.own)?.wa === false;
  const [typed, setTyped] = useState('');
  const [bad, setBad] = useState(false);
  function add() {
    const d = destinationOf(typed);
    if (!d) { setBad(true); return; }
    if (!extra.includes(d.value)) onExtra([...extra, d.value]);
    setTyped(''); setBad(false);
  }
  return (
    <div className="send-line">
      <div className="send-row">
        <span className="faint">הודעה:</span>
        {chosen ? (chosen.message ? <span>יוצא לו: <b>{chosen.message}</b></span> : <span>בלי הודעה עכשיו</span>)
          : auto ? <span>יוצא לו מיד: <b>{auto}</b></span>
          : def ? <button type="button" className="btn" onClick={() => onChoose({ message: def })}>לשלוח: {def}</button>
          : !picking && <span className="faint">אין הודעה מיידית במסלול</span>}
        <button type="button" className="text-btn" aria-expanded={picking} onClick={onPick}>{chosen || auto || def ? 'לשנות' : 'לבחור הודעה'}</button>
        {noWa && <span className="faint small">· אין לו וואטסאפ</span>}
        {practice && <span className="faint small">{trialSend ? '· בניסיון יוצא אליך' : '· בניסיון לא נשלח'}</span>}
      </div>
      {extra.length > 0 && (
        <div className="send-row">
          <span className="faint">גם ל:</span>
          {extra.map((v) => {
            const wa = checked?.find((c) => c.num === v)?.wa;
            return (
              <span key={v} className="extra-chip">
                <span dir="ltr">{showDestination(v)}</span>{wa === false && <span className="faint small"> · אין וואטסאפ</span>}
                <button type="button" className="text-btn" aria-label={`להסיר את ${showDestination(v)}`} onClick={() => onExtra(extra.filter((x) => x !== v))}>✕</button>
              </span>
            );
          })}
        </div>
      )}
      {picking && (
        <div className="chips">
          {messages.map((m) => <button key={m} type="button" className="chip" aria-pressed={chosen?.message === m} onClick={() => onChoose({ message: m })}>{m}</button>)}
          <button type="button" className="chip" aria-pressed={!!chosen && !chosen.message} onClick={() => onChoose({})}>בלי הודעה עכשיו</button>
          {chosen && <button type="button" className="chip" onClick={() => onChoose(undefined)}>כמו במסלול</button>}
        </div>
      )}
      {picking && (
        <form className="extra-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input className="input" dir="auto" inputMode="tel" aria-label="גם למספר או מייל נוסף, למשל של אשתו" placeholder="גם למספר או מייל נוסף"
            value={typed} onChange={(e) => { setTyped(e.target.value); setBad(false); }} />
          <button type="submit" className="btn" disabled={!typed.trim()}>להוסיף</button>
          {bad && <span className="err small">זה לא נראה כמו טלפון או מייל</span>}
        </form>
      )}
    </div>
  );
}

/** The "?" beside the search, as beside every title: a few words, and a video once there is one. */
function HelpDot() {
  const [open, setOpen] = useState(false);
  return (
    <span className="help-wrap">
      <button type="button" className="help" aria-expanded={open} aria-label="הסבר: הדוכן" onClick={() => setOpen(!open)}>?</button>
      {open && (
        <div className="tip" role="dialog" aria-label="הסבר: הדוכן">
          <p>מקלידים כמה אותיות מהשם ונוגעים בשם. המבקר נשמר מיד, וכל השאר רשות: מה הוא צריך, מתי, הערה או הקלטה.</p>
          <p className="faint small">סרטון הסבר קצר יופיע כאן בקרוב.</p>
          <button type="button" className="text-btn" onClick={() => setOpen(false)}>סגירה</button>
        </div>
      )}
    </span>
  );
}

/** The last note on the open card, in a grey strip; a recording can be heard from it. */
function NotePeek({ note, count }: { note: LocalNote; count: number }) {
  const url = useMemo(() => (note.audio ? URL.createObjectURL(note.audio) : null), [note.audio]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const more = count > 1 ? <span className="faint"> ({count} הערות)</span> : null;
  if (note.body) return <div className="note-peek">{note.body.slice(0, 120)}{more}</div>;
  return (
    <div className="note-peek voice">
      <span>הקלטה {note.seconds ? clock(note.seconds) : ''}{!note.synced ? ' · ממתינה לעלות' : ''}{more}</span>
      {url ? <audio controls src={url} preload="metadata" /> : <span className="faint small">נשמרה בשרת</span>}
    </div>
  );
}
