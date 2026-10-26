import { describe, expect, it, vi } from "vitest"
import { guardTestOrders, orderRequestHash, parseOrderInput, resolveOrder, testOrdersEnabled, UnavailableOrderError, type OrderRow } from "./test-orders"
import type { Env } from "./types"
import { cartProductKey, performanceCartProduct } from "../../src/features/cart/cart"
import { canTransition, preparationStatuses } from "../../src/features/orders/types"
import { onRequestPost } from "../api/orders/index"
import { onRequestPatch } from "../api/admin/orders/[number]"
import { onRequestGet as listOrders } from "../api/admin/orders/index"
import { onRequestGet as orderConfig } from "../api/orders/config"

const contact = { name: "Client Test", phone: "0721123456", email: "test@example.ro" }
const item = { key: cartProductKey("breakfast", "Toast"), name: "Tampered client name", quantity: 2 }
const body = { contact, items: [item], expectedTotalBani: 7200 }
const key = "00000000-0000-4000-8000-000000000001"

function database(categoryId = "breakfast", discountPercent = 0, groupId = "food", performancePercent = 0) {
  const rows = new Map<string, OrderRow>()
  const prepare = vi.fn((sql: string) => {
    let args: unknown[] = []
    return {
      bind(...values: unknown[]) { args = values; return this },
      async first<T>() {
        if (sql.includes("FROM performance_promotion")) return { discount_percent: performancePercent } as T
        const row = sql.includes("idempotency_key") ? rows.get(String(args[0]))
          : [...rows.values()].find(row => row.number === args[0])
        return (row ?? null) as T | null
      },
      async all<T>() {
        if (sql.includes("LEFT JOIN category_promotions")) return { results: [{
          id: categoryId, group_id: groupId, label: "Test category", discount_percent: discountPercent,
        }] as T[] }
        return { results: [{
          category_id: categoryId, group_id: groupId, name: "Toast", price: "36 lei", description: "Toast",
        }] as T[] }
      },
      async run() {
        if (sql.startsWith("INSERT")) {
          const [number, idempotency, hash, created, name, phone, email, total, lines] = args
          if (!rows.has(String(idempotency))) rows.set(String(idempotency), {
            number: String(number), request_hash: String(hash), preparation_status: "new", created_at: String(created),
            contact_name: String(name), contact_phone: String(phone), contact_email: String(email),
            total_bani: Number(total), lines_json: String(lines),
          })
        } else if (sql.startsWith("UPDATE")) {
          const row = [...rows.values()].find(row => row.number === args[1])
          const status = preparationStatuses.find(status => status === args[0])
          if (row && status && row.preparation_status === args[2]) row.preparation_status = status
        }
        return { success: true }
      },
    }
  })
  const env: Env = {
    LOCAL_TEST_ORDERS: "true", DB: { prepare, batch: vi.fn(async statements => {
      for (const statement of statements) await statement.run()
      return []
    }) },
    MEDIA: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
  }
  return { env, rows, prepare }
}

function request(value: unknown = body, origin = "http://localhost:8788") {
  return new Request(`${origin}/api/orders`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(value),
  })
}

