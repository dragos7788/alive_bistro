import { describe, expect, it } from "vitest"
import { publicStock, validateStock } from "./stock"
import { cartCatalog, cartProductKey, summarizeCart } from "../../src/features/cart/cart"
import type { MenuGroup } from "../../src/features/menu/types"
import { requireAdmin } from "./auth"

describe("inventory settings", () => {
  it("limits local inventory admin access to explicit loopback TEST mode and same-origin writes", () => {
    const env = { LOCAL_TEST_ORDERS: "true" }
    expect(requireAdmin(new Request("http://127.0.0.1:8792/api/admin/items"), env)).toBeNull()
    expect(requireAdmin(new Request("https://example.com/api/admin/items"), env)?.status).toBe(401)
    expect(requireAdmin(new Request("http://127.0.0.1:8792/api/admin/items"))?.status).toBe(401)
    expect(requireAdmin(new Request("http://127.0.0.1:8792/api/admin/items", {
      method: "PUT", headers: { Origin: "https://example.com" },
    }), env)?.status).toBe(403)
  })
  it.each([null, 0, 1, 1000000])("accepts stock boundary %j", quantity => {
    expect(validateStock({ stock_quantity: quantity }, "12 lei").stock_quantity).toBe(quantity)
  })
  it.each([-1, 0.5, "2", 1000001, Infinity, NaN])("rejects invalid stock %j", stock_quantity => {
    expect(() => validateStock({ stock_quantity }, "12 lei")).toThrow()
  })
  it("keeps no tracking separate from zero and from manual availability", () => {
    expect(publicStock({ is_available: 1, stock_quantity: null, show_stock: 1 })).toEqual({ isAvailable: true })
    expect(publicStock({ is_available: 1, stock_quantity: 0, show_stock: 0 })).toEqual({ isAvailable: false })
    expect(publicStock({ is_available: 0, stock_quantity: 10, show_stock: 0 })).toEqual({ isAvailable: false })
  })
  it("does not disclose hidden numeric stock", () => {
    expect(publicStock({ is_available: 1, stock_quantity: 7, show_stock: 0 })).not.toHaveProperty("stockQuantity")
    expect(publicStock({ is_available: 1, stock_quantity: 7, show_stock: 1 })).toEqual({ isAvailable: true, stockQuantity: 7 })
  })
  it("rejects numeric stock on bottle/glass products", () => {
    expect(() => validateStock({ stock_quantity: 1 }, "100 / 28 lei")).toThrow()
    expect(validateStock({ stock_quantity: null, is_available: false }, "100 / 28 lei").is_available).toBe(0)
  })
  it.each(["false", 2, {}, []])("rejects invalid flags %j", flag => {
    expect(() => validateStock({ is_available: flag }, "12 lei")).toThrow()
    expect(() => validateStock({ show_stock: flag }, "12 lei")).toThrow()
  })
  it("blocks carts at zero, manual unavailable and above visible stock", () => {
    const key = cartProductKey("coffee", "Latte")
    const items = [{ key, name: "Latte", quantity: 2 }]
    const menu = (isAvailable: boolean, stockQuantity: number): MenuGroup[] => [{
      id: "drinks", label: "Drinks", iconKey: "coffee", categories: [{
        id: "coffee", label: "Coffee", iconKey: "coffee",
        items: [{ name: "Latte", price: "15 lei", description: "Coffee", isAvailable, stockQuantity }],
      }],
    }]
    expect(summarizeCart(items, cartCatalog(menu(true, 2))).totalBani).toBe(3000)
    expect(summarizeCart(items, cartCatalog(menu(true, 1))).totalBani).toBeNull()
    expect(summarizeCart(items, cartCatalog(menu(true, 0))).totalBani).toBeNull()
    expect(summarizeCart(items, cartCatalog(menu(false, 10))).totalBani).toBeNull()
  })
})
