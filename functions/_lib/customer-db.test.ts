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
