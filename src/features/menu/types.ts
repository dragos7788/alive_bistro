export type Macros = {
  calories: number
  protein: string
  carbs?: string
  fat: string
}

export type MenuItem = {
  isAvailable?: boolean
  stockQuantity?: number
  name: string
  name_en?: string
  description: string
  description_en?: string
  price: string
  originalPrice?: string
  discountPercent?: number
  image?: string
  imageSrcSet?: string
  imagePosition?: { x: number; y: number }
  imageZoom?: number
  tag?: string
  menuComponent?: boolean
  macros?: Macros
  nutritionEstimated?: boolean
}

export type MenuCategory = {
  id: string
  discountPercent?: number
  label: string
  iconKey: string
  items: MenuItem[]
}

export type MenuGroup = {
  id: "food" | "drinks"
  performanceDiscountPercent?: number
  label: string
  iconKey: string
  categories: MenuCategory[]
}
