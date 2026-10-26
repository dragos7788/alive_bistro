import { useId, useState, type FormEvent } from "react"
import { isDiscountPercent } from "../../features/pricing/discount"

/** Edits one promotion without overwriting unsaved settings in other categories. */
export function PromotionRow({ label, categoryId, savedPercent, onSaved }: {
  label: string
  categoryId?: string
  savedPercent: number
  onSaved: (percent: number) => void
}) {
  const inputId = useId()
  const [draft, setDraft] = useState(String(savedPercent))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  async function save(percent: number) {
    setIsSaving(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/admin/promotion", {
        method: "PUT", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryId
          ? { categoryId, discountPercent: percent } : { performanceDiscountPercent: percent }),
      })
      const json: unknown = await response.json()
      if (!response.ok) {
        throw new Error(response.status === 401 ? "Acces neautorizat – verifică Cloudflare Access."
          : response.status === 404 ? "Categoria nu mai există. Reîncarcă pagina."
          : "Reducerea nu a putut fi salvată. Reîncearcă.")
      }
      if (!json || typeof json !== "object" || !("data" in json)
        || !json.data || typeof json.data !== "object" || !("discountPercent" in json.data)
        || !isDiscountPercent(json.data.discountPercent) || json.data.discountPercent !== percent) {
        throw new Error("Răspuns invalid pentru reducere.")
      }
      onSaved(percent)
      setDraft(String(percent))
      setNotice(percent === 0 ? `${label}: reducerea a fost dezactivată.` : `${label}: reducerea de ${percent}% a fost salvată.`)
    } catch (reason) {
      console.error("Admin category promotion saving failed", reason)
      setError(reason instanceof Error ? reason.message : "Reducerea nu a putut fi salvată.")
    } finally { setIsSaving(false) }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const percent = Number(draft)
    if (draft.trim() === "" || !isDiscountPercent(percent)) {
      setError("Introdu un procent întreg între 0 și 99.")
      return
    }
    void save(percent)
  }

  return (
    <form onSubmit={handleSubmit} aria-label={`Reducere ${label}`}
      className="space-y-2 rounded-xl border border-brand-green-700/20 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-44">
          <label htmlFor={inputId} className="block font-semibold">{label} — reducere (%)</label>
          <p className="mt-1 text-xs">{savedPercent ? `Activă: ${savedPercent}%` : "Fără reducere"}</p>
          <input id={inputId} type="number" required min="0" max="99" step="1" value={draft}
            disabled={isSaving} onChange={event => setDraft(event.target.value)}
            className="mt-2 min-h-11 w-24 rounded-xl border border-brand-green-700/40 bg-white px-3 focus-visible:outline-2 focus-visible:outline-brand-green-700" />
        </div>
        <button type="submit" disabled={isSaving}
          className="min-h-11 rounded-xl bg-brand-green-700 px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 disabled:opacity-50">
          {isSaving ? "Se salvează…" : "Salvează"}
        </button>
        <button type="button" disabled={savedPercent === 0 || isSaving} onClick={() => void save(0)}
          className="min-h-11 rounded-xl border border-brand-green-700/40 px-4 font-semibold focus-visible:outline-2 focus-visible:outline-brand-green-700 disabled:opacity-50">
          Dezactivează
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <p role="status" className="text-sm text-brand-green-800">{notice}</p>
    </form>
  )
}
