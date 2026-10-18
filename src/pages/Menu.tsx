import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react"
import { Coffee as LucideCoffee, Flame, Beef, Wheat, Nut, X, Plus, Info, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation, Trans } from "react-i18next"
import type { MenuItem, MenuCategory, MenuGroup } from "../features/menu/types"
import { resolveIcon } from "../features/menu/icons"
import { menuData } from "../features/menu/seed"
import { getMenu } from "../features/menu/api"
import { tagColors } from "../features/menu/tags"
import { MenuImagePlaceholder } from "../features/menu/MenuImagePlaceholder"


function CategoryBar({
  categories,
  activeCategory,
  onSelect,
  compact,
}: {
  categories: MenuCategory[]
  activeCategory: string
  onSelect: (id: string) => void
  compact: boolean
}) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    window.addEventListener("resize", updateArrows)
    return () => window.removeEventListener("resize", updateArrows)
  }, [updateArrows, categories])

  const scrollByAmount = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" })
  }

  return (
    <div className="relative w-full mb-10 bg-brand-cream-200/60 border-y border-brand-green-700/10 shadow-inner shadow-brand-green-700/5">
      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className={`flex gap-2.5 overflow-x-auto px-6 md:px-10 scroll-pl-6 md:scroll-pl-10 scroll-pr-6 md:scroll-pr-10 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[padding] duration-300 ease-out ${compact ? "py-1.5" : "py-3"}`}
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={(e) => {
              onSelect(cat.id)
              e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap flex-shrink-0 snap-start transition-all duration-200 font-sans ${
              activeCategory === cat.id
                ? "bg-brand-green-700 text-brand-cream-50 shadow-md shadow-brand-green-700/15"
                : "border border-brand-green-700/10 text-brand-green-700/80 bg-brand-cream-50/70 hover:border-brand-green-700/30 hover:text-brand-green-700 hover:bg-brand-cream-50"
            }`}
          >
            {resolveIcon(cat.iconKey, 18)}
            {t(`menu.categories.${cat.id}`)}
          </button>
        ))}
      </div>

      {/* Left fade + arrow: shown when there are hidden items to the left */}
      <AnimatePresence>
        {canLeft && (
          <motion.button
            type="button"
            onClick={() => scrollByAmount(-1)}
            aria-label="Derulează la stânga"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-y-0 left-0 flex items-center pl-3 pr-10 bg-gradient-to-r from-brand-cream-200 via-brand-cream-200/90 to-transparent"
          >
            <span className="w-9 h-9 rounded-full bg-brand-cream-50 border border-brand-green-700/15 shadow-sm flex items-center justify-center text-brand-green-700">
              <ChevronLeft className="w-4 h-4" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right fade + arrow: shown when there are hidden items to the right */}
      <AnimatePresence>
        {canRight && (
          <motion.button
            type="button"
            onClick={() => scrollByAmount(1)}
            aria-label="Derulează la dreapta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-y-0 right-0 flex items-center justify-end pr-3 pl-10 bg-gradient-to-l from-brand-cream-200 via-brand-cream-200/90 to-transparent"
          >
            <span className="w-9 h-9 rounded-full bg-brand-cream-50 border border-brand-green-700/15 shadow-sm flex items-center justify-center text-brand-green-700">
              <ChevronRight className="w-4 h-4" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Menu() {
  const { t } = useTranslation()
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>(menuData)
  const [activeGroup, setActiveGroup] = useState<MenuGroup["id"]>("food")
  const [activeCategory, setActiveCategory] = useState(menuData[0].categories[0].id)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)

  useEffect(() => { getMenu().then(setMenuGroups) }, [])

  // Whether the sticky menu nav has collapsed into its compact state.
  // Driven by a simple scroll threshold (with hysteresis) instead of a per-frame value so the
  // transition is animated smoothly by CSS rather than re-rendering on every scroll frame.
  const navSentinelRef = useRef<HTMLDivElement>(null)
  const stickyNavRef = useRef<HTMLDivElement>(null)
  const listAnchorRef = useRef<HTMLDivElement>(null)
  const [navCompact, setNavCompact] = useState(false)

  useEffect(() => {
    const NAV_OFFSET = 64 // sticky top offset — tucks the bar flush beneath the fixed header
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = navSentinelRef.current
        if (!el) return
        const top = el.getBoundingClientRect().top
        // Hysteresis: collapse a bit after the stick point, expand a bit before it,
        // so tiny scroll jitters near the threshold don't cause flickering.
        setNavCompact((prev) => (prev ? top < NAV_OFFSET + 24 : top < NAV_OFFSET - 8))
      })
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const activeGroupObj = (menuGroups.find((g) => g.id === activeGroup) ?? menuGroups[0])!
  const activeCategoryObj =
    activeGroupObj.categories.find((c) => c.id === activeCategory) ?? activeGroupObj.categories[0]

  const handleGroupChange = (groupId: MenuGroup["id"]) => {
    if (groupId === activeGroup) return
    const group = menuGroups.find((g) => g.id === groupId) ?? menuGroups[0]
    setActiveGroup(groupId)
    setActiveCategory(group.categories[0].id)
  }

  // When the visible list changes (group or category), scroll up so the first product of the
  // new list sits just below the sticky nav. Skips the very first render so the page doesn't
  // jump on mount.
  const firstListRender = useRef(true)
  useEffect(() => {
    if (firstListRender.current) {
      firstListRender.current = false
      return
    }
    const anchor = listAnchorRef.current
    if (!anchor) return
    const STICKY_OFFSET = 64 // matches the sticky nav's top offset
    const navHeight = stickyNavRef.current?.offsetHeight ?? 0
    const target =
      anchor.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET - navHeight - 12
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" })
  }, [activeCategory, activeGroup])

  return (
    <section id="menu" className="min-h-screen py-24 px-6 bg-brand-cream-100 overflow-x-clip">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="text-brand-green-700 uppercase tracking-[0.3em] text-xs font-bold mb-3 font-sans">{t("menu.tagline")}</p>
          <h2 className="text-4xl md:text-6xl font-extrabold text-brand-green-700 tracking-tight font-serif lowercase">
            <Trans
              i18nKey="menu.title"
              components={{ 1: <span className="text-brand-green-500 font-sans" /> }}
            >
              Meniul Nostru<span className="text-brand-green-500 font-sans">.</span>
            </Trans>
          </h2>
          <p className="text-brand-dark/80 text-sm mt-3 max-w-xl mx-auto font-light leading-relaxed font-sans">
            {t("menu.desc")}
          </p>
        </motion.div>

        {/* Sentinel: marks where the nav becomes sticky so we can measure scroll progress */}
        <div ref={navSentinelRef} aria-hidden className="h-0" />

        {/* Sticky menu navigation: both the Food/Drinks toggle and the category chips
            stick to the top together and progressively shrink the gap between them on scroll.
            Full-bleed via margin (no transform) so it doesn't jitter while scrolling, and a
            fully opaque background so no content shows through. It tucks flush beneath the
            fixed header, leaving no transparent strip. */}
        <div ref={stickyNavRef} className="sticky top-16 z-30 w-screen ml-[calc(50%-50vw)] bg-brand-cream-100">
          {/* Group toggle (Food / Drinks) */}
          <div
            className="max-w-4xl mx-auto px-6 flex justify-center transition-[padding,margin] duration-300 ease-out"
            style={{
              paddingTop: navCompact ? 16 : 22,
              marginBottom: navCompact ? 2 : 28,
            }}
          >
            <div
              className="inline-flex p-1.5 rounded-full bg-brand-cream-200/60 border border-brand-green-700/10 origin-top transition-transform duration-300 ease-out"
              style={{ transform: navCompact ? "scale(0.88)" : "scale(1)" }}
            >
              {menuGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleGroupChange(group.id)}
                  className={`flex items-center gap-2 px-7 py-2.5 rounded-full text-sm font-bold transition-all duration-200 font-sans ${
                    activeGroup === group.id
                      ? "bg-brand-green-700 text-brand-cream-50 shadow-md shadow-brand-green-700/20"
                      : "text-brand-green-700/70 hover:text-brand-green-700"
                  }`}
                >
                  {resolveIcon(group.iconKey, 20)}
                  {t(`menu.categories.${group.id}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Category chips — full-width bar with dynamic scroll arrows */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeGroup}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <CategoryBar
                categories={activeGroupObj.categories}
                activeCategory={activeCategory}
                onSelect={setActiveCategory}
                compact={navCompact}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Anchor marking the top of the product list (scroll target on list change) */}
        <div ref={listAnchorRef} aria-hidden className="h-0" />

        {/* Menu Items */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {activeCategoryObj.items.map((item, i) => (
              <motion.button
                type="button"
                onClick={() => setSelectedItem(item)}
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                className="text-left w-full cursor-pointer flex flex-col overflow-hidden rounded-2xl border border-brand-green-700/10 bg-brand-cream-50 hover:bg-white hover:shadow-lg hover:border-brand-green-700/25 transition-all duration-300 group"
              >
                  <div className="relative w-full aspect-square overflow-hidden">
                    {item.image ? <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-bottom"
                    /> : <MenuImagePlaceholder iconKey={activeCategoryObj.iconKey} />}
                    {item.tag && (
                      <span className={`absolute top-3 left-3 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm ${tagColors[item.tag] ?? "bg-brand-cream-200 text-brand-dark/60"}`}>
                        {item.tag}
                      </span>
                    )}
                    {/* Click-for-details hint, revealed on hover */}
                    <span className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-cream-50/90 backdrop-blur text-brand-green-700 text-[11px] font-bold shadow-sm opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <Plus className="w-3.5 h-3.5" /> {t("menu.details")}
                    </span>
                  </div>

                <div className="flex flex-col flex-1 p-4 md:p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-brand-dark font-bold group-hover:text-brand-green-700 transition-colors text-sm sm:text-base font-serif lowercase leading-tight">{item.name}</h3>
                    <span className="text-brand-green-700 font-bold text-xs sm:text-sm whitespace-nowrap">{item.price}</span>
                  </div>

                  {/* Macronutrients & Calories badges */}
                  {item.macros && (
                    <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                      <span className="px-2.5 py-1 rounded bg-brand-green-700/10 text-brand-green-700 font-bold flex items-center gap-1.5 border border-brand-green-700/10">
                        <Flame className="w-3.5 h-3.5" /> {item.macros.calories} {t("menu.macros.calories")}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-brand-cream-200/50 text-brand-dark/80 font-medium flex items-center gap-1.5 border border-brand-green-700/5" title={t("menu.macros.protein")}>
                        <Beef className="w-3.5 h-3.5 text-red-700/80" /> {item.macros.protein} {t("menu.macros.protein")}
                      </span>
                      {item.macros.carbs && <span className="px-2.5 py-1 rounded bg-brand-cream-200/50 text-brand-dark/80 font-medium flex items-center gap-1.5 border border-brand-green-700/5" title={t("menu.macros.carbs")}>
                        <Wheat className="w-3.5 h-3.5 text-amber-700/80" /> {item.macros.carbs} {t("menu.macros.carbs")}
                      </span>}
                      <span className="px-2.5 py-1 rounded bg-brand-cream-200/50 text-brand-dark/80 font-medium flex items-center gap-1.5 border border-brand-green-700/5" title={t("menu.macros.fat")}>
                        <Nut className="w-3.5 h-3.5 text-amber-700" /> {item.macros.fat} {t("menu.macros.fat")}
                      </span>
                    </div>
                  )}

                  {/* Suggestion that a click opens the full description */}
                  <p className="mt-auto pt-3 flex items-center gap-1.5 text-brand-green-700/70 group-hover:text-brand-green-700 text-[11px] sm:text-xs font-semibold font-sans transition-colors">
                    <Info className="w-3.5 h-3.5" /> {t("menu.clickHint")}
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Coffee section teaser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 p-6 rounded-2xl border border-brand-green-700/15 bg-brand-cream-200/50 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left"
        >
          <div className="w-12 h-12 rounded-full bg-brand-green-700/10 flex items-center justify-center flex-shrink-0 text-brand-green-700">
            <LucideCoffee size={24} />
          </div>
          <div>
            <p className="text-brand-green-700 font-bold text-base font-serif lowercase">{t("menu.teaserTitle")}</p>
            <p className="text-brand-dark/70 text-xs md:text-sm font-light mt-1 font-sans">{t("menu.teaserDesc")}</p>
          </div>
        </motion.div>
      </div>

      {/* Item detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <Dialog static open={!!selectedItem} onClose={() => setSelectedItem(null)} className="relative z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-brand-dark/50 backdrop-blur-sm"
              aria-hidden="true"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
              <DialogPanel className="relative w-full max-w-lg">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 24 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="relative w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-brand-cream-50 shadow-2xl shadow-brand-dark/30"
              >
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  aria-label={t("menu.close")}
                  className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-brand-cream-50/90 backdrop-blur text-brand-dark/70 hover:text-brand-green-700 border border-brand-green-700/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {selectedItem.image ? (
                  <div className="w-full aspect-square overflow-hidden">
                    <img src={selectedItem.image} alt={selectedItem.name} referrerPolicy="no-referrer" className="w-full h-full object-cover object-bottom" />
                  </div>
                ) : (
                  <MenuImagePlaceholder iconKey={activeCategoryObj.iconKey} />
                )}

                <div className="p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-brand-green-700 font-serif lowercase leading-tight">
                      {selectedItem.name}
                    </DialogTitle>
                    <span className="text-brand-green-700 font-bold text-base whitespace-nowrap mt-1">{selectedItem.price}</span>
                  </div>

                  {selectedItem.tag && (
                    <span className={`inline-block text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider mb-4 ${tagColors[selectedItem.tag] ?? "bg-brand-cream-200 text-brand-dark/60"}`}>
                      {selectedItem.tag}
                    </span>
                  )}

                  <h3 className="text-brand-green-700 font-bold text-base mb-2">{t("menu.ingredients")}</h3>
                  <p className="whitespace-pre-line text-brand-dark/80 text-sm sm:text-base leading-relaxed font-sans mb-6">{selectedItem.description}</p>

                  <h3 className="text-brand-green-700 font-bold text-base mb-2">{t("menu.nutritionTitle")}</h3>
                  {selectedItem.macros ? (
                    <>
                    <p className="text-brand-dark/80 text-xs leading-relaxed mb-3">{t("menu.nutritionSource")}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-brand-green-700/10 border border-brand-green-700/10">
                        <Flame className="w-5 h-5 text-brand-green-700 mb-1" />
                        <span className="text-brand-green-700 font-bold text-sm">{selectedItem.macros.calories} {t("menu.macros.calories")}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-brand-cream-200/50 border border-brand-green-700/5">
                        <Beef className="w-5 h-5 text-red-700/80 mb-1" />
                        <span className="text-brand-dark/80 font-semibold text-sm">{selectedItem.macros.protein}</span>
                        <span className="text-brand-dark/50 text-[11px] font-medium">{t("menu.macros.protein")}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-brand-cream-200/50 border border-brand-green-700/5">
                        <Wheat className="w-5 h-5 text-amber-700/80 mb-1" />
                        <span className="text-brand-dark/80 font-semibold text-sm">{selectedItem.macros.carbs ?? t("menu.valueUnavailable")}</span>
                        <span className="text-brand-dark/50 text-[11px] font-medium">{t("menu.macros.carbs")}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-brand-cream-200/50 border border-brand-green-700/5">
                        <Nut className="w-5 h-5 text-amber-700 mb-1" />
                        <span className="text-brand-dark/80 font-semibold text-sm">{selectedItem.macros.fat}</span>
                        <span className="text-brand-dark/50 text-[11px] font-medium">{t("menu.macros.fat")}</span>
                      </div>
                    </div>
                    </>
                  ) : (
                    <p className="text-brand-dark/80 text-sm">{t("menu.nutritionUnavailable")}</p>
                  )}
                </div>
              </motion.div>
              </DialogPanel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </section>
  )
}
