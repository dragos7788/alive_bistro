import { describe, expect, it, vi } from "vitest"
import type { Env } from "./types"
import { onRequestGet, onRequestPut } from "../api/admin/promotion"
import { onRequestGet as menu } from "../api/menu"
import { readPromotions } from "./food-promotion"

function database(initial: Record<string, number> = {}) {
  const discounts = new Map(Object.entries(initial))
  let performance = 0
  const categories = [
    { id: "breakfast-brunch", group_id: "food", label: "Breakfast" },
    { id: "sweet-no-regrets", group_id: "food", label: "Desserts" },
    { id: "coffee-bar", group_id: "drinks", label: "Coffee" },
    { id: "wine-prosecco", group_id: "drinks", label: "Wine" },
  ]
  const items = [
    { name: "Toast", category_id: "breakfast-brunch", price: "36 lei", calories: 500, protein: "20g", fat: "10g" },
    { name: "Cake", category_id: "sweet-no-regrets", price: "30 lei" },
    { name: "Coffee", category_id: "coffee-bar", price: "12 lei" },
    { name: "Wine", category_id: "wine-prosecco", price: "100 / 28 lei" },
  ]
  const prepare = vi.fn((sql: string) => {
    let bound: unknown[] = []
    return {
      bind(...args: unknown[]) { bound = args; return this },
      async first<T>() {
        if (sql.includes("FROM performance_promotion")) return { discount_percent: performance } as T
        return (categories.find(category => category.id === bound[0]) ?? null) as T | null
      },
      async all<T>() {
        return { results: categories.map(category => ({
          ...category, discount_percent: discounts.get(category.id) ?? 0,
        })) as T[] }
      },
      async run() {
        if (sql.includes("INTO performance_promotion")) performance = Number(bound[0])
        else discounts.set(String(bound[0]), Number(bound[1]))
        return { success: true }
      },
    }
  })
  const env: Env = {
    LOCAL_TEST_ORDERS: "true",
    DB: { prepare, batch: vi.fn(async () => [{ results: categories }, { results: items }]) },
    MEDIA: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
  }
  return { env, prepare, discounts }
}

function write(value: unknown, origin = "http://localhost:8788") {
  return new Request("http://localhost:8788/api/admin/promotion", {
    method: "PUT", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  })
}

