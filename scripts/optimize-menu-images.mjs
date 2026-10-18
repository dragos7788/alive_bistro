import sharp from "sharp"
import { mkdir, readFile, stat } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const directory = new URL("../src/assets/menu/", import.meta.url)
const output = new URL("optimized/", directory)
const source = JSON.parse(await readFile(new URL("../src/features/menu/menu-data.json", import.meta.url), "utf8"))
const files = [...new Set(source.flatMap(group => group.categories.flatMap(category =>
  category.items.flatMap(item => item.imageFile ? [item.imageFile] : []),
)))]
const widths = [480, 800, 1200]
await mkdir(output, { recursive: true })

for (const file of files) {
  const original = new URL(encodeURIComponent(file), directory)
  for (const width of widths) {
    const destination = new URL(encodeURIComponent(`${file.slice(0, -4)}-${width}.webp`), output)
    await sharp(fileURLToPath(original))
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78, effort: 5 })
      .toFile(fileURLToPath(destination))
  }
}

let originalBytes = 0
let optimizedBytes = 0
for (const file of files) {
  originalBytes += (await stat(new URL(encodeURIComponent(file), directory))).size
  optimizedBytes += (await stat(new URL(encodeURIComponent(`${file.slice(0, -4)}-800.webp`), output))).size
}
console.log(`Optimized ${files.length} photos at ${widths.join("/")}px; 800px set: ${(optimizedBytes / 1024 / 1024).toFixed(2)} MB vs ${(originalBytes / 1024 / 1024).toFixed(2)} MB originals (${(100 - optimizedBytes / originalBytes * 100).toFixed(1)}% smaller).`)
