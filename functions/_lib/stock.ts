export type StockSettings = { is_available: number; stock_quantity: number | null; show_stock: number }

/** Validates inventory settings and refuses ambiguous numeric stock for bottle/glass products. */
export function validateStock(value: Record<string, unknown>, price: string): StockSettings {
  const available = value.is_available ?? true
  const show = value.show_stock ?? false
  const quantity = value.stock_quantity ?? null
  const isFlag = (flag: unknown) => flag === true || flag === false || flag === 0 || flag === 1
  if (!isFlag(available) || !isFlag(show)
    || (quantity !== null && (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0 || quantity > 1000000))) {
    throw new Error("Stoc invalid: folosește un număr întreg între 0 și 1.000.000 sau fără urmărire.")
  }
  if (price.includes("/") && quantity !== null) {
    throw new Error("Produsele sticlă/pahar permit doar disponibil/indisponibil, fără stoc numeric.")
  }
  return { is_available: available ? 1 : 0, stock_quantity: typeof quantity === "number" ? quantity : null, show_stock: show ? 1 : 0 }
}

/** Exposes numeric stock only when the merchant opts in; availability is always public. */
export function publicStock(value: StockSettings) {
  return {
    isAvailable: value.is_available === 1 && value.stock_quantity !== 0,
    ...(value.show_stock === 1 && value.stock_quantity !== null ? { stockQuantity: value.stock_quantity } : {}),
  }
}
