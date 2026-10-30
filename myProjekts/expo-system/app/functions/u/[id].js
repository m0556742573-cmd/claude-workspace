// The removal link in every mail sits on the app's own address (expo.y-h-m.com/u/<id>, 30/10), so the visitor sees
// the same name as the sender's. The page itself, and the one-click removal mail services post here, are the
// WhatsApp server's: this only passes the request on and brings its answer back. When that server cannot be reached,
// the visitor gets a page that says so, and a mail service's one-click removal gets an error it will try again.
const SERVER = 'https://expo-wa.paydfb.easypanel.host';

export async function onRequest({ request, params }) {
  if (request.method !== 'GET' && request.method !== 'POST') return new Response('', { status: 405 });
  try {
    return await fetch(`${SERVER}/u/${params.id}`, {
      method: request.method,
      headers: { 'Content-Type': request.headers.get('Content-Type') ?? 'text/plain' },
      body: request.method === 'POST' ? await request.arrayBuffer() : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return new Response('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>הסרה מההודעות</title></head>'
      + '<body style="font-family:Arial,sans-serif;max-width:420px;margin:12vh auto;padding:24px;line-height:1.6"><h1>רגע אחד</h1><p>ההסרה לא הצליחה כרגע. אפשר לנסות שוב בעוד כמה דקות, מאותו קישור.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '300' } });
  }
}
