import { afterEach, describe, expect, it, vi } from "vitest"
import { enableDevicePush, supportsPush } from "./push-subscription"

afterEach(() => vi.unstubAllGlobals())

function setup(permission: NotificationPermission = "granted", persisted = true, existing = false) {
  const unsubscribe = vi.fn(async () => true)
  const subscription = { toJSON: () => ({ endpoint: "https://fcm.googleapis.com/test", keys: {} }), unsubscribe }
  const subscribe = vi.fn(async () => subscription)
  const requestPermission = vi.fn(async () => permission)
  const register = vi.fn(async () => ({}))
  vi.stubGlobal("Notification", { requestPermission })
  vi.stubGlobal("navigator", { serviceWorker: {
    register, ready: Promise.resolve({ pushManager: {
      getSubscription: async () => existing ? subscription : null, subscribe,
    } }),
  } })
  const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify(
    persisted ? { data: { consent: true } } : { error: { code: "PUSH_DEVICE_IN_USE" } },
  ), { status: persisted ? 200 : 409 }))
  vi.stubGlobal("fetch", fetch)
  return { requestPermission, register, subscribe, unsubscribe, fetch }
}

describe("explicit device push subscription", () => {
  it("requests browser permission synchronously and saves explicit consent after subscription", async () => {
    const mocks = setup()

    const pending = enableDevicePush("B".repeat(87))
    expect(mocks.requestPermission).toHaveBeenCalledOnce()
    await pending

    expect(mocks.subscribe).toHaveBeenCalledOnce()
    expect(JSON.parse(mocks.fetch.mock.calls[0][1]!.body as string)).toMatchObject({
      consent: true, noticeVersion: "push-marketing-v1",
    })
  })

  it.each(["denied", "default"] as const)("does not register or grant consent for permission %s", async permission => {
    const mocks = setup(permission)

    await expect(enableDevicePush("B".repeat(87))).rejects.toThrow("push.permissionDenied")

    expect(mocks.register).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it("removes a newly created device subscription when server consent fails", async () => {
    const mocks = setup("granted", false)

    await expect(enableDevicePush("B".repeat(87))).rejects.toThrow("push.deviceInUse")

    expect(mocks.unsubscribe).toHaveBeenCalledOnce()
  })

  it("does not remove an existing device subscription owned by another account", async () => {
    const mocks = setup("granted", false, true)

    await expect(enableDevicePush("B".repeat(87))).rejects.toThrow("push.deviceInUse")

    expect(mocks.unsubscribe).not.toHaveBeenCalled()
  })

  it("reports unsupported environments without browser APIs", () => {
    vi.stubGlobal("window", undefined)

    expect(supportsPush()).toBe(false)
  })
})
