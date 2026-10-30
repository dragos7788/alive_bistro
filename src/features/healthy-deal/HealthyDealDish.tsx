import { useTranslation } from "react-i18next"
import type { DealDish } from "./schedule"
import { dealImage } from "./assets"
import { UtensilsCrossed } from "lucide-react"

/** Shows authored dish details without substituting estimated nutrition. */
export function HealthyDealDish({ dish, title }: { dish: DealDish; title: string }) {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 })
  const image = dealImage(dish.image)
  return (
    <article className="min-w-0 space-y-3 rounded-2xl bg-white/70 p-4 text-center">
      {image ? <img src={image} alt={dish.name} className="mx-auto h-40 w-full object-contain sm:h-52" />
        : <div className="flex h-24 items-center justify-center rounded-full bg-lime-100 text-green-900" aria-hidden="true"><UtensilsCrossed size={40} /></div>}
      {dish.image.startsWith("default-") && <p className="text-xs italic">{t("healthyDeal.illustration")}</p>}
      <p className="text-xs font-bold uppercase tracking-widest text-green-800">{title}</p>
      <h3 className="font-serif text-xl font-bold text-green-950">{dish.name}</h3>
      {dish.grams !== null && <p className="text-sm">{number.format(dish.grams)} g</p>}
      {dish.description && <p className="whitespace-pre-line text-sm leading-relaxed">{dish.description}</p>}
      <p className="text-xs leading-relaxed"><strong>{t("healthyDeal.allergens")}: </strong>{dish.allergens || t("healthyDeal.detailsPending")}</p>
      {dish.macros ? <dl className="grid grid-cols-2 gap-2 text-xs">
        {(["calories", "protein", "carbs", "fat"] as const).map(key => (
          <div key={key} className="rounded-xl bg-green-950/5 px-2 py-2">
            <dt>{t(`menu.macros.${key}`)}</dt>
            <dd className="mt-1 font-bold">{number.format(dish.macros![key])} {key === "calories" ? "kcal" : "g"}</dd>
          </div>
        ))}
      </dl> : <p className="text-xs text-green-950/75">{t("healthyDeal.nutritionPending")}</p>}
    </article>
  )
}
