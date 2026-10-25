import type { Ctx } from "../../_lib/types"
import { authCookie, authOrigin, CustomerAuthError, enabledProviders, providerIdentity, randomToken,
  requireAuthOrigin, sessionCustomer, setAuthCookie, tokenHash, type OAuthTransaction } from "../../_lib/customer-auth"

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  requireAuthOrigin(request, env)
  const headers = new Headers({ Location: `${authOrigin(env)}/?auth=error#account` })
  headers.append("Set-Cookie", setAuthCookie(request, "oauth", "", 0))
  try {
    const params = new URL(request.url).searchParams
    const state = params.get("state")
    const browser = authCookie(request, "oauth")
    if (!state || !/^[\w-]{43}$/.test(state) || !browser || !/^[\w-]{43}$/.test(browser)) {
      throw new CustomerAuthError("INVALID_STATE")
    }
    const transaction = await env.DB.prepare(`DELETE FROM customer_oauth
      WHERE state_hash=? AND browser_hash=? AND expires_at>? RETURNING *`)
      .bind(await tokenHash(state), await tokenHash(browser), Math.floor(Date.now() / 1000)).first<OAuthTransaction>()
    if (!transaction || !enabledProviders(env).includes(transaction.provider)) throw new CustomerAuthError("INVALID_STATE")
    const code = params.get("code")
    if (params.has("error") || !code || code.length > 4096) throw new CustomerAuthError("PROVIDER_REJECTED")
    const identity = await providerIdentity(code, transaction, env)
    const existing = await env.DB.prepare("SELECT customer_id FROM customer_identities WHERE provider=? AND subject=?")
      .bind(transaction.provider, identity.subject).first<{ customer_id: string }>()
    let customerId: string
    if (transaction.link_customer_id) {
      const current = await sessionCustomer(request, env)
      if (!current || current.id !== transaction.link_customer_id) throw new CustomerAuthError("UNAUTHORIZED", 401)
      if (existing && existing.customer_id !== current.id) throw new CustomerAuthError("IDENTITY_ALREADY_USED", 409)
      const alreadyLinked = await env.DB.prepare("SELECT subject FROM customer_identities WHERE provider=? AND customer_id=?")
        .bind(transaction.provider, current.id).first<{ subject: string }>()
      if (alreadyLinked && alreadyLinked.subject !== identity.subject) throw new CustomerAuthError("IDENTITY_ALREADY_USED", 409)
      if (!existing) await env.DB.prepare("INSERT INTO customer_identities(provider,subject,customer_id) VALUES (?,?,?)")
        .bind(transaction.provider, identity.subject, current.id).run()
      customerId = current.id
    } else if (existing) {
      customerId = existing.customer_id
    } else {
      const id = crypto.randomUUID()
      const referrer = transaction.referral_code ? await env.DB.prepare("SELECT id FROM customers WHERE referral_code=?")
        .bind(transaction.referral_code).first<{ id: string }>() : null
      if (transaction.referral_code && !referrer) throw new CustomerAuthError("INVALID_REFERRAL")
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO customers(id,name,email,referral_code,referred_by,created_at)
          SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM customer_identities WHERE provider=? AND subject=?)`)
          .bind(id, identity.name, identity.email, crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase(),
            referrer?.id ?? null, Math.floor(Date.now() / 1000), transaction.provider, identity.subject),
        env.DB.prepare(`INSERT INTO customer_identities(provider,subject,customer_id)
          SELECT ?,?,id FROM customers WHERE id=?`).bind(transaction.provider, identity.subject, id),
      ])
      const created = await env.DB.prepare("SELECT customer_id FROM customer_identities WHERE provider=? AND subject=?")
        .bind(transaction.provider, identity.subject).first<{ customer_id: string }>()
      if (!created) throw new CustomerAuthError("ACCOUNT_ERROR", 503)
      customerId = created.customer_id
    }
    const token = randomToken()
    const old = authCookie(request, "session")
    const now = Math.floor(Date.now() / 1000)
    await env.DB.batch([
      env.DB.prepare("DELETE FROM customer_sessions WHERE expires_at<=? OR token_hash=?").bind(now, old ? await tokenHash(old) : ""),
      env.DB.prepare("INSERT INTO customer_sessions(token_hash,customer_id,expires_at) VALUES (?,?,?)")
        .bind(await tokenHash(token), customerId, now + 60 * 60 * 24 * 7),
    ])
    headers.append("Set-Cookie", setAuthCookie(request, "session", token, 60 * 60 * 24 * 7))
    headers.set("Location", `${authOrigin(env)}/account`)
  } catch (error) {
    // Never log authorization codes, tokens, profile data, or provider response bodies.
    console.error("Customer OAuth callback failed", error instanceof CustomerAuthError ? error.code : "PROVIDER_OR_DATABASE_ERROR")
  }
  return new Response(null, { status: 303, headers })
}
