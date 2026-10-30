import type { Ctx } from "../../_lib/types"
import { CustomerAuthError, requireAuthOrigin, sessionCustomer } from "../../_lib/customer-auth"
import { pushConfig, pushInput } from "../../_lib/push"
import { ok } from "../../_lib/response"

/** Claims each available channel once without granting or withdrawing consent. */
export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  requireAuthOrigin(request, env, true)
  const customer = await sessionCustomer(request, env)
  if (!customer) throw new CustomerAuthError("UNAUTHORIZED", 401)
  const input = await pushInput(request)
  if (input.action !== "claim") throw new CustomerAuthError("INVALID_INPUT")

  const emailChoice = await env.DB.prepare(`SELECT id FROM customer_marketing_consent_events
    WHERE customer_id=? AND channel='email' LIMIT 1`).bind(customer.id).first()
  const pushChoice = await env.DB.prepare(`SELECT id FROM customer_push_consent_events
    WHERE customer_id=? LIMIT 1`).bind(customer.id).first()
  // An existing withdrawal is a choice, not an opportunity to ask again.
  const previous = await env.DB.prepare(`SELECT email_shown_at,push_shown_at
    FROM customer_marketing_invitations WHERE customer_id=?`).bind(customer.id)
    .first<{ email_shown_at: number | null; push_shown_at: number | null }>()
  const email = !!customer.email && !emailChoice && previous?.email_shown_at == null
  let push = !pushChoice && previous?.push_shown_at == null
  if (push) {
    try { pushConfig(env) } catch (error) {
      if (!(error instanceof CustomerAuthError) || error.code !== "PUSH_NOT_CONFIGURED") throw error
      console.warn("ALIVE marketing invitation: Web Push is not configured")
      push = false
    }
  }
  if (!email && !push) return ok({ show: false, email, push })

  const now = Math.floor(Date.now() / 1000)
  const claimed = await env.DB.prepare(`INSERT INTO customer_marketing_invitations
    (customer_id,shown_at,email_shown_at,push_shown_at) VALUES (?,?,?,?)
    ON CONFLICT(customer_id) DO UPDATE SET
      email_shown_at=COALESCE(customer_marketing_invitations.email_shown_at,excluded.email_shown_at),
      push_shown_at=COALESCE(customer_marketing_invitations.push_shown_at,excluded.push_shown_at)
    WHERE (?=1 AND customer_marketing_invitations.email_shown_at IS NULL)
      OR (?=1 AND customer_marketing_invitations.push_shown_at IS NULL)
    RETURNING customer_id`)
    .bind(customer.id, now, email ? now : null, push ? now : null, Number(email), Number(push)).first()
  return ok({ show: !!claimed, email, push })
}
