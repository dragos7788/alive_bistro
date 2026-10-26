import { beforeAll, describe, expect, it, vi } from "vitest"
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose"
import { onRequest } from "../api/admin/_middleware"
import type { Ctx } from "./types"

const signing = vi.hoisted(() => ({ keySet: vi.fn() }))
vi.mock("jose", async importOriginal => ({
  ...await importOriginal<typeof import("jose")>(),
  createRemoteJWKSet: () => signing.keySet,
}))

const issuer = "https://example.cloudflareaccess.com"
const audience = "admin-application"
let keys: Awaited<ReturnType<typeof generateKeyPair>>

beforeAll(async () => {
  keys = await generateKeyPair("RS256")
  signing.keySet.mockImplementation(createLocalJWKSet({
    keys: [{ ...await exportJWK(keys.publicKey), kid: "test", alg: "RS256" }],
  }))
})

async function token(overrides: Record<string, unknown> = {}) {
  return new SignJWT({ email: "admin@example.com", ...overrides })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setSubject("admin-user")
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime("5m")
    .sign(keys.privateKey)
}

function context(headers: HeadersInit = {}, config = true) {
  const next = vi.fn(async (request?: Request) =>
    Response.json({ email: request?.headers.get("Cf-Access-Authenticated-User-Email") }))
  const ctx: Ctx & { next: typeof next } = {
    request: new Request("https://example.com/api/admin/categories", { headers }),
    env: {
      DB: { prepare: vi.fn(), batch: vi.fn() },
      MEDIA: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
      ...(config ? { ACCESS_TEAM_DOMAIN: issuer, ACCESS_AUD: audience } : {}),
    },
    params: {},
    next,
  }
  return ctx
}

describe("admin Access middleware", () => {
  it("provides verified JWT identity when the email header is absent", async () => {
    const ctx = context({ "Cf-Access-Jwt-Assertion": await token() })

    const response = await onRequest(ctx)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ email: "admin@example.com" })
    expect(response.headers.get("Cache-Control")).toBe("no-store")
  })

  it("replaces an untrusted email header with the signed identity", async () => {
    const ctx = context({
      "Cf-Access-Jwt-Assertion": await token(),
      "Cf-Access-Authenticated-User-Email": "forged@example.com",
    })

    const response = await onRequest(ctx)

    expect(await response.json()).toEqual({ email: "admin@example.com" })
  })

  it("verifies the signed Access cookie when Pages omits identity headers", async () => {
    const ctx = context({ Cookie: `other=value; CF_Authorization=${await token()}; another=value` })

    const response = await onRequest(ctx)

    expect(await response.json()).toEqual({ email: "admin@example.com" })
  })

  it.each(["missing", "malformed", "audience", "issuer", "expired", "email", "signature"])(
    "rejects %s credentials before invoking a handler", async scenario => {
      let assertion: string | undefined
      if (scenario === "malformed") assertion = "invalid"
      else if (scenario !== "missing") {
        assertion = await token(scenario === "email" ? { email: null } : {})
        if (scenario === "signature") {
          const other = await generateKeyPair("RS256")
          assertion = await new SignJWT({ email: "admin@example.com" })
            .setProtectedHeader({ alg: "RS256", kid: "test" })
            .setSubject("admin-user").setIssuer(issuer).setAudience(audience)
            .setExpirationTime("5m").sign(other.privateKey)
        } else if (["audience", "issuer", "expired"].includes(scenario)) {
          assertion = await new SignJWT({ email: "admin@example.com" })
            .setProtectedHeader({ alg: "RS256", kid: "test" })
            .setSubject("admin-user")
            .setIssuer(scenario === "issuer" ? "https://other.cloudflareaccess.com" : issuer)
            .setAudience(scenario === "audience" ? "another-application" : audience)
            .setExpirationTime(scenario === "expired" ? 1 : "5m").sign(keys.privateKey)
        }
      }
      const ctx = context({
        "Cf-Access-Authenticated-User-Email": "forged@example.com",
        ...(assertion ? { "Cf-Access-Jwt-Assertion": assertion } : {}),
      })

      const response = await onRequest(ctx)

      expect(response.status).toBe(401)
      expect(ctx.next).not.toHaveBeenCalled()
    },
  )

  it("fails explicitly when Access configuration is missing", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const ctx = context({}, false)

    const response = await onRequest(ctx)

    expect(response.status).toBe(503)
    expect(ctx.next).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })

  it("preserves explicit loopback TEST mode without allowing production bypass", async () => {
    const ctx = context()
    ctx.env.LOCAL_TEST_ORDERS = "true"
    ctx.request = new Request("http://127.0.0.1:8788/api/admin/categories")

    expect((await onRequest(ctx)).status).toBe(200)

    ctx.next.mockClear()
    ctx.request = new Request("https://example.com/api/admin/categories")
    expect((await onRequest(ctx)).status).toBe(401)
    expect(ctx.next).not.toHaveBeenCalled()
  })
})
