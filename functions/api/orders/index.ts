import type { Ctx } from "../../_lib/types"
import { err, ok } from "../../_lib/response"
import { guardTestOrders, orderFromRow, orderRequestHash, parseOrderInput, resolveOrder, UnavailableOrderError, type OrderInput, type OrderRow } from "../../_lib/test-orders"

export const onRequestPost = async ({ request, env }: Ctx) => {
  const denied = guardTestOrders(request, env, true)
  if (denied) return denied
  const key = request.headers.get("Idempotency-Key")
  if (!key || !/^[a-f0-9-]{36}$/i.test(key)) return err("VALIDATION_ERROR", "Cheia de reîncercare este invalidă.", 400)
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) return err("VALIDATION_ERROR", "Este necesar JSON.", 400)

  let input: OrderInput
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > 65536) return err("VALIDATION_ERROR", "Comanda este prea mare.", 413)
    input = parseOrderInput(JSON.parse(raw))
  } catch {
    return err("VALIDATION_ERROR", "Verifică produsele, cantitățile și datele de contact (maximum 100 de linii, 99 de bucăți pe linie).", 400)
  }
  try {
    const hash = await orderRequestHash(input)
    const existing = await env.DB.prepare("SELECT * FROM test_orders WHERE idempotency_key = ?").bind(key).first<OrderRow>()
    if (existing) {
      if (existing.request_hash !== hash) return err("IDEMPOTENCY_CONFLICT", "Această cheie aparține unei alte comenzi. Reia verificarea datelor.", 409)
      return ok(orderFromRow(existing))
    }
    let resolved: Awaited<ReturnType<typeof resolveOrder>>
    try {
      resolved = await resolveOrder(input, env)
    } catch (error) {
      if (error instanceof UnavailableOrderError) {
        return err("UNAVAILABLE_ITEMS", error.message, 409)
      }
      throw error
    }
    if (resolved.totalBani !== input.expectedTotalBani) {
      return err("PRICE_CHANGED", "Prețurile s-au schimbat. Închide coșul, reîncarcă meniul și verifică totalul.", 409)
    }
    const number = `TEST-${crypto.randomUUID()}`
    const insert = env.DB.prepare(
      `INSERT INTO test_orders (number, idempotency_key, request_hash, created_at,
       contact_name, contact_phone, contact_email, total_bani, lines_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(idempotency_key) DO NOTHING`,
    ).bind(number, key, hash, new Date().toISOString(), input.contact.name, input.contact.phone,
      input.contact.email, resolved.totalBani, JSON.stringify(resolved.lines))
    await env.DB.batch([
      insert,
      ...resolved.reservations.map(stock => env.DB.prepare(
        `INSERT INTO test_order_stock (order_number, item_id, quantity)
         SELECT number, ?, ? FROM test_orders WHERE number = ?`,
      ).bind(stock.itemId, stock.quantity, number)),
    ])
    const row = await env.DB.prepare("SELECT * FROM test_orders WHERE idempotency_key = ?").bind(key).first<OrderRow>()
    if (!row) throw new Error("Order not persisted")
    if (row.request_hash !== hash) return err("IDEMPOTENCY_CONFLICT", "Cheia a fost deja folosită pentru altă comandă.", 409)
    return ok(orderFromRow(row), row.number === number ? 201 : 200)
  } catch (error) {
    console.error("Failed to persist TEST order", error)
    if (error instanceof Error && error.message.includes("STOCK_UNAVAILABLE")) {
      return err("STOCK_UNAVAILABLE", "Stoc insuficient sau produs indisponibil. Reîncarcă meniul și ajustează coșul.", 409)
    }
    return err("DB_ERROR", "Comanda TEST nu a putut fi salvată. Reîncearcă fără a modifica datele.", 500)
  }
}
