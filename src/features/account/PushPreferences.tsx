import { useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { accountRequest } from "./api"

type PushState = { publicKey: string | null; consent: boolean; devices: number }

function isPushState(value: unknown): value is PushState {
  return !!value && typeof value === "object" && "publicKey" in value
    && (value.publicKey === null || typeof value.publicKey === "string")
    && "consent" in value && typeof value.consent === "boolean"
    && "devices" in value && typeof value.devices === "number" && Number.isSafeInteger(value.devices)
}

function publicKeyBytes(key: string): Uint8Array<ArrayBuffer> {
  const raw = atob(key.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - key.length % 4) % 4))
  return Uint8Array.from(raw, char => char.charCodeAt(0))
}

/** Requests separate marketing consent and browser permission only after an explicit user action. */
export function PushPreferences({ presentation = "preferences" }: { presentation?: "preferences" | "invitation" }) {
  const { t } = useTranslation()
  const headingId = useId()
  const [state, setState] = useState<PushState | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [reload, setReload] = useState(0)
  const supported = typeof window !== "undefined" && window.isSecureContext
    && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  const [isDeviceSubscribed, setIsDeviceSubscribed] = useState(false)
  const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const data = await accountRequest("push", undefined, controller.signal)
        if (!isPushState(data)) throw new Error("account.error")
        const registration = supported ? await navigator.serviceWorker.getRegistration("/") : undefined
        const subscription = registration ? await registration.pushManager.getSubscription() : null
        if (!controller.signal.aborted) {
          setState(data)
          setIsDeviceSubscribed(!!subscription)
          setError("")
        }
      } catch (reason) {
        if (controller.signal.aborted) return
        console.error("ALIVE push settings loading failed", reason instanceof Error ? reason.name : "UnknownError")
        setError("account.error")
      }
    }
    void load()
    return () => controller.abort()
  }, [reload, supported])

  async function handleSubscribe() {
    if (!state?.publicKey || !supported || isBusy) return
    setIsBusy(true)
    setError("")
    setMessage("")
    let created: PushSubscription | null = null
    try {
      // Keep the permission request directly inside the click gesture, including on iOS.
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setMessage("push.permissionDenied")
        return
      }
      await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" })
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true, applicationServerKey: publicKeyBytes(state.publicKey),
        })
        created = subscription
      }
      const result = await accountRequest("push", {
        action: "subscribe", consent: true, noticeVersion: "push-marketing-v1", subscription: subscription.toJSON(),
      })
      if (!result || typeof result !== "object" || !("consent" in result) || result.consent !== true) throw new Error("account.error")
      setState(current => current && { ...current, consent: true })
      setIsDeviceSubscribed(true)
      setMessage("push.enabled")
      setReload(value => value + 1)
    } catch (reason) {
      console.error("ALIVE push subscription failed", reason instanceof Error ? reason.name : "UnknownError")
      setError(reason instanceof Error && reason.message === "push.deviceInUse" ? reason.message : "account.error")
      if (created) {
        try { await created.unsubscribe() } catch (cleanupError) {
          console.error("ALIVE push subscription cleanup failed", cleanupError instanceof Error ? cleanupError.name : "UnknownError")
        }
      }
    } finally { setIsBusy(false) }
  }

  async function handleWithdraw() {
    setIsBusy(true)
    setError("")
    setMessage("")
    try {
      const result = await accountRequest("push", { action: "withdraw" })
      if (!result || typeof result !== "object" || !("consent" in result) || result.consent !== false) throw new Error("account.error")
      setState(current => current && { ...current, consent: false, devices: 0 })
      setMessage("push.withdrawn")
      // Server-side withdrawal stops every device even if local browser cleanup fails.
      try {
        const registration = supported ? await navigator.serviceWorker.getRegistration("/") : undefined
        const subscription = registration ? await registration.pushManager.getSubscription() : null
        if (subscription) await subscription.unsubscribe()
        setIsDeviceSubscribed(false)
      } catch (reason) {
        console.error("ALIVE local push cleanup failed", reason instanceof Error ? reason.name : "UnknownError")
        setError("push.cleanupError")
      }
    } catch (reason) {
      console.error("ALIVE push consent withdrawal failed", reason instanceof Error ? reason.name : "UnknownError")
      setError("account.error")
    } finally { setIsBusy(false) }
  }

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-brand-green-700/15 p-5 md:col-span-2">
      <h3 id={headingId} className="font-semibold">{t("push.title")}</h3>
      {presentation === "invitation" ? <>
        <p className="mt-2 text-sm leading-relaxed text-brand-green-800">{t("marketingInvitation.pushDescription")}</p>
        <details className="mt-2 text-xs leading-relaxed">
          <summary className={`min-h-11 cursor-pointer py-3 ${focusClass}`}>{t("marketingInvitation.pushDetails")}</summary>
          <p>{t("push.notice")}</p>
          <p className="mt-2">{t("push.installHint")}</p>
        </details>
      </> : <>
        <p className="mt-2 text-sm leading-relaxed text-brand-green-800">{t("push.notice")}</p>
        <p className="mt-2 text-xs leading-relaxed">{t("push.installHint")}</p>
      </>}
      {!supported && <p className="mt-3 text-sm">{t("push.unsupported")}</p>}
      {state && !state.publicKey && <p role="status" className="mt-3 text-sm">{t("push.notConfigured")}</p>}
      {state && (state.consent || presentation === "preferences") && <p className="mt-3 text-sm">{t(state.consent ? "push.active" : "push.inactive", { count: state.devices })}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {supported && state?.publicKey && (!state.consent || !isDeviceSubscribed) && (
          <button type="button" disabled={isBusy} onClick={() => void handleSubscribe()}
            className={`min-h-11 rounded-xl bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${focusClass}`}>
            {t(isBusy ? "push.working" : "push.accept")}
          </button>
        )}
        {state?.consent && <button type="button" disabled={isBusy} onClick={() => void handleWithdraw()}
          className={`min-h-11 rounded-xl border border-brand-green-700/30 px-4 py-2 text-sm disabled:opacity-50 ${focusClass}`}>
          {t("push.withdraw")}
        </button>}
        {error && <button type="button" disabled={isBusy} onClick={() => setReload(value => value + 1)}
          className={`min-h-11 underline ${focusClass}`}>{t("account.refresh")}</button>}
      </div>
      {!state && !error && <p role="status" className="mt-2 text-sm">{t("account.loading")}</p>}
      {message && <p role="status" className="mt-2 text-sm">{t(message)}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-800">{t(error)}</p>}
    </section>
  )
}
