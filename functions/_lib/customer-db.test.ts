import { readFileSync } from "node:fs"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Env } from "./types"
import { recordCumulativeRefund, recordSettledPayment } from "./loyalty"
import { authCookie, randomToken, sessionCustomer, tokenHash } from "./customer-auth"
import { onRequestPost as start } from "../api/customer/start"
import { onRequestPost as logout } from "../api/customer/logout"
import { onRequestGet as callback } from "../api/customer/callback"
import { onRequestGet as me } from "../api/customer/me"
import { onRequestPost as generateVoucher } from "../api/customer/vouchers"
import { onRequestGet as adminLoyalty } from "../api/admin/loyalty"

vi.mock("./customer-auth", async importOriginal => {
  const original = await importOriginal<typeof import("./customer-auth")>()
  return { ...original, providerIdentity: vi.fn(async () => ({ subject: "google-sub", name: "Test", email: "test@example.com" })) }
})

describe("Customer identity and loyalty persistence", () => {
  let db: DatabaseSync
  let env: Env
  beforeEach(() => {
    db = new DatabaseSync(":memory:")
    db.exec("PRAGMA foreign_keys=ON")
    db.exec(readFileSync(new URL("../../migrations/0005_customer_accounts.sql", import.meta.url), "utf8"))
    db.exec(readFileSync(new URL("../../migrations/0010_customer_vouchers.sql", import.meta.url), "utf8"))
    db.exec(readFileSync(new URL("../../migrations/0011_customer_voucher_redemption.sql", import.meta.url), "utf8"))
    // Adapter executes real SQLite, including atomic rollback and trigger behavior.
    const bound = new WeakMap<object, () => void>()
    const prepare: Env["DB"]["prepare"] = sql => {
      let values: SQLInputValue[] = []
      const statement = {
        bind(...args: unknown[]) {
          values = args.map(arg => {
            if (arg === null || typeof arg === "string" || typeof arg === "number") return arg
            throw new Error("Unsupported SQL value")
          })
          return statement
        },
        async first<T>() { return (db.prepare(sql).get(...values) ?? null) as T | null },
        async all<T>() { return { results: db.prepare(sql).all(...values) as T[] } },
        async run() { const result = db.prepare(sql).run(...values); return { success: true, meta: { changes: Number(result.changes) } } },
      }
      bound.set(statement, () => { db.prepare(sql).run(...values) })
      return statement
    }
    env = {
      AUTH_ORIGIN: "http://localhost:8792", GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "secret",
      DB: {
        prepare,
        async batch(statements) {
          db.exec("BEGIN")
          try {
            for (const stmt of statements) bound.get(stmt)!()
            db.exec("COMMIT")
            return []
          } catch (error) { db.exec("ROLLBACK"); throw error }
        },
      },
      MEDIA: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
    }
    db.exec(`INSERT INTO customers VALUES ('coach','Coach',NULL,'AAAAAAAAAAAAAAAA',NULL,1);
      INSERT INTO customers VALUES ('buyer','Buyer',NULL,'BBBBBBBBBBBBBBBB','coach',2);
      INSERT INTO customers VALUES ('other','Other',NULL,'CCCCCCCCCCCCCCCC',NULL,3)`)
  })
  afterEach(() => db.close())

  const payment = { paymentId: "bank-1", orderId: "ORDER-1", customerId: "buyer", amountBani: 4990, currency: "RON" as const }
  const points = (id: string) => db.prepare("SELECT COALESCE(SUM(points_delta),0) AS points FROM loyalty_ledger WHERE customer_id=?").get(id)?.points
  function post(path: string, body: unknown, cookie = "") {
    return new Request(`http://localhost:8792/api/customer/${path}`, {
      method: "POST", headers: { Origin: env.AUTH_ORIGIN!, Cookie: cookie }, body: JSON.stringify(body),
    })
  }
  async function login(referral = "", link = false, cookie = "") {
    const response = await start({ request: post("start", { provider: "google", referral, link }, cookie), env, params: {} })
    const { data } = await response.json()
    const state = new URL(data.url).searchParams.get("state")
    const oauthCookie = response.headers.get("Set-Cookie")!.split(";")[0]
    const request = new Request(`http://localhost:8792/api/customer/callback?code=example&state=${state}`, {
      headers: { Cookie: `${oauthCookie}; ${cookie}` },
    })
    return { request, response: await callback({ request, env, params: {} }) }
  }

  it("awards whole-leu points once to buyer and direct referrer for every purchase", async () => {
    await recordSettledPayment(env, payment)
    await recordSettledPayment(env, payment)
    await recordSettledPayment(env, { ...payment, paymentId: "bank-2", orderId: "ORDER-2", amountBani: 1050 })
    expect(points("buyer")).toBe(59)
    expect(points("coach")).toBe(59)
    expect(points("other")).toBe(0)
    await expect(recordSettledPayment(env, { ...payment, amountBani: 5000 })).rejects.toThrow("CONFLICT")
  })
  it("does not award second-level referral points", async () => {
    db.exec("INSERT INTO customers VALUES ('third','Third',NULL,'DDDDDDDDDDDDDDDD','buyer',4)")
    await recordSettledPayment(env, { ...payment, customerId: "third" })
    expect(points("third")).toBe(49)
    expect(points("buyer")).toBe(49)
    expect(points("coach")).toBe(0)
  })
  it("reverses partial and full refunds once for both beneficiaries", async () => {
    await recordSettledPayment(env, payment)
    await recordCumulativeRefund(env, payment.paymentId, 1000)
    await recordCumulativeRefund(env, payment.paymentId, 1000)
    expect(points("buyer")).toBe(39)
    expect(points("coach")).toBe(39)
    await recordCumulativeRefund(env, payment.paymentId, 4990)
    expect(points("buyer")).toBe(0)
    expect(points("coach")).toBe(0)
    await expect(recordCumulativeRefund(env, payment.paymentId, 5000)).rejects.toThrow("INVALID_REFUND")
    await expect(recordCumulativeRefund(env, payment.paymentId, 0)).rejects.toThrow("INVALID_REFUND")
  })
  it("grants one welcome voucher to newly registered customers", async () => {
    const { response } = await login()
    expect(response.status).toBe(303)
    const customer = db.prepare("SELECT id FROM customers WHERE email='test@example.com'").get() as { id: string }
    const voucher = db.prepare("SELECT source,discount_percent,expires_at-created_at AS validity FROM customer_vouchers WHERE customer_id=?")
      .get(customer.id) as { source: string; discount_percent: number; validity: number }
    expect(voucher).toEqual({ source: "welcome", discount_percent: 10, validity: 30 * 24 * 60 * 60 })
    await login()
    expect(db.prepare("SELECT count(*) AS n FROM customer_vouchers WHERE customer_id=? AND source='welcome'")
      .get(customer.id)?.n).toBe(1)
  })
  it("backfills a single welcome voucher for customers who already exist at migration time", () => {
    const legacyDb = new DatabaseSync(":memory:")
    try {
      legacyDb.exec("PRAGMA foreign_keys=ON")
      legacyDb.exec(readFileSync(new URL("../../migrations/0005_customer_accounts.sql", import.meta.url), "utf8"))
      legacyDb.exec("INSERT INTO customers VALUES ('legacy','Legacy',NULL,'LEGACY0000000001',NULL,1)")
      legacyDb.exec(readFileSync(new URL("../../migrations/0010_customer_vouchers.sql", import.meta.url), "utf8"))
      const voucher = legacyDb.prepare(`SELECT source,discount_percent,expires_at-created_at AS validity
        FROM customer_vouchers WHERE customer_id='legacy'`).get()
      expect(voucher).toEqual({ source: "welcome", discount_percent: 10, validity: 30 * 24 * 60 * 60 })
    } finally {
      legacyDb.close()
    }
  })
  it("exchanges each 1,000 points for one 10% voucher and deducts the points", async () => {
    await recordSettledPayment(env, { ...payment, amountBani: 200000 })
    const token = randomToken()
    db.prepare("INSERT INTO customer_sessions VALUES (?,?,?)")
      .run(await tokenHash(token), "buyer", Math.floor(Date.now() / 1000) + 100)
    const request = post("vouchers", {}, `alive_session=${token}`)

    const first = await generateVoucher({ request, env, params: {} })
    expect(first.status).toBe(201)
    const firstVoucher = (await first.json() as { data: { source: string; code: string; discountPercent: number; createdAt: number; expiresAt: number } }).data
    expect(firstVoucher).toMatchObject({ source: "points", discountPercent: 10 })
    expect(firstVoucher.code).toMatch(/^ALIVE-[A-Z0-9_-]{12}$/)
    expect(firstVoucher.expiresAt - firstVoucher.createdAt).toBe(30 * 24 * 60 * 60)

    const second = await generateVoucher({ request, env, params: {} })
    expect(second.status).toBe(201)
    const third = await generateVoucher({ request, env, params: {} })
    expect(third.status).toBe(409)

    const profile = await me({
      request: new Request("http://localhost:8792/api/customer/me", { headers: { Cookie: `alive_session=${token}` } }),
      env, params: {},
    })
    const account = (await profile.json() as { data: { customer: { points: number; vouchers: { source: string }[]; history: { kind: string; points_delta: number }[] } } }).data.customer
    expect(account.points).toBe(0)
    expect(account.vouchers.filter(voucher => voucher.source === "points")).toHaveLength(2)
    expect(account.history).toContainEqual(expect.objectContaining({ kind: "pointsVoucher", points_delta: -1000 }))
  })
  it("rejects point voucher generation below the 1,000-point threshold", async () => {
    await recordSettledPayment(env, { ...payment, amountBani: 99900 })
    const token = randomToken()
    db.prepare("INSERT INTO customer_sessions VALUES (?,?,?)")
      .run(await tokenHash(token), "buyer", Math.floor(Date.now() / 1000) + 100)
    const response = await generateVoucher({ request: post("vouchers", {}, `alive_session=${token}`), env, params: {} })
    expect(response.status).toBe(409)
    expect(db.prepare("SELECT count(*) AS n FROM customer_vouchers WHERE customer_id='buyer' AND source='points'").get()?.n).toBe(0)
    expect(db.prepare("SELECT count(*) AS n FROM customer_point_redemptions WHERE customer_id='buyer'").get()?.n).toBe(0)
  })
  it("restricts the loyalty report to administrators and searches customers", async () => {
    const denied = await adminLoyalty({ request: new Request("http://localhost:8792/api/admin/loyalty"), env, params: {} })
    expect(denied.status).toBe(401)

    const request = new Request("http://localhost:8792/api/admin/loyalty?search=buy", {
      headers: { "Cf-Access-Authenticated-User-Email": "admin@alive.example" },
    })
    const response = await adminLoyalty({ request, env, params: {} })
    const body = await response.json() as { data: { customers: { id: string; points: number; activeVouchers: number }[]; next: string | null } }
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(body.data.customers).toEqual([
      expect.objectContaining({ id: "buyer", points: 0, activeVouchers: 1 }),
    ])
    expect(body.data.next).toBeNull()
  })
  it("shows points, voucher redemption status and activity in the admin customer detail", async () => {
    await recordSettledPayment(env, { ...payment, amountBani: 150000 })
    const now = Math.floor(Date.now() / 1000)
    db.prepare(`INSERT INTO customer_vouchers
      (id,code,customer_id,source,discount_percent,created_at,expires_at)
      VALUES ('points-voucher','ALIVE-POINTS1234','buyer','points',10,?,?)`)
      .run(now, now + 30 * 24 * 60 * 60)
    db.prepare(`INSERT INTO customer_point_redemptions(customer_id,voucher_id,points_spent,created_at)
      VALUES ('buyer','points-voucher',1000,?)`).run(now)
    db.prepare(`UPDATE customer_vouchers SET used_at=?,used_order_id='ORDER-USED'
      WHERE customer_id='buyer' AND source='welcome'`).run(now)

    const request = new Request("http://localhost:8792/api/admin/loyalty?customer=buyer", {
      headers: { "Cf-Access-Authenticated-User-Email": "admin@alive.example" },
    })
    const response = await adminLoyalty({ request, env, params: {} })
    const body = await response.json() as {
      data: {
        customer: { id: string; points: number }
        history: { kind: string; pointsDelta: number }[]
        vouchers: { source: string; status: string; usedOrderId: string | null }[]
      }
    }
    expect(body.data.customer).toMatchObject({ id: "buyer", points: 500 })
    expect(body.data.history).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "purchase", pointsDelta: 1500 }),
      expect.objectContaining({ kind: "pointsVoucher", pointsDelta: -1000 }),
    ]))
    expect(body.data.vouchers).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "welcome", status: "used", usedOrderId: "ORDER-USED" }),
      expect.objectContaining({ source: "points", status: "active", usedOrderId: null }),
    ]))
  })
  it("prevents voucher redemption from being reused or marked against a TEST order", () => {
    const voucher = db.prepare("SELECT id FROM customer_vouchers WHERE customer_id='buyer' LIMIT 1").get() as { id: string }
    const now = Math.floor(Date.now() / 1000)
    expect(() => db.prepare("UPDATE customer_vouchers SET used_at=?,used_order_id='TEST-ORDER' WHERE id=?")
      .run(now, voucher.id)).toThrow("INVALID_VOUCHER_REDEMPTION")
    db.prepare("UPDATE customer_vouchers SET used_at=?,used_order_id='ORDER-1' WHERE id=?").run(now, voucher.id)
    expect(() => db.prepare("UPDATE customer_vouchers SET used_at=?,used_order_id='ORDER-2' WHERE id=?")
      .run(now, voucher.id)).toThrow("INVALID_VOUCHER_REDEMPTION")
  })
  it.each([0, -1, 1.5, 100000001])("rejects invalid amounts %s", async amountBani => {
    await expect(recordSettledPayment(env, { ...payment, amountBani })).rejects.toThrow()
  })
  it("rejects TEST orders and protects referral assignment and ledger history", async () => {
    await expect(recordSettledPayment(env, { ...payment, orderId: "TEST-123" })).rejects.toThrow()
    expect(() => db.exec("UPDATE customers SET referred_by='other' WHERE id='buyer'")).toThrow("REFERRER_IMMUTABLE")
    expect(() => db.exec("INSERT INTO customers VALUES ('self','Self',NULL,'DDDDDDDDDDDDDDDD','self',4)")).toThrow()
    await recordSettledPayment(env, payment)
    expect(() => db.exec("UPDATE loyalty_ledger SET points_delta=100")).toThrow("LEDGER_IMMUTABLE")
    expect(() => db.exec("DELETE FROM loyalty_ledger")).toThrow("LEDGER_IMMUTABLE")
  })
  it("uses browser-bound single-use OAuth state, sets referral on creation and rotates sessions", async () => {
    const { response, request } = await login("AAAAAAAAAAAAAAAA")
    expect(response.status).toBe(303)
    expect(response.headers.get("Location")).toBe("http://localhost:8792/account")
    const cookies = response.headers.getSetCookie()
    const session = cookies.find(cookie => cookie.startsWith("alive_session="))!.split(";")[0]
    const customer = await sessionCustomer(new Request(request.url, { headers: { Cookie: session } }), env)
    expect(customer?.name).toBe("Test")
    expect(db.prepare("SELECT referred_by FROM customers WHERE id=?").get(customer!.id)?.referred_by).toBe("coach")
    expect(db.prepare("SELECT count(*) AS n FROM customer_sessions").get()?.n).toBe(1)
    const replay = await callback({ request, env, params: {} })
    expect(replay.headers.get("Location")).toContain("auth=error")
    await logout({ request: post("logout", {}, session), env, params: {} })
    expect(await sessionCustomer(new Request(request.url, { headers: { Cookie: session } }), env)).toBeNull()
  })
  it("rejects invalid referral, cross-origin start and expired sessions", async () => {
    await expect(start({ request: post("start", { provider: "google", referral: "NO" }), env, params: {} })).rejects.toThrow("INVALID_REFERRAL")
    const request = post("start", { provider: "google" })
    request.headers.set("Origin", "https://attacker.example")
    await expect(start({ request, env, params: {} })).rejects.toThrow("INVALID_ORIGIN")
    const token = randomToken()
    db.prepare("INSERT INTO customer_sessions VALUES (?,?,?)").run(await tokenHash(token), "buyer", 1)
    expect(await sessionCustomer(new Request(env.AUTH_ORIGIN!, { headers: { Cookie: `alive_session=${token}` } }), env)).toBeNull()
  })
  it("refuses identity transfer when linking another customer's provider", async () => {
    db.exec("INSERT INTO customer_identities VALUES ('google','google-sub','buyer')")
    const token = randomToken()
    db.prepare("INSERT INTO customer_sessions VALUES (?,?,?)").run(await tokenHash(token), "other", Math.floor(Date.now() / 1000) + 100)
    const { response } = await login("", true, `alive_session=${token}`)
    expect(response.headers.get("Location")).toContain("auth=error")
    expect(db.prepare("SELECT customer_id FROM customer_identities").get()?.customer_id).toBe("buyer")
  })
  it("preserves an existing account and referrer across repeated logins", async () => {
    db.exec("INSERT INTO customer_identities VALUES ('google','google-sub','buyer')")
    await login("CCCCCCCCCCCCCCCC")
    await login()
    expect(db.prepare("SELECT count(*) AS n FROM customers").get()?.n).toBe(3)
    expect(db.prepare("SELECT referred_by FROM customers WHERE id='buyer'").get()?.referred_by).toBe("coach")
    expect(points("buyer")).toBe(0)
  })
  it("links a second provider only with an authenticated existing session", async () => {
    db.exec("INSERT INTO customer_identities VALUES ('facebook','facebook-sub','buyer')")
    const token = randomToken()
    db.prepare("INSERT INTO customer_sessions VALUES (?,?,?)").run(await tokenHash(token), "buyer", Math.floor(Date.now() / 1000) + 100)
    const { response } = await login("", true, `alive_session=${token}`)
    expect(response.headers.get("Location")).toBe("http://localhost:8792/account")
    expect(db.prepare("SELECT count(*) AS n FROM customer_identities WHERE customer_id='buyer'").get()?.n).toBe(2)
    await expect(start({ request: post("start", { provider: "google", link: true }), env, params: {} })).rejects.toThrow("UNAUTHORIZED")
  })
  it("rejects a callback from another browser and expired OAuth state", async () => {
    const response = await start({ request: post("start", { provider: "google" }), env, params: {} })
    const { data } = await response.json()
    const state = new URL(data.url).searchParams.get("state")
    const url = `http://localhost:8792/api/customer/callback?code=example&state=${state}`
    const forged = await callback({ request: new Request(url, { headers: { Cookie: `alive_oauth=${randomToken()}` } }), env, params: {} })
    expect(forged.headers.get("Location")).toContain("auth=error")
    db.exec("UPDATE customer_oauth SET expires_at=1")
    const expired = await callback({ request: new Request(url, { headers: { Cookie: response.headers.get("Set-Cookie")!.split(";")[0] } }), env, params: {} })
    expect(expired.headers.get("Location")).toContain("auth=error")
    expect(db.prepare("SELECT count(*) AS n FROM customers").get()?.n).toBe(3)
  })
  it("reports providers disabled without configuration and keeps points private", async () => {
    const response = await me({ request: new Request(env.AUTH_ORIGIN!), env: { ...env, AUTH_ORIGIN: undefined }, params: {} })
    expect((await response.json()).data).toMatchObject({ providers: [], customer: null, paymentsEnabled: false })
    expect(authCookie(new Request("https://alive.example", { headers: { Cookie: "alive_session=forged" } }), "session")).toBeNull()
  })
})
