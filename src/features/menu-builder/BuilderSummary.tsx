import { RotateCcw, Utensils, ShoppingBag } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { calculateMenu } from "./calculator"
import { discountBani } from "../pricing/discount"

interface BuilderSummaryProps {
  total: ReturnType<typeof calculateMenu>
  onReset: () => void
  onAddToCart: () => void
  addedCount: number
  cartError: string
  discountPercent: number
  isSalesEnabled: boolean
}

/** Displays the current plate, declared nutrition, allergens, and total cost. */
export function BuilderSummary({ total, onReset, onAddToCart, addedCount, cartError, discountPercent, isSalesEnabled }: BuilderSummaryProps) {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  const money = new Intl.NumberFormat(i18n.language, {
    style: "currency", currency: "RON", maximumFractionDigits: 2,
  })
  const isEmpty = total.lines.length === 0
  const discountedTotal = discountBani(Math.round(total.price * 100), discountPercent) / 100

  return (
    <aside aria-labelledby="builder-summary-title" className="self-start lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-3xl border border-brand-green-700/20 bg-brand-cream-50">
        <div className="bg-brand-green-700 p-6 text-brand-cream-50">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
            <Utensils size={16} aria-hidden="true" /> {t("builder.live")}
          </p>
          <h3 id="builder-summary-title" className="text-3xl font-bold">{t("builder.yourPlate")}</h3>
        </div>
        <div className="p-6">
          {isEmpty ? (
            <p className="rounded-2xl border border-dashed border-brand-green-700/30 p-5 text-sm leading-relaxed">
              {t("builder.empty")}
            </p>
          ) : (
            <ul className="space-y-4">
              {total.lines.map(({ ingredient, portion }) => (
                <li key={ingredient.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <span className="block font-semibold">{t(`builder.ingredients.${ingredient.id}.name`)}</span>
                    <span className="mt-1 block text-xs text-brand-green-700">{portion.amount} {ingredient.unit}</span>
                  </div>
                  <span className="shrink-0 font-semibold">{money.format(portion.price)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-brand-green-700/20 pt-5 text-brand-green-700">
            <span className="text-sm font-bold">{t("builder.total")}</span>
            <output className="text-3xl font-extrabold" aria-live="polite" aria-atomic="true"
              aria-label={t("builder.total")}>
              {money.format(discountedTotal)}
            </output>
          </div>
          {discountPercent > 0 && !isEmpty && <p className="mt-2 text-sm text-brand-green-800">
            <span className="sr-only">{t("promotion.originalPrice")}: </span>
            <del>{money.format(total.price)}</del>{" · "}{t("promotion.discount", { percent: discountPercent })}
            <span className="mt-1 block text-xs">{t("promotion.performanceNote")}</span>
          </p>}
          <p className="mt-2 text-xs text-brand-green-700">
            {t("builder.quantity")}: {number.format(total.grams)} g
            {total.millilitres > 0 && ` + ${number.format(total.millilitres)} ml`}
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-brand-green-100 p-3 text-center">
            {(["calories", "protein", "carbs"] as const).map(key => (
              <div key={key}>
                <dt className="text-[10px] font-semibold text-brand-green-800">{t(`builder.nutrients.${key}`)}</dt>
                <dd className="mt-1 text-base font-bold text-brand-green-800">
                  {number.format(total[key])}<span className="ml-0.5 text-[10px]">{key === "calories" ? "kcal" : "g"}</span>
                </dd>
              </div>
            ))}
          </dl>
          {!isEmpty && (
            <p className="mt-5 text-xs leading-relaxed">
              <span className="font-bold">{t("builder.allergens")}: </span>
              {total.allergens.length
                ? total.allergens.map(allergen => t(`builder.allergenNames.${allergen}`)).join(", ")
                : t("builder.noDeclaredAllergens")}
            </p>
          )}
          {isSalesEnabled && <><button type="button" onClick={onAddToCart} disabled={isEmpty}
            className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 disabled:cursor-not-allowed disabled:opacity-50">
            <ShoppingBag size={17} aria-hidden="true" /> {t("cart.add")}
          </button>
          <p role="status" className="mt-2 text-sm text-brand-green-800">
            {addedCount > 0 && t("cart.performanceAdded", { count: addedCount })}
          </p>
          {cartError && <p role="alert" className="mt-2 text-sm text-red-800">{t(cartError)}</p>}</>}
          <button type="button" onClick={onReset} disabled={isEmpty}
            className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-green-700/30 text-sm font-semibold text-brand-green-700 hover:bg-brand-green-100 disabled:cursor-not-allowed disabled:opacity-50">
            <RotateCcw size={15} aria-hidden="true" /> {t("builder.reset")}
          </button>
          {isSalesEnabled && <p className="mt-4 text-xs leading-relaxed">{t("builder.orderNote")}</p>}
        </div>
      </div>
      <p className="mt-4 px-2 text-xs leading-relaxed text-brand-dark">{t("builder.nutritionNote")}</p>
    </aside>
  )
}
