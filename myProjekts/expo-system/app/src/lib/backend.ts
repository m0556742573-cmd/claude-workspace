// The booth's connection to the database. Every lead is written to Supabase at once; when there is no
// network it waits in the phone's own store and goes up as soon as the network is back — the booth never waits.
import { createClient, type Session } from '@supabase/supabase-js';
import { nextTask, type Setup } from '@expo/engine';
import { allLeads, saveLead as saveLocal, type LocalLead } from '../store/local.ts';
import type { Person } from '../demo/people.ts';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);

export interface Exhibitor { id: string; name: string; business: string }

export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } });
}
export const signOut = () => supabase.auth.signOut();

export async function myExhibitor(): Promise<Exhibitor | null> {
  const { data, error } = await supabase.from('exhibitors').select('id, name, business').maybeSingle();
  if (error) throw error;
  return data;
}

export async function activeSetup(exhibitorId: string): Promise<Setup | null> {
  const { data, error } = await supabase.from('setups').select('data').eq('exhibitor_id', exhibitorId).eq('active', true).maybeSingle();
  if (error) throw error;
  return (data?.data as Setup) ?? null;
}

/** The community names (no phone, no mail), kept in memory for a search that does not wait on the network. */
export async function loadDirectory(): Promise<Person[]> {
  const { data, error } = await supabase.rpc('people_directory');
  if (error) throw error;
  return (data ?? []).map((p: { id: string; full_name: string; city: string | null; business_owner: boolean }) =>
    ({ id: p.id, fullName: p.full_name, city: p.city ?? '', businessOwner: p.business_owner }));
}

export function searchIn(directory: Person[], q: string, max = 8): Person[] {
  const words = q.trim().split(/\s+/).filter(Boolean);
  if (q.trim().length < 2) return [];
  return directory.filter((p) => words.every((w) => p.fullName.includes(w))).slice(0, max);
}

async function upload(lead: LocalLead, exhibitorId: string, setup: Setup): Promise<void> {
  const { error } = await supabase.from('leads').upsert({
    id: lead.id,
    exhibitor_id: exhibitorId,
    person_id: lead.personId ?? null,
    typed_name: lead.personId ? null : lead.name,
    typed_phone: lead.typedPhone ?? null,
    taps: lead.taps,
    customer_date: lead.customerDate ?? null,
    note: lead.note || null,
    captured_at: lead.capturedAt,
    captured_on: lead.capturedOn,
  }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
  const n = nextTask(setup, lead, lead.capturedOn);
  const task = n.kind === 'task'
    ? { kind: 'task', step_id: n.stepId, action: n.action, who: n.who, message: n.message ?? null, due_on: n.dueOn, late: n.late, end_reason: null }
    : n.kind === 'askDate'
      ? { kind: 'askDate', step_id: n.stepId, action: null, who: null, message: null, due_on: n.dueOn, late: false, end_reason: null }
      : { kind: 'end', step_id: null, action: null, who: null, message: null, due_on: null, late: false, end_reason: n.reason };
  const t = await supabase.from('tasks').upsert({ lead_id: lead.id, exhibitor_id: exhibitorId, ...task, computed_at: new Date().toISOString() });
  if (t.error) throw t.error;
}

/** Save: to the phone first (never lost), then up to the server; a failure leaves it waiting. */
export async function saveLead(lead: LocalLead, exhibitorId: string, setup: Setup): Promise<'saved' | 'waiting'> {
  await saveLocal({ ...lead, synced: false });
  try {
    await upload(lead, exhibitorId, setup);
    await saveLocal({ ...lead, synced: true });
    return 'saved';
  } catch {
    return 'waiting';
  }
}

/** Send up whatever is still waiting on the phone. Returns how many are still waiting. */
export async function flush(exhibitorId: string, setup: Setup): Promise<number> {
  const waiting = (await allLeads()).filter((l) => !l.synced);
  let left = waiting.length;
  for (const l of waiting) {
    try { await upload(l, exhibitorId, setup); await saveLocal({ ...l, synced: true }); left--; } catch { break; }
  }
  return left;
}

export type { Session };
