import type { Ctx } from "../../_lib/types"
import { testOrdersEnabled } from "../../_lib/test-orders"

export const onRequestGet = ({ request, env }: Ctx) =>
  Response.json({ data: { testOrdersEnabled: testOrdersEnabled(request, env) } }, {
    headers: { "Cache-Control": "no-store" },
  })
