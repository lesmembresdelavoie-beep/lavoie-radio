/* Service Worker — La Voie PWA
   Mete kach app la ajou : chanje NIMEWO vèsyon an chak fwa ou modifye app.html */
const CACHE = 'lavoie-app-v1';
const FICHIERS = [
  'app.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cles =>
      Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Rezo dabò, kach si pa gen koneksyon — konsa app la toujou ajou */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(rep => {
        const copie = rep.clone();
        caches.open(CACHE).then(c => c.put(e.request, copie)).catch(()=>{});
        return rep;
      })
      .catch(() => caches.match(e.request))
  );
});
