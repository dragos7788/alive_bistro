import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { PublicLink } from "../../components/PublicLink"
import { resolveIcon } from "./icons"
import type { MenuGroup } from "./types"

/** Keeps the same three navigation options available in the menu and plate builder. */
export function MenuNavigation({ groups, active, onGroupChange, compact = false }: {
  groups: MenuGroup[]
  active: MenuGroup["id"] | "builder"
  onGroupChange?: (id: MenuGroup["id"]) => void
  compact?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className={`inline-flex max-w-full items-stretch gap-0.5 rounded-full border border-brand-green-700/10 bg-brand-cream-200/60 p-0.5 origin-top md:transition-transform md:duration-300 md:ease-out ${compact ? "md:scale-[0.88]" : ""}`}>
      {groups.map(group => {
        const className = `flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-full px-2 py-1 text-xs font-bold font-sans transition-all duration-200 md:px-4 md:text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 ${
          active === group.id
            ? "bg-brand-green-700 text-brand-cream-50 shadow-md shadow-brand-green-700/20"
            : "text-brand-green-700/70 hover:text-brand-green-700"
        }`
        const label = <>{resolveIcon(group.iconKey, 20)}{t(`menu.categories.${group.id}`)}</>
        return onGroupChange
          ? <button key={group.id} type="button" aria-pressed={active === group.id} className={className}
              onClick={() => onGroupChange(group.id)}>{label}</button>
          : <PublicLink key={group.id} href={`/menu?group=${group.id}`} className={className}>{label}</PublicLink>
      })}
      <PublicLink href="/build-your-plate" aria-current={active === "builder" ? "page" : undefined}
        className="performance-link menu-builder-option inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full px-2 py-1 text-center text-xs font-bold transition-colors md:px-3 md:text-sm">
        <Plus size={17} className="shrink-0" aria-hidden="true" />
        <span>{t("home.hero.performanceButton")}</span>
      </PublicLink>
    </div>
  )
}
