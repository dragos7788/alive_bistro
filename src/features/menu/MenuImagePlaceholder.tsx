import { Utensils } from "lucide-react"
import { resolveIcon } from "./icons"

/** Renders a decorative category symbol in place of a missing menu photograph. */
export function MenuImagePlaceholder({ iconKey }: { iconKey: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex w-full aspect-square items-center justify-center bg-gradient-to-br from-brand-cream-100 via-brand-cream-200 to-brand-green-700/10 text-brand-green-700"
    >
      <div className="flex items-center justify-center rounded-full border border-brand-green-700/15 bg-brand-cream-50/70 p-8 shadow-sm ring-8 ring-brand-green-700/5">
        {resolveIcon(iconKey, 64) ?? <Utensils size={64} />}
      </div>
    </div>
  )
}
