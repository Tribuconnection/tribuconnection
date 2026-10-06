/* Service worker del portal (solo controla /cuenta/portal/). Hace que el
   portal se pueda instalar como app y que abra aunque la conexión esté
   floja: siempre intenta la red primero y, si no hay, usa la última copia.
   Los datos (Supabase) nunca se guardan acá: van siempre a la red. */
const CACHE = 'tribu-portal-v1';
const BASE = ['/cuenta/portal/', '/assets/pwa-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;
  if(req.mode === 'navigate'){
    e.respondWith(fetch(req).then(res => {
      if(res.ok && url.pathname === '/cuenta/portal/'){
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put('/cuenta/portal/', copia));
      }
      return res;
    }).catch(() => caches.match('/cuenta/portal/')));
  }
});
