import type { Ctx } from "../../_lib/types"
import { testOrdersEnabled } from "../../_lib/test-orders"
import { readCommerceSettings } from "../../_lib/commerce"
import { err, ok } from "../../_lib/response"

/** Keeps the local TEST submission capability consistent with the global sales switch. */
export const onRequestGet = async ({ request, env }: Ctx) => {
  try {
    const enabled = testOrdersEnabled(request, env) && (await readCommerceSettings(env)).salesEnabled
    const response = ok({ testOrdersEnabled: enabled })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    console.error("TEST order configuration loading failed", error)
    const response = err("COMMERCE_ERROR", "Starea comercializării nu a putut fi verificată.", 503)
    response.headers.set("Cache-Control", "no-store")
    return response
  }
}