describe("local TEST order boundaries", () => {
  it.each(["https://alive-bistro.pages.dev", "https://example.com", "http://192.168.1.10:8788"])(
    "refuses a public or LAN host %s even with the flag enabled", async origin => {
      const { env, prepare } = database()
      expect(testOrdersEnabled(request(body, origin), env)).toBe(false)
      expect((await onRequestPost({ request: request(body, origin), env, params: {} })).status).toBe(403)
      expect(prepare).not.toHaveBeenCalled()
    },
  )
  it("requires the explicit flag and a same-origin write", () => {
    const { env } = database()
    expect(testOrdersEnabled(request(), { ...env, LOCAL_TEST_ORDERS: undefined })).toBe(false)
    const forged = new Request("http://localhost:8788/api/orders", { method: "POST", headers: { Origin: "https://example.com" } })
    expect(guardTestOrders(forged, env, true)?.status).toBe(403)
    expect(guardTestOrders(request(), env, true)).toBeNull()
  })
  it("disables config, listing and writes without the local flag", async () => {
    const { env: enabled, prepare } = database()
    const env = { ...enabled, LOCAL_TEST_ORDERS: undefined }
    const ctx = { request: request(), env, params: {} }
    expect((await orderConfig(ctx).json()).data.testOrdersEnabled).toBe(false)
    expect((await listOrders(ctx)).status).toBe(403)
    expect((await onRequestPost(ctx)).status).toBe(403)
    expect(prepare).not.toHaveBeenCalled()
  })
  it("enforces the 64 KiB body limit in UTF-8 bytes", async () => {
    const { env, prepare } = database()
    const tooLarge = new Request("http://localhost:8788/api/orders", {
      method: "POST", headers: { Origin: "http://localhost:8788", "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify({ padding: "ă".repeat(32768) }),
    })
    expect((await onRequestPost({ request: tooLarge, env, params: {} })).status).toBe(413)
    expect(prepare).not.toHaveBeenCalled()
  })
  it("rejects invalid contacts, empty carts, duplicate lines and excessive quantities", () => {
    for (const invalid of [
      null, {}, { ...body, contact: { ...contact, email: "invalid" } },
      { ...body, items: [] }, { ...body, items: [item, item] },
      { ...body, items: [{ ...item, quantity: 100 }] }, { ...body, expectedTotalBani: 1.5 },
    ]) expect(() => parseOrderInput(invalid)).toThrow()
  })
  it("recalculates regular and Performance prices on the server", async () => {
    const { env } = database()
    const plate = performanceCartProduct({ protein: { ingredientId: "chicken", amount: 100 } })
    const input = parseOrderInput({ ...body, items: [item, { ...plate, quantity: 1 }] })
    const resolved = await resolveOrder(input, env)
    expect(resolved.totalBani).toBe(8400)
    expect(resolved.lines[0].name).toBe("Toast")
    expect(resolved.lines[1].ingredients).toEqual([{ id: "chicken", amount: 100, unit: "g" }])
  })
  it("applies category and independent Performance promotions exactly once on the server", async () => {
    const { env } = database("breakfast", 10, "food", 25)
    const plate = performanceCartProduct({ protein: { ingredientId: "chicken", amount: 100 } })
    const input = parseOrderInput({ ...body, items: [item, { ...plate, quantity: 1 }] })

    const resolved = await resolveOrder(input, env)

    expect(resolved.lines.map(line => line.priceBani)).toEqual([3240, 900])
    expect(resolved.totalBani).toBe(7380)
  })
  it("rejects a stale checkout total after activation and saves the discounted total", async () => {
    const { env, rows } = database("breakfast", 10)
    const stale = await onRequestPost({ request: request(), env, params: {} })

    expect(stale.status).toBe(409)
    expect(rows.size).toBe(0)

    const discounted = await onRequestPost({
      request: request({ ...body, expectedTotalBani: 6480 }), env, params: {},
    })
    expect(discounted.status).toBe(201)
    expect((await discounted.json()).data.totalBani).toBe(6480)
  })
  it.each([["sweet-no-regrets", "food"], ["coffee-bar", "drinks"]])(
    "supports a configured discount for %s on the server", async (categoryId, groupId) => {
      const { env } = database(categoryId, 10, groupId)
      const input = parseOrderInput({ ...body, items: [{
        ...item, key: cartProductKey(categoryId, "Toast"),
      }] })

      const resolved = await resolveOrder(input, env)

      expect(resolved.totalBani).toBe(6480)
    },
  )
  it("does not inherit a category discount for Performance", async () => {
    const { env } = database("breakfast", 50)
    const plate = performanceCartProduct({ protein: { ingredientId: "chicken", amount: 100 } })

    const resolved = await resolveOrder(parseOrderInput({ ...body, items: [{ ...plate, quantity: 1 }] }), env)

    expect(resolved.totalBani).toBe(1200)
  })
  it.each(["craft-beer", "wine-prosecco", "cocktails"])("rejects forged orders from %s without persisting", async categoryId => {
    const { env, rows } = database(categoryId)
    const forged = { ...body, items: [{ ...item, key: cartProductKey(categoryId, "Toast") }] }

    await expect(resolveOrder(parseOrderInput(forged), env)).rejects.toBeInstanceOf(UnavailableOrderError)
    expect((await onRequestPost({ request: request(forged), env, params: {} })).status).toBe(409)
    expect(rows.size).toBe(0)
  })
  it("hashes normalized requests consistently and detects changed quantities", async () => {
    const first = parseOrderInput(body)
    expect(await orderRequestHash(first)).toBe(await orderRequestHash(parseOrderInput({ ...body, contact: { ...contact, name: " Client Test " } })))
    expect(await orderRequestHash(first)).not.toBe(await orderRequestHash(parseOrderInput({ ...body, items: [{ ...item, quantity: 1 }] })))
  })
})

describe("TEST order persistence", () => {
  it("creates one unpaid order and reuses it on retries", async () => {
    const { env, rows } = database()
    const first = await onRequestPost({ request: request(), env, params: {} })
    const saved = await first.json()
    const retry = await onRequestPost({ request: request(), env, params: {} })
    expect(first.status).toBe(201)
    expect(retry.status).toBe(200)
    expect((await retry.json()).data.number).toBe(saved.data.number)
    expect(saved.data).toMatchObject({ mode: "TEST", paymentStatus: "unpaid", preparationStatus: "new", totalBani: 7200 })
    expect(rows.size).toBe(1)
  })
  it("persists just one order for concurrent identical submissions", async () => {
    const { env, rows } = database()
    const responses = await Promise.all([1, 2].map(() => onRequestPost({ request: request(), env, params: {} })))
    const orders = await Promise.all(responses.map(response => response.json()))
    expect(rows.size).toBe(1)
    expect(orders[0].data.number).toBe(orders[1].data.number)
  })
  it("rejects key reuse with a different request", async () => {
    const { env, rows } = database()
    await onRequestPost({ request: request(), env, params: {} })
    const conflict = await onRequestPost({ request: request({ ...body, contact: { ...contact, name: "Different Test" } }), env, params: {} })
    expect(conflict.status).toBe(409)
    expect(rows.size).toBe(1)
  })
  it("rejects stale totals and unavailable products without saving", async () => {
    const { env, rows } = database()
    expect((await onRequestPost({ request: request({ ...body, expectedTotalBani: 1 }), env, params: {} })).status).toBe(409)
    expect((await onRequestPost({ request: request({ ...body, items: [{ ...item, key: "missing" }] }), env, params: {} })).status).toBe(409)
    expect(rows.size).toBe(0)
  })
  it("changes preparation independently of payment, with conflict detection", async () => {
    const { env } = database()
    const saved = await (await onRequestPost({ request: request(), env, params: {} })).json()
    const patch = (value: unknown) => onRequestPatch({
      request: new Request(`http://localhost:8788/api/admin/orders/${saved.data.number}`, {
        method: "PATCH", headers: { Origin: "http://localhost:8788", "Content-Type": "application/json" },
        body: JSON.stringify(value),
      }), env, params: { number: saved.data.number },
    })
    const response = await patch({ expectedStatus: "new", status: "preparing" })
    expect((await response.json()).data).toMatchObject({ paymentStatus: "unpaid", preparationStatus: "preparing" })
    expect((await patch({ expectedStatus: "new", status: "cancelled" })).status).toBe(409)
    expect((await patch({ expectedStatus: "preparing", status: "ready", paymentStatus: "paid" })).status).toBe(400)
    expect((await patch({ expectedStatus: "preparing", status: "collected" })).status).toBe(409)
  })
  it("does not allow backwards transitions or reopening terminal states", () => {
    expect(canTransition("ready", "new")).toBe(false)
    expect(canTransition("collected", "preparing")).toBe(false)
    expect(canTransition("cancelled", "new")).toBe(false)
    expect(canTransition("ready", "collected")).toBe(true)
  })
})
