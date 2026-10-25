export type Provider = "google" | "facebook"
type HistoryEntry = { id: number; kind: "purchase" | "referral"; points_delta: number; created_at: number }
export type AccountData = {
  providers: Provider[]
  customer: null | {
    name: string; email: string | null; referralCode: string; referralUrl: string
    points: number; linkedProviders: Provider[]; history: HistoryEntry[]
  }
}

/** Calls the cookie-authenticated account API without caching personal information. */
export async function accountRequest(path: "me" | "start" | "logout", body?: object, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`/api/customer/${path}`, {
    method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  })
  const json: unknown = await response.json()
  if (!response.ok) {
    const code = json && typeof json === "object" && "error" in json
      && json.error && typeof json.error === "object" && "code" in json.error ? json.error.code : null
    throw new Error(code === "INVALID_REFERRAL" ? "account.invalidReferral" : "account.error")
  }
  if (!json || typeof json !== "object" || !("data" in json)) throw new Error("account.error")
  return json.data
}

function isProvider(value: unknown): value is Provider { return value === "google" || value === "facebook" }

/** Validates the account response at the network boundary. */
export function isAccountData(value: unknown): value is AccountData {
  if (!value || typeof value !== "object" || !("providers" in value)
    || !Array.isArray(value.providers) || !value.providers.every(isProvider) || !("customer" in value)) return false
  const c = value.customer
  if (c === null) return true
  return !!c && typeof c === "object" && "name" in c && typeof c.name === "string"
    && "email" in c && (c.email === null || typeof c.email === "string")
    && "referralCode" in c && typeof c.referralCode === "string"
    && "referralUrl" in c && typeof c.referralUrl === "string"
    && "points" in c && typeof c.points === "number" && Number.isSafeInteger(c.points)
    && "linkedProviders" in c && Array.isArray(c.linkedProviders) && c.linkedProviders.every(isProvider)
    && "history" in c && Array.isArray(c.history) && c.history.every(row =>
      !!row && typeof row === "object" && (row.kind === "purchase" || row.kind === "referral")
      && Number.isSafeInteger(row.id) && Number.isSafeInteger(row.points_delta) && Number.isSafeInteger(row.created_at))
}
