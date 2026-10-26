import type { Env } from "./types"
import { isDiscountPercent, isPromotionSettings, type PromotionSettings } from "../../src/features/pricing/discount"

/** Reads actual menu categories; categories without an override intentionally default to zero. */
export async function readPromotions(env: Env): Promise<PromotionSettings> {
  const { results } = await env.DB.prepare(`SELECT c.id, c.label, c.group_id,
    COALESCE(p.discount_percent, 0) AS discount_percent
    FROM categories c LEFT JOIN category_promotions p ON p.category_id=c.id
    ORDER BY c.group_id, c.sort_order, c.id`)
    .all<{ id: string; label: string; group_id: string; discount_percent: number }>()
  const row = await env.DB.prepare("SELECT discount_percent FROM performance_promotion WHERE id=1")
    .first<{ discount_percent: number }>()
  if (!row || !isDiscountPercent(row.discount_percent)) throw new Error("Invalid Performance promotion configuration")
  const settings = {
    categories: results.map(category => ({
      id: category.id, label: category.label, groupId: category.group_id, discountPercent: category.discount_percent,
    })),
    performanceDiscountPercent: row.discount_percent,
  }
  if (!isPromotionSettings(settings)) throw new Error("Invalid category promotion configuration")
  return settings
}
