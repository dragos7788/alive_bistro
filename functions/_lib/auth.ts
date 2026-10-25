import { err } from "./response.ts"
import type { Env } from "./types"
import { guardTestOrders, testOrdersEnabled } from "./test-orders"

// Cloudflare Access guards /admin/* at the edge before Functions run.
// The header is injected by Access after successful authentication.
export function getAccessEmail(request: Request): string | null {
  return request.headers.get("Cf-Access-Authenticated-User-Email")
}

export function requireAdmin(request: Request, env?: Pick<Env, "LOCAL_TEST_ORDERS">): Response | null {
  if (env && testOrdersEnabled(request, env)) {
    return guardTestOrders(request, env, request.method !== "GET")
  }
  if (!getAccessEmail(request)) {
    return err("UNAUTHORIZED", "Cloudflare Access authentication required", 401)
  }
  return null
}
