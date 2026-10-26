import { useState } from "react"
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react"
import { X } from "lucide-react"
import { tagColors } from "../../features/menu/tags"
import ImageUploader from "./ImageUploader"
import { resolveMenuImage } from "../../features/menu/images"

export type AdminItem = {
  id: string
  category_id: string
  name: string
  name_en: string | null
  description: string
  description_en: string | null
  price: string
  image_key: string | null
  image_url: string | null
  tag: string | null
  calories: number | null
  protein: string | null
  carbs: string | null
  fat: string | null
  sort_order: number
  is_visible: number
  is_available: number
  stock_quantity: number | null
  show_stock: number
}

type FormData = {
  name: string; name_en: string; description: string; description_en: string
  price: string; tag: string; calories: string; protein: string; carbs: string
  fat: string; image_key: string; image_url: string; is_visible: boolean
  is_available: boolean; stock_quantity: string; show_stock: boolean
}

const EMPTY: FormData = {
  name: "", name_en: "", description: "", description_en: "",
  price: "", tag: "", calories: "", protein: "", carbs: "",
  fat: "", image_key: "", image_url: "", is_visible: true,
  is_available: true, stock_quantity: "", show_stock: false,
}

function itemToForm(item: AdminItem): FormData {
  return {
    name: item.name, name_en: item.name_en ?? "", description: item.description,
    description_en: item.description_en ?? "", price: item.price,
    tag: item.tag ?? "", calories: item.calories?.toString() ?? "",
    protein: item.protein ?? "", carbs: item.carbs ?? "", fat: item.fat ?? "",
    image_key: item.image_key ?? "", image_url: item.image_url ?? "",
    is_visible: item.is_visible !== 0,
    is_available: item.is_available !== 0,
    stock_quantity: item.stock_quantity?.toString() ?? "",
    show_stock: item.show_stock === 1,
  }
}

