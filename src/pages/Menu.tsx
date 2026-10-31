import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react"
import { Coffee as LucideCoffee, Flame, Beef, Wheat, Nut, X, Plus, Info, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react"
import { useTranslation, Trans } from "react-i18next"
import type { MenuItem, MenuCategory, MenuGroup } from "../features/menu/types"
import { menuData } from "../features/menu/seed"
import { continuousMenu } from "../features/menu/continuous-menu"
import { MenuPrice } from "../features/pricing/MenuPrice"
import { MenuNavigation } from "../features/menu/MenuNavigation"
import { tagColors } from "../features/menu/tags"
import { MenuImagePlaceholder } from "../features/menu/MenuImagePlaceholder"
import { getImageCropStyle } from "../features/menu/image-crop"
import { cartCatalog, summarizeCart, type CartProduct } from "../features/cart/cart"
import type { useCart } from "../features/cart/useCart"
import { CartDialog } from "../features/cart/CartDialog"
import { AddToCart } from "../features/cart/AddToCart"
import { HalloweenMenuBanner } from "../features/menu/HalloweenMenuBanner"
import { HealthyDealMenu } from "../features/healthy-deal/HealthyDealMenu"
import type { useHealthyDeal } from "../features/healthy-deal/useHealthyDeal"
const mobileQuery = "(max-width: 767px)"
function subscribeMobile(onChange: () => void) {
  const query = window.matchMedia(mobileQuery)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

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

  useEffect(() => {
    const el = scrollRef.current
    const button = el?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
    if (!el || !button) return
    if (button.offsetLeft < el.scrollLeft || button.offsetLeft + button.offsetWidth > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: Math.max(0, button.offsetLeft - 24), behavior: "smooth" })
    }
  }, [activeCategory])

  const scrollByAmount = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" })
  }

  return (
    <div className="relative w-full mb-1 md:mb-10 bg-brand-cream-200/60 border-y border-brand-green-700/10 shadow-inner shadow-brand-green-700/5">
      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className={`flex gap-1.5 md:gap-2.5 overflow-x-auto px-3 md:px-10 scroll-pl-3 md:scroll-pl-10 scroll-pr-3 md:scroll-pr-10 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[padding] duration-300 ease-out py-1 ${compact ? "md:py-1.5" : "md:py-3"}`}
      >
        {categories.map((cat) => {
          const isHalloween = cat.id === "halloween-special"
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={activeCategory === cat.id}
              onClick={(e) => {
                onSelect(cat.id)
                e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })
              }}
              className={`relative flex min-h-11 items-center gap-2 overflow-hidden rounded-full px-3 py-1 md:px-5 md:py-2.5 text-sm font-semibold font-sans whitespace-nowrap flex-shrink-0 snap-start transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                isHalloween
                  ? activeCategory === cat.id
                    ? "border border-orange-500 bg-orange-200 text-orange-950 shadow-md shadow-orange-900/10"
                    : "border border-orange-300 bg-orange-50 text-orange-950 hover:border-orange-400 hover:bg-orange-100"
                  : activeCategory === cat.id
                    ? "bg-brand-green-700 text-brand-cream-50 shadow-md shadow-brand-green-700/15"
                    : "border border-brand-green-700/10 text-brand-green-700/80 bg-brand-cream-50/70 hover:border-brand-green-700/30 hover:text-brand-green-700 hover:bg-brand-cream-50"
              } ${isHalloween ? "focus-visible:outline-orange-700" : "focus-visible:outline-brand-green-700"}`}
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>
                  {t(`menu.categories.${cat.id}`)}
                  {cat.id === "healthy-deal" && <span className="block text-xs font-normal">{t("healthyDeal.categorySubtitle")}</span>}
                </span>
              </span>
            </button>
          )
        })}
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
            className="absolute inset-y-0 left-0 hidden items-center pl-3 pr-10 bg-gradient-to-r from-brand-cream-200 via-brand-cream-200/90 to-transparent md:flex"
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
            className="absolute inset-y-0 right-0 hidden items-center justify-end pr-3 pl-10 bg-gradient-to-l from-brand-cream-200 via-brand-cream-200/90 to-transparent md:flex"
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

