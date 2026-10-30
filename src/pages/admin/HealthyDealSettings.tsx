import { useEffect, useState } from "react"
import {
  dealDays, emptyDealDish, isDealDate, parseHealthyDealSettings,
  type DealEntry, type HealthyDealDocument, type HealthyDealSettings as Settings,
} from "../../features/healthy-deal/schedule"
import { HealthyDealDishEditor } from "./HealthyDealDishEditor"
import { HealthyDealMenu } from "../../features/healthy-deal/HealthyDealMenu"

const field = "mt-1 w-full rounded-xl border border-brand-green-700/25 bg-white px-3 py-2 text-sm"
const dayLabels: Record<string, string> = { "1": "Luni", "2": "Marți", "3": "Miercuri", "4": "Joi", "5": "Vineri", "6": "Sâmbătă", "0": "Duminică" }
const blankEntry = (): DealEntry => ({ enabled: false, soup: emptyDealDish(), main: emptyDealDish() })

/** Manages the recurring schedule, explicit date closures and menu composition. */
export function HealthyDealSettings({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const [document, setDocument] = useState<HealthyDealDocument | null>(null)
  const [mode, setMode] = useState<"weekly" | "overrides">("weekly")
  const [selected, setSelected] = useState("1")
  const [date, setDate] = useState("")
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setError("")
      try {
        const response = await fetch("/api/admin/healthy-deal", { signal: controller.signal, cache: "no-store" })
        const json = await response.json() as { data?: HealthyDealDocument; error?: { message: string } }
        if (!response.ok || !json.data) throw new Error(json.error?.message ?? "Programul nu a putut fi încărcat.")
        const settings = parseHealthyDealSettings(json.data.settings)
        if (!controller.signal.aborted) {
          setDocument({ revision: json.data.revision, settings })
          setDirty(false)
          onDirtyChange(false)
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Încărcarea a eșuat.")
      }
    }
    void load()
    return () => controller.abort()
  }, [reload, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [dirty])
  const change = (update: (settings: Settings) => Settings) => {
    setDocument(previous => previous ? { ...previous, settings: update(previous.settings) } : previous)
    setDirty(true)
    onDirtyChange(true)
    setMessage("")
  }
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!document) return
    setSaving(true); setError(""); setMessage("")
    try {
      const settings = parseHealthyDealSettings(document.settings)
      const response = await fetch("/api/admin/healthy-deal", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...document, settings }),
      })
      const json = await response.json() as { data?: HealthyDealDocument; error?: { message: string } }
      if (!response.ok || !json.data) throw new Error(json.error?.message ?? "Salvarea nu a fost confirmată.")
      setDocument(json.data); setDirty(false); setMessage("Healthy Deal a fost salvat.")
      onDirtyChange(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Salvarea a eșuat.")
    } finally { setSaving(false) }
  }
  if (!document) return <section className="space-y-3">
    <h1 className="font-serif text-2xl font-bold">Healthy Deal</h1>
    {error ? <><p role="alert" className="text-red-800">{error}</p><button type="button" onClick={() => setReload(value => value + 1)}>Reîncearcă</button></>
      : <p role="status">Se încarcă programul…</p>}
  </section>
  const settings = document.settings
  const currentEntry = settings[mode][selected] ?? blankEntry()
  const updateEntry = (entry: DealEntry) => change(settings => ({
    ...settings, [mode]: { ...settings[mode], [selected]: entry },
  }))
  const addOverride = () => {
    if (!isDealDate(date)) { setError("Alege o dată calendaristică validă."); return }
    const weekday = String(new Date(`${date}T12:00:00Z`).getUTCDay())
    if (!settings.overrides[date]) change(settings => ({
      ...settings, overrides: { ...settings.overrides, [date]: structuredClone(settings.weekly[weekday] ?? blankEntry()) },
    }))
    setMode("overrides"); setSelected(date); setError("")
  }
  const hasSelection = mode === "weekly" || !!settings.overrides[selected]
  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-bold">Healthy Deal</h1>
        <p className="mt-2 text-sm leading-relaxed">Programul săptămânal se repetă. O excepție pe dată are prioritate, inclusiv când este dezactivată. Ora folosită: România (Europe/Bucharest).</p>
      </div>
      <form onSubmit={save} className="space-y-5">
        <fieldset disabled={saving || busy} className="space-y-5 disabled:opacity-70">
          <legend className="sr-only">Setări Healthy Deal</legend>
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={settings.enabled}
            onChange={event => change(settings => ({ ...settings, enabled: event.target.checked }))} />Publică Healthy Deal</label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">Preț meniu complet (lei)
              <input className={field} type="number" min="0.01" max="1000" step="0.01" required value={settings.priceBani / 100}
                onChange={event => change(settings => ({ ...settings, priceBani: Math.round(Number(event.target.value) * 100) }))} />
            </label>
            <label className="text-sm">Disponibil de la<input className={field} type="time" required value={settings.startTime}
              onChange={event => change(settings => ({ ...settings, startTime: event.target.value }))} /></label>
            <label className="text-sm">Până la (exclusiv)<input className={field} type="time" required value={settings.endTime}
              onChange={event => change(settings => ({ ...settings, endTime: event.target.value }))} /></label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={mode === "weekly"} className="rounded-full border px-4 py-2 text-sm font-bold"
              onClick={() => { setMode("weekly"); setSelected("1") }}>Program săptămânal</button>
            <button type="button" aria-pressed={mode === "overrides"} className="rounded-full border px-4 py-2 text-sm font-bold"
              onClick={() => { setMode("overrides"); setSelected(Object.keys(settings.overrides).sort()[0] ?? "") }}>Excepții pe dată</button>
          </div>
          {mode === "weekly" ? <label className="block text-sm">Ziua de editat
            <select className={field} value={selected} onChange={event => setSelected(event.target.value)}>
              {dealDays.map(day => <option key={day} value={day}>{dayLabels[day]}</option>)}
            </select>
          </label> : <div className="space-y-3 rounded-2xl border p-4">
            <label className="block text-sm">Dată nouă<input className={field} type="date" min="2000-01-01" max="2100-12-31" value={date} onChange={event => setDate(event.target.value)} /></label>
            <button type="button" onClick={addOverride} className="rounded-full border px-4 py-2 text-sm font-bold">Adaugă / deschide excepția</button>
            <label className="block text-sm">Excepții existente
              <select className={field} value={selected} onChange={event => setSelected(event.target.value)}>
                <option value="">Alege o dată</option>
                {Object.keys(settings.overrides).sort().map(key => <option key={key} value={key}>{key}</option>)}
              </select>
            </label>
            {hasSelection && <button type="button" className="text-sm font-bold text-red-800" onClick={() => {
              if (!confirm("Ștergi excepția? Ziua va folosi din nou programul săptămânal după salvare.")) return
              change(settings => {
                const overrides = { ...settings.overrides }
                delete overrides[selected]
                return { ...settings, overrides }
              })
              setSelected("")
            }}>Șterge excepția (revine programul săptămânal)</button>}
          </div>}
          {hasSelection && <div className="space-y-4">
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={currentEntry.enabled}
              onChange={event => updateEntry({ ...currentEntry, enabled: event.target.checked })} />Ofertă activă în această zi</label>
            <p className="text-xs">Dezactivează oferta pentru o zi fără Healthy Deal. Fotografia cu somon din afiș este ilustrativă; încarcă fotografia preparatului real.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <HealthyDealDishEditor key={`${mode}-${selected}-soup`} title="Supă" dish={currentEntry.soup} required={currentEntry.enabled}
                onChange={soup => updateEntry({ ...currentEntry, soup })} onBusy={setBusy} />
              <HealthyDealDishEditor key={`${mode}-${selected}-main`} title="Fel principal" dish={currentEntry.main} required={currentEntry.enabled}
                onChange={main => updateEntry({ ...currentEntry, main })} onBusy={setBusy} />
            </div>
          </div>}
        </fieldset>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <p role="status" className="text-sm">{busy ? "Se încarcă fotografia…" : message || (dirty ? "Ai modificări nesalvate." : "")}</p>
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={!dirty || saving || busy}
            className="rounded-full bg-brand-green-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Se salvează…" : "Salvează toate modificările"}</button>
          <button type="button" disabled={saving || busy} className="text-sm underline" onClick={() => {
            if (dirty && !confirm("Renunți la modificările nesalvate?")) return
            setReload(value => value + 1)
          }}>Reîncarcă din server</button>
        </div>
      </form>
      <details className="rounded-2xl border p-4">
        <summary className="cursor-pointer font-bold">Previzualizează oferta de azi</summary>
        <div className="mt-4"><HealthyDealMenu document={document} now={new Date()} error={false} isSalesEnabled={false} items={[]} onAdd={() => {}} /></div>
      </details>
    </section>
  )
}
