// The watcher (יצחק, 3/11: "סטטוס מצב בניהול האקספו כל הזמן", and mail when something falls). A Cloudflare Worker, so it
// keeps watching when the VPS itself is down. Every 5 minutes it checks what the booth and the messages depend on,
// writes the result to the admin's status page (ops_report, migration 0046), and sends mail only when a check changes:
// "fell" and "came back", never the same news every 5 minutes. When Supabase itself does not answer, it mails directly,
// at most once an hour.
import { EmailMessage } from 'cloudflare:email';

const CHECKS = [
  { key: 'app.booth', platform: 'app', label: 'הדוכן (expomax.y-h-m.com)', url: 'https://expomax.y-h-m.com/', expect: /assets\/index-[\w-]+\.js/ },
  { key: 'app.admin', platform: 'app', label: 'הניהול (expo-admin.pages.dev)', url: 'https://expo-admin.pages.dev/', expect: /assets\// },
  { key: 'wa.health', platform: 'wa', label: 'שרת הוואטסאפ', url: 'https://wa.expomax.y-h-m.com/health', expect: /"ok":true/ },
  { key: 'site.yhm', platform: 'site', label: 'האתר y-h-m.com', url: 'https://y-h-m.com/', expect: /<html/i },
];

async function probe(c) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const started = Date.now();
    try {
      const r = await fetch(c.url, { signal: AbortSignal.timeout(10_000), headers: { 'cache-control': 'no-cache' }, cf: { cacheTtl: 0 } });
      const body = await r.text();
      const ms = Date.now() - started;
      if (r.ok && c.expect.test(body)) {
        return { key: c.key, platform: c.platform, label: c.label, level: ms > 5000 ? 'warn' : 'ok', value: ms > 5000 ? `איטי: ${ms}ms` : 'עונה' };
      }
      if (attempt === 1) return { key: c.key, platform: c.platform, label: c.label, level: 'bad', value: `לא תקין: ${r.status}` };
    } catch (e) {
      if (attempt === 1) return { key: c.key, platform: c.platform, label: c.label, level: 'bad', value: 'לא עונה', detail: String(e).slice(0, 120) };
    }
    await new Promise((res) => setTimeout(res, 3000)); // one more try before calling it down
  }
}

class Refused extends Error {}
async function report(env, checks) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/ops_report`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ p_key: (env.WATCH_KEY ?? '').trim(), p_checks: checks }),
    signal: AbortSignal.timeout(15_000),
  });
  // 4xx: Supabase answered and refused (a wrong key, a changed function): our setup, not an outage.
  if (r.status >= 400 && r.status < 500) throw new Refused(`ops_report ${r.status}: ${(await r.text()).slice(0, 160)}`);
  if (!r.ok) throw new Error(`ops_report ${r.status}`);
  return (await r.json()).changed ?? [];
}

const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
async function mail(env, subject, lines) {
  if (!env.ALERT_TO || !env.ALERT) return;
  const id = `${crypto.randomUUID()}@y-h-m.com`;
  const raw = [
    `From: =?UTF-8?B?${b64('אקספומקס · מעקב')}?= <${env.ALERT_FROM}>`,
    `To: <${env.ALERT_TO}>`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Message-ID: <${id}>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(lines.join('\n') + '\n\nהמצב המלא: https://expo-admin.pages.dev/#status\nמה עושים: https://expo-admin.pages.dev/#runbook\n').replace(/.{76}/g, '$&\r\n'),
  ].join('\r\n');
  await env.ALERT.send(new EmailMessage(env.ALERT_FROM, env.ALERT_TO, raw));
}

/** Supabase down: one mail an hour at most. The Worker has no storage of its own while the database is down, so the
 *  hour is told by the clock: only the run in the first five minutes of each hour mails. */
const firstRunOfHour = () => new Date().getUTCMinutes() < 5;

const WORD = { ok: 'חזר לעבוד', warn: 'דורש תשומת לב', bad: 'נפל', unknown: 'לא ידוע', new: 'חדש' };

async function run(env) {
  const checks = await Promise.all(CHECKS.map(probe));
  console.log('checks', checks.map((c) => `${c.key}:${c.level}`).join(' '));
  let changed;
  try {
    changed = await report(env, checks);
    console.log('reported, changed:', changed.length);
  } catch (e) {
    console.log('report failed:', String(e).slice(0, 200));
    if (e instanceof Refused) return; // our own setup: seen in the log and on the status page going stale, not mailed as an outage
    if (firstRunOfHour()) {
      await mail(env, 'אקספומקס: Supabase לא עונה', [
        'הבדיקה מבחוץ לא הצליחה לכתוב את המצב למסד הנתונים, כנראה ש-Supabase לא עונה.',
        'הדוכנים ממשיכים לרשום מבקרים בטאבלט, והכל יעלה כשהמסד יחזור.',
        ...checks.map((c) => `• ${c.label}: ${c.value}`),
        `שגיאה: ${String(e).slice(0, 200)}`,
      ]);
    }
    return;
  }
  // A first report ('new' → ok) is not news; a fall, a warning and a return are.
  const news = changed.filter((c) => !(c.from === 'new' && c.to === 'ok'));
  if (news.length) {
    const bad = news.some((c) => c.to === 'bad');
    await mail(env, bad ? `אקספומקס: ${news.filter((c) => c.to === 'bad').map((c) => c.label).join(', ')} נפל` : 'אקספומקס: עדכון מצב',
      news.map((c) => `• ${c.label}: ${WORD[c.to] ?? c.to}${c.value ? ` (${c.value})` : ''}`));
  }
}

export default {
  async scheduled(_event, env, ctx) { ctx.waitUntil(run(env)); },
};
