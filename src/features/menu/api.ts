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
            items: category.items.map((item) => ({
              ...item,
              image: item.image ?? localItems.get(item.name)?.image,
              imageSrcSet: item.image ? item.imageSrcSet : localItems.get(item.name)?.imageSrcSet,
              macros: item.macros ?? localItems.get(item.name)?.macros,
            })),
          })),
        }))
      : menuData
  } catch {
    return menuData
  }
}
