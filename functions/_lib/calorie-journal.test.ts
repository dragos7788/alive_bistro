import { describe, expect, it } from "vitest"
import { isValidJournalDate, parseCalorieGoal, parseJournalEntry } from "./calorie-journal"

describe("calorie journal validation", () => {
  it("accepts real calendar dates, including leap days", () => {
    expect(isValidJournalDate("2024-02-29")).toBe(true)
    expect(isValidJournalDate("2025-02-29")).toBe(false)
    expect(isValidJournalDate("2025-13-01")).toBe(false)
  })

  it("trims a valid entry and preserves optional nutrition values", () => {
    expect(parseJournalEntry({
      requestKey: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      consumedOn: "2026-10-26",
      foodName: "  Oat bowl  ",
      servings: 1.5,
      calories: 420,
      protein: 18,
      carbs: 52,
      fat: null,
    })).toEqual({
      requestKey: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      consumedOn: "2026-10-26",
      foodName: "Oat bowl",
      servings: 1.5,
      calories: 420,
      protein: 18,
      carbs: 52,
      fat: null,
    })
  })

  it("rejects invalid dates and out-of-range nutrition inputs", () => {
    const valid = {
      requestKey: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      consumedOn: "2026-10-26",
      foodName: "Meal",
      servings: 1,
      calories: 300,
      protein: 20,
      carbs: null,
      fat: null,
    }
    expect(parseJournalEntry({ ...valid, consumedOn: "2026-02-30" })).toBeNull()
    expect(parseJournalEntry({ ...valid, servings: 0 })).toBeNull()
    expect(parseJournalEntry({ ...valid, calories: Infinity })).toBeNull()
    expect(parseJournalEntry({ ...valid, protein: -1 })).toBeNull()
    expect(parseJournalEntry({ ...valid, foodName: " " })).toBeNull()
  })

  it("accepts only integer daily goals from 500 to 10000 kcal", () => {
    expect(parseCalorieGoal({ targetCalories: 500 })).toBe(500)
    expect(parseCalorieGoal({ targetCalories: 10000 })).toBe(10000)
    expect(parseCalorieGoal({ targetCalories: 499 })).toBeNull()
    expect(parseCalorieGoal({ targetCalories: 2000.5 })).toBeNull()
  })
})
