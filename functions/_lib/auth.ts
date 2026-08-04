import { err } from "./response.ts"

// Cloudflare Access guards /admin/* at the edge before Functions run.
// The header is injected by Access after successful authentication.
export function getAccessEmail(request: Request): string | null {
  return request.headers.get("Cf-Access-Authenticated-User-Email")
}

export function requireAdmin(request: Request): Response | null {
  if (!getAccessEmail(request)) {
    return err("UNAUTHORIZED", "Cloudflare Access authentication required", 401)
  }
  return null
}
