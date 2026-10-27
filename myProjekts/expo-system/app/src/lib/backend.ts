// The app's connection to the database. Every lead and note is written to the phone first and to Supabase at once;
// without a network it waits on the phone and goes up as soon as the network is back — the booth never waits.
import { createClient, type Session } from '@supabase/supabase-js';
import { nextTask, type Action, type Lead, type ManualStep, type Setup, type StepRecord, type Who } from '@expo/engine';
import { allLeads, allNotes, dropLead, dropNote, putLead, putNote, type LocalLead, type LocalNote } from '../store/local.ts';
import type { Person } from '../demo/people.ts';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);
export type { Session };

export interface Exhibitor { id: string; name: string; business: string; approved: boolean; phone: string | null; email: string | null; sensitive: boolean }

export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } });
}
export const signOut = () => supabase.auth.signOut();

export async function myExhibitor(): Promise<Exhibitor | null> {
  const { data, error } = await supabase.from('exhibitors').select('id, name, business, approved, phone, email, sensitive').maybeSingle();
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

/** A new version of the setup; the old one stays in the history, inactive. */
export async function changeTemplate(exhibitorId: string, setup: Setup): Promise<void> {
  const { data } = await supabase.from('setups').select('version').eq('exhibitor_id', exhibitorId).order('version', { ascending: false }).limit(1);
  const version = (data?.[0]?.version ?? 0) + 1;
  const off = await supabase.from('setups').update({ active: false }).eq('exhibitor_id', exhibitorId).eq('active', true);
  if (off.error) throw off.error;
  const { error } = await supabase.from('setups').insert({ exhibitor_id: exhibitorId, version, data: setup, source: 'manual', active: true });
  if (error) throw error;
}

// ---------- the community names (no phone, no mail), kept in memory for a search that does not wait

export async function loadDirectory(): Promise<Person[]> {
  const { data, error } = await supabase.rpc('people_directory');
  if (error) throw error;
  return (data ?? []).map((p: { id: string; full_name: string; city: string | null; business_owner: boolean }) =>
    ({ id: p.id, fullName: p.full_name, city: p.city ?? '', businessOwner: p.business_owner }));
}

export function searchIn(directory: Person[], q: string, max = 8): Person[] {
  const words = q.trim().split(/\s+/).filter(Boolean);
  if (q.trim().length < 2) return [];
  return directory.filter((p) => words.every((w) => p.fullName.includes(w) || p.city.includes(w))).slice(0, max);
}

// ---------- the booth: leads and notes, phone first

function taskRow(exhibitorId: string, leadId: string, setup: Setup, lead: Lead, onDay: string) {
  const n = nextTask(setup, lead, onDay);
  const task: Omit<TaskRow, 'lead_id'> = n.kind === 'task'
    ? { kind: 'task', step_id: n.stepId, action: n.action, who: n.who, message: n.message ?? null, due_on: n.dueOn, late: n.late, end_reason: null }
    : n.kind === 'askDate'
      ? { kind: 'askDate', step_id: n.stepId, action: null, who: null, message: null, due_on: n.dueOn, late: false, end_reason: null }
      : { kind: 'end', step_id: null, action: null, who: null, message: null, due_on: null, late: false, end_reason: n.reason };
  return { lead_id: leadId, exhibitor_id: exhibitorId, ...task, computed_at: new Date().toISOString() };
}

async function uploadLead(l: LocalLead, exhibitorId: string, setup: Setup): Promise<void> {
  const { error } = await supabase.from('leads').upsert({
    id: l.id, exhibitor_id: exhibitorId, person_id: l.personId ?? null,
    typed_name: l.personId ? null : l.name, typed_phone: l.typedPhone ?? null,
    taps: l.taps, customer_date: l.customerDate ?? null, note: l.note || null,
    captured_at: l.capturedAt, captured_on: l.capturedOn,
  });
  if (error) throw error;
  const t = await supabase.from('tasks').upsert(taskRow(exhibitorId, l.id, setup, l, l.capturedOn));
  if (t.error) throw t.error;
}

/** Save a lead: on the phone first (never lost), then up to the server. A failure leaves it waiting. */
export async function saveLead(l: LocalLead, exhibitorId: string, setup: Setup): Promise<'saved' | 'waiting'> {
  await putLead({ ...l, synced: false });
  try { await uploadLead(l, exhibitorId, setup); await putLead({ ...l, synced: true }); return 'saved'; } catch { return 'waiting'; }
}

/** "ביטול הרישום": the lead goes with its notes and recordings, on the phone and on the server. */
export async function removeLead(id: string, exhibitorId: string): Promise<void> {
  await dropLead(id);
  for (const n of (await allNotes()).filter((x) => x.leadId === id)) await dropNote(n.id);
  const folder = `${exhibitorId}/${id}`;
  const { data: files } = await supabase.storage.from('voice').list(folder);
  if (files?.length) await supabase.storage.from('voice').remove(files.map((f) => `${folder}/${f.name}`));
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

async function uploadNote(n: LocalNote, exhibitorId: string): Promise<void> {
  let audioPath: string | null = null;
  if (n.audio) {
    audioPath = `${exhibitorId}/${n.leadId}/${n.id}.${n.audio.type.includes('mp4') ? 'm4a' : 'webm'}`;
    const up = await supabase.storage.from('voice').upload(audioPath, n.audio, { upsert: true, contentType: n.audio.type || 'audio/webm' });
    if (up.error) throw up.error;
  }
  const { error } = await supabase.from('lead_notes').upsert({ id: n.id, lead_id: n.leadId, exhibitor_id: exhibitorId, body: n.body || null, audio_path: audioPath, transcript: n.transcript || null, created_at: n.createdAt });
  if (error) throw error;
}

export async function saveNote(n: LocalNote, exhibitorId: string): Promise<'saved' | 'waiting'> {
  await putNote({ ...n, synced: false });
  try { await uploadNote(n, exhibitorId); await putNote({ ...n, synced: true, audio: undefined }); return 'saved'; } catch { return 'waiting'; }
}

/** Send up whatever still waits on the phone: leads first (a note needs its lead). Returns how many still wait. */
export async function flush(exhibitorId: string, setup: Setup): Promise<number> {
  let left = 0;
  for (const l of (await allLeads()).filter((x) => !x.synced)) {
    try { await uploadLead(l, exhibitorId, setup); await putLead({ ...l, synced: true }); } catch { left++; }
  }
  for (const n of (await allNotes()).filter((x) => !x.synced)) {
    try { await uploadNote(n, exhibitorId); await putNote({ ...n, synced: true, audio: undefined }); } catch { left++; }
  }
  return left;
}

// ---------- after the fair: the leads with everything the engine needs

export interface LeadRow {
  id: string; person_id: string | null; typed_name: string | null; typed_phone: string | null; taps: string[];
  customer_date: string | null; note: string | null; captured_on: string; captured_at: string;
}
export interface TaskRow {
  lead_id: string; kind: 'task' | 'askDate' | 'end'; step_id: string | null; action: Action | null; who: Who | null;
  message: string | null; due_on: string | null; late: boolean; end_reason: string | null;
}
export interface StepRow { lead_id: string; step_id: string; done_on: string; outcome: StepRecord['outcome']; created_at: string }
export interface ManualRow { id: string; lead_id: string; action: Action; who: Who; due_on: string; message: string | null }
export interface NoteRow { id: string; lead_id: string; body: string | null; audio_path: string | null; transcript: string | null; created_at: string }

export interface Book { leads: LeadRow[]; tasks: TaskRow[]; steps: StepRow[]; manual: ManualRow[]; notes: NoteRow[] }

export async function loadBook(): Promise<Book> {
  const [leads, tasks, steps, manual, notes] = await Promise.all([
    supabase.from('leads').select('*').order('captured_at', { ascending: false }),
    supabase.from('tasks').select('*'),
    supabase.from('lead_steps').select('lead_id, step_id, done_on, outcome, created_at').order('created_at'),
    supabase.from('manual_steps').select('id, lead_id, action, who, due_on, message'),
    supabase.from('lead_notes').select('id, lead_id, body, audio_path, transcript, created_at').order('created_at'),
  ]);
  for (const r of [leads, tasks, steps, manual, notes]) if (r.error) throw r.error;
  return { leads: leads.data ?? [], tasks: tasks.data ?? [], steps: steps.data ?? [], manual: manual.data ?? [], notes: notes.data ?? [] };
}

export function engineLead(row: LeadRow, book: Pick<Book, 'steps' | 'manual'>, businessOwner: boolean): Lead {
  return {
    id: row.id, capturedOn: row.captured_on, taps: row.taps, customerDate: row.customer_date ?? undefined, businessOwner,
    history: book.steps.filter((s) => s.lead_id === row.id).map((s) => ({ stepId: s.step_id, doneOn: s.done_on, outcome: s.outcome })),
    manual: book.manual.filter((m) => m.lead_id === row.id).map((m): ManualStep => ({ id: m.id, action: m.action, who: m.who, dueOn: m.due_on, message: m.message ?? undefined })),
  };
}

/** Recompute one lead's task from what the server holds now. */
async function recompute(row: LeadRow, exhibitorId: string, setup: Setup, businessOwner: boolean, onDay: string) {
  const [steps, manual] = await Promise.all([
    supabase.from('lead_steps').select('lead_id, step_id, done_on, outcome, created_at').eq('lead_id', row.id).order('created_at'),
    supabase.from('manual_steps').select('id, lead_id, action, who, due_on, message').eq('lead_id', row.id),
  ]);
  if (steps.error) throw steps.error;
  if (manual.error) throw manual.error;
  const lead = engineLead(row, { steps: steps.data ?? [], manual: manual.data ?? [] }, businessOwner);
  const { error } = await supabase.from('tasks').upsert(taskRow(exhibitorId, row.id, setup, lead, onDay));
  if (error) throw error;
}

/** He did the step: how it ended. The engine sets the next one at once. */
export async function markStep(row: LeadRow, stepId: string, outcome: StepRecord['outcome'], exhibitorId: string, setup: Setup, businessOwner: boolean, onDay: string) {
  const { error } = await supabase.from('lead_steps').upsert({ lead_id: row.id, step_id: stepId, done_on: onDay, outcome }, { onConflict: 'lead_id,step_id' });
  if (error) throw error;
  await recompute(row, exhibitorId, setup, businessOwner, onDay);
}

/** "ביטול": the mark goes, and the task returns to what it was. */
export async function unmarkStep(row: LeadRow, stepId: string, exhibitorId: string, setup: Setup, businessOwner: boolean, onDay: string) {
  const { error } = await supabase.from('lead_steps').delete().eq('lead_id', row.id).eq('step_id', stepId);
  if (error) throw error;
  await recompute(row, exhibitorId, setup, businessOwner, onDay);
}

/** After a talk: what was agreed, as a step of its own. Returns the step's id (for undo). */
export async function addManual(row: LeadRow, step: { action: Action; dueOn: string; message?: string }, exhibitorId: string, setup: Setup, businessOwner: boolean, onDay: string): Promise<string> {
  const { data, error } = await supabase.from('manual_steps').insert({ lead_id: row.id, exhibitor_id: exhibitorId, action: step.action, who: 'me', due_on: step.dueOn, message: step.message ?? null }).select('id').single();
  if (error) throw error;
  await recompute(row, exhibitorId, setup, businessOwner, onDay);
  return data.id;
}
export async function removeManual(row: LeadRow, id: string, exhibitorId: string, setup: Setup, businessOwner: boolean, onDay: string) {
  const { error } = await supabase.from('manual_steps').delete().eq('id', id);
  if (error) throw error;
  await recompute(row, exhibitorId, setup, businessOwner, onDay);
}

/** He found out the visitor's date (the wedding, the event): the path continues from it. */
export async function setCustomerDate(row: LeadRow, date: string, exhibitorId: string, setup: Setup, businessOwner: boolean, onDay: string) {
  const { error } = await supabase.from('leads').update({ customer_date: date }).eq('id', row.id);
  if (error) throw error;
  await recompute({ ...row, customer_date: date }, exhibitorId, setup, businessOwner, onDay);
}

export async function addFollowNote(leadId: string, body: string, exhibitorId: string) {
  const { error } = await supabase.from('lead_notes').insert({ id: crypto.randomUUID(), lead_id: leadId, exhibitor_id: exhibitorId, body });
  if (error) throw error;
}

/** The visitor's phone and mail: only for a lead of his own (the community list stays closed). */
export async function leadContact(leadId: string): Promise<{ phone: string | null; email: string | null; has_whatsapp: boolean | null } | null> {
  const { data } = await supabase.rpc('lead_contact', { lead: leadId });
  return data?.[0] ?? null;
}

export async function voiceUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('voice').createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
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

// ---------- the text of each message: only what the exhibitor changed is stored; the rest is the suggested text

export async function loadTexts(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('message_templates').select('id, body');
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.id as string, r.body as string]));
}
export async function saveText(exhibitorId: string, id: string, body: string): Promise<void> {
  const { error } = await supabase.from('message_templates').upsert({ exhibitor_id: exhibitorId, id, body });
  if (error) throw error;
}
/** Back to the suggested text: his own version is taken out. */
export async function resetText(exhibitorId: string, id: string): Promise<void> {
  const { error } = await supabase.from('message_templates').delete().eq('exhibitor_id', exhibitorId).eq('id', id);
  if (error) throw error;
}

