import type { Ctx } from "../../../_lib/types.ts"
import { ok, err } from "../../../_lib/response.ts"
import { requireAdmin } from "../../../_lib/auth.ts"

export const onRequestPut = async ({ request, env, params }: Ctx<"id">) => {
  const deny = requireAdmin(request)
  if (deny) return deny

  const b = await request.json() as Record<string, unknown>
  const exists = await env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(params.id).first()
  if (!exists) return err("NOT_FOUND", "Category not found", 404)

  await env.DB.prepare(
    "UPDATE categories SET label = ?, label_en = ?, icon_key = ? WHERE id = ?"
  ).bind(b.label, b.label_en ?? null, b.icon_key, params.id).run()

  const row = await env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(params.id).first()
  return ok(row)
}

export const onRequestDelete = async ({ request, env, params }: Ctx<"id">) => {
  const deny = requireAdmin(request)
  if (deny) return deny

  const exists = await env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(params.id).first()
  if (!exists) return err("NOT_FOUND", "Category not found", 404)

  // CASCADE deletes items too (defined in migration FK)
  await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(params.id).run()
  return ok({ deleted: params.id })
}
