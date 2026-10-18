import type { MenuGroup } from "./types"
import menuSource from "./menu-data.json"

const imageAssets = import.meta.glob<string>("../../assets/menu/optimized/*.webp", {
  eager: true,
  import: "default",
  query: "?url",
})

export const menuData: MenuGroup[] = menuSource.map((group) => {
  if (group.id !== "food" && group.id !== "drinks") {
    throw new Error(`Unknown menu group "${group.id}" in menu-data.json`)
  }

  return {
    id: group.id,
    label: group.label,
    iconKey: group.iconKey,
    categories: group.categories.map((category) => ({
      ...category,
      items: category.items.map(({ imageFile, ...item }) => {
        if (!imageFile) return item
        const variants = [480, 800, 1200].map(width => {
          const image = imageAssets[`../../assets/menu/optimized/${imageFile.slice(0, -4)}-${width}.webp`]
          if (!image) {
            throw new Error(`Optimized menu image "${imageFile}" (${width}px) was not found. Run npm run images:optimize.`)
          }
          return { width, image }
        })
        return {
          ...item,
          image: variants[1].image,
          imageSrcSet: variants.map(({ width, image }) => `${image} ${width}w`).join(", "),
        }
      }),
    })),
  }
})
