import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { normalizeContact, validateContact, type ContactDetails, type ContactErrors } from "./checkout"
import type { CartEntry } from "./cart"
import { TestOrderSubmit } from "../orders/TestOrderSubmit"

/** Previews guest pickup details entirely in memory, without submitting an order. */
export function PickupCheckout({ onBack, items, totalBani, isBusy, onBusyChange }: {
  onBack: () => void
  items: CartEntry[]
  totalBani: number
  isBusy: boolean
  onBusyChange: (busy: boolean) => void
}) {
  const { t } = useTranslation()
  const [details, setDetails] = useState<ContactDetails>({ name: "", phone: "", email: "" })
  const [errors, setErrors] = useState<ContactErrors>({})
  const [isReview, setIsReview] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [isReview])

  const primary = "mt-4 min-h-11 w-full rounded-full bg-brand-green-700 px-5 py-3 font-semibold text-white hover:bg-brand-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"

  return (
    <section className="mt-6 border-t border-brand-green-700/20 pt-5" aria-labelledby="pickup-heading">
      <h3 id="pickup-heading" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-brand-green-800">
        {t(isReview ? "checkout.reviewTitle" : "checkout.title")}
      </h3>
      <div className="my-4 rounded-xl bg-brand-green-100 p-4 text-sm">
        <p className="font-semibold">{t("checkout.pickup")}</p>
        <p className="mt-1">ALIVE Bistro · {t("footer.address")}</p>
        <p className="mt-2">{t("checkout.timing")}</p>
        <p className="mt-2">{t("checkout.noDelivery")}</p>
      </div>
      <p className="mb-4 text-sm">{t("checkout.previewNotice")}</p>
      {isReview ? (
        <>
          <dl className="space-y-3 break-words rounded-xl border border-brand-green-700/20 p-4">
            {(["name", "phone", "email"] as const).map(field => (
              <div key={field}>
                <dt className="text-sm font-semibold">{t(`checkout.${field}`)}</dt>
                <dd>{details[field]}</dd>
              </div>
            ))}
          </dl>
          <TestOrderSubmit contact={details} items={items} totalBani={totalBani} onBusyChange={onBusyChange} />
          <button type="button" disabled={isBusy} className={primary} onClick={() => setIsReview(false)}>{t("checkout.edit")}</button>
        </>
      ) : (
        <form ref={formRef} noValidate onSubmit={event => {
          event.preventDefault()
          const nextErrors = validateContact(details)
          setErrors(nextErrors)
          const firstError = (["name", "phone", "email"] as const).find(field => nextErrors[field])
          if (firstError) {
            formRef.current?.querySelector<HTMLInputElement>(`#pickup-${firstError}`)?.focus()
            return
          }
          setDetails(normalizeContact(details))
          setIsReview(true)
        }}>
          <p className="mb-3 text-sm">{t("checkout.required")}</p>
          <div className="space-y-4">
            {(["name", "phone", "email"] as const).map(field => (
              <div key={field}>
                <label htmlFor={`pickup-${field}`} className="mb-1 block text-sm font-semibold">{t(`checkout.${field}`)}</label>
                <input id={`pickup-${field}`} name={field} required
                  type={field === "phone" ? "tel" : field === "email" ? "email" : "text"}
                  autoComplete={field === "phone" ? "tel" : field}
                  maxLength={field === "name" ? 100 : field === "phone" ? 40 : 254}
                  value={details[field]} onChange={event => {
                    setDetails(previous => ({ ...previous, [field]: event.target.value }))
                    setErrors(previous => ({ ...previous, [field]: undefined }))
                  }}
                  aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `pickup-${field}-error` : undefined}
                  className="min-h-11 w-full rounded-xl border border-brand-green-700/40 bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700" />
                {errors[field] && <p id={`pickup-${field}-error`} role="alert" className="mt-1 text-sm text-red-800">{t(errors[field])}</p>}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs">{t("checkout.privacy")}</p>
          <button type="submit" className={primary}>{t("checkout.review")}</button>
        </form>
      )}
      <button type="button" disabled={isBusy} onClick={onBack} className="mt-3 min-h-11 w-full rounded-full border border-brand-green-700/30 px-4 py-3 font-semibold text-brand-green-800">
        {t("checkout.back")}
      </button>
    </section>
  )
}
