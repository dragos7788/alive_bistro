import type { MenuGroup, MenuItem } from "./types"
import { menuData } from "./seed"

const localItems = new Map<string, MenuItem>()
const localMatchaOrder = new Map<string, number>()
for (const group of menuData) {
  for (const category of group.categories) {
    category.items.forEach((item, index) => {
      localItems.set(item.name, item)
      if (category.id === "tea-matcha") localMatchaOrder.set(item.name, index)
    })
  }
}

export async function getMenu(): Promise<MenuGroup[]> {
  try {
    const res = await fetch("/api/menu")
    if (!res.ok) return menuData
    const { data } = await res.json() as { data: MenuGroup[] }
    return Array.isArray(data) && data.length > 0
      ? data.map((group) => ({
          ...group,
          categories: group.categories.map((category) => ({
            ...category,
              items: category.items.map((item) => {
                const localItem = localItems.get(item.name)
                return {
                  ...item,
                  image: item.image ?? localItem?.image,
                  imageSrcSet: item.image ? item.imageSrcSet : localItem?.imageSrcSet,
                  ...(item.description_en || localItem?.description_en
                    ? { description_en: item.description_en ?? localItem?.description_en }
                    : {}),
                  macros: item.macros ?? localItem?.macros,
                  ...(item.nutritionEstimated || localItem?.nutritionEstimated ? { nutritionEstimated: true } : {}),
                }
              }).sort((a, b) => category.id === "tea-matcha"
                ? (localMatchaOrder.get(a.name) ?? Number.MAX_SAFE_INTEGER)
                  - (localMatchaOrder.get(b.name) ?? Number.MAX_SAFE_INTEGER)
                : 0),
            })),
        }))
      : menuData
  } catch {
    return menuData
  }
}
