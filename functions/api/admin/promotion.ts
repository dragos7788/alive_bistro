import type { Ctx } from "../../_lib/types"
import { requireAdmin } from "../../_lib/auth"
import { readPromotions } from "../../_lib/food-promotion"
import { err, ok } from "../../_lib/response"
import { isDiscountPercent } from "../../../src/features/pricing/discount"

/** Returns promotion settings only to administrators. */
export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const deny = requireAdmin(request, env)
  if (deny) return deny
  try {
    const response = ok(await readPromotions(env))
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    console.error("Category promotions loading failed", error instanceof Error ? error.name : "UnknownError")
    return err("PROMOTION_ERROR", "Reducerile nu au putut fi încărcate.", 503)
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
  if (!input || typeof input !== "object" || Array.isArray(input)) return err("INVALID_INPUT", "Date invalide.", 400)
  const performanceUpdate = "performanceDiscountPercent" in input
  const percent = performanceUpdate ? input.performanceDiscountPercent : "discountPercent" in input ? input.discountPercent : undefined
  const categoryId = "categoryId" in input ? input.categoryId : undefined
  if (!isDiscountPercent(percent)
    || (performanceUpdate ? Object.keys(input).length !== 1
      : Object.keys(input).length !== 2 || typeof categoryId !== "string" || !categoryId || categoryId.length > 100)) {
    return err("INVALID_INPUT", "Alege o categorie și un procent întreg între 0 și 99, sau reducerea Performance.", 400)
  }
  try {
    if (performanceUpdate) {
      await env.DB.prepare(`INSERT INTO performance_promotion(id,discount_percent) VALUES (1,?)
        ON CONFLICT(id) DO UPDATE SET discount_percent=excluded.discount_percent`).bind(percent).run()
    } else {
      const category = await env.DB.prepare("SELECT id FROM categories WHERE id=?").bind(categoryId).first()
      if (!category) return err("NOT_FOUND", "Categoria nu mai există. Reîncarcă setările.", 404)
      await env.DB.prepare(`INSERT INTO category_promotions(category_id,discount_percent) VALUES (?,?)
        ON CONFLICT(category_id) DO UPDATE SET discount_percent=excluded.discount_percent`)
        .bind(categoryId, percent).run()
    }
    return ok({ discountPercent: percent })
  } catch (error) {
    console.error("Category promotion saving failed", error instanceof Error ? error.name : "UnknownError")
    return err("PROMOTION_ERROR", "Reducerea nu a putut fi salvată.", 503)
  }
}
