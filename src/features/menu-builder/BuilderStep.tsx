import { Beef, Wheat, Leaf, Droplets } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ingredients, type BuilderGroup, type MenuSelection } from "./calculator"

const stepIcons = { protein: Beef, carbs: Wheat, fibre: Leaf, sauce: Droplets }

interface BuilderStepProps {
  group: BuilderGroup
  step: number
  choice: MenuSelection[BuilderGroup]
  onChange: (choice: MenuSelection[BuilderGroup]) => void
}

/** Renders one optional ingredient choice and its available serving sizes. */
export function BuilderStep({ group, step, choice, onChange }: BuilderStepProps) {
  const { t, i18n } = useTranslation()
  const options = ingredients.filter(ingredient => ingredient.group === group)
  const selected = options.find(ingredient => ingredient.id === choice?.ingredientId)
  const Icon = stepIcons[group]
  const money = (value: number) => new Intl.NumberFormat(i18n.language, {
    style: "currency", currency: "RON", maximumFractionDigits: 0,
  }).format(value)

  return (
    <fieldset className="min-w-0 rounded-3xl border border-brand-green-700/15 bg-brand-cream-50 p-5 sm:p-7">
      <legend className="px-2 text-lg font-bold text-brand-green-700">
        <span className="mr-2 inline-flex size-7 items-center justify-center rounded-full bg-brand-green-700 text-sm text-white">{step}</span>
        {t(`builder.groups.${group}.title`)}
      </legend>
      <p className="mb-5 flex items-start gap-2 text-sm leading-relaxed text-brand-dark">
        <Icon size={20} className="mt-0.5 shrink-0 text-brand-green-600" aria-hidden="true" />
        {t(`builder.groups.${group}.description`)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(ingredient => {
          const isSelected = choice?.ingredientId === ingredient.id
          return (
            <label key={ingredient.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
              isSelected ? "border-brand-green-700 bg-brand-green-100" : "border-brand-green-700/20 bg-white hover:border-brand-green-700/50"
            }`}>
              <input
                type="radio"
                name={`builder-${group}`}
                value={ingredient.id}
                checked={isSelected}
                onChange={() => onChange({ ingredientId: ingredient.id, amount: ingredient.portions[0].amount })}
                className="mt-1 size-4 shrink-0 accent-brand-green-700"
              />
              <span>
                <span className="block text-sm font-bold leading-relaxed">{t(`builder.ingredients.${ingredient.id}.name`)}</span>
                <span className="mt-1 block text-xs text-brand-green-700">
                  {ingredient.portions.length > 1 ? t("builder.from") + " " : ""}
                  {money(ingredient.portions[0].price)}
                  {ingredient.portions.length === 1 ? ` / ${ingredient.portions[0].amount} ${ingredient.unit}` : ""}
                </span>
              </span>
            </label>
          )
        })}
      </div>
      <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 py-2 text-sm text-brand-green-700">
        <input type="radio" name={`builder-${group}`} value="none" checked={!choice}
          onChange={() => onChange(undefined)} className="size-4 accent-brand-green-700" />
        {t(`builder.groups.${group}.skip`)}
      </label>
      {selected && choice && (
        <div className="mt-4 border-t border-brand-green-700/15 pt-4">
          <fieldset>
            <legend className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-green-700">
              {t("builder.portion")}
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {selected.portions.map(portion => (
                <label key={portion.amount} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name={`builder-portion-${group}`}
                    value={portion.amount}
                    checked={choice.amount === portion.amount}
                    onChange={() => onChange({ ingredientId: selected.id, amount: portion.amount })}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-brand-green-700/25 bg-white px-3 py-3 text-brand-green-700 transition-colors hover:border-brand-green-700 peer-checked:border-brand-green-700 peer-checked:bg-brand-green-700 peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-brand-green-700">
                    <span className="text-sm font-bold">{portion.amount} {selected.unit}</span>
                    <span className="text-xs">{money(portion.price)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {["fresh", "warm", "quinoa"].includes(selected.id) && (
            <p className="mt-3 text-xs leading-relaxed">{t(`builder.ingredients.${selected.id}.description`)}</p>
          )}
          <p className="mt-3 text-xs leading-relaxed">
            <span className="font-bold">{t("builder.allergens")}: </span>
            {selected.allergens.length
              ? selected.allergens.map(allergen => t(`builder.allergenNames.${allergen}`)).join(", ")
              : t("builder.noDeclaredAllergens")}
          </p>
        </div>
      )}
    </fieldset>
  )
}
