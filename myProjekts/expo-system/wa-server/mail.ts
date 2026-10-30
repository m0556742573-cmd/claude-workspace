// Mail (29/10): one message as the visitor gets it, and the provider that carries it. The provider is set on this server
// (the admin platform's keys page): Amazon SES or Cloudflare Email Service (26/10 compared both; on 29/10 he set up
// expo.y-h-m.com for sending in Cloudflare).
// Each mail goes in the exhibitor's name from expo.y-h-m.com, replies go to his own mail, and every mail carries a
// removal link, also as the one-click header mail services look for.
import crypto from 'node:crypto';

export interface MailRow { id: string; to_email: string; body: string; from_name: string; reply_to: string | null; subject: string; files?: string[] | null;
  /** A trial mail before the fair, to the exhibitor himself or a mail he added. */ trial?: boolean;
  /** His own look (30/10): the logo's path in the files bucket and his colour; none of it in a sensitive business. */
  sensitive?: boolean; logo?: string | null; brand_color?: string | null; phone?: string | null; whatsapp?: string | null;
  /** His own name before the @ (30/10), unique among the exhibitors. */ mail_name?: string | null;
  /** A mailing-list message (before a season or a holiday) is drawn as a newsletter, design ג (30/10). */ style?: 'letter' | 'newsletter' }
export interface Attachment { name: string; type: string; data: Buffer }
export interface Mail { from: string; fromName: string; to: string; replyTo?: string; subject: string; text: string; html: string; unsubscribe: string; attachments?: Attachment[] }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
/** A link at the end of a sentence or in quotes keeps the period or the quote outside it (30/10). */
const linked = (s: string) => esc(s).replace(/https?:\/\/[^\s<]+/g, (u) => {
  const [, link, tail] = /^(.*?)((?:[.,;:!?)\]]|&quot;|&#39;)*)$/.exec(u)!;
  return `<a href="${link}">${link}</a>${tail}`;
}).replace(/\n/g, '<br>');

const YHM = { url: 'https://y-h-m.com', line: 'העסק ממשיך לעבוד, גם כשאתה לא שם', bg: '#0B1A13', ink: '#F2F5EE', lit: '#C9F26B', soft: '#9FB0A6' };
const PLAIN = '#2F3E4E'; // his colour when he chose none
const FONT = 'Arial,Helvetica,sans-serif';

/** Dark text on a light colour, white on a dark one. */
export function inkOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.45 ? '#1A1A1A' : '#FFFFFF';
}
const digits = (s: string) => s.replace(/\D/g, '');
/** wa.me wants the number with the country: 050… becomes 97250…. */
export const waLink = (num: string) => { const d = digits(num); return `https://wa.me/${d.startsWith('0') ? '972' + d.slice(1) : d}`; };

/**
 * The mail as the visitor gets it (30/10: "הכי מעוצב, אבל הכי בטוח"). The design is code, not pictures: his colour,
 * the letters and the buttons are drawn by the mail itself, so they show where pictures are blocked (filtered
 * internet, Outlook) and do not read as an advertisement. The only pictures are two small logos, his and YHM's, each
 * with its name instead when pictures are off. One main button. Beneath: why he got it and how to stop, and YHM's strip.
 */
