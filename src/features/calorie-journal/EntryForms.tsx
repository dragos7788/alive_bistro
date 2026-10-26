import { useRef, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import type { MenuItem, MenuGroup } from "../menu/types"
import type { JournalEntryInput } from "./api"

type MenuOption = {
  id: string
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
}

function asNutrient(value: string | number | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null
  if (typeof value !== "string") return null
  const parsed = Number.parseFloat(value.replace(",", "."))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function createMenuOptions(groups: MenuGroup[], language: string): MenuOption[] {
  return groups.flatMap(group => group.categories.flatMap(category =>
    category.items.flatMap((item: MenuItem, index) => {
      const calories = item.macros?.calories
      if (typeof calories !== "number" || !Number.isFinite(calories) || calories < 0) return []
      return [{
        id: `${group.id}:${category.id}:${index}`,
        name: language.startsWith("en") ? item.name_en ?? item.name : item.name,
        calories,
        protein: asNutrient(item.macros?.protein),
        carbs: asNutrient(item.macros?.carbs),
        fat: asNutrient(item.macros?.fat),
      }]
    }),
  ))
}

export function EntryForms({ groups, date, saving, onAdd }: {
  groups: MenuGroup[]
  date: string
  saving: boolean
  onAdd: (entry: JournalEntryInput) => Promise<boolean>
}) {
  const { t, i18n } = useTranslation()
  const options = createMenuOptions(groups, i18n.language)
  const [selectedId, setSelectedId] = useState("")
  const [servings, setServings] = useState("1")
  const [foodName, setFoodName] = useState("")
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [carbs, setCarbs] = useState("")
  const [fat, setFat] = useState("")
  const menuRequestKeys = useRef(new Map<string, string>())
  const manualRequestKeys = useRef(new Map<string, string>())

  function handleMenuSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const option = options.find(item => item.id === selectedId)
    const count = Number(servings)
    if (!option || !Number.isFinite(count) || count <= 0 || count > 20) return
    const draft = {
      consumedOn: date,
      foodName: `${option.name} × ${count}`,
      servings: count,
      calories: Math.round(option.calories * count * 10) / 10,
      protein: option.protein === null ? null : Math.round(option.protein * count * 10) / 10,
      carbs: option.carbs === null ? null : Math.round(option.carbs * count * 10) / 10,
      fat: option.fat === null ? null : Math.round(option.fat * count * 10) / 10,
    }
    const fingerprint = JSON.stringify(draft)
    const requestKey = menuRequestKeys.current.get(fingerprint) ?? crypto.randomUUID()
    menuRequestKeys.current.set(fingerprint, requestKey)
    void onAdd({ ...draft, requestKey }).then(added => {
      if (added) {
        menuRequestKeys.current.clear()
        setSelectedId("")
      }
    })
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const draft = {
      consumedOn: date,
      foodName: foodName.trim(),
      servings: 1,
      calories: Number(calories),
      protein: protein === "" ? null : Number(protein),
      carbs: carbs === "" ? null : Number(carbs),
      fat: fat === "" ? null : Number(fat),
    }
    const fingerprint = JSON.stringify(draft)
    const requestKey = manualRequestKeys.current.get(fingerprint) ?? crypto.randomUUID()
    manualRequestKeys.current.set(fingerprint, requestKey)
    void onAdd({ ...draft, requestKey }).then(added => {
      if (!added) return
      manualRequestKeys.current.clear()
      setFoodName("")
      setCalories("")
      setProtein("")
      setCarbs("")
      setFat("")
    })
  }

  return (
    <section aria-labelledby="journal-add-heading" className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={handleMenuSubmit} className="space-y-4 rounded-3xl border border-brand-green-700/15 bg-white p-5 sm:p-7">
        <h2 id="journal-add-heading" className="font-serif text-2xl font-semibold">{t("calorieJournal.addFromMenu")}</h2>
        <div className="space-y-2">
          <label htmlFor="journal-menu-item" className="block text-sm font-medium">{t("calorieJournal.menuItem")}</label>
          <select id="journal-menu-item" required value={selectedId} onChange={event => setSelectedId(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-brand-green-700/25 bg-brand-cream-50 px-3 focus-visible:outline-2 focus-visible:outline-brand-green-700">
            <option value="">{t("calorieJournal.chooseMenuItem")}</option>
            {options.map(item => <option key={item.id} value={item.id}>
              {item.name} · {item.calories} kcal
            </option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="journal-servings" className="block text-sm font-medium">{t("calorieJournal.servings")}</label>
          <input id="journal-servings" type="number" min="0.1" max="20" step="0.1" required value={servings}
            onChange={event => setServings(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-brand-green-700/25 bg-brand-cream-50 px-3 focus-visible:outline-2 focus-visible:outline-brand-green-700" />
        </div>
        <button type="submit" disabled={saving || !options.length}
          className="min-h-12 rounded-xl bg-brand-green-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 disabled:opacity-50">
          {t("calorieJournal.addEntry")}
        </button>
      </form>

      <form onSubmit={handleManualSubmit} className="space-y-4 rounded-3xl border border-brand-green-700/15 bg-white p-5 sm:p-7">
        <h2 className="font-serif text-2xl font-semibold">{t("calorieJournal.addManual")}</h2>
        <div className="space-y-2">
          <label htmlFor="journal-food-name" className="block text-sm font-medium">{t("calorieJournal.foodName")}</label>
          <input id="journal-food-name" required maxLength={100} value={foodName} onChange={event => setFoodName(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-brand-green-700/25 bg-brand-cream-50 px-3 focus-visible:outline-2 focus-visible:outline-brand-green-700" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ["calories", calories, setCalories, true],
            ["protein", protein, setProtein, false],
            ["carbs", carbs, setCarbs, false],
            ["fat", fat, setFat, false],
          ] as const).map(([key, value, setValue, required]) => (
            <div key={key} className="space-y-2">
              <label htmlFor={`journal-${key}`} className="block text-sm font-medium">{t(`calorieJournal.${key}`)}</label>
              <input id={`journal-${key}`} type="number" min="0" max={key === "calories" ? 200000 : 20000}
                step="0.1" required={required} value={value}
                onChange={event => setValue(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-brand-green-700/25 bg-brand-cream-50 px-3 focus-visible:outline-2 focus-visible:outline-brand-green-700" />
            </div>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-brand-green-800">{t("calorieJournal.optionalMacros")}</p>
        <button type="submit" disabled={saving}
          className="min-h-12 rounded-xl bg-brand-green-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700 disabled:opacity-50">
          {t("calorieJournal.addEntry")}
        </button>
      </form>
    </section>
  )
}
