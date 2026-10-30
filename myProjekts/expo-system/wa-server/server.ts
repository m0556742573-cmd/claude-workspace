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
import { buildMail, providerFrom, type MailRow } from './mail.ts';
import type { Approved } from '../engine/src/index.ts';

const PORT = Number(process.env.PORT ?? 8080);
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_KEY ?? ''; // the publishable key: the same one the booth's page carries
const WA_KEY = process.env.WA_KEY ?? '';             // this server's own key for the queue; without it nothing is sent
const DIR = process.env.SESSIONS_DIR ?? '/data/sessions';
const ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'https://expo.y-h-m.com,https://expo-booth.pages.dev,https://expo-admin.pages.dev').split(',');
/** This server's own address: the removal link in every mail points here. */
// The removal link in mails: on the app's address, which passes it here (app/functions/u). 30/10.
const PUBLIC_URL = process.env.PUBLIC_URL ?? 'https://expo.y-h-m.com';
const MAIL_FROM = process.env.MAIL_FROM ?? 'expo@expo.y-h-m.com';
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
  /** Already known to have WhatsApp (checked at the visit): not asked again. */ known: boolean;
  /** The files that go with it: "path#name" in the public bucket. */ files: string[] | null;
  /** A trial message before the fair: it goes to the exhibitor himself or to a number he added, never to the visitor. */ trial: boolean }

/** The number this WhatsApp is linked to, as 05…: a trial message to it is a note to himself. */
function ownNumber(s: Session): string | null {
  const m = s.sock?.user?.id?.match(/^(\d+)[:@]/);
  return m ? (m[1]!.startsWith('972') ? '0' + m[1]!.slice(3) : m[1]!) : null;
}

