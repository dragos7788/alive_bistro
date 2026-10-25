import { describe, expect, it } from "vitest"
import { normalizeContact, validateContact } from "./checkout"

const valid = { name: "Ana Maria", phone: "+40 721 123 456", email: "ana@example.ro" }

describe("guest checkout contact validation", () => {
  it("accepts contact details without an account", () => {
    expect(validateContact(valid)).toEqual({})
  })
  it("normalizes surrounding whitespace", () => {
    expect(normalizeContact({ name: " Ana ", phone: " 0721123456 ", email: " ana@example.ro " }))
      .toEqual({ name: "Ana", phone: "0721123456", email: "ana@example.ro" })
  })
  it.each(["", " ", "A", "a".repeat(101), "Ana\nMaria"])("rejects invalid name %j", name => {
    expect(validateContact({ ...valid, name }).name).toBe("checkout.nameError")
  })
  it.each(["", "123456", "+1234567890123456", "0721abc456", "++40721123456", "123/456789"])(
    "rejects invalid phone %j", phone => {
      expect(validateContact({ ...valid, phone }).phone).toBe("checkout.phoneError")
    },
  )
  it.each(["1234567", "+123456789012345", "0721 123 456", "+40 (721) 123-456"])(
    "accepts supported phone format %j", phone => {
      expect(validateContact({ ...valid, phone })).toEqual({})
    },
  )
  it.each(["", "ana", "ana@", "@example.ro", "a b@example.ro", "a@b@c.ro", `${"a".repeat(250)}@b.ro`])(
    "rejects invalid email %j", email => {
      expect(validateContact({ ...valid, email }).email).toBe("checkout.emailError")
    },
  )
  it("reports all missing fields together", () => {
    expect(Object.keys(validateContact({ name: "", phone: "", email: "" }))).toEqual(["name", "phone", "email"])
  })
})