interface Props {
  item: AdminItem | null
  categoryId: string
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export default function ItemForm({ item, categoryId, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormData>(() => item ? itemToForm(item) : EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const currentImageUrl = form.image_key
    ? `/api/images/${form.image_key}`
    : (form.image_url || undefined)

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.price.trim()) {
      setError("Denumire, descriere și preț sunt obligatorii")
      return
    }
    if (form.stock_quantity !== "" && (!/^\d+$/.test(form.stock_quantity)
      || Number(form.stock_quantity) > 1000000 || form.price.includes("/"))) {
      setError("Stocul trebuie să fie un număr întreg între 0 și 1.000.000. Pentru sticlă/pahar lasă stocul gol.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload = {
        category_id: categoryId,
        name: form.name.trim(),
        name_en: form.name_en.trim() || null,
        description: form.description.trim(),
        description_en: form.description_en.trim() || null,
        price: form.price.trim(),
        tag: form.tag || null,
        calories: form.calories ? Number(form.calories) : null,
        protein: form.protein || null,
        carbs: form.carbs || null,
        fat: form.fat || null,
        image_key: form.image_key || null,
        image_url: form.image_key ? null : (form.image_url || null),
        is_visible: form.is_visible,
        is_available: form.is_available,
        stock_quantity: form.stock_quantity === "" ? null : Number(form.stock_quantity),
        show_stock: form.show_stock,
        ...(item ? { expected_stock_quantity: item.stock_quantity } : {}),
      }
      const url  = item ? `/api/admin/items/${item.id}` : "/api/admin/items"
      const res  = await fetch(url, {
        method: item ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { error?: { message: string } }
      if (!res.ok) throw new Error(json.error?.message ?? "Eroare server")
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare necunoscută")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-brand-dark/50 backdrop-blur-sm" aria-hidden />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex w-full max-w-5xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl bg-brand-cream-50 shadow-2xl">
          <div className="flex shrink-0 items-center justify-between p-5 border-b border-brand-green-700/10">
            <DialogTitle className="font-bold text-brand-green-700 font-serif">
              {item ? "Editează produs" : "Produs nou"}
            </DialogTitle>
            <button type="button" onClick={onClose} aria-label="Închide editarea produsului" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-cream-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto p-5">
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="min-w-0">
            <ImageUploader
              currentUrl={currentImageUrl}
              fallbackUrl={item ? resolveMenuImage({ name: item.name }).image : undefined}
              onUploaded={(key) => setForm((f) => ({ ...f, image_key: key, image_url: "" }))}
              onClear={() => setForm((f) => ({ ...f, image_key: "", image_url: "" }))}
            />
            </div>

            <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Field label="Denumire RO *">
                <input className={input} value={form.name} onChange={set("name")} placeholder="ex: Omletă Franțuzească" />
              </Field>
              <Field label="Denumire EN (opțional)">
                <input className={input} value={form.name_en} onChange={set("name_en")} placeholder="ex: French Omelette" />
              </Field>
              <Field label="Descriere RO *">
                <textarea className={`${input} resize-none`} rows={3} value={form.description} onChange={set("description")} />
              </Field>
              <Field label="Descriere EN (opțional)">
                <textarea className={`${input} resize-none`} rows={2} value={form.description_en} onChange={set("description_en")} />
              </Field>
              <Field label="Preț *">
                <input className={input} value={form.price} onChange={set("price")} placeholder="ex: 33 lei" />
              </Field>
              <Field label="Tag">
                <select className={input} value={form.tag} onChange={set("tag")}>
                  <option value="">— fără tag —</option>
                  {Object.keys(tagColors).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>

            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold text-brand-green-700/70 uppercase tracking-wider select-none group-open:mb-3">
                Macronutrienți (opțional)
              </summary>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Calorii (kcal)">
                  <input className={input} type="number" value={form.calories} onChange={set("calories")} placeholder="ex: 325" />
                </Field>
                <Field label="Proteine">
                  <input className={input} value={form.protein} onChange={set("protein")} placeholder="ex: 18g" />
                </Field>
                <Field label="Carbohidrați">
                  <input className={input} value={form.carbs} onChange={set("carbs")} placeholder="ex: 27g" />
                </Field>
                <Field label="Grăsimi">
                  <input className={input} value={form.fat} onChange={set("fat")} placeholder="ex: 16g" />
                </Field>
              </div>
            </details>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={(e) => setForm((f) => ({ ...f, is_visible: e.target.checked }))}
                className="w-4 h-4 accent-brand-green-700"
              />
              <span className="text-sm text-brand-dark/80">Vizibil în meniu</span>
            </label>

            <fieldset className="space-y-3 rounded-xl border border-brand-green-700/20 p-4">
              <legend className="px-2 font-semibold text-brand-green-800">Disponibilitate și stoc</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_available}
                  onChange={event => setForm(previous => ({ ...previous, is_available: event.target.checked }))} />
                Disponibil pentru comandă
              </label>
              <Field label="Stoc numeric (gol = fără urmărire)">
                <input type="number" min="0" max="1000000" step="1" className={input}
                  disabled={form.price.includes("/")} value={form.stock_quantity} onChange={set("stock_quantity")} />
              </Field>
              {form.price.includes("/") && <p className="text-xs">Sticlă/pahar: doar disponibilitate comună. Golește stocul numeric înainte de a salva un preț dublu.</p>}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.show_stock} disabled={form.stock_quantity === ""}
                  onChange={event => setForm(previous => ({ ...previous, show_stock: event.target.checked }))} />
                Afișează clientului cantitatea din stoc
              </label>
              <p className="text-xs">La stoc 0 sau dacă debifezi disponibilitatea, produsul rămâne vizibil, dar nu poate fi comandat. „Vizibil în meniu” controlează separat ascunderea produsului.</p>
            </fieldset>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-3 border-t border-brand-green-700/10 bg-brand-cream-50 p-4 sm:justify-end">
            <button type="button" onClick={onClose} className={`flex-1 ${btnSecondary}`}>Anulează</button>
            <button type="button" onClick={handleSave} disabled={saving} className={`flex-1 ${btnPrimary}`}>
              {saving ? "Se salvează…" : "Salvează"}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-brand-dark/60 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}

const input = "w-full px-3 py-2 rounded-lg border border-brand-green-700/20 bg-white text-sm text-brand-dark focus:outline-none focus:border-brand-green-700/60 transition-colors"
const btnPrimary = "py-2.5 rounded-xl bg-brand-green-700 text-brand-cream-50 text-sm font-bold hover:bg-brand-green-800 transition-colors disabled:opacity-50"
const btnSecondary = "py-2.5 rounded-xl border border-brand-green-700/20 text-brand-dark/70 text-sm font-medium hover:bg-brand-cream-200 transition-colors"
