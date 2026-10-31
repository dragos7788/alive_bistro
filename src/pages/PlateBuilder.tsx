import { useState } from "react"
import { ShoppingBag } from "lucide-react"
import { useTranslation } from "react-i18next"
import { MenuBuilder } from "../features/menu-builder/MenuBuilder"
import { CartDialog } from "../features/cart/CartDialog"
import { cartCatalog, summarizeCart } from "../features/cart/cart"
import type { useCart } from "../features/cart/useCart"
import type { MenuGroup } from "../features/menu/types"
import { MenuNavigation } from "../features/menu/MenuNavigation"

/** Displays the standalone plate builder with access to the shared shopping cart. */
export default function PlateBuilder({ cart, menuGroups, isSalesEnabled }: {
  cart: ReturnType<typeof useCart>
  menuGroups: MenuGroup[]
  isSalesEnabled: boolean
}) {
  const { t } = useTranslation()
  const [isCartOpen, setIsCartOpen] = useState(false)
  const discountPercent = menuGroups.find(group => group.id === "food")?.performanceDiscountPercent ?? 0
  const summary = summarizeCart(cart.items, cartCatalog(menuGroups), discountPercent)
  const cartCount = cart.items.reduce((count, item) => count + item.quantity, 0)

  return (
    <div className={`pt-24 ${isSalesEnabled ? "[--builder-toolbar-height:116px]" : "[--builder-toolbar-height:60px]"}`}>
      <div className="sticky top-[78px] z-40 border-y border-brand-green-700/15 bg-brand-cream-100">
      <div className="mx-auto flex h-[60px] max-w-4xl items-center justify-center px-3 sm:px-6">
        <MenuNavigation groups={menuGroups} active="builder" />
      </div>
      {isSalesEnabled && <div className="mx-auto flex h-14 max-w-6xl items-center justify-end gap-2 px-3 sm:px-6">
        <button type="button" onClick={() => setIsCartOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full bg-brand-green-700 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-brand-cream-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700">
          <ShoppingBag size={18} aria-hidden="true" /> {t("cart.open")} ({cartCount})
        </button>
      </div>}
      </div>
      <MenuBuilder onAddToCart={cart.addProduct} cartError={cart.error} isSalesEnabled={isSalesEnabled}
        discountPercent={discountPercent} />
      {isSalesEnabled && <CartDialog open={isCartOpen} onClose={() => setIsCartOpen(false)} summary={summary}
        onQuantityChange={cart.setQuantity} error={cart.error} />}
    </div>
  )
}
