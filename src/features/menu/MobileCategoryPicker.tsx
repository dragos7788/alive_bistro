import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react"
import { Check, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { resolveIcon } from "./icons"
import type { MenuCategory } from "./types"

interface MobileCategoryPickerProps {
  categories: MenuCategory[]
  activeCategory: string
  onSelect: (id: string) => void
}

/** Shows all mobile menu categories in a compact, keyboard-accessible disclosure. */
export function MobileCategoryPicker({ categories, activeCategory, onSelect }: MobileCategoryPickerProps) {
  const { t } = useTranslation()
  const selected = categories.find(category => category.id === activeCategory) ?? categories[0]

  return (
    <Popover className="relative mx-6 mb-6 md:hidden">
      <PopoverButton className="group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-brand-green-700/25 bg-brand-cream-50 px-4 py-3 text-left text-brand-green-700 shadow-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700">
        <span className="shrink-0" aria-hidden="true">{resolveIcon(selected.iconKey, 20)}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider">{t("menu.chooseCategory")}</span>
          <span className="block text-sm font-bold">{t(`menu.categories.${selected.id}`)}</span>
        </span>
        <ChevronDown size={18} className="shrink-0 transition-transform group-data-open:rotate-180" aria-hidden="true" />
      </PopoverButton>
      <PopoverPanel focus className="absolute inset-x-0 top-full z-40 mt-2 rounded-2xl border border-brand-green-700/20 bg-brand-cream-50 p-3 shadow-xl">
        {({ close }) => (
          <div className="grid grid-cols-2 gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                type="button"
                aria-pressed={activeCategory === category.id}
                onClick={() => {
                  close()
                  onSelect(category.id)
                }}
                className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold leading-relaxed focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 ${
                  activeCategory === category.id
                    ? "border-brand-green-700 bg-brand-green-700 text-brand-cream-50"
                    : "border-brand-green-700/15 bg-white text-brand-green-700 hover:bg-brand-green-100"
                }`}
              >
                <span className="shrink-0" aria-hidden="true">{resolveIcon(category.iconKey, 16)}</span>
                <span className="min-w-0 flex-1">{t(`menu.categories.${category.id}`)}</span>
                {activeCategory === category.id && <Check size={14} className="shrink-0" aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
      </PopoverPanel>
    </Popover>
  )
}
