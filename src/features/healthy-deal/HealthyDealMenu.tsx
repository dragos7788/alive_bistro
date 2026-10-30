import { useTranslation } from "react-i18next"
import { Clock, Leaf } from "lucide-react"
import { dealAssets } from "./assets"
import { HealthyDealDish } from "./HealthyDealDish"
import { dealDays, healthyDealItem, resolveHealthyDeal, type HealthyDealDocument } from "./schedule"
import { AddToCart } from "../cart/AddToCart"
import type { CartEntry, CartProduct } from "../cart/cart"

/** Renders a live, editable equivalent of the Healthy Deal poster. */
export function HealthyDealMenu({ document, now, error, isSalesEnabled, items, onAdd }: {
  document: HealthyDealDocument | null
  now: Date
  error: boolean
  isSalesEnabled: boolean
  items: CartEntry[]
  onAdd: (product: CartProduct) => void
}) {
  const { t, i18n } = useTranslation()
  const settings = document?.settings
  const today = settings ? resolveHealthyDeal(settings, now) : null
  const item = document ? healthyDealItem(document.settings, document.revision, now) : null
  const dateLabel = today ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "full", timeZone: "UTC" })
    .format(new Date(`${today.date}T12:00:00Z`)) : ""
  const monday = today ? new Date(`${today.date}T12:00:00Z`) : null
  if (monday) monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  const week = settings && monday ? dealDays.map((day, index) => {
    const date = new Date(monday)
    date.setUTCDate(date.getUTCDate() + index)
    const key = date.toISOString().slice(0, 10)
    const entry = settings.overrides[key] ?? settings.weekly[day]
    return settings.enabled && entry?.enabled ? [{ day, key, date, entry }] : []
  }).flat() : []
  const useOriginalHours = settings?.startTime === "12:00" && settings.endTime === "16:00"
    && week.length === 5 && week.every(({ day }, index) => day === String(index + 1))
    && i18n.language.startsWith("ro")

  return (
    <section id="healthy-deal-menu" aria-labelledby="healthy-deal-title"
      className="overflow-hidden rounded-3xl border border-green-900/15 bg-[#f0e7d8] p-4 text-green-950 shadow-sm sm:p-8">
      <h2 id="healthy-deal-title" className="sr-only">Healthy Deal</h2>
      <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0 max-w-md">
          <img src={dealAssets.logo} alt="" className="w-full mix-blend-multiply" />
          <p className="sr-only">{t("healthyDeal.subtitle")}</p>
        </div>
        {settings && <div className="mx-auto flex flex-row-reverse items-center gap-3 sm:flex-col">
          <div className="relative flex h-28 w-28 shrink-0 flex-col items-center justify-center text-white sm:h-36 sm:w-36">
            <img src={dealAssets.stamp} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain mix-blend-multiply" />
            <span className="relative text-4xl font-black tracking-tight">{new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(settings.priceBani / 100)}</span>
            <span className="relative text-lg font-extrabold">LEI</span>
          </div>
          {useOriginalHours
            ? <img src={dealAssets.hours} alt="De luni până vineri, 12:00–16:00"
                className="w-44 max-w-[50%] object-contain mix-blend-multiply sm:max-w-none" />
            : <p className="flex w-44 max-w-[50%] items-center gap-2 rounded-2xl bg-[#002b15] px-3 py-2 text-center font-sans text-xs text-white sm:max-w-none">
                <Clock size={32} strokeWidth={1.7} className="shrink-0 text-[#b2ce2d]" aria-hidden="true" />
                <span>{t("healthyDeal.hours")}<strong className="block whitespace-nowrap text-base">{settings.startTime} – {settings.endTime}</strong></span>
              </p>}
        </div>}
      </div>
      {error ? <p role="alert" className="my-6 rounded-xl bg-white p-4 text-red-800">{t("healthyDeal.loadError")}</p>
        : !settings ? <p role="status" className="py-8 text-center">{t("healthyDeal.loading")}</p> : <>
          <div className="my-6 flex items-center justify-center gap-2 text-center">
            <Leaf size={18} aria-hidden="true" /><p className="font-semibold">{t("healthyDeal.today")} · {dateLabel}</p>
          </div>
          {today?.entry ? <>
            <div className="grid gap-4 sm:grid-cols-2">
              <HealthyDealDish dish={today.entry.soup} title={t("healthyDeal.soup")} />
              <HealthyDealDish dish={today.entry.main} title={t("healthyDeal.main")} />
            </div>
            {item?.macros && <p className="mt-4 text-center text-sm font-semibold">
              {t("healthyDeal.total")}: {item.macros.calories} kcal · {t("menu.macros.protein")} {item.macros.protein} · {t("menu.macros.carbs")} {item.macros.carbs} · {t("menu.macros.fat")} {item.macros.fat}
            </p>}
            <div className="mx-auto my-5 max-w-md space-y-2">
              {today.orderable && item && isSalesEnabled
                ? <AddToCart categoryId="healthy-deal" item={item} items={items} onAdd={onAdd} />
                : <p role="status" className="rounded-xl bg-white/70 p-3 text-center text-sm">{t(!isSalesEnabled ? "commerce.disabled" : "healthyDeal.outsideHours", { start: settings.startTime, end: settings.endTime })}</p>}
            </div>
          </> : <p role="status" className="my-6 rounded-xl bg-white/70 p-5 text-center">{t("healthyDeal.noOffer")}</p>}
          {week.length > 0 && <>
          <h3 className="relative mt-8 px-5 py-3 text-center font-sans text-sm font-bold uppercase tracking-wide text-white">
            <img src={dealAssets.brush} alt="" className="pointer-events-none absolute inset-0 h-full w-full mix-blend-multiply" />
            <span className="relative">{t("healthyDeal.week")}</span>
          </h3>
          <div className="mt-3 overflow-hidden rounded-2xl bg-white/90">
            {week.map(({ key, date, entry }) => <div key={key}
              className={`grid gap-1 border-b border-green-950/10 p-4 last:border-b-0 sm:grid-cols-[130px_1fr] ${key === today?.date ? "bg-lime-100/70" : ""}`}>
              <div className="font-bold capitalize">
                {new Intl.DateTimeFormat(i18n.language, { weekday: "long", timeZone: "UTC" }).format(date)}
                {key === today?.date && <span className="ml-2 text-xs">({t("healthyDeal.today")})</span>}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{entry.main.name}</p>
                <p className="mt-1 text-xs">{entry.soup.name}</p>
              </div>
            </div>)}
          </div>
          </>}
          <p className="mt-4 text-center text-xs leading-relaxed">{t("healthyDeal.timezone")}</p>
        </>}
    </section>
  )
}
