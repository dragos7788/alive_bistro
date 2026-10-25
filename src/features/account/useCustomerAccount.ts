import { useEffect, useRef, useState } from "react"
import { accountRequest, isAccountData, type AccountData } from "./api"

/** Shares the server-confirmed session between account details and the navigation avatar. */
export function useCustomerAccount(enabled: boolean) {
  const [account, setAccount] = useState<AccountData | null>(null)
  const [loadError, setLoadError] = useState("")
  const [reload, setReload] = useState(0)
  const revision = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    async function load() {
      const requestRevision = ++revision.current
      try {
        const data = await accountRequest("me", undefined, controller.signal)
        if (!isAccountData(data)) throw new Error("Invalid account response")
        if (controller.signal.aborted || requestRevision !== revision.current) return
        setAccount(data)
        setLoadError("")
      } catch (reason) {
        if (controller.signal.aborted || requestRevision !== revision.current) return
        console.error("ALIVE account loading failed", reason)
        setAccount(null)
        setLoadError("account.error")
      }
    }
    void load()
    const onVisible = () => {
      if (document.visibilityState === "visible") void load()
    }
    window.addEventListener("focus", load)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      controller.abort()
      window.removeEventListener("focus", load)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [enabled, reload])

  const clearCustomer = () => {
    revision.current++
    setAccount(current => current ? { ...current, customer: null } : null)
  }
  return { account, clearCustomer, loadError, refresh: () => setReload(value => value + 1) }
}
