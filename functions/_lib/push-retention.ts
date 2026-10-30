import type { Env } from "./types"

const RETENTION_MONTHS = 12

function oneYearAgo(timestamp: number): number {
  const date = new Date(timestamp * 1000)
  const targetMonth = date.getUTCMonth() - RETENTION_MONTHS
  const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate()
  return Math.floor(Date.UTC(
    targetYear,
    normalizedMonth,
    Math.min(date.getUTCDate(), lastDayOfTargetMonth),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ) / 1000)
}

/** Removes withdrawn push records and completed campaign history after their retention period. */
export async function purgeExpiredPushRecords(db: Pick<Env["DB"], "prepare" | "batch">, now: number): Promise<void> {
  const cutoff = oneYearAgo(now)
  await db.batch([
    db.prepare(`DELETE FROM customer_push_consent_events
      WHERE id<=COALESCE((
        SELECT MAX(expired.id) FROM customer_push_consent_events expired
        WHERE expired.customer_id=customer_push_consent_events.customer_id
          AND expired.action='withdrawn' AND expired.created_at<=?
      ),0)`).bind(cutoff),
    db.prepare(`DELETE FROM push_deliveries
      WHERE campaign_id IN (
        SELECT campaign.id FROM push_campaigns campaign
        WHERE campaign.created_at<=? AND NOT EXISTS (
          SELECT 1 FROM push_deliveries delivery
          WHERE delivery.campaign_id=campaign.id AND delivery.status='sending'
        )
      )`).bind(cutoff),
    db.prepare(`DELETE FROM push_campaigns
      WHERE created_at<=? AND NOT EXISTS (
        SELECT 1 FROM push_deliveries delivery
        WHERE delivery.campaign_id=push_campaigns.id
      )`).bind(cutoff),
  ])
}
