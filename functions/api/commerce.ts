import type { Ctx } from "../_lib/types"
import { readCommerceSettings } from "../_lib/commerce"
import { err, ok } from "../_lib/response"

/** Publishes the global sales status without caching or exposing admin settings. */
export async function onRequestGet({ env }: Ctx): Promise<Response> {
  try {
    const response = ok(await readCommerceSettings(env))
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    console.error("Commerce settings loading failed", error)
    const response = err("COMMERCE_ERROR", "Starea comercializării nu a putut fi verificată.", 503)
    response.headers.set("Cache-Control", "no-store")
    return response
  }
}
