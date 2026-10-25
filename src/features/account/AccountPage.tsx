import { useEffect, useRef, type ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { useTranslation } from "react-i18next"

/** Provides the standalone customer account layout and route-entry focus. */
export function AccountPage({ name, children }: { name?: string; children: ReactNode }) {
  const { t } = useTranslation()
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [name])

  return (
    <main id="account" className="mx-auto min-h-[75dvh] max-w-4xl px-5 pb-16 pt-32 sm:px-8">
      <a href="/menu" className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-green-800 focus-visible:outline-2 focus-visible:outline-brand-green-700">
        <ArrowLeft size={18} aria-hidden="true" />{t("account.backToMenu")}
      </a>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green-700">ALIVE COMMUNITY</p>
      <h1 ref={heading} tabIndex={-1} className="mb-8 mt-3 font-serif text-4xl font-semibold text-brand-dark focus-visible:outline-2 focus-visible:outline-brand-green-700 sm:text-5xl">
        {name ? t("account.memberGreeting", { name: name.trim().split(/\s+/)[0] }) : t("account.nav")}
      </h1>
      {children}
    </main>
  )
}