/** A file of a message, from storage (the bucket is public by unguessable path). */
async function fileOf(ref: string): Promise<{ data: Buffer; name: string; type: string }> {
  const [p = '', n] = ref.split('#');
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/files/${p.split('/').map(encodeURIComponent).join('/')}`);
  if (!r.ok) throw new Error(`file ${r.status}`);
  return { data: Buffer.from(await r.arrayBuffer()), name: n ? decodeURIComponent(n) : p.split('/').pop() ?? 'file', type: r.headers.get('content-type') ?? 'application/octet-stream' };
}

async function tick(): Promise<void> {
  if (!WA_KEY) return;
  const hours = sendingHours(new Date());
  const rows = await rpc<Queued[]>('wa_queue', { max_rows: 200 });
  const byExhibitor = new Map<string, Queued[]>();
  for (const r of rows ?? []) (byExhibitor.get(r.exhibitor_id) ?? byExhibitor.set(r.exhibitor_id, []).get(r.exhibitor_id)!).push(r);
  for (const [exhibitorId, all] of byExhibitor) {
    const s = sessions.get(exhibitorId);
    if (!s || s.status !== 'open' || s.busy || Date.now() < s.nextAt || Date.now() < s.pausedUntil) continue;
    // A trial message to his own number (29/10) is a note to himself: any hour, outside the daily cap, a short gap.
    // A trial message to a number he added goes to another person, so it keeps every limit.
    const own = ownNumber(s);
    const self = (q: Queued) => q.trial && !!own && q.phone === own;
    const queue = hours ? all : all.filter(self);
    // A conversation that already exists goes first; a first message only while today's cap allows.
    const left = firstLeft(all[0]!.first_today, s.linkedAt);
    const next = queue.find(self) ?? queue.find((q) => !q.first_contact) ?? (left > 0 ? queue.find((q) => q.first_contact) : undefined);
    if (!next) continue;
    const mine = self(next);
    s.busy = true;
    sendOne(s, next, mine).catch((e) => logger.error(e)).finally(() => { s.busy = false; s.nextAt = Date.now() + (mine ? 5000 + Math.random() * 5000 : gapMs()); });
  }
}

async function sendOne(s: Session, q: Queued, self = false): Promise<void> {
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
    // With files: the first carries the text as its caption, as a person sending a price list would.
    const files = await Promise.all((q.files ?? []).map(fileOf));
    if (!files.length) await sock.sendMessage(to, { text: q.body });
    for (const [i, f] of files.entries()) {
      const caption = i === 0 ? q.body : undefined;
      await sock.sendMessage(to, f.type.startsWith('image/') ? { image: f.data, mimetype: f.type, caption } : { document: f.data, mimetype: f.type, fileName: f.name, caption });
    }
    await rpc('wa_result', { item: q.id, ok: true, first: q.first_contact && !self });
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

// ---------- keys (29/10): pasted once in the admin platform, kept only here, on this server's disk, never sent back
// (a secret shows only its last four characters). Which names exist, and whether each is a secret:
const KEY_SLOTS: Record<string, boolean> = {
  mail_provider: false, ses_region: false, ses_key_id: true, ses_secret: true, cf_account: false, cf_token: true,
  meta_phone_id: false, meta_token: true, anthropic_key: true,
};
const KEYS_FILE = path.join(path.dirname(DIR), 'keys.json');
let keys: Record<string, string> = JSON.parse(await fs.readFile(KEYS_FILE, 'utf8').catch(() => '{}'));
async function setKey(name: string, value: string): Promise<void> {
  const next = { ...keys };
  if (value) next[name] = value; else delete next[name];
  const tmp = KEYS_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(next), { mode: 0o600 });
  await fs.rename(tmp, KEYS_FILE);
  keys = next;
}
const keyView = () => Object.fromEntries(Object.keys(KEY_SLOTS).map((n) => [n, keys[n] ? (KEY_SLOTS[n] ? '…' + keys[n]!.slice(-4) : keys[n]) : null]));
const mailProvider = () => providerFrom(keys);

// ---------- planning (step 2b): the path's own messages, due today, for every booth that can send (its WhatsApp
// linked, or mail set on this server); they join the same queues

const approved: Approved[] = JSON.parse(await fs.readFile(new URL('../consultant-rounds/messages-approved.json', import.meta.url), 'utf8'));
// Before the fair (29/10) the database hands over only the booths that try with sending, their trial leads, and whether
// they run the fast clock (a day of the path in a minute); those are planned every half minute, at any hour.
let planning = false;
async function plan(onlyFast = false): Promise<void> {
  if (!WA_KEY || planning) return;
  planning = true;
  try { await planOnce(onlyFast); } finally { planning = false; }
}
async function planOnce(onlyFast: boolean): Promise<void> {
  const now = new Date();
  const hours = sendingHours(now);
  const today = israelDay(now);
  const mail = !!mailProvider();
  const booths = (await rpc<{ id: string; trial: boolean; fast: boolean }[]>('plan_exhibitors', {})) ?? [];
  for (const b of booths) {
    if ((onlyFast && !b.fast) || (!hours && !b.trial)) continue;
    const wa = sessions.get(b.id)?.status === 'open';
    if (!wa && !mail) continue;
    const p = await rpc<Plan>('wa_plan', { exhibitor: b.id });
    const ch = { wa: wa && !p.me.blocked, mail };
    for (const d of due(p, today, approved, ch, b.fast ? { now: now.getTime(), minutesPerDay: 1 } : undefined)) {
      await rpc('wa_plan_queue', { lead: d.lead, step: d.step, template: d.template, body: d.body, wa: ch.wa, mail: ch.mail,
        files: d.files.length ? d.files : null, fast_day: d.virtual ?? null });
    }
  }
}

// ---------- mail (29/10): the queue, through the provider set here, within the same hours as WhatsApp; a short pause
// between mails, and on a "slow down" from the provider the rest waits for the next round.
let mailing = false;
async function mailTick(): Promise<void> {
  const provider = mailProvider();
  if (mailing || !provider || !WA_KEY) return;
  // A trial mail goes to the exhibitor himself (or a mail he added), so it may go at any hour.
  const hours = sendingHours(new Date());
  mailing = true;
  try {
    for (const r of (await rpc<MailRow[]>('mail_queue', { max_rows: 60 })) ?? []) {
      if (!hours && !r.trial) continue;
      try {
        const attachments = await Promise.all((r.files ?? []).map(fileOf));
        await provider.send({ ...buildMail(r, PUBLIC_URL, MAIL_FROM), attachments });
        await rpc('mail_result', { item: r.id, ok: true });
      } catch (e) {
        const msg = String((e as Error).message ?? e);
        if (/throttl|rate|429|too many|maximum sending/i.test(msg)) { logger.warn({ msg }, 'mail: slowed down'); break; }
        await rpc('mail_result', { item: r.id, ok: false, err: msg.slice(0, 200) });
      }
      await sleep(400);
    }
  } finally { mailing = false; }
}

// ---------- the removal link in every mail: a page that asks once; mail services that offer "unsubscribe" post here
// directly (one click, RFC 8058). It removes him from that exhibitor's messages altogether.
const page = (body: string) => `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>הסרה מההודעות</title>
<style>body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#f6f7f9;color:#1a1a1a}main{max-width:420px;margin:12vh auto;padding:24px;background:#fff;border-radius:12px;box-shadow:0 1px 3px #0002;line-height:1.6}button{font:inherit;padding:10px 20px;border-radius:8px;border:0;background:#1a1a1a;color:#fff;cursor:pointer}</style>
</head><body><main>${body}</main></body></html>`;
const escHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
async function unsubscribe(req: http.IncomingMessage, res: http.ServerResponse, item: string): Promise<void> {
  const html = (code: number, body: string) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(page(body)); };
  const [info] = (await rpc<{ email: string; booth: string; removed: boolean }[]>('mail_unsub_info', { item })) ?? [];
  if (!info) return html(404, '<p>הקישור הזה לא מוכר.</p>');
  if (req.method === 'POST') {
    await rpc('mail_unsubscribe', { item });
    return html(200, `<h1>הוסרת</h1><p>לא יגיעו אליך עוד הודעות מהדוכן של ${escHtml(info.booth)}.</p>`);
  }
  if (info.removed) return html(200, `<h1>כבר הוסרת</h1><p>לא יגיעו אליך עוד הודעות מהדוכן של ${escHtml(info.booth)}.</p>`);
  return html(200, `<h1>הסרה מההודעות</h1><p>להפסיק את ההודעות מהדוכן של ${escHtml(info.booth)} אל <span dir="ltr">${escHtml(info.email)}</span>?</p><form method="post"><button type="submit">כן, להסיר</button></form>`);
}

async function readJson(req: http.IncomingMessage, limit = 8192): Promise<Record<string, unknown>> {
  let size = 0;
  const parts: Buffer[] = [];
  for await (const c of req) { size += (c as Buffer).length; if (size > limit) throw new Error('too big'); parts.push(c as Buffer); }
  const t = Buffer.concat(parts).toString('utf8');
  return t ? JSON.parse(t) : {};
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
  const unsub = /^\/u\/([0-9a-f-]{36})$/i.exec(url.pathname);
  if (unsub && (req.method === 'GET' || req.method === 'POST')) {
    try { return await unsubscribe(req, res, unsub[1]!); } catch (e) { logger.error(e); return send(500, { error: 'server error' }); }
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return send(401, { error: 'sign in' });
  try {
    if (url.pathname.startsWith('/admin/')) {
      if (!(await isAdmin(token))) return send(403, { error: 'admin only' });
      if (url.pathname === '/admin/keys' && req.method === 'GET') return send(200, { keys: keyView(), mail: mailProvider()?.name ?? null });
      if (url.pathname === '/admin/keys' && req.method === 'POST') {
        const b = await readJson(req);
        const name = String(b.name ?? ''), value = String(b.value ?? '').trim();
        if (!(name in KEY_SLOTS) || value.length > 4096) return send(400, { error: 'name' });
        await setKey(name, value);
        return send(200, { keys: keyView(), mail: mailProvider()?.name ?? null });
      }
      if (url.pathname === '/admin/mail-test' && req.method === 'POST') {
        const p = mailProvider();
        if (!p) return send(409, { error: 'mail is not set' });
        const to = String((await readJson(req)).to ?? '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return send(400, { error: 'to' });
        try {
          await p.send(buildMail({ id: '00000000-0000-0000-0000-000000000000', to_email: to, from_name: 'מערכת התערוכה', reply_to: null, subject: 'בדיקת מייל',
            body: 'שלום,\nזו בדיקה של שליחת המיילים של מערכת התערוכה. אם הגיע לתיבה ולא לספאם, הכל בסדר.' }, PUBLIC_URL, MAIL_FROM));
          return send(200, { ok: true });
        } catch (e) { return send(502, { error: String((e as Error).message ?? e).slice(0, 300) }); }
      }
      return send(404, { error: 'not found' });
    }
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
setInterval(() => { plan(true).catch((e) => logger.error(e)); }, 30_000);
setInterval(() => { mailTick().catch((e) => logger.error(e)); }, 30_000);
server.listen(PORT, () => logger.warn(`wa-server on ${PORT}, ${sessions.size} accounts restored, sending ${WA_KEY ? 'on' : 'off (no WA_KEY)'}, mail ${mailProvider()?.name ?? 'not set'}`));
