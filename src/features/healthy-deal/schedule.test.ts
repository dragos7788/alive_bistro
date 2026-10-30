import { describe, expect, it } from "vitest"
import { defaultHealthyDealSettings, parseHealthyDealSettings, resolveHealthyDeal, healthyDealItem } from "./schedule"

const settings = () => structuredClone(defaultHealthyDealSettings)

describe("Healthy Deal schedule", () => {
  it("uses the Bucharest date, including midnight and daylight saving time", () => {
    expect(resolveHealthyDeal(settings(), new Date("2026-11-01T22:30:00Z")).date).toBe("2026-11-02")
    expect(resolveHealthyDeal(settings(), new Date("2026-07-06T09:00:00Z")).orderable).toBe(true)
    expect(resolveHealthyDeal(settings(), new Date("2026-11-02T10:00:00Z")).orderable).toBe(true)
  })

  it.each([
    ["2026-11-02T09:59:59Z", false],
    ["2026-11-02T10:00:00Z", true],
    ["2026-11-02T13:59:59Z", true],
    ["2026-11-02T14:00:00Z", false],
  ])("enforces the inclusive opening and exclusive closing boundary at %s", (date, orderable) => {
    expect(resolveHealthyDeal(settings(), new Date(date)).orderable).toBe(orderable)
  })

  it("prefers date overrides and lets a disabled override explicitly close a day", () => {
    const config = settings()
    const monday = config.weekly["1"]!
    config.overrides["2026-11-02"] = { ...monday, main: { ...monday.main, name: "Ofertă specială" } }
    expect(resolveHealthyDeal(config, new Date("2026-11-02T11:00:00Z")).entry?.main.name).toBe("Ofertă specială")
    config.overrides["2026-11-02"].enabled = false
    expect(resolveHealthyDeal(config, new Date("2026-11-02T11:00:00Z")).entry).toBeNull()
  })

  it("has no weekend offer unless explicitly configured and respects the global switch", () => {
    const config = settings()
    expect(resolveHealthyDeal(config, new Date("2026-11-07T11:00:00Z")).entry).toBeNull()
    config.overrides["2026-11-07"] = config.weekly["1"]!
    expect(resolveHealthyDeal(config, new Date("2026-11-07T11:00:00Z")).orderable).toBe(true)
    config.enabled = false
    expect(resolveHealthyDeal(config, new Date("2026-11-07T11:00:00Z")).orderable).toBe(false)
  })

  it("changes cart identity on a different day or saved revision", () => {
    const config = settings()
    const monday = healthyDealItem(config, 1, new Date("2026-11-02T11:00:00Z"))!
    expect(monday.price).toBe("39 lei")
    expect(monday.cartKey).not.toBe(healthyDealItem(config, 1, new Date("2026-11-03T11:00:00Z"))!.cartKey)
    expect(monday.cartKey).not.toBe(healthyDealItem(config, 2, new Date("2026-11-02T11:00:00Z"))!.cartKey)
    expect(healthyDealItem(config, 1, new Date("2026-11-02T14:00:00Z"))?.isAvailable).toBe(false)
  })

  it("does not fabricate missing macros and sums complete dish macros", () => {
    const config = settings()
    const now = new Date("2026-11-02T11:00:00Z")
    expect(healthyDealItem(config, 0, now)?.macros).toBeUndefined()
    config.weekly["1"]!.soup.macros = { calories: 100, protein: 2, carbs: 10, fat: 4 }
    config.weekly["1"]!.main.macros = { calories: 400, protein: 30, carbs: 40, fat: 10 }
    expect(healthyDealItem(config, 0, now)?.macros).toEqual({ calories: 500, protein: "32 g", carbs: "50 g", fat: "14 g" })
  })

  it.each([
    null, {}, { ...settings(), priceBani: -1 }, { ...settings(), priceBani: 1.5 },
    { ...settings(), startTime: "16:00", endTime: "12:00" },
    { ...settings(), endTime: "25:00" },
    { ...settings(), overrides: { "2026-02-30": settings().weekly["1"] } },
    { ...settings(), overrides: { "2026-99-99": settings().weekly["1"] } },
    { ...settings(), weekly: { "8": settings().weekly["1"] } },
  ])("rejects malformed configuration %#", input => {
    expect(() => parseHealthyDealSettings(input)).toThrow()
  })

  it("rejects unsafe images, oversized text and negative nutrition", () => {
    for (const change of [
      { image: "javascript:alert(1)" }, { name: "a".repeat(201) },
      { macros: { calories: -1, protein: 1, carbs: 1, fat: 1 } },
    ]) {
      const config = settings()
      Object.assign(config.weekly["1"]!.main, change)
      expect(() => parseHealthyDealSettings(config)).toThrow()
    }
  })

  it("accepts defaults and uploaded image paths", () => {
    const config = settings()
    config.weekly["1"]!.main.image = "/api/images/menu-123.webp"
    expect(parseHealthyDealSettings(config)).toEqual(config)
  })
})
