import type { Ctx } from "../_lib/types.ts"
import { err } from "../_lib/response.ts"
import { publicStock, type StockSettings } from "../_lib/stock"
import { readPromotions } from "../_lib/food-promotion"
import { discountedMenuPrice } from "../../src/features/pricing/discount"

type DbCat  = { id: string; group_id: string; label: string; label_en: string | null; icon_key: string }
type DbItem = StockSettings & {
  id: string; category_id: string; name: string; name_en: string | null
  description: string; description_en: string | null; price: string
  image_key: string | null; image_url: string | null; tag: string | null
  image_position_x: number; image_position_y: number; image_zoom: number
  calories: number | null; protein: string | null; carbs: string | null; fat: string | null
}

const GROUPS = [
  { id: "food",   label: "Mâncare", iconKey: "fork-knife" },
  { id: "drinks", label: "Băuturi", iconKey: "coffee" },
]

export const onRequestGet = async ({ request, env }: Ctx) => {
  try {
    const promotions = await readPromotions(env)
    const discounts = new Map(promotions.categories.map(category => [category.id, category.discountPercent]))
    const [catsRes, itemsRes] = await env.DB.batch([
      env.DB.prepare("SELECT id, group_id, label, label_en, icon_key FROM categories ORDER BY sort_order"),
      env.DB.prepare("SELECT id, category_id, name, name_en, description, description_en, price, image_key, image_url, image_position_x, image_position_y, image_zoom, tag, calories, protein, carbs, fat, is_available, stock_quantity, show_stock FROM items WHERE is_visible = 1 ORDER BY category_id, sort_order"),
    ])

    const cats  = catsRes.results  as unknown as DbCat[]
    const items = itemsRes.results as unknown as DbItem[]

    const byCat = new Map<string, typeof shaped[number][]>()
    const shaped = items.map((r) => ({
      ...publicStock(r),
      name:           r.name,
      name_en:        r.name_en ?? undefined,
      description:    r.description,
      description_en: r.description_en ?? undefined,
      ...discountedMenuPrice(r.price, discounts.get(r.category_id) ?? 0),
      image:          r.image_key ? `/api/images/${r.image_key}` : (r.image_url ?? undefined),
      imagePosition:  { x: r.image_position_x, y: r.image_position_y },
      imageZoom:      r.image_zoom,
      tag:            r.tag ?? undefined,
      macros:         r.calories != null
        ? { calories: r.calories, protein: r.protein!, carbs: r.carbs ?? undefined, fat: r.fat! }
        : undefined,
    }))
    items.forEach((r, i) => {
      const list = byCat.get(r.category_id) ?? []
      list.push(shaped[i])
      byCat.set(r.category_id, list)
    })

    const catsByGroup = new Map<string, unknown[]>()
    for (const cat of cats) {
      const entry = {
        id:       cat.id,
        label:    cat.label,
        label_en: cat.label_en ?? undefined,
        iconKey:  cat.icon_key,
        discountPercent: discounts.get(cat.id) ?? 0,
        items:    byCat.get(cat.id) ?? [],
      }
      const list = catsByGroup.get(cat.group_id) ?? []
      list.push(entry)
      catsByGroup.set(cat.group_id, list)
    }

    const data = GROUPS.map((g) => ({
      ...g,
      ...(g.id === "food" ? { performanceDiscountPercent: promotions.performanceDiscountPercent } : {}),
      categories: catsByGroup.get(g.id) ?? [],
    }))

    const body = JSON.stringify({ data })
    const hash = await shortHash(body)
    const etag = `"${hash}"`

    if (request.headers.get("If-None-Match") === etag) {
      return new Response(null, { status: 304 })
    }

    return new Response(body, {
      headers: {
        "Content-Type":  "application/json",
        "Cache-Control": "no-cache, must-revalidate",
        ETag:            etag,
      },
    })
  } catch (e) {
    console.error("Failed to load menu and inventory", e)
    return err("DB_ERROR", "Failed to load menu", 500)
  }
}

async function shortHash(s: string): Promise<string> {
  const buf  = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12)
}
