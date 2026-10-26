import { useTranslation } from "react-i18next"
import type { MenuItem } from "../menu/types"

/** Shows both base and discounted prices when the food promotion applies. */
export function MenuPrice({ item }: { item: Pick<MenuItem, "price" | "originalPrice" | "discountPercent"> }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex flex-col items-end gap-1">
      {item.originalPrice && <>
        <span className="sr-only">{t("promotion.originalPrice")}</span>
        <del className="text-xs font-normal text-brand-dark/70">{item.originalPrice}</del>
        <span className="sr-only">{t("promotion.discountedPrice")}</span>
      </>}
      <span>{item.price}</span>
      {item.discountPercent ? <span className="rounded-full bg-brand-green-100 px-2 py-1 text-xs text-brand-green-800">
        {t("promotion.discount", { percent: item.discountPercent })}
      </span> : null}
    </span>
  )
}
