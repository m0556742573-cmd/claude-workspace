/* Cloudflare Pages, advanced mode: one small server beside the static files.
 *
 * Why it exists: on Cloudflare the page has no Claude viewer around it, so the
 * AI has to be called from somewhere. Not from the browser — that would put the
 * API key in the page for anyone to copy. So the browser asks this worker, and
 * the worker asks Anthropic with a key that lives only in Cloudflare's settings.
 *
 * Why _worker.js and not a functions/ folder: the dashboard's drag-and-drop
 * upload does not compile functions/, but it does run _worker.js.
 *
 * Settings (Cloudflare → the Pages project → Settings → Variables and Secrets):
 *   ANTHROPIC_API_KEY  required. Without it the AI button simply does not appear.
 *   ACCESS_CODE        strongly advised. Without it anyone with the link spends your credit.
 *   MODEL              optional. Defaults to claude-sonnet-5-5.
 */
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

async function ai(request, env) {
  if (request.method !== 'POST') return json({ code: 'method' }, 405);
  let body;
  try { body = await request.json(); } catch (e) { return json({ code: 'bad_request' }, 400); }
  // A ping tells the page whether to show the AI at all, and whether a code is needed. It costs nothing.
  if (body && body.ping) return json({ configured: !!env.ANTHROPIC_API_KEY, needCode: !!env.ACCESS_CODE });
  if (!env.ANTHROPIC_API_KEY) return json({ code: 'not_configured' }, 503);
  if (env.ACCESS_CODE && request.headers.get('x-access-code') !== env.ACCESS_CODE) return json({ code: 'need_code' }, 401);
  const prompt = String((body && body.prompt) || '').slice(0, 40000);
  if (!prompt) return json({ code: 'bad_request' }, 400);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.MODEL || 'claude-sonnet-5-5', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }),
  });
  if (r.status === 429) return json({ code: 'rate_limited' }, 429);
  if (!r.ok) return json({ code: 'upstream', status: r.status }, 502);
  const data = await r.json();
  const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
  return json({ text });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ai') return ai(request, env);
    return env.ASSETS.fetch(request);
  },
};
