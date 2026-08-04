import type { MenuGroup } from "./types"
import { menuData } from "./seed"

export async function getMenu(): Promise<MenuGroup[]> {
  try {
    const res = await fetch("/api/menu")
    if (!res.ok) return menuData
    const { data } = await res.json() as { data: MenuGroup[] }
    return Array.isArray(data) && data.length > 0 ? data : menuData
  } catch {
    return menuData
  }
}
