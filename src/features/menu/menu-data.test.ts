import { describe, expect, it } from "vitest"
import source from "./menu-data.json"
import type { MenuCategory, MenuItem } from "./types"

type MenuSourceItem = MenuItem & { imageFile: string | null }

const food = source[0].categories.flatMap<MenuItem>(category => category.items)
const drinks = source[1].categories.flatMap<MenuItem>(category => category.items)

describe("PDF menu details", () => {
  it.each([
    ["Avocado Toast", 522, "27,3 g", "51,6 g", "25,3 g"],
    ["Smoked Salmon & Avocado Toast", 561, "30,8 g", "52,4 g", "27,7 g"],
    ["Protein Omelette", 539, "32,6 g", "50,4 g", "22,4 g"],
    ["Alive Wrap", 441, "37,5 g", "41,3 g", "14,2 g"],
    ["Scrambled Tofu", 424, "23,3 g", "47,7 g", "18,1 g"],
    ["Protein Pancakes", 488, "40,6 g", "36,8 g", "20,5 g"],
    ["Granola Bowl", 460, "11,8 g", "60,6 g", "20,5 g"],
    ["Supă de linte și ardei copt", 387, "17,8 g", "59,1 g", "7,1 g"],
    ["Piept de pui cu orez și sos gochujang", 645, "51,0 g", "53,0 g", "27,1 g"],
    ["Somon cu orez, pesto și legume", 737, "46,7 g", "50,9 g", "37,5 g"],
    ["Noodles cu vită Alive", 629, "38,7 g", "68,7 g", "24,4 g"],
    ["Noodles cu pui Alive", 590, "40,3 g", "68,7 g", "19,0 g"],
    ["Veggie Noodles", 632, "20,1 g", "67,5 g", "34,1 g"],
    ["Vită cu cartofi dulci și ardei copți", 777, "44,5 g", "55,0 g", "42,0 g"],
    ["Salată asiatică cu vită", 423, "31,5 g", "27,0 g", "23,0 g"],
    ["Salată cu tofu", 398, "21,6 g", "36,7 g", "21,5 g"],
    ["Salată cu pui", 419, "35,9 g", "39,8 g", "15,0 g"],
    ["Salmon Bowl", 743, "39,3 g", "65,0 g", "34,6 g"],
    ["Chicken Bowl", 613, "47,9 g", "56,4 g", "22,2 g"],
    ["Beef Bowl", 657, "44,1 g", "67,3 g", "24,0 g"],
    ["Veggie Bowl", 660, "24,0 g", "62,0 g", "36,0 g"],
    ["Mousse de ciocolată", 453, "6,2 g", undefined, "33,7 g"],
    ["Budincă chia cu fulgi de migdale", 386, "12,9 g", undefined, "21,9 g"],
    ["Panna cotta cu fructe de pădure", 389, "3,6 g", undefined, "32,0 g"],
    ["Carrot Cake", 373, "4,5 g", "22,4 g", "29,3 g"],
    ["Cocoa Peanut Butter Banana Bread", 315, "6,7 g", "52,8 g", "9,8 g"],
    ["Post Workout Shake", 401, "24,7 g", "48,7 g", "12,3 g"],
  ])("%s_Macros_MatchPdfPerServing", (name, calories, protein, carbs, fat) => {
    const item = [...food, ...drinks].find(item => item.name === name)

    expect(item?.macros).toEqual({ calories, protein, carbs, fat })
  })

  it("Food_IngredientsAndAllergens_AreComplete", () => {
    expect(food).toHaveLength(28)
    for (const item of food) {
      expect(item.description).toContain("Alergeni:")
      expect(item.description.length).toBeGreaterThan(75)
    }
    expect(food.find(item => item.name === "Granola Bowl")?.description).toContain("albuș de ou")
    expect(food.find(item => item.name === "Veggie Noodles")?.description).not.toContain("tofu")
    expect(food.find(item => item.name === "Salmon Bowl")?.description).toContain("edamame")
  })

  it("HalloweenMenu_IncludesBothCoursesAtTheCombinedPdfPrice", () => {
    const category = source[0].categories.find(category => category.id === "halloween-special") as MenuCategory | undefined
    const menu = category?.items.find(item => item.name === "Meniu Halloween")
    const tart = category?.items.find(item => item.name === "Tartă de dovleac")

    expect(category?.label).toBe("Halloween Special Menu")
    expect(source[0].categories.slice(0, 3).map(category => category.id)).toEqual([
      "halloween-special",
      "breakfast-brunch",
      "soup-of-the-day",
    ])
    expect(category?.items).toHaveLength(2)
    expect(menu).toMatchObject({
      name: "Meniu Halloween",
      price: "65 lei",
      macros: {
        calories: 1246,
        protein: "65,4 g",
        carbs: "102,6 g",
        fat: "61,9 g",
      },
    })
    expect(menu?.menuComponent).toBeUndefined()
    expect(menu?.description).toContain("Piept de rață")
    expect(menu?.description).toContain("Tartă de dovleac")
    expect(menu?.description).toContain("Alergeni:")
    expect(tart).toMatchObject({
      name: "Tartă de dovleac",
      price: "Inclusă în meniu",
      menuComponent: true,
      macros: {
        calories: 489,
        protein: "12,9 g",
        carbs: "58,6 g",
        fat: "23,9 g",
      },
    })
    expect(tart?.description).toContain("120 g")
    expect(tart?.description).toContain("Alergeni:")
  })

  it("Drinks_WithoutPdfNutrition_HaveCompleteEstimatedMacros", () => {
    const estimatedDrinks = drinks.filter(item => item.nutritionEstimated)

    expect(drinks.every(item => item.macros)).toBe(true)
    expect(estimatedDrinks).toHaveLength(drinks.length - 1)
    expect(drinks.find(item => item.name === "Post Workout Shake")?.nutritionEstimated).toBeUndefined()
    for (const item of estimatedDrinks) {
      expect(item.macros).toMatchObject({
        calories: expect.any(Number),
        protein: expect.stringMatching(/^\d+(,\d+)? g$/),
        carbs: expect.stringMatching(/^\d+(,\d+)? g$/),
        fat: expect.stringMatching(/^\d+(,\d+)? g$/),
      })
    }
  })

  it("NewMenuPhotos_AreMappedToMatchingItems", () => {
    const items = source.flatMap(group => group.categories.flatMap<MenuSourceItem>(category => category.items))
    const mappings = [
      ["Supă de linte și ardei copt", "SUPA LINTE.jpg"],
      ["Veggie Bowl", "VEGGIE BOWL.jpg"],
      ["Carrot Cake", "CARROT CAKE.jpg"],
      ["Cocoa Peanut Butter Banana Bread", "PEANUT BUTTER BANANA BREAD.jpg"],
      ["Espresso", "ESPRESSO.jpg"],
      ["Espresso Dopio", "ESPRESSO DOPIO.jpg"],
      ["Americano", "AMERICANO.jpg"],
      ["Long Black", "LONG BLACK.jpg"],
      ["Flat White", "FLAT WHITE.jpg"],
      ["Iced Latte", "ICED LATTE.jpg"],
      ["Cortado", "CORTADO.jpg"],
      ["Noisette", "NOISETTE.jpg"],
      ["Espresso Tonic", "ESPRESSO TONIC.jpg"],
      ["Espresso Macchiato", "ESPRESSO MACHIATO.jpg"],
      ["Ceai Mango", "CEAI MANGO.jpg"],
      ["Iced Tea Mango", "ICED TEA MANGO.jpg"],
      ["Iced Tea Summer Love", "ICED TEA SUMMER LOVE.jpg"],
      ["Ceai Summer Love", "CEAI SUMMER LOVE.jpg"],
      ["Matcha", "MATCHA.jpg"],
      ["Iced Matcha Latte", "ICED MATCHA.jpg"],
      ["Apă de cocos Coconaki Classic", "APA DE COCOS WITH PULP.jpg"],
      ["Apă de cocos Coconaki Sparkling", "APA DE COCOS SPARKLING.jpg"],
      ["Socată colorată Kofi Ti", "SOCATA COLORATA KOFI TI.jpg"],
      ["Kraft Kola Mandarin", "KRAFT KOLA KOFI TI.jpg"],
      ["Cold Brew Coffee & Tonic", "COLD BREW KOFI TI.jpg"],
      ["Kombucha", "KOMBUCHA ZMEURA.jpg"],
      ["Apă plată Aqua Carpatica 330 ml", "APA PLATA AQUA CARPATICA 330 ML.jpg"],
      ["Apă minerală Aqua Carpatica 750 ml", "APA MINERALA AQUA CARPATOCA 750 ML.jpg"],
      ["Apă plată Aqua Carpatica 750 ml", "APA PLATA AQUA CARPATICA 750 ML.jpg"],
      ["Apă minerală Aqua Carpatica 330 ml", "APA MINERALA AQUA CARPATICA 330 ML.jpg"],
      ["Apă de kefir", "APA DE KEFIR.jpg"],
      ["Vin Petro Vaselo Alb", "VIN PETRO VASELO ALB.jpg"],
      ["Vin Petro Vaselo Roze", "VIN PETRO VASELO ROZE.jpg"],
      ["Vin Petro Vaselo Roșu", "VIN PETRO VASELO ROSU.jpg"],
      ["Vin Petro Vaselo Maletine Alb", "VIN PETRO VASELO MALETINE ALB.jpg"],
      ["Vin Petro Vaselo Ovaș Roșu", "VIN PETRO VASELO ORAS\u0326 ROSU.jpg"],
      ["Prosecco Bendis Alb", "PROSECCO BENDIS ALB.jpg"],
      ["Prosecco Bendis Roze", "PROSCCO BENDIS ROZE.jpg"],
      ["Vin Liliac Fetească Albă", "VIN LILIAC FETEASCA ALBA.jpg"],
      ["Vin Liliac Pinot Noir Roze", "VIN LILIAC PINOT NOIR ROZE.jpg"],
      ["Aperol Spritz", "APEROL.jpg"],
      ["Hugo", "HUGO.jpg"],
      ["Wine Cooler", "WINE COOLER.jpg"],
      ["Post Workout Shake", "POST WORKOUT SHAKE.jpg"],
      ["OneTwo - Eins Zwei (German Lager) 5% ABV", "BERE ONETWO EINS ZWEI.jpg"],
      ["OneTwo - Juicy (Hazy IPA) 5,5% ABV", "BERE ONETWO JUICY.jpg"],
      ["OneTwo - Mango Habanero (Spicy Sour) 5,5% ABV", "BERE ONETWO MANGO HABANERO.jpg"],
      ["Collagen Mango Lemonade", "COLLAGEN MANGO LEOMNADE.jpg"],
      ["Electrolyte Lemonade", "ELECTROLYTE LEMONADE.jpg"],
      ["Limonadă", "LIMONADA.jpg"],
      ["Limonadă cu mentă", "LIMONADA MENTA.jpg"],
      ["Bloody Roots", "BLOODY ROOTS.jpg"],
      ["Energy Boost", "ENERGY BOOST.jpg"],
    ]

    for (const [name, imageFile] of mappings) {
      expect(items.find(item => item.name === name)?.imageFile).toBe(imageFile)
    }
  })

  it("MatchaOptions_AppearFirstWithEnglishDescriptions", () => {
    const category = source[1].categories.find(category => category.id === "tea-matcha") as MenuCategory | undefined

    expect(category?.items.slice(0, 3).map(item => item.name)).toEqual([
      "Matcha",
      "Matcha Latte",
      "Iced Matcha Latte",
    ])
    expect(category?.items.slice(0, 3).map(item => item.description_en)).toEqual([
      "200 ml · Water and matcha powder.",
      "200 ml · Milk and matcha powder.",
      "300 ml · Milk, matcha powder and ice.",
    ])
  })
})
