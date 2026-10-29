import { afterEach, describe, expect, it, vi } from "vitest"
import { getMenu } from "./api"
import { menuData } from "./seed"

vi.mock("./seed", () => ({
  menuData: [{
    id: "food",
    label: "Mâncare",
    iconKey: "fork-knife",
    categories: [{
      id: "breakfast-brunch",
      label: "Breakfast & Brunch",
      iconKey: "egg",
      items: [
        {
          name: "Avocado Toast",
          description: "Ingredientele din PDF",
          price: "36 lei",
          image: "/local-avocado.jpg",
          imageSrcSet: "/avocado-480.webp 480w, /avocado-800.webp 800w",
          macros: { calories: 522, protein: "27,3 g", carbs: "51,6 g", fat: "25,3 g" },
        },
        {
          name: "Espresso",
          description: "Cafea și apă",
          price: "10 lei",
          macros: { calories: 2, protein: "0,1 g", carbs: "0,3 g", fat: "0 g" },
          nutritionEstimated: true,
        },
      ],
    }, {
      id: "halloween-special",
      label: "Halloween Special Menu",
      iconKey: "fork-knife",
      items: [{
        name: "Tartă de dovleac",
        description: "120 g · Tartă de dovleac.",
        price: "Inclusă în meniu",
        menuComponent: true,
      }],
    }],
  }, {
    id: "drinks",
    label: "Băuturi",
    iconKey: "coffee",
    categories: [{
      id: "tea-matcha",
      label: "Tea & Matcha",
      iconKey: "tea-bag",
      items: [
        { name: "Matcha", description: "200 ml · Apă și pudră de matcha.", description_en: "200 ml · Water and matcha powder.", price: "20 lei" },
        { name: "Matcha Latte", description: "200 ml · Cremă de lapte și pudră de matcha.", description_en: "200 ml · Milk and matcha powder.", price: "25 lei" },
        { name: "Iced Matcha Latte", description: "300 ml · Lapte, pudră de matcha și gheață.", description_en: "300 ml · Milk, matcha powder and ice.", price: "25 lei" },
        { name: "Ceai Mango", description: "400 ml · Ceai și apă.", price: "18 lei" },
        { name: "Ceai Summer Love", description: "400 ml · Ceai și apă.", price: "18 lei" },
      ],
    }],
  }],
}))

afterEach(() => vi.unstubAllGlobals())

describe("getMenu", () => {
  it("ApiWithoutNutrition_UsesPdfMacrosAndLocalImage", async () => {
    const localItem = menuData[0].categories[0].items[0]
    const serverItem = { name: localItem.name, description: "Ingrediente editate în admin", price: "40 lei" }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      data: [{
        ...menuData[0],
        categories: [
          { ...menuData[0].categories[0], items: [serverItem] },
          { ...menuData[0].categories[1], items: [{
            name: "Tartă de dovleac",
            description: "120 g · Tartă editată în admin.",
            price: "Inclusă în meniu",
          }] },
        ],
      }],
    })))

    const groups = await getMenu()

    expect(groups[0].categories[0].items[0]).toEqual({
      ...serverItem, image: localItem.image, imageSrcSet: localItem.imageSrcSet, macros: localItem.macros,
    })
    expect(groups[0].categories[1].items[0].menuComponent).toBe(true)
  })

  it("ApiWithAdminNutrition_PreservesValuesIncludingMissingCarbsAndZeroCalories", async () => {
    const serverItem = {
      name: "Avocado Toast",
      description: "Editat",
      price: "40 lei",
      image: "/api/images/custom.jpg",
      macros: { calories: 0, protein: "0 g", fat: "0 g" },
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      data: [{
        ...menuData[0],
        categories: [{ ...menuData[0].categories[0], items: [serverItem] }],
      }],
    })))

    const groups = await getMenu()

    expect(groups[0].categories[0].items[0]).toEqual(serverItem)
    expect(groups[0].categories[0].items[0].imageSrcSet).toBeUndefined()
  })

  it("ApiWithoutNutrition_PreservesEstimatedNutritionLabelFromLocalMenu", async () => {
    const serverItem = { name: "Espresso", description: "Cafea și apă", price: "10 lei" }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      data: [{
        ...menuData[0],
        categories: [{ ...menuData[0].categories[0], items: [serverItem] }],
      }],
    })))

    const groups = await getMenu()

    expect(groups[0].categories[0].items[0]).toEqual({
      ...serverItem,
      macros: { calories: 2, protein: "0,1 g", carbs: "0,3 g", fat: "0 g" },
      nutritionEstimated: true,
    })
  })

  it("ApiWithOldMatchaOrdering_UsesLocalOrderAndEnglishDescriptions", async () => {
    const category = menuData[1].categories[0]
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      data: [{
        ...menuData[1],
        categories: [{
          ...category,
          items: [...category.items].reverse().map(({ name, description, price }) => ({ name, description, price })),
        }],
      }],
    })))

    const groups = await getMenu()
    const items = groups[0].categories[0].items

    expect(items.slice(0, 3).map(item => item.name)).toEqual([
      "Matcha",
      "Matcha Latte",
      "Iced Matcha Latte",
    ])
    expect(items.find(item => item.name === "Matcha")?.description_en).toBe("200 ml · Water and matcha powder.")
  })

  it("ApiUnavailable_ReturnsPdfMenu", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })))

    const groups = await getMenu()

    expect(groups).toBe(menuData)
  })
})
