import { useEffect, useRef, useState, type FormEvent } from "react"

type CustomerSummary = {
  id: string
  name: string
  email: string | null
  createdAt: number
  points: number
  activeVouchers: number
  usedVouchers: number
  expiredVouchers: number
  emailMarketingConsent: boolean
  emailMarketingConsentUpdatedAt: number | null
}
type HistoryEntry = {
  id: number
  kind: "purchase" | "referral" | "pointsVoucher"
  pointsDelta: number
  createdAt: number
  reference: string | null
}
type CustomerDetail = {
  customer: CustomerSummary
  history: HistoryEntry[]
  nextHistory: string | null
  marketingConsentHistory: { id: number; action: "granted" | "withdrawn"; source: "login" | "account"; noticeVersion: string; createdAt: number }[]
  vouchers: {
    id: string
    code: string
    source: "welcome" | "points"
    discountPercent: number
    createdAt: number
    expiresAt: number
    usedAt: number | null
    usedOrderId: string | null
    status: "active" | "expired" | "used"
  }[]
}
type ApiError = { error?: { message?: string } }

function formatDate(timestamp: number, withTime = false) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(timestamp * 1000)
}

function isCustomerPage(value: unknown): value is { customers: CustomerSummary[]; next: string | null } {
  return !!value && typeof value === "object" && "customers" in value && Array.isArray(value.customers)
    && "next" in value && (typeof value.next === "string" || value.next === null)
    && value.customers.every(customer => !!customer && typeof customer === "object"
      && "emailMarketingConsent" in customer && typeof customer.emailMarketingConsent === "boolean"
      && "emailMarketingConsentUpdatedAt" in customer
      && (customer.emailMarketingConsentUpdatedAt === null
        || typeof customer.emailMarketingConsentUpdatedAt === "number"))
}

function isCustomerDetail(value: unknown): value is CustomerDetail {
  return !!value && typeof value === "object" && "customer" in value && !!value.customer
    && typeof value.customer === "object" && "emailMarketingConsent" in value.customer
    && typeof value.customer.emailMarketingConsent === "boolean"
    && "emailMarketingConsentUpdatedAt" in value.customer
    && (value.customer.emailMarketingConsentUpdatedAt === null
      || typeof value.customer.emailMarketingConsentUpdatedAt === "number")
    && "history" in value && Array.isArray(value.history)
    && "vouchers" in value && Array.isArray(value.vouchers)
    && "nextHistory" in value && (typeof value.nextHistory === "string" || value.nextHistory === null)
    && "marketingConsentHistory" in value && Array.isArray(value.marketingConsentHistory)
    && value.marketingConsentHistory.every(event => !!event && typeof event === "object"
      && Number.isSafeInteger(event.id) && (event.action === "granted" || event.action === "withdrawn")
      && (event.source === "login" || event.source === "account")
      && typeof event.noticeVersion === "string" && Number.isSafeInteger(event.createdAt))
}

