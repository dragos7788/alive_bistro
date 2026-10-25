import type { Ctx } from "../../../_lib/types.ts"
import { ok, err } from "../../../_lib/response.ts"
import { requireAdmin } from "../../../_lib/auth.ts"
import { validateStock } from "../../../_lib/stock"

export const onRequestGet = async ({ request, env }: Ctx) => {
  const deny = requireAdmin(request, env)
  if (deny) return deny

  const category = new URL(request.url).searchParams.get("category")
  const { results } = category
    ? await env.DB.prepare(
        "SELECT * FROM items WHERE category_id = ? ORDER BY sort_order"
      ).bind(category).all()
    : await env.DB.prepare(
        "SELECT * FROM items ORDER BY category_id, sort_order"
      ).all()

  return ok(results)
}

export const onRequestPost = async ({ request, env }: Ctx) => {
  const deny = requireAdmin(request, env)
  if (deny) return deny

  const b = await request.json() as Record<string, unknown>
  if (!b.category_id || !b.name || !b.description || !b.price) {
    return err("VALIDATION_ERROR", "category_id, name, description, price are required", 400)
  }
  let stock
  try { stock = validateStock(b, String(b.price)) }
  catch (error) { return err("VALIDATION_ERROR", error instanceof Error ? error.message : "Stoc invalid", 400) }

  const id = `${b.category_id}--${crypto.randomUUID()}`
  const { results: [last] } = await env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM items WHERE category_id = ?"
  ).bind(b.category_id).all<{ next: number }>()

  await env.DB.prepare(
    `INSERT INTO items (id, category_id, name, name_en, description, description_en, price, image_key, image_url, tag, calories, protein, carbs, fat, sort_order, is_available, stock_quantity, show_stock, is_visible)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, b.category_id, b.name, b.name_en ?? null, b.description, b.description_en ?? null,
    b.price, b.image_key ?? null, b.image_url ?? null, b.tag ?? null,
    b.calories ?? null, b.protein ?? null, b.carbs ?? null, b.fat ?? null,
    last?.next ?? 0,
    stock.is_available, stock.stock_quantity, stock.show_stock, b.is_visible === false || b.is_visible === 0 ? 0 : 1,
  ).run()

  const row = await env.DB.prepare("SELECT * FROM items WHERE id = ?").bind(id).first()
  return ok(row, 201)
}
