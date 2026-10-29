// The WhatsApp server: each exhibitor's own WhatsApp, linked as a device (WhatsApp Web, unofficial — יצחק, 22/10),
// kept connected here, sending what he queued and passing on his leads' replies.
//
// Step 1 (28/10): link by QR from the booth's settings, stay connected.
// Step 2a (28/10): send from his number what he queued in the app, through the limits in limits.ts — a person's
// pace and hours, a daily cap on first messages, "typing…" before each, and a full stop on signs of a block.
// Whether a number has WhatsApp is checked once, at the visit (29/10, /wa/check); a number not known by the time a
// message goes is checked right before it. Replies are read only for an exhibitor who switched it on, and only from his
// leads' numbers; every other chat is dropped here and never leaves this server (model §9).
//
// Calls from the app carry the exhibitor's own sign-in, checked with Supabase. The queue is reached with this
// server's own key (WA_KEY), whose hash alone is in the database.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Browsers, DisconnectReason, fetchLatestBaileysVersion, makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import { firstLeft, gapMs, sendingHours, typingMs } from './limits.ts';
import { due, israelDay, type Plan } from './planner.ts';
import type { Approved } from '../engine/src/index.ts';

const PORT = Number(process.env.PORT ?? 8080);
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_KEY ?? ''; // the publishable key: the same one the booth's page carries
const WA_KEY = process.env.WA_KEY ?? '';             // this server's own key for the queue; without it nothing is sent
const DIR = process.env.SESSIONS_DIR ?? '/data/sessions';
const ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'https://expo-booth.pages.dev,https://expo-admin.pages.dev').split(',');
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('SUPABASE_URL and SUPABASE_KEY are required');

const logger = pino({ level: 'warn' });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Status = 'connecting' | 'qr' | 'open' | 'closed';
interface Session {
  status: Status; qr?: string; phone?: string; since: number; retries: number;
  sock?: ReturnType<typeof makeWASocket>;
  /** When this number was first linked: the first week has a lower daily cap. */
  linkedAt?: number;
  /** The earliest moment the next message may go out, and a pause after a rate warning. */
  nextAt: number; pausedUntil: number; busy: boolean;
}
const sessions = new Map<string, Session>();

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: WA_KEY, ...args }),
  });
  if (!r.ok) throw new Error(`${fn} ${r.status} ${await r.text()}`);
  const t = await r.text();
  return (t ? JSON.parse(t) : null) as T;
}

// ---------- one exhibitor's connection

async function start(exhibitorId: string): Promise<void> {
  const dir = path.join(DIR, exhibitorId);
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  const prev = sessions.get(exhibitorId);
  const linkedAt = Number(await fs.readFile(path.join(dir, 'linked-at'), 'utf8').catch(() => '')) || undefined;
  const s: Session = { status: 'connecting', since: Date.now(), retries: prev?.retries ?? 0, linkedAt, nextAt: prev?.nextAt ?? 0, pausedUntil: prev?.pausedUntil ?? 0, busy: false };
  sessions.set(exhibitorId, s);
  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    // Lean: no history, not shown online. The phone keeps getting its notifications as before.
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
  });
  s.sock = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', ({ messages, type }) => { if (type === 'notify') inbound(exhibitorId, messages).catch((e) => logger.error(e)); });
  sock.ev.on('connection.update', async (u) => {
    if (sessions.get(exhibitorId) !== s) return; // a newer connection took over
    if (u.qr) { s.status = 'qr'; s.qr = u.qr; }
    if (u.connection === 'open') {
      s.status = 'open'; s.qr = undefined; s.retries = 0; s.since = Date.now();
      s.phone = sock.user?.id ? '0' + sock.user.id.split(/[:@]/)[0]!.replace(/^972/, '') : undefined;
      if (!s.linkedAt) { s.linkedAt = Date.now(); await fs.writeFile(path.join(dir, 'linked-at'), String(s.linkedAt)).catch(() => {}); }
    }
    if (u.connection === 'close') {
      const code = (u.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      const linked = !!state.creds.me;
      if (code === DisconnectReason.forbidden) {
        // WhatsApp refused this number: a block. Stop everything and tell him; do not try again.
        s.status = 'closed'; s.sock = undefined;
        await rpc('wa_blocked', { exhibitor: exhibitorId, reason: 'forbidden (403)' }).catch((e) => logger.error(e));
        return;
      }
      if (code === DisconnectReason.loggedOut || !linked) {
        // Logged out from the phone (or by WhatsApp), or the QR was never scanned: forget it; he can link again.
        s.status = 'closed'; s.qr = undefined; s.sock = undefined;
        if (linked) await rpc('wa_blocked', { exhibitor: exhibitorId, reason: 'logged out (401)' }).catch((e) => logger.error(e));
        await fs.rm(dir, { recursive: true, force: true });
        return;
      }
      // Anything else (network, restart required): connect again, slower each time — never a storm of reconnects.
      s.status = 'connecting';
      s.retries += 1;
      setTimeout(() => { if (sessions.get(exhibitorId) === s) start(exhibitorId).catch((e) => logger.error(e)); }, Math.min(300_000, 2000 * 2 ** Math.min(s.retries, 8)));
    }
  });
}

