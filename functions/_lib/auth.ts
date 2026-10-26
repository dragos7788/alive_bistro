import { err } from "./response.ts"
import type { Env } from "./types"
import { guardTestOrders, testOrdersEnabled } from "./test-orders"

// The admin middleware sets this header from a cryptographically verified Access JWT.
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
