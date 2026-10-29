// Mail (29/10): one message as the visitor gets it, and the provider that carries it. The provider is set on this server
// (the admin platform's keys page): Amazon SES, or Cloudflare once he chooses it (26/10 compared both; not decided).
// Each mail goes in the exhibitor's name from expo.y-h-m.com, replies go to his own mail, and every mail carries a
// removal link, also as the one-click header mail services look for.
import crypto from 'node:crypto';

export interface MailRow { id: string; to_email: string; body: string; from_name: string; reply_to: string | null; subject: string }
export interface Mail { from: string; fromName: string; to: string; replyTo?: string; subject: string; text: string; html: string; unsubscribe: string }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const linked = (s: string) => esc(s).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}">${u}</a>`).replace(/\n/g, '<br>');

/** The mail as the visitor gets it: his message, and beneath it why he got it and how to stop. */
export function buildMail(r: MailRow, publicUrl: string, fromAddress: string): Mail {
  const unsubscribe = `${publicUrl}/u/${r.id}`;
  const why = `קיבלת את ההודעה כי ביקרת בדוכן של ${r.subject} בתערוכה.`;
  const text = `${r.body}\n\n—\n${why}\nלהסרה מההודעות: ${unsubscribe}`;
  const html = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"></head>'
    + '<body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;direction:rtl;text-align:right">'
    + `<div>${linked(r.body)}</div>`
    + '<hr style="border:0;border-top:1px solid #ddd;margin:24px 0 12px">'
    + `<p style="font-size:13px;color:#666;margin:0">${esc(why)} <a href="${unsubscribe}" style="color:#666">להסרה מההודעות</a></p>`
    + '</body></html>';
  return { from: fromAddress, fromName: r.from_name, to: r.to_email, replyTo: r.reply_to ?? undefined, subject: r.subject, text, html, unsubscribe };
}

/** Hebrew in a header: RFC 2047, base64, in pieces short enough for a header line. */
function word(s: string): string {
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const out: string[] = [];
  let part = '';
  for (const ch of s) {
    if (Buffer.byteLength(part + ch) > 45) { out.push(part); part = ''; }
    part += ch;
  }
  if (part) out.push(part);
  return out.map((p) => `=?UTF-8?B?${Buffer.from(p).toString('base64')}?=`).join('\r\n ');
}
const b64 = (s: string) => Buffer.from(s).toString('base64').replace(/.{76}/g, '$&\r\n');

/** The whole mail as MIME: plain text and HTML, with the removal headers. */
export function mime(m: Mail, now = new Date(), id: string = crypto.randomUUID()): string {
  const boundary = `b-${id}`;
  const domain = m.from.split('@')[1] ?? 'localhost';
  return [
    `From: ${word(m.fromName)} <${m.from}>`,
    `To: <${m.to}>`,
    ...(m.replyTo ? [`Reply-To: <${m.replyTo}>`] : []),
    `Subject: ${word(m.subject)}`,
    `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@${domain}>`,
    'MIME-Version: 1.0',
    `List-Unsubscribe: <${m.unsubscribe}>`,
    'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(m.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(m.html),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

// ---------- Amazon SES (API v2), signed with AWS Signature Version 4; no SDK, nothing to install.

const hmac = (key: crypto.BinaryLike, s: string) => crypto.createHmac('sha256', key).update(s).digest();
const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export interface Signable { method: string; host: string; path: string; query?: string; headers: Record<string, string>; body: string; region: string; service: string; keyId: string; secret: string; amzDate: string }
/** The Authorization header for one request (AWS Signature Version 4). */
export function sigv4(r: Signable): string {
  const heads = { ...Object.fromEntries(Object.entries(r.headers).map(([k, v]) => [k.toLowerCase(), v.trim()])), host: r.host, 'x-amz-date': r.amzDate };
  const names = Object.keys(heads).sort();
  const canonical = [r.method, r.path, r.query ?? '', ...names.map((n) => `${n}:${heads[n as keyof typeof heads]}`), '', names.join(';'), sha(r.body)].join('\n');
  const day = r.amzDate.slice(0, 8);
  const scope = `${day}/${r.region}/${r.service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', r.amzDate, scope, sha(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${r.secret}`, day), r.region), r.service), 'aws4_request');
  return `AWS4-HMAC-SHA256 Credential=${r.keyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${crypto.createHmac('sha256', key).update(toSign).digest('hex')}`;
}

export interface Provider { name: string; send(m: Mail): Promise<void> }

function ses(region: string, keyId: string, secret: string): Provider {
  const host = `email.${region}.amazonaws.com`;
  const path = '/v2/email/outbound-emails';
  return {
    name: 'ses',
    async send(m) {
      const body = JSON.stringify({
        FromEmailAddress: m.from,
        Destination: { ToAddresses: [m.to] },
        ...(m.replyTo ? { ReplyToAddresses: [m.replyTo] } : {}),
        Content: { Raw: { Data: Buffer.from(mime(m)).toString('base64') } },
      });
      const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const headers = { 'content-type': 'application/json' };
      const auth = sigv4({ method: 'POST', host, path, headers, body, region, service: 'ses', keyId, secret, amzDate });
      const r = await fetch(`https://${host}${path}`, { method: 'POST', headers: { ...headers, 'x-amz-date': amzDate, Authorization: auth }, body });
      if (!r.ok) throw new Error(`ses ${r.status} ${(await r.text()).slice(0, 300)}`);
    },
  };
}

/** The provider set on this server, or none (then mail waits in the queue). */
export function providerFrom(keys: Record<string, string>): Provider | null {
  if (keys.mail_provider === 'ses' && keys.ses_region && keys.ses_key_id && keys.ses_secret) return ses(keys.ses_region, keys.ses_key_id, keys.ses_secret);
  // Cloudflare Email Service: wired once he chooses it, against its documentation of that day.
  return null;
}
