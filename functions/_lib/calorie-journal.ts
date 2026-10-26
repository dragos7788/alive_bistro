export type CalorieJournalEntryInput = {
  requestKey: string
  consumedOn: string
  foodName: string
  servings: number
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
}

function isFiniteInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
}

export function isValidJournalDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function parseJournalEntry(value: unknown): CalorieJournalEntryInput | null {
  if (!value || typeof value !== "object") return null
  const input = value as Record<string, unknown>
  const foodName = typeof input.foodName === "string" ? input.foodName.trim() : ""
  const requestKey = typeof input.requestKey === "string" ? input.requestKey : ""
  const isOptionalNutrient = (item: unknown): item is number | null =>
    item === null || isFiniteInRange(item, 0, 20000)

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey)
    || !isValidJournalDate(input.consumedOn) || foodName.length < 1 || foodName.length > 100
    || !isFiniteInRange(input.servings, 0.1, 20)
    || !isFiniteInRange(input.calories, 0, 200000)
    || !isOptionalNutrient(input.protein) || !isOptionalNutrient(input.carbs) || !isOptionalNutrient(input.fat)) return null

  return {
    requestKey,
    consumedOn: input.consumedOn,
    foodName,
    servings: input.servings,
    calories: input.calories,
    protein: input.protein,
    carbs: input.carbs,
    fat: input.fat,
  }
}

export function parseCalorieGoal(value: unknown): number | null {
  if (!value || typeof value !== "object" || !("targetCalories" in value)) return null
  const target = value.targetCalories
  return typeof target === "number" && Number.isSafeInteger(target) && target >= 500 && target <= 10000
    ? target : null
}
