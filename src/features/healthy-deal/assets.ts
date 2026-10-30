import soup from "../../assets/menu/deal-of-the-day/SM - Alive Bistro (6).png"
import main from "../../assets/menu/deal-of-the-day/SM - Alive Bistro (5).png"
import stamp from "../../assets/menu/deal-of-the-day/SM - Alive Bistro (3).png"
import hours from "../../assets/menu/deal-of-the-day/SM - Alive Bistro (4).png"
import brush from "../../assets/menu/deal-of-the-day/SM - Alive Bistro (7).png"
import logo from "../../assets/menu/deal-of-the-day/SM - Alive Bistro (8).png"

export const dealAssets = { soup, main, stamp, hours, brush, logo }

/** Resolves built-in photo choices or authenticated-admin uploads. */
export function dealImage(image: string): string | undefined {
  return image === "default-soup" ? soup : image === "default-main" ? main : image || undefined
}
