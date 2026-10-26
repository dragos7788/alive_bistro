import { useState, useEffect, useCallback } from "react"
import { Plus, ChevronUp, ChevronDown, Pencil, Trash2, Eye, EyeOff } from "lucide-react"
import { resolveIcon } from "../../features/menu/icons"
import { resolveMenuImage } from "../../features/menu/images"
import ItemForm, { type AdminItem } from "./ItemForm"
import CategoryManager, { type AdminCategory } from "./CategoryManager"
import { TestOrders } from "./TestOrders"
import { PromotionSettings } from "./PromotionSettings"
import { CustomerLoyalty } from "./CustomerLoyalty"
import { PushCampaigns } from "./PushCampaigns"

type View = "items" | "categories" | "orders" | "promotion" | "loyalty" | "push"

export default function AdminApp() {
  const [view, setView]             = useState<View>(() => window.location.pathname === "/admin/promotion"
    ? "promotion" : window.location.pathname === "/admin/orders" ? "orders"
      : window.location.pathname === "/admin/loyalty" ? "loyalty"
        : window.location.pathname === "/admin/push" ? "push" : "items")
  const [activeGroup, setActiveGroup] = useState<"food" | "drinks">(() => window.location.pathname === "/admin/drinks" ? "drinks" : "food")
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [items, setItems]           = useState<AdminItem[]>([])
  const [editItem, setEditItem]     = useState<AdminItem | null>(null)
  const [addingItem, setAddingItem] = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState("")

  const fetchCategories = useCallback(async () => {
    try {
      const res  = await fetch("/api/admin/categories")
      if (res.status === 401) { setError("Acces neautorizat – verifică Cloudflare Access"); return }
      const json = await res.json() as { data?: AdminCategory[]; error?: { message: string } }
      const cats = json.data ?? []
      setCategories(cats)
      setActiveCatId((prev) => prev ?? (cats.find((c) => c.group_id === activeGroup)?.id ?? null))
    } catch { setError("Nu s-au putut încărca categoriile") }
  }, [activeGroup])

  const fetchItems = useCallback(async (catId: string) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/items?category=${catId}`)
      const json = await res.json() as { data?: AdminItem[]; error?: { message: string } }
      if (!res.ok || !Array.isArray(json.data)) throw new Error(json.error?.message ?? "Răspuns invalid pentru produse")
      setItems(json.data)
    } catch { setError("Nu s-au putut încărca produsele") } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (view === "items" || view === "categories") fetchCategories() }, [fetchCategories, view])

  useEffect(() => {
    const first = categories.find((c) => c.group_id === activeGroup)?.id ?? null
    setActiveCatId(first)
  }, [activeGroup, categories])

  useEffect(() => { if ((view === "items" || view === "categories") && activeCatId) fetchItems(activeCatId) }, [activeCatId, fetchItems, view])

  const move = async (id: string, dir: -1 | 1) => {
    const arr   = [...items]
    const idx   = arr.findIndex((i) => i.id === id)
    const other = arr[idx + dir]
    if (!other) return
    arr[idx] = other; arr[idx + dir] = items[idx]
    setItems(arr)
    await fetch("/api/admin/items/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: arr.map((i) => i.id) }),
    })
  }

  const toggleVisible = async (item: AdminItem) => {
    const response = await fetch(`/api/admin/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, expected_stock_quantity: item.stock_quantity, is_visible: item.is_visible ? 0 : 1 }),
    })
    if (!response.ok) {
      const json = await response.json() as { error?: { message: string } }
      setError(json.error?.message ?? "Vizibilitatea nu a putut fi salvată.")
    }
    if (activeCatId) fetchItems(activeCatId)
  }

  const deleteItem = async (id: string) => {
    if (!confirm("Ștergi acest produs?")) return
    const response = await fetch(`/api/admin/items/${id}`, { method: "DELETE" })
    if (!response.ok) {
      const json = await response.json() as { error?: { message: string } }
      setError(json.error?.message ?? "Produsul nu a putut fi șters.")
    }
    if (activeCatId) fetchItems(activeCatId)
  }

  const groupCats = categories.filter((c) => c.group_id === activeGroup)

  return (
    <div className="min-h-screen bg-brand-cream-100 text-brand-dark font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-brand-cream-100 border-b border-brand-green-700/10 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="font-bold text-brand-green-700 font-serif text-lg">ALIVE Admin</span>
        <div className="flex-1" />
        <button
          onClick={() => setView("items")}
          className={tab(view === "items")}
        >Produse</button>
        <button
          onClick={() => setView("categories")}
          className={tab(view === "categories")}
        >Categorii</button>
        <button onClick={() => setView("orders")} className={tab(view === "orders")}>Comenzi TEST</button>
        <button onClick={() => setView("promotion")} className={tab(view === "promotion")}>Reduceri</button>
        <button onClick={() => setView("loyalty")} className={tab(view === "loyalty")}>Clienți și fidelitate</button>
        <button onClick={() => setView("push")} className={tab(view === "push")}>Campanii push</button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {error && (view === "items" || view === "categories") && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {/* Group selector */}
        {(view === "items" || view === "categories") && <div className="flex gap-2">
          {(["food", "drinks"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${
                activeGroup === g
                  ? "bg-brand-green-700 text-brand-cream-50 shadow-md"
                  : "border border-brand-green-700/20 text-brand-green-700/70 hover:text-brand-green-700"
              }`}
            >
              {resolveIcon(g === "food" ? "fork-knife" : "coffee", 18)}
              {g === "food" ? "Mâncare" : "Băuturi"}
            </button>
          ))}
        </div>}

        {view === "push" ? <PushCampaigns /> : view === "loyalty" ? <CustomerLoyalty /> : view === "promotion" ? <PromotionSettings /> : view === "orders" ? <TestOrders /> : view === "categories" ? (
          <CategoryManager
            categories={categories}
            groupId={activeGroup}
            onRefresh={fetchCategories}
          />
        ) : (
          <>
            {/* Category chips */}
            <div className="flex flex-wrap gap-2">
              {groupCats.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCatId(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    activeCatId === cat.id
                      ? "bg-brand-green-700 text-brand-cream-50"
                      : "border border-brand-green-700/20 text-brand-green-700/70 hover:text-brand-green-700"
                  }`}
                >
                  {resolveIcon(cat.icon_key, 14)}
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Item list */}
            <div className="space-y-2">
              {loading && <p className="text-sm text-brand-dark/50 py-4 text-center">Se încarcă…</p>}
              {!loading && items.length === 0 && (
                <p className="text-sm text-brand-dark/50 py-4 text-center">Niciun produs în această categorie.</p>
              )}
              {items.map((item, idx) => {
                const photo = resolveMenuImage(item)
                return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    item.is_visible ? "bg-brand-cream-50 border-brand-green-700/10" : "bg-brand-cream-200/40 border-brand-green-700/5 opacity-60"
                  }`}
                >
                  {photo.image ? (
                    <img
                      src={photo.image}
                      srcSet={photo.imageSrcSet}
                      sizes="56px"
                      alt={item.name}
                      loading="lazy"
                      className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-brand-cream-200 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-brand-dark truncate">{item.name}</p>
                    <p className="text-xs text-brand-dark/50 font-medium">{item.price}</p>
                    <p className="mt-1 text-xs font-semibold text-brand-green-800">
                      {item.is_available === 0 || item.stock_quantity === 0 ? "Indisponibil" : "Disponibil"}
                      {" · "}{item.stock_quantity === null ? "Fără urmărire stoc" : `Stoc: ${item.stock_quantity}`}
                    </p>
                    <p className="text-xs text-brand-dark/70">
                      {item.show_stock === 1 && item.stock_quantity !== null ? "Cantitate vizibilă clientului" : "Cantitate ascunsă clientului"}
                    </p>
                    {item.tag && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-cream-200 text-brand-dark/60 font-bold">{item.tag}</span>}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => move(item.id, -1)} disabled={idx === 0} className={iconBtn}><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => move(item.id,  1)} disabled={idx === items.length - 1} className={iconBtn}><ChevronDown className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => toggleVisible(item)} className={iconBtn} title={item.is_visible ? "Ascunde" : "Afișează"}>
                      {item.is_visible ? <Eye className="w-3.5 h-3.5 text-brand-green-700/60" /> : <EyeOff className="w-3.5 h-3.5 text-brand-dark/40" />}
                    </button>
                    <button onClick={() => setEditItem(item)} aria-label={`Editează ${item.name}`} className={iconBtn}><Pencil className="w-3.5 h-3.5 text-brand-green-700/60" /></button>
                    <button onClick={() => deleteItem(item.id)} className={iconBtn}><Trash2 className="w-3.5 h-3.5 text-red-500/70" /></button>
                  </div>
                </div>
                )
              })}
            </div>

            {activeCatId && (
              <button
                onClick={() => setAddingItem(true)}
                className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-green-700/30 text-sm font-semibold text-brand-green-700/70 hover:text-brand-green-700 hover:border-brand-green-700/50 transition-colors"
              >
                <Plus className="w-4 h-4" /> Adaugă produs
              </button>
            )}
          </>
        )}
      </div>

      <ItemForm
        key={`${editItem?.id ?? "new"}-${addingItem || editItem !== null}`}
        open={addingItem || editItem !== null}
        item={editItem}
        categoryId={activeCatId ?? ""}
        onClose={() => { setAddingItem(false); setEditItem(null) }}
        onSaved={() => { if (activeCatId) fetchItems(activeCatId) }}
      />
    </div>
  )
}

const tab = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
    active ? "bg-brand-green-700 text-brand-cream-50" : "text-brand-dark/60 hover:text-brand-dark"
  }`

const iconBtn = "w-6 h-6 flex items-center justify-center rounded hover:bg-brand-cream-200 transition-colors disabled:opacity-30"
