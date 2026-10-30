import { createInstance } from "i18next"
import { I18nextProvider } from "react-i18next"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { LegalPage } from "./LegalPage"
import { legalPageFromPath, legalPages } from "./company"
import ro from "../../locales/ro.json"
import en from "../../locales/en.json"

const i18n = createInstance()
await i18n.init({
  lng: "ro",
  resources: { ro: { translation: ro }, en: { translation: en } },
  interpolation: { escapeValue: false },
})

describe("legalPageFromPath", () => {
  it.each(legalPages)("legalPageFromPath_%s_returnsId", id => {
    expect(legalPageFromPath(`/legal/${id}`)).toBe(id)
    expect(legalPageFromPath(`/legal/${id}/`)).toBe(id)
  })

  it.each(["/legal", "/legal/unknown", "/menu", "/legal/terms/x"])("legalPageFromPath_%s_returnsNull", path => {
    expect(legalPageFromPath(path)).toBeNull()
  })
})

describe("LegalPage", () => {
  it.each(legalPages)("LegalPage_%s_rendersTitleAndSections", id => {
    const html = renderToStaticMarkup(<I18nextProvider i18n={i18n}><LegalPage pageId={id} /></I18nextProvider>)

    expect(html).toContain(i18n.t(`legal.${id}.title`))
    expect(html).toContain("<h2")
  })

  it("LegalPage_contact_showsCompanyFields", () => {
    const html = renderToStaticMarkup(<I18nextProvider i18n={i18n}><LegalPage pageId="contact" /></I18nextProvider>)

    expect(html).toContain("CUI")
    expect(html).toContain("0737263469")
    expect(html).toContain("Live Well S.R.L.")
    expect(html).not.toContain("de completat")
    expect(html).not.toContain("Nr. Reg. Com.")
  })

  it("LegalPage_privacy_showsControllerAndPushRetention", () => {
    const html = renderToStaticMarkup(<I18nextProvider i18n={i18n}><LegalPage pageId="privacy" /></I18nextProvider>)

    expect(html).toContain("RO53384964")
    expect(html).toContain("adela.asanache@gmail.com")
    expect(html).toContain("12 luni")
    expect(html).toContain("notificări push")
  })

  it("locales_roAndEn_haveSameSectionCounts", () => {
    for (const id of legalPages) {
      expect(en.legal[id].sections.length).toBe(ro.legal[id].sections.length)
    }
  })
})
