// The booth: tap the visitor's name and he is saved — before anything else. The card stays open while you talk:
// what he needs, a note, a recording. It never closes by itself; the next name you tap simply opens the next card.
// Where the lead is stored is the caller's business (the database, or the phone alone in the demo).
import { useEffect, useMemo, useRef, useState } from 'react';
import { nextTask, type Setup } from '@expo/engine';
import type { Person } from '../demo/people.ts';
import type { LocalLead, LocalNote } from '../store/local.ts';
import { clock, describe, today } from '../lib/words.ts';
import { Icon } from '../ui.tsx';

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
}

interface Recording { leadId: string; recorder: MediaRecorder; started: number }

export function Booth({ setup, eyebrow, newVisitor, desk, search, saveLead, removeLead, saveNote, todays, notes, waiting, online }: BoothProps) {
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
  ];
  const recordingHere = !!rec && rec.leadId === current?.id;


  return (
    <div className="booth">
      <div className="booth-line">
        <span>{eyebrow ? <span className="sec">{eyebrow} · </span> : null}נרשמו היום: <b>{todays.length}</b></span>
        {!online ? <span className="off">בלי רשת · נשמר בטלפון</span> : waiting ? <span>{waiting} ממתינים לעלות</span> : <span>הכל נשמר</span>}
      </div>

      {typing ? (
        <section className="held" aria-label="מבקר שלא ברשימה">
          <div className="card-top">
            <div className="who"><b>מבקר חדש</b><span className="ctx">מי שלא נמצא ברשימה</span></div>
            <button type="button" className="sq" aria-label="חזרה לחיפוש" onClick={() => { setTyping(null); searchRef.current?.focus(); }}><Icon name="close" /></button>
          </div>
          <div className="typed">
            <label className="field" htmlFor="typed-name">שם<input id="typed-name" className="input" autoFocus value={typing.name} onChange={(e) => setTyping({ ...typing, name: e.target.value })} /></label>
            <label className="field" htmlFor="typed-phone">טלפון<input id="typed-phone" className="input" inputMode="tel" dir="ltr" style={{ textAlign: 'right' }} value={typing.phone} onChange={(e) => setTyping({ ...typing, phone: e.target.value })} /></label>
          </div>
          <div className="row">
            <button type="button" className="btn primary tall" disabled={!typing.name.trim()} onClick={() => capture({ name: typing.name, phone: typing.phone })}>שמירה</button>
            <button type="button" className="btn tall" onClick={() => { setTyping(null); searchRef.current?.focus(); }}>חזרה לחיפוש</button>
          </div>
        </section>
      ) : (
        <>
          <div className="find">
            <input ref={searchRef} id="search" type="search" autoFocus={!current} autoComplete="off" aria-label="חיפוש מבקר" placeholder="שם המבקר" value={query} onChange={(e) => setQuery(e.target.value)} />
            {desk && <button type="button" className="btn" onClick={newOne}><Icon name="plus" />מבקר חדש</button>}
          </div>
          {results.length > 0 && (
            <ul className="list" aria-label="תוצאות">
              {results.map((p) => {
                const done = byPerson.get(p.id);
                return (
                  <li key={p.id}>
                    <button type="button" className="list-row" onClick={() => capture({ person: p })}>
                      <span className="row-big">{p.fullName}</span> <span className="muted">{p.city || 'בלי עיר'}</span>
                      {done && <span className="tag">כבר נרשם</span>}
                      {p.businessOwner && <div className="row-id">בעל עסק</div>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {query.trim().length >= 2 && !results.length && <p className="muted" style={{ textAlign: 'center' }}>לא נמצא ברשימה.</p>}
          {!current && <p className="promise">נגיעה בשם — הוא נשמר. כל השאר רשות.</p>}
          <button type="button" className="text-btn" style={{ alignSelf: 'center' }} onClick={newOne}>לא ברשימה? להקליד שם וטלפון</button>
        </>
      )}

      {current && !typing && (
        <section className="held" aria-label={`הכרטיס של ${current.name}`}>
          <div className="card-top">
            <div className="who"><b>{current.name}</b><span className="ctx">{[current.city ?? current.typedPhone, current.businessOwner ? 'בעל עסק' : ''].filter(Boolean).join(' · ')}</span></div>
            <button type="button" className="sq" aria-label="סגירת הכרטיס" onClick={() => { stopRecording(); setCurrent(null); searchRef.current?.focus(); }}><Icon name="close" /></button>
          </div>

          <div className="tools">
            <button type="button" className="tool" aria-pressed={recordingHere} onClick={recordingHere ? stopRecording : startRecording}>
              {recordingHere ? <><span className="rec-dot" aria-hidden="true" />עצירה ושמירה · {clock(seconds)}</> : <><Icon name="mic" size={22} />הקלטה</>}
            </button>
            <button type="button" className="tool" aria-expanded={noteOpen} onClick={() => setNoteOpen(!noteOpen)}><Icon name="pen" size={22} />הערה</button>
          </div>
          {noteOpen && (
            <div className="typed">
              <textarea id="note" className="area" autoFocus rows={3} aria-label="הערה" placeholder="מה חשוב לזכור עליו. אפשר גם להכתיב במיקרופון של המקלדת." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
              <div className="row"><button type="button" className="btn primary" disabled={!noteText.trim()} onClick={addNote}>שמירת ההערה</button></div>
            </div>
          )}
          {myNotes.length > 0 && <ul className="notes">{myNotes.map((n) => <NoteLine key={n.id} note={n} />)}</ul>}

          {questions.filter(([, items]) => items.length).map(([q, items]) => (
            <div className="q-block" key={q}>
              <span className="sec">{q}</span>
              <div className="chips">
                {items.map((label) => (
                  <button key={label} type="button" className="chip" aria-pressed={current.taps.includes(label)} onClick={() => toggle(label)}>{label}</button>
                ))}
              </div>
            </div>
          ))}
          {wantsDate && (
            <label className="field" htmlFor="customer-date">התאריך שלו<input id="customer-date" type="date" value={current.customerDate ?? ''} onChange={(e) => change({ customerDate: e.target.value || undefined })} style={{ justifySelf: 'start' }} /></label>
          )}

          <p className="next-line">הצעד הבא: <b>{describe(nextTask(setup, current, today()))}</b></p>

          {asking ? (
            <div className="confirm">
              <span>לבטל את הרישום של {current.name}? ההערות וההקלטות שלו יימחקו איתו.</span>
              <div className="row">
                <button type="button" className="btn primary" onClick={cancelLead}>כן, לבטל</button>
                <button type="button" className="btn" onClick={() => setAsking(false)}>לא</button>
              </div>
            </div>
          ) : (
            <button type="button" className="text-btn quiet" onClick={() => setAsking(true)}>ביטול הרישום</button>
          )}
        </section>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}

      <section className="stack" aria-label="נרשמו היום">
        <div className="sec">נרשמו היום · {todays.length}</div>
        {todays.length === 0 ? (
          <div className="empty"><p className="muted">עוד אין. מי שתיגע בשמו יופיע כאן, עם הצעד הבא שלו.</p></div>
        ) : (
          <ul className="list">
            {todays.map((l) => {
              const count = notes.filter((n) => n.leadId === l.id).length;
              return (
                <li key={l.id}>
                  <button type="button" className="list-row" aria-current={current?.id === l.id ? 'true' : undefined} onClick={() => open(l)}>
                    <div className="row-name">{l.name}{!l.synced && <span className="tag">ממתין לעלות</span>}</div>
                    <div className="row-step">{[...l.taps, count ? `${count} הערות` : ''].filter(Boolean).join(' · ') || 'בלי סימון'}</div>
                    <div className="row-id">{describe(nextTask(setup, l, today()))}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function NoteLine({ note }: { note: LocalNote }) {
  const url = useMemo(() => (note.audio ? URL.createObjectURL(note.audio) : null), [note.audio]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  if (note.body) return <li className="note">{note.body}</li>;
  return (
    <li className="note voice">
      <span>הקלטה {note.seconds ? clock(note.seconds) : ''}{!note.synced ? ' · ממתינה לעלות' : ''}</span>
      {url ? <audio controls src={url} preload="metadata" /> : <span className="faint small">נשמרה בשרת</span>}
    </li>
  );
}
