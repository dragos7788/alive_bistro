import type { Ctx } from "../../_lib/types"
import { requireAdmin } from "../../_lib/auth"
import { err, ok } from "../../_lib/response"
import { onRequestGet as publicSettings } from "../commerce"

/** Returns global sales settings to authenticated administrators. */
export async function onRequestGet(ctx: Ctx): Promise<Response> {
  return requireAdmin(ctx.request, ctx.env) ?? publicSettings(ctx)
}

/** Persists an idempotent, same-origin update of the global sales switch. */
export async function onRequestPut({ request, env }: Ctx): Promise<Response> {
  const denied = requireAdmin(request, env)
  if (denied) return denied
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return err("INVALID_ORIGIN", "Originea cererii nu este permisă.", 403)
  }
  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > 1024) return err("INVALID_INPUT", "Cerere prea mare.", 413)
  let input: unknown
  try { input = JSON.parse(raw) } catch { return err("INVALID_INPUT", "Date invalide.", 400) }
  if (!input || typeof input !== "object" || Array.isArray(input)
    || !("salesEnabled" in input) || typeof input.salesEnabled !== "boolean" || Object.keys(input).length !== 1) {
    return err("INVALID_INPUT", "Starea comercializării trebuie să fie activată sau oprită.", 400)
  }
  try {
    const result = await env.DB.prepare(`INSERT INTO commerce_settings (id, sales_enabled) VALUES (1, ?)
      ON CONFLICT(id) DO UPDATE SET sales_enabled = excluded.sales_enabled`).bind(input.salesEnabled ? 1 : 0).run()
    if (!result.success) throw new Error("Commerce settings update failed")
    const response = ok({ salesEnabled: input.salesEnabled })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    console.error("Commerce settings saving failed", error)
    return err("COMMERCE_ERROR", "Starea comercializării nu a putut fi salvată. Reîncarcă setările și reîncearcă.", 503)
  }
}
