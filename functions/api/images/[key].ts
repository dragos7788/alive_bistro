import type { Ctx } from "../../_lib/types.ts"
import { err } from "../../_lib/response.ts"

export const onRequestGet = async ({ env, params }: Ctx<"key">) => {
  const obj = await env.MEDIA.get(params.key)
  if (!obj) return err("NOT_FOUND", "Image not found", 404)

  return new Response(obj.body, {
    headers: {
      "Content-Type":           obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control":          "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
