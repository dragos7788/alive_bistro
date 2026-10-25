export const preparationStatuses = ["new", "preparing", "ready", "collected", "cancelled"] as const
export type PreparationStatus = typeof preparationStatuses[number]
export type OrderLine = {
  key: string
  name: string
  quantity: number
  priceBani: number
  subtotalBani: number
  ingredients: { id: string; amount: number; unit: "g" | "ml" }[]
}
export type TestOrder = {
  number: string
  mode: "TEST"
  paymentStatus: "unpaid"
  preparationStatus: PreparationStatus
  createdAt: string
  contact: { name: string; phone: string; email: string }
  totalBani: number
  lines: OrderLine[]
}

/** Allows forward preparation steps or cancellation, never a payment state change. */
export function canTransition(from: PreparationStatus, to: PreparationStatus): boolean {
  return from === to || (from === "new" && (to === "preparing" || to === "cancelled"))
    || (from === "preparing" && (to === "ready" || to === "cancelled"))
    || (from === "ready" && (to === "collected" || to === "cancelled"))
}
