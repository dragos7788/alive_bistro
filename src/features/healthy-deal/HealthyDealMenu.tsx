import { useTranslation } from "react-i18next"
import { useState } from "react"
import { Clock, Leaf } from "lucide-react"
import { dealAssets, dealImage } from "./assets"
import { HealthyDealDish } from "./HealthyDealDish"
import { dealDays, healthyDealItem, resolveHealthyDeal, type HealthyDealDocument } from "./schedule"
import { AddToCart } from "../cart/AddToCart"
import type { CartEntry, CartProduct } from "../cart/cart"

/** Renders a live, editable equivalent of the Healthy Deal poster. */
export function HealthyDealMenu({ document, now, error, isSalesEnabled, items, onAdd, allowPreview = false }: {
  document: HealthyDealDocument | null
  now: Date
  error: boolean
  isSalesEnabled: boolean
  items: CartEntry[]
  onAdd: (product: CartProduct) => void
  allowPreview?: boolean
}) {
  const { t, i18n } = useTranslation()
  const settings = document?.settings
  const [selectedDate, setSelectedDate] = useState("")
  const currentDate = settings ? resolveHealthyDeal(settings, now).date : ""
  const upcomingOverride = settings ? Object.keys(settings.overrides)
    .filter(date => date >= currentDate && settings.overrides[date].enabled).sort()[0] : undefined
  const previewDate = selectedDate || upcomingOverride
  const previewNow = allowPreview && previewDate ? new Date(`${previewDate}T12:00:00Z`) : now
  const today = settings ? resolveHealthyDeal(settings, previewNow) : null
  const item = document ? healthyDealItem(document.settings, document.revision, previewNow) : null
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
      className="overflow-hidden rounded-3xl border border-green-900/15 bg-[#f0e7d8] p-3 text-green-950 shadow-sm sm:p-5">
      <h2 id="healthy-deal-title" className="sr-only">Healthy Deal</h2>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0 max-w-[300px]">
          <img src={dealAssets.logo} alt="" className="w-full mix-blend-multiply" />
          <p className="sr-only">{t("healthyDeal.subtitle")}</p>
        </div>
        {settings && <div className="flex w-24 flex-col items-center gap-1 sm:w-28">
          <div className="relative flex h-20 w-20 shrink-0 flex-col items-center justify-center text-white sm:h-24 sm:w-24">
            <img src={dealAssets.stamp} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain mix-blend-multiply" />
            <span className="relative text-2xl font-black tracking-tight sm:text-3xl">{new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(settings.priceBani / 100)}</span>
            <span className="relative text-xs font-extrabold">LEI</span>
          </div>
          {useOriginalHours
            ? <img src={dealAssets.hours} alt="De luni până vineri, 12:00–16:00"
                className="w-full object-contain mix-blend-multiply" />
            : <p className="flex w-full items-center gap-1 rounded-lg bg-[#002b15] px-2 py-1.5 text-center font-sans text-[10px] text-white">
                <Clock size={18} strokeWidth={1.7} className="shrink-0 text-[#b2ce2d]" aria-hidden="true" />
                <span>{t("healthyDeal.hours")}<strong className="block whitespace-nowrap text-xs">{settings.startTime} – {settings.endTime}</strong></span>
              </p>}
        </div>}
      </div>
      {error ? <p role="alert" className="my-6 rounded-xl bg-white p-4 text-red-800">{t("healthyDeal.loadError")}</p>
        : !settings ? <p role="status" className="py-8 text-center">{t("healthyDeal.loading")}</p> : <>
          <div className="mx-auto mt-2 flex max-w-sm justify-center gap-3">
            {[{ image: today?.entry?.soup.image, fallback: dealAssets.soup, title: t("healthyDeal.soup") },
              { image: today?.entry?.main.image, fallback: dealAssets.main, title: t("healthyDeal.main") }].map(({ image, fallback, title }) =>
              <figure key={title} className="min-w-0 flex-1 text-center">
                <img src={image ? dealImage(image) : fallback} alt={title}
                  className="mx-auto h-28 w-full object-contain mix-blend-multiply sm:h-36" />
                <figcaption className="text-xs font-semibold">{title}</figcaption>
              </figure>)}
          </div>
          {(!today?.entry || [today.entry.soup, today.entry.main].some(dish => !dish.image || dish.image.startsWith("default-")))
            && <p className="mt-1 text-center text-[11px] italic">{t("healthyDeal.illustration")}</p>}
          <div className="my-3 flex items-center justify-center gap-1.5 text-center text-xs">
            <Leaf size={14} className="shrink-0" aria-hidden="true" /><p aria-live={allowPreview ? "polite" : undefined} className="font-semibold">{!allowPreview && <>{t("healthyDeal.today")} · </>}{dateLabel}</p>
          </div>
          {today?.entry ? <>
            {item?.macros && <p className="mt-4 text-center text-sm font-semibold">
              {t("healthyDeal.total")}: {item.macros.calories} kcal · {t("menu.macros.protein")} {item.macros.protein} · {t("menu.macros.carbs")} {item.macros.carbs} · {t("menu.macros.fat")} {item.macros.fat}
            </p>}
            {!allowPreview && <div className="mx-auto my-3 max-w-md space-y-2">
              {today.orderable && item && isSalesEnabled
                ? <AddToCart categoryId="healthy-deal" item={item} items={items} onAdd={onAdd} />
                : <p role="status" className="rounded-xl bg-white/70 p-3 text-center text-sm">{t(!isSalesEnabled ? "commerce.disabled" : "healthyDeal.outsideHours", { start: settings.startTime, end: settings.endTime })}</p>}
            </div>}
          </> : <p role="status" className="my-6 rounded-xl bg-white/70 p-5 text-center">{t("healthyDeal.noOffer")}</p>}
          {week.length > 0 && <>
          <h3 className="relative mt-3 px-3 py-2 text-center font-sans text-xs font-bold uppercase tracking-wide text-white">
            <img src={dealAssets.brush} alt="" className="pointer-events-none absolute inset-0 h-full w-full mix-blend-multiply" />
            <span className="relative">{t("healthyDeal.week")}</span>
          </h3>
          <div className="mt-2 overflow-hidden rounded-2xl bg-white/90">
            {week.map(({ key, date, entry }) => {
              const content = <>
              <span className="text-xs font-bold capitalize">
                {new Intl.DateTimeFormat(i18n.language, { weekday: "long", timeZone: "UTC" }).format(date)}
                {allowPreview && <span className="block text-xs font-normal">{new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeZone: "UTC" }).format(date)}</span>}
                {key === today?.date && !allowPreview && <span className="ml-2 text-xs">({t("healthyDeal.today")})</span>}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold leading-snug sm:text-sm">{entry.main.name}</span>
                <span className="mt-0.5 block text-[11px]">{entry.soup.name}</span>
              </span>
              </>
              const className = "grid w-full grid-cols-[64px_minmax(0,1fr)] gap-2 px-3 py-2 text-left sm:grid-cols-[90px_minmax(0,1fr)]"
              return <div key={key} className={`border-b border-green-950/10 last:border-b-0 ${key === today?.date ? "bg-lime-100/70" : ""}`}>
                {allowPreview
                ? <button type="button" aria-pressed={key === today?.date} onClick={() => setSelectedDate(key)}
                    className={`${className} min-h-11 hover:bg-lime-100/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-green-900`}>{content}</button>
                : <div className={className}>{content}</div>}
                <details className="group px-3 pb-1">
                  <summary className="flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-xs font-semibold text-green-800 hover:bg-green-950/5 focus-visible:outline-2 focus-visible:outline-green-900">
                    {t("healthyDeal.dishDetails")}
                    <span className="ml-auto pl-2 text-base group-open:hidden" aria-hidden="true">+</span>
                    <span className="ml-auto hidden pl-2 text-base group-open:block" aria-hidden="true">−</span>
                  </summary>
                  <div className="grid gap-2 pb-2 sm:grid-cols-2">
                    {(entry.soup.description || entry.soup.allergens || entry.soup.macros || !entry.main.description)
                      && <HealthyDealDish dish={entry.soup} title={t("healthyDeal.soup")} />}
                    <HealthyDealDish dish={entry.main} title={t("healthyDeal.main")} />
                  </div>
                </details>
              </div>
            })}
          </div>
          </>}
          <p className="mt-4 text-center text-xs leading-relaxed">{t("healthyDeal.timezone")}</p>
        </>}
    </section>
  )
}
