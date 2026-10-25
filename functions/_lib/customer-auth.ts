import { createRemoteJWKSet, jwtVerify } from "jose"
import type { Env } from "./types"

export type Provider = "google" | "facebook"
export type Customer = { id: string; name: string; email: string | null; referral_code: string }
export class CustomerAuthError extends Error {
  constructor(public code: string, public status = 400) { super(code) }
}

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"))
const loopback = new Set(["localhost", "127.0.0.1", "[::1]"])

/** Returns a validated deployment origin; never derives redirects from untrusted headers. */
export function authOrigin(env: Env): string | null {
  if (!env.AUTH_ORIGIN) return null
  try {
    const url = new URL(env.AUTH_ORIGIN)
    return url.origin === env.AUTH_ORIGIN && !url.username && !url.password
      && (url.protocol === "https:" || (url.protocol === "http:" && loopback.has(url.hostname)))
      ? url.origin : null
  } catch { return null }
}

/** Lists only providers with complete server configuration. */
export function enabledProviders(env: Env): Provider[] {
  if (!authOrigin(env)) return []
  const providers: Provider[] = []
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.push("google")
  if (env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET && /^v\d+\.\d+$/.test(env.FACEBOOK_API_VERSION ?? "")) providers.push("facebook")
  return providers
}

/** Hashes opaque session and OAuth tokens before database storage. */
export async function tokenHash(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("")
}

/** Generates an unguessable URL-safe token using the runtime CSPRNG. */
export function randomToken(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function cookieName(request: Request, kind: "session" | "oauth"): string {
  return `${new URL(request.url).protocol === "https:" ? "__Host-" : ""}alive_${kind}`
}

/** Reads a single host-scoped authentication cookie. */
export function authCookie(request: Request, kind: "session" | "oauth"): string | null {
  const name = cookieName(request, kind)
  return request.headers.get("Cookie")?.split(";").map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? null
}

/** Creates HttpOnly session/state cookies; non-Secure cookies are restricted to local development. */
export function setAuthCookie(request: Request, kind: "session" | "oauth", value: string, maxAge: number): string {
  return `${cookieName(request, kind)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`
}

/** Rejects requests outside the configured origin, including cross-site writes. */
export function requireAuthOrigin(request: Request, env: Env, write = false): void {
  const origin = authOrigin(env)
  if (!origin || new URL(request.url).origin !== origin) throw new CustomerAuthError("AUTH_NOT_CONFIGURED", 503)
  if (write && request.headers.get("Origin") !== origin) throw new CustomerAuthError("INVALID_ORIGIN", 403)
}

/** Resolves a valid customer session; identity is never accepted from browser payloads. */
export async function sessionCustomer(request: Request, env: Env): Promise<Customer | null> {
  const token = authCookie(request, "session")
  if (!token || !/^[\w-]{43}$/.test(token)) return null
  return env.DB.prepare(`SELECT c.id,c.name,c.email,c.referral_code FROM customers c
    JOIN customer_sessions s ON s.customer_id=c.id WHERE s.token_hash=? AND s.expires_at>?`)
    .bind(await tokenHash(token), Math.floor(Date.now() / 1000)).first<Customer>()
}

export type OAuthTransaction = {
  provider: Provider; verifier: string; nonce: string; referral_code: string | null
  link_customer_id: string | null
}

/** Exchanges a one-time code and verifies the provider's user identity on the server. */
export async function providerIdentity(code: string, transaction: OAuthTransaction, env: Env) {
  const redirect = `${authOrigin(env)}/api/customer/callback`
  if (transaction.provider === "google") {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({
        code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirect, grant_type: "authorization_code", code_verifier: transaction.verifier,
      }),
    })
    const data: unknown = await response.json()
    if (!response.ok || !data || typeof data !== "object" || !("id_token" in data) || typeof data.id_token !== "string") {
      throw new CustomerAuthError("PROVIDER_REJECTED", 401)
    }
    const { payload } = await jwtVerify(data.id_token, googleKeys, {
      issuer: ["https://accounts.google.com", "accounts.google.com"], audience: env.GOOGLE_CLIENT_ID,
      algorithms: ["RS256"], requiredClaims: ["sub", "exp", "iat", "nonce"],
    })
    if (payload.nonce !== transaction.nonce || !payload.sub) throw new CustomerAuthError("PROVIDER_REJECTED", 401)
    return {
      subject: payload.sub,
      name: typeof payload.name === "string" ? payload.name.slice(0, 100) : "ALIVE",
      email: payload.email_verified === true && typeof payload.email === "string" ? payload.email : null,
    }
  }
  const base = `https://graph.facebook.com/${env.FACEBOOK_API_VERSION}`
  const response = await fetch(`${base}/oauth/access_token`, {
    method: "POST", signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID!, client_secret: env.FACEBOOK_APP_SECRET!, redirect_uri: redirect, code,
    }),
  })
  const token: unknown = await response.json()
  if (!response.ok || !token || typeof token !== "object" || !("access_token" in token) || typeof token.access_token !== "string") {
    throw new CustomerAuthError("PROVIDER_REJECTED", 401)
  }
  const debugUrl = new URL(`${base}/debug_token`)
  debugUrl.searchParams.set("input_token", token.access_token)
  const debugResponse = await fetch(debugUrl, {
    headers: { Authorization: `Bearer ${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}` },
    signal: AbortSignal.timeout(10000),
  })
  const debug: unknown = await debugResponse.json()
  if (!debugResponse.ok || !debug || typeof debug !== "object" || !("data" in debug)
    || !debug.data || typeof debug.data !== "object") throw new CustomerAuthError("PROVIDER_REJECTED", 401)
  const info = debug.data
  if (!("is_valid" in info) || info.is_valid !== true || !("app_id" in info)
    || (typeof info.app_id !== "string" && typeof info.app_id !== "number") || String(info.app_id) !== env.FACEBOOK_APP_ID
    || !("user_id" in info) || typeof info.user_id !== "string"
    || !("expires_at" in info) || typeof info.expires_at !== "number" || info.expires_at <= Date.now() / 1000) {
    throw new CustomerAuthError("PROVIDER_REJECTED", 401)
  }
  const secret = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.FACEBOOK_APP_SECRET!),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", secret, new TextEncoder().encode(token.access_token))
  const profileUrl = new URL(`${base}/me`)
  profileUrl.searchParams.set("fields", "id,name,email")
  profileUrl.searchParams.set("appsecret_proof", Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, "0")).join(""))
  const profileResponse = await fetch(profileUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(10000),
  })
  const profile: unknown = await profileResponse.json()
  if (!profileResponse.ok || !profile || typeof profile !== "object" || !("id" in profile)
    || profile.id !== info.user_id) throw new CustomerAuthError("PROVIDER_REJECTED", 401)
  return {
    subject: info.user_id,
    name: "name" in profile && typeof profile.name === "string" ? profile.name.slice(0, 100) : "ALIVE",
    email: "email" in profile && typeof profile.email === "string" ? profile.email : null,
  }
}
