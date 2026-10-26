import { describe, expect, it } from "vitest"
import { cartCatalog, cartOptions, cartProductKey, isAlcoholCategory, parsePriceBani, performanceCartProduct, restoreCart, summarizeCart, updateCart } from "./cart"
import menu from "../menu/menu-data.json"
import { discountedMenuPrice } from "../pricing/discount"

const product = { key: cartProductKey("breakfast", "Toast"), name: "Toast" }

describe("Performance cart", () => {
  const selection = {
    protein: { ingredientId: "chicken", amount: 150 },
    carbs: { ingredientId: "rice", amount: 200 },
  }

  it("recalculates a restored Performance cart with the current discount exactly once", () => {
    const plate = performanceCartProduct(selection, 10)
    const entries = updateCart([], plate, 2)

    expect(plate.priceBani).toBe(2520)
    expect(summarizeCart(entries, new Map(), 10).totalBani).toBe(5040)
    expect(summarizeCart(entries, new Map(), 0).totalBani).toBe(5600)
    expect(summarizeCart(entries, new Map(), 10).lines[0].originalPriceBani).toBe(2800)
  })

  it("uses the discounted menu price and keeps the original unit price visible", () => {
    const catalog = new Map(cartOptions("breakfast", {
      name: "Toast", description: "", price: "32.40 lei", originalPrice: "36 lei", discountPercent: 10,
    }).map(option => [option.key, option]))
    const summary = summarizeCart([{ ...product, quantity: 2 }], catalog, 10)

    expect(summary.totalBani).toBe(6480)
    expect(summary.lines[0].originalPriceBani).toBe(3600)
  })
  it("adds a configured plate and a regular product to one exact total", () => {
    const plate = performanceCartProduct(selection)
    const items = updateCart(updateCart([], product, 1), plate, 2)

    const summary = summarizeCart(items, new Map([[product.key, { ...product, priceBani: 3600 }]]))

    expect(plate.priceBani).toBe(2800)
    expect(summary.totalBani).toBe(9200)
    expect(summary.lines[1].plate?.lines.map(line => [line.ingredient.id, line.portion.amount]))
      .toEqual([["chicken", 150], ["rice", 200]])
  })

  it("merges identical combinations independently of property order and separates changed portions", () => {
    const plate = performanceCartProduct(selection)
    const samePlate = performanceCartProduct({ carbs: selection.carbs, protein: selection.protein })
    const differentPlate = performanceCartProduct({ ...selection, protein: { ingredientId: "chicken", amount: 200 } })

    const items = updateCart(updateCart(updateCart([], plate, 1), samePlate, 2), differentPlate, 1)

    expect(items).toHaveLength(2)
    expect(items.map(item => item.quantity)).toEqual([2, 1])
  })

  it("persists ingredient IDs and portions without trusting stored prices", () => {
    const plate = performanceCartProduct(selection)
    const items = updateCart([], plate, 1)
    const restored = restoreCart(JSON.stringify({ version: 1, items: items.map(item => ({ ...item, priceBani: 1 })) }))

    expect(restored[0].selection).toEqual(selection)
    expect(summarizeCart(restored, new Map()).totalBani).toBe(2800)
    expect(updateCart(restored, restored[0], 3)[0].selection).toEqual(selection)
    expect(updateCart(restored, restored[0], 0)).toEqual([])
  })

  it("snapshots the selection so later edits cannot change the plate in the cart", () => {
    const draft = { protein: { ingredientId: "chicken", amount: 100 } }
    const plate = performanceCartProduct(draft)
    draft.protein.amount = 200

    expect(plate.selection?.protein?.amount).toBe(100)
  })

  it("allows partial plates but rejects empty or invalid selections", () => {
    expect(performanceCartProduct({ protein: selection.protein }).priceBani).toBe(1700)
    expect(() => performanceCartProduct({})).toThrow()
    expect(() => performanceCartProduct({ protein: { ingredientId: "rice", amount: 100 } })).toThrow()
    expect(() => performanceCartProduct({ protein: { ingredientId: "chicken", amount: 999 } })).toThrow()
  })

  it("marks removed catalog ingredients unavailable instead of charging a stale price", () => {
    const restored = restoreCart(JSON.stringify({ version: 1, items: [{
      key: JSON.stringify(["performance", [["protein", "removed-product", 100]]]),
      name: "Meniu Performance", quantity: 1,
      selection: { protein: { ingredientId: "removed-product", amount: 100 } },
    }] }))

    expect(summarizeCart(restored, new Map()).totalBani).toBeNull()
  })

  it("rejects corrupt stored selections and mismatched identities", () => {
    const plate = performanceCartProduct(selection)
    const entry = { ...plate, quantity: 1 }
    for (const changed of [
      { ...entry, key: "wrong" },
      { ...entry, selection: {} },
      { ...entry, selection: { protein: { ingredientId: "chicken", amount: "150" } } },
      { ...entry, selection: { unknown: selection.protein } },
    ]) {
      expect(() => restoreCart(JSON.stringify({ version: 1, items: [changed] }))).toThrow()
    }
  })
})

