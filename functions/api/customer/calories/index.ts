import type { Ctx } from "../../../_lib/types"
import { parseCalorieGoal, parseJournalEntry, isValidJournalDate } from "../../../_lib/calorie-journal"
import { CustomerAuthError } from "../../../_lib/customer-auth"
import { requireCustomer } from "../../../_lib/customer-session"
import { err, ok } from "../../../_lib/response"

const DEFAULT_GOAL = 2000

async function readJson(request: Request): Promise<unknown> {
  const body = await request.text()
  if (new TextEncoder().encode(body).length > 4096) throw new CustomerAuthError("INVALID_INPUT", 413)
  try { return JSON.parse(body) as unknown } catch { throw new CustomerAuthError("INVALID_INPUT") }
}

export async function onRequestGet({ request, env }: Ctx): Promise<Response> {
  const customer = await requireCustomer(request, env)
  const date = new URL(request.url).searchParams.get("date")
  if (!isValidJournalDate(date)) return err("INVALID_DATE", "Alege o dată validă.", 400)

  const [{ results: entries }, goal] = await Promise.all([
    env.DB.prepare(`SELECT id, consumed_on AS consumedOn, food_name AS foodName, servings,
      calories, protein, carbs, fat, created_at AS createdAt
      FROM calorie_journal_entries WHERE customer_id=? AND consumed_on=?
      ORDER BY created_at DESC`)
      .bind(customer.id, date).all(),
    env.DB.prepare("SELECT target_calories AS targetCalories FROM calorie_journal_goals WHERE customer_id=?")
      .bind(customer.id).first<{ targetCalories: number }>(),
  ])
  return ok({ entries, targetCalories: goal?.targetCalories ?? DEFAULT_GOAL })
}

export async function onRequestPost({ request, env }: Ctx): Promise<Response> {
  const customer = await requireCustomer(request, env, true)
  const entry = parseJournalEntry(await readJson(request))
  if (!entry) return err("INVALID_ENTRY", "Verifică datele alimentului și valorile nutriționale.", 400)
  const id = crypto.randomUUID()
  await env.DB.prepare(`INSERT INTO calorie_journal_entries
    (id,customer_id,request_key,consumed_on,food_name,servings,calories,protein,carbs,fat,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(customer_id,request_key) DO NOTHING`)
    .bind(id, customer.id, entry.requestKey, entry.consumedOn, entry.foodName, entry.servings,
      entry.calories, entry.protein, entry.carbs, entry.fat, Math.floor(Date.now() / 1000)).run()
  const saved = await env.DB.prepare("SELECT id FROM calorie_journal_entries WHERE customer_id=? AND request_key=?")
    .bind(customer.id, entry.requestKey).first<{ id: string }>()
  if (!saved) throw new Error("Calorie journal entry was not persisted")
  return ok({ id: saved.id }, saved.id === id ? 201 : 200)
}

export async function onRequestPatch({ request, env }: Ctx): Promise<Response> {
  const customer = await requireCustomer(request, env, true)
  const targetCalories = parseCalorieGoal(await readJson(request))
  if (targetCalories === null) return err("INVALID_GOAL", "Obiectivul trebuie să fie între 500 și 10000 kcal.", 400)
  await env.DB.prepare(`INSERT INTO calorie_journal_goals (customer_id,target_calories,updated_at)
    VALUES (?,?,?) ON CONFLICT(customer_id) DO UPDATE SET
    target_calories=excluded.target_calories, updated_at=excluded.updated_at`)
    .bind(customer.id, targetCalories, Math.floor(Date.now() / 1000)).run()
  return ok({ targetCalories })
}
