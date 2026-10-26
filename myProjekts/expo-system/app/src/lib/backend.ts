// The booth's connection to the database. Every lead is written to Supabase at once; when there is no
// network it waits in the phone's own store and goes up as soon as the network is back — the booth never waits.
import { createClient, type Session } from '@supabase/supabase-js';
import { nextTask, type Setup } from '@expo/engine';
import { allLeads, saveLead as saveLocal, type LocalLead } from '../store/local.ts';
import type { Person } from '../demo/people.ts';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);

export interface Exhibitor { id: string; name: string; business: string; approved: boolean }

export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } });
}
export const signOut = () => supabase.auth.signOut();

export async function myExhibitor(): Promise<Exhibitor | null> {
  const { data, error } = await supabase.from('exhibitors').select('id, name, business, approved').maybeSingle();
  if (error) throw error;
  return data;
}

export async function activeSetup(exhibitorId: string): Promise<Setup | null> {
  const { data, error } = await supabase.from('setups').select('data').eq('exhibitor_id', exhibitorId).eq('active', true).maybeSingle();
  if (error) throw error;
  return (data?.data as Setup) ?? null;
}

/** Until the setup screens exist: start from a ready template of a business from the rounds. */
export async function startFromTemplate(exhibitorId: string, setup: Setup): Promise<void> {
  const { error } = await supabase.from('setups').insert({ exhibitor_id: exhibitorId, version: 1, data: setup, source: 'manual', active: true });
  if (error) throw error;
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

// ---------- after the expo: tasks, leads, history

export interface LeadRow {
  id: string; person_id: string | null; typed_name: string | null; typed_phone: string | null; taps: string[];
  customer_date: string | null; note: string | null; captured_on: string; captured_at: string;
}
export interface TaskRow {
  lead_id: string; kind: 'task' | 'askDate' | 'end'; step_id: string | null; action: string | null; who: string | null;
  message: string | null; due_on: string | null; late: boolean; end_reason: string | null;
}
export interface StepRow { lead_id: string; step_id: string; done_on: string; outcome: string }

export async function listLeads(): Promise<LeadRow[]> {
  const { data, error } = await supabase.from('leads').select('*').order('captured_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function listTasks(): Promise<TaskRow[]> {
  const { data, error } = await supabase.from('tasks').select('*');
  if (error) throw error;
  return data ?? [];
}
export async function listSteps(leadId?: string): Promise<StepRow[]> {
  let q = supabase.from('lead_steps').select('lead_id, step_id, done_on, outcome').order('created_at');
  if (leadId) q = q.eq('lead_id', leadId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

function toLead(row: LeadRow, steps: StepRow[], businessOwner: boolean) {
  return {
    id: row.id, capturedOn: row.captured_on, taps: row.taps, customerDate: row.customer_date ?? undefined, businessOwner,
    history: steps.map((s) => ({ stepId: s.step_id, doneOn: s.done_on, outcome: s.outcome as 'engaged' })),
  };
}

async function recompute(row: LeadRow, exhibitorId: string, setup: Setup, businessOwner: boolean, onDay: string) {
  const steps = await listSteps(row.id);
  const n = nextTask(setup, toLead(row, steps, businessOwner), onDay);
  const task = n.kind === 'task'
    ? { kind: 'task', step_id: n.stepId, action: n.action, who: n.who, message: n.message ?? null, due_on: n.dueOn, late: n.late, end_reason: null }
    : n.kind === 'askDate'
      ? { kind: 'askDate', step_id: n.stepId, action: null, who: null, message: null, due_on: n.dueOn, late: false, end_reason: null }
      : { kind: 'end', step_id: null, action: null, who: null, message: null, due_on: null, late: false, end_reason: n.reason };
  const { error } = await supabase.from('tasks').upsert({ lead_id: row.id, exhibitor_id: exhibitorId, ...task, computed_at: new Date().toISOString() });
  if (error) throw error;
}

/** He did the step: how it ended. The engine sets the next one at once. */
export async function markStep(row: LeadRow, stepId: string, outcome: string, exhibitorId: string, setup: Setup, businessOwner: boolean, onDay: string) {
  const { error } = await supabase.from('lead_steps').upsert({ lead_id: row.id, step_id: stepId, done_on: onDay, outcome }, { onConflict: 'lead_id,step_id' });
  if (error) throw error;
  await recompute(row, exhibitorId, setup, businessOwner, onDay);
}

/** He found out the visitor's date (the wedding, the event): the path continues from it. */
export async function setCustomerDate(row: LeadRow, date: string, exhibitorId: string, setup: Setup, businessOwner: boolean, onDay: string) {
  const { error } = await supabase.from('leads').update({ customer_date: date }).eq('id', row.id);
  if (error) throw error;
  await recompute({ ...row, customer_date: date }, exhibitorId, setup, businessOwner, onDay);
}

// ---------- settings and the admin

export async function myGreeting(): Promise<'shalom' | 'kavod'> {
  const { data } = await supabase.from('exhibitors').select('greeting').maybeSingle();
  return (data?.greeting as 'shalom' | 'kavod') ?? 'shalom';
}
export async function setGreeting(exhibitorId: string, greeting: 'shalom' | 'kavod') {
  const { error } = await supabase.from('exhibitors').update({ greeting }).eq('id', exhibitorId);
  if (error) throw error;
}

export async function isAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc('is_admin');
  return !!data;
}
export interface AdminExhibitor { id: string; name: string; email: string | null; business: string; approved: boolean; created_at: string; leads: number }
export async function adminExhibitors(): Promise<AdminExhibitor[]> {
  const { data, error } = await supabase.rpc('admin_exhibitors');
  if (error) throw error;
  return data ?? [];
}
export async function adminApprove(id: string, ok: boolean) {
  const { error } = await supabase.rpc('admin_approve', { exhibitor: id, ok });
  if (error) throw error;
}

/** A new version of the setup from a template; the old one stays in the history, inactive. */
export async function changeTemplate(exhibitorId: string, setup: Setup): Promise<void> {
  const { data } = await supabase.from('setups').select('version').eq('exhibitor_id', exhibitorId).order('version', { ascending: false }).limit(1);
  const version = (data?.[0]?.version ?? 0) + 1;
  const off = await supabase.from('setups').update({ active: false }).eq('exhibitor_id', exhibitorId).eq('active', true);
  if (off.error) throw off.error;
  const { error } = await supabase.from('setups').insert({ exhibitor_id: exhibitorId, version, data: setup, source: 'manual', active: true });
  if (error) throw error;
}
