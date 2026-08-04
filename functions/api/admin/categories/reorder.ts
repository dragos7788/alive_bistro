import type { Ctx } from "../../../_lib/types.ts"
import { ok, err } from "../../../_lib/response.ts"
import { requireAdmin } from "../../../_lib/auth.ts"

export const onRequestPost = async ({ request, env }: Ctx) => {
  const deny = requireAdmin(request)
  if (deny) return deny

  const { ids } = await request.json() as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return err("VALIDATION_ERROR", "ids must be a non-empty array", 400)
  }

  await env.DB.batch(
    ids.map((id, i) => env.DB.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").bind(i, id))
  )
  return ok({ reordered: ids.length })
}
