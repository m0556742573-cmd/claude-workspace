// Typing a mail, everywhere one is typed (יצחק, 1/11: "ברגע שמקלידים @ יהיה השלמה כדי לחסוך זמן, וכן ולידציה של התוכן").
// After the @ the common endings come up to tap. A Hebrew keyboard left on ("צםדיק@עצשןךץבםצ") or a slip in the ending
// ("gmial.com") is offered back corrected, in one tap. What is wrong is said in words (mailProblem), not "invalid".
import type { FocusEvent, InputHTMLAttributes } from 'react';

/** The endings offered before any typed on this device. My list for Israel, not checked against the community's mails. */
const COMMON = ['gmail.com', 'walla.co.il', '012.net.il', 'bezeqint.net', 'netvision.net.il', 'hotmail.com', 'outlook.com', 'yahoo.com'];
const KEY = 'expo.mail.endings';

function learned(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>; } catch { return {}; }
}
/** The endings typed on this device come first, the most used first; then the common ones. */
function endings(): string[] {
  const seen = learned();
  return [...new Set([...Object.keys(seen).sort((a, b) => (seen[b] ?? 0) - (seen[a] ?? 0)), ...COMMON])];
}
/** A mail typed whole: its ending comes up first next time on this device (the 30 most used are kept). */
function remember(v: string) {
  const end = v.trim().toLowerCase().split('@')[1];
  if (!end || mailProblem(v)) return;
  try {
    const seen = learned();
    seen[end] = (seen[end] ?? 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 30))));
  } catch { /* a private window keeps nothing */ }
}

const HEBREW = /[א-ת]/;
// The same keys on the Hebrew and the English keyboard, in a computer's and in a phone's layout alike.
const HE = 'קראטוןםפשדגכעיחלךףזסבהנמצתץ';
const EN = 'ertyuiopasdfghjkl;zxcvbnm,.';
/** What was typed with the Hebrew keyboard left on, as the same keys give in English: "צםדיק" → "moshe". */
function fromHebrewKeys(v: string): string {
  return [...v].map((c) => { const i = HE.indexOf(c); return i < 0 ? c : EN[i]; }).join('');
}

/** What is wrong with a typed mail, in words; null when it is fine or empty (whether it may be empty is the screen's). */
export function mailProblem(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  if (HEBREW.test(t)) return 'יש במייל אותיות בעברית. אולי המקלדת נשארה בעברית?';
  if (/\s/.test(t)) return 'יש רווח באמצע המייל.';
  const parts = t.split('@');
  if (parts.length === 1) return 'חסר @ במייל.';
  if (parts.length > 2) return 'יש במייל יותר מ-@ אחד.';
  const [user, end] = parts;
  if (!user) return 'חסר מה שלפני ה-@.';
  if (!end) return 'חסר מה שאחרי ה-@, למשל gmail.com.';
  if (/[^a-z0-9._%+'-]/i.test(user) || /[^a-z0-9.-]/i.test(end)) return 'יש במייל סימן שלא שייך למייל.';
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(end)) return 'מה שאחרי ה-@ לא שלם, למשל gmail.com.';
  return null;
}

/** Edits between two words, a swap of two letters counting as one ("gmial" is one from "gmail"). */
function distance(a: string, b: string): number {
  const w = b.length + 1;
  const d = Array.from({ length: (a.length + 1) * w }, (_, k) => (k < w ? k : k % w === 0 ? k / w : 0));
  const at = (i: number, j: number) => d[i * w + j] ?? 0;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, at(i - 2, j - 2) + 1);
      d[i * w + j] = v;
    }
  }
  return at(a.length, b.length);
}

/**
 * What to offer under the field: the whole mails the endings make (after the @), and one correction (the Hebrew keys
 * read as English, or the nearest known ending). In a field for a phone or a mail, only once there is an @.
 */
export function mailHints(v: string, mixed = false): { options: string[]; fix: string | null } {
  const t = v.trim();
  if (!t || (mixed && !t.includes('@'))) return { options: [], fix: null };
  const base = HEBREW.test(t) ? fromHebrewKeys(t) : t;
  let fix = base !== t && !mailProblem(base) ? base.toLowerCase() : null;
  const parts = base.split('@');
  const [user = '', after = ''] = parts;
  if (parts.length !== 2 || !user) return { options: [], fix };
  const typed = after.toLowerCase();
  const known = endings();
  const options = known.filter((e) => e.startsWith(typed) && e !== typed).slice(0, 4).map((e) => `${user}@${e}`);
  if (!fix && !options.length && typed.includes('.') && !known.includes(typed)) {
    const near = known.map((e) => [e, distance(typed, e)] as const).filter(([, n]) => n > 0 && n <= 2).sort((a, b) => a[1] - b[1])[0];
    if (near) fix = `${user}@${near[0]}`;
  }
  return { options, fix };
}

/**
 * A mail field with its hints under it. `mixed`: the field takes a phone or a mail, and the hints wait for an @.
 * Every other prop goes to the input; dir and style may be given by the screen.
 */
export function MailInput({ value, onValue, mixed, onBlur, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string; onValue: (v: string) => void; mixed?: boolean;
}) {
  const { options, fix } = mailHints(value, mixed);
  const pick = (v: string) => { onValue(v); remember(v); };
  return (
    <>
      <input type={mixed ? 'text' : 'email'} inputMode={mixed ? 'text' : 'email'} dir="ltr" autoCapitalize="none" autoCorrect="off" spellCheck={false} {...rest}
        value={value} onChange={(e) => onValue(e.target.value)} onBlur={(e: FocusEvent<HTMLInputElement>) => { remember(value); onBlur?.(e); }} />
      {(options.length > 0 || fix) && (
        <div className="mail-hints" role="group" aria-label="השלמה למייל">
          {fix && <button type="button" className="chip mail-fix" onClick={() => pick(fix)}>אולי <span dir="ltr">{fix}</span>?</button>}
          {options.map((o) => <button key={o} type="button" className="chip" aria-label={o} onClick={() => pick(o)}><span dir="ltr">@{o.split('@')[1]}</span></button>)}
        </div>
      )}
    </>
  );
}
