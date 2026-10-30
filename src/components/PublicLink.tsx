import type { ComponentProps } from "react"
import { Link, useInRouterContext } from "react-router"

/** Navigates public routes without reloading; authentication and admin links stay native. */
export function PublicLink({ href, ...props }: ComponentProps<"a"> & { href: string }) {
  const hasRouter = useInRouterContext()
  if (!hasRouter || (!href.startsWith("/") && !href.startsWith("#")) || href.startsWith("//")
    || href === "#account" || /^\/(?:account|admin|api)(?:[/?#]|$)/.test(href)) {
    return <a href={href} {...props} />
  }
  return <Link to={href} {...props} />
}
