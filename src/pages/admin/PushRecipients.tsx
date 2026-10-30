import { useId, useState } from "react"

export type PushRecipient = { id: string; name: string; email: string | null; devices: number }

interface Props {
  recipients: PushRecipient[]
  audience: "selected" | "all"
  selectedIds: string[]
  disabled: boolean
  onAudienceChange: (audience: "selected" | "all") => void
  onSelectionChange: (ids: string[]) => void
}

/** Lets administrators explicitly choose all eligible customers or individual recipients. */
export function PushRecipients({ recipients, audience, selectedIds, disabled, onAudienceChange, onSelectionChange }: Props) {
  const groupName = useId()
  const [search, setSearch] = useState("")
  const query = search.trim().toLocaleLowerCase("ro-RO")
  const visible = recipients.filter(recipient =>
    `${recipient.name} ${recipient.email ?? ""} ${recipient.id}`.toLocaleLowerCase("ro-RO").includes(query))
  const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700"

  return (
    <fieldset disabled={disabled} className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-semibold">Destinatari</legend>
      <label className="flex min-h-11 items-center gap-3">
        <input type="radio" name={groupName} checked={audience === "selected"}
          onChange={() => onAudienceChange("selected")} className={focusClass} />
        Doar clientii selectati
      </label>
      <label className="flex min-h-11 items-center gap-3">
        <input type="radio" name={groupName} checked={audience === "all"}
          onChange={() => onAudienceChange("all")} className={focusClass} />
        Toti clientii cu acord push activ
      </label>
      {audience === "selected" && <>
        <label className="block text-sm">Cauta dupa nume, email sau ID
          <input type="search" value={search} onChange={event => setSearch(event.target.value)}
            className={`mt-1 min-h-11 w-full rounded-xl border bg-white px-3 ${focusClass}`} />
        </label>
        <p className="text-xs">Bifeaza unul sau mai multi clienti. Se trimite pe toate dispozitivele lor eligibile.
          Cautarea nu modifica selectia.</p>
        <div className="max-h-64 overflow-y-auto">
          {visible.map(recipient => <label key={recipient.id} className="flex min-h-11 items-center gap-3 border-b py-2 text-sm">
            <input type="checkbox" checked={selectedIds.includes(recipient.id)} className={focusClass}
              onChange={event => onSelectionChange(event.target.checked
                ? [...selectedIds, recipient.id] : selectedIds.filter(id => id !== recipient.id))} />
            <span className="min-w-0 break-words">
              <span className="font-semibold">{recipient.name}</span>
              {" · "}{recipient.email ?? `ID: ${recipient.id}`}
              {" · "}{recipient.devices} dispozitive
            </span>
          </label>)}
          {!visible.length && <p className="py-3 text-sm">Niciun client eligibil pentru aceasta cautare.</p>}
        </div>
        <button type="button" onClick={() => onSelectionChange([])} className={`min-h-11 underline ${focusClass}`}>
          Goleste selectia
        </button>
      </>}
    </fieldset>
  )
}
