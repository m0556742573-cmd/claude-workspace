// Pieces of the setup editor, shared by the settings (התאמה אישית) and the setup step by step.
import { useState } from 'react';
import type { Path } from '@expo/engine';
import * as text from './lib/describe.ts';
import type { Group } from './lib/edit.ts';
import { Icon } from './ui.tsx';

export const GROUPS: [Group, string][] = [['needs', 'מה הוא צריך?'], ['when', 'מתי?'], ['who', 'מי הוא?']];

export function EditChip({ label, primary, onRename, onRemove, onPrimary }: { label: string; primary: boolean; onRename: (to: string) => void; onRemove: () => void; onPrimary?: () => void }) {
  const [v, setV] = useState<string | null>(null);
  if (v !== null) {
    return (
      <span className="chip-edit">
        <input className="input" aria-label={`שם חדש ל${label}`} autoFocus value={v} onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { onRename(v); setV(null); } if (e.key === 'Escape') setV(null); }} />
        <button type="button" className="btn primary" onClick={() => { onRename(v); setV(null); }}>אישור</button>
      </span>
    );
  }
  return (
    <span className="chip chip-x">
      <button type="button" className="chip-l" onClick={() => setV(label)}>{label}{primary && <span className="faint small"> · ראשית</span>}</button>
      {onPrimary && !primary && <button type="button" className="text-btn small" onClick={onPrimary}>לסמן כראשית</button>}
      <button type="button" className="chip-del" aria-label={`להוציא את ${label}`} onClick={onRemove}><Icon name="close" size={16} /></button>
    </span>
  );
}

export function AddChip({ onAdd }: { onAdd: (label: string) => void }) {
  const [v, setV] = useState<string | null>(null);
  if (v === null) return <button type="button" className="chip" onClick={() => setV('')}><Icon name="plus" size={16} /> כפתור</button>;
  return (
    <span className="chip-edit">
      <input className="input" aria-label="כפתור חדש" placeholder="שם הכפתור" autoFocus value={v} onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(v); setV(null); } if (e.key === 'Escape') setV(null); }} />
      <button type="button" className="btn primary" disabled={!v.trim()} onClick={() => { onAdd(v); setV(null); }}>הוספה</button>
      <button type="button" className="btn" onClick={() => setV(null)}>ביטול</button>
    </span>
  );
}

/** The steps of a path, numbered; while editing, each step's days are a field. */
export function PathLines({ path, edit }: { path: Path; edit?: (index: number, days: number) => void }) {
  return (
    <ol className="history" style={{ listStyle: 'decimal', paddingInlineStart: 22 }}>
      {path.steps.length === 0 && <li>{text.path(path)[0]}</li>}
      {path.steps.map((st, i) => {
        const t = st.timing;
        if (!edit || t.kind === 'weekday') return <li key={i}>{text.step(st)}</li>;
        const sign = t.days < 0 ? -1 : 1;
        const unit = t.kind === 'after' ? (i === 0 ? 'ימים אחרי התערוכה' : 'ימים אחרי הצעד הקודם') : t.kind === 'customerDate' ? (t.days < 0 ? 'ימים לפני התאריך שלו' : 'ימים אחרי התאריך שלו') : (t.days < 0 ? 'ימים לפני' : 'ימים אחרי') + ' ' + text.timing({ ...t, days: 0 });
        return (
          <li key={i}>
            {text.step({ ...st, timing: { kind: 'after', days: 0 } }).split(',')[0]},{' '}
            <input className="input days" type="number" min={0} max={365} inputMode="numeric" aria-label={unit} value={Math.abs(t.days)}
              onChange={(e) => edit(i, sign * Math.max(0, Math.min(365, Number(e.target.value) || 0)))} /> {unit}
            {st.message ? <span className="muted"> — "{st.message}"</span> : null}
          </li>
        );
      })}
      {path.steps.length > 0 && <li>{text.end(path.end)}</li>}
    </ol>
  );
}

