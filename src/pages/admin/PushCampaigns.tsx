import { useEffect, useRef, useState, type FormEvent } from "react"
import { PushRecipients, type PushRecipient } from "./PushRecipients"

type Campaign = {
  id: string; title: string; body: string; path: string; created_at: number
  total: number; pending: number; sending: number; accepted: number; failed: number; skipped: number; expired: number
}
type Overview = {
  configured: boolean; audience: { devices: number; customers: number }; campaigns: Campaign[]; recipients: PushRecipient[]
}

function isRecipient(value: unknown): value is PushRecipient {
  return !!value && typeof value === "object"
    && "id" in value && typeof value.id === "string"
    && "name" in value && typeof value.name === "string"
    && "email" in value && (value.email === null || typeof value.email === "string")
    && "devices" in value && typeof value.devices === "number" && Number.isSafeInteger(value.devices) && value.devices > 0
}

function isCampaign(value: unknown): value is Campaign {
  if (!value || typeof value !== "object") return false
  const fields = Object.fromEntries(Object.entries(value))
  return ["id", "title", "body", "path"].every(key => typeof fields[key] === "string")
    && ["created_at", "total", "pending", "sending", "accepted", "failed", "skipped", "expired"]
      .every(key => typeof fields[key] === "number" && Number.isSafeInteger(fields[key]) && Number(fields[key]) >= 0)
}

function isOverview(value: unknown): value is Overview {
  return !!value && typeof value === "object" && "configured" in value && typeof value.configured === "boolean"
    && "campaigns" in value && Array.isArray(value.campaigns) && value.campaigns.every(isCampaign)
    && "recipients" in value && Array.isArray(value.recipients) && value.recipients.every(isRecipient)
    && "audience" in value && !!value.audience && typeof value.audience === "object"
    && "devices" in value.audience && typeof value.audience.devices === "number"
    && "customers" in value.audience && typeof value.audience.customers === "number"
}

async function requestPush(signal: AbortSignal, body?: object): Promise<unknown> {
  const response = await fetch("/api/admin/push", {
    method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  })
  const json: unknown = await response.json()
  if (!response.ok) {
    const code = json && typeof json === "object" && "error" in json && json.error
      && typeof json.error === "object" && "code" in json.error ? json.error.code : null
    throw new Error(code === "PUSH_NOT_CONFIGURED" ? "Configureaza cheile VAPID inainte de trimitere."
      : code === "CAMPAIGN_CONFLICT" ? "Campania exista cu alt continut sau alti destinatari. Foloseste Formular nou."
      : code === "INVALID_INPUT" ? "Verifica mesajul si selecteaza cel putin un client pentru trimiterea selectiva."
      : "Cererea a fost intrerupta sau respinsa. Reincarca istoricul inainte de a relua.")
  }
  if (!json || typeof json !== "object" || !("data" in json)) throw new Error("Raspuns push invalid.")
  return json.data
}

