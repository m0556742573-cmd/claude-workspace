// The exhibitor's own WhatsApp, linked to the WhatsApp server (wa-server/, on the VPS) by scanning a QR from his phone.
// Every call carries his own sign-in; the server checks it with Supabase. Step 1 (28/10): link, stay linked, unlink.
import { supabase } from './backend.ts';

export const WA_URL: string = import.meta.env.VITE_WA_URL ?? 'https://expo-wa.paydfb.easypanel.host';
export interface WaState { status: 'none' | 'connecting' | 'qr' | 'open' | 'closed'; qr?: string; phone?: string }

async function call<T>(path: string, method: 'GET' | 'POST' = 'GET', body?: object): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { Authorization: `Bearer ${data.session?.access_token ?? ''}` };
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(WA_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? `wa ${r.status}`);
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
/** The keys page (admin only): what is set on the server, never the secret itself. */
export interface AdminKeys { keys: Record<string, string | null>; mail: string | null }
export const adminKeys = () => call<AdminKeys>('/admin/keys');
export const adminSetKey = (name: string, value: string) => call<AdminKeys>('/admin/keys', 'POST', { name, value });
/** A test mail in the real design, with his own booth's name, phone, WhatsApp, logo and colour (30/10). */
export interface MailSample { from_name?: string; subject?: string; sensitive?: boolean; phone?: string | null; whatsapp?: string | null; brand_color?: string | null; logo?: string | null }
export const adminMailTest = (to: string, sample: MailSample = {}) => call<{ ok: true }>('/admin/mail-test', 'POST', { to, ...sample });
export const waStats = () => call<{ sessions: number; open: number; rssMb: number; heapMb: number; uptimeMin: number }>('/wa/stats');

// ---------- the setup consultant (30/10): his conversation runs on the server, which keeps the key and the conversation
export interface ConsultTurn { role: 'assistant' | 'user'; text: string; quick?: string[] }
export interface ConsultDraft { business: string; anchor: { goal: string; success: string }; goals: { primary: string; secondary: string[] }; capacity: string;
  need: { label: string; goal: string; relation: string; steps: string[]; variants: { for: string; steps: string[] }[] }[];
  when: { label: string; effect: string }[]; who: { label: string; effect: string }[]; defaults: { business: string; private: string };
  messages: { name: string; purpose: string }[]; open: string[] }
export interface ConsultState { id: string | null; turns: ConsultTurn[]; draft: ConsultDraft; checks: [string, boolean][]; built: { setup: unknown; texts: Record<string, string> } | null }
export const consultSession = () => call<ConsultState>('/ai/session');
export const consultNew = () => call<ConsultState>('/ai/new', 'POST');
export const consultSay = (session: string | null, text: string) => call<ConsultState>('/ai/say', 'POST', { session, text });
export const consultBuild = (session: string) => call<{ setup: unknown; texts: Record<string, string> }>('/ai/build', 'POST', { session });
