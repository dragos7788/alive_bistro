import { describe, expect, it } from "vitest"
import {
  DEFAULT_IMAGE_ZOOM,
  isImagePosition,
  isImageZoom,
  parseImagePosition,
  parseImageZoom,
  resolveImageZoom,
  splitImageZoom,
} from "./image-position"

describe("image focal position", () => {
  it("accepts whole percentages within the image bounds", () => {
    expect(isImagePosition(0)).toBe(true)
    expect(isImagePosition(50)).toBe(true)
    expect(isImagePosition(100)).toBe(true)
    expect(isImagePosition(-1)).toBe(false)
    expect(isImagePosition(101)).toBe(false)
    expect(isImagePosition(25.5)).toBe(false)
    expect(isImagePosition("50")).toBe(false)
  })

  describe("image zoom", () => {
    it("accepts integer zoom percentages from 50% to 300%", () => {
      expect(isImageZoom(50)).toBe(true)
      expect(isImageZoom(70)).toBe(true)
      expect(isImageZoom(100)).toBe(true)
      expect(isImageZoom(200)).toBe(true)
      expect(isImageZoom(300)).toBe(true)
      expect(isImageZoom(49)).toBe(false)
      expect(isImageZoom(301)).toBe(false)
      expect(isImageZoom(150.5)).toBe(false)
      expect(isImageZoom("150")).toBe(false)
    })

    it("defaults new products to 100% and preserves omitted zoom on edit", () => {
      expect(parseImageZoom(undefined)).toBe(DEFAULT_IMAGE_ZOOM)
      expect(parseImageZoom(undefined, 180)).toBe(180)
    })

    it("rejects invalid zoom values", () => {
      expect(parseImageZoom(49)).toBeNull()
      expect(parseImageZoom("200")).toBeNull()
    })

    it("stores and restores zoom-out separately from the constrained zoom-in value", () => {
      expect(splitImageZoom(70)).toEqual({ image_zoom: 100, image_zoom_out: 70 })
      expect(splitImageZoom(180)).toEqual({ image_zoom: 180, image_zoom_out: 100 })
      expect(resolveImageZoom(180, 70)).toBe(70)
      expect(resolveImageZoom(180, 100)).toBe(180)
    })
  })

  it("defaults new products to center and preserves omitted coordinates on edit", () => {
    expect(parseImagePosition(undefined, undefined)).toEqual({ x: 50, y: 50 })
    expect(parseImagePosition(25, undefined, { x: 40, y: 70 })).toEqual({ x: 25, y: 70 })
  })

  it("rejects invalid coordinates instead of silently resetting them", () => {
    expect(parseImagePosition("25", 50)).toBeNull()
    expect(parseImagePosition(50, 101)).toBeNull()
  })
})
