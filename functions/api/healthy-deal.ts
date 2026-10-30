import type { Ctx } from "../_lib/types"
import { err, ok } from "../_lib/response"
import { readHealthyDeal } from "../_lib/healthy-deal"

/** Publishes enabled offers only; closed overrides still suppress the recurring day. */
export async function onRequestGet({ env }: Ctx): Promise<Response> {
  try {
    const document = await readHealthyDeal(env)
    const settings = document.settings
    const empty = { enabled: false, soup: { name: "", description: "", allergens: "", grams: null, macros: null, image: "" },
      main: { name: "", description: "", allergens: "", grams: null, macros: null, image: "" } }
    const visible = (entries: typeof settings.weekly) => Object.fromEntries(
      Object.entries(entries).map(([key, entry]) => [key, settings.enabled && entry.enabled ? entry : empty]),
    )
    const response = ok({
      revision: document.revision,
      settings: { ...settings, weekly: visible(settings.weekly), overrides: visible(settings.overrides) },
      serverTime: new Date().toISOString(),
    })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    console.error("Healthy Deal public loading failed", error)
    return err("HEALTHY_DEAL_ERROR", "Oferta zilei nu a putut fi încărcată.", 503)
  }
}
