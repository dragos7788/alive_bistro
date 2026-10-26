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

/** Excludes drinks and the menu's dessert category from the food promotion. */
export function foodDiscountEligible(groupId: string, categoryId: string): boolean {
  return groupId === "food" && categoryId !== "sweet-no-regrets"
}

/** Keeps the base price intact and returns public pricing for eligible menu items. */
export function discountedMenuPrice(price: string, groupId: string, categoryId: string, percent: number) {
  const bani = parsePriceBani(price)
  if (!foodDiscountEligible(groupId, categoryId) || percent === 0 || bani === null) return { price }
  return {
    price: `${(discountBani(bani, percent) / 100).toFixed(2)} lei`,
    originalPrice: price,
    discountPercent: percent,
  }
}
