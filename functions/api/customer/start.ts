import type { Ctx } from "../../_lib/types"
import { ok } from "../../_lib/response"
import { authOrigin, CustomerAuthError, enabledProviders, randomToken, requireAuthOrigin, sessionCustomer, setAuthCookie, tokenHash } from "../../_lib/customer-auth"

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  requireAuthOrigin(request, env, true)
  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > 2048) throw new CustomerAuthError("INVALID_INPUT", 413)
  let input: unknown
  try { input = JSON.parse(raw) } catch { throw new CustomerAuthError("INVALID_INPUT") }
  if (!input || typeof input !== "object" || !("provider" in input)
    || (input.provider !== "google" && input.provider !== "facebook")) throw new CustomerAuthError("INVALID_PROVIDER")
  const provider = input.provider
  if (!enabledProviders(env).includes(provider)) throw new CustomerAuthError("PROVIDER_NOT_CONFIGURED", 503)
  const linking = "link" in input && input.link === true
  const customer = await sessionCustomer(request, env)
  if (linking && !customer) throw new CustomerAuthError("UNAUTHORIZED", 401)
  const referral = "referral" in input && typeof input.referral === "string" ? input.referral.trim().toUpperCase() : ""
  if (referral && !/^[A-F0-9]{16}$/.test(referral)) throw new CustomerAuthError("INVALID_REFERRAL")
  if (referral && !await env.DB.prepare("SELECT id FROM customers WHERE referral_code=?").bind(referral).first()) {
    throw new CustomerAuthError("INVALID_REFERRAL")
  }
  const state = randomToken()
  const browser = randomToken()
  const verifier = randomToken()
  const nonce = randomToken()
  const now = Math.floor(Date.now() / 1000)
  await env.DB.batch([
    env.DB.prepare("DELETE FROM customer_oauth WHERE expires_at<=?").bind(now),
    env.DB.prepare(`INSERT INTO customer_oauth
      (state_hash,browser_hash,provider,verifier,nonce,referral_code,link_customer_id,expires_at)
      VALUES (?,?,?,?,?,?,?,?)`).bind(await tokenHash(state), await tokenHash(browser), provider,
      verifier, nonce, referral || null, linking ? customer!.id : null, now + 600),
  ])
  const url = new URL(provider === "google" ? "https://accounts.google.com/o/oauth2/v2/auth"
    : `https://www.facebook.com/${env.FACEBOOK_API_VERSION}/dialog/oauth`)
  url.searchParams.set("client_id", provider === "google" ? env.GOOGLE_CLIENT_ID! : env.FACEBOOK_APP_ID!)
  url.searchParams.set("redirect_uri", `${authOrigin(env)}/api/customer/callback`)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", provider === "google" ? "openid email profile" : "public_profile,email")
  url.searchParams.set("state", state)
  if (provider === "google") {
    const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)))
    url.searchParams.set("code_challenge", btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""))
    url.searchParams.set("code_challenge_method", "S256")
    url.searchParams.set("nonce", nonce)
  }
  const response = ok({ url: url.href })
  response.headers.set("Set-Cookie", setAuthCookie(request, "oauth", browser, 600))
  return response
}
