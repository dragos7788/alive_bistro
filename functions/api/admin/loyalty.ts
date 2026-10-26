import type { Ctx } from "../../_lib/types"
import { requireAdmin } from "../../_lib/auth"
import { err, ok } from "../../_lib/response"

const CUSTOMER_PAGE_SIZE = 50
const HISTORY_PAGE_SIZE = 100

function parseCursor(value: string | null, expectedLength: number): unknown[] | null | false {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed) || parsed.length !== expectedLength) return false
    if (expectedLength === 2 && (!Number.isSafeInteger(parsed[0]) || (parsed[0] as number) < 0
      || typeof parsed[1] !== "string" || !parsed[1] || parsed[1].length > 100)) return false
    if (expectedLength === 3 && (!Number.isSafeInteger(parsed[0]) || (parsed[0] as number) < 0
      || !Number.isSafeInteger(parsed[1])
      || (parsed[2] !== "purchase" && parsed[2] !== "referral" && parsed[2] !== "pointsVoucher"))) return false
    return parsed
  } catch {
    return false
  }
}

/** Returns a paginated customer loyalty overview or one customer's private loyalty history to admins. */
export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const deny = requireAdmin(request, env)
  if (deny) return deny

  const params = new URL(request.url).searchParams
  const customerId = params.get("customer")
  const now = Math.floor(Date.now() / 1000)

  if (customerId !== null) {
    if (!customerId || customerId.length > 100) return err("INVALID_INPUT", "Identificator client invalid.", 400)
    const customerRow = await env.DB.prepare(`SELECT c.id,c.name,c.email,c.created_at AS createdAt,
      COALESCE((SELECT SUM(points_delta) FROM loyalty_ledger WHERE customer_id=c.id),0)
      - COALESCE((SELECT SUM(points_spent) FROM customer_point_redemptions WHERE customer_id=c.id),0) AS points,
      COALESCE((SELECT action FROM customer_marketing_consent_events
        WHERE customer_id=c.id AND channel='email' ORDER BY id DESC LIMIT 1)='granted',0) AS emailMarketingConsent,
      (SELECT created_at FROM customer_marketing_consent_events
        WHERE customer_id=c.id AND channel='email' ORDER BY id DESC LIMIT 1) AS emailMarketingConsentUpdatedAt
      FROM customers c WHERE c.id=?`).bind(customerId).first<Record<string, unknown>>()
    if (!customerRow) return err("NOT_FOUND", "Clientul nu a fost găsit.", 404)
    const customer = { ...customerRow, emailMarketingConsent: customerRow.emailMarketingConsent === 1 }

    const historyCursor = parseCursor(params.get("before"), 3)
    if (historyCursor === false) return err("INVALID_INPUT", "Cursor istoric invalid.", 400)
    const historyCursorValues = historyCursor as [number, number, string] | null
    const history = await env.DB.prepare(`SELECT * FROM (
      SELECT l.id,l.kind,l.points_delta AS pointsDelta,l.created_at AS createdAt,p.order_id AS reference
      FROM loyalty_ledger l LEFT JOIN loyalty_payments p ON p.payment_id=l.payment_id WHERE l.customer_id=?
      UNION ALL
      SELECT -r.id AS id,'pointsVoucher' AS kind,-r.points_spent AS pointsDelta,
        r.created_at AS createdAt,v.code AS reference
      FROM customer_point_redemptions r JOIN customer_vouchers v ON v.id=r.voucher_id
      WHERE r.customer_id=?
    ) WHERE (? IS NULL OR createdAt < ? OR
      (createdAt = ? AND (id < ? OR (id = ? AND kind < ?))))
      ORDER BY createdAt DESC,id DESC,kind DESC LIMIT ?`)
      .bind(customerId, customerId,
        historyCursorValues ? 1 : null,
        historyCursorValues?.[0] ?? null,
        historyCursorValues?.[0] ?? null,
        historyCursorValues?.[1] ?? null,
        historyCursorValues?.[1] ?? null,
        historyCursorValues?.[2] ?? null,
        HISTORY_PAGE_SIZE + 1).all<Record<string, unknown>>()
    const historyPage = history.results.slice(0, HISTORY_PAGE_SIZE)
    const lastHistory = historyPage.at(-1)
    const nextHistory = history.results.length > HISTORY_PAGE_SIZE && lastHistory
      ? JSON.stringify([lastHistory.createdAt, lastHistory.id, lastHistory.kind])
      : null

    const vouchers = await env.DB.prepare(`SELECT id,code,source,discount_percent AS discountPercent,
      created_at AS createdAt,expires_at AS expiresAt,used_at AS usedAt,used_order_id AS usedOrderId,
      CASE WHEN used_at IS NOT NULL THEN 'used'
        WHEN expires_at <= ? THEN 'expired' ELSE 'active' END AS status
      FROM customer_vouchers WHERE customer_id=? ORDER BY created_at DESC,id DESC`)
      .bind(now, customerId).all()
    const marketingConsentHistory = await env.DB.prepare(`SELECT id,action,source,notice_version AS noticeVersion,
      created_at AS createdAt FROM customer_marketing_consent_events
      WHERE customer_id=? AND channel='email' ORDER BY id DESC LIMIT 50`).bind(customerId).all()
    const response = ok({ customer, history: historyPage, nextHistory, vouchers: vouchers.results, marketingConsentHistory: marketingConsentHistory.results })
    response.headers.set("Cache-Control", "no-store")
    return response
  }

  const search = params.get("search")?.trim() ?? ""
  if (search.length > 100) return err("INVALID_INPUT", "Căutarea nu poate depăși 100 de caractere.", 400)
  const marketingFilter = params.get("marketing") ?? "all"
  if (marketingFilter !== "all" && marketingFilter !== "granted" && marketingFilter !== "not-granted") {
    return err("INVALID_INPUT", "Filtrul de marketing nu este valid.", 400)
  }
  const cursor = parseCursor(params.get("before"), 2)
  if (cursor === false) return err("INVALID_INPUT", "Cursor client invalid.", 400)
  const customerCursor = cursor as [number, string] | null
  const result = await env.DB.prepare(`SELECT c.id,c.name,c.email,c.created_at AS createdAt,
    COALESCE((SELECT SUM(points_delta) FROM loyalty_ledger WHERE customer_id=c.id),0)
      - COALESCE((SELECT SUM(points_spent) FROM customer_point_redemptions WHERE customer_id=c.id),0) AS points,
    (SELECT COUNT(*) FROM customer_vouchers WHERE customer_id=c.id AND used_at IS NULL AND expires_at>?) AS activeVouchers,
    (SELECT COUNT(*) FROM customer_vouchers WHERE customer_id=c.id AND used_at IS NOT NULL) AS usedVouchers,
    (SELECT COUNT(*) FROM customer_vouchers WHERE customer_id=c.id AND used_at IS NULL AND expires_at<=?) AS expiredVouchers,
    COALESCE((SELECT action FROM customer_marketing_consent_events
      WHERE customer_id=c.id AND channel='email' ORDER BY id DESC LIMIT 1)='granted',0) AS emailMarketingConsent,
    (SELECT created_at FROM customer_marketing_consent_events
      WHERE customer_id=c.id AND channel='email' ORDER BY id DESC LIMIT 1) AS emailMarketingConsentUpdatedAt
    FROM customers c
    WHERE (?='' OR instr(lower(c.name),lower(?))>0 OR instr(lower(COALESCE(c.email,'')),lower(?))>0)
      AND (?='all'
        OR (?='granted' AND COALESCE((SELECT action FROM customer_marketing_consent_events
          WHERE customer_id=c.id AND channel='email' ORDER BY id DESC LIMIT 1),'')='granted')
        OR (?='not-granted' AND COALESCE((SELECT action FROM customer_marketing_consent_events
          WHERE customer_id=c.id AND channel='email' ORDER BY id DESC LIMIT 1),'')<>'granted'))
      AND (? IS NULL OR c.created_at < ? OR (c.created_at = ? AND c.id < ?))
    ORDER BY c.created_at DESC,c.id DESC LIMIT ?`)
    .bind(now, now, search, search, search, marketingFilter, marketingFilter, marketingFilter,
      customerCursor ? 1 : null, customerCursor?.[0] ?? null, customerCursor?.[0] ?? null,
      customerCursor?.[1] ?? null, CUSTOMER_PAGE_SIZE + 1)
    .all<Record<string, unknown>>()
  const page = result.results.slice(0, CUSTOMER_PAGE_SIZE)
  const lastCustomer = page.at(-1)
  const next = result.results.length > CUSTOMER_PAGE_SIZE && lastCustomer
    ? JSON.stringify([lastCustomer.createdAt, lastCustomer.id])
    : null
  const response = ok({
    customers: page.map(customer => ({
      ...customer,
      emailMarketingConsent: customer.emailMarketingConsent === 1,
    })),
    next,
  })
  response.headers.set("Cache-Control", "no-store")
  return response
}