export function buildMail(r: MailRow, publicUrl: string, fromAddress: string, filesUrl = ''): Mail {
  const unsubscribe = `${publicUrl}/u/${r.id}`;
  const why = `קיבלת את ההודעה כי ביקרת בדוכן של ${r.subject} בתערוכה.`;
  const color = /^#[0-9a-f]{6}$/i.test(r.brand_color ?? '') ? r.brand_color!.toUpperCase() : PLAIN;
  const ink = inkOn(color);
  // On white, his colour carries text only when it is dark enough.
  const onWhite = ink === '#FFFFFF' ? color : '#1A1A1A';
  const logo = !r.sensitive && r.logo && filesUrl ? `${filesUrl}${r.logo}` : null;
  const who = r.sensitive || r.from_name === r.subject ? '' : r.from_name;
  const card = r.sensitive || r.from_name === r.subject ? r.from_name : `${r.from_name} · ${r.subject}`;
  const phone = r.phone ? digits(r.phone) : '';
  const wa = r.whatsapp ? waLink(r.whatsapp) : '';

  const text = [r.body, '', '—',
    ...(phone ? [`לטלפון: ${r.phone}`] : []), ...(wa ? [`בוואטסאפ: ${wa}`] : []),
    why, `להסרה מההודעות: ${unsubscribe}`, '', `נשלח דרך אקספומקס של YHM · ${YHM.url}`].join('\n');

  const mark = logo
    ? `<img src="${esc(logo)}" width="52" height="52" alt="${esc(r.subject)}" style="display:block;width:52px;height:52px;border:0;border-radius:10px;background:#FFFFFF;font-family:${FONT};font-size:12px;color:${ink}">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="52" height="52" align="center" valign="middle" style="width:52px;height:52px;background:#FFFFFF;border-radius:26px;font-family:${FONT};font-size:24px;font-weight:bold;color:${onWhite}">${esc([...r.subject.trim()][0] ?? '')}</td></tr></table>`;
  // A newsletter (design ג, a mailing-list message before a season or a holiday): a banner, a headline, a large button.
  const news = r.style === 'newsletter';
  const lines = r.body.split('\n');
  const greet = /^(שלום|לכבוד|בס"ד)/.test(lines[0] ?? '') ? 1 : 0;
  const head = news ? (lines.slice(greet).find((l) => l.trim()) ?? '').trim() : '';
  const rest = news ? lines.filter((l, i) => !(i >= greet && l.trim() === head && lines.indexOf(l) === i)).join('\n') : r.body;
  const button = (href: string, label: string, main: boolean) => `<a href="${esc(href)}" style="display:inline-block;margin:0 0 8px 8px;padding:${news && main ? '14px 34px' : '11px 20px'};border-radius:${news && main ? '30px' : '8px'};font-family:${FONT};font-size:15px;font-weight:bold;text-decoration:none;${main ? `background:${color};color:${ink};border:1px solid ${color}` : `background:#FFFFFF;color:${onWhite};border:1px solid ${onWhite}`}">${label}</a>`;
  const buttons = [phone && button(`tel:${phone}`, 'להתקשר', true), wa && button(wa, 'וואטסאפ', !phone)].filter(Boolean).join('');

  const html = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(r.subject)}</title></head>`
    + '<body style="margin:0;padding:0;background:#F3F4F1">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F1"><tr><td align="center" style="padding:24px 12px">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="max-width:600px;background:#FFFFFF;border:1px solid #E3E5E0;border-radius:14px;overflow:hidden">'
    // his strip: his logo (or the first letter of his business) and his name, in his colour; a newsletter's is a banner
    + (news
      ? `<tr><td align="center" style="background:${color};padding:30px 24px 26px;text-align:center"><table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">${mark}</td></tr></table>`
        + `<div style="font-family:${FONT};color:${ink};font-size:26px;font-weight:bold;line-height:1.3;margin-top:12px">${esc(r.subject)}</div>`
        + (who ? `<div style="font-family:${FONT};color:${ink};font-size:14px;opacity:.85;margin-top:2px">${esc(who)}</div>` : '') + '</td></tr>'
      : `<tr><td dir="rtl" align="right" style="background:${color};padding:20px 24px">`
        + `<table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl"><tr><td valign="middle" style="padding-left:14px">${mark}</td>`
        + `<td valign="middle" style="font-family:${FONT};color:${ink};text-align:right"><div style="font-size:20px;font-weight:bold;line-height:1.3">${esc(r.subject)}</div>`
        + (who ? `<div style="font-size:14px;line-height:1.4;opacity:.85">${esc(who)}</div>` : '')
        + '</td></tr></table></td></tr>')
    // his message; a newsletter's first line is its headline
    + (news && head ? `<tr><td dir="rtl" align="center" style="padding:28px 24px 0;font-family:${FONT};font-size:22px;font-weight:bold;line-height:1.4;color:#1A1A1A;text-align:center">${esc(head)}</td></tr>` : '')
    + `<tr><td dir="rtl" align="${news ? 'center' : 'right'}" style="padding:${news ? '14px 28px 8px' : '26px 24px 8px'};font-family:${FONT};font-size:${news ? 17 : 16}px;line-height:1.7;color:#1A1A1A;text-align:${news ? 'center' : 'right'}">${linked(news && head ? rest : r.body)}</td></tr>`
    // how to reach him
    + (buttons
      ? `<tr><td style="padding:16px 24px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F7F5;border-radius:10px"><tr><td dir="rtl" align="right" style="padding:16px 16px 8px;font-family:${FONT};text-align:right">`
        + `<div style="font-size:15px;font-weight:bold;color:#1A1A1A;margin-bottom:4px">${esc(card)}</div>`
        + (r.phone ? `<div style="font-size:14px;color:#4A4F47;margin-bottom:12px"><span dir="ltr">${esc(r.phone)}</span></div>` : '<div style="height:8px"></div>')
        + `${buttons}<div style="font-size:13px;color:#6B6F68;margin:4px 0 8px">אפשר גם פשוט להשיב למייל הזה.</div></td></tr></table></td></tr>`
      : '<tr><td style="height:16px"></td></tr>')
    // why he got it, and how to stop
    + `<tr><td dir="rtl" align="right" style="padding:14px 24px;border-top:1px solid #ECEEE9;font-family:${FONT};font-size:12px;line-height:1.5;color:#6B6F68;text-align:right">${esc(why)} <a href="${unsubscribe}" style="color:#6B6F68">להסרה מההודעות</a></td></tr>`
    // YHM
    + `<tr><td dir="rtl" align="right" style="background:${YHM.bg};padding:14px 24px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl"><tr>`
    + `<td valign="middle" style="padding-left:12px"><a href="${YHM.url}"><img src="${publicUrl}/mail/yhm.png" width="36" height="36" alt="YHM" style="display:block;width:36px;height:36px;border:0;border-radius:8px;font-family:${FONT};font-size:13px;font-weight:bold;color:${YHM.lit}"></a></td>`
    + `<td valign="middle" style="font-family:${FONT};text-align:right"><div style="font-size:13px;color:${YHM.ink}">נשלח דרך אקספומקס של <a href="${YHM.url}" style="color:${YHM.lit};font-weight:bold;text-decoration:none">YHM</a></div>`
    + `<div style="font-size:12px;color:${YHM.soft}">${YHM.line}</div></td></tr></table></td></tr>`
    + '</table></td></tr></table></body></html>';
  return { from: fromAddress, fromName: r.from_name, to: r.to_email, replyTo: r.reply_to ?? undefined, subject: r.subject, text, html, unsubscribe };
}

