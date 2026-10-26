import { describe, expect, it, vi } from "vitest"
import { resolveMenuImage } from "./images"

vi.mock("./seed", () => ({
  menuData: [{ categories: [{ items: [
    { name: "Avocado Toast", image: "/avocado.webp", imageSrcSet: "/avocado-small.webp 480w" },
    { name: "No photo" },
  ] }] }],
}))

describe("resolveMenuImage", () => {
  it("uses the bundled menu photo for an admin record with no database image", () => {
    expect(resolveMenuImage({ name: "Avocado Toast", image_key: null, image_url: null }))
      .toEqual({ image: "/avocado.webp", imageSrcSet: "/avocado-small.webp 480w" })
  })

  it("prioritizes uploaded images over URLs and bundled photos without a stale srcset", () => {
    expect(resolveMenuImage({ name: "Avocado Toast", image_key: "custom.webp", image_url: "/other.webp" }))
      .toEqual({ image: "/api/images/custom.webp", imageSrcSet: undefined })
  })

  it("prioritizes database URLs over bundled photos", () => {
    expect(resolveMenuImage({ name: "Avocado Toast", image_url: "/custom.webp" }))
      .toEqual({ image: "/custom.webp", imageSrcSet: undefined })
  })

  it("preserves public API images and their responsive variants", () => {
    expect(resolveMenuImage({ name: "Avocado Toast", image: "/api.webp", imageSrcSet: "/api-small.webp 480w" }))
      .toEqual({ image: "/api.webp", imageSrcSet: "/api-small.webp 480w" })
  })

  it.each(["Unknown", "No photo"])("does not invent an image for %s", name => {
    expect(resolveMenuImage({ name })).toEqual({ image: undefined, imageSrcSet: undefined })
  })
})
