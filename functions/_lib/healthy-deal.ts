import type { Env } from "./types"
import {
  defaultHealthyDealSettings, parseHealthyDealSettings, type HealthyDealDocument,
} from "../../src/features/healthy-deal/schedule"

/** Reads the versioned schedule; NULL is the explicit initial poster-based template. */
export async function readHealthyDeal(env: Env): Promise<HealthyDealDocument> {
  const row = await env.DB.prepare("SELECT config_json, revision FROM healthy_deal_settings WHERE id=1")
    .first<{ config_json: string | null; revision: number }>()
  if (!row) throw new Error("Healthy Deal migration is missing")
  return {
    revision: row.revision,
    settings: parseHealthyDealSettings(row.config_json === null ? defaultHealthyDealSettings : JSON.parse(row.config_json)),
  }
}
