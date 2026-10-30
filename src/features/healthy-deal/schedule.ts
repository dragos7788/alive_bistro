import type { MenuItem } from "../menu/types"

export type DealMacros = { calories: number; protein: number; carbs: number; fat: number }
export type DealDish = {
  name: string
  description: string
  allergens: string
  grams: number | null
  macros: DealMacros | null
  image: string
}
export type DealEntry = { enabled: boolean; soup: DealDish; main: DealDish }
export type HealthyDealSettings = {
  enabled: boolean
  priceBani: number
  startTime: string
  endTime: string
  weekly: Record<string, DealEntry>
  overrides: Record<string, DealEntry>
}
export type HealthyDealDocument = { revision: number; settings: HealthyDealSettings }
export const dealDays = ["1", "2", "3", "4", "5", "6", "0"] as const
export const healthyDealCategoryId = "healthy-deal"

/** Creates an editable, incomplete dish without inventing nutrition or allergens. */
export function emptyDealDish(name = ""): DealDish {
  return { name, description: "", allergens: "", grams: null, macros: null, image: "" }
}

const mains = [
  "Stir Fry de pui cu legume și orez cu lapte de cocos",
  "Piept de curcan cu ragu de linte roșie și sos de iaurt cu mărar și usturoi",
  "Paste integrale cu ragu din carne de vită și mix de salată verde BIO cu dressing vinegretă de citrice",
  "Piept de pui cu sote de quinoa și broccoli, salată de gulie cu sos de iaurt și mentă",
  "Păstrăv cu legume la grătar, mămăligă pe plită și sos de usturoi cu legume coapte",
]

export const defaultHealthyDealSettings: HealthyDealSettings = {
  enabled: true, priceBani: 3900, startTime: "12:00", endTime: "16:00",
  weekly: Object.fromEntries(mains.map((name, index) => [String(index + 1), {
    enabled: true,
    soup: { ...emptyDealDish("Supă-cremă de legume a zilei"), image: "default-soup" },
    main: { ...emptyDealDish(name), image: "default-main" },
  }])),
  overrides: {},
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Date Healthy Deal invalide.")
  return Object.fromEntries(Object.entries(value))
}

function text(value: unknown, limit: number, required = false): string {
  if (typeof value !== "string" || value.length > limit || (required && !value.trim())) {
    throw new Error("Completează denumirile și respectă lungimea maximă a textelor.")
  }
  return value.trim()
}

function number(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) {
    throw new Error("Gramajele și valorile nutriționale trebuie să fie numere pozitive sau zero.")
  }
  return value
}

/** Accepts real ISO dates only, including leap-year validation. */
export function isDealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "2000-01-01" && value <= "2100-12-31"
    && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function dish(value: unknown, required: boolean): DealDish {
  const raw = object(value)
  const image = text(raw.image, 300)
  if (image && !["default-soup", "default-main"].includes(image)
    && !/^\/api\/images\/[a-zA-Z0-9._-]+$/.test(image)) throw new Error("Imagine Healthy Deal invalidă.")
  const macros = raw.macros === null ? null : object(raw.macros)
  return {
    name: text(raw.name, 200, required), description: text(raw.description, 3000),
    allergens: text(raw.allergens, 1000), image,
    grams: raw.grams === null ? null : number(raw.grams, 10000),
    macros: macros === null ? null : {
      calories: number(macros.calories, 20000), protein: number(macros.protein, 2000),
      carbs: number(macros.carbs, 2000), fat: number(macros.fat, 2000),
    },
  }
}

function entry(value: unknown): DealEntry {
  const raw = object(value)
  if (typeof raw.enabled !== "boolean") throw new Error("Stare meniu invalidă.")
  return { enabled: raw.enabled, soup: dish(raw.soup, raw.enabled), main: dish(raw.main, raw.enabled) }
}

/** Validates the complete persisted settings at both API boundaries. */
export function parseHealthyDealSettings(value: unknown): HealthyDealSettings {
  const raw = object(value)
  if (typeof raw.enabled !== "boolean" || !Number.isSafeInteger(raw.priceBani)
    || typeof raw.priceBani !== "number" || raw.priceBani < 1 || raw.priceBani > 100000
    || typeof raw.startTime !== "string" || typeof raw.endTime !== "string"
    || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw.startTime)
    || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw.endTime) || raw.startTime >= raw.endTime) {
    throw new Error("Verifică prețul și intervalul orar (în aceeași zi).")
  }
  const weekly = object(raw.weekly)
  const overrides = object(raw.overrides)
  if (Object.keys(weekly).some(key => !dealDays.some(day => day === key))
    || Object.keys(overrides).length > 366 || Object.keys(overrides).some(key => !isDealDate(key))) {
    throw new Error("Program săptămânal sau date calendaristice invalide (maximum 366 excepții).")
  }
  return {
    enabled: raw.enabled, priceBani: raw.priceBani, startTime: raw.startTime, endTime: raw.endTime,
    weekly: Object.fromEntries(Object.entries(weekly).map(([key, value]) => [key, entry(value)])),
    overrides: Object.fromEntries(Object.entries(overrides).map(([key, value]) => [key, entry(value)])),
  }
}

/** Resolves a date-specific override before the recurring weekday in Romania. */
export function resolveHealthyDeal(settings: HealthyDealSettings, now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)!.value
  const date = `${part("year")}-${part("month")}-${part("day")}`
  const weekday = String(new Date(`${date}T12:00:00Z`).getUTCDay())
  const time = `${part("hour")}:${part("minute")}`
  const selected = settings.overrides[date] ?? settings.weekly[weekday]
  const entry = settings.enabled && selected?.enabled ? selected : null
  return { date, weekday, entry, orderable: !!entry && time >= settings.startTime && time < settings.endTime }
}

/** Produces the same date/revision-specific cart product on the client and server. */
export function healthyDealItem(settings: HealthyDealSettings, revision: number, now: Date): MenuItem | null {
  const { entry, date, orderable } = resolveHealthyDeal(settings, now)
  if (!entry) return null
  const soup = entry.soup.macros
  const main = entry.main.macros
  const sum = (key: keyof DealMacros) => Math.round((soup![key] + main![key]) * 100) / 100
  return {
    name: `Healthy Deal · ${date} · ${entry.soup.name} + ${entry.main.name}`,
    cartKey: JSON.stringify([healthyDealCategoryId, date, revision]),
    description: `${entry.soup.name} + ${entry.main.name}`,
    price: `${settings.priceBani / 100} lei`, isAvailable: orderable,
    ...(soup && main ? { macros: {
      calories: sum("calories"), protein: `${sum("protein")} g`, carbs: `${sum("carbs")} g`, fat: `${sum("fat")} g`,
    } } : {}),
  }
}
