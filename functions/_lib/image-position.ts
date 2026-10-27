export type ImagePosition = {
  x: number
  y: number
}

export const DEFAULT_IMAGE_ZOOM = 100

export function isImagePosition(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100
}

export function isImageZoom(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= DEFAULT_IMAGE_ZOOM && value <= 300
}

export function parseImageZoom(value: unknown, fallback = DEFAULT_IMAGE_ZOOM): number | null {
  const zoom = value === undefined ? fallback : value
  return isImageZoom(zoom) ? zoom : null
}

export function parseImagePosition(
  x: unknown,
  y: unknown,
  fallback: ImagePosition = { x: 50, y: 50 },
): ImagePosition | null {
  const positionX = x === undefined ? fallback.x : x
  const positionY = y === undefined ? fallback.y : y
  return isImagePosition(positionX) && isImagePosition(positionY)
    ? { x: positionX, y: positionY }
    : null
}