// ---------- what was sent by hand (a tap opened WhatsApp or mail with the text ready): kept in the outbox as sent
export async function recordSent(exhibitorId: string, leadId: string, channel: 'whatsapp' | 'email', templateId: string, body: string): Promise<void> {
  const { error } = await supabase.from('outbox').insert({ exhibitor_id: exhibitorId, lead_id: leadId, channel, template_id: templateId, body, status: 'sent', sent_at: new Date().toISOString() });
  if (error) throw error;
}
/** Each lead, with the messages already sent to it (by template id); one he chose not to send counts as dealt with. */
export async function sentByLead(): Promise<Map<string, Set<string>>> {
  const { data, error } = await supabase.from('outbox').select('lead_id, template_id').in('status', ['sent', 'cancelled']);
  if (error) throw error;
  const out = new Map<string, Set<string>>();
  for (const r of data ?? []) if (r.lead_id && r.template_id) (out.get(r.lead_id) ?? out.set(r.lead_id, new Set()).get(r.lead_id)!).add(r.template_id);
  return out;
}
/** A message he chose not to send to this visitor (the thank-you to someone he will call anyway). */
export async function recordSkip(exhibitorId: string, leadId: string, templateId: string): Promise<void> {
  const { error } = await supabase.from('outbox').insert({ exhibitor_id: exhibitorId, lead_id: leadId, channel: 'whatsapp', template_id: templateId, body: '', status: 'cancelled' });
  if (error) throw error;
}
/** The details his messages are signed with. */
export async function updateMe(exhibitorId: string, me: { name: string; business: string; phone: string | null; email: string | null }): Promise<void> {
  const { error } = await supabase.from('exhibitors').update(me).eq('id', exhibitorId);
  if (error) throw error;
}

/** The phone and mail of all his leads, for the export. */
export async function allContacts(): Promise<Map<string, { phone: string | null; email: string | null }>> {
  const { data, error } = await supabase.rpc('my_lead_contacts');
  if (error) throw error;
  return new Map(((data ?? []) as { lead_id: string; phone: string | null; email: string | null }[]).map((r) => [r.lead_id, { phone: r.phone, email: r.email }]));
}

// ---------- the admin loads the lists (the rows go from the file straight to the server)
export async function adminCounts(): Promise<{ people: number; listed: number } | null> {
  const { data } = await supabase.rpc('admin_counts');
  return data ?? null;
}
export async function adminLoadExhibitors(rows: object[]): Promise<{ rows: number; approved: number }> {
  const { data, error } = await supabase.rpc('admin_load_exhibitor_list', { rows });
  if (error) throw error;
  return data;
}
export async function adminLoadPeople(rows: object[]): Promise<{ added: number; total: number }> {
  const { data, error } = await supabase.rpc('admin_load_people', { rows });
  if (error) throw error;
  return data;
}
export async function adminClearPeople(): Promise<number> {
  const { data, error } = await supabase.rpc('admin_clear_people');
  if (error) throw error;
  return data ?? 0;
}
