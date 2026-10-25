import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Download, X } from "lucide-react"

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isInstallPrompt(event: Event): event is InstallPromptEvent {
  return "prompt" in event && typeof event.prompt === "function" && "userChoice" in event
}

/** Offers installation separately from the promotional community membership benefit. */
export function InstallToast() {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isInstalled, setIsInstalled] = useState(() =>
    window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && navigator.standalone === true))
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 8000)
    const displayMode = window.matchMedia("(display-mode: standalone)")
    const handleDisplayMode = (event: MediaQueryListEvent) => setIsInstalled(event.matches)
    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }
    const handlePrompt = (event: Event) => {
      if (!isInstallPrompt(event)) return
      event.preventDefault()
      setInstallPrompt(event)
    }
    window.addEventListener("beforeinstallprompt", handlePrompt)
    window.addEventListener("appinstalled", handleInstalled)
    displayMode.addEventListener("change", handleDisplayMode)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("beforeinstallprompt", handlePrompt)
      window.removeEventListener("appinstalled", handleInstalled)
      displayMode.removeEventListener("change", handleDisplayMode)
    }
  }, [])

  async function handleInstall() {
    setHasError(false)
    if (!installPrompt) {
      setShowInstructions(true)
      return
    }
    setIsInstalling(true)
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === "accepted") setIsDismissed(true)
    } catch (error) {
      console.error("ALIVE Bistro: installation prompt failed", error)
      setHasError(true)
      setShowInstructions(true)
    } finally {
      setInstallPrompt(null)
      setIsInstalling(false)
    }
  }

  const buttonClass = "rounded-full px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"

  return (
    <div aria-live="polite" aria-atomic="true">
      {isVisible && !isDismissed && !isInstalled && (
        <aside aria-label={t("installToast.label")}
          className="fixed bottom-4 left-4 right-4 z-40 max-h-[70dvh] overflow-y-auto rounded-2xl border border-brand-green-700/20 bg-brand-cream-100 p-4 text-brand-dark shadow-xl sm:left-auto sm:w-80">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-serif text-xl font-bold">{t("installToast.title")}</h2>
            <button type="button" aria-label={t("installToast.close")}
              onClick={() => setIsDismissed(true)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-brand-green-700/10 focus-visible:outline-2 focus-visible:outline-brand-green-700">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-1 text-sm font-semibold">{t("installToast.discount")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void handleInstall()} disabled={isInstalling}
              aria-expanded={showInstructions} aria-controls="install-toast-instructions"
              className={`${buttonClass} flex items-center gap-2 bg-brand-green-700 text-white hover:bg-brand-green-800 disabled:opacity-50`}>
              <Download size={16} aria-hidden="true" />
              {t(isInstalling ? "installToast.installing" : "installToast.install")}
            </button>
            <a href="/#community" onClick={() => setIsDismissed(true)}
              className={`${buttonClass} underline`}>{t("installToast.community")}</a>
          </div>
          <p className="mt-2 text-xs leading-relaxed">{t("installToast.membershipNote")}</p>
          <div id="install-toast-instructions" hidden={!showInstructions} className="mt-3 space-y-2 text-sm">
            <p>{t("installToast.ios")}</p>
            <p>{t("installToast.browser")}</p>
          </div>
          {hasError && <p role="alert" className="mt-3 text-sm text-red-800">{t("installToast.error")}</p>}
        </aside>
      )}
    </div>
  )
}
