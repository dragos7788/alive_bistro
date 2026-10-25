import type { Ctx } from "../../../_lib/types.ts"
import { ok, err } from "../../../_lib/response.ts"
import { requireAdmin } from "../../../_lib/auth.ts"

const VALID_GROUPS = new Set(["food", "drinks"])

export const onRequestGet = async ({ request, env }: Ctx) => {
  const deny = requireAdmin(request, env)
  if (deny) return deny

  const { results } = await env.DB.prepare(
    "SELECT * FROM categories ORDER BY group_id, sort_order"
  ).all()
  return ok(results)
}

export const onRequestPost = async ({ request, env }: Ctx) => {
  const deny = requireAdmin(request)
  if (deny) return deny

  const b = await request.json() as Record<string, unknown>
  if (!b.id || !b.group_id || !b.label || !b.icon_key) {
    return err("VALIDATION_ERROR", "id, group_id, label, icon_key are required", 400)
  }
  if (!VALID_GROUPS.has(b.group_id as string)) {
    return err("VALIDATION_ERROR", "group_id must be 'food' or 'drinks'", 400)
  }

  const { results: [last] } = await env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories WHERE group_id = ?"
  ).bind(b.group_id).all<{ next: number }>()

  await env.DB.prepare(
    "INSERT INTO categories (id, group_id, label, label_en, icon_key, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(b.id, b.group_id, b.label, b.label_en ?? null, b.icon_key, last?.next ?? 0).run()

  const row = await env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(b.id).first()
  return ok(row, 201)
}
