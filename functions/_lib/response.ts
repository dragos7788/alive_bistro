export const ok = (data: unknown, status = 200): Response =>
  Response.json({ data }, { status })

export const err = (code: string, message: string, status: number, details?: unknown): Response =>
  Response.json({ error: { code, message, details: details ?? null } }, { status })
