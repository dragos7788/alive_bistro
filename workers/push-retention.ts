import { purgeExpiredPushRecords } from "../functions/_lib/push-retention"
import type { Env as ApplicationEnv } from "../functions/_lib/types"

interface Env {
  DB: ApplicationEnv["DB"]
}

export default {
  async scheduled(_event: { cron: string }, env: Env): Promise<void> {
    await purgeExpiredPushRecords(env.DB, Math.floor(Date.now() / 1000))
  },
}
