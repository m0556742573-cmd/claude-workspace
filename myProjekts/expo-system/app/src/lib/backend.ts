// The app's connection to the database. Every lead and note is written to the phone first and to Supabase at once;
// without a network it waits on the phone and goes up as soon as the network is back — the booth never waits.
import { createClient, type Session } from '@supabase/supabase-js';
import { nextTask, type Action, type Lead, type ManualStep, type Setup, type StepRecord, type Who } from '@expo/engine';
import { allLeads, allNotes, dropLead, dropNote, putLead, putNote, type LocalLead, type LocalNote } from '../store/local.ts';
import { destinationOf, type Typed } from './destination.ts';
import type { Person } from '../demo/people.ts';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY);
export type { Session };

export interface Exhibitor {
  id: string; name: string; business: string; approved: boolean; phone: string | null; email: string | null; sensitive: boolean;
  /** The number his WhatsApp runs on; null = no WhatsApp (when onboarded) or not asked yet. */
  whatsapp: string | null; whatsapp_kind: 'personal' | 'business' | null; onboarded: boolean;
  /** The code in his self-registration link: expo-booth.pages.dev/#join/<code>. */
  join_code: string;
  /** WhatsApp through the server (step 2a): replies read only if he switched it on; visitors saved as contacts if he chose. */
  wa_read_replies: boolean; wa_save_contacts: boolean;
  /** The server saw signs of a block: nothing goes out until he links again. */
  wa_blocked_at: string | null; wa_blocked_reason: string | null;
  /** The booth's default message (17/10): one tap on the card when the path sends nothing at once. */
  booth_default: string | null;
  /** The visitor's own mail gets messages always, or only when his phone gets no WhatsApp (his choice, 29/10). */
  mail_always: boolean;
}

export async function signInWithGoogle(): Promise<void> {
  await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } });
}
export const signOut = () => supabase.auth.signOut();

export async function myExhibitor(): Promise<Exhibitor | null> {
  const { data, error } = await supabase.from('exhibitors').select('id, name, business, approved, phone, email, sensitive, whatsapp, whatsapp_kind, onboarded, join_code, wa_read_replies, wa_save_contacts, wa_blocked_at, wa_blocked_reason, booth_default, mail_always').maybeSingle();
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

/** The whole community list, in pages: the server gives at most 1000 rows to one request. */
export async function loadDirectory(): Promise<Person[]> {
  const out: Person[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.rpc('people_directory').order('id').range(from, from + 999);
    if (error) throw error;
    for (const p of (data ?? []) as { id: string; full_name: string; city: string | null; business_owner: boolean }[]) {
      out.push({ id: p.id, fullName: p.full_name, city: p.city ?? '', businessOwner: p.business_owner });
    }
    if (!data || data.length < 1000) return out;
  }
}

/**
 * The session kept on this device, when the server cannot be asked: an expired sign-in is renewed only over the
 * network, and without one the booth must still open. It is used only to know whose copy to open.
 */
export function keptSession(): Session | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const s = JSON.parse(localStorage.getItem(k)!);
        if (s?.user?.id) return s as Session;
      }
    }
  } catch { /* nothing kept */ }
  return null;
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
    booth_message: l.booth?.message ?? null, booth_none: !!l.booth && !l.booth.message,
  });
  if (error) throw error;
  // What was added on the card ("לשנות" › another number or mail): the card keeps its own list; what the CRM added stays.
  if (l.extra) {
    const keep = l.extra.map(destinationOf).filter((d): d is Typed => !!d);
    let drop = supabase.from('lead_contacts').delete().eq('lead_id', l.id).eq('from_booth', true);
    if (keep.length) drop = drop.not('value', 'in', `(${keep.map((d) => `"${d.value}"`).join(',')})`);
    const gone = await drop;
    if (gone.error) throw gone.error;
    if (keep.length) {
      const up = await supabase.from('lead_contacts').upsert(keep.map((d) => ({ lead_id: l.id, exhibitor_id: exhibitorId, kind: d.kind, value: d.value, from_booth: true })),
        { onConflict: 'lead_id,kind,value', ignoreDuplicates: true });
      if (up.error) throw up.error;
    }
  }
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
  /** null = the active setup; a number = the version he stays on (a change mid-fair applied to new visitors only). */
  setup_version: number | null;
  /** What he chose at the booth: a message, or none now. */
  booth_message: string | null; booth_none: boolean;
}
export interface TaskRow {
  lead_id: string; kind: 'task' | 'askDate' | 'end'; step_id: string | null; action: Action | null; who: Who | null;
  message: string | null; due_on: string | null; late: boolean; end_reason: string | null;
}
export interface StepRow { lead_id: string; step_id: string; done_on: string; outcome: StepRecord['outcome']; created_at: string }
export interface ManualRow { id: string; lead_id: string; action: Action; who: Who; due_on: string; message: string | null }
export interface NoteRow { id: string; lead_id: string; body: string | null; audio_path: string | null; transcript: string | null; created_at: string }

