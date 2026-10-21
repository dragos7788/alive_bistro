import { useState } from "react"
import { ArrowDown, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import { builderGroups, calculateMenu, type MenuSelection } from "./calculator"
import { BuilderStep } from "./BuilderStep"
import { BuilderSummary } from "./BuilderSummary"

/** Lets guests configure a plate from the published custom-menu portions. */
export function MenuBuilder() {
  const { t } = useTranslation()
  const [selection, setSelection] = useState<MenuSelection>({})
  const total = calculateMenu(selection)

  return (
    <section id="custom-menu" aria-labelledby="builder-title"
      className="menu-builder scroll-mt-20 bg-brand-cream-200/50 px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="relative mb-10 overflow-hidden rounded-[2rem] border border-brand-green-700/10 bg-[#ffddbd] p-7 sm:p-10">
          <div className="relative z-10">
            <div>
              <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-green-700">
                <Sparkles size={16} aria-hidden="true" /> Build your performance
              </p>
              <h2 id="builder-title" className="max-w-xl text-4xl font-bold leading-tight text-brand-green-800 sm:text-5xl">
                {t("builder.title")}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-green-900">{t("builder.intro")}</p>
              <a href="#menu-calculator" className="mt-6 inline-flex min-h-11 items-center gap-3 rounded-full bg-brand-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-green-800">
                {t("builder.start")} <ArrowDown size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div id="menu-calculator" className="scroll-mt-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-3xl font-bold text-brand-green-700">{t("builder.calculatorTitle")}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed">{t("builder.instructions")}</p>
            </div>
            <span className="rounded-full border border-brand-green-700/20 bg-brand-cream-50 px-4 py-2 text-xs font-semibold text-brand-green-700">
              {t("builder.progress", { selected: total.lines.length, total: builderGroups.length })}
            </span>
          </div>
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
            <BuilderSummary total={total} onReset={() => setSelection({})} />
          </div>
        </div>
      </div>
    </section>
  )
}
