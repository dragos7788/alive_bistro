export type Macros = {
  calories: number
  protein: string
  carbs: string
  fat: string
}

export type MenuItem = {
  name: string
  name_en?: string
  description: string
  description_en?: string
  price: string
  image?: string
  tag?: string
  macros?: Macros
}

export type MenuCategory = {
  id: string
  label: string
  iconKey: string
  items: MenuItem[]
}

export type MenuGroup = {
  id: "food" | "drinks"
  label: string
  iconKey: string
  categories: MenuCategory[]
}
