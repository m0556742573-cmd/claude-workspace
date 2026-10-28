// The WhatsApp server: each exhibitor's own WhatsApp, linked as a device (WhatsApp Web, unofficial — יצחק, 22/10),
// kept connected here so the system can later send from his number and see his leads' replies.
// Step 1 (28/10): link by QR from the booth's settings, stay connected, and measure memory per account. Nothing is
// sent and no message is read or kept yet; that comes with the next step, after he sees the plan for its tables.
//
// No secret is needed here: every call carries the exhibitor's own sign-in, which this server checks with Supabase,
// and the database's own rules (RLS) say which exhibitor that is.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Browsers, DisconnectReason, fetchLatestBaileysVersion, makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';

const PORT = Number(process.env.PORT ?? 8080);
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_KEY ?? ''; // the publishable key: the same one the booth's page carries
const DIR = process.env.SESSIONS_DIR ?? '/data/sessions';
const ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'https://expo-booth.pages.dev,https://expo-admin.pages.dev').split(',');
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('SUPABASE_URL and SUPABASE_KEY are required');

const logger = pino({ level: 'warn' });
type Status = 'connecting' | 'qr' | 'open' | 'closed';
interface Session { status: Status; qr?: string; phone?: string; since: number; sock?: ReturnType<typeof makeWASocket>; retries: number }
const sessions = new Map<string, Session>();

// ---------- one exhibitor's connection

async function start(exhibitorId: string): Promise<void> {
  const dir = path.join(DIR, exhibitorId);
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  const prev = sessions.get(exhibitorId);
  const s: Session = { status: 'connecting', since: Date.now(), retries: prev?.retries ?? 0 };
  sessions.set(exhibitorId, s);
  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    // Lean: no history, no presence. The phone keeps getting its notifications as before.
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
  });
  s.sock = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    if (sessions.get(exhibitorId) !== s) return; // a newer connection took over
    if (u.qr) { s.status = 'qr'; s.qr = u.qr; }
    if (u.connection === 'open') {
      s.status = 'open'; s.qr = undefined; s.retries = 0; s.since = Date.now();
      s.phone = sock.user?.id ? '0' + sock.user.id.split(/[:@]/)[0]!.replace(/^972/, '') : undefined;
    }
    if (u.connection === 'close') {
      const code = (u.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      const linked = !!state.creds.me;
      if (code === DisconnectReason.loggedOut || !linked) {
        // Logged out from the phone, or the QR was never scanned: forget it; he can link again from the settings.
        s.status = 'closed'; s.qr = undefined; s.sock = undefined;
        if (code === DisconnectReason.loggedOut || !linked) await fs.rm(dir, { recursive: true, force: true });
        return;
      }
      // Anything else (network, restart required): connect again, slower each time.
      s.status = 'connecting';
      s.retries += 1;
      setTimeout(() => { if (sessions.get(exhibitorId) === s) start(exhibitorId).catch((e) => logger.error(e)); }, Math.min(60_000, 1000 * 2 ** Math.min(s.retries, 6)));
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

/** After a restart: every account that was linked connects again, a couple of seconds apart. */
async function restore(): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  const ids = (await fs.readdir(DIR)).filter((d) => /^[0-9a-f-]{36}$/.test(d));
  for (const id of ids) {
    const creds = await fs.readFile(path.join(DIR, id, 'creds.json'), 'utf8').catch(() => '');
    if (!creds.includes('"me"')) { await fs.rm(path.join(DIR, id), { recursive: true, force: true }); continue; }
    await start(id).catch((e) => logger.error(e));
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// ---------- who is calling: his own sign-in, checked with Supabase

const seen = new Map<string, { exhibitorId: string; until: number }>();
async function exhibitorOf(token: string): Promise<string | null> {
  const hit = seen.get(token);
  if (hit && hit.until > Date.now()) return hit.exhibitorId;
  const h = { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/exhibitors?select=id,approved&limit=1`, { headers: h });
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
  return { status: s.status, qr: s.status === 'qr' ? s.qr : undefined, phone: s.status === 'open' ? s.phone : undefined };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin ?? '';
  const allowed = ORIGINS.includes(origin) || /^http:\/\/localhost:517\d$/.test(origin);
  if (allowed) {
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
        uptimeMin: Math.round(process.uptime() / 60),
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
    return send(404, { error: 'not found' });
  } catch (e) {
    logger.error(e);
    return send(500, { error: 'server error' });
  }
});

await restore();
server.listen(PORT, () => logger.warn(`wa-server on ${PORT}, ${sessions.size} accounts restored`));
