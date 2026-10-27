export type ImagePosition = {
  x: number
  y: number
}

export function isImagePosition(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100
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
