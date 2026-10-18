import type { MenuGroup } from "./types"
import menuSource from "./menu-data.json"

const imageAssets = import.meta.glob<string>("../../assets/menu/*.jpg", {
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
        const image = imageFile
          ? imageAssets[`../../assets/menu/${imageFile}`]
          : undefined

        if (imageFile && !image) {
          throw new Error(`Menu image "${imageFile}" was not found`)
        }

        return { ...item, image }
      }),
    })),
  }
})
