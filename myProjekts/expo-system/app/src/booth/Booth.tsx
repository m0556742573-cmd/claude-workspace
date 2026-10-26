// The booth: find the visitor, tap the card, save — in seconds. Where the lead is stored is the caller's
// business (the database, or the phone alone in the demo); the next step is computed here at once.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { nextTask, type Next, type Setup } from '@expo/engine';
import type { Person } from '../demo/people.ts';
import type { LocalLead } from '../store/local.ts';

const DAYS = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת'];
const ACT: Record<string, string> = { talk: 'שיחה', meet: 'פגישה', prepare: 'להכין', send: 'הודעה', reserve: 'שריון', check: 'בדיקה', wait: 'לחכות ללקוח' };
const END: Record<string, string> = { list: 'רשימת תפוצה', stop: 'בלי מעקב', engaged: 'בטיפול', closed: 'נסגר', notRelevant: 'לא רלוונטי', optOut: 'הוסר' };

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dayLabel(d: string): string {
  if (d === today()) return 'היום';
  const [y, m, day] = d.split('-').map(Number);
  return `${DAYS[new Date(y!, m! - 1, day!).getDay()]} ${day}.${m}`;
}
export function describe(n: Next): string {
  if (n.kind === 'end') return END[n.reason] ?? n.reason;
  if (n.kind === 'askDate') return `לברר את התאריך · ${dayLabel(n.dueOn)}`;
  const who = n.who === 'me' ? 'ממך' : 'אוטומטית';
  return `${ACT[n.action] ?? n.action} ${who} · ${dayLabel(n.dueOn)}${n.late ? ' (מאוחר)' : ''}`;
}

export interface BoothProps {
  setup: Setup;
  /** Above the search: the exhibitor's name, the demo's business picker. */
  header: ReactNode;
  search: (q: string) => Person[];
  save: (lead: LocalLead) => Promise<'saved' | 'waiting'>;
  todays: LocalLead[];
  waiting: number;
  online: boolean;
}

export function Booth({ setup, header, search, save, todays, waiting, online }: BoothProps) {
  const [query, setQuery] = useState('');
  const [person, setPerson] = useState<Person | null>(null);
  const [typed, setTyped] = useState<{ name: string; phone: string } | null>(null);
  const [taps, setTaps] = useState<Set<string>>(new Set());
  const [customerDate, setCustomerDate] = useState('');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { reset(); }, [setup]);

  const results = useMemo(() => (person || typed ? [] : search(query)), [query, person, typed, search]);
  const wantsDate = [...taps].some((t) => t.includes('מתי?'));
  const ready = !busy && !!(person || (typed && typed.name.trim()));

  function toggle(label: string) {
    setTaps((s) => { const n = new Set(s); n.has(label) ? n.delete(label) : n.add(label); return n; });
  }
  function reset() {
    setQuery(''); setPerson(null); setTyped(null); setTaps(new Set()); setCustomerDate(''); setNote('');
  }
  async function onSave() {
    if (!ready) return;
    setBusy(true);
    const lead: LocalLead = {
      id: crypto.randomUUID(),
      capturedOn: today(),
      capturedAt: new Date().toISOString(),
      taps: [...taps],
      customerDate: wantsDate && customerDate ? customerDate : undefined,
      businessOwner: person?.businessOwner ?? false,
      history: [],
      name: person?.fullName ?? typed!.name.trim(),
      city: person?.city,
      personId: person?.id,
      typedPhone: typed?.phone.trim() || undefined,
      note: note.trim(),
      synced: false,
    };
    const where = await save(lead);
    setToast(`${where === 'saved' ? 'נשמר' : 'נשמר בטלפון, יעלה כשתחזור הרשת'}: ${lead.name} · ${describe(nextTask(setup, lead, today()))}`);
    reset();
    setBusy(false);
    setTimeout(() => setToast(''), 4000);
  }

  const questions: [string, string[]][] = [
    ['מה הוא צריך?', setup.needs.map((n) => n.label)],
    ['מתי?', setup.when.map((b) => b.label)],
    ['מי הוא?', setup.who.map((b) => b.label)],
  ];

  return (
    <div className="booth">
      <header className="top">
        {header}
        <span className="count">היום: {todays.length}</span>
        <span className={'sync' + (online && !waiting ? '' : ' off')}>{!online ? 'בלי רשת — נשמר בטלפון' : waiting ? `${waiting} ממתינים לעלות` : 'הכל נשמר'}</span>
      </header>

      <section className="step" aria-label="המבקר">
        {person ? (
          <div className="chosen">
            <div><strong>{person.fullName}</strong> <span className="muted">{person.city}{person.businessOwner ? ' · בעל עסק' : ''}</span></div>
            <button type="button" className="link" onClick={() => setPerson(null)}>החלפה</button>
          </div>
        ) : typed ? (
          <div className="typed">
            <input id="typed-name" autoFocus placeholder="שם" value={typed.name} onChange={(e) => setTyped({ ...typed, name: e.target.value })} />
            <input id="typed-phone" inputMode="tel" placeholder="טלפון" value={typed.phone} onChange={(e) => setTyped({ ...typed, phone: e.target.value })} />
            <button type="button" className="link" onClick={() => setTyped(null)}>חזרה לחיפוש</button>
          </div>
        ) : (
          <>
            <input id="search" className="search" autoFocus placeholder="חיפוש מבקר לפי שם" value={query} onChange={(e) => setQuery(e.target.value)} />
            {results.length > 0 && (
              <ul className="results">
                {results.map((p) => (
                  <li key={p.id}><button type="button" onClick={() => setPerson(p)}><strong>{p.fullName}</strong> <span className="muted">{p.city}</span></button></li>
                ))}
              </ul>
            )}
            {query.trim().length >= 2 && (
              <button type="button" className="link" onClick={() => setTyped({ name: query.trim(), phone: '' })}>לא ברשימה — להקליד שם וטלפון</button>
            )}
          </>
        )}
      </section>

      <section className="step card" aria-label="הכרטיס">
        {questions.filter(([, items]) => items.length).map(([q, items]) => (
          <div className="q" key={q}>
            <span className="qlabel">{q}</span>
            <div className="chips">
              {items.map((label) => (
                <button key={label} type="button" className="chip" aria-pressed={taps.has(label)} onClick={() => toggle(label)}>{label}</button>
              ))}
            </div>
          </div>
        ))}
        {questions.every(([, items]) => !items.length) && <p className="muted">כרטיס של שם בלבד.</p>}
        {wantsDate && (
          <label className="date">מתי? <input id="customer-date" type="date" value={customerDate} onChange={(e) => setCustomerDate(e.target.value)} /></label>
        )}
        <textarea id="note" placeholder="הערה (לא חובה)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </section>

      <button type="button" className="save" disabled={!ready} onClick={onSave}>שמירה</button>
      {toast && <p className="toast" role="status">{toast}</p>}

      <section className="today" aria-label="נרשמו היום">
        <h2>נרשמו היום</h2>
        {todays.length === 0 && <p className="muted">עוד אין. מי שתשמור יופיע כאן, עם הצעד הבא שלו.</p>}
        <ul>
          {todays.map((l) => (
            <li key={l.id}>
              <span><strong>{l.name}</strong>{l.taps.length ? <span className="muted"> · {l.taps.join(' · ')}</span> : null}{!l.synced && <span className="muted"> · ממתין לעלות</span>}</span>
              <span className="next">{describe(nextTask(setup, l, today()))}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
