import { useEffect, useState } from "react"
import { parseCommerceResponse, type CommerceSettings as Settings } from "../../features/commerce/api"

/** Lets administrators pause or resume sales globally without hiding the menu. */
export function CommerceSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [reload, setReload] = useState(0)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch("/api/admin/commerce", {
          cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
        })
        const data = await parseCommerceResponse(response)
        if (!controller.signal.aborted) {
          setSettings(data)
          setError("")
        }
      } catch (reason) {
        if (controller.signal.aborted) return
        console.error("Admin commerce settings loading failed", reason)
        setError(reason instanceof Error ? reason.message : "Setările nu au putut fi încărcate.")
      }
    }
    void load()
    return () => controller.abort()
  }, [reload])

  async function handleToggle() {
    if (!settings || isSaving) return
    setIsSaving(true)
    setMessage("")
    setError("")
    try {
      const response = await fetch("/api/admin/commerce", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ salesEnabled: !settings.salesEnabled }),
      })
      const saved = await parseCommerceResponse(response)
      setSettings(saved)
      setMessage(saved.salesEnabled ? "Comercializarea a fost activată." : "Comercializarea a fost oprită.")
    } catch (reason) {
      console.error("Admin commerce settings saving failed", reason)
      setSettings(null)
      setError(reason instanceof Error ? reason.message : "Salvarea nu a fost confirmată. Reîncarcă setările.")
    } finally { setIsSaving(false) }
  }

  return (
    <section aria-labelledby="commerce-title" className="space-y-3 rounded-3xl border border-brand-green-700/20 bg-brand-cream-50 p-4 sm:p-6">
      <h2 id="commerce-title" className="font-serif text-xl font-bold text-brand-green-800">Comercializare produse</h2>
      <p id="commerce-description" className="text-sm leading-relaxed">
        Controlează vânzarea în întreaga aplicație. Când este oprită, coșul și toate butoanele de adăugare în coș
        sunt ascunse, inclusiv în Performance. Meniul și prețurile rămân vizibile. Comenzile existente nu sunt afectate.
        Paginile deja deschise verifică automat setarea la fiecare 15 secunde și la revenirea în pagină.
      </p>
      {!settings && !error && <p role="status">Se încarcă starea comercializării…</p>}
      {settings && <>
        <p className="text-sm font-bold">{settings.salesEnabled ? "Stare: activată" : "Stare: oprită"}</p>
        <button type="button" role="switch" aria-checked={settings.salesEnabled}
          aria-label="Comercializare produse" aria-describedby="commerce-description"
          disabled={isSaving} onClick={() => void handleToggle()}
          className="min-h-11 rounded-full bg-brand-green-700 px-5 py-3 text-sm font-bold text-white hover:bg-brand-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 disabled:opacity-50">
          {isSaving ? "Se salvează…" : settings.salesEnabled ? "Oprește comercializarea" : "Activează comercializarea"}
        </button>
      </>}
      {error && <div>
        <p role="alert" className="text-sm text-red-800">{error}</p>
        <button type="button" onClick={() => { setError(""); setMessage(""); setReload(value => value + 1) }}
          className="min-h-11 text-sm underline focus-visible:outline-2 focus-visible:outline-brand-green-700">Reîncarcă setările</button>
      </div>}
      <p role="status" className="text-sm text-brand-green-800">{message}</p>
    </section>
  )
}