export interface ReplyRow { lead_id: string; body: string; at: string; optout: boolean }
export interface Book { leads: LeadRow[]; tasks: TaskRow[]; steps: StepRow[]; manual: ManualRow[]; notes: NoteRow[]; versions: Record<number, Setup>; replies: ReplyRow[] }

export async function loadBook(): Promise<Book> {
  const [leads, tasks, steps, manual, notes, versions, replies] = await Promise.all([
    supabase.from('leads').select('*').order('captured_at', { ascending: false }),
    supabase.from('tasks').select('*'),
    supabase.from('lead_steps').select('lead_id, step_id, done_on, outcome, created_at').order('created_at'),
    supabase.from('manual_steps').select('id, lead_id, action, who, due_on, message'),
    supabase.from('lead_notes').select('id, lead_id, body, audio_path, transcript, created_at').order('created_at'),
    supabase.from('setups').select('version, data'),
    supabase.from('lead_replies').select('lead_id, body, at, optout').order('at'),
  ]);
  for (const r of [leads, tasks, steps, manual, notes, versions, replies]) if (r.error) throw r.error;
  return {
    leads: leads.data ?? [], tasks: tasks.data ?? [], steps: steps.data ?? [], manual: manual.data ?? [], notes: notes.data ?? [],
    versions: Object.fromEntries((versions.data ?? []).map((v) => [v.version, v.data as Setup])),
    replies: replies.data ?? [],
  };
}

/** The setup a lead follows: the active one, or the version he was left on when a change was applied to new visitors only. */
export function setupOf(row: Pick<LeadRow, 'setup_version'>, book: Pick<Book, 'versions'>, active: Setup): Setup {
  return row.setup_version != null ? book.versions[row.setup_version] ?? active : active;
}

/** How many leads he has: a change to the setup asks about them only when there are any. */
export async function leadCount(): Promise<number> {
  const { count, error } = await supabase.from('leads').select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

/** "רק על החדשים": every lead that follows the active setup stays on the version active now. Call before the change. */
export async function pinLeads(exhibitorId: string): Promise<void> {
  const { data, error } = await supabase.from('setups').select('version').eq('exhibitor_id', exhibitorId).eq('active', true).maybeSingle();
  if (error) throw error;
  if (!data) return;
  const up = await supabase.from('leads').update({ setup_version: data.version }).is('setup_version', null);
  if (up.error) throw up.error;
}

/** The day in Israel of a moment the server recorded. */
const israelDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(iso));