/** Sends explicit administrator-approved campaigns in durable, resumable batches. */
export function PushCampaigns() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [reload, setReload] = useState(0)
  const [id, setId] = useState(() => crypto.randomUUID())
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [path, setPath] = useState("/menu")
  const [audience, setAudience] = useState<"selected" | "all">("selected")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState("")
  const [progress, setProgress] = useState<Campaign | null>(null)
  const sending = useRef<AbortController | null>(null)
  const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"
  const selectedRecipients = overview?.recipients.filter(recipient => selectedIds.includes(recipient.id)) ?? []
  const customerCount = audience === "all" ? overview?.audience.customers ?? 0 : selectedRecipients.length
  const deviceCount = audience === "all" ? overview?.audience.devices ?? 0
    : selectedRecipients.reduce((sum, recipient) => sum + recipient.devices, 0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const result = await requestPush(controller.signal)
        if (!isOverview(result)) throw new Error("Raspuns push invalid.")
        if (!controller.signal.aborted) { setOverview(result); setError("") }
      } catch (reason) {
        if (controller.signal.aborted) return
        console.error("Admin push overview failed", reason)
        setError(reason instanceof Error ? reason.message : "Nu s-a putut incarca istoricul.")
      }
    }
    void load()
    return () => controller.abort()
  }, [reload])
  useEffect(() => () => sending.current?.abort(), [])

  async function processCampaign(campaign: Campaign, controller: AbortController) {
    let current = campaign
    setProgress(current)
    while (current.pending > 0 && !controller.signal.aborted) {
      const result = await requestPush(controller.signal, { action: "send", id: current.id })
      if (!isCampaign(result)) throw new Error("Raspuns campanie invalid.")
      if (!controller.signal.aborted) setProgress(result)
      if (result.pending >= current.pending) throw new Error("Trimiterea nu a progresat. Reincarca istoricul.")
      current = result
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busyId || !overview?.configured) return
    if (!deviceCount) { setError("Selecteaza cel putin un client eligibil."); return }
    if (!window.confirm(`Trimiti aceasta campanie catre ${audience === "all" ? "TOTI cei" : "cei"} ${customerCount} clienti ${audience === "all" ? "eligibili" : "selectati"} (${deviceCount} dispozitive)?`)) return
    const controller = new AbortController()
    sending.current = controller
    setBusyId(id)
    setError("")
    try {
      const result = await requestPush(controller.signal, {
        action: "create", id, title, body, path, audience,
        ...(audience === "selected" ? { customerIds: selectedRecipients.map(recipient => recipient.id) } : {}),
      })
      if (!isCampaign(result)) throw new Error("Raspuns campanie invalid.")
      await processCampaign(result, controller)
      if (!controller.signal.aborted) {
        setId(crypto.randomUUID()); setTitle(""); setBody(""); setSelectedIds([]); setAudience("selected"); setReload(value => value + 1)
      }
    } catch (reason) {
      if (controller.signal.aborted) return
      console.error("Admin push campaign failed", reason)
      setError(reason instanceof Error ? reason.message : "Trimiterea campaniei a esuat.")
    } finally { if (!controller.signal.aborted) setBusyId("") }
  }

  async function handleResume(campaign: Campaign) {
    if (busyId) return
    const controller = new AbortController()
    sending.current = controller
    setBusyId(campaign.id)
    setError("")
    try {
      await processCampaign(campaign, controller)
      if (!controller.signal.aborted) setReload(value => value + 1)
    } catch (reason) {
      if (controller.signal.aborted) return
      console.error("Admin push resume failed", reason)
      setError(reason instanceof Error ? reason.message : "Reluarea a esuat.")
    } finally { if (!controller.signal.aborted) setBusyId("") }
  }

  return (
    <section aria-labelledby="admin-push-heading" className="space-y-5">
      <h1 id="admin-push-heading" className="font-serif text-2xl font-bold text-brand-green-800">Campanii push</h1>
      <p className="text-sm">Doar clientii cu acord push activ si abonamente de dispozitiv valide sunt eligibili.
        Tine pagina deschisa pe durata trimiterii; loturile neprocesate pot fi reluate din istoric.</p>
      {overview && <p className="text-sm">Public: {overview.audience.customers} clienti / {overview.audience.devices} dispozitive.</p>}
      {overview && !overview.configured && <p role="status" className="rounded-xl bg-amber-50 p-3">
        Push nu este configurat. Adauga VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY si VAPID_SUBJECT in Cloudflare.
      </p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
      <button type="button" disabled={!!busyId} onClick={() => setReload(value => value + 1)}
        className={`min-h-11 underline ${focusClass}`}>Actualizeaza istoricul</button>
      <form onSubmit={event => void handleCreate(event)} className="space-y-3 rounded-2xl border p-5">
        <PushRecipients recipients={overview?.recipients ?? []} audience={audience} selectedIds={selectedIds}
          disabled={!!busyId} onAudienceChange={setAudience} onSelectionChange={setSelectedIds} />
        <p role="status" className="text-sm">{customerCount} clienti / {deviceCount} dispozitive vizate.</p>
        <label className="block text-sm font-semibold">Titlu (maximum 80 caractere)
          <input required maxLength={80} value={title} disabled={!!busyId} onChange={event => setTitle(event.target.value)}
            className={`mt-1 min-h-11 w-full rounded-xl border bg-white px-3 font-normal ${focusClass}`} />
        </label>
        <label className="block text-sm font-semibold">Mesaj (maximum 240 caractere)
          <textarea required maxLength={240} value={body} disabled={!!busyId} onChange={event => setBody(event.target.value)}
            className={`mt-1 min-h-24 w-full rounded-xl border bg-white p-3 font-normal ${focusClass}`} />
        </label>
        <label className="block text-sm font-semibold">Deschide
          <select value={path} disabled={!!busyId} onChange={event => setPath(event.target.value)}
            className={`mt-1 min-h-11 w-full rounded-xl border bg-white px-3 font-normal ${focusClass}`}>
            <option value="/menu">Meniul</option><option value="/account">Contul clientului</option><option value="/">Acasa</option>
          </select>
        </label>
        <button type="submit" disabled={!!busyId || !overview?.configured || !deviceCount}
          className={`min-h-11 rounded-xl bg-brand-green-700 px-5 font-semibold text-white disabled:opacity-50 ${focusClass}`}>
          {busyId ? "Se proceseaza..." : audience === "all" ? "Trimite tuturor abonatilor push" : "Trimite clientilor selectati"}
        </button>
        <button type="button" disabled={!!busyId} onClick={() => {
          setId(crypto.randomUUID()); setTitle(""); setBody(""); setError(""); setSelectedIds([]); setAudience("selected")
        }} className={`ml-3 min-h-11 underline ${focusClass}`}>Formular nou</button>
      </form>
      {progress && <p role="status">
        {progress.title}: {progress.accepted} acceptate de serviciul push, {progress.pending} in asteptare,
        {" "}{progress.failed} erori, {progress.expired} expirate, {progress.skipped} omise,
        {" "}{progress.sending} cu rezultat in curs sau necunoscut.
      </p>}
      <p className="text-xs">Acceptarea de catre serviciul push nu confirma afisarea sau citirea.
        Erorile si trimiterile cu rezultat necunoscut nu se retrimit automat, pentru a evita duplicatele.</p>
      <ul className="space-y-3">
        {overview?.campaigns.map(campaign => <li key={campaign.id} className="rounded-xl border p-4 text-sm">
          <h2 className="font-semibold">{campaign.title}</h2><p>{campaign.body}</p>
          <p className="mt-2">{new Date(campaign.created_at * 1000).toLocaleString("ro-RO")} · {campaign.total} destinatari dispozitiv</p>
          <p>{campaign.accepted} acceptate · {campaign.pending} in asteptare · {campaign.failed} erori ·
            {" "}{campaign.expired} expirate · {campaign.skipped} omise · {campaign.sending} in curs/necunoscute</p>
          {campaign.pending > 0 && <button type="button" disabled={!!busyId || !overview.configured}
            onClick={() => void handleResume(campaign)} className={`mt-2 min-h-11 underline ${focusClass}`}>Reia loturile neprocesate</button>}
        </li>)}
      </ul>
    </section>
  )
}
