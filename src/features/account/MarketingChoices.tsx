import { useEffect, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { accountRequest, isMarketingPreference } from "./api"
import { enableDevicePush, supportsPush } from "./push-subscription"

/** Saves independent optional channels from one explicit submission. */
export function MarketingChoices({ email, offerEmail, offerPush, onUpdated, onSaved }: {
  email: string | null
  offerEmail: boolean
  offerPush: boolean
  onUpdated: (consent: boolean) => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [emailSelected, setEmailSelected] = useState(false)
  const [pushSelected, setPushSelected] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(offerPush)
  const [isBusy, setIsBusy] = useState(false)
  const [pushSaved, setPushSaved] = useState(false)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  const supported = supportsPush()
  const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"

  useEffect(() => {
    if (!offerPush) return
    const controller = new AbortController()
    void accountRequest("push", undefined, controller.signal).then(result => {
      if (!result || typeof result !== "object" || !("publicKey" in result)
        || (result.publicKey !== null && typeof result.publicKey !== "string")) throw new Error("account.error")
      if (!controller.signal.aborted) { setPublicKey(result.publicKey); setError("") }
    }).catch(reason => {
      if (controller.signal.aborted) return
      console.error("ALIVE invitation push settings failed", reason)
      setError("account.error")
    }).finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [offerPush, retry])

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (isBusy || isLoading) return
    setIsBusy(true)
    setError("")
    try {
      // Start before any network await to preserve the browser's user gesture.
      if (pushSelected && !pushSaved) {
        if (!supported || !publicKey) throw new Error("push.notConfigured")
        await enableDevicePush(publicKey)
        setPushSaved(true)
      }
      if (emailSelected) {
        const result = await accountRequest("marketing", { emailMarketingConsent: true })
        if (!isMarketingPreference(result) || !result.emailMarketingConsent) throw new Error("account.error")
        onUpdated(true)
      }
      onSaved()
    } catch (reason) {
      console.error("ALIVE marketing choices could not save", reason instanceof Error ? reason.name : "UnknownError")
      setError(reason instanceof Error && ["push.permissionDenied", "push.deviceInUse", "push.notConfigured"].includes(reason.message)
        ? reason.message : "marketingInvitation.saveError")
    } finally { setIsBusy(false) }
  }

  return <form onSubmit={event => void handleSave(event)} className="space-y-4">
    <fieldset disabled={isBusy} className="space-y-4">
      <legend className="sr-only">{t("marketingInvitation.title")}</legend>
      {offerEmail && email && <label className="flex items-start gap-3">
        <input type="checkbox" checked={emailSelected} onChange={event => setEmailSelected(event.target.checked)}
          className={`mt-1 h-5 w-5 shrink-0 accent-brand-green-700 ${focusClass}`} />
        <span><span className="font-semibold">{t("marketingInvitation.emailAccept")}</span>
          <span className="mt-1 block text-sm">{t("marketingInvitation.emailDescription")} ({email})</span></span>
      </label>}
      {offerPush && <div>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={pushSelected} disabled={!supported || !publicKey || pushSaved}
            onChange={event => setPushSelected(event.target.checked)}
            className={`mt-1 h-5 w-5 shrink-0 accent-brand-green-700 ${focusClass}`} />
          <span><span className="font-semibold">{t("push.accept")}</span>
            <span className="mt-1 block text-sm">{t("marketingInvitation.pushDescription")}</span></span>
        </label>
        <p className="mt-2 text-xs">{t("push.installHint")}</p>
        {!supported && <p role="status" className="mt-2 text-sm">{t("push.unsupported")}</p>}
        {!isLoading && !publicKey && <p role="status" className="mt-2 text-sm">{t("push.notConfigured")}</p>}
        {pushSaved && <p role="status" className="mt-2 text-sm">{t("push.enabled")}</p>}
      </div>}
    </fieldset>
    <a href="/legal/privacy" className={`inline-block min-h-11 py-3 text-sm underline ${focusClass}`}>{t("push.privacyLink")}</a>
    {error && <div role="alert">
      <p>{t(error)}</p>
      {!publicKey && offerPush && <button type="button" disabled={isBusy || isLoading}
        onClick={() => { setIsLoading(true); setRetry(value => value + 1) }}
        className={`min-h-11 underline ${focusClass}`}>{t("account.refresh")}</button>}
    </div>}
    <button type="submit" disabled={isBusy || isLoading}
      className={`min-h-11 w-full rounded-xl bg-brand-green-700 px-4 py-3 font-semibold text-white disabled:opacity-50 ${focusClass}`}>
      {t(isBusy || isLoading ? "marketingInvitation.saving" : "marketingInvitation.save")}
    </button>
  </form>
}
