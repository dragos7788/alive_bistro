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
import { onRequestPost as updateMarketingConsent } from "../api/customer/marketing"
import { onRequestPost as claimMarketingInvitation } from "../api/customer/marketing-invitation"
import { onRequestGet as adminLoyalty } from "../api/admin/loyalty"
import { onRequestGet as pushSettings, onRequestPost as subscribePush } from "../api/customer/push"
import { onRequestGet as pushOverview, onRequestPost as pushCampaign } from "../api/admin/push"
import { sendPush } from "./push"
import { purgeExpiredPushRecords } from "./push-retention"

vi.mock("./push", async importOriginal => ({
  ...await importOriginal<typeof import("./push")>(), sendPush: vi.fn(),
}))

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
    db.exec(readFileSync(new URL("../../migrations/0012_customer_marketing_consent.sql", import.meta.url), "utf8"))
    db.exec(readFileSync(new URL("../../migrations/0013_web_push.sql", import.meta.url), "utf8"))
    db.exec(readFileSync(new URL("../../migrations/0014_marketing_invitation.sql", import.meta.url), "utf8"))
    db.exec(readFileSync(new URL("../../migrations/0024_push_retention.sql", import.meta.url), "utf8"))
    vi.mocked(sendPush).mockReset().mockResolvedValue(201)
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
      VAPID_PUBLIC_KEY: "B".repeat(87), VAPID_PRIVATE_KEY: "A".repeat(43), VAPID_SUBJECT: "mailto:contact@example.com",
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
  async function login(referral = "", link = false, cookie = "", marketingEmailConsent = false) {
    const response = await start({ request: post("start", { provider: "google", referral, link, marketingEmailConsent }, cookie), env, params: {} })
    const { data } = await response.json()
    const state = new URL(data.url).searchParams.get("state")
    const oauthCookie = response.headers.get("Set-Cookie")!.split(";")[0]
    const request = new Request(`http://localhost:8792/api/customer/callback?code=example&state=${state}`, {
      headers: { Cookie: `${oauthCookie}; ${cookie}` },
    })
    return { request, response: await callback({ request, env, params: {} }) }
  }

  async function pushCookie(customer = "buyer") {
    const token = randomToken()
    db.prepare("INSERT INTO customer_sessions VALUES (?,?,?)")
      .run(await tokenHash(token), customer, Math.floor(Date.now() / 1000) + 100)
    return `alive_session=${token}`
  }
  const subscription = {
    endpoint: "https://fcm.googleapis.com/wp/test-device",
    keys: { p256dh: "B".repeat(87), auth: "A".repeat(22) },
  }
  function pushSubscribeInput() {
    return { action: "subscribe", consent: true, noticeVersion: "push-marketing-v1", subscription }
  }
  function adminPushRequest(body?: object) {
    return new Request("http://localhost:8792/api/admin/push", {
      method: body ? "POST" : "GET",
      headers: { Origin: env.AUTH_ORIGIN!, "Cf-Access-Authenticated-User-Email": "admin@example.com" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  }
  const campaignInput = {
    action: "create", id: "11111111-1111-4111-8111-111111111111", title: "Oferta ALIVE",
    body: "Descopera meniul.", path: "/menu",
  }

  it("claims the invitation once per account across sessions without granting either consent", async () => {
    const cookie = await pushCookie()
    const claim = (session: string) => claimMarketingInvitation({
      request: post("marketing-invitation", { action: "claim" }, session), env, params: {},
    })

    const first = await claim(cookie)
    const repeat = await claim(await pushCookie())
    const other = await claim(await pushCookie("other"))

    expect((await first.json()).data).toEqual({ show: true, email: false, push: true })
    expect((await repeat.json()).data.show).toBe(false)
    expect((await other.json()).data.show).toBe(true)
    expect(db.prepare("SELECT count(*) AS n FROM customer_marketing_consent_events").get()?.n).toBe(0)
    expect(db.prepare("SELECT count(*) AS n FROM customer_push_consent_events").get()?.n).toBe(0)
  })

  it("offers only undecided channels and does not solicit withdrawn consent", async () => {
    db.prepare("UPDATE customers SET email='buyer@example.com' WHERE id='buyer'").run()
    db.exec(`INSERT INTO customer_push_consent_events(customer_id,action,notice_version,created_at)
      VALUES ('buyer','withdrawn','push-marketing-v1',1)`)
    const cookie = await pushCookie()

    const result = await claimMarketingInvitation({
      request: post("marketing-invitation", { action: "claim" }, cookie), env, params: {},
    })

    expect((await result.json()).data).toEqual({ show: true, email: true, push: false })
  })

  it("permits only one claim from simultaneous tabs", async () => {
    const cookie = await pushCookie()
    const responses = await Promise.all([1, 2].map(() => claimMarketingInvitation({
      request: post("marketing-invitation", { action: "claim" }, cookie), env, params: {},
    })))
    const results = await Promise.all(responses.map(response => response.json()))

    expect(results.filter(result => result.data.show)).toHaveLength(1)
    expect(db.prepare("SELECT count(*) AS n FROM customer_marketing_invitations").get()?.n).toBe(1)
  })

  it("does not consume an invitation when no channel is available", async () => {
    const cookie = await pushCookie()
    const configuredKey = env.VAPID_PRIVATE_KEY
    env.VAPID_PRIVATE_KEY = undefined

    const unavailable = await claimMarketingInvitation({
      request: post("marketing-invitation", { action: "claim" }, cookie), env, params: {},
    })
    expect((await unavailable.json()).data).toEqual({ show: false, email: false, push: false })
    expect(db.prepare("SELECT count(*) AS n FROM customer_marketing_invitations").get()?.n).toBe(0)

    env.VAPID_PRIVATE_KEY = configuredKey
    const available = await claimMarketingInvitation({
      request: post("marketing-invitation", { action: "claim" }, cookie), env, params: {},
    })
    expect((await available.json()).data.show).toBe(true)
  })

  it("does not show an invitation when both channels already have a choice", async () => {
    db.exec(`INSERT INTO customer_marketing_consent_events(customer_id,channel,action,source,notice_version,created_at)
      VALUES ('buyer','email','granted','account','email-marketing-v1',1);
      INSERT INTO customer_push_consent_events(customer_id,action,notice_version,created_at)
      VALUES ('buyer','granted','push-marketing-v1',1)`)
    const cookie = await pushCookie()

    const result = await claimMarketingInvitation({
      request: post("marketing-invitation", { action: "claim" }, cookie), env, params: {},
    })

    expect((await result.json()).data.show).toBe(false)
  })

  it("protects invitation claims with session, origin and input validation", async () => {
    const cookie = await pushCookie()
    await expect(claimMarketingInvitation({
      request: post("marketing-invitation", { action: "claim" }), env, params: {},
    })).rejects.toThrow("UNAUTHORIZED")
    const crossSite = post("marketing-invitation", { action: "claim" }, cookie)
    crossSite.headers.set("Origin", "https://attacker.example")
    await expect(claimMarketingInvitation({ request: crossSite, env, params: {} })).rejects.toThrow("INVALID_ORIGIN")
    for (const body of [{}, { action: "grant" }, null]) {
      await expect(claimMarketingInvitation({
        request: post("marketing-invitation", body, cookie), env, params: {},
      })).rejects.toThrow("INVALID_INPUT")
    }
    expect(db.prepare("SELECT count(*) AS n FROM customer_marketing_invitations").get()?.n).toBe(0)
  })

  it("requires explicit push consent, valid origin, session and allowlisted endpoints", async () => {
    const cookie = await pushCookie()
    for (const input of [
      { ...pushSubscribeInput(), consent: false },
      { ...pushSubscribeInput(), noticeVersion: "unknown" },
      { ...pushSubscribeInput(), subscription: { ...subscription, endpoint: "https://127.0.0.1/private" } },
    ]) {
      await expect(subscribePush({ request: post("push", input, cookie), env, params: {} })).rejects.toThrow("INVALID_INPUT")
    }
    await expect(subscribePush({ request: post("push", pushSubscribeInput()), env, params: {} })).rejects.toThrow("UNAUTHORIZED")
    const crossSite = post("push", pushSubscribeInput(), cookie)
    crossSite.headers.set("Origin", "https://attacker.example")
    await expect(subscribePush({ request: crossSite, env, params: {} })).rejects.toThrow("INVALID_ORIGIN")
    expect(db.prepare("SELECT count(*) AS n FROM customer_push_consent_events").get()?.n).toBe(0)
  })

  it("keeps push consent separate from email, avoids duplicate devices and withdraws every device", async () => {
    const cookie = await pushCookie()
    await subscribePush({ request: post("push", pushSubscribeInput(), cookie), env, params: {} })
    await subscribePush({ request: post("push", pushSubscribeInput(), cookie), env, params: {} })
    await subscribePush({ request: post("push", {
      ...pushSubscribeInput(), subscription: { ...subscription, endpoint: "https://fcm.googleapis.com/wp/another" },
    }, cookie), env, params: {} })
    expect(db.prepare("SELECT count(*) AS n FROM customer_push_subscriptions").get()?.n).toBe(2)
    expect(db.prepare("SELECT count(*) AS n FROM customer_push_consent_events").get()?.n).toBe(1)
    expect(db.prepare("SELECT count(*) AS n FROM customer_marketing_consent_events").get()?.n).toBe(0)
    const settings = await pushSettings({
      request: new Request("http://localhost:8792/api/customer/push", { headers: { Cookie: cookie } }), env, params: {},
    })

    expect((await settings.json()).data).toMatchObject({ consent: true, devices: 2 })
    const result = await subscribePush({ request: post("push", { action: "withdraw" }, cookie), env, params: {} })
    expect((await result.json()).data).toEqual({ consent: false })
    expect(db.prepare("SELECT count(*) AS n FROM customer_push_subscriptions").get()?.n).toBe(0)
    expect(db.prepare("SELECT action FROM customer_push_consent_events ORDER BY id DESC LIMIT 1").get()?.action).toBe("withdrawn")
    expect(() => db.exec("UPDATE customer_push_consent_events SET action='granted'")).toThrow("PUSH_CONSENT_IMMUTABLE")
  })

  it("purges withdrawn consent and completed campaign records after twelve months", async () => {
    const now = Math.floor(Date.UTC(2026, 9, 30) / 1000)
    const old = Math.floor(Date.UTC(2025, 9, 30) / 1000)
    const recent = old + 1
    db.prepare(`INSERT INTO customer_push_consent_events(customer_id,action,notice_version,created_at)
      VALUES ('buyer','granted','push-marketing-v1',1),('buyer','withdrawn','push-marketing-v1',?),
      ('other','granted','push-marketing-v1',2),('other','withdrawn','push-marketing-v1',?),
      ('coach','granted','push-marketing-v1',3),('coach','withdrawn','push-marketing-v1',?),
      ('coach','granted','push-marketing-v1',?)`).run(old, recent, old, recent)
    db.prepare("INSERT INTO push_campaigns(id,title,body,path,created_at,created_by) VALUES ('old','Old','Body','/',?,'admin'),('new','New','Body','/',?,'admin')")
      .run(old, recent)
    db.prepare("INSERT INTO push_deliveries(campaign_id,subscription_id,status,updated_at) VALUES ('old','device-old','accepted',?),('new','device-new','accepted',?)")
      .run(old, recent)

    await purgeExpiredPushRecords(env.DB, now)

    expect(db.prepare("SELECT count(*) AS n FROM customer_push_consent_events WHERE customer_id='buyer'").get()?.n).toBe(0)
    expect(db.prepare("SELECT count(*) AS n FROM customer_push_consent_events WHERE customer_id='other'").get()?.n).toBe(2)
    expect(db.prepare("SELECT action FROM customer_push_consent_events WHERE customer_id='coach'").all().map(row => row.action)).toEqual(["granted"])
    expect(db.prepare("SELECT id FROM push_campaigns").all().map(row => row.id)).toEqual(["new"])
    expect(() => db.exec("DELETE FROM customer_push_consent_events")).not.toThrow()
  })

  it("does not transfer a shared device to another customer", async () => {
    const first = await pushCookie()
    await subscribePush({ request: post("push", pushSubscribeInput(), first), env, params: {} })
    const second = await pushCookie("other")
    await expect(subscribePush({
      request: post("push", pushSubscribeInput(), second), env, params: {},
    })).rejects.toThrow("PUSH_DEVICE_IN_USE")
    expect(db.prepare("SELECT customer_id FROM customer_push_subscriptions").get()?.customer_id).toBe("buyer")
  })

  it("creates idempotent campaigns and sends only subscribed devices once", async () => {
    const cookie = await pushCookie()
    await subscribePush({ request: post("push", pushSubscribeInput(), cookie), env, params: {} })
    const create = await pushCampaign({ request: adminPushRequest(campaignInput), env, params: {} })
    expect((await create.json()).data).toMatchObject({ total: 1, pending: 1 })
    await pushCampaign({ request: adminPushRequest(campaignInput), env, params: {} })
    const send = { action: "send", id: campaignInput.id }
    const sent = await pushCampaign({ request: adminPushRequest(send), env, params: {} })
    expect((await sent.json()).data).toMatchObject({ accepted: 1, pending: 0, sending: 0 })
    await pushCampaign({ request: adminPushRequest(send), env, params: {} })
    expect(sendPush).toHaveBeenCalledOnce()
    const overview = await pushOverview({ request: adminPushRequest(), env, params: {} })
    expect((await overview.json()).data).toMatchObject({
      configured: true, audience: { customers: 1, devices: 1 },
    })
  })

  it("resumes only pending deliveries after each bounded ten-device batch", async () => {
    db.prepare(`INSERT INTO customer_push_consent_events(customer_id,action,notice_version,created_at)
      VALUES ('buyer','granted','push-marketing-v1',1)`).run()
    for (let index = 0; index < 11; index++) {
      db.prepare(`INSERT INTO customer_push_subscriptions(id,customer_id,endpoint,p256dh,auth,created_at)
        VALUES (?,'buyer',?,?,?,1)`).run(`device-${index}`, `https://fcm.googleapis.com/wp/${index}`, subscription.keys.p256dh, subscription.keys.auth)
    }
    await pushCampaign({ request: adminPushRequest(campaignInput), env, params: {} })
    const send = { action: "send", id: campaignInput.id }
    const first = await pushCampaign({ request: adminPushRequest(send), env, params: {} })
    expect((await first.json()).data).toMatchObject({ total: 11, pending: 1, accepted: 10 })
    const second = await pushCampaign({ request: adminPushRequest(send), env, params: {} })
    expect((await second.json()).data).toMatchObject({ pending: 0, accepted: 11 })
    expect(sendPush).toHaveBeenCalledTimes(11)
  })

  it("rechecks push consent after campaign creation and skips withdrawn subscriptions", async () => {
    const cookie = await pushCookie()
    await subscribePush({ request: post("push", pushSubscribeInput(), cookie), env, params: {} })
    await pushCampaign({ request: adminPushRequest(campaignInput), env, params: {} })
    await subscribePush({ request: post("push", { action: "withdraw" }, cookie), env, params: {} })
    const response = await pushCampaign({
      request: adminPushRequest({ action: "send", id: campaignInput.id }), env, params: {},
    })
    expect((await response.json()).data).toMatchObject({ skipped: 1, accepted: 0 })
    expect(sendPush).not.toHaveBeenCalled()
  })

  it.each([410, 500])("reports provider status %s without retrying failed or expired deliveries", async status => {
    const cookie = await pushCookie()
    await subscribePush({ request: post("push", pushSubscribeInput(), cookie), env, params: {} })
    await pushCampaign({ request: adminPushRequest(campaignInput), env, params: {} })
    vi.mocked(sendPush).mockResolvedValue(status)
    const response = await pushCampaign({
      request: adminPushRequest({ action: "send", id: campaignInput.id }), env, params: {},
    })
    expect((await response.json()).data).toMatchObject(status === 410 ? { expired: 1 } : { failed: 1 })
    expect(db.prepare("SELECT count(*) AS n FROM customer_push_subscriptions").get()?.n).toBe(status === 410 ? 0 : 1)
    await pushCampaign({ request: adminPushRequest({ action: "send", id: campaignInput.id }), env, params: {} })
    expect(sendPush).toHaveBeenCalledOnce()
  })

  it("rejects unauthorized campaigns, external destinations and unconfigured VAPID", async () => {
    const denied = await pushCampaign({
      request: new Request("http://localhost:8792/api/admin/push", { method: "POST" }), env, params: {},
    })
    expect(denied.status).toBe(401)
    const external = await pushCampaign({
      request: adminPushRequest({ ...campaignInput, path: "//attacker.example/" }), env, params: {},
    })
    expect(external.status).toBe(400)
    delete env.VAPID_PRIVATE_KEY
    const unconfigured = await pushCampaign({ request: adminPushRequest(campaignInput), env, params: {} })
    expect(unconfigured.status).toBe(503)
    expect(db.prepare("SELECT count(*) AS n FROM push_campaigns").get()?.n).toBe(0)
  })

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
  it("records email marketing opt-in only after explicit OAuth selection", async () => {
    const { response: signedIn } = await login()
    const customer = db.prepare("SELECT id FROM customers WHERE email='test@example.com'").get() as { id: string }
    expect(db.prepare("SELECT count(*) AS n FROM customer_marketing_consent_events WHERE customer_id=?")
      .get(customer.id)?.n).toBe(0)
    const { response } = await login("", false, "", true)
    expect(response.status).toBe(303)
    expect(db.prepare(`SELECT action,source,notice_version FROM customer_marketing_consent_events WHERE customer_id=?`)
      .get(customer.id)).toEqual({ action: "granted", source: "login", notice_version: "email-marketing-v1" })
    const cookie = response.headers.getSetCookie().find(value => value.startsWith("alive_session="))!.split(";")[0]
    const profile = await me({ request: new Request("http://localhost:8792/api/customer/me", { headers: { Cookie: cookie } }), env, params: {} })
    const body = await profile.json() as { data: { customer: { emailMarketingConsent: boolean; emailMarketingConsentUpdatedAt: number | null } } }
    expect(body.data.customer.emailMarketingConsent).toBe(true)
    expect(body.data.customer.emailMarketingConsentUpdatedAt).toEqual(expect.any(Number))
    expect(signedIn.status).toBe(303)
  })
  it("lets an authenticated customer grant and withdraw marketing consent idempotently", async () => {
    db.exec("UPDATE customers SET email='buyer@example.com' WHERE id='buyer'")
    const token = randomToken()
    db.prepare("INSERT INTO customer_sessions VALUES (?,?,?)")
      .run(await tokenHash(token), "buyer", Math.floor(Date.now() / 1000) + 100)
    const cookie = `alive_session=${token}`
    const grant = await updateMarketingConsent({ request: post("marketing", { emailMarketingConsent: true }, cookie), env, params: {} })
    expect((await grant.json() as { data: { emailMarketingConsent: boolean } }).data.emailMarketingConsent).toBe(true)
    await updateMarketingConsent({ request: post("marketing", { emailMarketingConsent: true }, cookie), env, params: {} })
    expect(db.prepare("SELECT count(*) AS n FROM customer_marketing_consent_events WHERE customer_id='buyer'").get()?.n).toBe(1)
    const withdrawal = await updateMarketingConsent({ request: post("marketing", { emailMarketingConsent: false }, cookie), env, params: {} })
    expect((await withdrawal.json() as { data: { emailMarketingConsent: boolean } }).data.emailMarketingConsent).toBe(false)
    expect(db.prepare("SELECT action,source FROM customer_marketing_consent_events WHERE customer_id='buyer' ORDER BY id DESC")
      .all()).toEqual([{ action: "withdrawn", source: "account" }, { action: "granted", source: "account" }])
    expect(() => db.exec("UPDATE customer_marketing_consent_events SET action='granted'")).toThrow("MARKETING_CONSENT_IMMUTABLE")
    expect(() => db.exec("DELETE FROM customer_marketing_consent_events")).toThrow("MARKETING_CONSENT_IMMUTABLE")
  })
  it("rejects marketing opt-in without an email address or a valid session", async () => {
    const token = randomToken()
    db.prepare("INSERT INTO customer_sessions VALUES (?,?,?)")
      .run(await tokenHash(token), "buyer", Math.floor(Date.now() / 1000) + 100)
    await expect(updateMarketingConsent({
      request: post("marketing", { emailMarketingConsent: true }, `alive_session=${token}`), env, params: {},
    })).rejects.toThrow("EMAIL_REQUIRED")
    await expect(updateMarketingConsent({
      request: post("marketing", { emailMarketingConsent: true }), env, params: {},
    })).rejects.toThrow("UNAUTHORIZED")
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
  it("shows the current marketing permission and its audit history to administrators", async () => {
    db.exec("UPDATE customers SET email='buyer@example.com' WHERE id='buyer'")
    db.prepare(`INSERT INTO customer_marketing_consent_events
      (customer_id,channel,action,source,notice_version,created_at)
      VALUES ('buyer','email','granted','login','email-marketing-v1',10),
        ('buyer','email','withdrawn','account','email-marketing-v1',20)`).run()

    const request = new Request("http://localhost:8792/api/admin/loyalty?customer=buyer", {
      headers: { "Cf-Access-Authenticated-User-Email": "admin@alive.example" },
    })
    const response = await adminLoyalty({ request, env, params: {} })
    const body = await response.json() as {
      data: {
        customer: { emailMarketingConsent: boolean; emailMarketingConsentUpdatedAt: number }
        marketingConsentHistory: { action: string; source: string; noticeVersion: string; createdAt: number }[]
      }
    }
    expect(body.data.customer).toMatchObject({ emailMarketingConsent: false, emailMarketingConsentUpdatedAt: 20 })
    expect(body.data.marketingConsentHistory).toEqual([
      expect.objectContaining({ action: "withdrawn", source: "account", createdAt: 20 }),
      expect.objectContaining({ action: "granted", source: "login", noticeVersion: "email-marketing-v1", createdAt: 10 }),
    ])
  })
  it("filters the admin customer list to explicit email marketing subscribers", async () => {
    db.exec("UPDATE customers SET email='buyer@example.com' WHERE id='buyer'")
    db.prepare(`INSERT INTO customer_marketing_consent_events
      (customer_id,channel,action,source,notice_version,created_at)
      VALUES ('buyer','email','granted','login','email-marketing-v1',10)`).run()
    const request = new Request("http://localhost:8792/api/admin/loyalty?marketing=granted", {
      headers: { "Cf-Access-Authenticated-User-Email": "admin@alive.example" },
    })
    const response = await adminLoyalty({ request, env, params: {} })
    const body = await response.json() as { data: { customers: { id: string; emailMarketingConsent: boolean }[] } }
    expect(body.data.customers).toEqual([expect.objectContaining({ id: "buyer", emailMarketingConsent: true })])
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
