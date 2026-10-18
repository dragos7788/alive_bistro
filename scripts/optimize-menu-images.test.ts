import { readFileSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import source from "../src/features/menu/menu-data.json"

const directory = new URL("../src/assets/menu/", import.meta.url)
const files = source.flatMap(group => group.categories.flatMap(category =>
  category.items.flatMap(item => item.imageFile ? [item.imageFile] : []),
))

describe("Optimized menu photos", () => {
  it.each(files)("%s_ResponsiveVariants_PreserveFramingAndReducePayload", async file => {
    const original = await sharp(fileURLToPath(new URL(encodeURIComponent(file), directory))).metadata()

    for (const width of [480, 800, 1200]) {
      const output = new URL(`optimized/${encodeURIComponent(file.slice(0, -4))}-${width}.webp`, directory)
      const metadata = await sharp(readFileSync(output)).metadata()

      expect(metadata.format).toBe("webp")
      expect(metadata.width).toBe(width)
      expect(metadata.height! / metadata.width!).toBeCloseTo(original.height! / original.width!, 2)
      expect(statSync(output).size).toBeLessThan(200 * 1024)
    }
  })

  it("All800pxVariants_TotalPayload_IsBelowTwoMegabytes", () => {
    const bytes = files.reduce((total, file) => total + statSync(
      new URL(`optimized/${encodeURIComponent(file.slice(0, -4))}-800.webp`, directory),
    ).size, 0)

    expect(files).toHaveLength(29)
    expect(bytes).toBeLessThan(2 * 1024 * 1024)
  })
})
