import { useState, useRef, useEffect } from "react"
import { ArrowDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { builderGroups, calculateMenu, type MenuSelection } from "./calculator"
import { BuilderStep, BuilderStepIcon } from "./BuilderStep"
import { BuilderSummary } from "./BuilderSummary"
import { performanceCartProduct, type CartProduct } from "../cart/cart"

/** Lets guests configure a plate from the published custom-menu portions. */
export function MenuBuilder({ onAddToCart, cartError, isSalesEnabled, discountPercent = 0 }: {
  onAddToCart: (product: CartProduct) => boolean
  cartError: string
  isSalesEnabled: boolean
  discountPercent?: number
}) {
  const { t } = useTranslation()
  const [selection, setSelection] = useState<MenuSelection>({})
  const [addedCount, setAddedCount] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])
  const total = calculateMenu(selection)

  const handleAddToCart = () => {
    if (onAddToCart(performanceCartProduct(selection, discountPercent))) setAddedCount(count => count + 1)
  }

  return (
    <section id="custom-menu" aria-labelledby="builder-title"
      className="menu-builder scroll-mt-20 bg-brand-cream-200/50 px-6 py-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="relative mb-8 overflow-hidden rounded-[1.75rem] border border-brand-green-700/10 bg-[#ffddbd] p-5 shadow-sm sm:mb-10 sm:rounded-[2rem] sm:p-9">
          <div className="relative z-10 max-w-2xl">
            <p className="mb-3 flex items-center gap-2 whitespace-nowrap text-base font-bold uppercase tracking-[0.1em] text-brand-green-700 sm:text-lg">
                <svg width={32} height={32} viewBox="0 0 40 40" fill="currentColor" className="shrink-0" aria-hidden="true" focusable="false">
                  <g transform="rotate(-30 20 20)">
                    <rect x="2" y="15" width="4" height="10" rx="1.5" />
                    <rect x="7" y="10" width="7" height="20" rx="2" />
                    <rect x="14" y="18" width="12" height="4" rx="1" />
                    <rect x="26" y="10" width="7" height="20" rx="2" />
                    <rect x="34" y="15" width="4" height="10" rx="1.5" />
                  </g>
                </svg>
                Build your performance
            </p>
            <h1 id="builder-title" ref={headingRef} tabIndex={-1} className="text-2xl font-bold leading-tight text-brand-green-800 sm:text-4xl focus-visible:outline-2 focus-visible:outline-brand-green-700">
                {t("builder.calculatorTitle")}
            </h1>
            <ul className="mt-5 grid gap-2 text-sm leading-relaxed text-brand-green-900 sm:mt-6 sm:gap-3 sm:text-base">
              {t("builder.instructions").split("\n").map(instruction => (
                <li key={instruction} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-[0.65em] size-1.5 shrink-0 rounded-full bg-brand-green-700/60">
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
            <a href="#menu-calculator"
              className="mt-6 inline-flex min-h-11 items-center gap-3 rounded-full bg-brand-green-700 px-5 py-2.5 text-sm font-semibold text-brand-cream-50 shadow-sm transition-colors hover:bg-brand-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700">
                {t("builder.start")} <ArrowDown size={17} aria-hidden="true" />
              </a>
          </div>
        </div>

        <div id="menu-calculator" className="scroll-mt-24">
          <nav aria-label={t("builder.stepsLabel")} className="sticky top-[194px] z-30 -mx-6 border-b border-brand-green-700/15 bg-brand-cream-100 px-3 py-[14px] sm:px-6 shadow-sm">
            <ol className="mx-auto grid max-w-6xl grid-cols-4 gap-1">
              {builderGroups.map((group, index) => {
                const isChosen = !!selection[group]
                return <li key={group}>
                  <a href={`#builder-step-${group}`}
                    className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 sm:flex-row sm:gap-2 sm:text-sm ${
                      isChosen ? "bg-brand-green-700 text-brand-cream-50" : "bg-brand-green-700/5 text-brand-green-700 hover:bg-brand-green-700/10"
                    }`}>
                    <span className="relative">
                      <BuilderStepIcon group={group} />
                    </span>
                    <span className="whitespace-nowrap text-[10px] sm:text-sm">{index + 1}. {t(`builder.stepNames.${group}`)}</span>
                    <span className="sr-only">{isChosen ? t("builder.stepChosen") : t("builder.stepOptional")}</span>
                  </a>
                </li>
              })}
            </ol>
          </nav>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <form aria-label={t("builder.calculatorTitle")} className="grid min-w-0 gap-7" onSubmit={event => event.preventDefault()}>
              {builderGroups.map((group, index) => (
                <BuilderStep key={group} group={group} step={index + 1} choice={selection[group]}
                  onChange={choice => setSelection(previous => {
                    const next = { ...previous }
                    if (choice) next[group] = choice
                    else delete next[group]
                    return next
                  })} />
              ))}
            </form>
            <BuilderSummary total={total} discountPercent={discountPercent} onReset={() => setSelection({})}
              onAddToCart={handleAddToCart} addedCount={addedCount} cartError={cartError} isSalesEnabled={isSalesEnabled} />
          </div>
        </div>
      </div>
    </section>
  )
}
