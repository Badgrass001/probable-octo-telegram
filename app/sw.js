// Service worker : l'application fonctionne hors connexion pour tout ce qui a déjà été consulté.
const VERSION = 'flaneur-v2';
const SHELL = [
  './', 'index.html', 'css/style.css', 'js/app.js', 'js/wiki.js', 'js/geo.js', 'js/util.js', 'js/parcours.js',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'flaneur-data').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Coquille de l'application : réseau d'abord (pour les mises à jour), cache en secours.
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }

  // Wikipédia, images, tuiles, polices : cache puis mise à jour en arrière-plan.
  if (/wikipedia\.org|wikimedia\.org|basemaps\.cartocdn\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
    e.respondWith(caches.open('flaneur-data').then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; });
      return hit || net;
    }));
  }
});
