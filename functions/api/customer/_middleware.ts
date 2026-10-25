import type { Ctx } from "../../_lib/types"
import { CustomerAuthError } from "../../_lib/customer-auth"
import { err } from "../../_lib/response"

export const onRequest = async (ctx: Ctx & { next: () => Promise<Response> }): Promise<Response> => {
  let response: Response
  try {
    response = await ctx.next()
  } catch (error) {
    if (error instanceof CustomerAuthError) {
      response = err(error.code, "Autentificarea nu a putut fi finalizata.", error.status)
    } else {
      console.error("Customer account request failed", error instanceof Error ? error.name : "UnknownError")
      response = err("ACCOUNT_ERROR", "Serviciul de conturi nu este disponibil momentan.", 503)
    }
  }
  const secured = new Response(response.body, response)
  secured.headers.set("Cache-Control", "no-store")
  secured.headers.set("Referrer-Policy", "no-referrer")
  secured.headers.set("X-Content-Type-Options", "nosniff")
  return secured
}
