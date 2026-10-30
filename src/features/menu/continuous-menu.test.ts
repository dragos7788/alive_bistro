import { describe, expect, it } from "vitest"
import { continuousMenu } from "./continuous-menu"
import { menuData } from "./seed"

describe("continuous mobile menu", () => {
  it("continues through every category and item in menu order without losing category identity", () => {
    for (const group of menuData) {
      const entries = continuousMenu(group.categories)

      expect(entries.map(entry => entry.category.id)).toEqual(group.categories.map(category => category.id))
      expect(entries.flatMap(entry => entry.items)).toEqual(group.categories.flatMap(category => category.items))
      expect(entries.every(entry => entry.items === entry.category.items)).toBe(true)
    }
  })

  it("keeps special menus as panels even when they contain no catalog items", () => {
    const entries = continuousMenu(menuData.flatMap(group => group.categories))

    expect(entries.filter(entry => entry.isPanel).map(entry => entry.category.id)).toEqual(
      menuData.flatMap(group => group.categories).filter(category =>
        ["healthy-deal", "halloween-special"].includes(category.id)).map(category => category.id),
    )
  })

  it("handles an empty menu without inventing products", () => {
    expect(continuousMenu([])).toEqual([])
  })
})
