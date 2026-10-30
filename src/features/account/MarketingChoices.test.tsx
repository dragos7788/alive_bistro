import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import ro from "../../locales/ro.json"
import { MarketingChoices } from "./MarketingChoices"

await i18n.use(initReactI18next).init({ lng: "ro", resources: { ro: { translation: ro } }, initAsync: false })
afterEach(() => vi.unstubAllGlobals())

describe("optional marketing choices", () => {
  it("renders two unchecked choices and one save action", () => {
    vi.stubGlobal("window", { isSecureContext: true, PushManager: {}, Notification: {} })
    vi.stubGlobal("navigator", { serviceWorker: {} })
    const html = renderToStaticMarkup(<MarketingChoices email="customer@example.com" offerEmail offerPush
      onUpdated={() => {}} onSaved={() => {}} />)

    expect(html.match(/type="checkbox"/g)).toHaveLength(2)
    expect(html).not.toContain('checked=""')
    expect(html.match(/type="submit"/g)).toHaveLength(1)
    expect(html).toContain(i18n.t("marketingInvitation.saving"))
    expect(html).toContain('href="/legal/privacy"')
  })

  it("allows saving email-only choices without loading push", () => {
    const html = renderToStaticMarkup(<MarketingChoices email="customer@example.com" offerEmail offerPush={false}
      onUpdated={() => {}} onSaved={() => {}} />)

    expect(html).toContain(i18n.t("marketingInvitation.save"))
    expect(html).not.toContain('disabled=""')
    expect(html.match(/type="checkbox"/g)).toHaveLength(1)
  })

  it("keeps email available and explains unsupported push", () => {
    vi.stubGlobal("window", undefined)
    const html = renderToStaticMarkup(<MarketingChoices email="customer@example.com" offerEmail offerPush
      onUpdated={() => {}} onSaved={() => {}} />)

    expect(html).toContain(i18n.t("push.unsupported"))
    expect(html).toMatch(/type="checkbox" disabled=""/)
    expect(html).toContain("customer@example.com")
  })
})
