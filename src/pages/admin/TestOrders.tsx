import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { canTransition, preparationStatuses, type PreparationStatus, type TestOrder } from "../../features/orders/types"

const labels: Record<PreparationStatus, string> = {
  new: "Nouă", preparing: "În pregătire", ready: "Gata de ridicare", collected: "Ridicată", cancelled: "Anulată",
}

async function fetchOrders(cursor?: string, signal?: AbortSignal) {
  const response = await fetch(`/api/admin/orders${cursor ? `?before=${encodeURIComponent(cursor)}` : ""}`, { signal })
  const json: { data?: TestOrder[]; next?: string | null; error?: { message?: string } } = await response.json()
  if (!response.ok || !Array.isArray(json.data)) throw new Error(json.error?.message ?? "Răspuns invalid pentru comenzile TEST.")
  return { data: json.data, next: json.next ?? null }
}

/** Lists persisted local test orders with separate immutable payment and editable preparation states. */
export function TestOrders() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<TestOrder[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [updating, setUpdating] = useState("")
  const money = (bani: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(bani / 100)

  const load = async (cursor?: string, signal?: AbortSignal) => {
    try {
      const json = await fetchOrders(cursor, signal)
      const page = json.data
      setOrders(previous => cursor ? [...previous, ...page] : page)
      setNext(json.next ?? null)
    } catch (error) {
      if (signal?.aborted) return
      console.error("Unable to load TEST orders", error)
      setError(error instanceof Error ? error.message : "Comenzile TEST nu au putut fi încărcate.")
    } finally {
      if (!signal?.aborted) setIsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchOrders(undefined, controller.signal).then(json => {
      if (controller.signal.aborted) return
      setOrders(json.data)
      setNext(json.next)
    }).catch(error => {
      if (controller.signal.aborted) return
      console.error("Unable to load TEST orders", error)
      setError(error instanceof Error ? error.message : "Comenzile TEST nu au putut fi încărcate.")
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [])

  const handleLoad = (cursor?: string) => {
    setIsLoading(true)
    setError("")
    void load(cursor)
  }

  const changeStatus = async (order: TestOrder, status: PreparationStatus) => {
    setUpdating(order.number)
    setError("")
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.number)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, expectedStatus: order.preparationStatus }),
      })
      const json: { data?: TestOrder; error?: { message?: string } } = await response.json()
      if (!response.ok || !json.data) throw new Error(json.error?.message ?? "Starea nu a putut fi salvată.")
      const updated = json.data
      setOrders(previous => previous.map(item => item.number === updated.number ? updated : item))
    } catch (error) {
      console.error("Unable to update TEST order", error)
      setError(error instanceof Error ? error.message : "Starea nu a putut fi salvată.")
    } finally {
      setUpdating("")
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="test-orders-heading">
      <h1 id="test-orders-heading" className="text-2xl font-bold text-brand-green-800">Comenzi TEST — doar local</h1>
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
        Nu sunt comenzi reale. Plata rămâne „Neplătită”; pregătirea este doar simulată. Nu pregăti produse pentru aceste comenzi.
      </p>
      <button type="button" disabled={isLoading || Boolean(updating)} onClick={() => handleLoad()}
        className="min-h-11 rounded-full border border-brand-green-700/30 px-5 font-semibold">Reîncarcă lista</button>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
      {isLoading && <p role="status">Se încarcă…</p>}
      {!isLoading && !error && orders.length === 0 && <p>Nu există comenzi TEST.</p>}
      {orders.map(order => (
        <article key={order.number} className="space-y-3 rounded-2xl border border-brand-green-700/20 bg-brand-cream-50 p-4">
          <h2 className="break-all font-bold">{order.number}</h2>
          <p className="text-sm">{new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</p>
          <p className="font-semibold text-amber-950">TEST · Neplătită · {labels[order.preparationStatus]}</p>
          <p className="break-words text-sm">{order.contact.name} · {order.contact.phone} · {order.contact.email}</p>
          <p className="text-sm">Ridicare de la locație · Timp neconfirmat</p>
          <ul className="space-y-2">
            {order.lines.map(line => (
              <li key={line.key} className="text-sm">
                <p>{line.quantity} × {line.name} · {money(line.priceBani)} / buc. · {money(line.subtotalBani)}</p>
                {line.ingredients.map(ingredient => (
                  <p key={ingredient.id} className="pl-4">
                    {t(`builder.ingredients.${ingredient.id}.name`, { defaultValue: ingredient.id })} · {ingredient.amount} {ingredient.unit}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          <p className="font-bold">Total salvat: {money(order.totalBani)}</p>
          <div className="flex flex-wrap gap-2">
            {preparationStatuses.filter(status => status !== order.preparationStatus && canTransition(order.preparationStatus, status)).map(status => (
              <button key={status} type="button" disabled={Boolean(updating)}
                onClick={() => void changeStatus(order, status)}
                className="min-h-11 rounded-full border border-brand-green-700/30 px-4 text-sm font-semibold disabled:opacity-40">
                {updating === order.number ? "Se salvează…" : labels[status]}
              </button>
            ))}
          </div>
        </article>
      ))}
      {next && <button type="button" disabled={isLoading || Boolean(updating)} onClick={() => handleLoad(next)}
        className="min-h-11 rounded-full border border-brand-green-700/30 px-5">Mai multe comenzi TEST</button>}
    </section>
  )
}
