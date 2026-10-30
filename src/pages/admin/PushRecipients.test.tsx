import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { PushRecipients } from "./PushRecipients"

const recipients = [
  { id: "buyer", name: "Buyer", email: "buyer@example.com", devices: 2 },
  { id: "other", name: "Other", email: null, devices: 1 },
]

describe("PushRecipients", () => {
  it("renders labeled checkboxes and identifies customers without email", () => {
    const html = renderToStaticMarkup(<PushRecipients recipients={recipients} audience="selected"
      selectedIds={["buyer"]} disabled={false} onAudienceChange={() => {}} onSelectionChange={() => {}} />)

    expect(html).toMatch(/type="checkbox"[^>]*checked=""/)
    expect(html).toContain("buyer@example.com")
    expect(html).toContain("ID: other")
    expect(html).toContain("2 dispozitive")
    expect(html.match(/type="checkbox"/g)).toHaveLength(2)
    expect(html).toContain("<label")
  })

  it("requires explicit selection and displays the empty recipient state", () => {
    const html = renderToStaticMarkup(<PushRecipients recipients={[]} audience="selected"
      selectedIds={[]} disabled={false} onAudienceChange={() => {}} onSelectionChange={() => {}} />)

    expect(html).toContain("Niciun client eligibil")
    expect(html).not.toContain('type="checkbox"')
  })

  it("does not display individual choices in broadcast mode", () => {
    const html = renderToStaticMarkup(<PushRecipients recipients={recipients} audience="all"
      selectedIds={["buyer"]} disabled={false} onAudienceChange={() => {}} onSelectionChange={() => {}} />)

    expect(html).toContain("Toti clientii cu acord push activ")
    expect(html).not.toContain('type="checkbox"')
  })

  it("disables recipient controls while sending", () => {
    const html = renderToStaticMarkup(<PushRecipients recipients={recipients} audience="selected"
      selectedIds={[]} disabled={true} onAudienceChange={() => {}} onSelectionChange={() => {}} />)

    expect(html).toContain('<fieldset disabled=""')
  })
})
