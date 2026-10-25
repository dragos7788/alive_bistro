import type { Ctx } from "../../../_lib/types"
import { err } from "../../../_lib/response"
import { guardTestOrders, orderFromRow, type OrderRow } from "../../../_lib/test-orders"

export const onRequestGet = async ({ request, env }: Ctx) => {
  const denied = guardTestOrders(request, env)
  if (denied) return denied
  const before = new URL(request.url).searchParams.get("before")
  let cursor: unknown
  if (before) {
    try { cursor = JSON.parse(before) } catch { return err("VALIDATION_ERROR", "Cursor invalid.", 400) }
    if (!Array.isArray(cursor) || cursor.length !== 2 || typeof cursor[0] !== "string"
      || typeof cursor[1] !== "string" || !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(cursor[0])
      || !/^TEST-[a-f0-9-]{36}$/i.test(cursor[1])) return err("VALIDATION_ERROR", "Cursor invalid.", 400)
  }
  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM test_orders ${before ? "WHERE (created_at, number) < (?, ?)" : ""} ORDER BY created_at DESC, number DESC LIMIT 51`,
    ).bind(...(Array.isArray(cursor) ? cursor : [])).all<OrderRow>()
    const page = results.slice(0, 50)
    return Response.json({ data: page.map(orderFromRow), next: results.length > 50 ? JSON.stringify([page[49].created_at, page[49].number]) : null }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    console.error("Failed to list TEST orders", error)
    return err("DB_ERROR", "Comenzile TEST nu au putut fi încărcate.", 500)
  }
}
