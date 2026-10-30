import type { Ctx } from "../../_lib/types"
import { requireAdmin } from "../../_lib/auth"
import { err, ok } from "../../_lib/response"
import { readHealthyDeal } from "../../_lib/healthy-deal"
import { parseHealthyDealSettings } from "../../../src/features/healthy-deal/schedule"

/** Returns the editable weekly program and date overrides to administrators only. */
export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const denied = requireAdmin(request, env)
  if (denied) return denied
  try {
    const response = ok(await readHealthyDeal(env))
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    console.error("Healthy Deal admin loading failed", error)
    return err("HEALTHY_DEAL_ERROR", "Programul Healthy Deal nu a putut fi încărcat.", 503)
  }
}

/** Atomically replaces settings, refusing to overwrite another administrator's edit. */
export async function onRequestPut({ request, env }: Ctx): Promise<Response> {
  const denied = requireAdmin(request, env)
  if (denied) return denied
  if (request.headers.get("Origin") !== new URL(request.url).origin) return err("INVALID_ORIGIN", "Origine nepermisă.", 403)
  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > 512 * 1024) return err("INVALID_INPUT", "Cerere prea mare.", 413)
  let document
  try {
    const input: unknown = JSON.parse(raw)
    if (!input || typeof input !== "object" || !("revision" in input)
      || typeof input.revision !== "number" || !Number.isSafeInteger(input.revision) || input.revision < 0
      || !("settings" in input)) throw new Error("Document Healthy Deal invalid.")
    document = { revision: input.revision, settings: parseHealthyDealSettings(input.settings) }
  } catch (error) {
    return err("INVALID_INPUT", error instanceof Error ? error.message : "Date invalide.", 400)
  }
  try {
    const result = await env.DB.prepare(`UPDATE healthy_deal_settings
      SET config_json=?, revision=revision+1 WHERE id=1 AND revision=?`)
      .bind(JSON.stringify(document.settings), document.revision).run()
    if (!result.success) throw new Error("Healthy Deal update failed")
    if (result.meta?.changes !== 1) return err("CONFLICT", "Programul a fost modificat între timp. Reîncarcă pagina înainte de salvare.", 409)
    return ok({ ...document, revision: document.revision + 1 })
  } catch (error) {
    console.error("Healthy Deal saving failed", error)
    return err("HEALTHY_DEAL_ERROR", "Programul Healthy Deal nu a putut fi salvat.", 503)
  }
}
