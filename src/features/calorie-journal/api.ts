export type JournalEntry = {
  id: string
  consumedOn: string
  foodName: string
  servings: number
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  createdAt: number
}

export type JournalData = { entries: JournalEntry[]; targetCalories: number }
export type JournalEntryInput = Omit<JournalEntry, "id" | "createdAt"> & { requestKey: string }

async function request(path: string, method = "GET", body?: object, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  })
  const json: unknown = await response.json()
  if (!response.ok) throw new Error("calorieJournal.error")
  if (!json || typeof json !== "object" || !("data" in json)) throw new Error("calorieJournal.error")
  return json.data
}

function isJournalEntry(value: unknown): value is JournalEntry {
  if (!value || typeof value !== "object") return false
  const entry = value as Record<string, unknown>
  const validMacro = (macro: unknown) => macro === null || (typeof macro === "number" && Number.isFinite(macro) && macro >= 0)
  return typeof entry.id === "string" && typeof entry.consumedOn === "string"
    && typeof entry.foodName === "string" && typeof entry.servings === "number"
    && typeof entry.calories === "number" && validMacro(entry.protein) && validMacro(entry.carbs)
    && validMacro(entry.fat) && typeof entry.createdAt === "number"
}

export function isJournalData(value: unknown): value is JournalData {
  if (!value || typeof value !== "object" || !("entries" in value) || !Array.isArray(value.entries)
    || !("targetCalories" in value) || typeof value.targetCalories !== "number") return false
  return Number.isSafeInteger(value.targetCalories) && value.targetCalories >= 500 && value.targetCalories <= 10000
    && value.entries.every(isJournalEntry)
}

export async function getJournal(date: string, signal?: AbortSignal): Promise<JournalData> {
  const data = await request(`/api/customer/calories?date=${encodeURIComponent(date)}`, "GET", undefined, signal)
  if (!isJournalData(data)) throw new Error("calorieJournal.error")
  return data
}

export async function addJournalEntry(entry: JournalEntryInput): Promise<void> {
  await request("/api/customer/calories", "POST", entry)
}

export async function saveCalorieGoal(targetCalories: number): Promise<void> {
  await request("/api/customer/calories", "PATCH", { targetCalories })
}

export async function deleteJournalEntry(id: string): Promise<void> {
  await request(`/api/customer/calories/${encodeURIComponent(id)}`, "DELETE")
}
