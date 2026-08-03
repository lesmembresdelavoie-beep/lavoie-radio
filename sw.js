/* Service Worker — La Voie PWA
   Mete kach app la ajou : chanje NIMEWO vèsyon an chak fwa ou modifye app.html */
const CACHE = 'lavoie-app-v60';
const FICHIERS = [
  'app.html',
  'manifest.json',
  'teks-data.js',
  'icon-192.png',
  'icon-512.png',
  'chirat-tehillah.html',
  'couverture-sefer.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FICHIERS.map(f => c.add(f).catch(()=>{})))));
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


/* ============ NOTIFIKASYON NOUVOTE ✦ ============
   Sous: nouvote.json (mete l ajou ak chak nouvo kontni).
   Telefòn nan tcheke otomatikman (periodic sync) epi montre
   yon notifikasyon pou Tèks Jounen an ak pou chak nouvote. */
const ETA_CACHE = 'lavoie-notif-eta';
const ETA_KEY = 'eta-nouvote';

async function liEta(){
  try {
    const c = await caches.open(ETA_CACHE);
    const r = await c.match(ETA_KEY);
    if (r) return await r.json();
  } catch(e){}
  return { jou: null, ids: [] };
}
async function sereEta(eta){
  try {
    const c = await caches.open(ETA_CACHE);
    await c.put(ETA_KEY, new Response(JSON.stringify(eta), {headers:{'Content-Type':'application/json'}}));
  } catch(e){}
}
async function verifyeNouvote(){
  try {
    const r = await fetch('nouvote.json?nc=' + Date.now(), {cache:'no-store'});
    if (!r.ok) return;
    const d = await r.json();
    const eta = await liEta();
    const notifs = [];

    if (d.teks && d.teks.jou && d.teks.jou !== eta.jou) {
      notifs.push({
        titre: '✦ Tèks pou Jounen an',
        opts: {
          body: (d.teks.yom ? d.teks.yom + ' — ' : '') + d.teks.jou + ' ' + d.teks.mois + '  ·  ' + (d.teks.ref || ''),
          icon: 'icon-192.png', badge: 'icon-192.png',
          tag: 'lavoie-teks-jounen', renotify: true,
          data: { url: 'app.html' }
        }
      });
    }
    const idsKonnen = eta.ids || [];
    (d.items || []).forEach(function(it){
      if (idsKonnen.indexOf(it.id) === -1) {
        notifs.push({
          titre: it.titre,
          opts: {
            body: it.sou || 'Nouvote La Voie',
            icon: 'icon-192.png', badge: 'icon-192.png',
            tag: 'lavoie-' + it.id,
            data: { url: it.url || 'index.html' }
          }
        });
      }
    });

    for (const n of notifs) { await self.registration.showNotification(n.titre, n.opts); }
    await sereEta({ jou: d.teks ? d.teks.jou : eta.jou, ids: (d.items || []).map(function(i){ return i.id; }) });
  } catch(e){}
}

self.addEventListener('periodicsync', function(ev){
  if (ev.tag === 'lavoie-nouvote') ev.waitUntil(Promise.all([verifyeNouvote(), verifyeTefilot()]));
});
self.addEventListener('message', function(ev){
  if (ev.data && ev.data.type === 'verifye-nouvote') {
    var travay = Promise.all([verifyeNouvote(), verifyeTefilot()]);
    if (ev.waitUntil) ev.waitUntil(travay);
  }
});
/* Pare pou vrè "push" sèvè alavni (VPS) */
self.addEventListener('push', function(ev){
  let d = {};
  try { d = ev.data ? ev.data.json() : {}; } catch(e){}
  ev.waitUntil(self.registration.showNotification(d.titre || '✦ La Voie', {
    body: d.body || 'Nouvote sou lavoie.world',
    icon: 'icon-192.png', badge: 'icon-192.png',
    data: { url: d.url || 'index.html' }
  }));
});
self.addEventListener('notificationclick', function(ev){
  ev.notification.close();
  const url = (ev.notification.data && ev.notification.data.url) || 'index.html';
  ev.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(function(lis){
    for (const c of lis) {
      if (c.url.indexOf(url) !== -1 && 'focus' in c) return c.focus();
    }
    return clients.openWindow(url);
  }));
});


/* ============ RAPÈL TÉFILOT (maten 6:00 · midi 12:00 · aswè 21:30 — lè lokal) ============ */
const TEFILOT = [
  { m:'matin', h:6,  min:0,  titre:'🌅 Téfilah du matin', body:"C'est l'heure de la prière du matin ✦" },
  { m:'midi',  h:12, min:0,  titre:'☀️ Téfilah du midi',  body:"C'est l'heure de la prière de midi ✦" },
  { m:'soir',  h:21, min:30, titre:'🌙 Téfilah de la veille du soir', body:"C'est l'heure de la prière du soir ✦" }
];
const TEF_CACHE = 'lavoie-tefilot-eta';

async function liTefEta(){
  try { const c=await caches.open(TEF_CACHE); const r=await c.match('eta'); if(r) return await r.json(); } catch(e){}
  return {};
}
async function sereTefEta(o){
  try { const c=await caches.open(TEF_CACHE); await c.put('eta', new Response(JSON.stringify(o),{headers:{'Content-Type':'application/json'}})); } catch(e){}
}
async function verifyeTefilot(){
  try {
    const n = new Date();
    const jour = n.getFullYear()+'-'+n.getMonth()+'-'+n.getDate();
    const eta = await liTefEta();
    const mnNow = n.getHours()*60 + n.getMinutes();
    for (const t of TEFILOT){
      const cible = t.h*60 + t.min;
      // Fenêtre de déclenchement: entre l'heure cible et 90 min après, une seule fois par jour
      const cle = jour+'-'+t.m;
      if (mnNow >= cible && mnNow < cible+90 && eta[t.m] !== jour){
        await self.registration.showNotification(t.titre, {
          body: t.body, icon:'icon-192.png', badge:'icon-192.png',
          tag:'lavoie-tefilah-'+t.m, renotify:true,
          data:{ url:'tefilot.html?m='+t.m }
        });
        eta[t.m] = jour;
      }
    }
    await sereTefEta(eta);
  } catch(e){}
}
