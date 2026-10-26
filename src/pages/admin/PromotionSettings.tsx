import { useEffect, useState } from "react"
import { isPromotionSettings, type PromotionSettings as Settings } from "../../features/pricing/discount"
import { PromotionRow } from "./PromotionRow"

/** Configures independent discounts for the actual menu categories and Performance. */
export function PromotionSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch("/api/admin/promotion", { cache: "no-store", signal: controller.signal })
        if (!response.ok) throw new Error(response.status === 401
          ? "Acces neautorizat – verifică Cloudflare Access."
          : "Reducerile nu au putut fi încărcate. Verifică migrarea bazei de date și reîncearcă.")
        const json: unknown = await response.json()
        if (!json || typeof json !== "object" || !("data" in json) || !isPromotionSettings(json.data)) {
          throw new Error("Răspuns invalid pentru reduceri.")
        }
        if (!controller.signal.aborted) {
          setSettings(json.data)
          setError("")
        }
      } catch (reason) {
        if (controller.signal.aborted) return
        console.error("Admin category promotions loading failed", reason)
        setError(reason instanceof Error ? reason.message : "Reducerile nu au putut fi încărcate.")
      }
    }
    void load()
    return () => controller.abort()
  }, [reload])

  function updateCategory(id: string, percent: number) {
    setSettings(previous => previous && ({
      ...previous, categories: previous.categories.map(category =>
        category.id === id ? { ...category, discountPercent: percent } : category),
    }))
  }

  return (
    <section aria-labelledby="promotion-title" className="space-y-5 rounded-3xl border border-brand-green-700/20 bg-brand-cream-50 p-4 sm:p-6">
      <h1 id="promotion-title" className="font-serif text-2xl font-bold text-brand-green-800">Reduceri pe categorii</h1>
      <p className="text-sm leading-relaxed">
        Fiecare categorie din meniu are propriul procent, inclusiv deserturile și băuturile.
        0% dezactivează reducerea. Procentele nu se cumulează și nu modifică prețurile de bază.
        Performance are o setare separată, aplicată o singură dată la totalul farfuriei.
      </p>
      {!settings && !error && <p role="status">Se încarcă setările…</p>}
      {error && <div className="space-y-2">
        <p role="alert" className="text-sm text-red-800">{error}</p>
        <button type="button" onClick={() => { setError(""); setReload(value => value + 1) }}
          className="min-h-11 underline focus-visible:outline-2 focus-visible:outline-brand-green-700">Reîncarcă setările</button>
      </div>}
      {settings && <div key={reload} className="space-y-6">
        {(["food", "drinks"] as const).map(group => (
          <fieldset key={group} className="min-w-0 space-y-3">
            <legend className="mb-3 text-lg font-bold text-brand-green-800">{group === "food" ? "Mâncare" : "Băuturi"}</legend>
            {settings.categories.filter(category => category.groupId === group).map(category => (
              <PromotionRow key={category.id} label={category.label} savedPercent={category.discountPercent}
                categoryId={category.id} onSaved={percent => updateCategory(category.id, percent)} />
            ))}
          </fieldset>
        ))}
        <PromotionRow label="Meniu Performance" savedPercent={settings.performanceDiscountPercent}
          onSaved={percent => setSettings(previous => previous && ({ ...previous, performanceDiscountPercent: percent }))} />
      </div>}
      <p className="text-xs leading-relaxed">Salvează separat fiecare categorie. Reducerile se văd în meniu, configurator și coș după reîncărcarea paginii publice. Totalul comenzilor TEST se verifică pe server.</p>
    </section>
  )
}
