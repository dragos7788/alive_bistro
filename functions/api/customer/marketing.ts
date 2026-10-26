import type { Ctx } from "../../_lib/types"
import { CustomerAuthError, requireAuthOrigin, sessionCustomer } from "../../_lib/customer-auth"
import { ok } from "../../_lib/response"

const NOTICE_VERSION = "email-marketing-v1"

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  requireAuthOrigin(request, env, true)
  const customer = await sessionCustomer(request, env)
  if (!customer) throw new CustomerAuthError("UNAUTHORIZED", 401)

  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > 2048) throw new CustomerAuthError("INVALID_INPUT", 413)
  let input: unknown
  try { input = JSON.parse(raw) } catch { throw new CustomerAuthError("INVALID_INPUT") }
  if (!input || typeof input !== "object" || !("emailMarketingConsent" in input)
    || typeof input.emailMarketingConsent !== "boolean") throw new CustomerAuthError("INVALID_INPUT")
  if (input.emailMarketingConsent && !customer.email) throw new CustomerAuthError("EMAIL_REQUIRED", 422)

  const action = input.emailMarketingConsent ? "granted" : "withdrawn"
  const now = Math.floor(Date.now() / 1000)
  await env.DB.prepare(`INSERT INTO customer_marketing_consent_events
    (customer_id,channel,action,source,notice_version,created_at)
    SELECT ?,'email',?,'account',?,?
    WHERE COALESCE((SELECT action FROM customer_marketing_consent_events
      WHERE customer_id=? AND channel='email' ORDER BY id DESC LIMIT 1),'withdrawn') <> ?`)
    .bind(customer.id, action, NOTICE_VERSION, now, customer.id, action).run()

  const current = await env.DB.prepare(`SELECT action,created_at AS updatedAt
    FROM customer_marketing_consent_events WHERE customer_id=? AND channel='email'
    ORDER BY id DESC LIMIT 1`).bind(customer.id).first<{ action: string; updatedAt: number }>()
  return ok({
    emailMarketingConsent: current?.action === "granted",
    emailMarketingConsentUpdatedAt: current?.updatedAt ?? null,
  })
}
