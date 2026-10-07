const VERSION = 'v1';            // 배포 때마다 올린다 (v2, v3 …)
const CACHE = `pet-tablet-${VERSION}`;
const FILES = ['./', './index.html', './manifest.webmanifest', './css/app.css', './css/pet.css',
  './js/clock.js', './js/state.js', './js/behaviors.js', './js/storage.js', './js/pet-svg.js', './js/pet-view.js',
  './js/ui.js', './js/settings.js', './js/sound.js', './js/main.js', './assets/icon-192.png', './assets/icon-512.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
