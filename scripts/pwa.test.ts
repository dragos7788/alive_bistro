import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')

function setup() {
  const handlers: Record<string, (event: unknown) => void> = {}
  const offline = new Response('offline')
  const cache = { add: vi.fn().mockResolvedValue(undefined) }
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    match: vi.fn().mockResolvedValue(offline),
    keys: vi.fn().mockResolvedValue(['alive-offline-v0', 'alive-offline-v1', 'unrelated']),
    delete: vi.fn().mockResolvedValue(true),
  }
  const fetch = vi.fn().mockResolvedValue(new Response('online'))
  const showNotification = vi.fn().mockResolvedValue(undefined)
  const openWindow = vi.fn().mockResolvedValue(undefined)
  runInNewContext(source, {
    self: {
      location: { origin: 'https://alive.example' },
      skipWaiting: vi.fn().mockResolvedValue(undefined),
      registration: { showNotification },
      clients: { claim: vi.fn().mockResolvedValue(undefined), matchAll: vi.fn().mockResolvedValue([]), openWindow },
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        handlers[type] = handler
      },
    },
    caches, fetch, Request, Response, URL, console,
  })
  return { handlers, caches, cache, fetch, offline, showNotification, openWindow }
}

describe('PWA service worker', () => {
  it('displays a push campaign with a stable tag and internal destination', async () => {
    const { handlers, showNotification } = setup()
    const waitUntil = vi.fn()

    handlers.push({ data: { json: () => ({ title: 'Oferta', body: 'Noutati', path: '/menu', campaignId: 'campaign-1' }) }, waitUntil })
    await waitUntil.mock.calls[0][0]

    expect(showNotification).toHaveBeenCalledWith('Oferta', expect.objectContaining({
      body: 'Noutati', tag: 'campaign-1', data: { path: '/menu' },
    }))
  })
  it.each(['/menu', 'https://untrusted.example/', '//untrusted.example/', '/api/customer/me'])(
    'opens only allowlisted local notification destinations: %s', async path => {
      const { handlers, openWindow } = setup()
      const waitUntil = vi.fn()
      const close = vi.fn()

      handlers.notificationclick({ notification: { close, data: { path } }, waitUntil })
      await waitUntil.mock.calls[0][0]

      expect(close).toHaveBeenCalledOnce()
      expect(openWindow).toHaveBeenCalledWith(`https://alive.example${path === '/menu' ? '/menu' : '/account'}`)
    },
  )
  it('precaches only the static offline document', async () => {
    const { handlers, caches, cache } = setup()
    const waitUntil = vi.fn()

    handlers.install({ waitUntil })
    await waitUntil.mock.calls[0][0]

    expect(caches.open).toHaveBeenCalledWith('alive-offline-v1')
    expect(cache.add).toHaveBeenCalledTimes(1)
    expect(cache.add.mock.calls[0][0].url).toBe('https://alive.example/offline.html')
  })

  it('removes only obsolete owned caches', async () => {
    const { handlers, caches } = setup()
    const waitUntil = vi.fn()

    handlers.activate({ waitUntil })
    await waitUntil.mock.calls[0][0]

    expect(caches.delete.mock.calls).toEqual([['alive-offline-v0']])
  })

  it.each([
    ['/api', 'navigate', 'GET'],
    ['/api/orders', 'navigate', 'GET'],
    ['/admin', 'navigate', 'GET'],
    ['/admin/drinks', 'navigate', 'GET'],
    ['/api/menu', 'cors', 'GET'],
    ['/assets/app.js', 'cors', 'GET'],
    ['/', 'navigate', 'POST'],
    ['https://other.example/', 'navigate', 'GET'],
  ])('does not intercept %s (%s %s)', (path, mode, method) => {
    const { handlers, fetch } = setup()
    const respondWith = vi.fn()

    handlers.fetch({
      request: { url: new URL(path, 'https://alive.example').href, mode, method },
      respondWith,
    })

    expect(respondWith).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([false, true])('uses network online and fallback only on failure: %s', async (offlineMode) => {
    const { handlers, fetch, caches } = setup()
    if (offlineMode) fetch.mockRejectedValueOnce(new TypeError('offline'))
    const request = new Request('https://alive.example/')
    Object.defineProperty(request, 'mode', { value: 'navigate' })
    const respondWith = vi.fn()

    handlers.fetch({ request, respondWith })
    const response = await respondWith.mock.calls[0][0]

    expect(fetch.mock.calls[0][0].cache).toBe('no-store')
    expect(await response.text()).toBe(offlineMode ? 'offline' : 'online')
    expect(caches.match).toHaveBeenCalledTimes(offlineMode ? 1 : 0)
  })
})
