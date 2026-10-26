import { menuData } from "./seed"
import type { MenuItem } from "./types"

const localImages = new Map(menuData.flatMap(group =>
  group.categories.flatMap(category => category.items.map(item => [item.name, item] as const))))

/** Resolves custom photos before bundled menu photos for both public and admin views. */
export function resolveMenuImage(item: {
  name: string
  image?: string
  imageSrcSet?: string
  image_key?: string | null
  image_url?: string | null
}): Pick<MenuItem, "image" | "imageSrcSet"> {
  if (item.image_key) return { image: `/api/images/${item.image_key}`, imageSrcSet: undefined }
  if (item.image_url) return { image: item.image_url, imageSrcSet: undefined }
  const local = localImages.get(item.name)
  return {
    image: item.image ?? local?.image,
    imageSrcSet: item.image ? item.imageSrcSet : local?.imageSrcSet,
  }
}
