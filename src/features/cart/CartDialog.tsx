import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react"
import { Minus, Plus, Trash2, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { summarizeCart, type CartEntry } from "./cart"
import { useState } from "react"
import { PickupCheckout } from "./PickupCheckout"

type Props = {
  open: boolean
  onClose: () => void
  summary: ReturnType<typeof summarizeCart>
  onQuantityChange: (entry: CartEntry, quantity: number) => void
  error: string
}

/** Displays an accessible guest cart without accepting orders or payments. */
export function CartDialog({ open, onClose, summary, onQuantityChange, error }: Props) {
  const { t, i18n } = useTranslation()
  const [isCheckout, setIsCheckout] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const canPreview = summary.lines.length > 0 && summary.totalBani !== null
  const handleClose = () => {
    if (isBusy) return
    setIsCheckout(false)
    onClose()
  }
  const money = (bani: number) => new Intl.NumberFormat(i18n.language, {
    style: "currency", currency: "RON",
  }).format(bani / 100)
  const buttonClass = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-brand-green-700/25 text-brand-green-800 hover:bg-brand-cream-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 disabled:opacity-40"

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-[70]">
      <div className="fixed inset-0 bg-brand-dark/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
        <DialogPanel
          onKeyDown={event => {
            if (event.key === "Escape") {
              event.preventDefault()
              event.stopPropagation()
              handleClose()
            }
          }}
          className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-brand-cream-50 p-5 text-brand-dark shadow-2xl sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="font-serif text-2xl font-bold text-brand-green-800">{t("cart.title")}</DialogTitle>
            <button type="button" disabled={isBusy} onClick={handleClose} aria-label={t("menu.close")} className={buttonClass}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-3 text-sm">{t("cart.notice")}</p>
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{t(error)}</p>}
          {summary.lines.length === 0 ? <p className="py-10 text-center">{t("cart.empty")}</p> : (
            <ul className="my-5 divide-y divide-brand-green-700/15">
              {summary.lines.map(line => (
                <li key={line.key} className="space-y-3 py-4">
                  <div className="flex justify-between gap-3">
                    <h3 className="font-semibold">{line.selection ? t("cart.performanceName") : line.name}</h3>
                    <span className="shrink-0 font-bold">
                      {line.subtotalBani === null ? t("cart.unavailable") : money(line.subtotalBani)}
                    </span>
                  </div>
                  {line.plate && (
                    <ul className="space-y-1 text-sm">
                      {line.plate.lines.map(({ ingredient, portion }) => (
                        <li key={ingredient.id}>
                          {t(`builder.ingredients.${ingredient.id}.name`)} — {portion.amount} {ingredient.unit}
                        </li>
                      ))}
                    </ul>
                  )}
                  {line.priceBani !== null && <p className="text-sm">
                    {line.originalPriceBani !== undefined && <>
                      <span className="sr-only">{t("promotion.originalPrice")}: </span>
                      <del>{money(line.originalPriceBani)}</del>{" · "}
                    </>}
                    {t("cart.unitPrice", { price: money(line.priceBani) })}
                  </p>}
                  <div className="flex items-center gap-3">
                    <button type="button" className={buttonClass} aria-label={t("cart.decrease", { name: line.name })}
                      disabled={isCheckout || line.quantity <= 1} onClick={() => onQuantityChange(line, line.quantity - 1)}>
                      <Minus size={17} aria-hidden="true" />
                    </button>
                    <span aria-label={t("cart.quantity", { quantity: line.quantity })}>{line.quantity}</span>
                    <button type="button" className={buttonClass} aria-label={t("cart.increase", { name: line.name })}
                      disabled={isCheckout || line.priceBani === null || line.quantity >= (line.stockQuantity ?? Number.MAX_SAFE_INTEGER)}
                      onClick={() => onQuantityChange(line, line.quantity + 1)}>
                      <Plus size={17} aria-hidden="true" />
                    </button>
                    <button type="button" disabled={isCheckout} className={`${buttonClass} ml-auto`} aria-label={t("cart.remove", { name: line.name })}
                      onClick={() => onQuantityChange(line, 0)}>
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div role="status" className="border-t border-brand-green-700/20 pt-4">
            <p className="flex justify-between gap-3 text-lg font-bold">
              <span>{t("cart.total")}</span>
              <span>{summary.totalBani === null ? t("cart.unavailable") : money(summary.totalBani)}</span>
            </p>
            {summary.totalBani === null && <p className="mt-2 text-sm text-red-800">{t("cart.incomplete")}</p>}
          </div>
          {open && isCheckout && canPreview ? (
            <PickupCheckout onBack={() => setIsCheckout(false)} items={summary.lines}
              totalBani={summary.totalBani!} isBusy={isBusy} onBusyChange={setIsBusy} />
          ) : (
            <button type="button" disabled={!canPreview} onClick={() => setIsCheckout(true)}
              className="mt-5 min-h-11 w-full rounded-full bg-brand-green-700 px-5 py-3 font-semibold text-white hover:bg-brand-green-800 disabled:opacity-40">
              {t("checkout.start")}
            </button>
          )}
          <button type="button" disabled={isBusy} onClick={handleClose} className="mt-3 min-h-11 w-full rounded-full border border-brand-green-700/30 px-5 py-3 font-semibold text-brand-green-800">
            {t("cart.continue")}
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
