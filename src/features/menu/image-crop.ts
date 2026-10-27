import type { CSSProperties } from "react"

export type ImageCropPosition = { x: number; y: number }

export function getImageCropStyle(
  position: ImageCropPosition,
  zoom: number,
  fit: "cover" | "contain",
): CSSProperties {
  const effectiveZoom = fit === "cover" ? zoom : 100
  const zoomedOut = fit === "cover" && effectiveZoom < 100

  return {
    width: `${zoomedOut ? 100 : effectiveZoom}%`,
    height: `${zoomedOut ? 100 : effectiveZoom}%`,
    left: zoomedOut ? "0" : `-${position.x * (effectiveZoom - 100) / 100}%`,
    top: zoomedOut ? "0" : `-${position.y * (effectiveZoom - 100) / 100}%`,
    objectFit: zoomedOut ? "contain" : fit,
    objectPosition: zoomedOut ? "50% 50%" : `${position.x}% ${position.y}%`,
    transform: zoomedOut ? `scale(${effectiveZoom / 100})` : undefined,
    transformOrigin: "center",
  }
}
