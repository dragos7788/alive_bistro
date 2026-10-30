import type { MenuCategory, MenuItem } from "./types"

/** Preserves category and item order, including promotional panels in the continuous mobile list. */
export function continuousMenu(categories: MenuCategory[]): { category: MenuCategory; items: MenuItem[]; isPanel: boolean }[] {
  return categories.map(category => ({
    category,
    items: category.items,
    isPanel: category.id === "healthy-deal" || category.id === "halloween-special",
  }))
}
