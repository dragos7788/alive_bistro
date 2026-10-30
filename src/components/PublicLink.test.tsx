import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { PublicLink } from "./PublicLink"

describe("public navigation links", () => {
  it.each(["/menu", "/build-your-plate", "/legal/privacy", "/#community"])(
    "preserves the public destination %s",
    href => {
      const html = renderToStaticMarkup(
        <MemoryRouter><PublicLink href={href}>Destination</PublicLink></MemoryRouter>,
      )

      expect(html).toContain(`href="${href}"`)
      expect(html).toContain(">Destination</a>")
    },
  )

  it.each(["/account", "/admin/orders", "/api/auth/google", "#account", "https://example.com", "//example.com"])(
    "keeps native navigation for %s",
    href => {
      const html = renderToStaticMarkup(
        <MemoryRouter><PublicLink href={href}>Destination</PublicLink></MemoryRouter>,
      )

      expect(html).toBe(`<a href="${href}">Destination</a>`)
    },
  )

  it("retains standard new-tab attributes", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter><PublicLink href="/menu" target="_blank" rel="noopener">Menu</PublicLink></MemoryRouter>,
    )

    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener"')
  })
})