export function engineLead(row: LeadRow, book: Pick<Book, 'steps' | 'manual'> & { replies?: ReplyRow[] }, businessOwner: boolean): Lead {
  const replies = (book.replies ?? []).filter((r) => r.lead_id === row.id && !r.optout);
  const history = book.steps.filter((s) => s.lead_id === row.id).map((s) => ({ stepId: s.step_id, doneOn: s.done_on, outcome: s.outcome }));
  // "הסר" in his reply ends everything, as "ביקש להסיר" does (model §9).
  const out = (book.replies ?? []).find((r) => r.lead_id === row.id && r.optout);
  if (out) history.push({ stepId: 'reply-optout', doneOn: israelDay(out.at), outcome: 'optOut' });
  return {
    id: row.id, capturedOn: row.captured_on, taps: row.taps, customerDate: row.customer_date ?? undefined, businessOwner,
    repliedOn: replies.length ? israelDay(replies[replies.length - 1]!.at) : undefined,
    booth: row.booth_message ? { message: row.booth_message } : row.booth_none ? {} : undefined,
    history,
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

// ---------- self-registration: the visitor registers himself from the code on the booth's sign

export interface JoinInfo { name: string; business: string; sensitive: boolean; needs: string[]; when: string[]; who: string[] }

export async function joinInfo(code: string): Promise<JoinInfo | null> {
  const { data, error } = await supabase.rpc('join_info', { code });
  if (error) throw error;
  return (data as JoinInfo) ?? null;
}

export async function joinBooth(code: string, v: { name: string; phone: string; email: string; taps: string[]; consent: boolean; date: string | null }): Promise<{ again: boolean }> {
  const { data, error } = await supabase.rpc('join_booth', {
    code, name: v.name.trim(), phone: v.phone, email: v.email.trim() || null, taps: v.taps, consent: v.consent, on_date: v.date,
  });
  if (error) throw error;
  return { again: !!(data as { again?: boolean })?.again };
}

/**
 * Brings in what visitors registered themselves: today's go into the booth's list on this tablet (and what one tapped
 * on his own phone is added to a card already open here), and every lead the server holds without a task gets its
 * task from the engine. Returns whether anything changed here.
 */
export async function pullSelf(exhibitorId: string, setup: Setup, directory: Person[], onDay: string): Promise<boolean> {
  const [mine, tasks] = await Promise.all([
    supabase.from('leads').select('id, person_id, typed_name, typed_phone, taps, customer_date, note, captured_on, captured_at, source').eq('captured_on', onDay),
    supabase.from('tasks').select('lead_id'),
  ]);
  if (mine.error) throw mine.error;
  if (tasks.error) throw tasks.error;
  let changed = false;
  const local = new Map((await allLeads()).map((l) => [l.id, l]));
  const person = (id: string | null) => (id ? directory.find((p) => p.id === id) : undefined);
  for (const r of mine.data ?? []) {
    const here = local.get(r.id);
    if (!here) {
      if (r.source !== 'self') continue;
      const p = person(r.person_id);
      await putLead({
        id: r.id, capturedOn: r.captured_on, capturedAt: r.captured_at, taps: r.taps, customerDate: r.customer_date ?? undefined,
        businessOwner: p?.businessOwner ?? false, history: [], name: p?.fullName ?? r.typed_name ?? '', city: p?.city,
        personId: r.person_id ?? undefined, typedPhone: r.typed_phone ?? undefined, note: r.note ?? '', synced: true, self: true,
      });
      changed = true;
    } else if (here.synced) {
      const taps = [...new Set([...here.taps, ...r.taps])];
      if (taps.length !== here.taps.length || (!here.customerDate && r.customer_date)) {
        await putLead({ ...here, taps, customerDate: here.customerDate ?? r.customer_date ?? undefined, self: true });
        changed = true;
      }
    }
  }
  const tasked = new Set((tasks.data ?? []).map((t) => t.lead_id));
  const { data: all, error } = await supabase.from('leads').select('id');
  if (error) throw error;
  if ((all ?? []).some((l) => !tasked.has(l.id))) {
    const book = await loadBook();
    for (const row of book.leads.filter((l) => !tasked.has(l.id))) {
      const lead = engineLead(row, book, person(row.person_id)?.businessOwner ?? false);
      const t = await supabase.from('tasks').upsert(taskRow(exhibitorId, row.id, setupOf(row, book, setup), lead, onDay));
      if (t.error) throw t.error;
    }
  }
  return changed;
}

/** He did the step: how it ended. The engine sets the next one at once. */
export async function markStep(row: LeadRow, stepId: string, outcome: StepRecord['outcome'], exhibitorId: string, setup: Setup, businessOwner: boolean, onDay: string) {
  const { error } = await supabase.from('lead_steps').upsert({ lead_id: row.id, step_id: stepId, done_on: onDay, outcome }, { onConflict: 'lead_id,step_id' });
  if (error) throw error;
  // "ביקש להסיר": his phone and mail go on the do-not-send list.
  if (outcome === 'optOut') await supabase.rpc('opt_out_lead', { lead: row.id, asked: true });
  await recompute(row, exhibitorId, setup, businessOwner, onDay);
}

/** "ביטול": the mark goes, and the task returns to what it was; a "remove me" taken back takes him off the list. */
export async function unmarkStep(row: LeadRow, stepId: string, exhibitorId: string, setup: Setup, businessOwner: boolean, onDay: string) {
  const { data: was } = await supabase.from('lead_steps').select('outcome').eq('lead_id', row.id).eq('step_id', stepId).maybeSingle();
  const { error } = await supabase.from('lead_steps').delete().eq('lead_id', row.id).eq('step_id', stepId);
  if (error) throw error;
  if (was?.outcome === 'optOut') await supabase.rpc('opt_out_lead', { lead: row.id, asked: false });
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
export async function leadContact(leadId: string): Promise<{ phone: string | null; email: string | null; has_whatsapp: boolean | null; opted_out: boolean } | null> {
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

/** The system's phase, one for all booths (migration 0019): practice before the fair, live, after the fair. */
export type Phase = 'practice' | 'live' | 'after';
export async function loadPhase(): Promise<Phase> {
  const { data, error } = await supabase.from('system_state').select('phase').maybeSingle();
  if (error) throw error;
  return (data?.phase as Phase) ?? 'practice';
}
export async function adminPhase(): Promise<{ phase: Phase; changed_at: string; changed_by: string | null; practice_leads: number; practice_booths: number }> {
  const { data, error } = await supabase.rpc('admin_phase');
  if (error) throw error;
  return data;
}
export async function adminSetPhase(to: Phase, dropPractice: boolean): Promise<{ phase: Phase; dropped: number }> {
  const { data, error } = await supabase.rpc('admin_set_phase', { to_phase: to, drop_practice: dropPractice });
  if (error) throw error;
  return data;
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
/** A message for the WhatsApp server to send from his own number, at a person's pace and hours (wa-server/limits.ts),
 *  to every destination of the lead that gets WhatsApp. How many it went to. */
export async function queueSend(leadId: string, templateId: string, body: string): Promise<number> {
  const { data, error } = await supabase.rpc('queue_send', { lead: leadId, template: templateId, body });
  if (error) throw error;
  return (data as number) ?? 0;
}

// ---------- where a lead receives (יצחק, 29/10): his own phone and mail, and what was added; each one receives or not,
// and every one that receives gets every message. A reply or "הסר" from any of them counts as his.
export interface Destination { id: string | null; kind: 'phone' | 'email'; value: string; label: string | null; own: boolean; receives: boolean; wa: boolean | null; removed: boolean }
export async function leadDestinations(leadId: string): Promise<Destination[]> {
  const { data, error } = await supabase.rpc('lead_destinations', { lead: leadId });
  if (error) throw error;
  return (data ?? []) as Destination[];
}
export async function addDestination(exhibitorId: string, leadId: string, d: Typed, label: string): Promise<void> {
  const { error } = await supabase.from('lead_contacts').insert({ lead_id: leadId, exhibitor_id: exhibitorId, kind: d.kind, value: d.value, label: label.trim() || null });
  if (error) throw error;
}
export async function setReceives(leadId: string, d: Destination, on: boolean): Promise<void> {
  const { error } = d.id
    ? await supabase.from('lead_contacts').update({ receives: on }).eq('id', d.id)
    : await supabase.from('leads').update(d.kind === 'phone' ? { own_phone_on: on } : { own_email_on: on }).eq('id', leadId);
  if (error) throw error;
}
export async function removeDestination(id: string): Promise<void> {
  const { error } = await supabase.from('lead_contacts').delete().eq('id', id);
  if (error) throw error;
}
/** What waits in the queue for a lead, and what went wrong with it. */
export async function queuedFor(leadId: string): Promise<{ status: string; error: string | null; created_at: string }[]> {
  const { data } = await supabase.from('outbox').select('status, error, created_at').eq('lead_id', leadId).eq('channel', 'whatsapp').in('status', ['queued', 'failed']).order('created_at');
  return data ?? [];
}
export async function setWaOptions(exhibitorId: string, patch: Partial<Pick<Exhibitor, 'wa_read_replies' | 'wa_save_contacts' | 'wa_blocked_at' | 'wa_blocked_reason' | 'booth_default' | 'mail_always'>>): Promise<void> {
  const { error } = await supabase.from('exhibitors').update(patch).eq('id', exhibitorId);
  if (error) throw error;
}

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
export async function updateMe(exhibitorId: string, me: Partial<Omit<Exhibitor, 'id' | 'approved'>>): Promise<void> {
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

/** A button renamed in the setup: the visitors already marked with it are marked with the new name. */
export async function renameTaps(from: string, to: string): Promise<void> {
  const { data, error } = await supabase.from('leads').select('id, taps').contains('taps', [from]);
  if (error) throw error;
  for (const l of data ?? []) {
    const u = await supabase.from('leads').update({ taps: (l.taps as string[]).map((t) => (t === from ? to : t)) }).eq('id', l.id);
    if (u.error) throw u.error;
  }
}

// ---------- the versions of the setup: every save is kept; going back saves an old one again as the newest
export interface SetupVersion { version: number; created_at: string; active: boolean; data: Setup }
export async function setupVersions(exhibitorId: string): Promise<SetupVersion[]> {
  const { data, error } = await supabase.from('setups').select('version, created_at, active, data').eq('exhibitor_id', exhibitorId).order('version', { ascending: false }).limit(8);
  if (error) throw error;
  return (data ?? []) as SetupVersion[];
}
