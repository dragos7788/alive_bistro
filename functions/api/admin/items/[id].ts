import type { Ctx } from "../../../_lib/types.ts"
import { ok, err } from "../../../_lib/response.ts"
import { requireAdmin } from "../../../_lib/auth.ts"

export const onRequestPut = async ({ request, env, params }: Ctx<"id">) => {
  const deny = requireAdmin(request)
  if (deny) return deny

  const b = await request.json() as Record<string, unknown>
  const exists = await env.DB.prepare("SELECT id FROM items WHERE id = ?").bind(params.id).first()
  if (!exists) return err("NOT_FOUND", "Item not found", 404)

  await env.DB.prepare(
    `UPDATE items SET
      name = ?, name_en = ?, description = ?, description_en = ?,
      price = ?, image_key = ?, image_url = ?, tag = ?,
      calories = ?, protein = ?, carbs = ?, fat = ?, is_visible = ?
     WHERE id = ?`
  ).bind(
    b.name, b.name_en ?? null, b.description, b.description_en ?? null,
    b.price, b.image_key ?? null, b.image_url ?? null, b.tag ?? null,
    b.calories ?? null, b.protein ?? null, b.carbs ?? null, b.fat ?? null,
    b.is_visible !== false ? 1 : 0,
    params.id,
  ).run()

  const row = await env.DB.prepare("SELECT * FROM items WHERE id = ?").bind(params.id).first()
  return ok(row)
}

export const onRequestDelete = async ({ request, env, params }: Ctx<"id">) => {
  const deny = requireAdmin(request)
  if (deny) return deny

  const exists = await env.DB.prepare("SELECT id FROM items WHERE id = ?").bind(params.id).first()
  if (!exists) return err("NOT_FOUND", "Item not found", 404)

  await env.DB.prepare("DELETE FROM items WHERE id = ?").bind(params.id).run()
  return ok({ deleted: params.id })
}
