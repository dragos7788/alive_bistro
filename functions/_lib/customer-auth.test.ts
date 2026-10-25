import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { exportJWK, generateKeyPair, SignJWT } from "jose"
import { authOrigin, enabledProviders, providerIdentity, setAuthCookie, tokenHash, type OAuthTransaction } from "./customer-auth"
import type { Env } from "./types"

describe("Provider identity verification", () => {
  let keys: Awaited<ReturnType<typeof generateKeyPair>>
  let jwk: Awaited<ReturnType<typeof exportJWK>>
  beforeAll(async () => {
    keys = await generateKeyPair("RS256")
    jwk = { ...await exportJWK(keys.publicKey), kid: "test-key", alg: "RS256", use: "sig" }
  })
  afterEach(() => vi.unstubAllGlobals())
  const env = {
    AUTH_ORIGIN: "https://alive.example", GOOGLE_CLIENT_ID: "google-client", GOOGLE_CLIENT_SECRET: "google-secret",
    FACEBOOK_APP_ID: "fb-client", FACEBOOK_APP_SECRET: "fb-secret", FACEBOOK_API_VERSION: "v25.0",
  } as Env
  const transaction: OAuthTransaction = {
    provider: "google", verifier: "verifier", nonce: "nonce", referral_code: null, link_customer_id: null,
  }

  async function googleToken(nonce: string, audience = env.GOOGLE_CLIENT_ID!, verified = true) {
    return new SignJWT({ nonce, name: "Test", email: "test@example.com", email_verified: verified })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" }).setSubject("google-sub")
      .setIssuer("https://accounts.google.com").setAudience(audience).setIssuedAt().setExpirationTime("5m")
      .sign(keys.privateKey)
  }
  function googleFetch(token: string) {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
      return Response.json(String(input).includes("/certs") ? { keys: [jwk] } : { id_token: token })
    }))
  }
  it("verifies Google's signature, audience and nonce and accepts only verified email", async () => {
    googleFetch(await googleToken("nonce"))
    expect(await providerIdentity("code", transaction, env)).toEqual({ subject: "google-sub", name: "Test", email: "test@example.com" })
    googleFetch(await googleToken("nonce", env.GOOGLE_CLIENT_ID, false))
    expect((await providerIdentity("code", transaction, env)).email).toBeNull()
  })
  it("rejects incorrect nonce and audience", async () => {
    googleFetch(await googleToken("attacker"))
    await expect(providerIdentity("code", transaction, env)).rejects.toThrow("PROVIDER_REJECTED")
    googleFetch(await googleToken("nonce", "other-client"))
    await expect(providerIdentity("code", transaction, env)).rejects.toThrow()
  })
  it("validates Facebook's app ownership and subject before accepting a profile", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ access_token: "access" }))
      .mockResolvedValueOnce(Response.json({ data: { is_valid: true, app_id: "fb-client", user_id: "fb-user", expires_at: Date.now() / 1000 + 3600 } }))
      .mockResolvedValueOnce(Response.json({ id: "fb-user", name: "Facebook Test" }))
    vi.stubGlobal("fetch", fetchMock)
    expect(await providerIdentity("code", { ...transaction, provider: "facebook" }, env))
      .toEqual({ subject: "fb-user", name: "Facebook Test", email: null })
    expect(String(fetchMock.mock.calls[2][0])).toContain("appsecret_proof=")
  })
  it.each(["other-app", "fb-client"])("rejects wrong-app or mismatched Facebook profile (%s)", async appId => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ access_token: "access" }))
      .mockResolvedValueOnce(Response.json({ data: { is_valid: true, app_id: appId, user_id: "fb-user", expires_at: Date.now() / 1000 + 3600 } }))
      .mockResolvedValueOnce(Response.json({ id: "attacker", name: "Wrong" }))
    vi.stubGlobal("fetch", fetchMock)
    await expect(providerIdentity("code", { ...transaction, provider: "facebook" }, env)).rejects.toThrow("PROVIDER_REJECTED")
  })
  it("requires complete configuration, fixed origins and secure host cookies", async () => {
    expect(enabledProviders(env)).toEqual(["google", "facebook"])
    expect(enabledProviders({ ...env, AUTH_ORIGIN: undefined })).toEqual([])
    expect(authOrigin({ ...env, AUTH_ORIGIN: "http://alive.example" })).toBeNull()
    expect(authOrigin({ ...env, AUTH_ORIGIN: "https://alive.example/path" })).toBeNull()
    expect(setAuthCookie(new Request(env.AUTH_ORIGIN!), "session", "token", 100))
      .toBe("__Host-alive_session=token; Path=/; HttpOnly; SameSite=Lax; Max-Age=100; Secure")
    expect(await tokenHash("secret")).not.toContain("secret")
  })
})
