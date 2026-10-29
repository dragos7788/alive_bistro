import type { MenuGroup } from "./types"
import menuSource from "./menu-data.json"
import halloweenDuck from "../../assets/menu/halloween/SM - Alive Bistro (1).png"
import halloweenTart from "../../assets/menu/halloween/SM - Alive Bistro (2).png"

const imageAssets = import.meta.glob<string>("../../assets/menu/optimized/*.webp", {
  eager: true,
  import: "default",
  query: "?url",
})

const featuredImages: Record<string, string> = {
  "Meniu Halloween": halloweenDuck,
  "Tartă de dovleac": halloweenTart,
}

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
        if (!imageFile) {
          return {
            ...item,
            ...(featuredImages[item.name] ? { image: featuredImages[item.name] } : {}),
          }
        }
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
