import { useId, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { accountRequest, isMarketingPreference } from "./api"

/** Lets an authenticated customer grant or withdraw email marketing consent. */
export function MarketingPreferences({ email, initialConsent, onSaved, presentation = "preferences" }: {
  email: string | null
  initialConsent: boolean
  onSaved: (consent: boolean) => void
  presentation?: "preferences" | "invitation"
}) {
  const { t } = useTranslation()
  const headingId = useId()
  const [consent, setConsent] = useState(initialConsent)
  const [savedConsent, setSavedConsent] = useState(initialConsent)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const hasChanges = consent !== savedConsent
  const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasChanges || isSaving) return
    await saveConsent(consent)
  }

  async function saveConsent(value: boolean) {
    if (isSaving) return
    setIsSaving(true)
    setStatus("idle")
    try {
      const result = await accountRequest("marketing", { emailMarketingConsent: value })
      if (!isMarketingPreference(result)) throw new Error("account.error")
      setConsent(result.emailMarketingConsent)
      setSavedConsent(result.emailMarketingConsent)
      setStatus("saved")
      onSaved(result.emailMarketingConsent)
    } catch (error) {
      console.error("ALIVE email marketing preference update failed", error)
      setErrorMessage(error instanceof Error ? error.message : "account.error")
      setStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-brand-green-700/15 p-5 md:col-span-2">
      <h3 id={headingId} className="font-semibold">{t(presentation === "invitation" ? "marketingInvitation.emailTitle" : "account.marketingTitle")}</h3>
      <p className="mt-1 text-sm leading-relaxed text-brand-green-800">{t(presentation === "invitation" ? "marketingInvitation.emailDescription" : "account.marketingDetails")}</p>
      {presentation === "invitation" ? (
        <button type="button" disabled={isSaving || savedConsent || !email} onClick={() => void saveConsent(true)}
          className={`mt-4 min-h-11 w-full rounded-xl bg-brand-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-green-800 disabled:opacity-50 ${focusClass}`}>
          {t(isSaving ? "account.marketingSaving" : savedConsent ? "account.marketingSaved" : "marketingInvitation.emailAccept")}
        </button>
      ) : <form onSubmit={event => void handleSubmit(event)} className="mt-4 space-y-3">
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" checked={consent}
            disabled={isSaving || (!email && !consent)}
            onChange={event => { setConsent(event.target.checked); setStatus("idle") }}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700" />
          <span>{t("account.marketingEmailConsent")}</span>
        </label>
        {!email && <p className="text-sm text-brand-green-800">{t("account.marketingEmailUnavailable")}</p>}
        <button type="submit" disabled={!hasChanges || isSaving}
          className={`min-h-11 rounded-xl bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800 disabled:cursor-not-allowed disabled:opacity-50 ${focusClass}`}>
          {t(isSaving ? "account.marketingSaving" : "account.marketingSave")}
        </button>
      </form>}
      <div role="status" aria-live="polite" className="mt-2 text-sm">
        {status === "saved" && <p>{t("account.marketingSaved")}</p>}
      </div>
      {status === "error" && <p role="alert" className="mt-2 text-sm text-red-800">{t(errorMessage)}</p>}
    </section>
  )
}
