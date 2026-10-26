import { useEffect, useState, type FormEvent } from "react"
import { isDiscountPercent } from "../../features/pricing/discount"

async function promotionRequest(method: "GET" | "PUT", percent?: number, signal?: AbortSignal): Promise<number> {
  const response = await fetch("/api/admin/promotion", {
    method, cache: "no-store", signal,
    ...(method === "PUT" ? {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodDiscountPercent: percent }),
    } : {}),
  })
  if (!response.ok) throw new Error(response.status === 401
    ? "Acces neautorizat – verifică Cloudflare Access."
    : "Reducerea nu a putut fi încărcată sau salvată. Verifică migrarea bazei de date și reîncearcă.")
  const json: unknown = await response.json()
  if (!json || typeof json !== "object" || !("data" in json)
    || !json.data || typeof json.data !== "object" || !("foodDiscountPercent" in json.data)
    || !isDiscountPercent(json.data.foodDiscountPercent)) throw new Error("Răspuns invalid pentru reducere.")
  return json.data.foodDiscountPercent
}

/** Allows an administrator to enable, change or disable the food-only promotion. */
export function PromotionSettings() {
  const [savedPercent, setSavedPercent] = useState<number | null>(null)
  const [draft, setDraft] = useState("10")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void promotionRequest("GET", undefined, controller.signal).then(percent => {
      if (controller.signal.aborted) return
      setSavedPercent(percent)
      setDraft(String(percent || 10))
      setError("")
    }).catch(reason => {
      if (controller.signal.aborted) return
      console.error("Admin food promotion loading failed", reason)
      setError(reason instanceof Error ? reason.message : "Reducerea nu a putut fi încărcată.")
    })
    return () => controller.abort()
  }, [reload])

  async function save(percent: number) {
    setIsSaving(true)
    setError("")
    setNotice("")
    try {
      const confirmed = await promotionRequest("PUT", percent)
      setSavedPercent(confirmed)
      setNotice(confirmed === 0 ? "Reducerea a fost dezactivată." : `Reducerea de ${confirmed}% a fost salvată.`)
    } catch (reason) {
      console.error("Admin food promotion saving failed", reason)
      setError(reason instanceof Error ? reason.message : "Reducerea nu a putut fi salvată.")
    } finally { setIsSaving(false) }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const percent = Number(draft)
    if (!isDiscountPercent(percent) || percent === 0) {
      setError("Introdu un procent întreg între 1 și 99.")
      return
    }
    void save(percent)
  }

  return (
    <section aria-labelledby="promotion-title" className="space-y-5 rounded-3xl border border-brand-green-700/20 bg-brand-cream-50 p-6">
      <h1 id="promotion-title" className="font-serif text-2xl font-bold text-brand-green-800">Reducere la mâncare</h1>
      <p className="text-sm leading-relaxed">
        Se aplică tuturor clienților, la preparatele din grupa Mâncare și meniurile Performance.
        Deserturile (Sweet, No Regrets) și toate băuturile sunt excluse.
        Prețurile de bază ale produselor nu se modifică.
      </p>
      {savedPercent !== null && <p className="font-semibold">
        {savedPercent > 0 ? `Reducere activă: ${savedPercent}%` : "Reducerea este dezactivată."}
      </p>}
      {savedPercent === null && !error && <p role="status">Se încarcă setările…</p>}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="food-discount-percent" className="mb-2 block text-sm font-semibold">Reducere (%)</label>
          <input id="food-discount-percent" type="number" required min="1" max="99" step="1" value={draft}
            disabled={savedPercent === null || isSaving} onChange={event => setDraft(event.target.value)}
            className="min-h-11 w-32 rounded-xl border border-brand-green-700/40 bg-white px-3 focus-visible:outline-2 focus-visible:outline-brand-green-700" />
        </div>
        <button type="submit" disabled={savedPercent === null || isSaving}
          className="min-h-11 rounded-xl bg-brand-green-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 disabled:opacity-50">
          {isSaving ? "Se salvează…" : "Activează / salvează reducerea"}
        </button>
        <button type="button" disabled={!savedPercent || isSaving} onClick={() => void save(0)}
          className="min-h-11 rounded-xl border border-brand-green-700/40 px-5 font-semibold focus-visible:outline-2 focus-visible:outline-brand-green-700 disabled:opacity-50">
          Dezactivează
        </button>
      </form>
      {error && <div className="space-y-2">
        <p role="alert" className="text-sm text-red-800">{error}</p>
        <button type="button" disabled={isSaving} onClick={() => setReload(value => value + 1)}
          className="min-h-11 underline focus-visible:outline-2 focus-visible:outline-brand-green-700">Reîncarcă setările</button>
      </div>}
      <p role="status" className="text-sm text-brand-green-800">{notice}</p>
      <p className="text-xs leading-relaxed">Reducerea se vede în meniu, configurator și coș după reîncărcarea paginii publice. Totalul comenzilor TEST se verifică pe server.</p>
    </section>
  )
}
