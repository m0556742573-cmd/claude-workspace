// YHM on y-h-m.com, next to the site (which stays on the server):
//   /admin*    the control center (files in public/admin)
//   /api/hit   the site reports a visit or a click on WhatsApp, phone or mail
//   /c/<code>  a campaign link: goes to the site and remembers which campaign brought the visitor
const TYPES = new Set(['visit', 'whatsapp', 'phone', 'mail']);
const CODE = /^[a-z0-9-]{2,24}$/;
const HOSTS = new Set(['y-h-m.com', 'www.y-h-m.com']);
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp\/|telegram|curl|wget|python|httpclient|monitor/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/hit') return hit(request, env, ctx);
    if (path.startsWith('/c/')) {
      const code = decodeURIComponent(path.slice(3)).toLowerCase().replace(/\/$/, '');
      return new Response(null, { status: 302, headers: { Location: CODE.test(code) ? '/?c=' + code : '/', 'Cache-Control': 'no-store' } });
    }
    if (path.startsWith('/admin') && url.hostname === 'www.y-h-m.com') {   // one address for the center, so Google sign-in has one place to return to
      return Response.redirect('https://y-h-m.com' + path + url.search, 301);
    }
    if (path === '/admin' || path === '/admin/') {
      const page = await env.ASSETS.fetch(new Request(new URL('/admin/index.html', url), request));
      const res = new Response(page.body, page);
      res.headers.set('Cache-Control', 'no-cache');
      res.headers.set('X-Frame-Options', 'DENY');
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      return res;
    }
    if (path.startsWith('/admin/')) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  }
};

// Nothing that identifies a person is kept: the IP is only mixed into a code that changes every day.
async function hit(request, env, ctx) {
  const done = new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST' || !env.SUPABASE_URL || !env.SUPABASE_KEY || !env.HQ_SALT) return done;
  const ua = request.headers.get('User-Agent') || '';
  const origin = request.headers.get('Origin');
  if (BOT.test(ua) || (origin && !HOSTS.has(hostOf(origin)))) return done;

  let b;
  try {
    const text = await request.text();
    if (text.length > 2000) return done;
    b = JSON.parse(text);
  } catch (e) { return done; }
  if (!b || !TYPES.has(b.t)) return done;

  const cf = request.cf || {};
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const row = {
    p_type: b.t,
    p_page: typeof b.p === 'string' ? b.p.slice(0, 200) : null,
    p_referrer: hostOf(b.r),
    p_campaign: typeof b.c === 'string' && CODE.test(b.c) ? b.c : null,
    p_device: /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop',
    p_city: typeof cf.city === 'string' ? cf.city.slice(0, 80) : null,
    p_country: typeof cf.country === 'string' ? cf.country : null,
    p_visitor: await sha256(env.HQ_SALT + '|' + day + '|' + ip + '|' + ua)
  };
  ctx.waitUntil(fetch(env.SUPABASE_URL + '/rest/v1/rpc/hq_hit', {
    method: 'POST',
    headers: { apikey: env.SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(row)
  }).then(r => { if (!r.ok) return r.text().then(t => console.log('hq_hit', r.status, t)); }).catch(e => console.log('hq_hit', String(e))));
  return done;
}

function hostOf(s) {
  if (typeof s !== 'string' || !s) return null;
  try { return new URL(s).hostname.replace(/^www\./, '').slice(0, 120) || null; } catch (e) { return null; }
}

async function sha256(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 16).map(x => x.toString(16).padStart(2, '0')).join('');
}
