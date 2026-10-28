// The text each message carries: the pure part lives in the engine (engine/src/text.ts), shared with the WhatsApp
// server's planner, so both write the same words. Here: the approved texts bound in, and the exhibitor's own texts,
// loaded once and shared by every screen.
import { useEffect, useState } from 'react';
import { draftFor as draft, textOf as textFrom, type Approved, type Setup } from '@expo/engine';
import approvedJson from '../../../consultant-rounds/messages-approved.json';
import { loadTexts } from './backend.ts';

export { fill, holes, messagesOf, type Me } from '@expo/engine';
const approved = approvedJson as Approved[];

export const draftFor = (setup: Setup, id: string) => draft(setup, id, approved);
export const textOf = (setup: Setup, texts: Record<string, string> | null, id: string) => textFrom(setup, texts, id, approved);

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
