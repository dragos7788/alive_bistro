import type { Ctx } from "../../_lib/types"
import { ok } from "../../_lib/response"
import { authOrigin, enabledProviders, requireAuthOrigin, sessionCustomer } from "../../_lib/customer-auth"

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const providers = enabledProviders(env)
  if (!authOrigin(env)) return ok({ providers, customer: null, paymentsEnabled: false })
  requireAuthOrigin(request, env)
  const customer = await sessionCustomer(request, env)
  if (!customer) return ok({ providers, customer: null, paymentsEnabled: false })
  const balance = await env.DB.prepare(`SELECT
    COALESCE((SELECT SUM(points_delta) FROM loyalty_ledger WHERE customer_id=?),0)
    - COALESCE((SELECT SUM(points_spent) FROM customer_point_redemptions WHERE customer_id=?),0) AS points`)
    .bind(customer.id, customer.id).first<{ points: number }>()
  const { results: identities } = await env.DB.prepare("SELECT provider FROM customer_identities WHERE customer_id=?")
    .bind(customer.id).all<{ provider: string }>()
  const { results: history } = await env.DB.prepare(`SELECT id,kind,points_delta,created_at FROM (
    SELECT id,kind,points_delta,created_at FROM loyalty_ledger WHERE customer_id=?
    UNION ALL
    SELECT -id AS id,'pointsVoucher' AS kind,-points_spent AS points_delta,created_at
    FROM customer_point_redemptions WHERE customer_id=?
  ) ORDER BY created_at DESC,id DESC LIMIT 30`).bind(customer.id, customer.id).all()
  const { results: vouchers } = await env.DB.prepare(`SELECT id,code,source,
    discount_percent AS discountPercent,created_at AS createdAt,expires_at AS expiresAt,
    CASE WHEN expires_at > ? THEN 'active' ELSE 'expired' END AS status
    FROM customer_vouchers WHERE customer_id=? ORDER BY created_at DESC,id DESC`)
    .bind(Math.floor(Date.now() / 1000), customer.id).all()
  const marketingConsent = await env.DB.prepare(`SELECT action,created_at AS updatedAt
    FROM customer_marketing_consent_events WHERE customer_id=? AND channel='email'
    ORDER BY id DESC LIMIT 1`).bind(customer.id).first<{ action: string; updatedAt: number }>()
  return ok({
    providers, paymentsEnabled: false,
    customer: {
      name: customer.name, email: customer.email, referralCode: customer.referral_code,
      referralUrl: `${authOrigin(env)}/?ref=${customer.referral_code}#account`,
      points: balance?.points ?? 0, linkedProviders: identities.map(identity => identity.provider), history, vouchers,
      emailMarketingConsent: marketingConsent?.action === "granted",
      emailMarketingConsentUpdatedAt: marketingConsent?.updatedAt ?? null,
    },
  })
}
