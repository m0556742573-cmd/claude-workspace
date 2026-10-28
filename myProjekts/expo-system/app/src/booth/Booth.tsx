// The booth: tap the visitor's name and he is saved — before anything else. The card stays open while you talk:
// what he needs, a note, a recording. It never closes by itself; the next name you tap simply opens the next card.
// Where the lead is stored is the caller's business (the database, or the phone alone in the demo).
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONSENT, nextTask, type Setup } from '@expo/engine';
import type { Person } from '../demo/people.ts';
import type { LocalLead, LocalNote } from '../store/local.ts';
import { clock, describe, today } from '../lib/words.ts';
import { Icon } from '../ui.tsx';
import { Qr, joinUrl } from '../join.tsx';

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
  removeLead: (id: string) => Promise<void>;
  saveNote: (note: LocalNote) => Promise<'saved' | 'waiting'>;
  todays: LocalLead[];
  notes: LocalNote[];
  waiting: number;
  online: boolean;
  /** The booth's self-registration code: in a rush, the tablet turns around and shows it. */
  joinCode?: string;
}

interface Recording { leadId: string; recorder: MediaRecorder; started: number }

export function Booth({ setup, eyebrow, newVisitor, desk, search, saveLead, removeLead, saveNote, todays, notes, waiting, online, joinCode }: BoothProps) {
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
  const searchRef = useRef<HTMLInputElement>(null);
  // Saves go one after the other, so a quick second tap never lands before the first.
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => { setCurrent(null); setQuery(''); }, [setup]);
  useEffect(() => { if (newVisitor) newOne(); }, [newVisitor]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setSeconds(Math.round((Date.now() - rec.started) / 1000)), 500);
    return () => clearInterval(t);
  }, [rec]);

  const results = useMemo(() => (typing ? [] : search(query)), [query, typing, search]);
  const byPerson = useMemo(() => new Map(todays.filter((l) => l.personId).map((l) => [l.personId!, l])), [todays]);
  const myNotes = current ? notes.filter((n) => n.leadId === current.id) : [];
  const wantsDate = !!current && current.taps.some((t) => t.includes('מתי?'));

  function say(text: string) { setToast(text); setTimeout(() => setToast((t) => (t === text ? '' : t)), 4500); }
  function store(l: LocalLead): Promise<'saved' | 'waiting'> {
    const p = chain.current.then(() => saveLead(l));
    chain.current = p.catch(() => {});
    return p;
  }
  function open(l: LocalLead) {
    stopRecording();
    setCurrent(l); setNoteOpen(false); setNoteText(''); setAsking(false); setQuery(''); setTyping(null);
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
      personId: who.person?.id,
      typedPhone: who.phone?.trim() || undefined,
      note: '',
      synced: false,
    };
    open(lead);
    const where = await store(lead);
    say(where === 'saved' ? `נשמר: ${lead.name}` : `נשמר בטלפון: ${lead.name} · יעלה כשתחזור הרשת`);
  }

  function change(patch: Partial<LocalLead>) {
    if (!current) return;
    const next = { ...current, ...patch, synced: false };
    setCurrent(next);
    store(next);
  }
  function toggle(label: string) {
    if (!current) return;
    const taps = current.taps.includes(label) ? current.taps.filter((t) => t !== label) : [...current.taps, label];
    change({ taps });
  }

  async function addNote() {
    if (!current || !noteText.trim()) return;
    await saveNote({ id: crypto.randomUUID(), leadId: current.id, body: noteText.trim(), createdAt: new Date().toISOString(), synced: false });
    setNoteText(''); setNoteOpen(false); say('ההערה נשמרה');
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
    stopRecording();
    const name = current.name;
    await removeLead(current.id);
    setCurrent(null); setAsking(false);
    say(`הרישום של ${name} בוטל`);
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
  return (
    <div className="booth">
      {eyebrow && <div className="sec eyebrow">{eyebrow}</div>}
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
