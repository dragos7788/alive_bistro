// Completați cu datele reale ale societății înainte de publicare; BT le verifică pe pagina Contact.
export const company = {
  tradeName: "ALIVE Bistro",
  legalName: "Live Well S.R.L.",
  taxId: "RO53384964",
  registrationNumber: null,
  address: "Str. Mureș nr. 115A, corp D, Timișoara",
  phone: "0737 263 469",
  email: "adela.asanache@gmail.com",
} as const

export const legalPages = ["terms", "cancellation", "returns", "privacy", "contact"] as const
export type LegalPageId = typeof legalPages[number]

export function legalPageFromPath(pathname: string): LegalPageId | null {
  const match = /^\/legal\/([a-z]+)\/?$/.exec(pathname)
  const id = match?.[1]
  return legalPages.find(page => page === id) ?? null
}
