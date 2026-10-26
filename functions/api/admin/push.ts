import { requireAdmin, getAccessEmail } from "../../_lib/auth"
import { CustomerAuthError } from "../../_lib/customer-auth"
import { isPushPath, pushConfig, pushInput, sendPush, type PushSubscriptionRecord } from "../../_lib/push"
import { err, ok } from "../../_lib/response"
import type { Ctx, Env } from "../../_lib/types"

type Campaign = { id: string; title: string; body: string; path: string; created_at: number }

async function campaignStatus(env: Env, id: string) {
  const campaign = await env.DB.prepare("SELECT id,title,body,path,created_at FROM push_campaigns WHERE id=?")
    .bind(id).first<Campaign>()
  if (!campaign) throw new CustomerAuthError("NOT_FOUND", 404)
  const counts = await env.DB.prepare(`SELECT count(*) AS total,
    COALESCE(SUM(status='pending'),0) AS pending,COALESCE(SUM(status='sending'),0) AS sending,
    COALESCE(SUM(status='accepted'),0) AS accepted,COALESCE(SUM(status='failed'),0) AS failed,
    COALESCE(SUM(status='skipped'),0) AS skipped,COALESCE(SUM(status='expired'),0) AS expired
    FROM push_deliveries WHERE campaign_id=?`).bind(id).first()
  return { ...campaign, ...counts }
}

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const denied = requireAdmin(request, env)
  if (denied) return denied
  const { results } = await env.DB.prepare("SELECT id FROM push_campaigns ORDER BY created_at DESC,id DESC LIMIT 20")
    .all<{ id: string }>()
  const campaigns = await Promise.all(results.map(row => campaignStatus(env, row.id)))
  let configured = true
  try { pushConfig(env) } catch (error) {
    if (!(error instanceof CustomerAuthError)) throw error
    configured = false
  }
  const audience = await env.DB.prepare(`SELECT count(*) AS devices,count(DISTINCT customer_id) AS customers
    FROM customer_push_subscriptions s WHERE
    (SELECT action FROM customer_push_consent_events WHERE customer_id=s.customer_id ORDER BY id DESC LIMIT 1)='granted'`)
    .first()
  return ok({ configured, audience, campaigns })
}

export async function onRequestPost(ctx: Ctx): Promise<Response> {
  const { request, env } = ctx
  const denied = requireAdmin(request, env)
  if (denied) return denied
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return err("INVALID_ORIGIN", "Origine invalida.", 403)
  }
  try {
    pushConfig(env)
    const input = await pushInput(request)
    if (typeof input.id !== "string" || !/^[a-f0-9-]{36}$/.test(input.id)) throw new CustomerAuthError("INVALID_INPUT")
    const now = Math.floor(Date.now() / 1000)
    if (input.action === "create") {
      if (typeof input.title !== "string" || !input.title.trim() || input.title.length > 80
        || typeof input.body !== "string" || !input.body.trim() || input.body.length > 240
        || !isPushPath(input.path)) throw new CustomerAuthError("INVALID_INPUT")
      const existing = await env.DB.prepare("SELECT id,title,body,path FROM push_campaigns WHERE id=?")
        .bind(input.id).first<Campaign>()
      if (existing) {
        if (existing.title !== input.title.trim() || existing.body !== input.body.trim() || existing.path !== input.path) {
          throw new CustomerAuthError("CAMPAIGN_CONFLICT", 409)
        }
      } else {
        await env.DB.batch([
          env.DB.prepare("INSERT INTO push_campaigns(id,title,body,path,created_at,created_by) VALUES (?,?,?,?,?,?)")
            .bind(input.id, input.title.trim(), input.body.trim(), input.path, now, getAccessEmail(request) ?? "local-admin"),
          env.DB.prepare(`INSERT INTO push_deliveries(campaign_id,subscription_id,updated_at)
            SELECT ?,s.id,? FROM customer_push_subscriptions s WHERE
            (SELECT action FROM customer_push_consent_events WHERE customer_id=s.customer_id ORDER BY id DESC LIMIT 1)='granted'`)
            .bind(input.id, now),
        ])
      }
    } else if (input.action === "send") {
      const campaign = await env.DB.prepare("SELECT id,title,body,path FROM push_campaigns WHERE id=?")
        .bind(input.id).first<Campaign>()
      if (!campaign) throw new CustomerAuthError("NOT_FOUND", 404)
      const { results } = await env.DB.prepare(`SELECT subscription_id FROM push_deliveries
        WHERE campaign_id=? AND status='pending' ORDER BY subscription_id LIMIT 10`)
        .bind(input.id).all<{ subscription_id: string }>()
      for (const item of results) {
        const claimed = await env.DB.prepare(`UPDATE push_deliveries SET status='sending',updated_at=?
          WHERE campaign_id=? AND subscription_id=? AND status='pending' RETURNING subscription_id`)
          .bind(now, input.id, item.subscription_id).first()
        if (!claimed) continue
        const subscription = await env.DB.prepare(`SELECT s.* FROM customer_push_subscriptions s
          WHERE s.id=? AND (SELECT action FROM customer_push_consent_events
            WHERE customer_id=s.customer_id ORDER BY id DESC LIMIT 1)='granted'`)
          .bind(item.subscription_id).first<PushSubscriptionRecord>()
        let status = "skipped"
        if (subscription) {
          try {
            const result = await sendPush(env, subscription, {
              title: campaign.title, body: campaign.body, path: campaign.path, campaignId: campaign.id,
            })
            status = result >= 200 && result < 300 ? "accepted"
              : result === 404 || result === 410 ? "expired" : "failed"
            if (status === "expired") {
              await env.DB.prepare("DELETE FROM customer_push_subscriptions WHERE id=?").bind(subscription.id).run()
            }
            if (status === "failed") console.error("Web Push provider rejected a delivery", result)
          } catch (error) {
            // Never log endpoints or encryption keys; ambiguous failures are not automatically retried.
            console.error("Web Push delivery failed", error instanceof Error ? error.name : "UnknownError")
            status = "failed"
          }
        }
        await env.DB.prepare(`UPDATE push_deliveries SET status=?,updated_at=?
          WHERE campaign_id=? AND subscription_id=?`)
          .bind(status, Math.floor(Date.now() / 1000), input.id, item.subscription_id).run()
      }
    } else throw new CustomerAuthError("INVALID_INPUT")
    return ok(await campaignStatus(env, input.id))
  } catch (error) {
    if (error instanceof CustomerAuthError) return err(error.code, "Campania nu a putut fi procesata.", error.status)
    console.error("Push campaign processing failed", error instanceof Error ? error.name : "UnknownError")
    return err("PUSH_ERROR", "Procesarea a fost intrerupta. Reincarca istoricul pentru starea reala.", 503)
  }
}
