const OFFLINE_CACHE = 'alive-offline-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(
      new Request(new URL(OFFLINE_URL, self.location.origin), { cache: 'reload' }),
    )).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('alive-offline-') && key !== OFFLINE_CACHE)
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
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

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let message
    try { message = event.data?.json() } catch (error) {
      console.error('ALIVE: invalid push payload', error)
    }
    const title = typeof message?.title === 'string' ? message.title : 'ALIVE Bistro'
    const body = typeof message?.body === 'string' ? message.body : 'Deschide aplicatia pentru noutati.'
    await self.registration.showNotification(title, {
      body, icon: '/pwa/icon-192.png',
      tag: typeof message?.campaignId === 'string' ? message.campaignId : undefined,
      data: { path: typeof message?.path === 'string' ? message.path : '/account' },
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const url = new URL(event.notification.data?.path || '/account', self.location.origin)
    const destination = url.origin === self.location.origin && ['/', '/menu', '/account'].includes(url.pathname)
      ? url.href : new URL('/account', self.location.origin).href
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find((client) => client.url === destination)
    if (existing) await existing.focus()
    else await self.clients.openWindow(destination)
  })())
})
