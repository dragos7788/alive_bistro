import { CircleCheck, UserRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { AccountData } from "./api"

/** Links to account details with an explicit server-confirmed authentication indicator. */
export function AccountAvatar({ account, hasError }: { account: AccountData | null; hasError: boolean }) {
  const { t, i18n } = useTranslation()
  const customer = account?.customer
  const status = customer ? t("account.signedInAs", { name: customer.name })
    : t(hasError ? "account.statusUnknown" : account ? "account.signIn" : "account.checking")
  const initials = customer?.name.trim().split(/\s+/).filter(Boolean)
    .filter((_, index, parts) => index === 0 || index === parts.length - 1)
    .map(part => Array.from(part)[0]).join("").toLocaleUpperCase(i18n.language)

  return (
    <a href={customer ? "/account" : "#account"} aria-label={status} title={status}
      className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-brand-green-700/25 bg-brand-cream-50 px-2 py-1 text-brand-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700">
      <span aria-hidden="true" className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${customer ? "bg-brand-green-700 text-white" : "bg-brand-green-700/10"}`}>
        {customer ? initials || <UserRound size={20} /> : <UserRound size={20} />}
        {customer && <CircleCheck size={16} className="absolute -bottom-1 -right-1 rounded-full bg-brand-cream-50 text-brand-green-800" />}
      </span>
      <span aria-hidden="true" className="hidden max-w-28 truncate pr-1 text-xs font-semibold xl:block">
        {customer ? t("account.signedIn") : t(hasError ? "account.statusUnknown" : account ? "account.signIn" : "account.checking")}
      </span>
    </a>
  )
}
