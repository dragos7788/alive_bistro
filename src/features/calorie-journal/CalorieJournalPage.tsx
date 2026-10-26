import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { getMenu } from "../menu/api"
import type { MenuGroup } from "../menu/types"
import { addJournalEntry, deleteJournalEntry, getJournal, saveCalorieGoal, type JournalData, type JournalEntry } from "./api"
import { EntryForms } from "./EntryForms"

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function shiftDate(date: string, days: number): string {
  const next = new Date(`${date}T12:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

function total(entries: JournalEntry[], key: "calories" | "protein" | "carbs" | "fat"): number | null {
  if (key !== "calories" && entries.some(entry => entry[key] === null)) return null
  return Math.round(entries.reduce((sum, entry) => sum + (entry[key] ?? 0), 0) * 10) / 10
}

function NutrientTotal({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return <div className="rounded-2xl bg-brand-cream-100 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-800">{label}</p>
    <p className="mt-1 text-xl font-semibold">{value === null ? "—" : `${value} ${unit}`}</p>
  </div>
}

export function CalorieJournalPage({ customerName, isChecking }: { customerName: string | null; isChecking: boolean }) {
  const { t, i18n } = useTranslation()
  const heading = useRef<HTMLHeadingElement>(null)
  const [date, setDate] = useState(() => localDateString(new Date()))
  const [data, setData] = useState<JournalData | null>(null)
  const [groups, setGroups] = useState<MenuGroup[]>([])
  const [goalDraft, setGoalDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState("")
  const [reload, setReload] = useState(0)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const isAuthenticated = Boolean(customerName)
  const entries = data?.entries ?? []
  const calories = total(entries, "calories")
  const protein = total(entries, "protein")
  const carbs = total(entries, "carbs")
  const fat = total(entries, "fat")
  const targetCalories = data?.targetCalories ?? 2000
  const progress = calories ?? 0

  useEffect(() => { heading.current?.focus() }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const controller = new AbortController()
    void getJournal(date, controller.signal).then(result => {
      if (controller.signal.aborted) return
      setData(result)
      setGoalDraft(String(result.targetCalories))
      setError("")
    }).catch(reason => {
      if (controller.signal.aborted) return
      console.error("ALIVE calorie journal loading failed", reason)
      setError("calorieJournal.error")
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [date, isAuthenticated, reload])

  useEffect(() => {
    let isCurrent = true
    void getMenu().then(result => { if (isCurrent) setGroups(result) })
    return () => { isCurrent = false }
  }, [])

  async function handleAdd(entry: Parameters<typeof addJournalEntry>[0]): Promise<boolean> {
    setSaving(true)
    setError("")
    setNotice("")
    try {
      await addJournalEntry(entry)
      setNotice("calorieJournal.entryAdded")
      setLoading(true)
      setReload(value => value + 1)
      return true
    } catch (reason) {
      console.error("ALIVE calorie journal entry could not be saved", reason)
      setError("calorieJournal.error")
      return false
    } finally { setSaving(false) }
  }

  async function handleGoalSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = Number(goalDraft)
    setSaving(true)
    setError("")
    setNotice("")
    try {
      await saveCalorieGoal(value)
      setData(current => current ? { ...current, targetCalories: value } : current)
      setNotice("calorieJournal.goalSaved")
    } catch (reason) {
      console.error("ALIVE calorie journal goal could not be saved", reason)
      setError("calorieJournal.error")
    } finally { setSaving(false) }
  }

  async function handleDelete(entry: JournalEntry) {
    setDeletingId(entry.id)
    setError("")
    setNotice("")
    try {
      await deleteJournalEntry(entry.id)
      setLoading(true)
      setReload(value => value + 1)
      setNotice("calorieJournal.entryRemoved")
    } catch (reason) {
      console.error("ALIVE calorie journal entry could not be removed", reason)
      setError("calorieJournal.error")
    } finally { setDeletingId("") }
  }

  const formattedDate = new Intl.DateTimeFormat(i18n.language, { dateStyle: "full" })
    .format(new Date(`${date}T12:00:00`))

  return (
    <main className="mx-auto min-h-[75dvh] max-w-5xl px-5 pb-16 pt-32 sm:px-8">
      <a href="/account" className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-green-800 focus-visible:outline-2 focus-visible:outline-brand-green-700">
        <ArrowLeft size={18} aria-hidden="true" />{t("calorieJournal.backToAccount")}
      </a>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-green-700">ALIVE COMMUNITY</p>
      <h1 ref={heading} tabIndex={-1} className="mt-3 font-serif text-4xl font-semibold text-brand-dark focus-visible:outline-2 focus-visible:outline-brand-green-700 sm:text-5xl">
        {t("calorieJournal.title")}
      </h1>
      {isChecking ? <p role="status" className="mt-8">{t("calorieJournal.loading")}</p> : !isAuthenticated ? (
        <section className="mt-8 max-w-xl space-y-4 rounded-3xl border border-brand-green-700/15 bg-white p-6">
          <p>{t("calorieJournal.signInRequired")}</p>
          <a href="/account" className="inline-flex min-h-12 items-center rounded-xl bg-brand-green-700 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-700">
            {t("account.signIn")}
          </a>
        </section>
      ) : (
        <div className="mt-8 space-y-8">
          <section aria-labelledby="journal-day-heading" className="rounded-3xl border border-brand-green-700/15 bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 id="journal-day-heading" className="font-serif text-2xl font-semibold">{formattedDate}</h2>
                <p className="mt-1 text-sm text-brand-green-800">{t("calorieJournal.daySummary")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setLoading(true); setDate(value => shiftDate(value, -1)) }} aria-label={t("calorieJournal.previousDay")}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-brand-green-700/20 focus-visible:outline-2 focus-visible:outline-brand-green-700">
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <label htmlFor="journal-date" className="sr-only">{t("calorieJournal.selectDate")}</label>
                <input id="journal-date" type="date" value={date} onChange={event => {
                  if (event.target.value) { setLoading(true); setDate(event.target.value) }
                }}
                  className="min-h-11 rounded-xl border border-brand-green-700/25 bg-brand-cream-50 px-3 focus-visible:outline-2 focus-visible:outline-brand-green-700" />
                <button type="button" onClick={() => { setLoading(true); setDate(value => shiftDate(value, 1)) }} aria-label={t("calorieJournal.nextDay")}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-brand-green-700/20 focus-visible:outline-2 focus-visible:outline-brand-green-700">
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NutrientTotal label={t("calorieJournal.calories")} value={calories} unit="kcal" />
              <NutrientTotal label={t("calorieJournal.protein")} value={protein} unit="g" />
              <NutrientTotal label={t("calorieJournal.carbs")} value={carbs} unit="g" />
              <NutrientTotal label={t("calorieJournal.fat")} value={fat} unit="g" />
            </div>
            <div className="mt-6">
              <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                <span>{t("calorieJournal.goalProgress", { current: calories ?? 0, target: targetCalories })}</span>
                {calories !== null && calories > targetCalories && <span>{t("calorieJournal.overGoal")}</span>}
              </div>
              <progress aria-label={t("calorieJournal.goalProgress", { current: calories ?? 0, target: targetCalories })}
                value={Math.min(progress, targetCalories)} max={targetCalories}
                className="h-3 w-full accent-brand-green-700" />
            </div>
            <form onSubmit={handleGoalSubmit} className="mt-5 flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <label htmlFor="journal-goal" className="block text-sm font-medium">{t("calorieJournal.dailyGoal")}</label>
                <input id="journal-goal" type="number" min="500" max="10000" step="50" required value={goalDraft}
                  onChange={event => setGoalDraft(event.target.value)}
                  className="min-h-11 w-40 rounded-xl border border-brand-green-700/25 bg-brand-cream-50 px-3 focus-visible:outline-2 focus-visible:outline-brand-green-700" />
              </div>
              <button type="submit" disabled={saving} className="min-h-11 rounded-xl border border-brand-green-700 px-4 font-semibold text-brand-green-800 focus-visible:outline-2 focus-visible:outline-brand-green-700 disabled:opacity-50">
                {t("calorieJournal.saveGoal")}
              </button>
            </form>
          </section>

          {(error || notice) && <p role={error ? "alert" : "status"} aria-live={error ? "assertive" : "polite"} className={error ? "text-red-800" : "text-brand-green-800"}>
            {t(error || notice)}
          </p>}

          <section aria-labelledby="journal-entries-heading" className="space-y-4">
            <h2 id="journal-entries-heading" className="font-serif text-2xl font-semibold">{t("calorieJournal.entries")}</h2>
            {loading ? <p role="status">{t("calorieJournal.loading")}</p> : entries.length ? (
              <ul className="space-y-3">
                {entries.map(entry => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-green-700/15 bg-white p-4">
                    <div>
                      <p className="font-semibold">{entry.foodName}</p>
                      <p className="mt-1 text-sm text-brand-green-800">
                        {entry.calories} kcal · {t("calorieJournal.proteinShort")} {entry.protein ?? "—"} g · {t("calorieJournal.carbsShort")} {entry.carbs ?? "—"} g · {t("calorieJournal.fatShort")} {entry.fat ?? "—"} g
                      </p>
                    </div>
                    <button type="button" disabled={deletingId === entry.id} onClick={() => void handleDelete(entry)}
                      aria-label={t("calorieJournal.removeEntry", { name: entry.foodName })}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-brand-green-800 hover:bg-brand-green-700/10 focus-visible:outline-2 focus-visible:outline-brand-green-700 disabled:opacity-50">
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : !loading ? <p className="rounded-2xl bg-white p-5 text-brand-green-800">{t("calorieJournal.empty")}</p> : null}
          </section>

          <EntryForms groups={groups} date={date} saving={saving} onAdd={handleAdd} />
          <p className="text-xs leading-relaxed text-brand-green-800">{t("calorieJournal.nutritionNote")}</p>
        </div>
      )}
    </main>
  )
}
