import type { Ctx } from "../../_lib/types"
import { requireCustomer } from "../../_lib/customer-session"
import { randomToken } from "../../_lib/customer-auth"
import { err, ok } from "../../_lib/response"

const POINTS_PER_VOUCHER = 1000
const VOUCHER_VALIDITY_SECONDS = 30 * 24 * 60 * 60

/** Exchanges 1,000 earned points for a one-time 10% voucher. */
export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  const customer = await requireCustomer(request, env, true)
  const id = crypto.randomUUID()
  const code = `ALIVE-${randomToken().slice(0, 12).toUpperCase()}`
  const now = Math.floor(Date.now() / 1000)

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO customer_vouchers
      (id,code,customer_id,source,discount_percent,created_at,expires_at)
      SELECT ?,?,?,'points',10,?,? WHERE
      COALESCE((SELECT SUM(points_delta) FROM loyalty_ledger WHERE customer_id=?),0)
      - COALESCE((SELECT SUM(points_spent) FROM customer_point_redemptions WHERE customer_id=?),0) >= ?`)
      .bind(id, code, customer.id, now, now + VOUCHER_VALIDITY_SECONDS, customer.id, customer.id, POINTS_PER_VOUCHER),
    env.DB.prepare(`INSERT INTO customer_point_redemptions(customer_id,voucher_id,points_spent,created_at)
      SELECT ?,?, ?,? WHERE EXISTS (
        SELECT 1 FROM customer_vouchers WHERE id=? AND customer_id=? AND source='points'
      )`).bind(customer.id, id, POINTS_PER_VOUCHER, now, id, customer.id),
  ])

  const voucher = await env.DB.prepare(`SELECT id,code,source,
    discount_percent AS discountPercent,created_at AS createdAt,expires_at AS expiresAt,
    'active' AS status
    FROM customer_vouchers WHERE id=? AND customer_id=?`)
    .bind(id, customer.id).first()
  if (!voucher) return err("INSUFFICIENT_POINTS", "Sunt necesare 1.000 de puncte pentru acest voucher.", 409)
  return ok(voucher, 201)
}