describe("admin category promotions", () => {
  it("rejects unauthenticated access outside explicit local TEST mode", async () => {
    const { env, prepare } = database()
    const ctx = { request: write({ categoryId: "coffee-bar", discountPercent: 10 }), env: { ...env, LOCAL_TEST_ORDERS: undefined }, params: {} }

    expect((await onRequestPut(ctx)).status).toBe(401)
    expect((await onRequestGet(ctx)).status).toBe(401)
    expect(prepare).not.toHaveBeenCalled()
  })

  it("rejects cross-origin writes even with an admin header", async () => {
    const { env, prepare } = database()
    const request = write({ performanceDiscountPercent: 10 }, "https://example.com")
    request.headers.set("Cf-Access-Authenticated-User-Email", "admin@example.com")

    expect((await onRequestPut({ request, env, params: {} })).status).toBe(403)
    expect(prepare).not.toHaveBeenCalled()
  })

  it.each([-1, 100, 5.5, "10", null])("rejects invalid setting %s", async value => {
    const { env, prepare } = database()
    const response = await onRequestPut({ request: write({ categoryId: "coffee-bar", discountPercent: value }), env, params: {} })

    expect(response.status).toBe(400)
    expect(prepare).not.toHaveBeenCalled()
  })

  it.each([{}, { foodDiscountPercent: 10 }, { categoryId: "", discountPercent: 10 },
    { categoryId: "coffee-bar", discountPercent: 10, performanceDiscountPercent: 20 }])(
    "rejects ambiguous or obsolete updates %j", async value => {
      const { env } = database()
      expect((await onRequestPut({ request: write(value), env, params: {} })).status).toBe(400)
    },
  )

  it("rejects unknown categories instead of creating a disconnected discount", async () => {
    const { env, discounts } = database()
    const response = await onRequestPut({ request: write({ categoryId: "missing", discountPercent: 10 }), env, params: {} })

    expect(response.status).toBe(404)
    expect(discounts.size).toBe(0)
  })

  it("rejects malformed and oversized requests before reading D1", async () => {
    const { env, prepare } = database()
    for (const [body, status] of [["{", 400], [JSON.stringify({ padding: "x".repeat(1025) }), 413]] as const) {
      const request = new Request("http://localhost:8788/api/admin/promotion", {
        method: "PUT", headers: { Origin: "http://localhost:8788" }, body,
      })
      expect((await onRequestPut({ request, env, params: {} })).status).toBe(status)
    }
    expect(prepare).not.toHaveBeenCalled()
  })

  it("reports D1 failures instead of returning successful zero-discount settings", async () => {
    const { env, prepare } = database()
    prepare.mockImplementation(() => { throw new Error("D1 unavailable") })
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const get = await onRequestGet({ request: new Request("http://localhost:8788/api/admin/promotion"), env, params: {} })
      const put = await onRequestPut({ request: write({ performanceDiscountPercent: 10 }), env, params: {} })

      expect(get.status).toBe(503)
      expect(put.status).toBe(503)
      expect(log).toHaveBeenCalled()
    } finally { log.mockRestore() }
  })

  it("defaults each actual menu category and Performance to zero", async () => {
    const { env } = database()
    const response = await onRequestGet({ request: new Request("http://localhost:8788/api/admin/promotion"), env, params: {} })
    const { data } = await response.json()

    expect(data.categories).toHaveLength(4)
    expect(data.categories.every((category: { discountPercent: number }) => category.discountPercent === 0)).toBe(true)
    expect(data.performanceDiscountPercent).toBe(0)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
  })

  it("saves, retries and disables only the chosen category, separately from Performance", async () => {
    const { env } = database({ "sweet-no-regrets": 25 })
    for (const percent of [10, 10, 0, 99]) {
      expect((await onRequestPut({ request: write({ categoryId: "coffee-bar", discountPercent: percent }), env, params: {} })).status).toBe(200)
      const settings = await readPromotions(env)
      expect(settings.categories.find(category => category.id === "coffee-bar")?.discountPercent).toBe(percent)
      expect(settings.categories.find(category => category.id === "sweet-no-regrets")?.discountPercent).toBe(25)
      expect(settings.performanceDiscountPercent).toBe(0)
    }
    for (const percent of [15, 0]) {
      expect((await onRequestPut({ request: write({ performanceDiscountPercent: percent }), env, params: {} })).status).toBe(200)
      expect((await readPromotions(env)).performanceDiscountPercent).toBe(percent)
    }
  })

  it("publishes distinct category prices including desserts, beverages and bottle/glass", async () => {
    const { env } = database({ "breakfast-brunch": 10, "sweet-no-regrets": 20, "wine-prosecco": 10 })
    const response = await menu({ request: new Request("http://localhost:8788/api/menu"), env, params: {} })
    const { data } = await response.json()

    expect(data[0].performanceDiscountPercent).toBe(0)
    expect(data[0].foodDiscountPercent).toBeUndefined()
    expect(data[0].categories[0].discountPercent).toBe(10)
    expect(data[0].categories[0].items[0]).toMatchObject({
      price: "32.40 lei", originalPrice: "36 lei", discountPercent: 10,
      macros: { calories: 500, protein: "20g", fat: "10g" },
    })
    expect(data[0].categories[1].items[0].price).toBe("24.00 lei")
    expect(data[1].categories[0].items[0].price).toBe("12 lei")
    expect(data[1].categories[1].items[0].price).toBe("90.00 / 25.20 lei")
    expect(data[1].categories[0].items[0].originalPrice).toBeUndefined()
  })

  it.each([{ categoryId: "coffee-bar", discountPercent: 10 }, { performanceDiscountPercent: 15 }])(
    "changes the public ETag for %j and rejects a stale conditional request", async update => {
      const { env } = database()
      const request = new Request("http://localhost:8788/api/menu")
      const before = await menu({ request, env, params: {} })
      await onRequestPut({ request: write(update), env, params: {} })
      const after = await menu({ request: new Request(request, {
        headers: { "If-None-Match": before.headers.get("ETag")! },
      }), env, params: {} })

      expect(after.status).toBe(200)
      expect(after.headers.get("ETag")).not.toBe(before.headers.get("ETag"))
    },
  )
})
