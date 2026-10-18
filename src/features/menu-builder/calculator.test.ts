import { describe, expect, it } from "vitest"
import { calculateMenu, ingredients, type MenuSelection } from "./calculator"

describe("Custom menu calculator", () => {
  it("EmptySelection_ReturnsZeroTotals", () => {
    expect(calculateMenu({})).toEqual({
      lines: [], price: 0, calories: 0, protein: 0, carbs: 0,
      grams: 0, millilitres: 0, allergens: [],
    })
  })

  it("FullMenu_AddsDeclaredPortionsWithoutScaling", () => {
    const selection: MenuSelection = {
      protein: { ingredientId: "chicken", amount: 150 },
      carbs: { ingredientId: "rice", amount: 200 },
      fibre: { ingredientId: "fresh", amount: 120 },
      sauce: { ingredientId: "asian", amount: 30 },
    }

    const total = calculateMenu(selection)

    expect(total).toMatchObject({
      price: 39, calories: 587, protein: 53.2, carbs: 74.4,
      grams: 470, millilitres: 30,
      allergens: ["celery", "soy", "molluscs", "sesame", "fish", "peanuts"],
    })
    expect(total.lines).toHaveLength(4)
  })

  it.each([
    ["chicken", 100, 12, 170, 30.5],
    ["chicken", 150, 17, 245, 45],
    ["chicken", 200, 22, 322, 60],
    ["turkey", 100, 13, 141, 30.8],
    ["turkey", 150, 18, 209, 46],
    ["turkey", 200, 23, 277, 61.2],
    ["salmon", 100, 30, 281, 27.5],
    ["salmon", 150, 41, 335, 32.8],
    ["beef", 100, 30, 208, 30],
    ["beef", 150, 41, 304, 44.2],
    ["beef", 200, 55, 399, 58.5],
  ])("%s_%ig_MatchesProteinTable", (ingredientId, amount, price, calories, protein) => {
    expect(calculateMenu({ protein: { ingredientId, amount } })).toMatchObject({
      price, calories, protein, carbs: 0,
    })
  })

  it.each([
    ["rice", 100, 7, 128, 2.5, 27.5],
    ["rice", 200, 11, 256, 5, 55],
    ["rice", 300, 15, 365, 7.1, 78.6],
    ["sweet-potato", 100, 9, 127, 2.2, 27.2],
    ["sweet-potato", 200, 13, 245, 4.3, 54.4],
    ["sweet-potato", 300, 17, 361, 6.4, 80.6],
    ["quinoa", 100, 10, 147, 4.3, 22.6],
    ["quinoa", 200, 14, 296, 8.6, 43.1],
    ["quinoa", 300, 18, 443, 12.9, 64.7],
  ])("%s_%ig_MatchesCarbTable", (ingredientId, amount, price, calories, protein, carbs) => {
    expect(calculateMenu({ carbs: { ingredientId, amount } })).toMatchObject({
      price, calories, protein, carbs,
    })
  })

  it.each([
    ["fibre", "fresh", 120, 7, 43, 1.6, 9.7],
    ["fibre", "warm", 150, 8, 60, 2.4, 13.3],
    ["sauce", "asian", 30, 4, 43, 1.6, 9.7],
    ["sauce", "citrus", 30, 4, 132, 0.3, 4.1],
  ] as const)("%s_%s_MatchesFixedPortion", (group, ingredientId, amount, price, calories, protein, carbs) => {
    expect(calculateMenu({ [group]: { ingredientId, amount } })).toMatchObject({
      price, calories, protein, carbs,
    })
  })

  it("VegetarianSelection_DoesNotRequireProteinOrSauce", () => {
    expect(calculateMenu({
      carbs: { ingredientId: "quinoa", amount: 100 },
      fibre: { ingredientId: "warm", amount: 150 },
    })).toMatchObject({ price: 18, calories: 207, protein: 6.7, carbs: 35.9, allergens: [] })
  })

  it("ChangingSelection_ReplacesPreviousPortionAndAllergens", () => {
    const selection: MenuSelection = { protein: { ingredientId: "salmon", amount: 150 } }
    const original = structuredClone(selection)

    expect(calculateMenu(selection).allergens).toEqual(["fish"])
    expect(calculateMenu({ ...selection, protein: { ingredientId: "turkey", amount: 100 } }))
      .toMatchObject({ price: 13, calories: 141, allergens: [] })
    expect(selection).toEqual(original)
  })

  it.each([
    { protein: { ingredientId: "salmon", amount: 200 } },
    { protein: { ingredientId: "rice", amount: 100 } },
    { sauce: { ingredientId: "unknown", amount: 30 } },
    { carbs: { ingredientId: "rice", amount: -100 } },
    { carbs: { ingredientId: "rice", amount: Number.NaN } },
    { carbs: { ingredientId: "rice", amount: 125 } },
  ])("InvalidSelection_ThrowsInsteadOfInventingAPrice", (selection) => {
    expect(() => calculateMenu(selection)).toThrow("Invalid menu selection")
  })

  it("Catalogue_HasUniqueIdsAndOnlyPositiveDeclaredPortions", () => {
    expect(ingredients).toHaveLength(11)
    expect(new Set(ingredients.map(item => item.id)).size).toBe(ingredients.length)
    for (const ingredient of ingredients) {
      expect(new Set(ingredient.portions.map(portion => portion.amount)).size).toBe(ingredient.portions.length)
      for (const portion of ingredient.portions) {
        expect(portion.amount).toBeGreaterThan(0)
        expect(portion.price).toBeGreaterThan(0)
        expect(portion.calories).toBeGreaterThan(0)
      }
    }
  })
})
