import { useRef, useState, type FormEvent } from "react"

type Props = {
  customer: { id: string; name: string; email: string | null }
  onDeleted: (id: string, name: string) => void
}

/** Requires account-specific typed confirmation before permanently deleting a customer. */
export function CustomerDeletion({ customer, onDeleted }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const isSubmittingRef = useRef(false)
  const [confirmation, setConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")
  const expected = customer.email?.trim() ? customer.email : customer.id
  const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"

  function openDialog() {
    setConfirmation("")
    setError("")
    dialogRef.current?.showModal()
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (confirmation !== expected || isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsDeleting(true)
    setError("")
    try {
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(customer.id)}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      })
      const json: unknown = await response.json()
      if (!response.ok) {
        const message = json && typeof json === "object" && "error" in json
          && json.error && typeof json.error === "object" && "message" in json.error
          && typeof json.error.message === "string" ? json.error.message : "Contul nu a putut fi șters."
        throw new Error(message)
      }
      if (!json || typeof json !== "object" || !("data" in json) || !json.data
        || typeof json.data !== "object" || !("deletedCustomerId" in json.data)
        || json.data.deletedCustomerId !== customer.id) {
        throw new Error("Răspuns neașteptat. Reîncarcă lista pentru a verifica starea contului.")
      }
      dialogRef.current?.close()
      onDeleted(customer.id, customer.name)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Contul nu a putut fi șters.")
    } finally {
      isSubmittingRef.current = false
      setIsDeleting(false)
    }
  }

  return (
    <section aria-labelledby="customer-deletion-heading" className="space-y-3 rounded-xl border border-red-800/30 p-4">
      <h2 id="customer-deletion-heading" className="font-bold text-red-900">Ștergere definitivă cont</h2>
      <p className="text-sm">Această operațiune nu poate fi anulată.</p>
      <button ref={triggerRef} type="button" onClick={openDialog}
        className={`min-h-11 rounded-xl border border-red-800 px-4 font-semibold text-red-900 ${focusClass}`}>
        Șterge contul {customer.name}
      </button>
      <dialog ref={dialogRef} aria-labelledby="customer-deletion-dialog-title" aria-describedby="customer-deletion-warning"
        onCancel={event => { if (isSubmittingRef.current) event.preventDefault() }}
        onClose={() => triggerRef.current?.focus()}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-brand-dark backdrop:bg-black/50">
        <form onSubmit={event => void handleDelete(event)} className="space-y-4">
          <h2 id="customer-deletion-dialog-title" className="text-xl font-bold text-red-900">Ștergi definitiv contul?</h2>
          <p className="break-all font-semibold">{customer.name} · {customer.email || customer.id}</p>
          <div id="customer-deletion-warning" className="space-y-2 text-sm">
            <p>Se șterg accesul la cont, autentificările, sesiunile, abonamentele push, acordurile de marketing și jurnalul personal.</p>
            <p>Comenzile finalizate sau anulate sunt păstrate, dar datele personale sunt anonimizate. Evidența financiară verificată și voucherele aferente rămân asociate unui identificator de contabilitate fără nume sau e-mail, nu unui cont utilizabil.</p>
            <p>Dacă nu există evidență financiară, contul și voucherele sunt eliminate complet.</p>
            <p>Conturile cu comenzi în lucru sau notificări în curs nu pot fi șterse până la finalizarea operațiunilor.</p>
            <p>Comenzile TEST sunt asociate numai prin e-mail, nu prin nume. Comenzile fără un e-mail asociat nu pot fi identificate automat.</p>
          </div>
          <label htmlFor="customer-deletion-confirmation" className="block text-sm">
            Pentru confirmare, introdu exact: <strong className="break-all">{expected}</strong>
          </label>
          <input id="customer-deletion-confirmation" value={confirmation} maxLength={320} autoComplete="off"
            spellCheck={false} disabled={isDeleting} required
            onChange={event => setConfirmation(event.target.value)}
            className={`min-h-11 w-full rounded-xl border border-red-800/50 px-3 ${focusClass}`} />
          {error && <p role="alert" className="text-sm text-red-900">{error}</p>}
          <p role="status" className="text-sm">{isDeleting ? "Se șterge contul…" : ""}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" autoFocus disabled={isDeleting} onClick={() => dialogRef.current?.close()}
              className={`min-h-11 rounded-xl border px-4 font-semibold disabled:opacity-50 ${focusClass}`}>
              Anulează
            </button>
            <button type="submit" disabled={isDeleting || confirmation !== expected}
              className={`min-h-11 rounded-xl bg-red-800 px-4 font-semibold text-white disabled:opacity-50 ${focusClass}`}>
              {isDeleting ? "Se șterge…" : "Șterge definitiv contul"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  )
}
