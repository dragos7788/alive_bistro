import type { Env } from "./types"
import { isDiscountPercent } from "../../src/features/pricing/discount"

/** Reads the persisted promotion; missing or invalid configuration must not silently alter prices. */
export async function readFoodDiscount(env: Env): Promise<number> {
  const row = await env.DB.prepare("SELECT discount_percent FROM food_promotion WHERE id=1")
    .first<{ discount_percent: number }>()
  if (!row || !isDiscountPercent(row.discount_percent)) throw new Error("Invalid food promotion configuration")
  return row.discount_percent
}
