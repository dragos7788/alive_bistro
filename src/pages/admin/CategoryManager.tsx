import { useState } from "react"
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus, Check, X } from "lucide-react"
import { resolveIcon } from "../../features/menu/icons"

export type AdminCategory = {
  id: string
  group_id: string
  label: string
  label_en: string | null
  icon_key: string
  sort_order: number
}

const ICON_KEYS = [
  "fork-knife", "egg", "leaf", "cookie", "lucide-coffee",
  "tea-bag", "drop", "carrot", "wine", "coffee",
]

interface Props {
  categories: AdminCategory[]
  groupId: string
  onRefresh: () => void
}

type EditState = { id: string; label: string; icon_key: string } | null
type NewState  = { id: string; label: string; icon_key: string } | null

export default function CategoryManager({ categories, groupId, onRefresh }: Props) {
  const [editing, setEditing]   = useState<EditState>(null)
  const [adding, setAdding]     = useState<NewState>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  const cats = categories.filter((c) => c.group_id === groupId)

  const call = async (url: string, method: string, body?: unknown) => {
    setLoading(true); setError("")
    try {
      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
      const json = await res.json() as { error?: { message: string } }
      if (!res.ok) throw new Error(json.error?.message ?? "Eroare server")
      onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare")
    } finally {
      setLoading(false)
    }
  }

  const move = async (id: string, dir: -1 | 1) => {
    const idx   = cats.findIndex((c) => c.id === id)
    const other = cats[idx + dir]
    if (!other) return
    const ids = cats.map((c) => c.id)
    ids[idx] = other.id; ids[idx + dir] = id
    await call("/api/admin/categories/reorder", "POST", { ids })
  }

  const save = async () => {
    if (!editing) return
    await call(`/api/admin/categories/${editing.id}`, "PUT", { label: editing.label, icon_key: editing.icon_key })
    setEditing(null)
  }

  const del = async (id: string) => {
    if (!confirm("Ștergi categoria și toate produsele din ea?")) return
    await call(`/api/admin/categories/${id}`, "DELETE")
  }

  const add = async () => {
    if (!adding || !adding.id.trim() || !adding.label.trim()) { setError("ID și etichetă sunt obligatorii"); return }
    await call("/api/admin/categories", "POST", { id: adding.id.trim(), group_id: groupId, label: adding.label.trim(), icon_key: adding.icon_key })
    setAdding(null)
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}

      {cats.map((cat, idx) => (
        <div key={cat.id} className="flex items-center gap-2 p-3 rounded-xl bg-brand-cream-200/60 border border-brand-green-700/10">
          {editing?.id === cat.id ? (
            <>
              <select
                value={editing.icon_key}
                onChange={(e) => setEditing((s) => s && { ...s, icon_key: e.target.value })}
                className="border border-brand-green-700/20 rounded px-2 py-1 text-sm bg-white"
              >
                {ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <input
                className="flex-1 border border-brand-green-700/20 rounded px-2 py-1 text-sm bg-white"
                value={editing.label}
                onChange={(e) => setEditing((s) => s && { ...s, label: e.target.value })}
              />
              <button type="button" onClick={save} disabled={loading} className={iconBtn}><Check className="w-4 h-4 text-brand-green-700" /></button>
              <button type="button" onClick={() => setEditing(null)} className={iconBtn}><X className="w-4 h-4" /></button>
            </>
          ) : (
            <>
              <span className="text-brand-green-700">{resolveIcon(cat.icon_key, 16)}</span>
              <span className="flex-1 text-sm font-medium text-brand-dark">{cat.label}</span>
              <button type="button" onClick={() => move(cat.id, -1)} disabled={idx === 0 || loading} className={iconBtn}><ChevronUp className="w-4 h-4" /></button>
              <button type="button" onClick={() => move(cat.id, 1)}  disabled={idx === cats.length - 1 || loading} className={iconBtn}><ChevronDown className="w-4 h-4" /></button>
              <button type="button" onClick={() => setEditing({ id: cat.id, label: cat.label, icon_key: cat.icon_key })} className={iconBtn}><Pencil className="w-4 h-4 text-brand-green-700/60" /></button>
              <button type="button" onClick={() => del(cat.id)} disabled={loading} className={iconBtn}><Trash2 className="w-4 h-4 text-red-500/70" /></button>
            </>
          )}
        </div>
      ))}

      {adding ? (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-brand-green-700/30 bg-white">
          <div className="flex gap-2">
            <input
              placeholder="ID (ex: sandwiches)"
              className="flex-1 border border-brand-green-700/20 rounded px-2 py-1.5 text-sm"
              value={adding.id}
              onChange={(e) => setAdding((s) => s && { ...s, id: e.target.value })}
            />
            <select
              value={adding.icon_key}
              onChange={(e) => setAdding((s) => s && { ...s, icon_key: e.target.value })}
              className="border border-brand-green-700/20 rounded px-2 py-1.5 text-sm"
            >
              {ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <input
            placeholder="Etichetă (ex: Sandwichuri)"
            className="border border-brand-green-700/20 rounded px-2 py-1.5 text-sm"
            value={adding.label}
            onChange={(e) => setAdding((s) => s && { ...s, label: e.target.value })}
          />
          <div className="flex gap-2">
            <button type="button" onClick={add} disabled={loading} className="flex-1 py-1.5 rounded-lg bg-brand-green-700 text-brand-cream-50 text-sm font-bold">Adaugă</button>
            <button type="button" onClick={() => { setAdding(null); setError("") }} className="flex-1 py-1.5 rounded-lg border border-brand-green-700/20 text-sm">Anulează</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding({ id: "", label: "", icon_key: "fork-knife" })}
          className="w-full py-2 flex items-center justify-center gap-1.5 text-sm text-brand-green-700/70 hover:text-brand-green-700 border border-dashed border-brand-green-700/30 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Categorie nouă
        </button>
      )}
    </div>
  )
}

const iconBtn = "w-7 h-7 flex items-center justify-center rounded-lg hover:bg-brand-cream-200/80 transition-colors disabled:opacity-40"
