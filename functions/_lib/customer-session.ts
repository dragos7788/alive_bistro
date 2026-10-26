import { CustomerAuthError, requireAuthOrigin, sessionCustomer, type Customer } from "./customer-auth"
import type { Env } from "./types"

/** Requires a server-confirmed customer session for private customer endpoints. */
export async function requireCustomer(request: Request, env: Env, write = false): Promise<Customer> {
  requireAuthOrigin(request, env, write)
  const customer = await sessionCustomer(request, env)
  if (!customer) throw new CustomerAuthError("UNAUTHORIZED", 401)
  return customer
}
