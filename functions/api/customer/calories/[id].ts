import type { Ctx } from "../../../_lib/types"
import { requireCustomer } from "../../../_lib/customer-session"
import { err, ok } from "../../../_lib/response"

export async function onRequestDelete({ request, env, params }: Ctx<"id">): Promise<Response> {
  const customer = await requireCustomer(request, env, true)
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return err("INVALID_ENTRY", "Înregistrare invalidă.", 400)
  await env.DB.prepare("DELETE FROM calorie_journal_entries WHERE id=? AND customer_id=?")
    .bind(params.id, customer.id).run()
  return ok({ deleted: true })
}