/** One of his tasks in the morning message. */
export interface MorningTask { name: string; action: string; message: string | null; late: boolean; due: string }
const ACT: Record<string, string> = { talk: 'שיחה', meet: 'פגישה', prepare: 'הכנה', send: 'הודעה', reserve: 'שריון', check: 'בדיקה', wait: 'המתנה ללקוח' };

/**
 * The morning message (07/10, 20/10, 30/10): his tasks of the day, the late ones first, and a button straight to them.
 * From YHM to him, in YHM's own look; no removal line (it is his own system's message, switched off in his settings).
 */
export function buildMorning(to: string, name: string, tasks: MorningTask[], appUrl: string, fromAddress: string): Mail {
  const late = tasks.filter((t) => t.late), today = tasks.filter((t) => !t.late);
  const line = (t: MorningTask) => `${t.name} · ${ACT[t.action] ?? t.action}${t.message ? ` — "${t.message}"` : ''}`;
  const subject = `המשימות שלך להיום · ${tasks.length}`;
  const first = name.trim().split(/\s+/)[0] ?? '';
  const text = [`בוקר טוב ${first},`, '', ...(late.length ? ['באיחור:', ...late.map((t) => '• ' + line(t)), ''] : []),
    ...(today.length ? ['להיום:', ...today.map((t) => '• ' + line(t)), ''] : []), `לפתוח את המשימות: ${appUrl}/#tasks`, '', 'אקספומקס · מערכת של YHM'].join('\n');
  const list = (title: string, items: MorningTask[], color: string) => items.length
    ? `<tr><td dir="rtl" align="right" style="padding:6px 24px 0;font-family:${FONT};text-align:right"><div style="font-size:13px;font-weight:bold;color:${color};margin:10px 0 6px">${title} · ${items.length}</div>`
      + items.map((t) => `<div style="font-size:15px;line-height:1.5;color:#1A1A1A;padding:8px 0;border-bottom:1px solid #ECEEE9"><b>${esc(t.name)}</b> · ${esc(ACT[t.action] ?? t.action)}${t.message ? `<span style="color:#6B6F68"> — ${esc(t.message)}</span>` : ''}</div>`).join('')
      + '</td></tr>'
    : '';
  const html = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + `<meta name="color-scheme" content="light"><title>${esc(subject)}</title></head><body style="margin:0;padding:0;background:#F3F4F1">`
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F1"><tr><td align="center" style="padding:24px 12px">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" dir="rtl" style="max-width:560px;background:#FFFFFF;border:1px solid #E3E5E0;border-radius:14px;overflow:hidden">'
    + `<tr><td dir="rtl" align="right" style="background:${YHM.bg};padding:16px 24px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" dir="rtl"><tr>`
    + `<td valign="middle" style="padding-left:12px"><img src="${appUrl}/mail/yhm.png" width="36" height="36" alt="YHM" style="display:block;width:36px;height:36px;border:0;border-radius:8px;font-family:${FONT};font-size:13px;font-weight:bold;color:${YHM.lit}"></td>`
    + `<td valign="middle" style="font-family:${FONT};color:${YHM.ink};font-size:19px;font-weight:bold">אקספומקס</td></tr></table></td></tr>`
    + `<tr><td dir="rtl" align="right" style="padding:22px 24px 4px;font-family:${FONT};font-size:17px;color:#1A1A1A;text-align:right">בוקר טוב ${esc(first)},<br><span style="font-size:15px;color:#4A4F47">${tasks.length === 1 ? 'משימה אחת מחכה לך היום.' : `${tasks.length} משימות מחכות לך היום.`}</span></td></tr>`
    + list('באיחור', late, '#A33A1F') + list('להיום', today, '#1A1A1A')
    + `<tr><td align="right" dir="rtl" style="padding:20px 24px 26px"><a href="${appUrl}/#tasks" style="display:inline-block;background:${YHM.bg};color:${YHM.ink};font-family:${FONT};font-size:15px;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:8px">לפתוח את המשימות</a></td></tr>`
    + `<tr><td dir="rtl" align="right" style="background:${YHM.bg};padding:12px 24px;font-family:${FONT};font-size:12px;color:${YHM.soft};text-align:right">אקספומקס · מערכת של <a href="${YHM.url}" style="color:${YHM.lit};font-weight:bold;text-decoration:none">YHM</a> · ${YHM.line}<br>אפשר לשנות את השעה, או לכבות, בהגדרות › הודעות.</td></tr>`
    + '</table></td></tr></table></body></html>';
  return { from: fromAddress, fromName: 'אקספומקס', to, subject, text, html, unsubscribe: '' };
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

/** The whole mail as MIME: plain text and HTML, the files attached, and the removal headers. */
export function mime(m: Mail, now = new Date(), id: string = crypto.randomUUID()): string {
  const boundary = `b-${id}`;
  const mixed = `m-${id}`;
  const domain = m.from.split('@')[1] ?? 'localhost';
  const files = m.attachments ?? [];
  const body = [
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
  ];
  const parts = !files.length ? [`Content-Type: multipart/alternative; boundary="${boundary}"`, '', ...body] : [
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
    '',
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    ...body,
    ...files.flatMap((f) => [
      `--${mixed}`,
      `Content-Type: ${f.type}; name="${word(f.name)}"`,
      `Content-Disposition: attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      'Content-Transfer-Encoding: base64',
      '',
      f.data.toString('base64').replace(/.{76}/g, '$&\r\n'),
    ]),
    `--${mixed}--`,
  ];
  return [
    `From: ${word(m.fromName)} <${m.from}>`,
    `To: <${m.to}>`,
    ...(m.replyTo ? [`Reply-To: <${m.replyTo}>`] : []),
    `Subject: ${word(m.subject)}`,
    `Date: ${now.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@${domain}>`,
    'MIME-Version: 1.0',
    // A system mail to the exhibitor himself (the morning message) has no removal link: he switches it off in his settings.
    ...(m.unsubscribe ? [`List-Unsubscribe: <${m.unsubscribe}>`, 'List-Unsubscribe-Post: List-Unsubscribe=One-Click'] : []),
    ...parts,
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

/** Cloudflare Email Service takes the mail as fields, not as MIME (REST API, docs of 29/10): the removal link goes in
 *  its allowed List-Unsubscribe headers, the files as base64 attachments (5 MiB for the whole mail). */
export function cloudflareBody(m: Mail) {
  return {
    from: { address: m.from, name: m.fromName },
    to: [m.to],
    ...(m.replyTo ? { reply_to: m.replyTo } : {}),
    subject: m.subject,
    text: m.text,
    html: m.html,
    ...(m.unsubscribe ? { headers: { 'List-Unsubscribe': `<${m.unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
    ...(m.attachments?.length ? { attachments: m.attachments.map((a) => ({ content: a.data.toString('base64'), filename: a.name, type: a.type, disposition: 'attachment' })) } : {}),
  };
}

function cloudflare(account: string, token: string): Provider {
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/email/sending/send`;
  return {
    name: 'cloudflare',
    async send(m) {
      const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cloudflareBody(m)) });
      const j = (await r.json().catch(() => null)) as { success?: boolean; errors?: { code: number; message: string }[]; result?: { permanent_bounces?: string[] } } | null;
      // A "slow down" (429) keeps its number in the message, so the mail loop waits for the next round.
      if (!r.ok || !j?.success) throw new Error(`cloudflare ${r.status} ${(j?.errors ?? []).map((e) => `${e.code} ${e.message}`).join('; ')}`.trim());
      if (j.result?.permanent_bounces?.length) throw new Error('cloudflare: the address bounced');
    },
  };
}

/** The provider set on this server, or none (then mail waits in the queue). */
export function providerFrom(keys: Record<string, string>): Provider | null {
  if (keys.mail_provider === 'ses' && keys.ses_region && keys.ses_key_id && keys.ses_secret) return ses(keys.ses_region, keys.ses_key_id, keys.ses_secret);
  if (keys.mail_provider === 'cloudflare' && keys.cf_account && keys.cf_token) return cloudflare(keys.cf_account, keys.cf_token);
  return null;
}
