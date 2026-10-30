// The booth opens without a network: the page and its files are kept on the tablet after the first visit.
// The page itself is asked from the network first (so a new version arrives at once) and comes from the copy
// only when there is no network. The built files have their version in the name, so a kept one is always right.
// Nothing else is touched here: the database and sign-in go straight to the network, as before.
const CACHE = 'booth-1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mine = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!mine && !fonts) return;

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        // Only the booth itself is kept as the page; a removal link opened on the tablet (/u/…) is not the booth.
        if (res.ok && url.pathname === '/') await cache.put('/', res.clone());
        return res;
      } catch {
        return (await cache.match('/')) ?? Response.error();
      }
    })());
    return;
  }

  // Built files and fonts: the kept copy first; anything else of ours: the network first.
  const lasting = fonts || url.pathname.startsWith('/assets/');
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (lasting) {
      const hit = await cache.match(req);
      if (hit) return hit;
    }
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') await cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req)) ?? Response.error();
    }
  })());
});