async function stop(exhibitorId: string): Promise<void> {
  const s = sessions.get(exhibitorId);
  sessions.delete(exhibitorId);
  try { await s?.sock?.logout(); } catch { /* already gone */ }
  s?.sock?.end(undefined);
  await fs.rm(path.join(DIR, exhibitorId), { recursive: true, force: true });
}

/** After a restart: every account that was linked connects again, a few seconds apart. */
async function restore(): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  const ids = (await fs.readdir(DIR)).filter((d) => /^[0-9a-f-]{36}$/.test(d));
  for (const id of ids) {
    const creds = await fs.readFile(path.join(DIR, id, 'creds.json'), 'utf8').catch(() => '');
    if (!creds.includes('"me"')) { await fs.rm(path.join(DIR, id), { recursive: true, force: true }); continue; }
    await start(id).catch((e) => logger.error(e));
    await sleep(3000);
  }
}

// ---------- sending: what he queued, one at a time per number, within the limits

interface Queued { id: string; exhibitor_id: string; lead_id: string; body: string; phone: string | null; name: string | null; first_contact: boolean; save_contact: boolean; first_today: number;
  /** Already known to have WhatsApp (checked at the visit): not asked again. */ known: boolean }

async function tick(): Promise<void> {
  if (!WA_KEY || !sendingHours(new Date())) return;
  const rows = await rpc<Queued[]>('wa_queue', { max_rows: 200 });
  const byExhibitor = new Map<string, Queued[]>();
  for (const r of rows ?? []) (byExhibitor.get(r.exhibitor_id) ?? byExhibitor.set(r.exhibitor_id, []).get(r.exhibitor_id)!).push(r);
  for (const [exhibitorId, queue] of byExhibitor) {
    const s = sessions.get(exhibitorId);
    if (!s || s.status !== 'open' || s.busy || Date.now() < s.nextAt || Date.now() < s.pausedUntil) continue;
    // A conversation that already exists goes first; a first message only while today's cap allows.
    const left = firstLeft(queue[0]!.first_today, s.linkedAt);
    const next = queue.find((q) => !q.first_contact) ?? (left > 0 ? queue.find((q) => q.first_contact) : undefined);
    if (!next) continue;
    s.busy = true;
    sendOne(s, next).catch((e) => logger.error(e)).finally(() => { s.busy = false; s.nextAt = Date.now() + gapMs(); });
  }
}

