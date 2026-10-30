// The removal link in every mail sits on the app's own address (expo.y-h-m.com/u/<id>, 30/10), so the visitor sees
// the same name as the sender's. The page itself, and the one-click removal mail services post here, are the
// WhatsApp server's: this only passes the request on and brings its answer back.
const SERVER = 'https://expo-wa.paydfb.easypanel.host';

export async function onRequest({ request, params }) {
  if (request.method !== 'GET' && request.method !== 'POST') return new Response('', { status: 405 });
  return fetch(`${SERVER}/u/${params.id}`, {
    method: request.method,
    headers: { 'Content-Type': request.headers.get('Content-Type') ?? 'text/plain' },
    body: request.method === 'POST' ? await request.arrayBuffer() : undefined,
  });
}
