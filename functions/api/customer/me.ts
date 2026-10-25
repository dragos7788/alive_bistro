import type { Ctx } from "../../_lib/types"
import { ok } from "../../_lib/response"
import { authOrigin, enabledProviders, requireAuthOrigin, sessionCustomer } from "../../_lib/customer-auth"

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const providers = enabledProviders(env)
  if (!authOrigin(env)) return ok({ providers, customer: null, paymentsEnabled: false })
  requireAuthOrigin(request, env)
  const customer = await sessionCustomer(request, env)
  if (!customer) return ok({ providers, customer: null, paymentsEnabled: false })
  const balance = await env.DB.prepare("SELECT COALESCE(SUM(points_delta),0) AS points FROM loyalty_ledger WHERE customer_id=?")
    .bind(customer.id).first<{ points: number }>()
  const { results: identities } = await env.DB.prepare("SELECT provider FROM customer_identities WHERE customer_id=?")
    .bind(customer.id).all<{ provider: string }>()
  const { results: history } = await env.DB.prepare(`SELECT id,kind,points_delta,created_at FROM loyalty_ledger
    WHERE customer_id=? ORDER BY id DESC LIMIT 30`).bind(customer.id).all()
  return ok({
    providers, paymentsEnabled: false,
    customer: {
      name: customer.name, email: customer.email, referralCode: customer.referral_code,
      referralUrl: `${authOrigin(env)}/?ref=${customer.referral_code}#account`,
      points: balance?.points ?? 0, linkedProviders: identities.map(identity => identity.provider), history,
    },
  })
}
