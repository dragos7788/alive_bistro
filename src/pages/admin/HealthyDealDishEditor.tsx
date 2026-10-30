import { useId, useState } from "react"
import type { DealDish, DealMacros } from "../../features/healthy-deal/schedule"
import { dealImage } from "../../features/healthy-deal/assets"

const fieldClass = "mt-1 w-full rounded-xl border border-brand-green-700/25 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand-green-700"
const macroLabels: Record<keyof DealMacros, string> = { calories: "Energie (kcal)", protein: "Proteine (g)", carbs: "Glucide (g)", fat: "Grăsimi (g)" }

/** Edits authored dish details and uploads photos through the existing R2 endpoint. */
export function HealthyDealDishEditor({ title, dish, required, onChange, onBusy }: {
  title: string
  dish: DealDish
  required: boolean
  onChange: (dish: DealDish) => void
  onBusy: (busy: boolean) => void
}) {
  const id = useId()
  const [uploadError, setUploadError] = useState("")
  const image = dealImage(dish.image)
  const upload = async (file: File) => {
    setUploadError("")
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setUploadError("Alege o imagine JPEG, PNG sau WebP de maximum 2 MB.")
      return
    }
    onBusy(true)
    try {
      const response = await fetch("/api/admin/upload", { method: "POST", headers: { "Content-Type": file.type }, body: file })
      const json = await response.json() as { data?: { url: string }; error?: { message: string } }
      if (!response.ok || !json.data) throw new Error(json.error?.message ?? "Imaginea nu a putut fi încărcată.")
      onChange({ ...dish, image: json.data.url })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Încărcarea imaginii a eșuat.")
    } finally { onBusy(false) }
  }
  return (
    <fieldset className="min-w-0 space-y-3 rounded-2xl border border-brand-green-700/15 bg-white/70 p-4">
      <legend className="px-2 font-bold">{title}</legend>
      <label className="block text-sm">Denumire
        <input className={fieldClass} value={dish.name} maxLength={200} required={required}
          onChange={event => onChange({ ...dish, name: event.target.value })} />
      </label>
      <label className="block text-sm">Gramaj (g)
        <input className={fieldClass} type="number" min={0} max={10000} step="0.1" value={dish.grams ?? ""}
          onChange={event => onChange({ ...dish, grams: event.target.value === "" ? null : Number(event.target.value) })} />
      </label>
      <label className="block text-sm">Descriere / ingrediente
        <textarea className={fieldClass} rows={3} maxLength={3000} value={dish.description}
          onChange={event => onChange({ ...dish, description: event.target.value })} />
      </label>
      <label className="block text-sm">Alergeni
        <textarea className={fieldClass} rows={2} maxLength={1000} value={dish.allergens}
          onChange={event => onChange({ ...dish, allergens: event.target.value })} />
      </label>
      <label className="block text-sm">Fotografie
        <select className={fieldClass} value={dish.image.startsWith("/api/images/") ? "uploaded" : dish.image}
          onChange={event => onChange({ ...dish, image: event.target.value })}>
          <option value="">Fără fotografie</option>
          <option value="default-soup">Supa din afiș</option>
          <option value="default-main">Felul principal din afiș (imagine ilustrativă)</option>
          {dish.image.startsWith("/api/images/") && <option value="uploaded">Fotografia încărcată</option>}
        </select>
      </label>
      {image && <img src={image} alt={`Previzualizare: ${dish.name || title}`} className="h-32 w-full rounded-xl bg-white object-contain" />}
      <label htmlFor={`${id}-photo`} className="block text-sm">Încarcă fotografie nouă (max. 2 MB)</label>
      <input id={`${id}-photo`} type="file" accept="image/jpeg,image/png,image/webp" className="w-full text-xs"
        onChange={event => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
          event.target.value = ""
        }} />
      {uploadError && <p role="alert" className="text-sm text-red-800">{uploadError}</p>}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={dish.macros !== null}
          onChange={event => onChange({ ...dish, macros: event.target.checked ? { calories: 0, protein: 0, carbs: 0, fat: 0 } : null })} />
        Completează valori nutriționale pentru întreaga porție
      </label>
      {dish.macros !== null && <div className="grid grid-cols-2 gap-3">
        {(["calories", "protein", "carbs", "fat"] as const).map(key => (
          <label key={key} className="text-xs">{macroLabels[key]}
            <input className={fieldClass} type="number" required min={0} max={key === "calories" ? 20000 : 2000}
              step="0.1" value={dish.macros![key]}
              onChange={event => onChange({ ...dish, macros: { ...dish.macros!, [key]: Number(event.target.value) } })} />
          </label>
        ))}
      </div>}
      <p className="text-xs leading-relaxed text-brand-dark/70">Completează valorile reale per porție, nu per 100 g. Câmpurile lipsă sunt afișate ca necompletate, nu estimate.</p>
    </fieldset>
  )
}
