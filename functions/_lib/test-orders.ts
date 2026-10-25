import type { Env } from "./types"
import { err } from "./response"
import { restoreCart, cartOptions, summarizeCart, type CartEntry, type CartProduct } from "../../src/features/cart/cart"
import { normalizeContact, validateContact, type ContactDetails } from "../../src/features/cart/checkout"
import { preparationStatuses, type TestOrder, type PreparationStatus, type OrderLine } from "../../src/features/orders/types"

/** Enables test ordering only on loopback URLs and with explicit server configuration. */
export function testOrdersEnabled(request: Request, env: Pick<Env, "LOCAL_TEST_ORDERS">): boolean {
  return env.LOCAL_TEST_ORDERS === "true"
    && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
}

/** Guards every test endpoint; writes additionally require a same-origin browser request. */
export function guardTestOrders(request: Request, env: Pick<Env, "LOCAL_TEST_ORDERS">, write = false): Response | null {
  if (!testOrdersEnabled(request, env)) return err("TEST_ORDERS_DISABLED", "Comenzile TEST sunt disponibile doar local, cu activare explicită.", 403)
  if (write && request.headers.get("Origin") !== new URL(request.url).origin) {
    return err("INVALID_ORIGIN", "Originea cererii nu este permisă.", 403)
  }
  return null
}

export interface OrderInput {
  contact: ContactDetails
  items: CartEntry[]
  expectedTotalBani: number
}

export class UnavailableOrderError extends Error {}

/** Validates untrusted checkout input before database access or price calculations. */
export function parseOrderInput(value: unknown): OrderInput {
  if (!value || typeof value !== "object" || !("contact" in value) || !value.contact
    || typeof value.contact !== "object" || !("items" in value) || !Array.isArray(value.items)
    || value.items.length < 1 || value.items.length > 100
    || !("expectedTotalBani" in value) || typeof value.expectedTotalBani !== "number"
    || !Number.isSafeInteger(value.expectedTotalBani) || value.expectedTotalBani <= 0) {
    throw new Error("Datele comenzii sunt invalide.")
  }
  const contact = value.contact
  if (!("name" in contact) || typeof contact.name !== "string"
    || !("phone" in contact) || typeof contact.phone !== "string"
    || !("email" in contact) || typeof contact.email !== "string") throw new Error("Datele de contact sunt invalide.")
  const normalized = normalizeContact({ name: contact.name, phone: contact.phone, email: contact.email })
  if (Object.keys(validateContact(normalized)).length) throw new Error("Verifică numele, telefonul și e-mailul.")
  const items = restoreCart(JSON.stringify({ version: 1, items: value.items }))
  if (items.some(item => item.quantity > 99)) throw new Error("Comenzile TEST permit cel mult 99 de bucăți pe linie.")
  return { contact: normalized, items, expectedTotalBani: value.expectedTotalBani }
}

/** Hashes only the normalized request so an idempotency key cannot be reused for another order. */
export async function orderRequestHash(input: OrderInput): Promise<string> {
  const items = input.items.map(item => ({
    key: item.key, quantity: item.quantity,
  })).sort((a, b) => a.key.localeCompare(b.key))
  const payload = JSON.stringify({ contact: input.contact, items, expectedTotalBani: input.expectedTotalBani })
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("")
}

/** Uses server catalog data, never client names or prices, to snapshot order lines. */
export async function resolveOrder(input: OrderInput, env: Env) {
  const { results } = await env.DB.prepare(
    "SELECT id, category_id, name, price, description, is_available, stock_quantity FROM items WHERE is_visible = 1",
  ).all<{ id: string; category_id: string; name: string; price: string; description: string; is_available: number; stock_quantity: number | null }>()
  const catalog = new Map<string, CartProduct>()
  const stockItems = new Map<string, string>()
  for (const item of results) {
    for (const option of cartOptions(item.category_id, {
      ...item, isAvailable: item.is_available !== 0,
      ...(item.stock_quantity !== null && item.stock_quantity !== undefined ? { stockQuantity: item.stock_quantity } : {}),
    })) {
      catalog.set(option.key, option)
      stockItems.set(option.key, item.id)
    }
  }
  const summary = summarizeCart(input.items, catalog)
  if (summary.totalBani === null || summary.totalBani <= 0) throw new UnavailableOrderError("Unele produse sau porții nu mai sunt disponibile.")
  const lines: OrderLine[] = summary.lines.map(line => {
    if (line.priceBani === null || line.subtotalBani === null) throw new UnavailableOrderError("Preț indisponibil.")
    return {
      key: line.key,
      name: line.selection ? "Meniu Performance" : catalog.get(line.key)!.name,
      quantity: line.quantity, priceBani: line.priceBani, subtotalBani: line.subtotalBani,
      ingredients: line.plate?.lines.map(({ ingredient, portion }) => ({
        id: ingredient.id, amount: portion.amount, unit: ingredient.unit,
      })) ?? [],
    }
  })
  const reservations = new Map<string, number>()
  for (const line of lines) {
    const itemId = stockItems.get(line.key)
    if (itemId) reservations.set(itemId, (reservations.get(itemId) ?? 0) + line.quantity)
  }
  return { lines, totalBani: summary.totalBani, reservations: [...reservations].map(([itemId, quantity]) => ({ itemId, quantity })) }
}

export type OrderRow = {
  number: string; request_hash: string; preparation_status: PreparationStatus; created_at: string
  contact_name: string; contact_phone: string; contact_email: string; total_bani: number; lines_json: string
}

/** Maps persisted test-only rows to the public admin contract. */
export function orderFromRow(row: OrderRow): TestOrder {
  if (!preparationStatuses.includes(row.preparation_status)) throw new Error("Invalid stored order state")
  return {
    number: row.number, mode: "TEST", paymentStatus: "unpaid", preparationStatus: row.preparation_status,
    createdAt: row.created_at, contact: { name: row.contact_name, phone: row.contact_phone, email: row.contact_email },
    totalBani: row.total_bani, lines: JSON.parse(row.lines_json),
  }
}
