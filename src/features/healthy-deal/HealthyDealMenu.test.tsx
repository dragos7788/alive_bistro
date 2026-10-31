/// <reference types="node" />
import { createInstance } from "i18next"
import { I18nextProvider } from "react-i18next"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { HealthyDealMenu } from "./HealthyDealMenu"
import { defaultHealthyDealSettings, type HealthyDealSettings } from "./schedule"
import { dealAssets } from "./assets"
import ro from "../../locales/ro.json"
import en from "../../locales/en.json"
import { readFileSync } from "node:fs"
import { DatabaseSync } from "node:sqlite"

const i18n = createInstance()
await i18n.init({ lng: "ro", resources: { ro: { translation: ro }, en: { translation: en } }, interpolation: { escapeValue: false } })

function render(date: string, sales = true, error = false, settings: HealthyDealSettings = defaultHealthyDealSettings) {
  return renderToStaticMarkup(<I18nextProvider i18n={i18n}>
    <HealthyDealMenu document={error ? null : { revision: 0, settings }}
      now={new Date(date)} error={error} isSalesEnabled={sales} items={[]} onAdd={vi.fn()} />
  </I18nextProvider>)
}
describe("Healthy Deal public presentation", () => {
  it.each([true, false])("hides preview tools while preserving day selection and ordering rules with preview=%s", allowPreview => {
    const html = renderToStaticMarkup(<I18nextProvider i18n={i18n}>
      <HealthyDealMenu document={{ revision: 5, settings: defaultHealthyDealSettings }}
        now={new Date("2026-11-02T11:00:00Z")} error={false} isSalesEnabled
        items={[]} onAdd={vi.fn()} allowPreview={allowPreview} />
    </I18nextProvider>)

    expect(html).not.toContain('type="date"')
    for (const key of ["previewNotice", "previewDate", "previousWeek", "nextWeek"]) {
      expect(html).not.toContain(i18n.t(`healthyDeal.${key}`))
    }
    expect(html.includes('aria-pressed="true"')).toBe(allowPreview)
    expect(html.includes(i18n.t("cart.add"))).toBe(!allowPreview)
  })
  it.each([true, false])("shows ingredients, nutrition and then allergens for both dishes (nutrition supplied: %s)", (hasNutrition) => {
    const settings = structuredClone(defaultHealthyDealSettings)
    for (const dish of [settings.weekly["1"].soup, settings.weekly["1"].main]) {
      dish.description = "Ingrediente: morcovi, ceapă"
      dish.allergens = "Țelină"
      dish.macros = hasNutrition ? { calories: 200, protein: 10, carbs: 20, fat: 5 } : null
    }

    const html = render("2026-11-02T11:00:00Z", true, false, settings)
    const articles = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? []

    expect(articles).toHaveLength(10)
    expect(html.match(/<details\b/g)).toHaveLength(5)
    for (const article of articles.slice(0, 2)) {
      const ingredients = article.indexOf("Ingrediente: morcovi, ceapă")
      const nutrition = article.indexOf("<dl")
      const allergens = article.indexOf(i18n.t("healthyDeal.allergens"))
      expect(ingredients).toBeGreaterThan(-1)
      if (hasNutrition) {
        expect(nutrition).toBeGreaterThan(ingredients)
        expect(allergens).toBeGreaterThan(nutrition)
      } else {
        expect(article).not.toContain(i18n.t("healthyDeal.nutritionPending"))
        expect(allergens).toBeGreaterThan(ingredients)
      }
    }
  })
  it("previews the imported November week from database data with complete menu nutrition and allergens", () => {
    const db = new DatabaseSync(":memory:")
    let settings: HealthyDealSettings
    try {
      db.exec("CREATE TABLE healthy_deal_settings (id INTEGER, config_json TEXT, revision INTEGER)")
      db.prepare("INSERT INTO healthy_deal_settings VALUES (1, ?, 4)").run(JSON.stringify(defaultHealthyDealSettings))
      db.exec(readFileSync(new URL("../../../scripts/healthy-deal-2026-11-02.sql", import.meta.url), "utf8"))
      const row = db.prepare("SELECT config_json FROM healthy_deal_settings").get()
      settings = JSON.parse(String(row?.config_json)) as HealthyDealSettings
    } finally {
      db.close()
    }

    const html = renderToStaticMarkup(<I18nextProvider i18n={i18n}>
      <HealthyDealMenu document={{ revision: 5, settings }}
        now={new Date("2026-10-31T10:00:00Z")} error={false} isSalesEnabled
        items={[]} onAdd={vi.fn()} allowPreview />
    </I18nextProvider>)

    for (const [index, calories] of [682, 628, 673, 697, 751].entries()) {
      const entry = settings.overrides[`2026-11-0${index + 2}`]
      expect(html).toContain(entry.main.name)
      expect(html).toContain(`${calories} kcal`)
      expect(html).toContain(entry.main.allergens)
    }
    expect(html).toContain("2 noiembrie 2026")
    expect(html).toContain("Valori nutriționale per meniu complet (supă + fel principal)")
    expect(html).not.toContain(i18n.t("healthyDeal.nutritionPending"))
    expect(html).not.toContain(i18n.t("healthyDeal.detailsPending"))
    expect(html.match(/<article\b/g)).toHaveLength(5)
  })
  it("keeps both illustrative PNG plates above the weekly dish details", () => {
    const html = render("2026-11-02T11:00:00Z")

    for (const asset of [dealAssets.soup, dealAssets.main]) {
      expect(html).toContain(`src="${asset}"`)
      expect(html.indexOf(`src="${asset}"`)).toBeLessThan(html.indexOf("<details"))
    }
    expect(html).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/)
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
