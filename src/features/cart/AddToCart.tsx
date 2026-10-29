import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { MenuItem } from "../menu/types"
import { cartOptions, isAlcoholCategory, type CartEntry, type CartProduct } from "./cart"

/** Provides explicit portion choices instead of guessing a price for bottle/glass products. */
export function AddToCart({ categoryId, item, onAdd, items }: {
  categoryId: string
  item: MenuItem
  onAdd: (product: CartProduct) => void
  items: CartEntry[]
}) {
  const { t, i18n } = useTranslation()
  if (isAlcoholCategory(categoryId)) return <p className="text-sm text-brand-dark">{t("cart.alcoholNotOrderable")}</p>
  if (item.menuComponent) return null
  const options = cartOptions(categoryId, item)
  const buttonClass = "flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 disabled:cursor-not-allowed disabled:opacity-50"
  if (!options.length) return <p className="text-sm text-brand-dark">{t("cart.priceUnavailable")}</p>
  return (
    <div className="space-y-2">
      {(item.isAvailable === false || item.stockQuantity === 0)
        ? <p className="text-sm font-semibold text-red-800">{t("cart.outOfStock")}</p>
        : item.stockQuantity !== undefined && <p className="text-sm text-brand-green-800">{t("cart.stockCount", { count: item.stockQuantity })}</p>}
      {options.length > 1 && <p className="text-sm font-semibold">{t("cart.choosePortion")}</p>}
      {options.map(option => (
        <button key={option.key} type="button"
          disabled={option.isAvailable === false || (items.find(entry => entry.key === option.key)?.quantity ?? 0) >= (option.stockQuantity ?? Infinity)}
          className={buttonClass}
          aria-label={t("cart.addProduct", { name: option.name })} onClick={() => onAdd(option)}>
          <Plus size={17} aria-hidden="true" />
          {t("cart.add")}
          {option.portion && ` · ${option.portion} · ${new Intl.NumberFormat(i18n.language, {
            style: "currency", currency: "RON",
          }).format((option.priceBani ?? 0) / 100)}`}
        </button>
      ))}
    </div>
  )
}
