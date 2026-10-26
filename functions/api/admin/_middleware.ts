import { createRemoteJWKSet, errors, jwtVerify } from "jose"
import { err } from "../../_lib/response"
import { testOrdersEnabled } from "../../_lib/test-orders"
import type { Ctx } from "../../_lib/types"

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

/** Validates Access application credentials before any administrator handler runs. */
export async function onRequest(ctx: Ctx & { next: (request?: Request) => Promise<Response> }): Promise<Response> {
  let response: Response
  if (testOrdersEnabled(ctx.request, ctx.env)) {
    response = await ctx.next()
  } else {
    const issuer = ctx.env.ACCESS_TEAM_DOMAIN
    const audience = ctx.env.ACCESS_AUD
    if (!issuer || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) || !audience) {
      console.error("Administrator Access configuration is missing or invalid")
      return secured(err("ADMIN_AUTH_CONFIG", "Autentificarea administratorului nu este configurata.", 503))
    }
    // Pages can omit Access identity headers; the signed cookie carries the same application token.
    const cookieToken = ctx.request.headers.get("Cookie")?.split(";")
      .map(value => value.trim()).find(value => value.startsWith("CF_Authorization="))
      ?.slice("CF_Authorization=".length)
    const token = ctx.request.headers.get("Cf-Access-Jwt-Assertion") || cookieToken
    if (!token) return secured(err("UNAUTHORIZED", "Cloudflare Access authentication required", 401))

    let email: string
    try {
      let keySet = keySets.get(issuer)
      if (!keySet) {
        keySet = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`))
        keySets.set(issuer, keySet)
      }
      const { payload } = await jwtVerify(token, keySet, {
        issuer, audience, algorithms: ["RS256"], requiredClaims: ["exp", "sub", "email"],
      })
      if (typeof payload.email !== "string" || !payload.email.trim()) {
        return secured(err("UNAUTHORIZED", "Cloudflare Access user identity required", 401))
      }
      email = payload.email
    } catch (error) {
      if (error instanceof errors.JOSEError && !(error instanceof errors.JWKSTimeout)) {
        return secured(err("UNAUTHORIZED", "Cloudflare Access authentication invalid or expired", 401))
      }
      console.error("Administrator Access verification unavailable", error instanceof Error ? error.name : "UnknownError")
      return secured(err("ADMIN_AUTH_UNAVAILABLE", "Verificarea autentificarii este indisponibila momentan.", 503))
    }
    const headers = new Headers(ctx.request.headers)
    headers.set("Cf-Access-Authenticated-User-Email", email)
    response = await ctx.next(new Request(ctx.request, { headers }))
  }
  return secured(response)
}

function secured(response: Response): Response {
  const result = new Response(response.body, response)
  result.headers.set("Cache-Control", "no-store")
  return result
}
