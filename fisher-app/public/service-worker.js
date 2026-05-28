/* global self, caches, clients, fetch */
/**
 * ASSA Fisher service worker.
 *
 * Strategy:
 *  - Precaches the app shell on install so the PWA can boot offline.
 *  - Navigation requests: network-first with fallback to the cached app shell
 *    (so deep links keep working when the device is offline).
 *  - Same-origin static assets (JS/CSS/fonts/images): stale-while-revalidate.
 *  - API requests (/api/*): network-only — never serve stale auth-sensitive data.
 *  - Other cross-origin requests: pass through.
 */

const VERSION = 'v1';
const APP_SHELL_CACHE = `assa-fisher-shell-${VERSION}`;
const RUNTIME_CACHE = `assa-fisher-runtime-${VERSION}`;
const SCOPE_PATH = new URL(self.registration.scope).pathname;

const APP_SHELL_URLS = [
  SCOPE_PATH,
  `${SCOPE_PATH}index.html`,
  `${SCOPE_PATH}manifest.webmanifest`,
  `${SCOPE_PATH}favicon.svg`,
  `${SCOPE_PATH}icons/icon-192.png`,
  `${SCOPE_PATH}icons/icon-512.png`,
  `${SCOPE_PATH}icons/icon-512-maskable.png`,
  `${SCOPE_PATH}icons/icon.svg`,
  `${SCOPE_PATH}apple-touch-icon.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await Promise.all(
        APP_SHELL_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            /* best-effort precache */
          }),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isSameOriginAsset(url) {
  return (
    url.origin === self.location.origin &&
    url.pathname.startsWith(SCOPE_PATH) &&
    /\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|svg|webp|ico|json)$/i.test(url.pathname)
  );
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(APP_SHELL_CACHE);
    cache.put(`${SCOPE_PATH}index.html`, response.clone()).catch(() => {});
    return response;
  } catch {
    const cache = await caches.open(APP_SHELL_CACHE);
    const cached =
      (await cache.match(`${SCOPE_PATH}index.html`)) || (await cache.match(SCOPE_PATH));
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);
  return cached || (await networkPromise) || new Response('', { status: 504 });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isApiRequest(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isSameOriginAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
