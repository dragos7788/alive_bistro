import { createInstance } from "i18next"
import { I18nextProvider } from "react-i18next"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import Menu from "../../pages/Menu"
import { MenuBuilder } from "../menu-builder/MenuBuilder"
import { menuData } from "../menu/seed"
import ro from "../../locales/ro.json"

const i18n = createInstance()
await i18n.init({ lng: "ro", resources: { ro: { translation: ro } }, interpolation: { escapeValue: false } })

describe("global storefront purchase controls", () => {
  it.each([true, false])("keeps the menu and Performance calculator visible with sales enabled=%s", isSalesEnabled => {
    const cart = { items: [], error: "", addProduct: vi.fn(() => true), setQuantity: vi.fn(() => true) }
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <Menu cart={cart} menuGroups={menuData} isSalesEnabled={isSalesEnabled} />
        <MenuBuilder onAddToCart={cart.addProduct} cartError="" isSalesEnabled={isSalesEnabled} />
      </I18nextProvider>,
    )

    expect(html).toContain('id="menu-title"')
    expect(html).toContain('id="builder-title"')
    expect(html).toContain('id="menu-calculator"')
    expect(html).toContain(i18n.t("builder.reset"))
    expect(html.includes(i18n.t("cart.add"))).toBe(isSalesEnabled)
    expect(html.includes(i18n.t("cart.open"))).toBe(isSalesEnabled)
    expect(html.includes(i18n.t("builder.orderNote"))).toBe(isSalesEnabled)
  })
})
