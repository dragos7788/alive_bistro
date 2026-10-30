import { createInstance } from "i18next"
import { I18nextProvider } from "react-i18next"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { HealthyDealMenu } from "./HealthyDealMenu"
import { defaultHealthyDealSettings, type HealthyDealSettings } from "./schedule"
import { dealAssets } from "./assets"
import ro from "../../locales/ro.json"
import en from "../../locales/en.json"

const i18n = createInstance()
await i18n.init({ lng: "ro", resources: { ro: { translation: ro }, en: { translation: en } }, interpolation: { escapeValue: false } })

function render(date: string, sales = true, error = false, settings: HealthyDealSettings = defaultHealthyDealSettings) {
  return renderToStaticMarkup(<I18nextProvider i18n={i18n}>
    <HealthyDealMenu document={error ? null : { revision: 0, settings }}
      now={new Date(date)} error={error} isSalesEnabled={sales} items={[]} onAdd={vi.fn()} />
  </I18nextProvider>)
}
describe("Healthy Deal public presentation", () => {
  it.each([true, false])("shows ingredients, nutrition and then allergens for both dishes (nutrition supplied: %s)", (hasNutrition) => {
    const settings = structuredClone(defaultHealthyDealSettings)
    for (const dish of [settings.weekly["1"].soup, settings.weekly["1"].main]) {
      dish.description = "Ingrediente: morcovi, ceapă"
      dish.allergens = "Țelină"
      dish.macros = hasNutrition ? { calories: 200, protein: 10, carbs: 20, fat: 5 } : null
    }

    const html = render("2026-11-02T11:00:00Z", true, false, settings)
    const articles = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? []

    expect(articles).toHaveLength(2)
    for (const article of articles) {
      const ingredients = article.indexOf("Ingrediente: morcovi, ceapă")
      const nutrition = article.indexOf(hasNutrition ? "<dl" : i18n.t("healthyDeal.nutritionPending"))
      const allergens = article.indexOf(i18n.t("healthyDeal.allergens"))
      expect(ingredients).toBeGreaterThan(-1)
      expect(nutrition).toBeGreaterThan(ingredients)
      expect(allergens).toBeGreaterThan(nutrition)
    }
  })
  it("uses the supplied PNG artwork for the price stamp, opening hours and weekly banner", () => {
    const html = render("2026-11-02T11:00:00Z")
    for (const asset of [dealAssets.stamp, dealAssets.hours, dealAssets.brush]) {
      expect(html).toContain(`src="${asset}"`)
    }
  })
  it("omits unconfigured weekends from the weekly list", () => {
    const html = render("2026-11-02T11:00:00Z")
    expect(html).not.toContain("sâmbătă")
    expect(html).not.toContain("duminică")
    expect(html).not.toContain(i18n.t("healthyDeal.closed"))
  })
  it("includes a scheduled weekend override but omits an explicitly closed weekday", () => {
    const settings = structuredClone(defaultHealthyDealSettings)
    settings.overrides["2026-11-07"] = settings.weekly["1"]
    settings.overrides["2026-11-03"] = { ...settings.weekly["2"], enabled: false }
    const html = render("2026-11-02T11:00:00Z", true, false, settings)
    expect(html).toContain("sâmbătă")
    expect(html).not.toContain("marți")
    expect(html).not.toContain(`src="${dealAssets.hours}"`)
  })
  it("keeps edited hours instead of displaying the default hours artwork", () => {
    const settings = { ...defaultHealthyDealSettings, startTime: "11:30", endTime: "15:30" }
    const html = render("2026-11-02T11:00:00Z", true, false, settings)
    expect(html).toContain("11:30")
    expect(html).toContain("15:30")
    expect(html).not.toContain(`src="${dealAssets.hours}"`)
  })
  it("shows today's dishes, the weekly menu and a purchase control during lunch", () => {
    const html = render("2026-11-02T11:00:00Z")
    expect(html).toContain("Stir Fry")
    expect(html).toContain("Păstrăv")
    expect(html).toContain("39")
    expect(html).toContain("12:00")
    expect(html).toContain(i18n.t("healthyDeal.nutritionPending"))
    expect(html).toContain(i18n.t("cart.add"))
    expect(html).not.toContain("healthyDeal.")
  })
  it.each([["2026-11-02T14:00:00Z", true], ["2026-11-02T11:00:00Z", false]])(
    "does not offer a purchase outside lunch or when global sales are disabled", (date, sales) => {
      expect(render(date, sales)).not.toContain('aria-label="Adaugă Healthy Deal')
    },
  )
  it("shows an explicit weekend empty state instead of the previous day's offer", () => {
    expect(render("2026-11-07T11:00:00Z")).toContain(i18n.t("healthyDeal.noOffer"))
  })
  it("announces unavailable API data and renders no purchase action", () => {
    const html = render("2026-11-02T11:00:00Z", true, true)
    expect(html).toContain('role="alert"')
    expect(html).toContain(i18n.t("healthyDeal.loadError"))
    expect(html).not.toContain('aria-label="Adaugă')
  })
  it("renders translated public labels in English", async () => {
    await i18n.changeLanguage("en")
    try {
      expect(render("2026-11-02T11:00:00Z")).toContain("This week")
      expect(render("2026-11-07T11:00:00Z")).toContain(en.healthyDeal.noOffer)
    } finally { await i18n.changeLanguage("ro") }
  })
})
