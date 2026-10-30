import { useEffect, useState } from "react"
import { parseHealthyDealSettings, type HealthyDealDocument } from "./schedule"

/** Revalidates server settings and the Romanian minute while a menu is open. */
export function useHealthyDeal(enabled: boolean) {
  const [document, setDocument] = useState<HealthyDealDocument | null>(null)
  const [error, setError] = useState(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let pending = false
    let offset = 0
    const refresh = async () => {
      if (pending) return
      pending = true
      try {
        const response = await fetch("/api/healthy-deal", { signal: controller.signal, cache: "no-store" })
        if (!response.ok) throw new Error(`Healthy Deal HTTP ${response.status}`)
        const json = await response.json() as { data?: { revision?: unknown; settings?: unknown; serverTime?: unknown } }
        const data = json.data
        if (!data || typeof data.revision !== "number" || !Number.isSafeInteger(data.revision)
          || data.revision < 0 || typeof data.serverTime !== "string"
          || !Number.isFinite(Date.parse(data.serverTime))) throw new Error("Invalid Healthy Deal response")
        const settings = parseHealthyDealSettings(data.settings)
        if (controller.signal.aborted) return
        offset = Date.parse(data.serverTime) - Date.now()
        setNow(Date.now() + offset)
        setDocument({ revision: data.revision, settings })
        setError(false)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Healthy Deal loading failed", error)
          setDocument(null)
          setError(true)
        }
      } finally { pending = false }
    }
    const onVisible = () => { if (!window.document.hidden) void refresh() }
    void refresh()
    const refreshTimer = window.setInterval(onVisible, 30000)
    const clockTimer = window.setInterval(() => {
      const current = Date.now() + offset
      setNow(previous => Math.floor(previous / 60000) === Math.floor(current / 60000) ? previous : current)
    }, 1000)
    window.document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onVisible)
    return () => {
      controller.abort()
      window.clearInterval(refreshTimer)
      window.clearInterval(clockTimer)
      window.document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onVisible)
    }
  }, [enabled])
  return { document, error, now: new Date(now) }
}
