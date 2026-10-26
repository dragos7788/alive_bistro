import type { Ctx } from "../../_lib/types"
import { requireAdmin } from "../../_lib/auth"
import { readFoodDiscount } from "../../_lib/food-promotion"
import { err, ok } from "../../_lib/response"
import { isDiscountPercent } from "../../../src/features/pricing/discount"

/** Returns promotion settings only to administrators. */
export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const deny = requireAdmin(request, env)
  if (deny) return deny
  try {
    const response = ok({ foodDiscountPercent: await readFoodDiscount(env) })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    console.error("Food promotion loading failed", error instanceof Error ? error.name : "UnknownError")
    return err("PROMOTION_ERROR", "Reducerea nu a putut fi încărcată.", 503)
  }
}

/** Saves an idempotent, same-origin promotion update without changing product base prices. */
export async function onRequestPut({ request, env }: Ctx): Promise<Response> {
  const deny = requireAdmin(request, env)
  if (deny) return deny
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return err("INVALID_ORIGIN", "Originea cererii nu este permisă.", 403)
  }
  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > 1024) return err("INVALID_INPUT", "Cerere prea mare.", 413)
  let input: unknown
  try { input = JSON.parse(raw) } catch { return err("INVALID_INPUT", "Date invalide.", 400) }
  if (!input || typeof input !== "object" || !("foodDiscountPercent" in input)
    || !isDiscountPercent(input.foodDiscountPercent)) {
    return err("INVALID_INPUT", "Introdu un procent întreg între 0 și 99.", 400)
  }
  try {
    await env.DB.prepare(`INSERT INTO food_promotion(id,discount_percent) VALUES (1,?)
      ON CONFLICT(id) DO UPDATE SET discount_percent=excluded.discount_percent`)
      .bind(input.foodDiscountPercent).run()
    return ok({ foodDiscountPercent: input.foodDiscountPercent })
  } catch (error) {
    console.error("Food promotion saving failed", error instanceof Error ? error.name : "UnknownError")
    return err("PROMOTION_ERROR", "Reducerea nu a putut fi salvată.", 503)
  }
}
