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
      items: [{
        name: "Avocado Toast",
        description: "Ingredientele din PDF",
        price: "36 lei",
        image: "/local-avocado.jpg",
        macros: { calories: 522, protein: "27,3 g", carbs: "51,6 g", fat: "25,3 g" },
      }],
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
        categories: [{ ...menuData[0].categories[0], items: [serverItem] }],
      }],
    })))

    const groups = await getMenu()

    expect(groups[0].categories[0].items[0]).toEqual({
      ...serverItem, image: localItem.image, macros: localItem.macros,
    })
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
  })

  it("ApiUnavailable_ReturnsPdfMenu", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })))

    const groups = await getMenu()

    expect(groups).toBe(menuData)
  })
})
