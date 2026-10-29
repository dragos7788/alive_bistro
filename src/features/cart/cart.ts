import type { MenuGroup, MenuItem } from "../menu/types"
import { builderGroups, calculateMenu, ingredients, type MenuSelection } from "../menu-builder/calculator"
import { discountBani, parsePriceBani } from "../pricing/discount"
export { parsePriceBani } from "../pricing/discount"

export type CartEntry = { key: string; name: string; quantity: number; selection?: MenuSelection }
export type CartProduct = {
  key: string; name: string; priceBani: number | null; portion?: string; selection?: MenuSelection
  isAvailable?: boolean; stockQuantity?: number; originalPriceBani?: number
}
export const cartStorageKey = "alive_bistro_cart_v1"

/** Identifies menu categories reserved for on-location alcohol purchases. */
export function isAlcoholCategory(categoryId: string): boolean {
  return ["craft-beer", "wine-prosecco", "cocktails"].includes(categoryId)
}

function readSelection(value: unknown): MenuSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some(key => !builderGroups.some(group => group === key))) {
    throw new Error("Invalid Performance selection")
  }
  const choices = new Map<string, unknown>(Object.entries(value))
  const selection: MenuSelection = {}
  for (const group of builderGroups) {
    if (!choices.has(group)) continue
    const choice = choices.get(group)
    if (!choice || typeof choice !== "object"
      || !("ingredientId" in choice) || typeof choice.ingredientId !== "string"
      || !("amount" in choice) || typeof choice.amount !== "number"
      || !Number.isFinite(choice.amount) || choice.amount <= 0) {
      throw new Error("Invalid Performance portion")
    }
    selection[group] = { ingredientId: choice.ingredientId, amount: choice.amount }
  }
  if (!Object.keys(selection).length) throw new Error("Empty Performance selection")
  return selection
}

function performanceKey(selection: MenuSelection): string {
  return JSON.stringify(["performance", builderGroups.flatMap(group => {
    const choice = selection[group]
    return choice ? [[group, choice.ingredientId, choice.amount]] : []
  })])
}

function availableSelection(selection: MenuSelection): boolean {
  return builderGroups.every(group => {
    const choice = selection[group]
    return !choice || ingredients.some(ingredient => ingredient.group === group
      && ingredient.id === choice.ingredientId && ingredient.portions.some(portion => portion.amount === choice.amount))
  })
}

/** Snapshots a nonempty plate with a stable identity and its current catalog price. */
export function performanceCartProduct(value: MenuSelection, discountPercent = 0): CartProduct {
  const selection = readSelection(value)
  if (!availableSelection(selection)) throw new Error("Unavailable Performance selection")
  const total = calculateMenu(selection)
  return {
    key: performanceKey(selection), name: "Meniu Performance",
    priceBani: discountBani(Math.round(total.price * 100), discountPercent), selection,
  }
}

/** Identifies a menu product within its category without depending on list order. */
export function cartProductKey(categoryId: string, name: string): string {
  return JSON.stringify([categoryId, name])
}

/** Builds the current catalog used to resolve cart prices and availability. */
export function cartCatalog(groups: MenuGroup[]): Map<string, CartProduct> {
  return new Map(groups.flatMap(group => group.categories.flatMap(category =>
    category.items.flatMap(item => cartOptions(category.id, item).map(option => [option.key, option] as const)))))
}

