import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { describe, expect, it, vi } from "vitest"
import type { Env } from "./types"
import { onRequestGet, onRequestPut } from "../api/admin/healthy-deal"
import { onRequestGet as publicDeal } from "../api/healthy-deal"
import { readHealthyDeal } from "./healthy-deal"
import { defaultHealthyDealSettings, healthyDealItem } from "../../src/features/healthy-deal/schedule"
import { cartOptions, cartProductKey } from "../../src/features/cart/cart"
import { parseOrderInput, resolveOrder, UnavailableOrderError } from "./test-orders"
import { onRequestPost as uploadImage } from "../api/admin/upload"

function database() {
  let config: string | null = null
  let revision = 0
  const prepare = vi.fn((sql: string) => {
    let args: unknown[] = []
    return {
      bind(...values: unknown[]) { args = values; return this },
      async first<T>() {
        return (sql.includes("healthy_deal_settings") ? { config_json: config, revision }
          : { discount_percent: 0 }) as T
      },
      async all<T>() { return { results: [] as T[] } },
      async run() {
        if (sql.includes("UPDATE healthy_deal_settings") && args[1] === revision) {
          config = String(args[0]); revision++
          return { success: true, meta: { changes: 1 } }
        }
        return { success: true, meta: { changes: 0 } }
      },
    }
  })
  const env: Env = { LOCAL_TEST_ORDERS: "true", DB: { prepare, batch: vi.fn() },
    MEDIA: { put: vi.fn(), get: vi.fn(), delete: vi.fn() } }
  return { env, prepare }
}

function request(value?: unknown, origin = "http://localhost:8788") {
  return new Request("http://localhost:8788/api/admin/healthy-deal", value === undefined ? undefined : {
    method: "PUT", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(value),
  })
}
const settings = () => structuredClone(defaultHealthyDealSettings)

describe("Healthy Deal persistence and API", () => {
  it("protects admin reads/writes before database access and rejects cross-origin writes", async () => {
    const { env, prepare } = database()
    const document = { revision: 0, settings: settings() }
    const ctx = { request: request(document), env: { ...env, LOCAL_TEST_ORDERS: undefined }, params: {} }
    expect((await onRequestGet(ctx)).status).toBe(401)
    expect((await onRequestPut(ctx)).status).toBe(401)
    expect((await onRequestPut({ ...ctx, env, request: request(document, "https://evil.example") })).status).toBe(403)
    expect(prepare).not.toHaveBeenCalled()
  })

  it("persists changes across independent reads and rejects conflicting or repeated revisions", async () => {
    const { env } = database()
    const document = { revision: 0, settings: { ...settings(), priceBani: 4200 } }
    const ctx = { request: request(document), env, params: {} }
    expect((await onRequestPut(ctx)).status).toBe(200)
    const loaded = await onRequestGet({ ...ctx, request: request() })
    expect(loaded.headers.get("Cache-Control")).toBe("no-store")
    expect(await loaded.json()).toEqual({ data: { ...document, revision: 1 } })
    expect((await onRequestPut({ ...ctx, request: request(document) })).status).toBe(409)
    expect((await readHealthyDeal(env)).revision).toBe(1)
  })

  it.each([null, {}, { revision: -1, settings: settings() },
    { revision: 0, settings: { ...settings(), priceBani: 0 } }])("rejects malformed configuration %#", async value => {
    const { env, prepare } = database()
    expect((await onRequestPut({ request: request(value), env, params: {} })).status).toBe(400)
    expect(prepare).not.toHaveBeenCalled()
  })

  it("rejects invalid JSON and oversized UTF-8 requests", async () => {
    const { env } = database()
    for (const [body, status] of [["{", 400], ["ă".repeat(262145), 413]] as const) {
      const req = new Request("http://localhost:8788/api/admin/healthy-deal", {
        method: "PUT", headers: { Origin: "http://localhost:8788" }, body,
      })
      expect((await onRequestPut({ request: req, env, params: {} })).status).toBe(status)
    }
  })

  it("does not publish disabled draft contents but preserves a date closure", async () => {
    const { env } = database()
    const config = settings()
    config.overrides["2026-11-02"] = { ...config.weekly["1"]!, enabled: false,
      main: { ...config.weekly["1"]!.main, name: "DRAFT SECRET" } }
    await onRequestPut({ request: request({ revision: 0, settings: config }), env, params: {} })
    const response = await publicDeal({ request: request(), env, params: {} })
    const json = await response.json()
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(JSON.stringify(json)).not.toContain("DRAFT SECRET")
    expect(json.data.settings.overrides["2026-11-02"].enabled).toBe(false)
    expect(Number.isFinite(Date.parse(json.data.serverTime))).toBe(true)
  })

  it("fails explicitly when persistence is unavailable", async () => {
    const { env, prepare } = database()
    prepare.mockImplementation(() => { throw new Error("Missing migration") })
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const ctx = { request: request(), env, params: {} }
      expect((await publicDeal(ctx)).status).toBe(503)
      expect((await onRequestGet(ctx)).status).toBe(503)
      expect((await onRequestPut({ ...ctx, request: request({ revision: 0, settings: settings() }) })).status).toBe(503)
      expect(log).toHaveBeenCalled()
    } finally { log.mockRestore() }
  })

  it("creates an isolated D1 configuration and puts the category first without changing existing items", () => {
    const db = new DatabaseSync(":memory:")
    try {
      db.exec("CREATE TABLE categories(id TEXT PRIMARY KEY, group_id TEXT, label TEXT, label_en TEXT, icon_key TEXT, sort_order INTEGER); INSERT INTO categories VALUES ('breakfast','food','Mic dejun',NULL,'fork-knife',0);")
      db.exec(readFileSync(new URL("../../migrations/0023_healthy_deal.sql", import.meta.url), "utf8"))
      expect(db.prepare("SELECT id FROM categories ORDER BY sort_order LIMIT 1").get()?.id).toBe("healthy-deal")
      expect(db.prepare("SELECT revision,config_json FROM healthy_deal_settings").get()).toMatchObject({ revision: 0, config_json: null })
    } finally { db.close() }
  })

  it("supports local admin image uploads without weakening production authentication or origin checks", async () => {
    const { env } = database()
    const upload = (origin: string) => new Request("http://localhost:8788/api/admin/upload", {
      method: "POST", headers: { Origin: origin, "Content-Type": "image/png" }, body: new Uint8Array([1, 2, 3]),
    })
    expect((await uploadImage({ request: upload("http://localhost:8788"), env: { ...env, LOCAL_TEST_ORDERS: undefined }, params: {} })).status).toBe(401)
    expect((await uploadImage({ request: upload("https://evil.example"), env, params: {} })).status).toBe(403)
    const response = await uploadImage({ request: upload("http://localhost:8788"), env, params: {} })
    expect(response.status).toBe(201)
    expect((await response.json()).data.url).toMatch(/^\/api\/images\/[\da-f-]+$/)
    expect(env.MEDIA.put).toHaveBeenCalledTimes(1)
  })
})

