import { createInstance } from "i18next"
import { I18nextProvider } from "react-i18next"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import Menu from "../../pages/Menu"
import PlateBuilder from "../../pages/PlateBuilder"
import { menuData } from "../menu/seed"
import ro from "../../locales/ro.json"

const i18n = createInstance()
await i18n.init({ lng: "ro", resources: { ro: { translation: ro } }, interpolation: { escapeValue: false } })

describe("global storefront purchase controls", () => {
  it.each([true, false])("keeps the menu available with sales enabled=%s", isSalesEnabled => {
    const cart = { items: [], error: "", addProduct: vi.fn(() => true), setQuantity: vi.fn(() => true) }
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <Menu cart={cart} menuGroups={menuData} isSalesEnabled={isSalesEnabled}
          healthyDeal={{ document: null, error: false, now: new Date("2026-11-02T11:00:00Z") }} />
      </I18nextProvider>,
    )

    expect(html).toContain('id="menu-title"')
    expect(html).not.toContain('id="builder-title"')
    expect(html).toContain('href="/build-your-plate"')
    expect(html).not.toContain('aria-current="page"')
    expect(html.includes(i18n.t("cart.open"))).toBe(isSalesEnabled)
  })

  it.each([true, false])("shows a standalone builder with shared navigation without a redundant return link with sales enabled=%s", isSalesEnabled => {
    const cart = { items: [], error: "", addProduct: vi.fn(() => true), setQuantity: vi.fn(() => true) }

    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <PlateBuilder cart={cart} menuGroups={menuData} isSalesEnabled={isSalesEnabled} />
      </I18nextProvider>,
    )

    expect(html).not.toContain('href="/menu"')
    expect(html).not.toContain(i18n.t("builder.backToMenu"))
    expect(html).not.toContain(i18n.t("builder.start"))
    expect(html).toContain('href="/menu?group=food"')
    expect(html).toContain('href="/menu?group=drinks"')
    expect(html).toContain('href="/build-your-plate" aria-current="page"')
    expect(html).toContain('<h1 id="builder-title"')
    expect(html).toContain('id="menu-calculator"')
    expect(html).toContain(`aria-label="${i18n.t("builder.stepsLabel")}"`)
    for (const group of ["protein", "carbs", "fibre", "sauce"]) {
      expect(html).toContain(`href="#builder-step-${group}"`)
      expect(html).toContain(`id="builder-step-${group}"`)
    }
    expect(html).not.toContain(i18n.t("builder.progress", { selected: 0, total: 4 }))
    expect(html).not.toContain('id="menu-title"')
    expect(html).toContain(i18n.t("builder.reset"))
    expect(html.includes(i18n.t("cart.add"))).toBe(isSalesEnabled)
    expect(html.includes(i18n.t("cart.open"))).toBe(isSalesEnabled)
    expect(html.includes(i18n.t("builder.orderNote"))).toBe(isSalesEnabled)
  })
})
