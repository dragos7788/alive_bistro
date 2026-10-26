import { useState } from "react"
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react"
import { ArrowRight, Leaf, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { accountRequest, type Provider } from "./api"
import type { useCustomerAccount } from "./useCustomerAccount"
import { MemberCard } from "./MemberCard"
import { AccountPage } from "./AccountPage"
import { MarketingInvitation } from "./MarketingInvitation"

/** Keeps sign-in in a dialog and member details on the standalone account page. */
export function CustomerAccount({ state, isPage, open, onOpen, onClose }: {
  state: ReturnType<typeof useCustomerAccount>
  isPage: boolean
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { account, clearCustomer, loadError, refresh } = state
  const [error, setError] = useState(() => {
    const authError = new URLSearchParams(window.location.search).get("auth")
    return authError === "marketing-email-required" ? "account.marketingEmailRequired"
      : authError ? "account.authError" : ""
  })
  const [pending, setPending] = useState(false)
  const [preferenceRevision, setPreferenceRevision] = useState(0)
  const [emailMarketingConsent, setEmailMarketingConsent] = useState(false)
  const [referral, setReferral] = useState(() => new URLSearchParams(window.location.search).get("ref") ?? "")
  async function handleSignIn(provider: Provider, link: boolean) {
    setPending(true)
    setError("")
    try {
      const data = await accountRequest("start", {
        provider, referral: link ? "" : referral, link,
        marketingEmailConsent: !link && emailMarketingConsent,
      })
      if (!data || typeof data !== "object" || !("url" in data) || typeof data.url !== "string") throw new Error("account.error")
      const url = new URL(data.url)
      if (url.protocol !== "https:" || !["accounts.google.com", "www.facebook.com"].includes(url.hostname)) throw new Error("account.error")
      window.location.assign(url.href)
    } catch (reason) {
      console.error("ALIVE sign-in could not start", reason)
      setError(reason instanceof Error && reason.message === "account.invalidReferral" ? reason.message : "account.error")
      setPending(false)
    }
  }

  async function handleLogout() {
    setPending(true)
    setError("")
    try {
      await accountRequest("logout", {})
      onClose()
      clearCustomer()
    } catch (reason) {
      console.error("ALIVE sign-out failed", reason)
      setError("account.error")
    } finally { setPending(false) }
  }

  const customer = account?.customer
  if (customer) {
    return (
      <>
      <MarketingInvitation key={customer.referralCode} email={customer.email} onUpdated={refresh}
        onClose={() => { setPreferenceRevision(value => value + 1); refresh() }} />
      {isPage && <AccountPage name={customer.name}>
        {(error || loadError) && <p role="alert" className="mb-4 text-red-800">{t(error || loadError)}</p>}
        {(error || loadError) && <button type="button" disabled={pending} onClick={() => { setError(""); refresh() }}
          className="mb-4 min-h-11 underline focus-visible:outline-2 focus-visible:outline-brand-green-700">{t("account.refresh")}</button>}
        <MemberCard key={`${customer.referralCode}-${preferenceRevision}`} customer={customer} providers={account.providers} pending={pending}
          onLogout={() => void handleLogout()} onLink={provider => void handleSignIn(provider, true)}
          onVoucherGenerated={state.refresh} onMarketingUpdated={state.refresh} />
      </AccountPage>}
      </>
    )
  }

  return (
    <>
    {isPage && <AccountPage>
      <div className="max-w-md space-y-4 rounded-3xl border border-brand-green-700/15 bg-brand-cream-50 p-6">
        <p role={loadError ? "alert" : !account ? "status" : undefined} className="text-brand-green-800">{t(!account && !loadError ? "account.loading" : loadError || "account.welcomeSubtitle")}</p>
        <button type="button" onClick={onOpen} className="min-h-12 rounded-xl bg-brand-green-700 px-6 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700">
          {t("account.signIn")}
        </button>
      </div>
    </AccountPage>}
    <Dialog open={open} onClose={onClose} className="relative z-[70]">
      <div className="fixed inset-0 bg-brand-dark/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
      <DialogPanel className="relative max-h-[90dvh] w-full max-w-md space-y-5 overflow-y-auto rounded-[2rem] bg-brand-cream-50 p-7 text-brand-dark shadow-2xl sm:p-10">
        <div className="flex items-start justify-between gap-3">
          <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green-700/10 text-brand-green-700"><Leaf size={25} /></span>
          <button type="button" onClick={onClose} aria-label={t("menu.close")}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-brand-green-800 hover:bg-brand-green-700/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green-700">ALIVE COMMUNITY</p>
          <DialogTitle className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">{t("account.welcomeTitle")}</DialogTitle>
          <p className="text-sm leading-relaxed text-brand-green-800">{t("account.welcomeSubtitle")}</p>
        </div>
        {(error || loadError) && <p role="alert" className="text-red-800">{t(error || loadError)}</p>}
        {!account && !error && !loadError && <p role="status">{t("account.loading")}</p>}
        {account && (
          <>
            {!account.providers.length && <p role="status">{t("account.notConfigured")}</p>}
            <div className="space-y-3 pt-2">
              {(account.providers.length ? account.providers : ["google"] as const).map(provider => (
                <button type="button" key={provider} disabled={pending || !account.providers.includes(provider)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-brand-green-700/20 bg-white px-5 py-4 text-sm font-semibold text-brand-dark shadow-sm transition-colors hover:bg-brand-green-700/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => void handleSignIn(provider, false)}>
                  <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center text-lg font-bold">{provider === "google" ? "G" : "f"}</span>
                  {t("account.login", { provider: provider === "google" ? "Google" : "Facebook" })}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              ))}
            </div>
            <label className="flex items-start gap-3 border-t border-brand-green-700/10 pt-4 text-sm leading-relaxed">
              <input type="checkbox" checked={emailMarketingConsent} disabled={pending}
                onChange={event => setEmailMarketingConsent(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-brand-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700" />
              <span>{t("account.marketingEmailConsent")}</span>
            </label>
            <p className="text-xs leading-relaxed text-brand-green-800">{t("account.marketingDetails")}</p>
            <details open={referral ? true : undefined} className="border-t border-brand-green-700/10 pt-4 text-sm">
              <summary className="min-h-11 cursor-pointer py-3 text-brand-green-800 focus-visible:outline-2 focus-visible:outline-brand-green-700">{t("account.haveReferral")}</summary>
              <label className="sr-only" htmlFor="account-referral">{t("account.referralCode")}</label>
              <input id="account-referral" value={referral} maxLength={16} autoComplete="off" disabled={pending}
                onChange={event => setReferral(event.target.value.toUpperCase())}
                placeholder={t("account.referralPlaceholder")}
                className="w-full rounded-xl border border-brand-green-700/30 bg-white p-3 focus-visible:outline-2 focus-visible:outline-brand-green-700" />
              <p className="mt-2 text-xs leading-relaxed">{t("account.referralRules")}</p>
            </details>
            <p className="text-center text-xs leading-relaxed text-brand-green-800">{t("account.comingSoonNote")}</p>
          </>
        )}
        {(error || loadError) && <button type="button" disabled={pending}
          className="min-h-11 text-sm text-brand-green-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-green-700"
          onClick={() => { setError(""); refresh() }}>{t("account.refresh")}</button>}
      </DialogPanel>
      </div>
    </Dialog>
    </>
  )
}
