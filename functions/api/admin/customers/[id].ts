import { requireAdmin } from "../../../_lib/auth"
import { err, ok } from "../../../_lib/response"
import type { Ctx } from "../../../_lib/types"

const conflicts: Record<string, string> = {
  CUSTOMER_HAS_ACTIVE_ORDERS: "Clientul are comenzi în lucru. Finalizează sau anulează comenzile înainte de ștergere.",
  CUSTOMER_PUSH_IN_FLIGHT: "O notificare este în curs de trimitere. Reîncearcă după finalizarea trimiterii.",
}

/** Permanently erases a confirmed account and anonymizes its retained completed TEST orders atomically. */
export async function onRequestDelete({ request, env, params }: Ctx<"id">): Promise<Response> {
  const denied = requireAdmin(request, env)
  if (denied) return denied
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return err("INVALID_ORIGIN", "Originea cererii nu este permisă.", 403)
  }
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(params.id ?? "")) {
    return err("INVALID_INPUT", "Identificator client invalid.", 400)
  }
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
    return err("INVALID_INPUT", "Confirmarea ștergerii trebuie trimisă ca JSON.", 400)
  }
  let input: unknown
  try {
    const body = await request.text()
    if (new TextEncoder().encode(body).byteLength > 4096) {
      return err("INVALID_INPUT", "Confirmarea ștergerii este prea mare.", 413)
    }
    input = JSON.parse(body)
  } catch {
    return err("INVALID_INPUT", "Confirmarea ștergerii trebuie trimisă ca JSON.", 400)
  }
  if (!input || typeof input !== "object" || !("confirmation" in input)
    || typeof input.confirmation !== "string" || !input.confirmation || input.confirmation.length > 320) {
    return err("CONFIRMATION_REQUIRED", "Introdu exact e-mailul clientului (sau ID-ul contului fără e-mail) pentru confirmare.", 400)
  }

  try {
    const customer = await env.DB.prepare("SELECT id,name,email FROM customers WHERE id=? AND deleted_at IS NULL")
      .bind(params.id).first<{ id: string; name: string; email: string | null }>()
    if (!customer) return err("NOT_FOUND", "Clientul nu a fost găsit.", 404)
    const expected = customer.email?.trim() ? customer.email : customer.id
    if (input.confirmation !== expected) {
      return err("CONFIRMATION_REQUIRED", "Confirmarea nu corespunde contului selectat. Contul nu a fost șters.", 400)
    }

    // The trigger owns cleanup and invariant checks in the same statement.
    // Recheck identity fields here so a concurrent profile change fails closed.
    const deleted = await env.DB.prepare(`UPDATE customers SET deleted_at=unixepoch(),
      name='Client șters',email=NULL,referred_by=NULL,created_at=0,
      referral_code='erased-' || lower(hex(randomblob(32)))
      WHERE id=? AND name=? AND email IS ? AND deleted_at IS NULL RETURNING id`)
      .bind(customer.id, customer.name, customer.email).first<{ id: string }>()
    if (!deleted) return err("CUSTOMER_CHANGED", "Contul a fost modificat. Reîncarcă lista și confirmă din nou.", 409)
    const response = ok({ deletedCustomerId: deleted.id })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    for (const [code, explanation] of Object.entries(conflicts)) {
      if (message.includes(code)) return err(code, explanation, 409)
    }
    // Do not log account details, session tokens or subscription credentials.
    console.error("Customer deletion transaction failed")
    return err("CUSTOMER_DELETION_FAILED", "Contul nu a putut fi șters. Nu s-au salvat modificări. Reîncearcă.", 500)
  }
}