describe("Healthy Deal server-side cart resolution", () => {
  const now = new Date("2026-11-02T11:00:00Z")
  const contact = { name: "Client Test", phone: "0721123456", email: "test@example.ro" }
  function input() {
    const item = healthyDealItem(settings(), 0, now)!
    const product = cartOptions("healthy-deal", item)[0]
    return parseOrderInput({ contact, items: [{ ...product, name: "Client price tampering", quantity: 2 }], expectedTotalBani: 1 })
  }
  it("uses the current server price and official name, without fake stock reservations", async () => {
    const { env } = database()
    const resolved = await resolveOrder(input(), env, now)
    expect(resolved.totalBani).toBe(7800)
    expect(resolved.lines[0].name).toContain("Stir Fry")
    expect(resolved.reservations).toEqual([])
  })
  it.each(["2026-11-02T09:59:59Z", "2026-11-02T14:00:00Z", "2026-11-03T11:00:00Z"])(
    "rejects an expired, premature or different-day cart at %s", async date => {
      const { env } = database()
      await expect(resolveOrder(input(), env, new Date(date))).rejects.toBeInstanceOf(UnavailableOrderError)
    },
  )
  it("rejects a stale cart after admin changes or closes the offer", async () => {
    const { env } = database()
    await onRequestPut({ request: request({ revision: 0, settings: { ...settings(), enabled: false } }), env, params: {} })
    await expect(resolveOrder(input(), env, now)).rejects.toBeInstanceOf(UnavailableOrderError)
  })
  it("invalidates old revisions after a price edit and resolves the new price", async () => {
    const { env } = database()
    const config = { ...settings(), priceBani: 4200 }
    await onRequestPut({ request: request({ revision: 0, settings: config }), env, params: {} })
    await expect(resolveOrder(input(), env, now)).rejects.toBeInstanceOf(UnavailableOrderError)
    const product = cartOptions("healthy-deal", healthyDealItem(config, 1, now)!)[0]
    const current = parseOrderInput({ contact, items: [{ ...product, quantity: 2 }], expectedTotalBani: 1 })
    expect((await resolveOrder(current, env, now)).totalBani).toBe(8400)
  })
  it("does not accept an unscheduled legacy product identity in the reserved category", async () => {
    const { env } = database()
    const invalid = input()
    invalid.items[0].key = cartProductKey("healthy-deal", "Invented menu")
    await expect(resolveOrder(invalid, env, now)).rejects.toBeInstanceOf(UnavailableOrderError)
  })
})