export default function Menu({ cart, menuGroups, isSalesEnabled, healthyDeal, isHealthyDealPreview = false }: {
  cart: ReturnType<typeof useCart>
  menuGroups: MenuGroup[]
  isSalesEnabled: boolean
  healthyDeal: ReturnType<typeof useHealthyDeal>
  isHealthyDealPreview?: boolean
}) {
  const { t, i18n } = useTranslation()
  const isMobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(mobileQuery).matches, () => false)
  const productStripRef = useRef<HTMLDivElement>(null)
  const initialHash = typeof window === "undefined" ? "" : window.location.hash
  const [activeGroup, setActiveGroup] = useState<MenuGroup["id"]>(() =>
    !isHealthyDealPreview && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("group") === "drinks" ? "drinks" : "food")
  const [activeCategory, setActiveCategory] = useState(
    isHealthyDealPreview ? "healthy-deal" : initialHash === "#halloween-menu" ? "halloween-special"
      : (menuGroups.find(group => group.id === activeGroup) ?? menuData[0]).categories[0].id,
  )
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [addedMessage, setAddedMessage] = useState("")
  const discountPercent = menuGroups.find(group => group.id === "food")?.performanceDiscountPercent ?? 0
  const hasCategoryDiscounts = menuGroups.some(group => group.categories.some(category => (category.discountPercent ?? 0) > 0))
  const summary = summarizeCart(cart.items, cartCatalog(menuGroups), discountPercent)
  const cartCount = cart.items.reduce((count, item) => count + item.quantity, 0)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  // Whether the sticky menu nav has collapsed into its compact state.
  // Driven by a simple scroll threshold (with hysteresis) instead of a per-frame value so the
  // transition is animated smoothly by CSS rather than re-rendering on every scroll frame.
  const navSentinelRef = useRef<HTMLDivElement>(null)
  const stickyNavRef = useRef<HTMLDivElement>(null)
  const listAnchorRef = useRef<HTMLDivElement>(null)
  const categoryScrollLocked = useRef(false)
  const categoryScrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [navCompact, setNavCompact] = useState(false)

  useEffect(() => {
    const NAV_OFFSET = 78 // fixed header plus 14px spacing
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

  const releaseCategoryScroll = useCallback(() => {
    categoryScrollLocked.current = false
    clearTimeout(categoryScrollTimer.current)
  }, [])

  const holdCategoryDuringScroll = useCallback(() => {
    categoryScrollLocked.current = true
    clearTimeout(categoryScrollTimer.current)
    // Also releases when the target is already visible or scrollend is unavailable.
    categoryScrollTimer.current = setTimeout(releaseCategoryScroll, 200)
  }, [releaseCategoryScroll])

  function handleCategorySelect(id: string) {
    setActiveCategory(id)
    const strip = productStripRef.current
    const card = Array.from(strip?.querySelectorAll<HTMLElement>("[data-category]") ?? [])
      .find(element => element.dataset.category === id)
    if (isMobile && card) {
      holdCategoryDuringScroll()
      const top = card.getBoundingClientRect().top + window.scrollY - 78 - (stickyNavRef.current?.offsetHeight ?? 0) - 12
      window.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
    }
  }

  useEffect(() => {
    if (!isMobile) return
    let frame = 0
    function updateCategory() {
      frame = 0
      if (categoryScrollLocked.current) return
      const cards = Array.from(productStripRef.current?.querySelectorAll<HTMLElement>("[data-category]") ?? [])
      const line = 78 + (stickyNavRef.current?.offsetHeight ?? 0) + 12
      const current = cards.find(card => card.getBoundingClientRect().bottom > line) ?? cards.at(-1)
      if (current?.dataset.category) setActiveCategory(current.dataset.category)
    }
    const onScroll = () => {
      if (categoryScrollLocked.current) {
        holdCategoryDuringScroll()
        return
      }
      if (!frame) frame = requestAnimationFrame(updateCategory)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) releaseCategoryScroll()
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("scrollend", releaseCategoryScroll)
    window.addEventListener("wheel", releaseCategoryScroll, { passive: true })
    window.addEventListener("touchstart", releaseCategoryScroll, { passive: true })
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("scrollend", releaseCategoryScroll)
      window.removeEventListener("wheel", releaseCategoryScroll)
      window.removeEventListener("touchstart", releaseCategoryScroll)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("resize", onScroll)
      cancelAnimationFrame(frame)
      releaseCategoryScroll()
    }
  }, [isMobile, activeGroup, holdCategoryDuringScroll, releaseCategoryScroll])

  const handleAddToCart = (item: CartProduct) => {
    const quantity = (cart.items.find(entry => entry.key === item.key)?.quantity ?? 0) + 1
    if (item.isAvailable === false || quantity > (item.stockQuantity ?? Infinity)) {
      setAddedMessage(t("cart.stockLimit"))
      return
    }
    if (cart.addProduct(item)) {
      setAddedMessage(`${t("cart.added", { name: item.name })} ${t("cart.quantity", { quantity })}`)
    }
  }

  // When the visible list changes (group or category), scroll up so the first product of the
  // new list sits just below the sticky nav. Skips the very first render so the page doesn't
  // jump on mount.
  const firstListRender = useRef(true)
  const previousGroup = useRef(activeGroup)
  useEffect(() => {
    const groupChanged = previousGroup.current !== activeGroup
    previousGroup.current = activeGroup
    if (isMobile && !groupChanged) {
      firstListRender.current = false
      return
    }
    if (firstListRender.current) {
      firstListRender.current = false
      return
    }
    const anchor = listAnchorRef.current
    if (!anchor) return
    const STICKY_OFFSET = 78 // matches the sticky nav's top offset
    const navHeight = stickyNavRef.current?.offsetHeight ?? 0
    const target =
      anchor.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET - navHeight - 12
    if (isMobile) holdCategoryDuringScroll()
    window.scrollTo({ top: Math.max(0, target), behavior: "smooth" })
  }, [activeCategory, activeGroup, isMobile, holdCategoryDuringScroll])

  const menuCards = (
    <AnimatePresence mode="wait">
      <motion.div
        key={isMobile ? activeGroup : activeCategory}
        initial={isMobile ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.35 }}
        ref={productStripRef}
        role={isMobile ? "region" : undefined}
        aria-label={isMobile ? t("menu.title", { interpolation: { escapeValue: false } }).replace(/<[^>]+>/g, "") : undefined}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {continuousMenu(isMobile ? activeGroupObj.categories : [activeCategoryObj]).flatMap(({ category, items, isPanel }) => {
          if (isMobile && isPanel) return [
            <div key={category.id} data-category={category.id} className="w-full">
              {category.id === "healthy-deal"
                ? <HealthyDealMenu document={healthyDeal.document} now={healthyDeal.now} error={healthyDeal.error}
                    isSalesEnabled={isSalesEnabled} items={cart.items} onAdd={handleAddToCart} allowPreview={isHealthyDealPreview} />
                : <HalloweenMenuBanner />}
            </div>,
          ]
          return items.map((item, i) => (
          <motion.div
            key={`${category.id}:${item.name}`}
            data-category={category.id}
            initial={isMobile ? false : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
            className="group flex w-full flex-col overflow-hidden rounded-2xl border border-brand-green-700/10 bg-brand-cream-50 text-left transition-all duration-300 hover:border-brand-green-700/25 hover:bg-white hover:shadow-lg"
          >
            <button type="button" onClick={() => setSelectedItem(item)} className="flex flex-1 cursor-pointer flex-col text-left">
              <div className="relative aspect-square w-full overflow-hidden bg-white">
                {item.image ? <img
                  src={item.image}
                  srcSet={item.imageSrcSet}
                  sizes="(min-width: 944px) 440px, (min-width: 768px) calc((100vw - 64px) / 2), calc(100vw - 48px)"
                  loading={i < 2 ? "eager" : "lazy"}
                  decoding="async"
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="absolute max-w-none bg-white"
                  style={getImageCropStyle(
                    item.imagePosition ?? { x: 50, y: 50 },
                    item.imageZoom ?? 100,
                    category.id === "wine-prosecco" ? "contain" : "cover",
                  )}
                /> : <MenuImagePlaceholder iconKey={category.iconKey} />}
                {item.discountPercent ? (
                  <span className="absolute right-3 top-3 rounded-full bg-brand-green-700 px-3 py-1.5 text-xs font-extrabold text-brand-cream-50 shadow-lg">
                    {t("promotion.discount", { percent: item.discountPercent })}
                  </span>
                ) : null}
                {item.tag && (
                  <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${tagColors[item.tag] ?? "bg-brand-cream-200 text-brand-dark/60"}`}>
                    {item.tag}
                  </span>
                )}
                <span className="absolute bottom-3 right-3 flex translate-y-1 items-center gap-1.5 rounded-full bg-brand-cream-50/90 px-2.5 py-1 text-[11px] font-bold text-brand-green-700 opacity-0 shadow-sm backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <Plus className="h-3.5 w-3.5" /> {t("menu.details")}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-4 md:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <h3 className="min-w-0 flex-1 text-brand-dark font-semibold group-hover:text-brand-green-700 transition-colors text-lg sm:text-xl font-serif first-letter:uppercase leading-snug tracking-tight">{item.name}</h3>
                  <MenuPrice item={item} showDiscount={false} />
                </div>
                {item.menuComponent && (
                  <p className="mb-3 text-xs font-semibold leading-relaxed text-brand-green-800">
                    {t("cart.includedInMenu")}
                  </p>
                )}
                {category.id === "tea-matcha" && (
                  <p className="mb-3 text-xs leading-relaxed text-brand-dark/80">
                    {(i18n.language.startsWith("en") ? item.description_en ?? item.description : item.description).split("\n\n", 1)[0]}
                  </p>
                )}
                {item.macros && (
                  <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                    {item.nutritionEstimated && (
                      <span className="rounded border border-amber-900/10 bg-amber-100 px-2.5 py-1 font-semibold text-amber-900">
                        {t("menu.estimatedBadge")}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 rounded border border-brand-green-700/10 bg-brand-green-700/10 px-2.5 py-1 font-bold text-brand-green-700">
                      <Flame className="h-3.5 w-3.5" /> {item.macros.calories} {t("menu.macros.calories")}
                    </span>
                    <span className="flex items-center gap-1.5 rounded border border-brand-green-700/5 bg-brand-cream-200/50 px-2.5 py-1 font-medium text-brand-dark/80" title={t("menu.macros.protein")}>
                      <Beef className="h-3.5 w-3.5 text-red-700/80" /> {item.macros.protein} {t("menu.macros.protein")}
                    </span>
                    {item.macros.carbs && <span className="flex items-center gap-1.5 rounded border border-brand-green-700/5 bg-brand-cream-200/50 px-2.5 py-1 font-medium text-brand-dark/80" title={t("menu.macros.carbs")}>
                      <Wheat className="h-3.5 w-3.5 text-amber-700/80" /> {item.macros.carbs} {t("menu.macros.carbs")}
                    </span>}
                    <span className="flex items-center gap-1.5 rounded border border-brand-green-700/5 bg-brand-cream-200/50 px-2.5 py-1 font-medium text-brand-dark/80" title={t("menu.macros.fat")}>
                      <Nut className="h-3.5 w-3.5 text-amber-700" /> {item.macros.fat} {t("menu.macros.fat")}
                    </span>
                  </div>
                )}
                <p className="mt-auto flex items-center gap-1.5 pt-3 text-[11px] font-semibold text-brand-green-700/70 transition-colors group-hover:text-brand-green-700 sm:text-xs">
                  <Info className="h-3.5 w-3.5" /> {t("menu.clickHint")}
                </p>
              </div>
            </button>
            <div className="px-4 pb-4 md:px-5 md:pb-5">
              {isSalesEnabled && <AddToCart categoryId={category.id} item={item} onAdd={handleAddToCart} items={cart.items} />}
            </div>
          </motion.div>
        ))})}
      </motion.div>
    </AnimatePresence>
  )

  return (
    <section id="menu" aria-labelledby="menu-title" className="min-h-screen pb-24 pt-32 px-6 bg-brand-cream-100 overflow-x-clip">
      {isSalesEnabled && <button type="button" onClick={() => setIsCartOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex min-h-12 items-center gap-2 rounded-full bg-brand-green-700 px-5 py-3 font-semibold text-white shadow-lg hover:bg-brand-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700">
        <ShoppingBag size={20} aria-hidden="true" />
        {t("cart.open")} ({cartCount})
      </button>}
      <p role="status" className="sr-only">{isSalesEnabled && addedMessage}</p>
      {isSalesEnabled && cart.error && <p role="alert" className="mx-auto mb-4 max-w-4xl rounded-xl bg-red-50 p-4 text-red-800">{t(cart.error)}</p>}
      {isSalesEnabled && <CartDialog open={isCartOpen} onClose={() => setIsCartOpen(false)} summary={summary}
        onQuantityChange={cart.setQuantity} error={cart.error} />}
      <div className="max-w-4xl mx-auto">
        {(hasCategoryDiscounts || discountPercent > 0) && <p className="mb-8 rounded-2xl border border-brand-green-700/20 bg-brand-green-100 p-4 text-center font-semibold text-brand-green-800">
          {hasCategoryDiscounts && t("promotion.categoryOffer")}
          {hasCategoryDiscounts && discountPercent > 0 && " "}
          {discountPercent > 0 && t("promotion.performanceOffer", { percent: discountPercent })}
        </p>}
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-6 md:mb-16"
        >
          <p className="text-brand-green-700 uppercase tracking-[0.3em] text-xs font-bold mb-3 font-sans">{t("menu.tagline")}</p>
          <h1 id="menu-title" ref={headingRef} tabIndex={-1} className="text-4xl md:text-6xl font-extrabold text-brand-green-700 tracking-tight font-serif lowercase focus-visible:outline-2 focus-visible:outline-brand-green-700">
            <Trans
              i18nKey="menu.title"
              components={{ 1: <span className="text-brand-green-500 font-sans" /> }}
            >
              Meniul Nostru<span className="text-brand-green-500 font-sans">.</span>
            </Trans>
          </h1>
          <p className="text-brand-dark/80 text-sm mt-3 max-w-xl mx-auto font-light leading-relaxed font-sans">
            {t("menu.desc")}
          </p>
        </motion.div>

        {/* Sentinel: marks where the nav becomes sticky so we can measure scroll progress */}
        <div ref={navSentinelRef} aria-hidden className="h-0" />

        {/* Sticky menu navigation: both the Food/Drinks toggle and the category chips
            stick to the top together and progressively shrink the gap between them on scroll.
            Full-bleed via margin (no transform) so it doesn't jitter while scrolling, and a
            fully opaque background so no content shows through. It sits 14px beneath the
            fixed header. */}
        <div ref={stickyNavRef} className="sticky top-[78px] z-30 w-screen ml-[calc(50%-50vw)] bg-brand-cream-100">
          {/* Food, drinks and the standalone plate builder share one navigation widget. */}
          <div
            className={`max-w-4xl mx-auto flex flex-col items-center justify-center gap-1 px-3 py-1 md:gap-3 md:px-6 md:flex-row md:flex-wrap md:pb-0 md:transition-[padding,margin] md:duration-300 md:ease-out ${
              navCompact ? "md:pt-4 md:mb-0.5" : "md:pt-[22px] md:mb-7"
            }`}
          >
            <MenuNavigation groups={menuGroups} active={activeGroup} onGroupChange={handleGroupChange} compact={navCompact} />
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
                onSelect={handleCategorySelect}
                compact={navCompact}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Anchor marking the top of the product list (scroll target on list change) */}
        <div id="halloween-menu" ref={listAnchorRef} aria-hidden className="h-0" />

        {/* Menu Items */}
        {!isMobile && activeCategoryObj.id === "tea-matcha" && (
          <div className="mb-5 rounded-2xl border border-brand-green-700/15 bg-brand-cream-200/50 px-5 py-4 text-center">
            <h3 className="font-serif text-lg font-bold text-brand-green-700">
              {t("menu.matchaTitle")}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-brand-dark/80">
              {t("menu.matchaDesc")}
            </p>
          </div>
        )}
        {isMobile ? menuCards : activeCategoryObj.id === "healthy-deal"
          ? <HealthyDealMenu document={healthyDeal.document} now={healthyDeal.now} error={healthyDeal.error}
              isSalesEnabled={isSalesEnabled} items={cart.items} onAdd={handleAddToCart} allowPreview={isHealthyDealPreview} />
          : activeCategoryObj.id === "halloween-special"
          ? <HalloweenMenuBanner />
          : menuCards}

        {activeCategoryObj.id === "coffee-bar" && (
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
        )}
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
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-white">
                    <img
                      src={selectedItem.image}
                      srcSet={selectedItem.imageSrcSet}
                      sizes="(min-width: 560px) 512px, calc(100vw - 32px)"
                      decoding="async"
                      alt={selectedItem.name}
                      referrerPolicy="no-referrer"
                      className="absolute max-w-none bg-white"
                      style={getImageCropStyle(
                        selectedItem.imagePosition ?? { x: 50, y: 50 },
                        selectedItem.imageZoom ?? 100,
                        activeCategoryObj.id === "wine-prosecco" ? "contain" : "cover",
                      )}
                    />
                  </div>
                ) : (
                  <MenuImagePlaceholder iconKey={activeCategoryObj.iconKey} />
                )}

                <div className="p-5 sm:p-7">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <DialogTitle className="min-w-0 flex-1 text-2xl sm:text-3xl font-semibold text-brand-green-700 font-serif first-letter:uppercase leading-tight tracking-tight">
                      {selectedItem.name}
                    </DialogTitle>
                    <MenuPrice item={selectedItem} />
                  </div>

                  {selectedItem.tag && (
                    <span className={`inline-block text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider mb-4 ${tagColors[selectedItem.tag] ?? "bg-brand-cream-200 text-brand-dark/60"}`}>
                      {selectedItem.tag}
                    </span>
                  )}

                  <h3 className="text-brand-green-700 font-bold text-base mb-2">{t("menu.ingredients")}</h3>
                  <p className="whitespace-pre-line text-brand-dark/80 text-sm sm:text-base leading-relaxed font-sans mb-6">
                    {i18n.language.startsWith("en") ? selectedItem.description_en ?? selectedItem.description : selectedItem.description}
                  </p>

                  {selectedItem.macros && (
                    <>
                      <h3 className="text-brand-green-700 font-bold text-base mb-2">{t("menu.nutritionTitle")}</h3>
                      {selectedItem.nutritionEstimated && (
                        <p className="text-brand-dark/80 text-xs leading-relaxed mb-3">{t("menu.nutritionEstimated")}</p>
                      )}
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
                        {selectedItem.macros.carbs && (
                          <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-brand-cream-200/50 border border-brand-green-700/5">
                            <Wheat className="w-5 h-5 text-amber-700/80 mb-1" />
                            <span className="text-brand-dark/80 font-semibold text-sm">{selectedItem.macros.carbs}</span>
                            <span className="text-brand-dark/50 text-[11px] font-medium">{t("menu.macros.carbs")}</span>
                          </div>
                        )}
                        <div className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-brand-cream-200/50 border border-brand-green-700/5">
                          <Nut className="w-5 h-5 text-amber-700 mb-1" />
                          <span className="text-brand-dark/80 font-semibold text-sm">{selectedItem.macros.fat}</span>
                          <span className="text-brand-dark/50 text-[11px] font-medium">{t("menu.macros.fat")}</span>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="mt-6">
                    {isSalesEnabled && <AddToCart categoryId={activeCategoryObj.id} item={selectedItem} onAdd={handleAddToCart} items={cart.items} />}
                  </div>
                  <p role="status" className="mt-3 text-sm text-brand-green-800">{isSalesEnabled && addedMessage}</p>
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
