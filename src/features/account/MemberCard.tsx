import { useState } from "react"
import { Check, Copy, Gift, LogOut } from "lucide-react"
import { useTranslation } from "react-i18next"
import { QRCodeSVG } from "qrcode.react"
import type { AccountData, Provider } from "./api"
import { RewardsPanel } from "./RewardsPanel"

/** Presents member rewards and referral actions without exposing technical account details. */
export function MemberCard({ customer, providers, pending, onLogout, onLink, onVoucherGenerated }: {
  customer: NonNullable<AccountData["customer"]>
  providers: Provider[]
  pending: boolean
  onLogout: () => void
  onLink: (provider: Provider) => void
  onVoucherGenerated: () => void
}) {
  const { t, i18n } = useTranslation()
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle")
  const unlinked = providers.filter(provider => !customer.linkedProviders.includes(provider))
  const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"

  async function copyReferral() {
    try {
      await navigator.clipboard.writeText(customer.referralUrl)
      setCopyState("copied")
    } catch (error) {
      console.error("Unable to copy ALIVE referral link", error)
      setCopyState("error")
    }
  }

  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <div className="rounded-3xl bg-brand-green-700 p-6 text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">{t("account.yourPoints")}</p>
          <Gift size={22} aria-hidden="true" />
        </div>
        <p className="mt-2 text-5xl font-semibold tracking-tight">{new Intl.NumberFormat(i18n.language).format(customer.points)}</p>
        <p className="mt-3 text-xs leading-relaxed">{t("account.comingSoonNote")}</p>
      </div>
      <div className="rounded-2xl border border-brand-green-700/15 p-4">
        <h3 className="font-semibold">{t("account.inviteTitle")}</h3>
        <p className="mt-1 text-sm leading-relaxed text-brand-green-800">{t("account.inviteSubtitle")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <figure className="shrink-0">
            <QRCodeSVG value={customer.referralUrl} size={144} level="M" marginSize={4}
              bgColor="#ffffff" fgColor="#000000" title={t("account.referralQr")}
              role="img" aria-label={t("account.referralQr")} />
            <figcaption className="mt-1 text-center text-xs text-brand-green-800">{t("account.scanReferral")}</figcaption>
          </figure>
          <div className="min-w-0 flex-1 basis-32">
            <label className="mb-2 block text-xs font-medium" htmlFor="member-referral-url">{t("account.referralLink")}</label>
            <input id="member-referral-url" readOnly value={customer.referralUrl}
              onFocus={event => event.currentTarget.select()}
              className={`min-h-11 w-full rounded-lg border border-brand-green-700/30 bg-white p-2 text-xs ${focusClass}`} />
          </div>
        </div>
        <button type="button" onClick={() => void copyReferral()}
          className={`mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-green-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-green-800 ${focusClass}`}>
          {copyState === "copied" ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
          {t(copyState === "copied" ? "account.linkCopied" : "account.inviteAction")}
        </button>
        <div role="status" className="text-xs">
          {copyState === "copied" && <p className="mt-2">{t("account.linkCopiedNote")}</p>}
          {copyState === "error" && (
            <div className="mt-2 space-y-2">
              <p>{t("account.copyError")}</p>
            </div>
          )}
        </div>
      </div>
      <RewardsPanel points={customer.points} vouchers={customer.vouchers} onVoucherGenerated={onVoucherGenerated} />
      <div className="divide-y divide-brand-green-700/10 text-sm md:col-span-2">
        <details>
          <summary className={`min-h-11 cursor-pointer py-3 font-medium ${focusClass}`}>{t("account.activity")}</summary>
          {!customer.history.length ? <p className="pb-4 text-brand-green-800">{t("account.noHistory")}</p> : (
            <ul className="space-y-3 pb-4">
              {customer.history.map(row => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span>{t(`account.${row.kind}`)}<span className="block text-xs">{new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(row.created_at * 1000)}</span></span>
                  <span className="font-semibold">{new Intl.NumberFormat(i18n.language, { signDisplay: "always" }).format(row.points_delta)}</span>
                </li>
              ))}
            </ul>
          )}
        </details>
        <details>
          <summary className={`min-h-11 cursor-pointer py-3 font-medium ${focusClass}`}>{t("account.benefitDetails")}</summary>
          <div className="space-y-2 pb-4 text-xs leading-relaxed text-brand-green-800">
            <p>{t("account.rules")}</p>
            <p>{t("account.notLive")}</p>
            <p>{t("account.referralRules")}</p>
          </div>
        </details>
        {unlinked.length > 0 && <details>
          <summary className={`min-h-11 cursor-pointer py-3 font-medium ${focusClass}`}>{t("account.connections")}</summary>
          <div className="space-y-3 pb-4">
            <p className="text-xs">{t("account.linkNote")}</p>
            {unlinked.map(provider => <button key={provider} type="button" disabled={pending}
              onClick={() => onLink(provider)} className={`min-h-11 rounded-xl border px-4 py-2 disabled:opacity-50 ${focusClass}`}>
              {t("account.link", { provider: provider === "google" ? "Google" : "Facebook" })}
            </button>)}
          </div>
        </details>}
      </div>
      <div className="flex justify-end border-t border-brand-green-700/10 pt-2 md:col-span-2">
        <button type="button" disabled={pending} onClick={onLogout}
          className={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-brand-green-800 hover:bg-brand-green-700/5 disabled:opacity-50 ${focusClass}`}>
          <LogOut size={15} aria-hidden="true" />{t("account.logout")}
        </button>
      </div>
    </div>
  )
}
