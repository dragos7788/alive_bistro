import { useEffect, useRef, useState } from "react"
import { Dialog, DialogDescription, DialogPanel, DialogTitle } from "@headlessui/react"
import { Leaf, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { accountRequest } from "./api"
import { MarketingPreferences } from "./MarketingPreferences"
import { PushPreferences } from "./PushPreferences"

type Invitation = { show: boolean; email: boolean; push: boolean }

function isInvitation(value: unknown): value is Invitation {
  return !!value && typeof value === "object"
    && "show" in value && typeof value.show === "boolean"
    && "email" in value && typeof value.email === "boolean"
    && "push" in value && typeof value.push === "boolean"
}

/** Offers separate, optional channels once per account, with a server-persisted claim. */
export function MarketingInvitation({ email, onUpdated, onClose }: {
  email: string | null
  onUpdated: (consent: boolean) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [retry, setRetry] = useState(0)
  const claim = useRef<Promise<unknown> | null>(null)
  const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"

  useEffect(() => {
    let active = true
    // Reuse the mutation during Strict Mode replay; aborting it could consume the only invitation.
    claim.current ??= accountRequest("marketing-invitation", { action: "claim" })
    void claim.current.then(result => {
      if (!isInvitation(result)) throw new Error("Invalid marketing invitation response")
      if (active) { setInvitation(result); setIsOpen(result.show); setHasError(false) }
    }).catch(reason => {
      if (!active) return
      console.error("ALIVE marketing invitation could not load", reason)
      setHasError(true)
    })
    return () => { active = false }
  }, [retry])

  function handleClose() {
    setIsOpen(false)
    onClose()
  }

  return (
    <>
      {hasError && <div role="status" className="p-4 text-sm text-brand-green-800">
        <p>{t("marketingInvitation.error")}</p>
        <button type="button" className={`min-h-11 underline ${focusClass}`}
          onClick={() => { claim.current = null; setHasError(false); setRetry(value => value + 1) }}>
          {t("account.refresh")}
        </button>
      </div>}
      <Dialog open={isOpen} onClose={handleClose} className="relative z-[70]">
        <div className="fixed inset-0 bg-brand-dark/50 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
          <DialogPanel className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-brand-cream-50 p-6 text-brand-dark shadow-2xl sm:p-8">
            <div className="mb-5 flex shrink-0 items-center justify-between gap-3">
              <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green-700/10 text-brand-green-700">
                <Leaf size={25} />
              </span>
              <button type="button" data-autofocus onClick={handleClose} aria-label={t("menu.close")}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-brand-green-700/10 ${focusClass}`}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 space-y-5 overflow-y-auto">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green-700">ALIVE COMMUNITY</p>
                <DialogTitle className="font-serif text-3xl font-semibold leading-tight">{t("marketingInvitation.title")}</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-brand-green-800">{t("marketingInvitation.description")}</DialogDescription>
              </div>
              {invitation?.email && <MarketingPreferences email={email} initialConsent={false}
                presentation="invitation" onSaved={onUpdated} />}
              {invitation?.push && <PushPreferences presentation="invitation" />}
              <p className="text-xs leading-relaxed text-brand-green-800">{t("marketingInvitation.optional")}</p>
            </div>
            <button type="button" onClick={handleClose}
              className={`mt-5 min-h-11 w-full shrink-0 rounded-xl border border-brand-green-700/30 px-4 py-3 text-sm font-semibold hover:bg-brand-green-700/5 ${focusClass}`}>
              {t("marketingInvitation.notNow")}
            </button>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}