async function sendOne(s: Session, q: Queued): Promise<void> {
  const sock = s.sock!;
  if (!q.phone || !/^0\d{8,9}$/.test(q.phone)) return rpc('wa_result', { item: q.id, ok: false, err: 'no_phone' });
  const jid = `972${q.phone.slice(1)}@s.whatsapp.net`;
  try {
    // A number not checked at the visit: one number, right before sending to it, as a person starting a chat would. Never a list.
    let to = jid;
    if (!q.known) {
      const [hit] = (await sock.onWhatsApp(jid)) ?? [];
      if (!hit?.exists) return rpc('wa_result', { item: q.id, ok: false, err: 'no_whatsapp' });
      to = hit.jid ?? jid;
    }
    if (q.first_contact && q.save_contact && q.name) {
      await sock.addOrEditContact(to, { fullName: `${q.name} · תערוכה`, saveOnPrimaryAddressbook: true }).catch(() => {});
    }
    await sock.sendPresenceUpdate('composing', to).catch(() => {});
    await sleep(typingMs(q.body));
    await sock.sendPresenceUpdate('paused', to).catch(() => {});
    await sock.sendMessage(to, { text: q.body });
    await rpc('wa_result', { item: q.id, ok: true, first: q.first_contact });
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    if (/rate-overlimit|429|too many/i.test(msg)) {
      // WhatsApp asked to slow down: this number rests a day; the message stays in the queue.
      s.pausedUntil = Date.now() + 24 * 3600_000;
      logger.warn({ msg }, 'rate warning, pausing a day');
      return;
    }
    await rpc('wa_result', { item: q.id, ok: false, err: msg.slice(0, 200) });
  }
}

// ---------- planning (step 2b): the path's own messages, due today, for every linked number; they join the same queue

const approved: Approved[] = JSON.parse(await fs.readFile(new URL('../consultant-rounds/messages-approved.json', import.meta.url), 'utf8'));
async function plan(): Promise<void> {
  if (!WA_KEY || !sendingHours(new Date())) return;
  const today = israelDay(new Date());
  for (const [exhibitorId, s] of sessions) {
    if (s.status !== 'open') continue;
    const p = await rpc<Plan>('wa_plan', { exhibitor: exhibitorId });
    for (const d of due(p, today, approved)) {
      await rpc('wa_plan_queue', { lead: d.lead, step: d.step, template: d.template, body: d.body });
    }
  }
}

// ---------- the check at the visit (model §10): do this visitor's numbers have WhatsApp? Each number once — a name on
// the list is checked once for every exhibitor — never in practice, and one number at a time on each account.

interface Checked { num: string; own: boolean; wa: boolean | null }
const checking = new Map<string, Promise<unknown>>();
async function check(exhibitorId: string, lead: string): Promise<Checked[] | null> {
  const s = sessions.get(exhibitorId);
  if (!s || s.status !== 'open' || !s.sock || !WA_KEY) return null;
  const run = (checking.get(exhibitorId) ?? Promise.resolve()).then(async () => {
    const rows = (await rpc<Checked[]>('wa_to_check', { exhibitor: exhibitorId, lead })) ?? [];
    for (const r of rows) {
      if (r.wa !== null || !/^0\d{8,9}$/.test(r.num)) continue;
      const [hit] = (await s.sock!.onWhatsApp(`972${r.num.slice(1)}@s.whatsapp.net`)) ?? [];
      r.wa = !!hit?.exists;
      await rpc('wa_checked', { exhibitor: exhibitorId, lead, num: r.num, ok: r.wa });
    }
    return rows;
  });
  checking.set(exhibitorId, run.catch(() => {}));
  return run;
}

// ---------- replies: only from his leads' numbers, only if he switched it on

let leadPhones = new Map<string, Set<string>>();
async function refreshPhones(): Promise<void> {
  if (!WA_KEY) return;
  const rows = await rpc<{ exhibitor_id: string; phones: string[] }[]>('wa_lead_phones', {});
  leadPhones = new Map((rows ?? []).map((r) => [r.exhibitor_id, new Set(r.phones ?? [])]));
}

