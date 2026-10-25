import type { Ctx } from "../../../_lib/types"
import { err, ok } from "../../../_lib/response"
import { guardTestOrders, orderFromRow, type OrderRow } from "../../../_lib/test-orders"
import { canTransition, preparationStatuses } from "../../../../src/features/orders/types"

export const onRequestPatch = async ({ request, env, params }: Ctx<"number">) => {
  const denied = guardTestOrders(request, env, true)
  if (denied) return denied
  let value: unknown
  try { value = await request.json() } catch { return err("VALIDATION_ERROR", "JSON invalid.", 400) }
  if (!value || typeof value !== "object" || !("status" in value) || !("expectedStatus" in value)
    || Object.keys(value).some(key => key !== "status" && key !== "expectedStatus")) {
    return err("VALIDATION_ERROR", "Sunt necesare status și expectedStatus. Plata nu se poate modifica.", 400)
  }
  const status = preparationStatuses.find(status => status === value.status)
  const expected = preparationStatuses.find(status => status === value.expectedStatus)
  if (!status || !expected || !canTransition(expected, status)) return err("INVALID_TRANSITION", "Tranziție nepermisă.", 409)
  try {
    const current = await env.DB.prepare("SELECT * FROM test_orders WHERE number = ?").bind(params.number).first<OrderRow>()
    if (!current) return err("NOT_FOUND", "Comandă inexistentă.", 404)
    if (current.preparation_status !== status && current.preparation_status !== expected) {
      return err("STATE_CHANGED", "Starea a fost modificată. Reîncarcă lista.", 409)
    }
    await env.DB.prepare("UPDATE test_orders SET preparation_status = ? WHERE number = ? AND preparation_status = ?")
      .bind(status, params.number, expected).run()
    const updated = await env.DB.prepare("SELECT * FROM test_orders WHERE number = ?").bind(params.number).first<OrderRow>()
    if (!updated || updated.preparation_status !== status) return err("STATE_CHANGED", "Starea s-a schimbat. Reîncarcă lista.", 409)
    return ok(orderFromRow(updated))
  } catch (error) {
    console.error("Failed to update TEST order", error)
    return err("DB_ERROR", "Starea comenzii nu a putut fi salvată.", 500)
  }
}