/** Lets administrators inspect customer point totals, transactions and voucher redemption status. */
export function CustomerLoyalty() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [marketingFilter, setMarketingFilter] = useState<"all" | "granted" | "not-granted">("all")
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [historyCursor, setHistoryCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function loadCustomers() {
      setIsLoading(true)
      setError("")
      try {
        const params = new URLSearchParams()
        if (search) params.set("search", search)
        if (marketingFilter !== "all") params.set("marketing", marketingFilter)
        const response = await fetch(`/api/admin/loyalty?${params}`, { cache: "no-store", signal: controller.signal })
        const json: unknown = await response.json()
        const data = json && typeof json === "object" && "data" in json ? json.data : null
        if (!response.ok || !isCustomerPage(data)) {
          const message = json && typeof json === "object" && "error" in json
            ? (json as ApiError).error?.message : undefined
          throw new Error(message ?? "Lista clienților nu a putut fi încărcată.")
        }
        if (!controller.signal.aborted) {
          setCustomers(data.customers)
          setNext(data.next)
          setSelectedId("")
          setDetail(null)
        }
      } catch (reason) {
        if (controller.signal.aborted) return
        console.error("Unable to load admin loyalty customers", reason)
        setError(reason instanceof Error ? reason.message : "Lista clienților nu a putut fi încărcată.")
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    void loadCustomers()
    return () => controller.abort()
  }, [marketingFilter, search])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    async function loadCustomerDetail() {
      setDetail(null)
      setHistoryCursor(null)
      setError("")
      try {
        const response = await fetch(`/api/admin/loyalty?customer=${encodeURIComponent(selectedId)}`, {
          cache: "no-store", signal: controller.signal,
        })
        const json: unknown = await response.json()
        const data = json && typeof json === "object" && "data" in json ? json.data : null
        if (!response.ok || !isCustomerDetail(data)) {
          const message = json && typeof json === "object" && "error" in json
            ? (json as ApiError).error?.message : undefined
          throw new Error(message ?? "Istoricul clientului nu a putut fi încărcat.")
        }
        if (!controller.signal.aborted) {
          setDetail(data)
          setHistoryCursor(data.nextHistory)
          headingRef.current?.focus()
        }
      } catch (reason) {
        if (controller.signal.aborted) return
        console.error("Unable to load admin customer loyalty detail", reason)
        setError(reason instanceof Error ? reason.message : "Istoricul clientului nu a putut fi încărcat.")
      }
    }
    void loadCustomerDetail()
    return () => controller.abort()
  }, [selectedId])

  async function loadMoreCustomers() {
    if (!next || isLoadingMore) return
    setIsLoadingMore(true)
    setError("")
    try {
      const params = new URLSearchParams({ before: next })
      if (search) params.set("search", search)
      if (marketingFilter !== "all") params.set("marketing", marketingFilter)
      const response = await fetch(`/api/admin/loyalty?${params}`, { cache: "no-store" })
      const json: unknown = await response.json()
      const data = json && typeof json === "object" && "data" in json ? json.data : null
      if (!response.ok || !isCustomerPage(data)) throw new Error("Nu s-au putut încărca mai mulți clienți.")
      setCustomers(previous => [...previous, ...data.customers])
      setNext(data.next)
    } catch (reason) {
      console.error("Unable to load another admin loyalty customer page", reason)
      setError(reason instanceof Error ? reason.message : "Nu s-au putut încărca mai mulți clienți.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function loadMoreHistory() {
    if (!selectedId || !historyCursor || !detail || isLoadingMore) return
    setIsLoadingMore(true)
    setError("")
    try {
      const params = new URLSearchParams({ customer: selectedId, before: historyCursor })
      const response = await fetch(`/api/admin/loyalty?${params}`, { cache: "no-store" })
      const json: unknown = await response.json()
      const data = json && typeof json === "object" && "data" in json && isCustomerDetail(json.data) ? json.data : null
      if (!response.ok || !data) throw new Error("Nu s-a putut încărca mai mult din istoric.")
      setDetail(previous => previous && ({ ...previous, history: [...previous.history, ...data.history] }))
      setHistoryCursor(data.nextHistory)
    } catch (reason) {
      console.error("Unable to load more admin customer history", reason)
      setError(reason instanceof Error ? reason.message : "Nu s-a putut încărca mai mult din istoric.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearch(searchInput.trim())
  }

  const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"

  return (
    <section aria-labelledby="customer-loyalty-heading" className="space-y-5">
      <h1 id="customer-loyalty-heading" ref={headingRef} tabIndex={-1}
        className="font-serif text-2xl font-bold text-brand-green-800 focus-visible:outline-2 focus-visible:outline-brand-green-700">
        {detail ? `Istoric client: ${detail.customer.name}` : "Puncte și vouchere clienți"}
      </h1>
      <p className="text-sm leading-relaxed">
        Soldurile și emiterile de vouchere sunt afișate mai jos. Utilizarea se va înregistra automat după activarea checkoutului online.
      </p>
      <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="loyalty-customer-search" className="sr-only">Caută după numele sau e-mailul clientului</label>
        <input id="loyalty-customer-search" value={searchInput} maxLength={100}
          onChange={event => setSearchInput(event.target.value)}
          placeholder="Nume sau e-mail client"
          className={`min-h-11 min-w-0 flex-1 rounded-xl border border-brand-green-700/30 bg-white px-3 ${focusClass}`} />
        <button type="submit" className={`min-h-11 rounded-xl bg-brand-green-700 px-5 font-semibold text-white ${focusClass}`}>
          Caută
        </button>
        <label className="sr-only" htmlFor="loyalty-marketing-filter">Filtrează după acordul pentru marketing prin email</label>
        <select id="loyalty-marketing-filter" value={marketingFilter}
          onChange={event => {
            const value = event.target.value
            if (value === "all" || value === "granted" || value === "not-granted") setMarketingFilter(value)
          }}
          className={`min-h-11 rounded-xl border border-brand-green-700/30 bg-white px-3 ${focusClass}`}>
          <option value="all">Toți clienții</option>
          <option value="granted">Abonați email</option>
          <option value="not-granted">Fără acord email</option>
        </select>
      </form>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {isLoading && <p role="status">Se încarcă clienții…</p>}
      {!isLoading && customers.length === 0 && <p>Nu există clienți care să corespundă căutării.</p>}
      {customers.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-brand-green-700/15 bg-brand-cream-50">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-brand-cream-200/60">
              <tr>
                <th scope="col" className="p-3">Client</th>
                <th scope="col" className="p-3">Puncte</th>
                <th scope="col" className="p-3">Vouchere active</th>
                <th scope="col" className="p-3">Utilizate</th>
                <th scope="col" className="p-3">Expirate</th>
                <th scope="col" className="p-3">Marketing email</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id} className="border-t border-brand-green-700/10">
                  <td className="p-3">
                    <button type="button" aria-current={selectedId === customer.id ? "true" : undefined}
                      onClick={() => setSelectedId(customer.id)}
                      className={`text-left font-semibold text-brand-green-800 underline underline-offset-2 ${focusClass}`}>
                      {customer.name}
                    </button>
                    <span className="block text-xs text-brand-dark/70">{customer.email ?? "E-mail indisponibil"}</span>
                  </td>
                  <td className="p-3 font-semibold">{customer.points}</td>
                  <td className="p-3">{customer.activeVouchers}</td>
                  <td className="p-3">{customer.usedVouchers}</td>
                  <td className="p-3">{customer.expiredVouchers}</td>
                  <td className="p-3">{customer.emailMarketingConsent ? "Acordat" : "Neacordat"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {next && !isLoading && (
        <button type="button" disabled={isLoadingMore} onClick={() => void loadMoreCustomers()}
          className={`min-h-11 rounded-xl border border-brand-green-700/30 px-4 font-semibold disabled:opacity-50 ${focusClass}`}>
          {isLoadingMore ? "Se încarcă…" : "Mai mulți clienți"}
        </button>
      )}
      {selectedId && !detail && !error && <p role="status">Se încarcă istoricul clientului…</p>}
      {detail && (
        <div className="space-y-5 rounded-2xl border border-brand-green-700/15 bg-brand-cream-50 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <p><span className="font-semibold">E-mail:</span> {detail.customer.email ?? "Indisponibil"}</p>
            <p><span className="font-semibold">Client din:</span> {formatDate(detail.customer.createdAt)}</p>
            <p><span className="font-semibold">Puncte disponibile:</span> {detail.customer.points}</p>
            <p><span className="font-semibold">Marketing email:</span> {detail.customer.emailMarketingConsent ? "Acordat" : "Neacordat"}
              {detail.customer.emailMarketingConsentUpdatedAt !== null
                && <span className="block text-xs text-brand-dark/70">Actualizat: {formatDate(detail.customer.emailMarketingConsentUpdatedAt, true)}</span>}
            </p>
          </div>
          <section aria-labelledby="marketing-consent-history-heading" className="space-y-3">
            <h2 id="marketing-consent-history-heading" className="text-lg font-bold text-brand-green-800">Istoric acord marketing</h2>
            {detail.marketingConsentHistory.length === 0 ? <p className="text-sm">Clientul nu a acordat sau retras un acord de marketing.</p> : (
              <ul className="space-y-2">
                {detail.marketingConsentHistory.map(event => (
                  <li key={event.id} className="rounded-xl border border-brand-green-700/10 p-3 text-sm">
                    <span className="font-semibold">{event.action === "granted" ? "Acordat" : "Retras"}</span>
                    {" · "}{event.source === "login" ? "Autentificare" : "Cont"}
                    {" · "}{formatDate(event.createdAt, true)}
                    <span className="block text-xs text-brand-dark/70">Informare: {event.noticeVersion}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="loyalty-vouchers-heading" className="space-y-3">
            <h2 id="loyalty-vouchers-heading" className="text-lg font-bold text-brand-green-800">Vouchere emise</h2>
            {detail.vouchers.length === 0 ? <p className="text-sm">Nu au fost emise vouchere.</p> : (
              <ul className="space-y-2">
                {detail.vouchers.map(voucher => (
                  <li key={voucher.id} className="rounded-xl border border-brand-green-700/10 p-3 text-sm">
                    <p className="font-semibold">
                      {voucher.source === "welcome" ? "Bun venit" : "Generat din puncte"} · {voucher.discountPercent}% ·{" "}
                      {voucher.status === "used" ? "Utilizat" : voucher.status === "expired" ? "Expirat" : "Activ"}
                    </p>
                    <p className="mt-1 break-all font-mono">{voucher.code}</p>
                    <p className="mt-1 text-xs">Emis: {formatDate(voucher.createdAt)} · Expiră: {formatDate(voucher.expiresAt)}</p>
                    {voucher.usedAt !== null && <p className="mt-1 text-xs">Utilizat: {formatDate(voucher.usedAt, true)} · Comanda {voucher.usedOrderId}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="loyalty-history-heading" className="space-y-3">
            <h2 id="loyalty-history-heading" className="text-lg font-bold text-brand-green-800">Istoric puncte</h2>
            {detail.history.length === 0 ? <p className="text-sm">Nu există încă operațiuni cu puncte.</p> : (
              <ul className="divide-y divide-brand-green-700/10">
                {detail.history.map(entry => (
                  <li key={`${entry.kind}-${entry.id}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                    <span>
                      {entry.kind === "purchase" ? "Achiziție" : entry.kind === "referral" ? "Recomandare" : "Voucher generat"}
                      {entry.reference && <span className="block break-all text-xs text-brand-dark/70">{entry.reference}</span>}
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold">{entry.pointsDelta > 0 ? "+" : ""}{entry.pointsDelta} puncte</span>
                      <span className="text-xs text-brand-dark/70">{formatDate(entry.createdAt, true)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {historyCursor && <button type="button" disabled={isLoadingMore} onClick={() => void loadMoreHistory()}
              className={`min-h-11 rounded-xl border border-brand-green-700/30 px-4 font-semibold disabled:opacity-50 ${focusClass}`}>
              {isLoadingMore ? "Se încarcă…" : "Mai mult din istoric"}
            </button>}
          </section>
        </div>
      )}
    </section>
  )
}
