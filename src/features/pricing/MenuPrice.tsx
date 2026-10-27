import { useTranslation } from "react-i18next"
import type { MenuItem } from "../menu/types"

/** Shows both base and discounted prices when the food promotion applies. */
export function MenuPrice({
  item,
  showDiscount = true,
}: {
  item: Pick<MenuItem, "price" | "originalPrice" | "discountPercent">
  showDiscount?: boolean
}) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1">
      {item.originalPrice && <>
        <span className="sr-only">{t("promotion.originalPrice")}</span>
        <del className="text-xs font-medium text-brand-dark/65 sm:text-sm">{item.originalPrice}</del>
        <span className="sr-only">{t("promotion.discountedPrice")}</span>
      </>}
      <span className="inline-flex flex-wrap items-baseline gap-2">
        <span className="text-base font-extrabold tracking-tight text-brand-green-800 sm:text-lg">{item.price}</span>
        {showDiscount && item.discountPercent ? <span className="whitespace-nowrap rounded-full bg-brand-green-700 px-2.5 py-1 text-xs font-extrabold text-brand-cream-50">
          {t("promotion.discount", { percent: item.discountPercent })}
        </span> : null}
      </span>
    </span>
  )
}
