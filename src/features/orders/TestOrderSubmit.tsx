import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { CartEntry } from "../cart/cart"
import type { ContactDetails } from "../cart/checkout"

/** Offers local-only test submission; a retry of identical data reuses its idempotency key. */
export function TestOrderSubmit({ contact, items, totalBani, onBusyChange }: {
  contact: ContactDetails
  items: CartEntry[]
  totalBani: number
  onBusyChange: (busy: boolean) => void
}) {
  const { t } = useTranslation()
  const [isEnabled, setIsEnabled] = useState(false)
  const [error, setError] = useState("")
  const [isPending, setIsPending] = useState(false)
  const [number, setNumber] = useState("")
  const attempt = useRef<{ payload: string; key: string } | null>(null)

  useEffect(() => {
    if (!["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)) return
    const controller = new AbortController()
    fetch("/api/orders/config", { signal: controller.signal }).then(async response => {
      if (!response.ok || !response.headers.get("Content-Type")?.includes("application/json")) {
        throw new Error("checkout.testApiUnavailable")
      }
      const json: { data?: { testOrdersEnabled?: boolean } } = await response.json()
      if (typeof json.data?.testOrdersEnabled !== "boolean") throw new Error("checkout.testApiUnavailable")
      setIsEnabled(json.data.testOrdersEnabled)
    }).catch(error => {
      if (!controller.signal.aborted) {
        console.error("Unable to load TEST order configuration", error)
        setError(t("checkout.testApiUnavailable"))
      }
    })
    return () => controller.abort()
  }, [t])

  const handleSubmit = async () => {
    if (isPending || number) return
    const payload = JSON.stringify({
      contact, expectedTotalBani: totalBani,
      items: items.map(({ key, name, quantity, selection }) => ({ key, name, quantity, ...(selection ? { selection } : {}) })),
    })
    if (attempt.current?.payload !== payload) attempt.current = { payload, key: crypto.randomUUID() }
    setIsPending(true)
    onBusyChange(true)
    setError("")
    try {
      const response = await fetch("/api/orders", {
        signal: AbortSignal.timeout(15000),
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.current.key },
        body: payload,
      })
      const json: { data?: { number?: string; mode?: string; paymentStatus?: string }; error?: { message?: string } } = await response.json()
      if (!response.ok) throw new Error(json.error?.message ?? t("checkout.testSaveError"))
      if (!json.data?.number?.startsWith("TEST-") || json.data.mode !== "TEST" || json.data.paymentStatus !== "unpaid") {
        throw new Error(t("checkout.testSaveError"))
      }
      setNumber(json.data.number)
    } catch (error) {
      console.error("Unable to submit TEST order", error)
      setError(error instanceof Error ? error.message : t("checkout.testSaveError"))
    } finally {
      setIsPending(false)
      onBusyChange(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-50 p-4">
      {error && <p role="alert" className="mb-3 text-sm text-red-800">{error}</p>}
      {number ? (
        <div role="status" className="break-words text-sm text-brand-green-900">
          <p className="font-bold">{t("checkout.testSaved")}</p>
          <p className="mt-2">{number}</p>
          <p className="mt-2">{t("checkout.testSavedNote")}</p>
        </div>
      ) : isEnabled ? (
        <>
          <p className="text-sm text-amber-950">{t("checkout.testNotice")}</p>
          <button type="button" disabled={isPending} onClick={handleSubmit}
            className="mt-3 min-h-11 w-full rounded-full bg-brand-green-700 px-4 py-3 font-semibold text-white disabled:opacity-50">
            {t(isPending ? "checkout.testSaving" : "checkout.testSubmit")}
          </button>
        </>
      ) : <p className="text-sm text-amber-950">{t("checkout.testDisabled")}</p>}
    </div>
  )
}
