import type { Ctx } from "../../_lib/types.ts"
import { ok, err } from "../../_lib/response.ts"
import { requireAdmin } from "../../_lib/auth.ts"
import { validateUpload } from "../../_lib/validate.ts"

export const onRequestPost = async ({ request, env }: Ctx) => {
  const deny = requireAdmin(request, env)
  if (deny) return deny
  if (request.headers.get("Origin") !== new URL(request.url).origin) return err("INVALID_ORIGIN", "Origine nepermisă.", 403)

  const contentType = request.headers.get("Content-Type")
  const body = await request.arrayBuffer()
  const msg  = validateUpload(contentType, body.byteLength)
  if (msg) return err("VALIDATION_ERROR", msg, 400)

  const key = crypto.randomUUID()
  await env.MEDIA.put(key, body, { httpMetadata: { contentType: contentType! } })
  return ok({ key, url: `/api/images/${key}` }, 201)
}
