import { useEffect, useState } from "react"
import { parseCommerceResponse, type CommerceSettings } from "./api"

/** Revalidates global sales on focus and every 15 seconds, failing closed on errors. */
export function useCommerceSettings(isActive: boolean) {
  const [settings, setSettings] = useState<CommerceSettings | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isActive) return
    let controller: AbortController | undefined
    async function refresh() {
      controller?.abort()
      const current = new AbortController()
      controller = current
      try {
        const response = await fetch("/api/commerce", {
          cache: "no-store", signal: AbortSignal.any([current.signal, AbortSignal.timeout(10000)]),
        })
        const data = await parseCommerceResponse(response)
        if (current.signal.aborted) return
        setSettings(data)
        setError("")
      } catch (reason) {
        if (current.signal.aborted) return
        console.error("Commerce settings loading failed", reason)
        setSettings(null)
        setError("commerce.loadError")
      }
    }
    const onVisible = () => { if (document.visibilityState === "visible") void refresh() }
    void refresh()
    const timer = window.setInterval(onVisible, 15000)
    window.addEventListener("focus", onVisible)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      controller?.abort()
      window.clearInterval(timer)
      window.removeEventListener("focus", onVisible)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [isActive])

  return { salesEnabled: isActive && settings?.salesEnabled === true, error }
}
