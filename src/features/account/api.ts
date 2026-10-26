export type Provider = "google" | "facebook"
export type Voucher = {
  id: string; code: string; source: "welcome" | "points"; discountPercent: number
  createdAt: number; expiresAt: number; status: "active" | "expired"
}
type HistoryEntry = { id: number; kind: "purchase" | "referral" | "pointsVoucher"; points_delta: number; created_at: number }
export type AccountData = {
  providers: Provider[]
  customer: null | {
    name: string; email: string | null; referralCode: string; referralUrl: string
    points: number; linkedProviders: Provider[]; history: HistoryEntry[]; vouchers: Voucher[]
    emailMarketingConsent: boolean; emailMarketingConsentUpdatedAt: number | null
  }
}
type MarketingPreference = { emailMarketingConsent: boolean; emailMarketingConsentUpdatedAt: number | null }

/** Calls the cookie-authenticated account API without caching personal information. */
export async function accountRequest(path: "me" | "start" | "logout" | "vouchers" | "marketing" | "marketing-invitation" | "push", body?: object, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`/api/customer/${path}`, {
    method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", signal,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  })
  const json: unknown = await response.json()
  if (!response.ok) {
    const code = json && typeof json === "object" && "error" in json
      && json.error && typeof json.error === "object" && "code" in json.error ? json.error.code : null
    throw new Error(code === "INVALID_REFERRAL" ? "account.invalidReferral"
      : code === "INSUFFICIENT_POINTS" ? "account.notEnoughPoints"
        : code === "EMAIL_REQUIRED" ? "account.marketingEmailRequired"
          : code === "PUSH_DEVICE_IN_USE" ? "push.deviceInUse" : "account.error")
  }
  if (!json || typeof json !== "object" || !("data" in json)) throw new Error("account.error")
  return json.data
}

function isProvider(value: unknown): value is Provider { return value === "google" || value === "facebook" }

/** Validates a voucher received from an account API response. */
export function isVoucher(value: unknown): value is Voucher {
  return !!value && typeof value === "object" && "id" in value && typeof value.id === "string"
    && "code" in value && typeof value.code === "string"
    && "source" in value && (value.source === "welcome" || value.source === "points")
    && "discountPercent" in value && value.discountPercent === 10
    && "createdAt" in value && typeof value.createdAt === "number" && Number.isSafeInteger(value.createdAt)
    && "expiresAt" in value && typeof value.expiresAt === "number" && Number.isSafeInteger(value.expiresAt)
    && "status" in value && (value.status === "active" || value.status === "expired")
}

/** Requests a server-side points redemption; the customer ID and point amount stay server-controlled. */
export async function generatePointsVoucher(): Promise<Voucher> {
  const data = await accountRequest("vouchers", {})
  if (!isVoucher(data)) throw new Error("account.error")
  return data
}

/** Validates the result of a marketing preference update at the network boundary. */
export function isMarketingPreference(value: unknown): value is MarketingPreference {
  return !!value && typeof value === "object" && "emailMarketingConsent" in value
    && typeof value.emailMarketingConsent === "boolean"
    && "emailMarketingConsentUpdatedAt" in value
    && (value.emailMarketingConsentUpdatedAt === null
      || typeof value.emailMarketingConsentUpdatedAt === "number" && Number.isSafeInteger(value.emailMarketingConsentUpdatedAt))
}

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
      !!row && typeof row === "object" && (row.kind === "purchase" || row.kind === "referral" || row.kind === "pointsVoucher")
      && Number.isSafeInteger(row.id) && Number.isSafeInteger(row.points_delta) && Number.isSafeInteger(row.created_at))
    && "vouchers" in c && Array.isArray(c.vouchers) && c.vouchers.every(isVoucher)
    && "emailMarketingConsent" in c && typeof c.emailMarketingConsent === "boolean"
    && "emailMarketingConsentUpdatedAt" in c
    && (c.emailMarketingConsentUpdatedAt === null
      || typeof c.emailMarketingConsentUpdatedAt === "number" && Number.isSafeInteger(c.emailMarketingConsentUpdatedAt))
}
