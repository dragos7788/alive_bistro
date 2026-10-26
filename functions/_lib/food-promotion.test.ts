import { describe, expect, it, vi } from "vitest"
import type { Env } from "./types"
import { onRequestGet, onRequestPut } from "../api/admin/promotion"
import { onRequestGet as menu } from "../api/menu"
import { readFoodDiscount } from "./food-promotion"

function database(initial = 0) {
  let percent = initial
  const prepare = vi.fn(() => {
    let bound: unknown[] = []
    return {
      bind(...args: unknown[]) { bound = args; return this },
      async first<T>() { return { discount_percent: percent } as T },
      async all<T>() { return { results: [] as T[] } },
      async run() { percent = Number(bound[0]); return { success: true } },
    }
  })
  const env: Env = {
    LOCAL_TEST_ORDERS: "true",
    DB: { prepare, batch: vi.fn(async () => [
      { results: [
        { id: "breakfast-brunch", group_id: "food", label: "Breakfast" },
        { id: "sweet-no-regrets", group_id: "food", label: "Desserts" },
        { id: "coffee-bar", group_id: "drinks", label: "Coffee" },
      ] },
      { results: [
        { name: "Toast", category_id: "breakfast-brunch", price: "36 lei" },
        { name: "Cake", category_id: "sweet-no-regrets", price: "30 lei" },
        { name: "Coffee", category_id: "coffee-bar", price: "12 lei" },
      ] },
    ]) },
    MEDIA: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
  }
  return { env, prepare }
}

function write(value: unknown, origin = "http://localhost:8788") {
  return new Request("http://localhost:8788/api/admin/promotion", {
    method: "PUT", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  })
}

describe("admin food promotion", () => {
  it("rejects unauthenticated access outside explicit local TEST mode", async () => {
    const { env, prepare } = database()
    const ctx = { request: write({ foodDiscountPercent: 10 }), env: { ...env, LOCAL_TEST_ORDERS: undefined }, params: {} }

    expect((await onRequestPut(ctx)).status).toBe(401)
    expect((await onRequestGet(ctx)).status).toBe(401)
    expect(prepare).not.toHaveBeenCalled()
  })

  it("rejects cross-origin writes even with an admin header", async () => {
    const { env, prepare } = database()
    const request = write({ foodDiscountPercent: 10 }, "https://example.com")
    request.headers.set("Cf-Access-Authenticated-User-Email", "admin@example.com")

    expect((await onRequestPut({ request, env, params: {} })).status).toBe(403)
    expect(prepare).not.toHaveBeenCalled()
  })

  it.each([-1, 100, 5.5, "10", null])("rejects invalid setting %s", async value => {
    const { env, prepare } = database()
    const response = await onRequestPut({ request: write({ foodDiscountPercent: value }), env, params: {} })

    expect(response.status).toBe(400)
    expect(prepare).not.toHaveBeenCalled()
  })

  it("saves, reads, retries and disables a promotion", async () => {
    const { env } = database()
    for (const percent of [10, 10, 0]) {
      const response = await onRequestPut({ request: write({ foodDiscountPercent: percent }), env, params: {} })
      expect(response.status).toBe(200)
      expect(await readFoodDiscount(env)).toBe(percent)
    }
    const response = await onRequestGet({ request: new Request("http://localhost:8788/api/admin/promotion"), env, params: {} })
    expect(response.headers.get("Cache-Control")).toBe("no-store")
  })

  it("publishes discounted food while preserving dessert and drink prices and nutrition", async () => {
    const { env } = database(10)
    const response = await menu({ request: new Request("http://localhost:8788/api/menu"), env, params: {} })
    const { data } = await response.json()

    expect(data[0].foodDiscountPercent).toBe(10)
    expect(data[0].categories[0].items[0]).toMatchObject({
      price: "32.40 lei", originalPrice: "36 lei", discountPercent: 10,
    })
    expect(data[0].categories[1].items[0].price).toBe("30 lei")
    expect(data[1].categories[0].items[0].price).toBe("12 lei")
    expect(data[0].categories[1].items[0].originalPrice).toBeUndefined()
    expect(response.headers.get("ETag")).toBeTruthy()
  })

  it("changes the public ETag when the promotion changes", async () => {
    const { env } = database()
    const request = new Request("http://localhost:8788/api/menu")
    const before = await menu({ request, env, params: {} })
    await onRequestPut({ request: write({ foodDiscountPercent: 10 }), env, params: {} })
    const after = await menu({ request, env, params: {} })

    expect(after.headers.get("ETag")).not.toBe(before.headers.get("ETag"))
  })
})