type Incoming = { key: { remoteJid?: string | null; fromMe?: boolean | null; remoteJidAlt?: string | null }; message?: { conversation?: string | null; extendedTextMessage?: { text?: string | null } | null } | null };
async function inbound(exhibitorId: string, messages: Incoming[]): Promise<void> {
  const phones = leadPhones.get(exhibitorId);
  if (!phones || !WA_KEY) return; // replies are not read for him: nothing is looked at
  for (const m of messages) {
    if (m.key.fromMe) continue;
    const jid = m.key.remoteJid ?? '';
    // A chat with a person only; the phone number may come as the "alt" id when WhatsApp uses its newer ids (LID).
    const pn = jid.endsWith('@s.whatsapp.net') ? jid : m.key.remoteJidAlt?.endsWith('@s.whatsapp.net') ? m.key.remoteJidAlt : '';
    if (!pn) continue;
    const phone = '0' + pn.split('@')[0]!.replace(/^972/, '');
    if (!phones.has(phone)) continue; // not one of his leads: dropped here, never stored or sent on
    const text = m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? '[הודעה שאינה טקסט: תמונה, קול או קובץ]';
    await rpc('wa_inbound', { exhibitor: exhibitorId, phone, body: text });
  }
}

// ---------- who is calling: his own sign-in, checked with Supabase

const seen = new Map<string, { exhibitorId: string; until: number }>();
async function exhibitorOf(token: string): Promise<string | null> {
  const hit = seen.get(token);
  if (hit && hit.until > Date.now()) return hit.exhibitorId;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/exhibitors?select=id,approved&limit=1`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const row = ((await r.json()) as { id: string; approved: boolean }[])[0];
  if (!row?.approved) return null;
  seen.set(token, { exhibitorId: row.id, until: Date.now() + 5 * 60_000 });
  return row.id;
}
async function isAdmin(token: string): Promise<boolean> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
  return r.ok && (await r.json()) === true;
}

// ---------- HTTP

function view(s: Session | undefined) {
  if (!s) return { status: 'none' as const };
  return { status: s.status, qr: s.status === 'qr' ? s.qr : undefined, phone: s.status === 'open' ? s.phone : undefined, paused: s.pausedUntil > Date.now() };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin ?? '';
  if (ORIGINS.includes(origin) || /^http:\/\/localhost:517\d$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  const send = (code: number, body: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/health') return send(200, { ok: true });

  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return send(401, { error: 'sign in' });
  try {
    if (url.pathname === '/wa/stats' && req.method === 'GET') {
      if (!(await isAdmin(token))) return send(403, { error: 'admin only' });
      const m = process.memoryUsage();
      const all = [...sessions.values()];
      return send(200, {
        sessions: all.length, open: all.filter((s) => s.status === 'open').length,
        rssMb: Math.round(m.rss / 1048576), heapMb: Math.round(m.heapUsed / 1048576),
        uptimeMin: Math.round(process.uptime() / 60), sending: !!WA_KEY,
      });
    }
    const id = await exhibitorOf(token);
    if (!id) return send(403, { error: 'not an approved exhibitor' });
    if (url.pathname === '/wa/status' && req.method === 'GET') return send(200, view(sessions.get(id)));
    if (url.pathname === '/wa/link' && req.method === 'POST') {
      const s = sessions.get(id);
      if (!s || s.status === 'closed') await start(id);
      return send(200, view(sessions.get(id)));
    }
    if (url.pathname === '/wa/unlink' && req.method === 'POST') { await stop(id); return send(200, view(undefined)); }
    if (url.pathname === '/wa/check' && req.method === 'POST') {
      const lead = url.searchParams.get('lead') ?? '';
      if (!/^[0-9a-f-]{36}$/i.test(lead)) return send(400, { error: 'lead' });
      const numbers = await check(id, lead);
      return send(200, { linked: numbers !== null, numbers: numbers ?? [] });
    }
    return send(404, { error: 'not found' });
  } catch (e) {
    logger.error(e);
    return send(500, { error: 'server error' });
  }
});

await restore();
await refreshPhones().catch((e) => logger.error(e));
setInterval(() => { tick().catch((e) => logger.error(e)); }, 20_000);
setInterval(() => { refreshPhones().catch((e) => logger.error(e)); }, 5 * 60_000);
setInterval(() => { plan().catch((e) => logger.error(e)); }, 2 * 60_000);
server.listen(PORT, () => logger.warn(`wa-server on ${PORT}, ${sessions.size} accounts restored, sending ${WA_KEY ? 'on' : 'off (no WA_KEY)'}`));
