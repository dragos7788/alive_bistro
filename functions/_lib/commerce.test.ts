import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { describe, expect, it, vi } from "vitest"
import type { Env } from "./types"
import { onRequestGet, onRequestPut } from "../api/admin/commerce"
import { onRequestGet as publicSettings } from "../api/commerce"
import { onRequestPost as submitOrder } from "../api/orders/index"
import { onRequestGet as orderConfig } from "../api/orders/config"

function database() {
  let enabled = 1
  const prepare = vi.fn(() => {
    let value: unknown
    return {
      bind(...args: unknown[]) { value = args[0]; return this },
      async first<T>() { return { sales_enabled: enabled } as T },
      async all<T>() { return { results: [] as T[] } },
      async run() { enabled = Number(value); return { success: true } },
    }
  })
  const env: Env = {
    LOCAL_TEST_ORDERS: "true",
    DB: { prepare, batch: vi.fn() },
    MEDIA: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
  }
  return { env, prepare }
}

function write(value: unknown, origin = "http://localhost:8788") {
  return new Request("http://localhost:8788/api/admin/commerce", {
    method: "PUT", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  })
}

describe("global commerce settings", () => {
  it("protects admin reads and writes before accessing the database", async () => {
    const { env, prepare } = database()
    const ctx = { request: write({ salesEnabled: false }), env: { ...env, LOCAL_TEST_ORDERS: undefined }, params: {} }

    expect((await onRequestGet(ctx)).status).toBe(401)
    expect((await onRequestPut(ctx)).status).toBe(401)
    expect(prepare).not.toHaveBeenCalled()
  })

  it("rejects cross-origin writes", async () => {
    const { env, prepare } = database()
    const response = await onRequestPut({ request: write({ salesEnabled: false }, "https://example.com"), env, params: {} })

    expect(response.status).toBe(403)
    expect(prepare).not.toHaveBeenCalled()
  })

  it.each([null, [], {}, { salesEnabled: 0 }, { salesEnabled: "false" }, { salesEnabled: null },
    { salesEnabled: false, extra: true }])("rejects invalid input %j", async value => {
    const { env, prepare } = database()
    const response = await onRequestPut({ request: write(value), env, params: {} })

    expect(response.status).toBe(400)
    expect(prepare).not.toHaveBeenCalled()
  })

  it.each([["{", 400], ["x".repeat(1025), 413]] as const)("rejects malformed or oversized bodies", async (body, status) => {
    const { env, prepare } = database()
    const request = new Request("http://localhost:8788/api/admin/commerce", {
      method: "PUT", headers: { Origin: "http://localhost:8788" }, body,
    })

    expect((await onRequestPut({ request, env, params: {} })).status).toBe(status)
    expect(prepare).not.toHaveBeenCalled()
  })

  it("persists disabling, identical retries and re-enabling for public and admin reads without caching", async () => {
    const { env } = database()
    for (const salesEnabled of [true, false, false, true]) {
      const saved = await onRequestPut({ request: write({ salesEnabled }), env, params: {} })
      expect(saved.status).toBe(200)
      expect(await saved.json()).toEqual({ data: { salesEnabled } })
      for (const handler of [onRequestGet, publicSettings]) {
        const response = await handler({ request: new Request("http://localhost:8788/api/commerce"), env, params: {} })
        expect(await response.json()).toEqual({ data: { salesEnabled } })
        expect(response.headers.get("Cache-Control")).toBe("no-store")
      }
    }
  })

  it("fails closed and explicitly reports missing settings or database failures", async () => {
    const { env, prepare } = database()
    prepare.mockImplementation(() => { throw new Error("Missing migration") })
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const response = await publicSettings({ request: new Request("http://localhost:8788/api/commerce"), env, params: {} })
      const saved = await onRequestPut({ request: write({ salesEnabled: false }), env, params: {} })

      expect(response.status).toBe(503)
      expect(saved.status).toBe(503)
      expect(await response.json()).toHaveProperty("error.code", "COMMERCE_ERROR")
      expect(log).toHaveBeenCalled()
    } finally { log.mockRestore() }
  })

  it("blocks direct order submissions when sales are disabled without inserting orders", async () => {
    const { env } = database()
    await onRequestPut({ request: write({ salesEnabled: false }), env, params: {} })
    const request = new Request("http://localhost:8788/api/orders", {
      method: "POST",
      headers: { Origin: "http://localhost:8788", "Content-Type": "application/json",
        "Idempotency-Key": "00000000-0000-4000-8000-000000000001" },
      body: JSON.stringify({
        contact: { name: "Test", phone: "0721123456", email: "test@example.ro" },
        items: [{ key: "test", name: "Test", quantity: 1 }], expectedTotalBani: 1000,
      }),
    })

    const response = await submitOrder({ request, env, params: {} })

    expect(response.status).toBe(403)
    expect(await response.json()).toHaveProperty("error.code", "SALES_DISABLED")
    expect(env.DB.batch).not.toHaveBeenCalled()
  })

  it("only exposes local TEST submission when sales are enabled as well", async () => {
    const { env } = database()
    for (const salesEnabled of [true, false]) {
      await onRequestPut({ request: write({ salesEnabled }), env, params: {} })
      const request = new Request("http://localhost:8788/api/orders/config")

      const response = await orderConfig({ request, env, params: {} })

      expect(await response.json()).toEqual({ data: { testOrdersEnabled: salesEnabled } })
    }
  })
})

describe("commerce database boundary", () => {
  it("defaults to enabled, blocks in-flight inserts after disabling and preserves existing orders", () => {
    const db = new DatabaseSync(":memory:")
    try {
      for (const migration of ["0001_init.sql", "0002_test_orders.sql", "0018_commerce_settings.sql"]) {
        db.exec(readFileSync(new URL(`../../migrations/${migration}`, import.meta.url), "utf8"))
      }
      const create = (number: string) => db.prepare(`INSERT INTO test_orders
        (number,idempotency_key,request_hash,created_at,contact_name,contact_phone,contact_email,total_bani,lines_json)
        VALUES (?,?,'hash','2026-10-27','Test','0721123456','test@example.ro',1000,'[]')`).run(number, number)

      expect(db.prepare("SELECT sales_enabled FROM commerce_settings WHERE id=1").get()?.sales_enabled).toBe(1)
      create("first")
      db.exec("UPDATE commerce_settings SET sales_enabled=0 WHERE id=1")
      expect(() => create("blocked")).toThrow("SALES_DISABLED")
      db.exec("UPDATE test_orders SET preparation_status='preparing' WHERE number='first'")
      expect(db.prepare("SELECT count(*) AS count FROM test_orders").get()?.count).toBe(1)
      db.exec("UPDATE commerce_settings SET sales_enabled=1 WHERE id=1")
      create("resumed")
      expect(db.prepare("SELECT count(*) AS count FROM test_orders").get()?.count).toBe(2)
    } finally { db.close() }
  })
})
