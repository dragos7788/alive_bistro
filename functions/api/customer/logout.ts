import type { Ctx } from "../../_lib/types"
import { ok } from "../../_lib/response"
import { authCookie, requireAuthOrigin, setAuthCookie, tokenHash } from "../../_lib/customer-auth"

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  requireAuthOrigin(request, env, true)
  const token = authCookie(request, "session")
  if (token) await env.DB.prepare("DELETE FROM customer_sessions WHERE token_hash=?").bind(await tokenHash(token)).run()
  const response = ok({ loggedOut: true })
  response.headers.set("Set-Cookie", setAuthCookie(request, "session", "", 0))
  return response
}
