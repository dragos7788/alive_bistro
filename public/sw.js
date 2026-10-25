const OFFLINE_CACHE = 'alive-offline-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(
      new Request(new URL(OFFLINE_URL, self.location.origin), { cache: 'reload' }),
    )),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('alive-offline-') && key !== OFFLINE_CACHE)
        .map((key) => caches.delete(key)),
    )),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (
    request.method !== 'GET' ||
    request.mode !== 'navigate' ||
    url.origin !== self.location.origin ||
    /^\/(?:api|admin)(?:\/|$)/.test(url.pathname)
  ) return

  event.respondWith(
    fetch(new Request(request, { cache: 'no-store' })).catch(async () => {
      const offline = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE })
      if (offline) return offline
      return new Response('Offline. Reconnect to access ALIVE Bistro.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }),
  )
})
