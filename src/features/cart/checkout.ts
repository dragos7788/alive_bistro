export type ContactDetails = { name: string; phone: string; email: string }
export type ContactErrors = Partial<Record<keyof ContactDetails, string>>

/** Trims guest contact details without changing their meaning. */
export function normalizeContact(details: ContactDetails): ContactDetails {
  return { name: details.name.trim(), phone: details.phone.trim(), email: details.email.trim() }
}

/** Validates the preview form; real orders will also require server-side validation. */
export function validateContact(details: ContactDetails): ContactErrors {
  const contact = normalizeContact(details)
  const errors: ContactErrors = {}
  if (contact.name.length < 2 || contact.name.length > 100 || /[\r\n]/.test(contact.name)) {
    errors.name = "checkout.nameError"
  }
  const digits = contact.phone.replace(/[\s().-]/g, "")
  if (contact.phone.length > 40 || !/^\+?[0-9\s().-]+$/.test(contact.phone)
    || !/^\+?\d{7,15}$/.test(digits)) errors.phone = "checkout.phoneError"
  if (contact.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.email = "checkout.emailError"
  }
  return errors
}
