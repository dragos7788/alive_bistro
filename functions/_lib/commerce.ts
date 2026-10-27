import type { Env } from "./types"
import { err } from "./response"

/** Reads the persisted global sales switch; missing or invalid settings are errors. */
export async function readCommerceSettings(env: Env): Promise<{ salesEnabled: boolean }> {
  const row = await env.DB.prepare("SELECT sales_enabled FROM commerce_settings WHERE id = 1")
    .first<{ sales_enabled: number }>()
  if (!row || (row.sales_enabled !== 0 && row.sales_enabled !== 1)) {
    throw new Error("Missing or invalid commerce settings")
  }
  return { salesEnabled: row.sales_enabled === 1 }
}

/** Returns the same refusal for a disabled sales check and an in-flight database insert. */
export function salesDisabledResponse(): Response {
  return err("SALES_DISABLED", "Comercializarea produselor este oprită momentan.", 403)
}
