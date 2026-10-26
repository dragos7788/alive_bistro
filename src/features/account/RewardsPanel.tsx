import { useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePointsVoucher, type Voucher } from "./api"

/** Shows a member's vouchers and lets them exchange eligible points for a voucher. */
export function RewardsPanel({ points, vouchers, onVoucherGenerated }: {
  points: number
  vouchers: Voucher[]
  onVoucherGenerated: () => void
}) {
  const { t, i18n } = useTranslation()
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"

  async function handleGenerateVoucher() {
    setIsGenerating(true)
    setStatus("idle")
    try {
      await generatePointsVoucher()
      onVoucherGenerated()
      setStatus("success")
    } catch (error) {
      console.error("ALIVE points voucher generation failed", error)
      setErrorMessage(error instanceof Error ? error.message : "account.error")
      setStatus("error")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section aria-labelledby="account-vouchers-heading" className="rounded-2xl border border-brand-green-700/15 p-5 md:col-span-2">
      <h3 id="account-vouchers-heading" className="font-semibold">{t("account.vouchers")}</h3>
      <p className="mt-1 text-sm leading-relaxed text-brand-green-800">{t("account.voucherPointsRule")}</p>
      <button type="button" disabled={isGenerating || points < 1000}
        onClick={() => void handleGenerateVoucher()}
        className={`mt-4 min-h-11 rounded-xl bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800 disabled:cursor-not-allowed disabled:opacity-50 ${focusClass}`}>
        {t(isGenerating ? "account.generatingVoucher" : "account.generateVoucher")}
      </button>
      {status === "success" && <p role="status" aria-live="polite" className="mt-2 text-sm">{t("account.voucherGenerated")}</p>}
      {status === "error" && <p role="alert" className="mt-2 text-sm text-red-800">{t(errorMessage)}</p>}
      {vouchers.length === 0 ? (
        <p className="mt-4 text-sm text-brand-green-800">{t("account.noVouchers")}</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {vouchers.map(voucher => {
            const isExpired = voucher.status === "expired"
            return (
              <li key={voucher.id} className="rounded-xl bg-brand-cream-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{t(voucher.source === "welcome" ? "account.welcomeVoucher" : "account.pointsVoucherTitle")}</p>
                  <span className={`text-xs font-semibold ${isExpired ? "text-brand-dark/60" : "text-brand-green-800"}`}>
                    {t(isExpired ? "account.voucherExpired" : "account.voucherActive")}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-brand-green-800">{voucher.discountPercent}%</p>
                <code className="mt-2 block break-all rounded bg-white px-2 py-1 font-mono text-sm">{voucher.code}</code>
                <p className="mt-2 text-xs text-brand-green-800">
                  {t("account.voucherExpires", {
                    date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(voucher.expiresAt * 1000),
                  })}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
