import { buildPushPayload } from "@block65/webcrypto-web-push"
import type { Env } from "./types"
import { CustomerAuthError } from "./customer-auth"

export const PUSH_NOTICE_VERSION = "push-marketing-v1"
type PushEnv = Pick<Env, "VAPID_PUBLIC_KEY" | "VAPID_PRIVATE_KEY" | "VAPID_SUBJECT">
export type PushSubscriptionRecord = {
  id: string; customer_id: string; endpoint: string; p256dh: string; auth: string
}

/** Restricts outbound requests to browser push providers, never arbitrary customer URLs. */
export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password && !url.hash && !url.port
      && (url.hostname === "fcm.googleapis.com" || url.hostname === "updates.push.services.mozilla.com"
        || url.hostname.endsWith(".notify.windows.com")
        || url.hostname === "web.push.apple.com" || url.hostname.endsWith(".push.apple.com"))
  } catch { return false }
}

/** Accepts only internal destinations and prevents redirects to another origin. */
export function isPushPath(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 300 || /[\\\s]/.test(value)) return false
  const url = new URL(value, "https://alive.example")
  return url.origin === "https://alive.example" && ["/", "/menu", "/account"].includes(url.pathname)
}

/** Returns validated server-only VAPID configuration or an explicit setup error. */
export function pushConfig(env: PushEnv) {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = env
  if (!publicKey || !/^[\w-]{87}$/.test(publicKey) || !privateKey || !/^[\w-]{43}$/.test(privateKey)
    || !subject || !/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/.test(subject)) {
    throw new CustomerAuthError("PUSH_NOT_CONFIGURED", 503)
  }
  return { publicKey, privateKey, subject }
}

/** Reads a bounded JSON payload without accepting customer IDs from the browser. */
export async function pushInput(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text()
  if (new TextEncoder().encode(text).length > 8192) throw new CustomerAuthError("INVALID_INPUT", 413)
  let input: unknown
  try { input = JSON.parse(text) } catch { throw new CustomerAuthError("INVALID_INPUT") }
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CustomerAuthError("INVALID_INPUT")
  return Object.fromEntries(Object.entries(input))
}

/** Encrypts and submits one notification; redirects cannot bypass the provider allowlist. */
export async function sendPush(env: PushEnv, subscription: PushSubscriptionRecord, message: {
  title: string; body: string; path: string; campaignId: string
}): Promise<number> {
  if (!isPushEndpoint(subscription.endpoint)) throw new CustomerAuthError("INVALID_PUSH_ENDPOINT")
  const payload = await buildPushPayload({
    data: JSON.stringify(message), options: { ttl: 3600 },
  }, {
    endpoint: subscription.endpoint, expirationTime: null,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  }, pushConfig(env))
  const response = await fetch(subscription.endpoint, {
    ...payload, redirect: "error", signal: AbortSignal.timeout(10000),
  })
  await response.body?.cancel()
  return response.status
}
