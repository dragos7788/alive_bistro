import { describe, expect, it } from "vitest"
import { getImageCropStyle } from "./image-crop"

describe("image crop style", () => {
  it("shows the full image and shrinks it below the cover zoom", () => {
    expect(getImageCropStyle({ x: 70, y: 30 }, 70, "cover")).toMatchObject({
      width: "100%",
      height: "100%",
      objectFit: "contain",
      objectPosition: "50% 50%",
      transform: "scale(0.7)",
    })
  })

  it("preserves the standard crop at 100% zoom", () => {
    expect(getImageCropStyle({ x: 70, y: 30 }, 100, "cover")).toMatchObject({
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "70% 30%",
      transform: undefined,
    })
  })

  it("applies zoom and focal position when zoomed in", () => {
    expect(getImageCropStyle({ x: 70, y: 30 }, 200, "cover")).toMatchObject({
      width: "200%",
      height: "200%",
      left: "-70%",
      top: "-30%",
      objectFit: "cover",
    })
  })

  it("does not zoom images displayed with contain", () => {
    expect(getImageCropStyle({ x: 50, y: 50 }, 200, "contain")).toMatchObject({
      width: "100%",
      height: "100%",
      objectFit: "contain",
      transform: undefined,
    })
  })
})
