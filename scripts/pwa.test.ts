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
  runInNewContext(source, {
    self: {
      location: { origin: 'https://alive.example' },
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        handlers[type] = handler
      },
    },
    caches, fetch, Request, Response, URL,
  })
  return { handlers, caches, cache, fetch, offline }
}

describe('PWA service worker', () => {
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
