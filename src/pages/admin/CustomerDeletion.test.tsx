import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { CustomerDeletion } from "./CustomerDeletion"

describe("Customer deletion confirmation", () => {
  const customer = { id: "target", name: "Ana Target", email: "ana@example.com" }

  it("names the account and provides a closed, labeled dialog with destructive action disabled", () => {
    const onDeleted = vi.fn()
    const html = renderToStaticMarkup(<CustomerDeletion customer={customer} onDeleted={onDeleted} />)

    expect(html).toContain("Șterge contul Ana Target")
    expect(html).toContain("Ana Target · ana@example.com")
    expect(html).toContain('aria-labelledby="customer-deletion-dialog-title"')
    expect(html).toContain('aria-describedby="customer-deletion-warning"')
    expect(html).not.toMatch(/<dialog[^>]*\bopen(?:=|\s|>)/)
    expect(html).toMatch(/<button type="submit" disabled=""/)
    expect(html).toContain('<label for="customer-deletion-confirmation"')
    expect(html).toContain('role="status"')
    expect(html).toContain("Anulează")
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it("uses the account identifier when email is unavailable and explains retention limitations", () => {
    const html = renderToStaticMarkup(<CustomerDeletion customer={{ ...customer, email: null }} onDeleted={() => {}} />)

    expect(html).toContain("Ana Target · target")
    expect(html).toContain(">target</strong>")
    expect(html).toContain("nu poate fi anulată")
    expect(html).toContain("datele personale sunt anonimizate")
    expect(html).toContain("Comenzile TEST sunt asociate numai prin e-mail")
    expect(html).toContain("Evidența financiară verificată")
  })
})
