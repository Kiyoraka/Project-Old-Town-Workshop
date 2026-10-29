// Old Town Workshop service worker: the whole app is cached at install, so the installed app opens
// and runs offline (the demo data already lives in the browser). Bump CACHE on every deploy: the
// new worker caches the new build in one piece, takes over, and deletes the old cache, so a phone
// never runs half an old app and half a new one.

const CACHE = 'otw-v2';
const FONTS = 'otw-fonts';

const APP_SHELL = [
  './',
  './assets/favicon.svg',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/images/absorber-fitting.webp',
  './assets/images/absorber-restored.webp',
  './assets/images/brake-service.webp',
  './assets/images/engine-oil-service.webp',
  './assets/images/hero-workshop.webp',
  './assets/images/login-counter.webp',
  './assets/images/og-cover.jpg',
  './assets/images/tyre-battery.webp',
  './assets/images/wheel-alignment.webp',
  './css/admin.css',
  './css/base.css',
  './css/invoice.css',
  './css/mobile.css',
  './css/public.css',
  './index.html',
  './js/auth.js',
  './js/channel.js',
  './js/data.js',
  './js/main.js',
  './js/pwa.js',
  './js/qr.js',
  './js/router.js',
  './js/share.js',
  './js/state.js',
  './js/store.js',
  './js/ui.js',
  './js/vendor/qrcode-generator.js',
  './js/views/admin/bookings.js',
  './js/views/admin/checkin-stand.js',
  './js/views/admin/checkout.js',
  './js/views/admin/dashboard.js',
  './js/views/admin/gateway.js',
  './js/views/admin/inventory.js',
  './js/views/admin/job-card.js',
  './js/views/admin/jobs.js',
  './js/views/admin/layout.js',
  './js/views/admin/paid.js',
  './js/views/admin/settings.js',
  './js/views/admin/staff.js',
  './js/views/book.js',
  './js/views/checkin.js',
  './js/views/guest-dock.js',
  './js/views/icons.js',
  './js/views/invoice.js',
  './js/views/job.js',
  './js/views/landing.js',
  './js/views/login.js',
  './js/views/public.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE && key !== FONTS).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // The page itself: the network when it is there, the cached shell when it is not.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html', { ignoreSearch: true })));
    return;
  }

  // Google Fonts: answer from the cache at once and refresh it in the background.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(FONTS).then(async (cache) => {
      const cached = await cache.match(request);
      const fresh = fetch(request).then((response) => {
        if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
        return response;
      }).catch(() => cached);
      return cached || fresh;
    }));
    return;
  }

  // On this machine (development) always try the network first, so an edited file shows at once;
  // the cache only answers when the server is down.
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);
  if (local && url.origin === self.location.origin) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request, { ignoreSearch: true })));
    return;
  }

  // The app's own files: from this build's cache, else the network (and keep a copy).
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request, { ignoreSearch: true }).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })));
  }
  // Anything else (wa.me, other sites) goes straight to the network and is never cached.
});
