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
export const waStats = () => call<{ sessions: number; open: number; rssMb: number; heapMb: number; uptimeMin: number }>('/wa/stats');
