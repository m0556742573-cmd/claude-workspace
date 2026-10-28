// The text each message carries, and filling it for one visitor.
// The default of each message is the text approved in round 9 (consultant-rounds/messages-approved.json) for the
// business the template came from; the exhibitor's own edit (table message_templates) replaces it.
// Whatever is left in square brackets ([כתובת], [שעות]) is a hole: a message with a hole is not sent.
import { useEffect, useState } from 'react';
import type { Path, Setup } from '@expo/engine';
import { fixtures } from '@expo/engine/fixtures/businesses.ts';
import approved from '../../../consultant-rounds/messages-approved.json';
import { loadTexts } from './backend.ts';

const SIGN = '[שם המציג], [העסק] · [טלפון]';

export interface Me { name: string; business: string; phone: string | null; greeting: 'shalom' | 'kavod'; sensitive: boolean }

/** The template a setup was started from, recognised by its buttons. */
function fixtureOf(setup: Setup) {
  const key = (s: Setup) => s.needs.map((n) => n.label).join('|');
  return fixtures.find((f) => key(f.setup) === key(setup));
}

/** Every message the setup sends, in path order, with the buttons it goes out after. */
export function messagesOf(setup: Setup): { id: string; after: string[] }[] {
  const out = new Map<string, Set<string>>();
  const add = (p: Path, after: string) => {
    for (const st of p.steps) if (st.message) (out.get(st.message) ?? out.set(st.message, new Set()).get(st.message)!).add(after);
    if (p.end.kind === 'repeat' && p.end.message) (out.get(p.end.message) ?? out.set(p.end.message, new Set()).get(p.end.message)!).add(after);
  };
  for (const n of setup.needs) for (const v of n.variants) add(v.path, n.label);
  add(setup.defaults.business, 'בעל עסק שלא סומן לו כלום');
  add(setup.defaults.private, 'מבקר שלא סומן לו כלום');
  return [...out].map(([id, after]) => ({ id, after: [...after] }));
}

/** The suggested text: the approved one when there is one, otherwise a frame with the message's name as a hole. */
export function draftFor(setup: Setup, id: string): string {
  const f = fixtureOf(setup);
  const mine = f ? (approved as { id: number; label: string; text: string }[]).filter((a) => a.id === f.id) : [];
  const hit = mine.find((a) => a.label === id) ?? mine.find((a) => id.startsWith(a.label));
  if (hit) return hit.text;
  return `שלום [שם],\n[${id}]\n${SIGN}`;
}

/** The text as the visitor gets it: his name, the exhibitor's signature and greeting. Holes stay as they are. */
export function fill(body: string, me: Me, visitor: string): string {
  let t = body;
  if (me.greeting === 'kavod') t = t.replace(/^שלום \[שם\],?/, 'בס"ד\nלכבוד ר\' [שם],');
  // A sensitive business signs with a name and a phone only.
  if (me.sensitive) t = t.replace(/\[שם המציג\], \[העסק\] · \[טלפון\]/g, '[שם המציג] · [טלפון]');
  t = t.replaceAll('[שם המציג]', me.name).replaceAll('[שם]', visitor);
  if (me.business) t = t.replaceAll('[העסק]', me.business);
  if (me.phone) t = t.replaceAll('[טלפון]', me.phone);
  return t;
}

/** What is still in square brackets after filling. */
export const holes = (t: string) => [...new Set(t.match(/\[[^\]\n]+\]/g) ?? [])];

// The exhibitor's own texts, loaded once and shared by every screen; a save tells them all.
let cache: Record<string, string> | null = null;
export function setTexts(t: Record<string, string>) { cache = t; dispatchEvent(new Event('expo-texts')); }
export function useTexts(): Record<string, string> | null {
  const [t, setT] = useState(cache);
  useEffect(() => {
    const f = () => setT(cache);
    addEventListener('expo-texts', f);
    if (!cache) loadTexts().then(setTexts).catch(() => setTexts({}));
    return () => removeEventListener('expo-texts', f);
  }, []);
  return t;
}
export const textOf = (setup: Setup, texts: Record<string, string> | null, id: string) => texts?.[id] ?? draftFor(setup, id);
