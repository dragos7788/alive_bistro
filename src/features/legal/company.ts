// Completați cu datele reale ale societății înainte de publicare; BT le verifică pe pagina Contact.
export const company = {
  tradeName: "ALIVE Bistro",
  legalName: "[de completat: denumirea societății, ex. SC ... SRL]",
  taxId: "[de completat: CUI]",
  registrationNumber: "[de completat: J35/.../...]",
  address: "Str. Mureș nr. 116A, Timișoara",
  phone: "0737 263 469",
  email: "[de completat: adresa de e-mail]",
} as const

export const legalPages = ["terms", "cancellation", "returns", "contact"] as const
export type LegalPageId = typeof legalPages[number]

export function legalPageFromPath(pathname: string): LegalPageId | null {
  const match = /^\/legal\/([a-z]+)\/?$/.exec(pathname)
  const id = match?.[1]
  return legalPages.find(page => page === id) ?? null
}
