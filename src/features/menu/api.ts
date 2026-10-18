import type { MenuGroup, MenuItem } from "./types"
import { menuData } from "./seed"

const localItems = new Map<string, MenuItem>()
for (const group of menuData) {
  for (const category of group.categories) {
    for (const item of category.items) {
      localItems.set(item.name, item)
    }
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
                  macros: item.macros ?? localItem?.macros,
                  ...(item.nutritionEstimated || localItem?.nutritionEstimated ? { nutritionEstimated: true } : {}),
                }
              }),
            })),
        }))
      : menuData
  } catch {
    return menuData
  }
}
