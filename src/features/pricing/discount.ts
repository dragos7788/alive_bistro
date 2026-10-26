/** Accepts whole percentage discounts; zero disables the promotion. */
export function isDiscountPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 99
}

/** Rounds the discounted unit price once, to the nearest ban. */
export function discountBani(priceBani: number, percent: number): number {
  if (!Number.isSafeInteger(priceBani) || priceBani < 0 || !isDiscountPercent(percent)) {
    throw new Error("Invalid discount calculation")
  }
  return Math.round(priceBani * (100 - percent) / 100)
}

/** Parses an unambiguous single RON price into integer bani. */
export function parsePriceBani(price: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?\s*(?:lei|ron)$/i.exec(price.trim())
  if (!match) return null
  const amount = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"))
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null
}

/** Keeps base prices intact; discounts single or bottle/glass prices once per unit. */
export function discountedMenuPrice(price: string, percent: number) {
  if (!isDiscountPercent(percent)) throw new Error("Invalid discount percent")
  if (percent === 0) return { price }
  const bani = parsePriceBani(price)
  const dual = /^(\d+(?:[.,]\d{1,2})?)\s*\/\s*(\d+(?:[.,]\d{1,2})?)\s*(lei|ron)$/i.exec(price.trim())
  const portions = bani !== null ? [bani] : dual
    ? [parsePriceBani(`${dual[1]} ${dual[3]}`), parsePriceBani(`${dual[2]} ${dual[3]}`)] : []
  if (!portions.length || portions.some(portion => portion === null)) return { price }
  return {
    price: `${portions.map(portion => (discountBani(portion!, percent) / 100).toFixed(2)).join(" / ")} lei`,
    originalPrice: price,
    discountPercent: percent,
  }
}

export type CategoryPromotion = {
  id: string
  label: string
  groupId: "food" | "drinks"
  discountPercent: number
}

export type PromotionSettings = {
  categories: CategoryPromotion[]
  performanceDiscountPercent: number
}

/** Validates settings received by the administrator UI before displaying editable prices. */
export function isPromotionSettings(value: unknown): value is PromotionSettings {
  if (!value || typeof value !== "object" || !("categories" in value) || !Array.isArray(value.categories)
    || !("performanceDiscountPercent" in value) || !isDiscountPercent(value.performanceDiscountPercent)) return false
  const ids = new Set<string>()
  return value.categories.every(category => {
    if (!category || typeof category !== "object" || !("id" in category) || typeof category.id !== "string"
      || !category.id || ids.has(category.id) || !("label" in category) || typeof category.label !== "string"
      || !("groupId" in category) || !["food", "drinks"].includes(category.groupId)
      || !("discountPercent" in category) || !isDiscountPercent(category.discountPercent)) return false
    ids.add(category.id)
    return true
  })
}
