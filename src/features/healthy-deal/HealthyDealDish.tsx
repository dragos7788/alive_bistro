import { useTranslation } from "react-i18next"
import type { DealDish } from "./schedule"
import { dealImage } from "./assets"
import { Beef, Flame, Nut, UtensilsCrossed, Wheat } from "lucide-react"

const macroBadges = [
  { key: "calories", Icon: Flame, iconClass: "" },
  { key: "protein", Icon: Beef, iconClass: "text-red-700/80" },
  { key: "carbs", Icon: Wheat, iconClass: "text-amber-700/80" },
  { key: "fat", Icon: Nut, iconClass: "text-amber-700" },
] as const

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
      {dish.macros ? <dl className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
        {macroBadges.map(({ key, Icon, iconClass }) => (
          <div key={key} className={`flex items-center gap-1.5 rounded border px-2.5 py-1 ${
            key === "calories"
              ? "border-brand-green-700/10 bg-brand-green-700/10 font-bold text-brand-green-700"
              : "border-brand-green-700/5 bg-brand-cream-200/50 font-medium text-brand-dark/80"
          }`}>
            <dt className="sr-only">{t(`menu.macros.${key}`)}</dt>
            <dd className="flex items-center gap-1.5">
              <Icon className={`h-3.5 w-3.5 ${iconClass}`} aria-hidden="true" />
              {number.format(dish.macros![key])} {t(`menu.macros.${key}`)}
            </dd>
          </div>
        ))}
      </dl> : <p className="text-xs text-green-950/75">{t("healthyDeal.nutritionPending")}</p>}
      <p className="text-xs leading-relaxed"><strong>{t("healthyDeal.allergens")}: </strong>{dish.allergens || t("healthyDeal.detailsPending")}</p>
    </article>
  )
}
