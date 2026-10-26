import { describe, expect, it } from "vitest"
import { discountBani, discountedMenuPrice, foodDiscountEligible, isDiscountPercent } from "./discount"

describe("food promotion", () => {
  it.each([["food", "breakfast-brunch", true], ["food", "nourishing-bowls", true],
    ["food", "sweet-no-regrets", false], ["drinks", "coffee-bar", false], ["drinks", "smoothies", false]])(
    "checks eligibility for %s/%s", (group, category, expected) => {
      expect(foodDiscountEligible(group, category)).toBe(expected)
    },
  )

  it("discounts in bani without mutating the base price", () => {
    expect(discountedMenuPrice("36 lei", "food", "breakfast-brunch", 10)).toEqual({
      price: "32.40 lei", originalPrice: "36 lei", discountPercent: 10,
    })
    expect(discountBani(1799, 10)).toBe(1619)
    expect(discountBani(400, 0)).toBe(400)
  })

  it.each([["food", "sweet-no-regrets"], ["drinks", "coffee-bar"]])(
    "leaves excluded %s/%s unchanged", (group, category) => {
      expect(discountedMenuPrice("36 lei", group, category, 10)).toEqual({ price: "36 lei" })
    },
  )

  it("preserves disabled and ambiguous pricing", () => {
    expect(discountedMenuPrice("36 lei", "food", "breakfast-brunch", 0)).toEqual({ price: "36 lei" })
    expect(discountedMenuPrice("confirmare", "food", "breakfast-brunch", 10)).toEqual({ price: "confirmare" })
  })

  it.each([-1, 100, 10.5, "10", null, Infinity])("rejects invalid discount %s", percent => {
    expect(isDiscountPercent(percent)).toBe(false)
  })
})
