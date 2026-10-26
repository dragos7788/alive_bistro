import { generateKeyPairSync } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vitest"
import { isPushEndpoint, isPushPath, pushConfig, sendPush } from "./push"

function keyPair() {
  const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
  const jwk = pair.privateKey.export({ format: "jwk" })
  if (!jwk.x || !jwk.y || !jwk.d) throw new Error("Missing test EC key")
  return {
    publicKey: Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]).toString("base64url"),
    privateKey: jwk.d,
  }
}

afterEach(() => vi.unstubAllGlobals())

describe("Web Push boundaries and encryption", () => {
  it.each([
    ["https://fcm.googleapis.com/wp/abc", true],
    ["https://updates.push.services.mozilla.com/wpush/v2/abc", true],
    ["https://web.push.apple.com/abc", true],
    ["https://wns2-by3p.notify.windows.com/abc", true],
    ["https://fcm.googleapis.com.attacker.example/abc", false],
    ["http://fcm.googleapis.com/wp/abc", false],
    ["https://127.0.0.1/private", false],
    ["https://user:pass@fcm.googleapis.com/wp/abc", false],
    ["https://fcm.googleapis.com:444/abc", false],
  ])("validates browser push endpoint %s", (endpoint, allowed) => {
    expect(isPushEndpoint(endpoint)).toBe(allowed)
  })
  it.each([
    ["/menu", true], ["/account", true], ["/", true], ["/menu#offers", true],
    ["//attacker.example", false], ["/\\attacker.example", false], ["/api/customer/me", false],
    ["https://attacker.example", false],
  ])("validates local notification destination %s", (path, allowed) => {
    expect(isPushPath(path)).toBe(allowed)
  })
  it("encrypts payload and signs VAPID using Web Crypto without sending plaintext", async () => {
    const vapid = keyPair()
    const browser = keyPair()
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }))
    vi.stubGlobal("fetch", fetchMock)
    const env = {
      VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, VAPID_SUBJECT: "mailto:contact@example.com",
    }

    const status = await sendPush(env, {
      id: "device", customer_id: "customer", endpoint: "https://fcm.googleapis.com/wp/test",
      p256dh: browser.publicKey, auth: Buffer.alloc(16, 1).toString("base64url"),
    }, { title: "ALIVE", body: "Offer only inside encrypted payload", path: "/menu", campaignId: "test" })

    expect(status).toBe(201)
    const [, init] = fetchMock.mock.calls[0]
    const headers = new Headers(init.headers)
    expect(headers.get("content-encoding")).toBe("aes128gcm")
    expect(headers.get("authorization")).toMatch(/^vapid /)
    expect(init.redirect).toBe("error")
    expect(Buffer.from(init.body).includes(Buffer.from("Offer only inside encrypted payload"))).toBe(false)
  })
  it("fails explicitly if VAPID is missing", () => {
    expect(() => pushConfig({})).toThrow("PUSH_NOT_CONFIGURED")
  })
})