/** Resolves individual products or explicitly labeled bottle/glass portions from the menu. */
export function cartOptions(categoryId: string, item: MenuItem): CartProduct[] {
  if (isAlcoholCategory(categoryId) || item.menuComponent) return []
  const key = cartProductKey(categoryId, item.name)
  const stock = { isAvailable: item.isAvailable !== false && item.stockQuantity !== 0, stockQuantity: item.stockQuantity }
  const priceBani = parsePriceBani(item.price)
  if (priceBani !== null) return [{
    key, name: item.name, priceBani, ...stock,
    ...(item.originalPrice && parsePriceBani(item.originalPrice) !== null
      ? { originalPriceBani: parsePriceBani(item.originalPrice)! } : {}),
  }]
  const prices = /^(\d+(?:[.,]\d{1,2})?)\s*\/\s*(\d+(?:[.,]\d{1,2})?)\s*(lei|ron)$/i.exec(item.price.trim())
  const originals = item.originalPrice
    ? /^(\d+(?:[.,]\d{1,2})?)\s*\/\s*(\d+(?:[.,]\d{1,2})?)\s*(lei|ron)$/i.exec(item.originalPrice.trim()) : null
  const portions = /^(\d+)\s*ml\s*\/\s*(\d+)\s*ml\b/i.exec(item.description.trim())
  if (!prices || !portions) return []
  return [1, 2].map(index => {
    const portion = `${portions[index]} ml`
    return {
      key: JSON.stringify([categoryId, item.name, portion]),
      name: `${item.name} (${portion})`,
      portion,
      priceBani: parsePriceBani(`${prices[index]} ${prices[3]}`),
      ...(originals && parsePriceBani(`${originals[index]} ${originals[3]}`) !== null
        ? { originalPriceBani: parsePriceBani(`${originals[index]} ${originals[3]}`)! } : {}),
      ...stock,
    }
  }).filter(option => option.priceBani !== null)
}

/** Restores a versioned cart, rejecting invalid data rather than trusting browser storage. */
export function restoreCart(raw: string | null): CartEntry[] {
  if (raw === null) return []
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1
    || !("items" in value) || !Array.isArray(value.items)) throw new Error("Invalid cart")
  const keys = new Set<string>()
  return value.items.map((item: unknown) => {
    if (!item || typeof item !== "object" || !("key" in item) || typeof item.key !== "string"
      || !("name" in item) || typeof item.name !== "string" || !item.name.trim()
      || !("quantity" in item) || typeof item.quantity !== "number"
      || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || keys.has(item.key)) {
      throw new Error("Invalid cart item")
    }
    keys.add(item.key)
    const selection = "selection" in item ? readSelection(item.selection) : undefined
    if (selection && item.key !== performanceKey(selection)) throw new Error("Invalid Performance identity")
    return { key: item.key, name: item.name, quantity: item.quantity, ...(selection ? { selection } : {}) }
  })
}

/** Adds a product or updates its quantity; zero removes the line. */
export function updateCart(items: CartEntry[], product: Pick<CartProduct, "key" | "name" | "selection">, quantity: number): CartEntry[] {
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("Invalid quantity")
  if (quantity === 0) return items.filter(item => item.key !== product.key)
  const entry = {
    key: product.key, name: product.name, quantity,
    ...(product.selection ? { selection: readSelection(product.selection) } : {}),
  }
  if (entry.selection && entry.key !== performanceKey(entry.selection)) throw new Error("Invalid Performance identity")
  return items.some(item => item.key === product.key)
    ? items.map(item => item.key === product.key ? entry : item)
    : [...items, entry]
}

/** Resolves current prices; unavailable or unsafe lines cannot contribute to a total. */
export function summarizeCart(items: CartEntry[], catalog: Map<string, CartProduct>, performanceDiscountPercent = 0) {
  const lines = items.map(item => {
    const plate = item.selection && availableSelection(item.selection) ? calculateMenu(item.selection) : null
    const priceBani = item.selection
      ? plate ? discountBani(Math.round(plate.price * 100), performanceDiscountPercent) : null
      : catalog.get(item.key)?.isAvailable === false
        || (catalog.get(item.key)?.stockQuantity ?? Infinity) < item.quantity
        ? null : catalog.get(item.key)?.priceBani ?? null
    const amount = priceBani === null ? null : priceBani * item.quantity
    return {
      ...item, plate, priceBani, stockQuantity: catalog.get(item.key)?.stockQuantity,
      originalPriceBani: item.selection
        ? plate && performanceDiscountPercent > 0 ? Math.round(plate.price * 100) : undefined
        : catalog.get(item.key)?.originalPriceBani,
      subtotalBani: amount !== null && Number.isSafeInteger(amount) ? amount : null,
    }
  })
  const total = lines.reduce((sum, line) => sum + (line.subtotalBani ?? 0), 0)
  return {
    lines,
    totalBani: lines.every(line => line.subtotalBani !== null) && Number.isSafeInteger(total) ? total : null,
  }
}