describe("cart", () => {
  it("keeps separate category percentages and the Performance percentage without stacking", () => {
    const groups = [{
      id: "food" as const, label: "Food", iconKey: "fork-knife",
      categories: [
        { id: "breakfast", label: "Breakfast", iconKey: "egg", items: [
          { name: "Toast", description: "", ...discountedMenuPrice("36 lei", 10) },
        ] },
        { id: "sweet-no-regrets", label: "Desserts", iconKey: "cake", items: [
          { name: "Cake", description: "", ...discountedMenuPrice("30 lei", 20) },
        ] },
      ],
    }]
    const plate = performanceCartProduct({ protein: { ingredientId: "chicken", amount: 100 } })
    const entries = [
      { ...product, quantity: 1 },
      { key: cartProductKey("sweet-no-regrets", "Cake"), name: "Cake", quantity: 1 },
      { ...plate, quantity: 1 },
    ]

    const summary = summarizeCart(entries, cartCatalog(groups), 25)

    expect(summary.lines.map(line => line.priceBani)).toEqual([3240, 2400, 900])
    expect(summary.totalBani).toBe(6540)
  })

  it("preserves original prices for discounted bottle/glass portions", () => {
    const options = cartOptions("dual-portions", {
      name: "Drink", description: "750 ml / 125 ml.", ...discountedMenuPrice("100 / 28 lei", 10),
    })

    expect(options.map(option => [option.priceBani, option.originalPriceBani])).toEqual([[9000, 10000], [2520, 2800]])
  })
  it.each([["36 lei", 3600], ["12,50 lei", 1250], ["0.10 RON", 10], [" 9.9 lei ", 990]])(
    "parses %s exactly into bani", (input, expected) => expect(parsePriceBani(input)).toBe(expected),
  )
  it.each(["", "-2 lei", "0 lei", "12/15 lei", "12.345 lei", "12 EUR", "Infinity lei", "9007199254740991 lei"])(
    "rejects invalid price %s", price => expect(parsePriceBani(price)).toBeNull(),
  )
  it("supports every non-alcoholic published menu price and excludes alcohol", () => {
    for (const group of menu) for (const category of group.categories) for (const item of category.items) {
      if (isAlcoholCategory(category.id)) expect(cartOptions(category.id, item), item.name).toEqual([])
      else expect(cartOptions(category.id, item).length, item.name).toBeGreaterThan(0)
    }
  })
  it.each(["craft-beer", "wine-prosecco", "cocktails"])("blocks %s including previously saved bottle/glass lines", categoryId => {
    const item = { name: "Alcohol", price: "100 / 28 lei", description: "750 ml / 125 ml." }
    const groups = [{ id: "drinks" as const, label: "Drinks", iconKey: "wine",
      categories: [{ id: categoryId, label: "Alcohol", iconKey: "wine", items: [item] }] }]
    const saved = restoreCart(JSON.stringify({ version: 1, items: [
      { key: cartProductKey(categoryId, item.name), name: item.name, quantity: 1 },
      { key: JSON.stringify([categoryId, item.name, "125 ml"]), name: item.name, quantity: 1 },
    ] }))

    expect(cartOptions(categoryId, { ...item, price: "28 lei" })).toEqual([])
    expect(cartOptions(categoryId, item)).toEqual([])
    expect(cartCatalog(groups).size).toBe(0)
    expect(summarizeCart(saved, cartCatalog(groups)).totalBani).toBeNull()
  })
  it("keeps bottle and glass separate with their exact declared prices", () => {
    const options = cartOptions("wine", { name: "Prosecco", price: "100 / 28 lei", description: "750 ml / 125 ml." })
    expect(options.map(option => [option.portion, option.priceBani])).toEqual([["750 ml", 10000], ["125 ml", 2800]])
    expect(options[0].key).not.toBe(options[1].key)
    const cart = options.reduce((items, option) => updateCart(items, option, 1), [] as ReturnType<typeof restoreCart>)
    expect(summarizeCart(cart, new Map(options.map(option => [option.key, option]))).totalBani).toBe(12800)
  })
  it("does not guess ambiguous portions", () => {
    expect(cartOptions("wine", { name: "Wine", price: "100 / 28 lei", description: "Wine" })).toEqual([])
  })
  it("adds, merges, decrements and removes without mutating previous state", () => {
    const first = updateCart([], product, 1)
    const second = updateCart(first, product, 2)
    expect(first[0].quantity).toBe(1)
    expect(second).toEqual([{ ...product, quantity: 2 }])
    expect(updateCart(second, product, 1)).toEqual(first)
    expect(updateCart(first, product, 0)).toEqual([])
  })
  it("keeps same-name products in different categories distinct", () => {
    expect(cartProductKey("coffee", "Milk")).not.toBe(cartProductKey("extras", "Milk"))
  })
  it("restores a persisted cart", () => {
    const items = [{ ...product, quantity: 2 }]
    expect(restoreCart(JSON.stringify({ version: 1, items }))).toEqual(items)
    expect(restoreCart(null)).toEqual([])
  })
  it.each(["{", "null", "[]", '{"version":2,"items":[]}', ...[0, -1, 1.5, "2"].map(quantity =>
    JSON.stringify({ version: 1, items: [{ ...product, quantity }] }))])("rejects corrupt storage %s", raw => {
    expect(() => restoreCart(raw)).toThrow()
  })
  it("rejects duplicate stored lines and unsafe quantities", () => {
    const entry = { ...product, quantity: 1 }
    expect(() => restoreCart(JSON.stringify({ version: 1, items: [entry, entry] }))).toThrow()
    expect(() => updateCart([], product, Number.MAX_SAFE_INTEGER + 1)).toThrow()
  })
  it("uses current catalog prices and totals in integer bani", () => {
    const items = [{ ...product, quantity: 3 }]
    const catalog = new Map([[product.key, { ...product, priceBani: 1250 }]])
    expect(summarizeCart(items, catalog).totalBani).toBe(3750)
    catalog.set(product.key, { ...product, priceBani: 1300 })
    expect(summarizeCart(items, catalog).totalBani).toBe(3900)
  })
  it("does not present incomplete or overflowing totals as payable", () => {
    const items = [{ ...product, quantity: 2 }]
    expect(summarizeCart(items, new Map()).totalBani).toBeNull()
    expect(summarizeCart(items, new Map([[product.key, { ...product, priceBani: Number.MAX_SAFE_INTEGER }]]))
      .totalBani).toBeNull()
    expect(summarizeCart([], cartCatalog([])).totalBani).toBe(0)
  })
})
