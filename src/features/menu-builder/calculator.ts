export const builderGroups = ["protein", "carbs", "fibre", "sauce"] as const
export type BuilderGroup = typeof builderGroups[number]
export type MenuSelection = Partial<Record<BuilderGroup, { ingredientId: string; amount: number }>>

export interface Portion {
  amount: number
  price: number
  calories: number
  protein: number
  carbs: number
}

export interface Ingredient {
  id: string
  group: BuilderGroup
  unit: "g" | "ml"
  allergens: string[]
  portions: Portion[]
}

// Values are transcribed per serving, not scaled from the per-100-g declarations.
export const ingredients: Ingredient[] = [
  {
    id: "chicken", group: "protein", unit: "g", allergens: [],
    portions: [
      { amount: 100, price: 12, calories: 170, protein: 30.5, carbs: 0 },
      { amount: 150, price: 17, calories: 245, protein: 45, carbs: 0 },
      { amount: 200, price: 22, calories: 322, protein: 60, carbs: 0 },
    ],
  },
  {
    id: "turkey", group: "protein", unit: "g", allergens: [],
    portions: [
      { amount: 100, price: 19, calories: 141, protein: 30.8, carbs: 0 },
      { amount: 150, price: 26, calories: 209, protein: 46, carbs: 0 },
      { amount: 200, price: 34, calories: 277, protein: 61.2, carbs: 0 },
    ],
  },
  {
    id: "salmon", group: "protein", unit: "g", allergens: ["fish"],
    portions: [
      { amount: 100, price: 30, calories: 281, protein: 27.5, carbs: 0 },
      { amount: 150, price: 41, calories: 335, protein: 32.8, carbs: 0 },
    ],
  },
  {
    id: "beef", group: "protein", unit: "g", allergens: [],
    portions: [
      { amount: 100, price: 30, calories: 208, protein: 30, carbs: 0 },
      { amount: 150, price: 41, calories: 304, protein: 44.2, carbs: 0 },
      { amount: 200, price: 55, calories: 399, protein: 58.5, carbs: 0 },
    ],
  },
  {
    id: "rice", group: "carbs", unit: "g", allergens: [],
    portions: [
      { amount: 100, price: 7, calories: 128, protein: 2.5, carbs: 27.5 },
      { amount: 200, price: 11, calories: 256, protein: 5, carbs: 55 },
      { amount: 300, price: 15, calories: 365, protein: 7.1, carbs: 78.6 },
    ],
  },
  {
    id: "sweet-potato", group: "carbs", unit: "g", allergens: [],
    portions: [
      { amount: 100, price: 9, calories: 127, protein: 2.2, carbs: 27.2 },
      { amount: 200, price: 13, calories: 245, protein: 4.3, carbs: 54.4 },
      { amount: 300, price: 17, calories: 361, protein: 6.4, carbs: 80.6 },
    ],
  },
  {
    id: "quinoa", group: "carbs", unit: "g", allergens: [],
    portions: [
      { amount: 100, price: 10, calories: 147, protein: 4.3, carbs: 22.6 },
      { amount: 200, price: 14, calories: 296, protein: 8.6, carbs: 43.1 },
      { amount: 300, price: 18, calories: 443, protein: 12.9, carbs: 64.7 },
    ],
  },
  {
    id: "fresh", group: "fibre", unit: "g", allergens: ["celery"],
    portions: [{ amount: 120, price: 7, calories: 43, protein: 1.6, carbs: 9.7 }],
  },
  {
    id: "warm", group: "fibre", unit: "g", allergens: [],
    portions: [{ amount: 150, price: 8, calories: 60, protein: 2.4, carbs: 13.3 }],
  },
  {
    id: "asian", group: "sauce", unit: "ml", allergens: ["soy", "molluscs", "sesame", "fish", "peanuts"],
    portions: [{ amount: 30, price: 4, calories: 43, protein: 1.6, carbs: 9.7 }],
  },
  {
    id: "citrus", group: "sauce", unit: "ml", allergens: ["mustard"],
    portions: [{ amount: 30, price: 4, calories: 132, protein: 0.3, carbs: 4.1 }],
  },
]

/** Calculates declared serving totals; rejects unavailable ingredients or portions. */
export function calculateMenu(selection: MenuSelection) {
  const lines = builderGroups.flatMap(group => {
    const choice = selection[group]
    if (!choice) return []
    const ingredient = ingredients.find(item => item.group === group && item.id === choice.ingredientId)
    const portion = ingredient?.portions.find(item => item.amount === choice.amount)
    if (!ingredient || !portion) throw new Error(`Invalid menu selection: ${group}`)
    return [{ ingredient, portion }]
  })
  const sum = (key: "price" | "calories" | "protein" | "carbs") =>
    Math.round(lines.reduce((total, line) => total + line.portion[key], 0) * 10) / 10

  return {
    lines,
    price: sum("price"),
    calories: sum("calories"),
    protein: sum("protein"),
    carbs: sum("carbs"),
    grams: lines.filter(line => line.ingredient.unit === "g").reduce((total, line) => total + line.portion.amount, 0),
    millilitres: lines.filter(line => line.ingredient.unit === "ml").reduce((total, line) => total + line.portion.amount, 0),
    allergens: [...new Set(lines.flatMap(line => line.ingredient.allergens))],
  }
}
