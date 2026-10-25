import { useState } from "react"
import { cartStorageKey, restoreCart, updateCart, type CartEntry, type CartProduct } from "./cart"

function loadCart(): { items: CartEntry[]; error: string } {
  try {
    return { items: restoreCart(localStorage.getItem(cartStorageKey)), error: "" }
  } catch (error) {
    console.error("Unable to restore shopping cart", error)
    return { items: [], error: "cart.restoreError" }
  }
}

/** Manages the guest cart and explicitly reports browser-storage failures. */
export function useCart() {
  const [state, setState] = useState(loadCart)

  const setQuantity = (product: Pick<CartProduct, "key" | "name" | "selection">, quantity: number) => {
    let items: CartEntry[]
    try {
      items = updateCart(state.items, product, quantity)
    } catch (error) {
      console.error("Unable to update shopping cart", error)
      setState({ ...state, error: "cart.quantityError" })
      return false
    }
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify({ version: 1, items }))
      setState({ items, error: "" })
    } catch (error) {
      console.error("Unable to persist shopping cart", error)
      setState({ items, error: "cart.saveError" })
    }
    return true
  }

  const addProduct = (product: CartProduct) =>
    setQuantity(product, (state.items.find(entry => entry.key === product.key)?.quantity ?? 0) + 1)

  return { ...state, setQuantity, addProduct }
}
