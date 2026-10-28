// The two lists the admin loads from a file (moved here from the exhibitor's screens, 28/10, with the admin platform).
import { useEffect, useMemo, useState } from 'react';
import { EXHIBITOR_FIELDS, PEOPLE_FIELDS, mapColumns, parseCsv, toRecords, type Fields } from '../lib/csv.ts';
import { adminClearPeople, adminCounts, adminLoadExhibitors, adminLoadPeople } from '../lib/backend.ts';

// ---------- the two lists, from a file: Excel → "שמירה בשם" → CSV. The rows go from the browser straight to the server.

const LISTS = {
  exhibitors: {
    title: 'רשימת המציגים מהמארגן', fields: EXHIBITOR_FIELDS, need: 'email',
    about: 'מי שהמייל שלו ברשימה נכנס לדוכן בלי לחכות לאישור. מי שכבר נרשם וממתין, ומופיע ברשימה, מאושר עכשיו.',
    names: { email: 'מייל', name: 'שם', business: 'עסק' } as Record<string, string>,
  },
  people: {
    title: 'רשימת הקהילה', fields: PEOPLE_FIELDS, need: 'full_name',
    about: 'השמות שהדוכן מחפש בהם. בטלפון של המציג נשמרים רק שם ועיר; הטלפון והמייל נשארים בשרת, ונפתחים רק למציג שהמבקר נרשם אצלו.',
    names: { full_name: 'שם', first: 'שם פרטי', last: 'שם משפחה', city: 'עיר', phone: 'טלפון', email: 'מייל', business_owner: 'בעל עסק', business_name: 'שם העסק' } as Record<string, string>,
  },
};

export function ListLoad({ kind, onDone }: { kind: keyof typeof LISTS; onDone: () => void }) {
  const L = LISTS[kind];
  const [file, setFile] = useState<{ name: string; header: string[]; rows: string[][] } | null>(null);
  const [cols, setCols] = useState<Record<string, number>>({});
  const [replace, setReplace] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState('');
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => { adminCounts().then((c) => setCount(c ? (kind === 'people' ? c.people : c.listed) : null)).catch(() => {}); }, [kind, result]);
  async function pick(f: File | undefined) {
    if (!f) return;
    setResult('');
    const all = parseCsv(await f.text());
    const header = all[0] ?? [];
    setFile({ name: f.name, header, rows: all.slice(1) });
    setCols(mapColumns(header, L.fields as Fields));
  }
  const ready = file && (L.need in cols || (kind === 'people' && ('first' in cols || 'last' in cols)));
  const records = useMemo(() => (file ? toRecords(file.rows, cols) : []), [file, cols]);
  async function load() {
    if (!file) return;
    setResult('');
    try {
      if (kind === 'exhibitors') {
        setProgress('טוען…');
        const r = await adminLoadExhibitors(records);
        setResult(`נטענו ${r.rows} מציגים. ${r.approved ? `${r.approved} שחיכו אושרו עכשיו.` : ''}`);
      } else {
        let removed = 0, added = 0;
        if (replace) { setProgress('מוציא את השמות הקודמים…'); removed = await adminClearPeople(); }
        for (let i = 0; i < records.length; i += 500) {
          setProgress(`טוען ${Math.min(i + 500, records.length)} מתוך ${records.length}…`);
          added += (await adminLoadPeople(records.slice(i, i + 500))).added;
        }
        setResult(`נוספו ${added} אנשים${removed ? `, ו־${removed} שמות קודמים יצאו` : ''}. שמות שכבר היו (אותו שם ואותו טלפון) לא נוספו שוב.`);
      }
      setFile(null); onDone();
    } catch (e) { setResult('לא נטען: ' + String((e as Error).message ?? e)); }
    finally { setProgress(''); }
  }
  return (
    <section className={file ? 'held' : 'panel-w'}>
      <h2>{L.title}{count !== null && <span className="muted small"> · {count} עכשיו</span>}</h2>
      <p className="muted">{L.about}</p>
      {!file ? (
        <>
          <label className="btn" style={{ alignSelf: 'start' }}>
            בחירת קובץ CSV
            <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          <p className="faint small">מאקסל: קובץ ← שמירה בשם ← CSV UTF-8. השורה הראשונה היא הכותרות.</p>
        </>
      ) : (
        <>
          <p><b>{file.name}</b> · {file.rows.length} שורות</p>
          <div className="stack">
            <span className="sec">העמודות שזוהו</span>
            <ul className="list">
              {Object.keys(L.fields).filter((f) => f in cols).map((f) => <li key={f} className="list-row"><div className="row-name">{L.names[f]}</div><div className="row-step">מהעמודה "{file.header[cols[f]!]}"</div></li>)}
            </ul>
            {file.header.some((_, i) => !Object.values(cols).includes(i)) && (
              <p className="faint small">לא בשימוש: {file.header.filter((_, i) => !Object.values(cols).includes(i)).join(' · ')}</p>
            )}
          </div>
          {!ready && <p className="note">לא מצאתי עמודת {L.names[L.need]}. כדאי לבדוק שהשורה הראשונה בקובץ היא הכותרות.</p>}
          {ready && records[0] && (
            <div className="stack">
              <span className="sec">השורה הראשונה, כמו שתיטען</span>
              <div className="note preview">{Object.entries(records[0]).map(([k, v]) => `${L.names[k] ?? k}: ${v === true ? 'כן' : v === false ? 'לא' : v || '—'}`).join('\n')}</div>
            </div>
          )}
          {kind === 'people' && ready && (
            <div className="switchrow">
              <span>במקום השמות שיש עכשיו (מי שכבר נרשם בדוכן נשאר)</span>
              <button type="button" className="switch" role="switch" aria-checked={replace} aria-label="במקום השמות שיש עכשיו" onClick={() => setReplace(!replace)} />
            </div>
          )}
          <div className="row">
            <button type="button" className="btn primary" disabled={!ready || !!progress} onClick={load}>{progress || `לטעון ${records.length} שורות`}</button>
            <button type="button" className="btn" disabled={!!progress} onClick={() => setFile(null)}>ביטול</button>
          </div>
        </>
      )}
      {result && <p className="note">{result}</p>}
    </section>
  );
}

