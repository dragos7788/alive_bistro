import { readFileSync, readdirSync } from "node:fs"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Env } from "./types"
import { onRequestDelete } from "../api/admin/customers/[id]"
import { onRequestGet as adminLoyalty } from "../api/admin/loyalty"
import { recordCumulativeRefund, recordSettledPayment } from "./loyalty"

describe("Admin customer deletion", () => {
  let db: DatabaseSync
  let env: Env
  const migration = (name: string) => db.exec(readFileSync(new URL(`../../migrations/${name}`, import.meta.url), "utf8"))
  beforeEach(() => {
    db = new DatabaseSync(":memory:")
    db.exec("PRAGMA foreign_keys=ON")
    for (const name of readdirSync(new URL("../../migrations/", import.meta.url)).filter(name => name.endsWith(".sql")).sort()) {
      migration(name)
      if (name === "0001_init.sql") {
        db.exec(`INSERT INTO categories(id,group_id,label,icon_key,sort_order)
          VALUES ('soup-of-the-day','food','Soup','bowl',0)`)
      }
    }
    const executions = new WeakMap<object, () => void>()
    const prepare: Env["DB"]["prepare"] = sql => {
      let values: SQLInputValue[] = []
      const statement = {
        bind(...args: unknown[]) {
          values = args.map(value => {
            if (value === null || typeof value === "string" || typeof value === "number") return value
            throw new Error("Unsupported SQL value")
          })
          return statement
        },
        async first<T>() { return (db.prepare(sql).get(...values) ?? null) as T | null },
        async all<T>() { return { results: db.prepare(sql).all(...values) as T[] } },
        async run() {
          const result = db.prepare(sql).run(...values)
          return { success: true, meta: { changes: Number(result.changes) } }
        },
      }
      executions.set(statement, () => { db.prepare(sql).run(...values) })
      return statement
    }
    env = {
      DB: {
        prepare,
        async batch(statements) {
          db.exec("BEGIN")
          try {
            for (const statement of statements) executions.get(statement)!()
            db.exec("COMMIT")
            return []
          } catch (error) { db.exec("ROLLBACK"); throw error }
        },
      },
      MEDIA: { put: vi.fn(), get: vi.fn(), delete: vi.fn() },
    }
    db.exec(`INSERT INTO customers(id,name,email,referral_code,referred_by,created_at)
      VALUES ('target','Ana Target','ana@example.com','TARGET',NULL,1),
      ('child','Referred customer','child@example.com','CHILD','target',2),
      ('other','Other customer','other@example.com','OTHER',NULL,3);
      INSERT INTO customer_identities VALUES ('google','target-identity','target');
      INSERT INTO customer_sessions VALUES ('session','target',9999999999);
      INSERT INTO customer_oauth(state_hash,browser_hash,provider,verifier,nonce,link_customer_id,expires_at,referral_code)
        VALUES ('oauth','browser','google','verifier','nonce','target',9999999999,'TARGET');
      INSERT INTO customer_oauth(state_hash,browser_hash,provider,verifier,nonce,expires_at,referral_code)
        VALUES ('referral-oauth','browser','google','verifier','nonce',9999999999,'TARGET');
      INSERT INTO customer_marketing_consent_events(customer_id,channel,action,source,notice_version,created_at)
        VALUES ('target','email','granted','account','marketing-email-v1',1),
          ('other','email','granted','account','marketing-email-v1',1);
      INSERT INTO customer_push_consent_events(customer_id,action,notice_version,created_at)
        VALUES ('target','granted','push-marketing-v1',1),('other','granted','push-marketing-v1',1);
      INSERT INTO customer_push_subscriptions VALUES ('device','target','https://push.example/device','key','auth',1);
      INSERT INTO customer_marketing_invitations(customer_id,shown_at) VALUES ('target',1);
      INSERT INTO calorie_journal_goals VALUES ('target',2100,1);
      INSERT INTO calorie_journal_entries(id,customer_id,request_key,consumed_on,food_name,servings,calories,created_at)
        VALUES ('journal','target','11111111-1111-4111-8111-111111111111','2026-10-30','Personal meal',1,500,1);
      INSERT INTO push_campaigns(id,title,body,path,created_at,created_by,audience_key)
        VALUES ('campaign','Offer','Body','/menu',1,'admin','["target","other"]');
      INSERT INTO push_deliveries(campaign_id,subscription_id,updated_at) VALUES ('campaign','device',1)`)
  })
  afterEach(() => db.close())

  function request(body: unknown = { confirmation: "ana@example.com" }, options: { origin?: string; admin?: boolean; id?: string } = {}) {
    const headers: Record<string, string> = { Origin: options.origin ?? "https://alive.example", "Content-Type": "application/json" }
    if (options.admin !== false) headers["Cf-Access-Authenticated-User-Email"] = "admin@example.com"
    return onRequestDelete({
      request: new Request("https://alive.example/api/admin/customers/target", {
        method: "DELETE", headers, body: JSON.stringify(body),
      }), env, params: { id: options.id ?? "target" },
    })
  }
  function order(number: string, status = "collected", email = " ANA@example.com ") {
    db.prepare(`INSERT INTO test_orders(number,idempotency_key,request_hash,created_at,contact_name,
      contact_phone,contact_email,total_bani,lines_json,preparation_status) VALUES (?,?,?,'2026-10-30',?,?,?,?,?,?)`)
      .run(number, `key-${number}`, "personal-input-hash", "Ana Target", "0700000000", email, 4990,
        JSON.stringify([{
          key: '["food","meal"]', name: "Meal", quantity: 1, priceBani: 4990, subtotalBani: 4990,
          ingredients: [{ id: "rice", amount: 100, unit: "g", note: "Ana" }],
          address: { street: "Personal street" }, metadata: { email: "ana@example.com" },
        }]), status)
  }
  const count = (table: string) => db.prepare(`SELECT count(*) AS n FROM ${table}`).get()?.n

  it.each(["collected", "cancelled"])("deletes private data atomically and anonymizes only matching %s orders", async status => {
    order("TEST-target", status)
    order("TEST-other", "collected", "other@example.com")
    const response = await request()

    expect(response.status).toBe(200)
    expect(db.prepare("SELECT * FROM customers WHERE id='target'").get()).toBeUndefined()
    for (const table of ["customer_identities", "customer_sessions", "customer_oauth", "customer_marketing_invitations",
      "customer_push_subscriptions", "push_deliveries", "calorie_journal_goals", "calorie_journal_entries"]) expect(count(table)).toBe(0)
    expect(count("customer_vouchers")).toBe(2)
    expect(count("customer_marketing_consent_events")).toBe(1)
    expect(count("customer_push_consent_events")).toBe(1)
    expect(db.prepare("SELECT referred_by FROM customers WHERE id='child'").get()?.referred_by).toBeNull()
    expect(db.prepare("SELECT audience_key FROM push_campaigns").get()?.audience_key).toBe('["other"]')
    const retained = db.prepare("SELECT * FROM test_orders WHERE number='TEST-target'").get()!
    expect(retained).toMatchObject({
      number: "TEST-target", total_bani: 4990, preparation_status: status,
      contact_name: "Client șters", contact_phone: "", contact_email: "", request_hash: "erased",
    })
    expect(retained.idempotency_key).toBe("key-TEST-target")
    expect(JSON.parse(retained.lines_json as string)).toEqual([{
      key: '["food","meal"]', name: "Meal", quantity: 1, priceBani: 4990, subtotalBani: 4990,
      ingredients: [{ id: "rice", amount: 100, unit: "g" }],
    }])
    expect(db.prepare("SELECT contact_phone FROM test_orders WHERE number='TEST-other'").get()?.contact_phone).toBe("0700000000")
    expect(() => db.exec("DELETE FROM customer_marketing_consent_events WHERE customer_id='other'")).toThrow("MARKETING_CONSENT_IMMUTABLE")
    expect(() => db.exec("DELETE FROM customer_vouchers WHERE customer_id='other'")).toThrow("VOUCHER_IMMUTABLE")
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([])
  })

  it.each(["new", "preparing", "ready"])("blocks deletion while a matching order is %s without changing any data", async status => {
    order("TEST-active", status)
    const response = await request()
    expect(response.status).toBe(409)
    expect((await response.json()).error.code).toBe("CUSTOMER_HAS_ACTIVE_ORDERS")
    expect(count("customers")).toBe(3)
    expect(count("customer_sessions")).toBe(1)
    expect(count("customer_push_subscriptions")).toBe(1)
    expect(db.prepare("SELECT contact_email FROM test_orders").get()?.contact_email).toBe(" ANA@example.com ")
  })

  it("blocks deletion while a push delivery may already be in flight", async () => {
    db.exec("UPDATE push_deliveries SET status='sending'")
    const response = await request()
    expect(response.status).toBe(409)
    expect((await response.json()).error.code).toBe("CUSTOMER_PUSH_IN_FLIGHT")
    expect(count("customer_sessions")).toBe(1)
  })

  it.each(["target", "child"])("retains immutable accounting under a sealed owner when deleting %s, including later refunds", async id => {
    db.exec(`INSERT INTO loyalty_payments(payment_id,order_id,customer_id,referrer_id,amount_bani,created_at)
      VALUES ('payment','ORDER-1','child','target',100000,1)`)
    const before = db.prepare("SELECT * FROM loyalty_payments").all()
    const response = await request({ confirmation: id === "target" ? "ana@example.com" : "child@example.com" }, { id })
    expect(response.status).toBe(200)
    const tombstone = db.prepare("SELECT * FROM customers WHERE id=?").get(id)!
    expect(tombstone).toMatchObject({ name: "Client șters", email: null, referred_by: null, created_at: 0 })
    expect(tombstone.referral_code).toMatch(/^erased-[a-f0-9]{64}$/)
    expect(tombstone.deleted_at).toBeTypeOf("number")
    expect(count("customers")).toBe(3)
    expect(db.prepare("SELECT * FROM loyalty_payments").all()).toEqual(before)
    expect(count("loyalty_ledger")).toBe(2)
    for (const table of ["customer_identities", "customer_sessions", "customer_push_subscriptions",
      "customer_push_consent_events", "customer_marketing_consent_events", "customer_marketing_invitations",
      "calorie_journal_entries", "calorie_journal_goals"]) {
      expect(db.prepare(`SELECT count(*) AS n FROM ${table} WHERE customer_id=?`).get(id)?.n).toBe(0)
    }
    expect((await request({ confirmation: id }, { id })).status).toBe(404)
    expect(() => db.prepare("UPDATE customers SET name='Restored' WHERE id=?").run(id)).toThrow("CUSTOMER_DELETED")
    expect(() => db.prepare("INSERT INTO customer_sessions VALUES ('new-session',?,9999999999)").run(id)).toThrow("CUSTOMER_DELETED")
    expect(() => db.prepare("INSERT INTO customer_identities VALUES ('facebook','restored',?)").run(id)).toThrow("CUSTOMER_DELETED")
    expect(() => db.prepare("UPDATE customer_vouchers SET used_at=2,used_order_id='ORDER-2' WHERE customer_id=?").run(id)).toThrow("CUSTOMER_DELETED")
    expect(() => db.prepare("DELETE FROM customers WHERE id=?").run(id)).toThrow("CUSTOMER_HAS_FINANCIAL_RECORDS")
    await recordSettledPayment(env, {
      paymentId: "payment", orderId: "ORDER-1", customerId: "child", amountBani: 100000, currency: "RON",
    })
    expect(count("loyalty_ledger")).toBe(2)
    await recordCumulativeRefund(env, "payment", 50000)
    expect(db.prepare("SELECT SUM(points_delta) AS points FROM loyalty_ledger WHERE customer_id='child'").get()?.points).toBe(500)
    expect(db.prepare("SELECT SUM(points_delta) AS points FROM loyalty_ledger WHERE customer_id='target'").get()?.points).toBe(500)
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([])

    const headers = { "Cf-Access-Authenticated-User-Email": "admin@example.com" }
    const overview = await adminLoyalty({ request: new Request("https://alive.example/api/admin/loyalty", { headers }), env, params: {} })
    const json = await overview.json()
    expect(json.data.customers.map((customer: { id: string }) => customer.id)).not.toContain(id)
    const detail = await adminLoyalty({ request: new Request(`https://alive.example/api/admin/loyalty?customer=${id}`, { headers }), env, params: {} })
    expect(detail.status).toBe(404)
  })

  it("retains immutable point-redemption/voucher records without permitting their use by a deleted owner", async () => {
    db.exec(`INSERT INTO loyalty_payments(payment_id,order_id,customer_id,referrer_id,amount_bani,created_at)
      VALUES ('payment','ORDER-1','target',NULL,100000,1);
      INSERT INTO customer_vouchers(id,code,customer_id,source,discount_percent,created_at,expires_at)
        VALUES ('points','POINTS','target','points',10,1,9999999999);
      INSERT INTO customer_point_redemptions(customer_id,voucher_id,points_spent,created_at)
        VALUES ('target','points',1000,1)`)
    const vouchers = db.prepare("SELECT * FROM customer_vouchers WHERE customer_id='target'").all()
    const redemptions = db.prepare("SELECT * FROM customer_point_redemptions").all()

    expect((await request()).status).toBe(200)

    expect(db.prepare("SELECT * FROM customer_vouchers WHERE customer_id='target'").all()).toEqual(vouchers)
    expect(db.prepare("SELECT * FROM customer_point_redemptions").all()).toEqual(redemptions)
    expect(() => db.exec("DELETE FROM customer_point_redemptions")).toThrow("POINT_REDEMPTION_IMMUTABLE")
    expect(() => db.exec("DELETE FROM customer_vouchers WHERE customer_id='target'")).toThrow("VOUCHER_IMMUTABLE")
    expect(() => db.exec(`INSERT INTO customer_vouchers(id,code,customer_id,source,discount_percent,created_at,expires_at)
      VALUES ('new-points','NEW-POINTS','target','points',10,1,9999999999)`)).toThrow("CUSTOMER_DELETED")
    expect(() => db.exec(`INSERT INTO loyalty_payments(payment_id,order_id,customer_id,amount_bani,created_at)
      VALUES ('new-payment','ORDER-2','target',100000,1)`)).toThrow("CUSTOMER_DELETED")
  })

  it.each([
    ["customer_marketing_consent_events", "MARKETING_CONSENT_IMMUTABLE"],
    ["customer_vouchers", "VOUCHER_IMMUTABLE"],
  ])("keeps ordinary %s deletion immutable", (table, message) => {
    expect(() => db.exec(`DELETE FROM ${table} WHERE customer_id='target'`)).toThrow(message)
  })

  it("keeps referral changes and financial ledger/redemption mutation guards intact", () => {
    db.exec(`INSERT INTO loyalty_payments(payment_id,order_id,customer_id,referrer_id,amount_bani,created_at)
      VALUES ('payment','ORDER-1','child','target',100000,1);
      INSERT INTO customer_vouchers(id,code,customer_id,source,discount_percent,created_at,expires_at)
      VALUES ('points','POINTS','target','points',10,1,9999999999);
      INSERT INTO customer_point_redemptions(customer_id,voucher_id,points_spent,created_at)
      VALUES ('target','points',1000,1)`)
    expect(() => db.exec("UPDATE customers SET referred_by=NULL WHERE id='child'")).toThrow("REFERRER_IMMUTABLE")
    expect(() => db.exec("DELETE FROM loyalty_ledger")).toThrow("LEDGER_IMMUTABLE")
    expect(() => db.exec("DELETE FROM customer_point_redemptions")).toThrow("POINT_REDEMPTION_IMMUTABLE")
    expect(() => db.exec("UPDATE loyalty_ledger SET points_delta=1")).toThrow("LEDGER_IMMUTABLE")
    expect(() => db.exec("UPDATE customer_push_consent_events SET action='withdrawn'")).toThrow("PUSH_CONSENT_IMMUTABLE")
  })

  it("rolls back all cleanup if an unexpected dependent write fails", async () => {
    order("TEST-target")
    db.exec(`CREATE TRIGGER simulate_failure BEFORE DELETE ON customer_sessions
      BEGIN SELECT RAISE(ABORT,'SIMULATED_FAILURE'); END`)
    const response = await request()
    expect(response.status).toBe(500)
    expect(count("customers")).toBe(3)
    expect(count("customer_vouchers")).toBe(3)
    expect(count("customer_identities")).toBe(1)
    expect(count("customer_marketing_consent_events")).toBe(2)
    expect(db.prepare("SELECT contact_phone FROM test_orders").get()?.contact_phone).toBe("0700000000")
  })

  it.each([
    [{}, {}, 400],
    [{ confirmation: "wrong" }, {}, 400],
    [{ confirmation: "ana@example.com" }, { admin: false }, 401],
    [{ confirmation: "ana@example.com" }, { origin: "https://attacker.example" }, 403],
    [{ confirmation: "ana@example.com" }, { id: "../target" }, 400],
    [{ confirmation: "ana@example.com" }, { id: "missing" }, 404],
  ])("rejects invalid confirmation, authorization, origin, or identifier without deleting", async (body, options, status) => {
    const response = await request(body, options)
    expect(response.status).toBe(status)
    expect(count("customers")).toBe(3)
  })

  it("does not match guest orders by name when a customer has no email", async () => {
    db.exec("UPDATE customers SET email=NULL WHERE id='target'")
    order("TEST-guest", "new", "guest@example.com")
    const response = await request({ confirmation: "target" })
    expect(response.status).toBe(200)
    expect(db.prepare("SELECT contact_name FROM test_orders").get()?.contact_name).toBe("Ana Target")
  })

  it("reports a repeat deletion as not found and never affects another account", async () => {
    expect((await request()).status).toBe(200)

    expect((await request()).status).toBe(404)
    expect(count("customers")).toBe(2)
    expect(db.prepare("SELECT email FROM customers WHERE id='other'").get()?.email).toBe("other@example.com")
  })

  it("fails closed when the account changes after confirmation was checked", async () => {
    const prepare = env.DB.prepare
    env.DB.prepare = sql => {
      if (sql.startsWith("UPDATE customers SET deleted_at")) db.exec("UPDATE customers SET email='updated@example.com' WHERE id='target'")
      return prepare(sql)
    }

    const response = await request()

    expect(response.status).toBe(409)
    expect((await response.json()).error.code).toBe("CUSTOMER_CHANGED")
    expect(count("customers")).toBe(3)
    expect(count("customer_sessions")).toBe(1)
  })

  it.each([
    ["{", "application/json", 400],
    [JSON.stringify({ confirmation: "ana@example.com" }), "text/plain", 400],
    [JSON.stringify({ confirmation: "a".repeat(4096) }), "application/json", 413],
  ])("rejects malformed or oversized JSON and unsupported content types", async (body, contentType, status) => {
    const response = await onRequestDelete({
      request: new Request("https://alive.example/api/admin/customers/target", {
        method: "DELETE", body, headers: {
          Origin: "https://alive.example", "Content-Type": contentType,
          "Cf-Access-Authenticated-User-Email": "admin@example.com",
        },
      }), env, params: { id: "target" },
    })

    expect(response.status).toBe(status)
    expect(count("customers")).toBe(3)
  })
})
