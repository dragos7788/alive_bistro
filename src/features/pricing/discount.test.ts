import { describe, expect, it } from "vitest"
import { discountBani, discountedMenuPrice, isDiscountPercent, isPromotionSettings } from "./discount"

describe("category promotions", () => {
  it("discounts in bani without mutating the base price", () => {
    expect(discountedMenuPrice("36 lei", 10)).toEqual({
      price: "32.40 lei", originalPrice: "36 lei", discountPercent: 10,
    })
    expect(discountBani(1799, 10)).toBe(1619)
    expect(discountBani(400, 0)).toBe(400)
  })

  it("discounts bottle and glass prices independently", () => {
    expect(discountedMenuPrice("100 / 28 lei", 10)).toEqual({
      price: "90.00 / 25.20 lei", originalPrice: "100 / 28 lei", discountPercent: 10,
    })
  })

  it("preserves disabled and ambiguous pricing", () => {
    expect(discountedMenuPrice("36 lei", 0)).toEqual({ price: "36 lei" })
    expect(discountedMenuPrice("confirmare", 10)).toEqual({ price: "confirmare" })
  })

  it.each([0, 1, 99])("accepts discount boundary %s", percent => {
    expect(isDiscountPercent(percent)).toBe(true)
  })

  it.each([-1, 100, 10.5, "10", null, Infinity])("rejects invalid discount %s", percent => {
    expect(isDiscountPercent(percent)).toBe(false)
  })

  it("validates settings before the admin can edit them", () => {
    const category = { id: "coffee", label: "Coffee", groupId: "drinks", discountPercent: 0 }
    expect(isPromotionSettings({ categories: [category], performanceDiscountPercent: 0 })).toBe(true)
    for (const invalid of [
      null, {}, { categories: [], performanceDiscountPercent: "10" },
      { categories: [category, category], performanceDiscountPercent: 0 },
      { categories: [{ ...category, groupId: "unknown" }], performanceDiscountPercent: 0 },
      { categories: [{ ...category, discountPercent: -1 }], performanceDiscountPercent: 0 },
    ]) expect(isPromotionSettings(invalid)).toBe(false)
  })
})
