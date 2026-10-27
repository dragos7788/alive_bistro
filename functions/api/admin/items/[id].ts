import type { Ctx } from "../../../_lib/types.ts"
import { ok, err } from "../../../_lib/response.ts"
import { requireAdmin } from "../../../_lib/auth.ts"
import { validateStock, type StockSettings } from "../../../_lib/stock"
import { parseImagePosition } from "../../../_lib/image-position"

export const onRequestPut = async ({ request, env, params }: Ctx<"id">) => {
  const deny = requireAdmin(request, env)
  if (deny) return deny

  const b = await request.json() as Record<string, unknown>
  const exists = await env.DB.prepare("SELECT * FROM items WHERE id = ?").bind(params.id).first<
    StockSettings & { price: string; image_position_x: number; image_position_y: number }
  >()
  if (!exists) return err("NOT_FOUND", "Item not found", 404)
  const imagePosition = parseImagePosition(b.image_position_x, b.image_position_y, {
    x: exists.image_position_x,
    y: exists.image_position_y,
  })
  if (!imagePosition) return err("VALIDATION_ERROR", "Poziția imaginii trebuie să fie între 0 și 100.", 400)
  if ("expected_stock_quantity" in b && b.expected_stock_quantity !== exists.stock_quantity) {
    return err("STOCK_CHANGED", "Stocul s-a schimbat între timp. Închide formularul și reîncarcă lista.", 409)
  }
  let stock
  try { stock = validateStock({ ...exists, ...b }, String(b.price ?? exists.price)) }
  catch (error) { return err("VALIDATION_ERROR", error instanceof Error ? error.message : "Stoc invalid", 400) }
  if (stock.stock_quantity !== exists.stock_quantity) {
    const active = await env.DB.prepare(
      "SELECT 1 AS active FROM test_order_stock s JOIN test_orders o ON o.number = s.order_number WHERE s.item_id = ? AND o.preparation_status IN ('new', 'preparing', 'ready') LIMIT 1",
    ).bind(params.id).first()
    if (active && (stock.stock_quantity === null || exists.stock_quantity === null)) {
      return err("STOCK_MODE_CONFLICT", "Anulează sau finalizează comenzile TEST active înainte de schimbarea modului de urmărire a stocului.", 409)
    }
  }

  try {
  const saved = await env.DB.prepare(
    `UPDATE items SET
      name = ?, name_en = ?, description = ?, description_en = ?,
      price = ?, image_key = ?, image_url = ?, tag = ?,
      calories = ?, protein = ?, carbs = ?, fat = ?, is_visible = ?,
      is_available = ?, stock_quantity = ?, show_stock = ?,
      image_position_x = ?, image_position_y = ?
     WHERE id = ? AND stock_quantity IS ?`
  ).bind(
    b.name, b.name_en ?? null, b.description, b.description_en ?? null,
    b.price, b.image_key ?? null, b.image_url ?? null, b.tag ?? null,
    b.calories ?? null, b.protein ?? null, b.carbs ?? null, b.fat ?? null,
    b.is_visible === false || b.is_visible === 0 ? 0 : 1,
    stock.is_available, stock.stock_quantity, stock.show_stock, imagePosition.x, imagePosition.y,
    params.id, exists.stock_quantity,
  ).run()
  if (saved.meta?.changes === 0) return err("STOCK_CHANGED", "Stocul s-a schimbat între timp. Reîncarcă produsul.", 409)
  } catch (error) {
    console.error("Failed to update item inventory", error)
    if (error instanceof Error && error.message.includes("STOCK_MODE_CONFLICT")) {
      return err("STOCK_MODE_CONFLICT", "Există comenzi TEST active. Reîncarcă produsul; modul de stoc nu poate fi schimbat.", 409)
    }
    return err("DB_ERROR", "Produsul și stocul nu au putut fi salvate.", 500)
  }

  const row = await env.DB.prepare("SELECT * FROM items WHERE id = ?").bind(params.id).first()
  if (row?.stock_quantity !== stock.stock_quantity) return err("STOCK_CHANGED", "Stocul s-a schimbat între timp. Reîncarcă produsul.", 409)
  return ok(row)
}

export const onRequestDelete = async ({ request, env, params }: Ctx<"id">) => {
  const deny = requireAdmin(request, env)
  if (deny) return deny

  const exists = await env.DB.prepare("SELECT id FROM items WHERE id = ?").bind(params.id).first()
  if (!exists) return err("NOT_FOUND", "Item not found", 404)
  const used = await env.DB.prepare("SELECT 1 AS used FROM test_order_stock WHERE item_id = ? LIMIT 1").bind(params.id).first()
  if (used) return err("ITEM_IN_ORDERS", "Produsul are istoric de comenzi TEST. Ascunde-l în loc să îl ștergi.", 409)

  await env.DB.prepare("DELETE FROM items WHERE id = ?").bind(params.id).run()
  return ok({ deleted: params.id })
}
