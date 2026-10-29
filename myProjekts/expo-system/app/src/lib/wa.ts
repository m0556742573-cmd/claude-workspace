// The exhibitor's own WhatsApp, linked to the WhatsApp server (wa-server/, on the VPS) by scanning a QR from his phone.
// Every call carries his own sign-in; the server checks it with Supabase. Step 1 (28/10): link, stay linked, unlink.
import { supabase } from './backend.ts';

export const WA_URL: string = import.meta.env.VITE_WA_URL ?? 'https://expo-wa.paydfb.easypanel.host';
export interface WaState { status: 'none' | 'connecting' | 'qr' | 'open' | 'closed'; qr?: string; phone?: string }

async function call<T>(path: string, method: 'GET' | 'POST' = 'GET'): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(WA_URL + path, { method, headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } });
  if (!r.ok) throw new Error(`wa ${r.status}`);
  return r.json() as Promise<T>;
}
export const waStatus = () => call<WaState>('/wa/status');
export const waLink = () => call<WaState>('/wa/link', 'POST');
export const waUnlink = () => call<WaState>('/wa/unlink', 'POST');
let known: { at: number; open: Promise<boolean> } | null = null;
/** Is his own WhatsApp linked to the server (so a message can go from his number)? */
export function waOpen(): Promise<boolean> {
  if (!known || Date.now() - known.at > 60_000) known = { at: Date.now(), open: waStatus().then((s) => s.status === 'open').catch(() => false) };
  return known.open;
}
export const forgetWa = () => { known = null; };
export interface Checked { num: string; own: boolean; wa: boolean | null }
/** The check at the visit (model §10): whether each of a visitor's numbers has WhatsApp, each number once. Null when his
 *  WhatsApp is not linked (then a number is checked right before the first message to it). */
export async function waCheck(lead: string): Promise<Checked[] | null> {
  if (!(await waOpen())) return null;
  const r = await call<{ linked: boolean; numbers: Checked[] }>(`/wa/check?lead=${lead}`, 'POST');
  return r.linked ? r.numbers : null;
}
export const waStats = () => call<{ sessions: number; open: number; rssMb: number; heapMb: number; uptimeMin: number }>('/wa/stats');
