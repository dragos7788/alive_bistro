import type { Ctx } from "../../_lib/types"
import { CustomerAuthError, requireAuthOrigin, sessionCustomer } from "../../_lib/customer-auth"
import { isPushEndpoint, pushConfig, pushInput, PUSH_NOTICE_VERSION } from "../../_lib/push"
import { ok } from "../../_lib/response"

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  requireAuthOrigin(request, env)
  const customer = await sessionCustomer(request, env)
  if (!customer) throw new CustomerAuthError("UNAUTHORIZED", 401)
  const consent = await env.DB.prepare(`SELECT action FROM customer_push_consent_events
    WHERE customer_id=? ORDER BY id DESC LIMIT 1`).bind(customer.id).first<{ action: string }>()
  const devices = await env.DB.prepare("SELECT count(*) AS n FROM customer_push_subscriptions WHERE customer_id=?")
    .bind(customer.id).first<{ n: number }>()
  let publicKey: string | null = null
  try { publicKey = pushConfig(env).publicKey } catch (error) {
    if (!(error instanceof CustomerAuthError) || error.code !== "PUSH_NOT_CONFIGURED") throw error
    console.warn("ALIVE Web Push is not configured")
  }
  return ok({ publicKey, consent: consent?.action === "granted", devices: devices?.n ?? 0 })
}

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  requireAuthOrigin(request, env, true)
  const customer = await sessionCustomer(request, env)
  if (!customer) throw new CustomerAuthError("UNAUTHORIZED", 401)
  const input = await pushInput(request)
  const now = Math.floor(Date.now() / 1000)
  if (input.action === "withdraw") {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO customer_push_consent_events(customer_id,action,notice_version,created_at)
        SELECT ?,'withdrawn',?,? WHERE COALESCE((SELECT action FROM customer_push_consent_events
          WHERE customer_id=? ORDER BY id DESC LIMIT 1),'') <> 'withdrawn'`)
        .bind(customer.id, PUSH_NOTICE_VERSION, now, customer.id),
      env.DB.prepare("DELETE FROM customer_push_subscriptions WHERE customer_id=?").bind(customer.id),
    ])
    return ok({ consent: false })
  }
  if (input.action !== "subscribe" || input.consent !== true || input.noticeVersion !== PUSH_NOTICE_VERSION) {
    throw new CustomerAuthError("INVALID_INPUT")
  }
  pushConfig(env)
  const sub = input.subscription
  if (!sub || typeof sub !== "object" || !("endpoint" in sub) || !isPushEndpoint(sub.endpoint)
    || !("keys" in sub) || !sub.keys || typeof sub.keys !== "object"
    || !("p256dh" in sub.keys) || typeof sub.keys.p256dh !== "string" || !/^[\w-]{87}$/.test(sub.keys.p256dh)
    || !("auth" in sub.keys) || typeof sub.keys.auth !== "string" || !/^[\w-]{22}$/.test(sub.keys.auth)) {
    throw new CustomerAuthError("INVALID_INPUT")
  }
  // A shared device must not transfer its existing subscription to a different customer.
  const owner = await env.DB.prepare("SELECT customer_id FROM customer_push_subscriptions WHERE endpoint=?")
    .bind(sub.endpoint).first<{ customer_id: string }>()
  if (owner && owner.customer_id !== customer.id) throw new CustomerAuthError("PUSH_DEVICE_IN_USE", 409)
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO customer_push_subscriptions(id,customer_id,endpoint,p256dh,auth,created_at)
      VALUES (?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE
      SET customer_id=excluded.customer_id,p256dh=excluded.p256dh,auth=excluded.auth`)
      .bind(crypto.randomUUID(), customer.id, sub.endpoint, sub.keys.p256dh, sub.keys.auth, now),
    env.DB.prepare(`INSERT INTO customer_push_consent_events(customer_id,action,notice_version,created_at)
      SELECT ?,'granted',?,? WHERE COALESCE((SELECT action FROM customer_push_consent_events
        WHERE customer_id=? ORDER BY id DESC LIMIT 1),'') <> 'granted'`)
      .bind(customer.id, PUSH_NOTICE_VERSION, now, customer.id),
  ])
  return ok({ consent: true })
}
